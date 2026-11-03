"""
Mimix engine protocol v1 server for VoxCPM2 (Apache-2.0, openbmb/VoxCPM2).

The Next.js app talks to this server through src/lib/voice/selfhosted-engine.ts when
VOICE_ENGINE=voxcpm. Endpoints and payloads are documented there and in README.md.

Optional features load only when their packages are installed and listed in FEATURES:
  transcribe -> faster-whisper (MIT)   isolate -> DeepFilterNet (MIT/Apache-2.0)
Speaker labels: faster-whisper has no diarization, so every segment is "Speaker 1".
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import shutil
import struct
import tempfile
import threading
import time
from pathlib import Path
from typing import Iterator, Optional

import numpy as np
import soundfile as sf
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

TOKEN = os.environ.get("MIMIX_ENGINE_TOKEN", "")
MODEL_ID = os.environ.get("MODEL_ID", "openbmb/VoxCPM2")
VOICES_DIR = Path(os.environ.get("VOICES_DIR", "/data/voices"))
FEATURES = {f.strip() for f in os.environ.get("FEATURES", "stream,clone,design").split(",") if f.strip()}
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3")
INFERENCE_STEPS = int(os.environ.get("INFERENCE_STEPS", "10"))
DEFAULT_CFG = float(os.environ.get("DEFAULT_CFG", "2.0"))
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "5000"))
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(200 * 1024 * 1024)))
REFERENCE_MAX_SECONDS = 30
DRAFT_TTL_SECONDS = 24 * 3600

if len(TOKEN) < 16:
    raise SystemExit("Set MIMIX_ENGINE_TOKEN to a random string of at least 16 characters (the app's SELF_HOSTED_ENGINE_TOKEN).")

VOICE_ID = re.compile(r"^[a-z0-9_-]{1,64}$")
BUILTIN = {
    "builtin-low": "A calm, warm adult male voice with a clear, neutral accent",
    "builtin-high": "A bright, friendly adult female voice with a clear, neutral accent",
}
BUILTIN_TEXT = "Hello, and welcome. This is the voice you will hear when no other voice is chosen."

# --------------------------------------------------------------------------------------- models

from voxcpm import VoxCPM  # noqa: E402  (import after the token check so a misconfigured box fails fast)

MODEL = VoxCPM.from_pretrained(MODEL_ID, load_denoiser=False)
SAMPLE_RATE: int = int(MODEL.tts_model.sample_rate)
GPU = threading.Lock()  # one generation at a time per model instance; scale out with more replicas

WHISPER = None
if "transcribe" in FEATURES:
    from faster_whisper import WhisperModel

    WHISPER = WhisperModel(WHISPER_MODEL, device="cuda", compute_type="float16")

DF = None
if "isolate" in FEATURES:
    from df.enhance import enhance, init_df, load_audio, save_audio

    DF = init_df()

app = FastAPI(title="Mimix VoxCPM2 engine", version="1")


def require_token(authorization: str = Header(default="")) -> None:
    sent = authorization[7:] if authorization.startswith("Bearer ") else ""
    if not hmac.compare_digest(sent.encode(), TOKEN.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


def need(feature: str) -> None:
    if feature not in FEATURES:
        raise HTTPException(status_code=501, detail=f"{feature} is not enabled on this server")


# --------------------------------------------------------------------------------------- voices


def voice_dir(voice_id: str) -> Path:
    if not VOICE_ID.match(voice_id):
        raise HTTPException(status_code=404, detail="unknown voice")
    return VOICES_DIR / voice_id


def read_meta(voice_id: str) -> dict:
    d = voice_dir(voice_id)
    try:
        return json.loads((d / "meta.json").read_text())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="unknown voice")


def write_voice(voice_id: str, audio: np.ndarray, sr: int, meta: dict) -> None:
    d = voice_dir(voice_id)
    d.mkdir(parents=True, exist_ok=True)
    sf.write(d / "reference.wav", audio, sr, subtype="PCM_16")
    (d / "meta.json").write_text(json.dumps({**meta, "createdAt": int(time.time())}))


def new_voice_id() -> str:
    return f"v_{secrets.token_hex(12)}"


def seed_of(seed: Optional[str]) -> Optional[int]:
    if not seed:
        return None
    return int.from_bytes(hashlib.sha256(seed.encode()).digest()[:4], "little")


def voice_kwargs(voice_id: str) -> dict:
    meta = read_meta(voice_id)
    ref = str(voice_dir(voice_id) / "reference.wav")
    # With a transcript VoxCPM2 continues the reference ("ultimate cloning"); without one it clones from the audio alone.
    if meta.get("promptText"):
        return {"prompt_wav_path": ref, "prompt_text": meta["promptText"], "reference_wav_path": ref}
    return {"reference_wav_path": ref}


def generate(text: str, seed: Optional[int], cfg: float, **voice) -> np.ndarray:
    with GPU:
        wav = MODEL.generate(text=text, cfg_value=cfg, inference_timesteps=INFERENCE_STEPS, seed=seed, **voice) if seed is not None \
            else MODEL.generate(text=text, cfg_value=cfg, inference_timesteps=INFERENCE_STEPS, **voice)
    return np.asarray(wav, dtype=np.float32).reshape(-1)


def to_wav_bytes(audio: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, audio, sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def pcm16(audio: np.ndarray) -> bytes:
    return (np.clip(audio, -1.0, 1.0) * 32767.0).astype("<i2").tobytes()


def streaming_wav_header(sr: int) -> bytes:
    # Unknown length: sizes set to the maximum, as streaming WAV players expect.
    return b"RIFF" + struct.pack("<I", 0xFFFFFFFF) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16) + b"data" + struct.pack("<I", 0xFFFFFFFF)


def gc_drafts() -> None:
    now = time.time()
    if not VOICES_DIR.exists():
        return
    for d in VOICES_DIR.iterdir():
        try:
            meta = json.loads((d / "meta.json").read_text())
            if meta.get("draft") and now - meta.get("createdAt", now) > DRAFT_TTL_SECONDS:
                shutil.rmtree(d, ignore_errors=True)
        except (FileNotFoundError, json.JSONDecodeError):
            continue


def ensure_builtin_voices() -> None:
    for voice_id, description in BUILTIN.items():
        if (VOICES_DIR / voice_id / "meta.json").exists():
            continue
        audio = generate(f"({description}){BUILTIN_TEXT}", seed_of(voice_id), DEFAULT_CFG)
        write_voice(voice_id, audio, SAMPLE_RATE, {"name": voice_id, "promptText": BUILTIN_TEXT, "draft": False})


VOICES_DIR.mkdir(parents=True, exist_ok=True)
ensure_builtin_voices()
gc_drafts()


async def read_upload(f: UploadFile) -> bytes:
    data = await f.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")
    return data


def load_mono(data: bytes) -> tuple[np.ndarray, int]:
    try:
        audio, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
    except Exception:
        raise HTTPException(status_code=422, detail="unreadable audio")
    return audio[:, 0], int(sr)


# --------------------------------------------------------------------------------------- routes


class TtsBody(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    voiceId: Optional[str] = None
    language: Optional[str] = None
    seed: Optional[str] = None
    cfg: float = Field(default=DEFAULT_CFG, ge=1.0, le=4.0)


class DesignBody(BaseModel):
    description: str = Field(min_length=1, max_length=1000)
    previewText: str = Field(default="", max_length=500)
    count: int = Field(default=3, ge=1, le=3)
    language: Optional[str] = None
    seed: Optional[str] = None


class PublishBody(BaseModel):
    name: str = Field(default="", max_length=100)


@app.get("/v1/health")
def health(_: None = Depends(require_token)):
    return {"ok": True, "model": MODEL_ID, "sampleRate": SAMPLE_RATE, "features": sorted(FEATURES)}


@app.post("/v1/tts")
async def tts(body: TtsBody, _: None = Depends(require_token)):
    voice = voice_kwargs(body.voiceId or "builtin-high")
    audio = await run_in_threadpool(generate, body.text, seed_of(body.seed), body.cfg, **voice)
    return Response(to_wav_bytes(audio, SAMPLE_RATE), media_type="audio/wav")


@app.post("/v1/tts/stream")
def tts_stream(body: TtsBody, _: None = Depends(require_token)):
    need("stream")
    voice = voice_kwargs(body.voiceId or "builtin-high")

    def chunks() -> Iterator[bytes]:
        yield streaming_wav_header(SAMPLE_RATE)
        with GPU:
            for piece in MODEL.generate_streaming(text=body.text, cfg_value=body.cfg, inference_timesteps=INFERENCE_STEPS, **voice):
                yield pcm16(np.asarray(piece, dtype=np.float32).reshape(-1))

    return StreamingResponse(chunks(), media_type="audio/wav")


@app.post("/v1/voices")
async def create_voice(file: list[UploadFile] = File(...), name: str = Form(""), language: str = Form(""), _: None = Depends(require_token)):
    need("clone")
    parts, sr = [], None
    for f in file:
        audio, rate = load_mono(await read_upload(f))
        if sr is None:
            sr = rate
        if rate != sr:
            raise HTTPException(status_code=422, detail="samples must share one sample rate")
        parts.append(audio)
    joined = np.concatenate(parts)[: REFERENCE_MAX_SECONDS * sr]
    if len(joined) < 3 * sr:
        raise HTTPException(status_code=422, detail="need at least 3 seconds of speech")
    prompt_text = ""
    if WHISPER is not None:
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            sf.write(tmp.name, joined, sr, subtype="PCM_16")
            segments, _info = await run_in_threadpool(lambda: WHISPER.transcribe(tmp.name, language=language[:2] or None))
            prompt_text = " ".join(s.text.strip() for s in segments).strip()
    voice_id = new_voice_id()
    write_voice(voice_id, joined, sr, {"name": name, "promptText": prompt_text, "draft": False})
    return {"voiceId": voice_id}


@app.post("/v1/voices/design")
async def design(body: DesignBody, _: None = Depends(require_token)):
    need("design")
    gc_drafts()
    text = body.previewText.strip() or BUILTIN_TEXT
    out = []
    for i in range(body.count):
        seed = seed_of(f"{body.seed or secrets.token_hex(4)}-{i}")
        # VoxCPM2 voice design: the description goes in parentheses before the text.
        audio = await run_in_threadpool(generate, f"({body.description}){text}", seed, DEFAULT_CFG)
        voice_id = new_voice_id()
        write_voice(voice_id, audio, SAMPLE_RATE, {"name": "", "promptText": text, "draft": True, "description": body.description})
        out.append({"voiceId": voice_id, "audio": base64.b64encode(to_wav_bytes(audio, SAMPLE_RATE)).decode()})
    return {"voices": out}


@app.post("/v1/voices/{voice_id}/publish")
def publish(voice_id: str, body: PublishBody, _: None = Depends(require_token)):
    meta = read_meta(voice_id)
    meta.update({"draft": False, "name": body.name or meta.get("name", "")})
    (voice_dir(voice_id) / "meta.json").write_text(json.dumps(meta))
    return {"voiceId": voice_id}


@app.delete("/v1/voices/{voice_id}")
def delete_voice(voice_id: str, _: None = Depends(require_token)):
    if voice_id in BUILTIN:
        raise HTTPException(status_code=403, detail="built-in voices can't be deleted")
    d = voice_dir(voice_id)
    if not d.exists():
        raise HTTPException(status_code=404, detail="unknown voice")
    shutil.rmtree(d)
    return Response(status_code=204)


@app.post("/v1/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form(""), speakers: str = Form(""), _: None = Depends(require_token)):
    need("transcribe")
    data = await read_upload(file)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        tmp.write(data)
        tmp.flush()
        segments, info = await run_in_threadpool(lambda: WHISPER.transcribe(tmp.name, language=language[:2] or None, vad_filter=True))
        segments = list(segments)
    return {
        "language": info.language,
        "durationMs": int(info.duration * 1000),
        "segments": [{"startMs": int(s.start * 1000), "endMs": int(s.end * 1000), "speaker": "Speaker 1", "text": s.text.strip()} for s in segments if s.text.strip()],
    }


@app.post("/v1/isolate")
async def isolate(file: UploadFile = File(...), _: None = Depends(require_token)):
    need("isolate")
    model, df_state, _ = DF
    data = await read_upload(file)
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = os.path.join(tmp, "in.wav"), os.path.join(tmp, "out.wav")
        Path(src).write_bytes(data)

        def run() -> None:
            audio, _ = load_audio(src, sr=df_state.sr())
            save_audio(dst, enhance(model, df_state, audio), df_state.sr())

        await run_in_threadpool(run)
        audio, sr = sf.read(dst, dtype="float32", always_2d=True)
    return Response(to_wav_bytes(audio[:, 0], int(sr)), media_type="audio/wav")


@app.exception_handler(Exception)
async def unexpected(_req, exc: Exception):
    print(f"[engine] {type(exc).__name__}: {exc}", flush=True)
    return JSONResponse({"detail": "engine error"}, status_code=500)
