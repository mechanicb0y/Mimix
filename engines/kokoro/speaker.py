"""
Neural speaker verification for Mimix's consent check (KOKORO_FEATURES=clone).

The model is 3D-Speaker's CAM++ trained on VoxCeleb (iic/speech_campplus_sv_en_voxceleb_16k,
Apache-2.0), in the ONNX export that sherpa-onnx publishes on GitHub. sherpa-onnx (Apache-2.0)
computes the 80-band filterbank features exactly as the model was trained and runs it on the CPU.
CAM++ is a newer member of the ECAPA-TDNN family with a lower error rate on VoxCeleb (0.65% EER
against ECAPA's 0.86%, per 3D-Speaker's model card), and it is small (30 MB) and fast on a CPU.

An embedding is 512 numbers with length 1; the score between two recordings is their dot product
(cosine similarity), about 0.8 to 0.95 for the same person and below 0.3 for different people on
clean speech. The pass mark is set in the app (SPEAKER_MATCH) and tuned with calibrate_verifier.py.
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np

SAMPLE_RATE = 16000
MODEL_FILE = "campplus_en_voxceleb_16k.onnx"
MODEL_NAME = "campplus-voxceleb"
FRAME_S = 0.03


def model_path(models_dir: Path) -> Path:
    return Path(os.environ.get("SPEAKER_MODEL", str(models_dir / "speaker" / MODEL_FILE)))


def voiced(audio: np.ndarray, sr: int = SAMPLE_RATE, floor_db: float = -35.0) -> tuple[np.ndarray, int]:
    """Keeps the frames with speech (within 35 dB of the loudest, above -55 dBFS), with a little context."""
    n = int(sr * FRAME_S)
    k = len(audio) // n
    if k == 0:
        return audio[:0], 0
    frames = audio[: k * n].reshape(k, n)
    energy = 10 * np.log10((frames.astype(np.float64) ** 2).mean(1) + 1e-10)
    keep = (energy > energy.max() + floor_db) & (energy > -55)
    speech_ms = int(keep.sum() * FRAME_S * 1000)
    keep = np.convolve(keep.astype(float), np.ones(5), "same") > 0
    return frames[keep].reshape(-1), speech_ms


class SpeakerVerifier:
    def __init__(self, models_dir: Path, threads: int = 2):
        import sherpa_onnx

        path = model_path(models_dir)
        if not path.exists():
            raise FileNotFoundError(f"speaker model not found at {path}")
        cfg = sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(path), num_threads=threads)
        if not cfg.validate():
            raise ValueError(f"speaker model at {path} could not be loaded")
        self.extractor = sherpa_onnx.SpeakerEmbeddingExtractor(cfg)
        self.dim = self.extractor.dim

    def embed(self, audio16k: np.ndarray) -> tuple[list[float], int]:
        """Unit-length embedding of the speech in a 16 kHz mono recording, and how much speech it held."""
        speech, speech_ms = voiced(audio16k.astype(np.float32))
        if speech_ms < 500:
            return [], speech_ms
        s = self.extractor.create_stream()
        s.accept_waveform(SAMPLE_RATE, speech)
        s.input_finished()
        v = np.asarray(self.extractor.compute(s), dtype=np.float64)
        v = v / max(1e-9, float(np.linalg.norm(v)))
        return [round(float(x), 6) for x in v], speech_ms
