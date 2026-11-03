"""
Mimix mixer protocol v1 server for Kokoro-82M (Apache-2.0, hexgrad/Kokoro-82M; ONNX build from
thewh1teagle/kokoro-onnx, MIT). Runs on CPU. The Next.js app talks to it through
src/lib/voice/kokoro-engine.ts, as the Voice Mixer (MIXER_ENGINE=kokoro) or as the main engine
(VOICE_ENGINE=kokoro, for running Mimix on one computer with real voices and no account).

  GET  /v1/health      -> {ok, model, sampleRate, voices, languages, features}
  POST /v1/tts         JSON {text, recipe, seed?} -> audio/wav (16-bit PCM, mono)
  POST /v1/transcribe  multipart file (+ language) -> {language, durationMs, segments}   KOKORO_FEATURES=transcribe
  POST /v1/isolate     multipart file -> audio/wav                                        KOKORO_FEATURES=isolate
  POST /v1/speaker     multipart file -> {embedding, voicedMs, model}                     KOKORO_FEATURES=clone
  POST /v1/clone       multipart files -> {tone, f0, voicedMs}                            KOKORO_FEATURES=clone

Optional extras, both on CPU and both licensed for commercial use:
  - transcribe: faster-whisper (MIT; Whisper weights MIT). The model ("small" by default, WHISPER_MODEL)
    downloads from Hugging Face on first start and is cached. No diarization: every line is "Speaker 1".
  - isolate: DeepFilterNet's standalone deep-filter program (MIT/Apache-2.0, model built in),
    found at DEEP_FILTER_BIN or MODELS_DIR/deep-filter[.exe]. It works at 48 kHz.
  - clone: voice cloning for the consent-checked Clone page. speaker.py embeds a recording with 3D-Speaker's
    CAM++ model (Apache-2.0) for the consent check; tone.py runs OpenVoice v2's tone-colour converter
    (MIT, PyTorch on CPU) so that a Kokoro voice speaks in the cloned speaker's timbre. Models in
    MODELS_DIR/speaker and MODELS_DIR/openvoice/converter (the launcher downloads them).

The language is set by the lead voice of a recipe: a/b English (US/UK), e Spanish, f French,
h Hindi, i Italian, p Brazilian Portuguese, and, when misaki is installed, j Japanese and
z Mandarin.

A recipe is stateless: "af_heart:0.6,am_michael:0.4;speed=1.05;pitch=0.2;warmth=-0.1".
  - The voice is the weighted sum of the named Kokoro style tensors (weights are normalised).
  - speed is Kokoro's speaking rate (0.5 to 2).
  - pitch (-1 to 1) shifts by up to 2 semitones, by resampling; the synthesis speed is adjusted
    first so the duration stays the same.
  - warmth (-1 to 1) is a gentle low-shelf tilt of up to 4 dB below about 300 Hz.
  - tone (a cloned voice, KOKORO_FEATURES=clone) is the speaker's OpenVoice tone as base64url float16;
    the blend above is the base voice that speaks before the converter.
Every response is peak-limited to -1 dBFS, so no blend or adjustment clips.
"""

from __future__ import annotations

import hmac
import io
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from math import gcd
from pathlib import Path

import numpy as np
import soundfile as sf
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from scipy.signal import resample_poly
from starlette.concurrency import run_in_threadpool

from tone import SAMPLE_RATE as TONE_RATE, decode_tone, encode_tone  # numpy only; the converter loads below

TOKEN = os.environ.get("MIMIX_MIXER_TOKEN", "")
MODELS_DIR = Path(os.environ.get("MODELS_DIR", "/models"))
MAX_TEXT_CHARS = int(os.environ.get("MAX_TEXT_CHARS", "5000"))
PITCH_SEMITONES = 2.0
WARMTH_DB = 4.0
WARMTH_HZ = 300.0
PEAK = 10 ** (-1 / 20)
FEATURES = {f.strip() for f in os.environ.get("KOKORO_FEATURES", "").split(",") if f.strip()}
UNKNOWN = FEATURES - {"transcribe", "isolate", "clone"}
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "small")
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "200")) * 1024 * 1024
# espeak-ng language for each Kokoro voice prefix (the first letter of a voice id).
LANGS = {"a": "en-us", "b": "en-gb", "e": "es", "f": "fr-fr", "h": "hi", "i": "it", "p": "pt-br"}
# The text's language (BCP 47 from the app) when it differs from the voice's: words follow the text.
TEXT_LANGS = {"es": "es", "fr": "fr-fr", "hi": "hi", "it": "it", "pt": "pt-br"}

# Mandarin (z) and Japanese (j) voices read phonemes from misaki (Apache-2.0), with jieba and
# pypinyin for Chinese and pyopenjtalk-plus for Japanese (all MIT). Without them those voices are off.
G2P_LANGS = {"j": "ja", "z": "cmn"}
try:
    from misaki import ja as _misaki_ja, zh as _misaki_zh  # noqa: E402

    G2P = {"cmn": _misaki_zh.ZHG2P(unk=""), "ja": _misaki_ja.JAG2P(version="pyopenjtalk", unk="")}
    LANGS.update(G2P_LANGS)
    TEXT_LANGS.update({"zh": "cmn", "ja": "ja"})
except ImportError:
    G2P = {}


def phonemes_for(text: str, lang: str) -> str:
    """Kokoro phonemes for Mandarin or Japanese text."""
    ph, _ = G2P[lang](text)
    if lang == "ja":
        # misaki's Japanese output is the phonemes followed by a pitch line of the same length.
        ph = ph[: len(ph) // 2]
    return ph.strip()

if len(TOKEN) < 16:
    raise SystemExit("Set MIMIX_MIXER_TOKEN to a random string of at least 16 characters (the app's MIXER_ENGINE_TOKEN).")
if UNKNOWN:
    raise SystemExit(f"KOKORO_FEATURES has unknown entries: {', '.join(sorted(UNKNOWN))} (use transcribe, isolate, clone)")

from kokoro_onnx import Kokoro  # noqa: E402  (import after the token check so a misconfigured box fails fast)

KOKORO = Kokoro(str(MODELS_DIR / "kokoro-v1.0.onnx"), str(MODELS_DIR / "voices-v1.0.bin"))
BANK = np.load(MODELS_DIR / "voices-v1.0.bin")
VOICES = sorted(v for v in BANK.files if v[0] in LANGS)
SAMPLE_RATE = 24000
LOCK = threading.Lock()  # one synthesis at a time per process; scale out with more replicas

VOICE_ID = re.compile(r"^[a-z]{2}_[a-z]+$")

app = FastAPI(title="Mimix Kokoro mixer engine", version="1")


def auth(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {TOKEN}"
    if not hmac.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="unauthorized")


class Recipe:
    def __init__(self, weights: dict[str, float], speed: float, pitch: float, warmth: float):
        self.weights, self.speed, self.pitch, self.warmth = weights, speed, pitch, warmth
        self.tone: np.ndarray | None = None
        self.base = ""  # the recipe without its tone: the cache key for the base voice's own tone


def clamp(n: float, lo: float, hi: float) -> float:
    return min(hi, max(lo, n))


def parse_recipe(s: str) -> Recipe:
    mix, *opts = s.split(";")
    weights: dict[str, float] = {}
    for part in mix.split(","):
        vid, _, w = part.partition(":")
        try:
            n = float(w)
        except ValueError:
            raise HTTPException(422, "bad recipe")
        if not VOICE_ID.match(vid) or vid not in VOICES or not np.isfinite(n) or n <= 0:
            raise HTTPException(422, f"unknown voice or weight: {part}")
        weights[vid] = weights.get(vid, 0.0) + n
    total = sum(weights.values())
    if total <= 0 or len(weights) > 3:
        raise HTTPException(422, "a recipe blends one to three voices")
    r = Recipe({k: v / total for k, v in weights.items()}, 1.0, 0.0, 0.0)
    base = [mix]
    for o in opts:
        k, _, v = o.partition("=")
        if k == "tone":
            if "clone" not in FEATURES:
                raise HTTPException(422, "cloned voices need KOKORO_FEATURES=clone")
            try:
                r.tone = decode_tone(v)
            except ValueError:
                raise HTTPException(422, "bad tone")
            continue
        base.append(o)
        try:
            n = float(v)
        except ValueError:
            raise HTTPException(422, "bad recipe option")
        if k == "speed":
            r.speed = clamp(n, 0.5, 2.0)
        elif k == "pitch":
            r.pitch = clamp(n, -1.0, 1.0)
        elif k == "warmth":
            r.warmth = clamp(n, -1.0, 1.0)
        else:
            raise HTTPException(422, f"unknown recipe option: {k}")
    r.base = ";".join(base)
    return r


def style_for(r: Recipe) -> np.ndarray:
    return sum(w * BANK[k].astype(np.float32) for k, w in r.weights.items())


def lang_for(r: Recipe, language: str | None = None) -> str:
    """The text's language when given and spoken by Kokoro; otherwise the lead (heaviest) voice's."""
    lead = max(r.weights.items(), key=lambda kv: kv[1])[0]
    code = (language or "").lower().split("-")[0]
    if code == "en":
        return LANGS[lead[0]] if lead[0] in "ab" else "en-us"
    # Mandarin and Japanese voices can't read other scripts through espeak, so they keep their own.
    return TEXT_LANGS.get(code) or LANGS[lead[0]]


def shift_pitch(audio: np.ndarray, factor: float) -> np.ndarray:
    """Raises pitch by `factor` by resampling to len/factor (played at the same rate)."""
    if abs(factor - 1) < 1e-3:
        return audio
    up, down = 1000, int(round(1000 * factor))
    g = gcd(up, down)
    return resample_poly(audio, up // g, down // g).astype(np.float32)


def tilt(audio: np.ndarray, warmth: float) -> np.ndarray:
    """Low-shelf of warmth * WARMTH_DB below about WARMTH_HZ, as a smooth gain curve in the spectrum."""
    if abs(warmth) < 1e-3 or audio.size == 0:
        return audio
    spec = np.fft.rfft(audio)
    f = np.fft.rfftfreq(audio.size, 1 / SAMPLE_RATE)
    gain_db = warmth * WARMTH_DB / (1 + (f / WARMTH_HZ) ** 2)
    return np.fft.irfft(spec * 10 ** (gain_db / 20), n=audio.size).astype(np.float32)


def synth(text: str, r: Recipe, language: str | None = None) -> np.ndarray:
    """Kokoro speech for a recipe at 24 kHz, before limiting; a cloned voice goes through the converter."""
    factor = 2 ** (r.pitch * PITCH_SEMITONES / 12)
    # Resampling up by `factor` shortens the audio by 1/factor, so speak slower by the same factor.
    speed = clamp(r.speed / factor, 0.5, 2.0)
    lang = lang_for(r, language)
    with LOCK:
        if lang in G2P:
            audio, sr = KOKORO.create(phonemes_for(text, lang), voice=style_for(r), speed=speed, is_phonemes=True)
        else:
            audio, sr = KOKORO.create(text, voice=style_for(r), speed=speed, lang=lang)
    assert sr == SAMPLE_RATE
    audio = tilt(shift_pitch(np.asarray(audio, dtype=np.float32), factor), r.warmth)
    if r.tone is not None:
        base = parse_recipe(r.base)
        src = TONE.base_tone(r.base, lambda t: resample(synth(t, base, "en"), SAMPLE_RATE, TONE_RATE))
        audio = resample(TONE.convert(resample(audio, SAMPLE_RATE, TONE_RATE), src, r.tone), TONE_RATE, SAMPLE_RATE)
    return audio


def render(text: str, r: Recipe, language: str | None = None) -> bytes:
    audio = synth(text, r, language)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > PEAK:
        audio = audio * (PEAK / peak)
    buf = io.BytesIO()
    sf.write(buf, audio, SAMPLE_RATE, format="WAV", subtype="PCM_16")
    return buf.getvalue()


class TtsBody(BaseModel):
    text: str = Field(min_length=1)
    recipe: str = Field(min_length=3, max_length=1200)  # a cloned voice's tone adds about 690 characters
    seed: str | None = None  # Kokoro is deterministic; accepted for protocol parity
    language: str | None = Field(default=None, max_length=35)  # BCP 47; sets pronunciation when Kokoro speaks it


@app.get("/v1/health")
def health() -> dict:
    return {
        "ok": True, "model": "kokoro-82m", "sampleRate": SAMPLE_RATE, "voices": len(VOICES),
        "languages": sorted(set(LANGS.values())), "features": sorted(FEATURES),
        **({"clone": {"verifier": SPEAKER_MODEL_NAME, "converter": "openvoice-v2"}} if "clone" in FEATURES else {}),
    }


@app.post("/v1/tts", dependencies=[Depends(auth)])
async def tts(body: TtsBody) -> Response:
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "empty text")
    if len(text) > MAX_TEXT_CHARS:
        raise HTTPException(413, "text too long")
    recipe = parse_recipe(body.recipe)
    wav = await run_in_threadpool(render, text, recipe, body.language)
    return Response(content=wav, media_type="audio/wav")


# ---------------------------------------------------------------------------------------------
# Optional: Speech to Text (faster-whisper) and Voice Isolator (deep-filter), both on CPU.
# ---------------------------------------------------------------------------------------------

def to_wav_bytes(audio: np.ndarray, sr: int) -> bytes:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > PEAK:
        audio = audio * (PEAK / peak)
    buf = io.BytesIO()
    sf.write(buf, audio.astype(np.float32), sr, format="WAV", subtype="PCM_16")
    return buf.getvalue()


def resample(audio: np.ndarray, src: int, dst: int) -> np.ndarray:
    if src == dst:
        return audio.astype(np.float32)
    g = gcd(src, dst)
    return resample_poly(audio, dst // g, src // g).astype(np.float32)


def read_mono(data: bytes) -> tuple[np.ndarray, int]:
    try:
        audio, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=True)
    except Exception:
        raise HTTPException(422, "send a WAV, FLAC or OGG file")
    return audio.mean(axis=1), int(sr)


if FEATURES:
    from fastapi import File, Form, UploadFile  # needs python-multipart

    async def read_upload(file: UploadFile) -> bytes:
        data = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "file too large")
        if not data:
            raise HTTPException(422, "empty file")
        return data


if "transcribe" in FEATURES:
    from faster_whisper import WhisperModel

    print(f"[kokoro] loading Whisper '{WHISPER_MODEL}' on CPU (the first start downloads it)", flush=True)
    try:
        # WHISPER_MODEL is a size ("small", "medium", "large-v3") or a folder holding a converted model.
        WHISPER = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    except Exception as e:  # most often: no internet, or Hugging Face blocked on this network
        raise SystemExit(
            f"Couldn't load the Whisper model '{WHISPER_MODEL}' ({type(e).__name__}). The first start downloads it "
            "from huggingface.co: check the internet connection, or start without transcribe in KOKORO_FEATURES."
        )
    WHISPER_LOCK = threading.Lock()

    @app.post("/v1/transcribe", dependencies=[Depends(auth)])
    async def transcribe(file: UploadFile = File(...), language: str = Form(""), speakers: str = Form("")) -> dict:
        audio, sr = read_mono(await read_upload(file))
        audio16 = resample(audio, sr, 16000)

        def run():
            with WHISPER_LOCK:
                segs, info = WHISPER.transcribe(audio16, language=language[:2] or None, vad_filter=True)
                return list(segs), info

        segments, info = await run_in_threadpool(run)
        return {
            "language": info.language,
            "durationMs": int(len(audio16) / 16),
            "segments": [
                {"startMs": int(s.start * 1000), "endMs": int(s.end * 1000), "speaker": "Speaker 1", "text": s.text.strip()}
                for s in segments if s.text.strip()
            ],
        }


if "isolate" in FEATURES:
    exe = "deep-filter.exe" if sys.platform == "win32" else "deep-filter"
    DEEP_FILTER = os.environ.get("DEEP_FILTER_BIN") or (str(MODELS_DIR / exe) if (MODELS_DIR / exe).exists() else shutil.which("deep-filter"))
    if not DEEP_FILTER or not Path(DEEP_FILTER).exists():
        raise SystemExit(f"KOKORO_FEATURES=isolate needs the deep-filter program: put it at {MODELS_DIR / exe} or set DEEP_FILTER_BIN")
    DF_RATE = 48000

    @app.post("/v1/isolate", dependencies=[Depends(auth)])
    async def isolate(file: UploadFile = File(...)) -> Response:
        audio, sr = read_mono(await read_upload(file))

        def run() -> np.ndarray:
            with tempfile.TemporaryDirectory() as tmp:
                src, out = Path(tmp) / "in.wav", Path(tmp) / "out"
                out.mkdir()
                sf.write(src, resample(audio, sr, DF_RATE), DF_RATE, subtype="PCM_16")
                # -D compensates the filter's delay so the cleaned voice lines up with the original.
                done = subprocess.run([DEEP_FILTER, "-D", "-o", str(out), str(src)], capture_output=True, timeout=1800)
                if done.returncode != 0:
                    print(f"[kokoro] deep-filter failed: {done.stderr.decode(errors='replace')[-500:]}", flush=True)
                    raise HTTPException(500, "isolation failed")
                cleaned, rate = sf.read(out / "in.wav", dtype="float32", always_2d=True)
            out_audio = resample(cleaned[:, 0], int(rate), sr)
            # Same length as the input, so the cleaned voice lines up with the original (Dubbing subtracts it).
            return np.pad(out_audio, (0, max(0, audio.size - out_audio.size)))[: audio.size]

        cleaned = await run_in_threadpool(run)
        return Response(content=to_wav_bytes(cleaned, sr), media_type="audio/wav")


# ---------------------------------------------------------------------------------------------
# Optional: voice cloning (consent check + tone-colour converter), on CPU.
# ---------------------------------------------------------------------------------------------

SPEAKER_MODEL_NAME = "campplus-voxceleb"


def median_f0(audio16: np.ndarray) -> float:
    """Median pitch of the voiced frames (autocorrelation, 60 to 400 Hz); 0 when nothing is voiced."""
    n, hop = 640, 320
    lo, hi = 16000 // 400, 16000 // 60
    found = []
    for i in range(0, len(audio16) - n, hop):
        f = audio16[i:i + n].astype(np.float64)
        f = f - f.mean()
        e = float(f @ f)
        if e < n * 1e-5:
            continue
        ac = np.correlate(f, f, "full")[n - 1:]
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] / e > 0.5:
            found.append(16000 / lag)
    return float(np.median(found)) if len(found) >= 10 else 0.0


if "clone" in FEATURES:
    from typing import List

    from speaker import SpeakerVerifier
    from tone import ToneConverter

    threads = max(1, (os.cpu_count() or 2) // 2)
    try:
        VERIFIER = SpeakerVerifier(MODELS_DIR, threads=threads)
        TONE = ToneConverter(MODELS_DIR, threads=threads)
    except Exception as e:
        raise SystemExit(
            f"KOKORO_FEATURES=clone couldn't load its models ({type(e).__name__}: {e}). It needs PyTorch and sherpa-onnx "
            "(engines/kokoro/requirements-clone.txt) and the models in MODELS_DIR/speaker and MODELS_DIR/openvoice/converter."
        )
    print(f"[kokoro] cloning on: {SPEAKER_MODEL_NAME} consent check, OpenVoice v2 converter", flush=True)

    @app.post("/v1/speaker", dependencies=[Depends(auth)])
    async def speaker_embedding(file: UploadFile = File(...)) -> dict:
        audio, sr = read_mono(await read_upload(file))
        embedding, voiced_ms = await run_in_threadpool(VERIFIER.embed, resample(audio, sr, 16000))
        return {"embedding": embedding, "voicedMs": voiced_ms, "model": SPEAKER_MODEL_NAME}

    @app.post("/v1/clone", dependencies=[Depends(auth)])
    async def clone(files: List[UploadFile] = File(...)) -> dict:
        clips = [read_mono(await read_upload(f)) for f in files[:25]]

        def run() -> dict:
            pitch = [median_f0(resample(a, sr, 16000)) for a, sr in clips]
            tone = TONE.tone_of([resample(a, sr, TONE_RATE) for a, sr in clips])
            voiced = [p for p in pitch if p > 0]
            return {"tone": encode_tone(tone), "f0": round(float(np.median(voiced)), 1) if voiced else 0.0,
                    "seconds": round(sum(len(a) / sr for a, sr in clips), 1)}

        try:
            return await run_in_threadpool(run)
        except ValueError:
            raise HTTPException(422, "no usable speech in the samples")
