"""
Voice cloning on a CPU: Kokoro speaks, then OpenVoice v2's tone-colour converter (MIT) makes the
result sound like the cloned speaker (KOKORO_FEATURES=clone).

A clone is a "tone": the converter's 256-number description of a speaker's timbre, averaged over
the samples. It travels inside the voice's recipe (";tone=..." as base64 float16), so the server
keeps no state. To speak, Kokoro renders the text with the recipe's base voice, the converter reads
the base voice's own tone from a reference sentence (cached), and swaps it for the clone's.

Checkpoint: myshell-ai/OpenVoiceV2 converter/checkpoint.pth and config.json (MIT), in
MODELS_DIR/openvoice/converter. The watermark OpenVoice adds by default (wavmark) is not used:
Mimix marks generated audio itself.
"""
from __future__ import annotations

import base64
import json
import os
import threading
from collections import OrderedDict
from pathlib import Path

import numpy as np

TONE_DIM = 256
SAMPLE_RATE = 22050
# How strongly the converter follows the target (OpenVoice's default 0.3; lower = closer to the target).
TAU = float(os.environ.get("OPENVOICE_TAU", "0.3"))
# A neutral passage the base voices read once to measure their own tone (about 15 seconds).
REFERENCE_TEXT = (
    "The morning was quiet, and the river moved slowly under the old stone bridge. "
    "We talked about small things: the weather, the market, a letter that had finally arrived. "
    "Then, just before noon, the bells began to ring across the valley."
)


def encode_tone(v: np.ndarray) -> str:
    return base64.urlsafe_b64encode(np.asarray(v, dtype="<f2").tobytes()).decode().rstrip("=")


def decode_tone(s: str) -> np.ndarray:
    raw = base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
    v = np.frombuffer(raw, dtype="<f2").astype(np.float32)
    if v.shape != (TONE_DIM,) or not np.all(np.isfinite(v)):
        raise ValueError("bad tone")
    return v


class _HParams(dict):
    def __getattr__(self, k):
        v = self[k]
        return _HParams(v) if isinstance(v, dict) else v


class ToneConverter:
    def __init__(self, models_dir: Path, threads: int | None = None):
        import torch

        from openvoice.models import SynthesizerTrn

        self.torch = torch
        if threads:
            torch.set_num_threads(threads)
        root = Path(os.environ.get("OPENVOICE_DIR", str(models_dir / "openvoice" / "converter")))
        cfg_path, ckpt_path = root / "config.json", root / "checkpoint.pth"
        if not cfg_path.exists() or not ckpt_path.exists():
            raise FileNotFoundError(f"OpenVoice v2 converter not found in {root}")
        self.hps = _HParams(json.loads(cfg_path.read_text()))
        d = self.hps.data
        if d.sampling_rate != SAMPLE_RATE:
            raise ValueError("unexpected OpenVoice sampling rate")
        self.model = SynthesizerTrn(0, d.filter_length // 2 + 1, n_speakers=d.n_speakers, **self.hps["model"])
        state = torch.load(ckpt_path, map_location="cpu", weights_only=True)
        missing, _ = self.model.load_state_dict(state["model"], strict=False)
        needed = [k for k in missing if not k.startswith("enc_p.")]
        if needed:
            raise ValueError(f"OpenVoice checkpoint is missing {len(needed)} weights")
        self.model.eval()
        self.window = torch.hann_window(d.win_length)
        self.lock = threading.Lock()
        self.cache: OrderedDict[str, np.ndarray] = OrderedDict()

    def _spec(self, audio: np.ndarray):
        torch, d = self.torch, self.hps.data
        y = torch.from_numpy(np.clip(audio, -1, 1).astype(np.float32)).unsqueeze(0)
        pad = (d.filter_length - d.hop_length) // 2
        y = torch.nn.functional.pad(y.unsqueeze(1), (pad, pad), mode="reflect").squeeze(1)
        s = torch.stft(y, d.filter_length, hop_length=d.hop_length, win_length=d.win_length, window=self.window,
                       center=False, normalized=False, onesided=True, return_complex=True)
        return torch.sqrt(s.real.pow(2) + s.imag.pow(2) + 1e-6)

    def tone_of(self, clips: list[np.ndarray]) -> np.ndarray:
        """The speaker's tone, averaged over clips of 22.05 kHz mono audio."""
        gs = []
        with self.lock, self.torch.no_grad():
            for a in clips:
                if len(a) < SAMPLE_RATE // 2:
                    continue
                spec = self._spec(a)
                gs.append(self.model.ref_enc(spec.transpose(1, 2)).squeeze(0).numpy())
        if not gs:
            raise ValueError("no audio")
        return np.mean(gs, axis=0).astype(np.float32)

    def base_tone(self, key: str, render_reference) -> np.ndarray:
        """The tone of a base recipe, measured once from the reference passage (kept for 64 recipes)."""
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        v = self.tone_of([render_reference(REFERENCE_TEXT)])
        self.cache[key] = v
        if len(self.cache) > 64:
            self.cache.popitem(last=False)
        return v

    def convert(self, audio: np.ndarray, src: np.ndarray, tgt: np.ndarray) -> np.ndarray:
        torch = self.torch
        with self.lock, torch.no_grad():
            spec = self._spec(audio)
            lengths = torch.LongTensor([spec.size(-1)])
            s = torch.from_numpy(src).view(1, TONE_DIM, 1)
            t = torch.from_numpy(tgt).view(1, TONE_DIM, 1)
            out = self.model.voice_conversion(spec, lengths, sid_src=s, sid_tgt=t, tau=TAU)[0][0, 0]
        return out.numpy().astype(np.float32)
