"""
Mimix engine protocol v1 server for Chatterbox Multilingual (Resemble AI, code and weights MIT).
Runs on an NVIDIA GPU. The app talks to it through src/lib/voice/selfhosted-engine.ts as the
"graphics card engine" (GPU_ENGINE=chatterbox): cloned voices and languages Kokoro doesn't speak.

  GET    /v1/health          {ok, model, sampleRate, features, languages}
  POST   /v1/tts             JSON {text, voiceId?, language?, seed?, cfg?} -> audio/wav
  POST   /v1/voices          multipart file[] (WAV), name -> {voiceId}        FEATURES=clone
  DELETE /v1/voices/{id}     -> 204

Voices are a reference clip (up to 20 s) in VOICES_DIR. The built-in voices "builtin-low" and
"builtin-high" read library voices that have no engine voice of their own; they are reference clips
too, written by the launcher from Kokoro (Apache-2.0) before this server starts (BUILTIN_DIR).

Chatterbox marks its output with Resemble's Perth watermark (resemble-perth, MIT), built into the package.

Status: written against chatterbox-tts 0.1.7 and its README; NOT yet run on a GPU (the build
workspace has none). Run the smoke test in README.md on the first GPU computer.
"""
from __future__ import annotations

import hashlib
import hmac
import io
import json
import os
import re
import secrets
import shutil
import threading
import time
from pathlib import Path
from typing import List, Optional

import numpy as np
import soundfile as sf
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

TOKEN = os.environ.get("MIMIX_ENGINE_TOKEN", "")
VOICES_DIR = Path(os.environ.get("VOICES_DIR", "voices"))
BUILTIN_DIR = Path(os.environ.get("BUILTIN_DIR", str(VOICES_DIR / "builtin")))
FEATURES = {f.strip() for f in os.environ.get("FEATURES", "clone").split(",") if f.strip()}
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "5000"))
MAX_UPLOAD_BYTES = 200 * 1024 * 1024
REFERENCE_MAX_SECONDS = 20
# Chatterbox Multilingual's 23 languages (ISO 639-1), from its model card.
LANGUAGES = ["ar", "da", "de", "el", "en", "es", "fi", "fr", "he", "hi", "it", "ja", "ko", "ms", "nl", "no", "pl", "pt", "ru", "sv", "sw", "tr", "zh"]

if len(TOKEN) < 16:
    raise SystemExit("Set MIMIX_ENGINE_TOKEN to a random string of at least 16 characters (the app's GPU_ENGINE_TOKEN).")
VOICE_ID = re.compile(r"^[a-z0-9_-]{1,64}$")

import torch  # noqa: E402

if not torch.cuda.is_available():
    raise SystemExit("No NVIDIA graphics card is available to PyTorch (torch.cuda.is_available() is False).")
from chatterbox.mtl_tts import ChatterboxMultilingualTTS  # noqa: E402

MODEL = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
SAMPLE_RATE = int(MODEL.sr)
GPU = threading.Lock()

app = FastAPI(title="Mimix Chatterbox Multilingual engine", version="1")


def require_token(authorization: str = Header(default="")) -> None:
    sent = authorization[7:] if authorization.startswith("Bearer ") else ""
    if not hmac.compare_digest(sent.encode(), TOKEN.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


def reference(voice_id: str) -> Path:
    if voice_id in ("builtin-low", "builtin-high"):
        p = BUILTIN_DIR / f"{voice_id}.wav"
    elif VOICE_ID.match(voice_id):
        p = VOICES_DIR / voice_id / "reference.wav"
    else:
        raise HTTPException(404, "unknown voice")
    if not p.exists():
        raise HTTPException(404, "unknown voice")
    return p


def seed_of(seed: Optional[str]) -> Optional[int]:
    return int.from_bytes(hashlib.sha256(seed.encode()).digest()[:4], "little") if seed else None


def language_of(code: Optional[str]) -> str:
    c = (code or "en").lower().split("-")[0]
    if c not in LANGUAGES:
        raise HTTPException(422, f"language {c} is not one of Chatterbox's 23")
    return c


def generate(text: str, voice: Path, language: str, seed: Optional[int], cfg: float) -> np.ndarray:
    with GPU:
        if seed is not None:
            torch.manual_seed(seed)
        wav = MODEL.generate(text, language_id=language, audio_prompt_path=str(voice), cfg_weight=cfg)
    return wav.squeeze(0).detach().cpu().numpy().astype(np.float32)


def to_wav_bytes(audio: np.ndarray, sr: int) -> bytes:
    buf = io.BytesIO()
    sf.write(buf, np.clip(audio, -1, 1), sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


class TtsBody(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_TEXT_CHARS)
    voiceId: Optional[str] = None
    language: Optional[str] = None
    seed: Optional[str] = None
    # The app sends 1.5 to 3.0 from the Similarity slider; Chatterbox's cfg_weight works from 0 to 1.
    cfg: float = Field(default=2.0, ge=1.0, le=4.0)


@app.get("/v1/health")
def health(_: None = Depends(require_token)):
    return {"ok": True, "model": "chatterbox-multilingual", "sampleRate": SAMPLE_RATE, "features": sorted(FEATURES), "languages": LANGUAGES,
            "gpu": torch.cuda.get_device_name(0)}


@app.post("/v1/tts")
async def tts(body: TtsBody, _: None = Depends(require_token)):
    voice = reference(body.voiceId or "builtin-high")
    cfg = round(min(1.0, max(0.0, (body.cfg - 1.5) / 1.5 * 0.5 + 0.3)), 2)
    audio = await run_in_threadpool(generate, body.text, voice, language_of(body.language), seed_of(body.seed), cfg)
    return Response(to_wav_bytes(audio, SAMPLE_RATE), media_type="audio/wav")


@app.post("/v1/voices")
async def create_voice(file: List[UploadFile] = File(...), name: str = Form(""), _: None = Depends(require_token)):
    if "clone" not in FEATURES:
        raise HTTPException(501, "clone is not enabled on this server")
    parts, sr = [], None
    for f in file:
        data = await f.read(MAX_UPLOAD_BYTES + 1)
        try:
            audio, rate = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
        except Exception:
            raise HTTPException(422, "unreadable audio")
        sr = sr or int(rate)
        if int(rate) != sr:
            raise HTTPException(422, "samples must share one sample rate")
        parts.append(audio[:, 0])
    joined = np.concatenate(parts)[: REFERENCE_MAX_SECONDS * sr]
    if len(joined) < 5 * sr:
        raise HTTPException(422, "need at least 5 seconds of speech")
    voice_id = f"v_{secrets.token_hex(12)}"
    d = VOICES_DIR / voice_id
    d.mkdir(parents=True)
    sf.write(d / "reference.wav", joined, sr, subtype="PCM_16")
    (d / "meta.json").write_text(json.dumps({"name": name, "createdAt": int(time.time())}))
    return {"voiceId": voice_id}


@app.delete("/v1/voices/{voice_id}")
def delete_voice(voice_id: str, _: None = Depends(require_token)):
    if not VOICE_ID.match(voice_id) or voice_id.startswith("builtin"):
        raise HTTPException(403, "built-in voices can't be deleted")
    d = VOICES_DIR / voice_id
    if not d.exists():
        raise HTTPException(404, "unknown voice")
    shutil.rmtree(d)
    return Response(status_code=204)
