"""
Tunes the consent check's pass mark (SPEAKER_MATCH) on your own recordings.

    python calibrate_verifier.py <folder> [--env path/to/.env.local]

The folder holds one subfolder per person, each with at least three recordings of that person
speaking (WAV, MP3, FLAC or OGG; 5 to 60 seconds each; any words). Two people is the minimum; five
or more, recorded on the phones and laptops your customers use, gives a much better mark.

    voices/
      awab/      kitchen.wav  office.mp3  phone.wav
      sara/      1.wav  2.wav  3.wav
      ...

For every recording it plays the consent check: the person's other recordings stand in for their
voice samples, and the first 6 seconds of speech stand in for the consent phrase. "Same person"
scores come from those trials; "different person" scores from each crop against everyone else.
The mark is placed so that no different-person trial passes, with a margin, and the report says
how many same-person trials it would have refused (those people would simply record again).

With --env, the mark is written to that file as SPEAKER_MATCH, with SPEAKER_MATCH_TUNED saying when
and on how much. Restart Mimix to use it. Nothing leaves this computer.
"""
from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sys
from math import gcd
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

sys.path.insert(0, str(Path(__file__).resolve().parent))
from speaker import SAMPLE_RATE, SpeakerVerifier, voiced  # noqa: E402

AUDIO = {".wav", ".mp3", ".flac", ".ogg", ".oga"}
CONSENT_SECONDS = 6.0
MARGIN = 0.05
LOWEST, HIGHEST = 0.3, 0.9


def load(path: Path) -> np.ndarray | None:
    try:
        a, sr = sf.read(str(path), dtype="float32", always_2d=True)
    except Exception:
        return None
    a = a.mean(axis=1)
    if sr != SAMPLE_RATE:
        g = gcd(int(sr), SAMPLE_RATE)
        a = resample_poly(a, SAMPLE_RATE // g, int(sr) // g).astype(np.float32)
    return a


def unit(v: np.ndarray) -> np.ndarray:
    return v / max(1e-9, float(np.linalg.norm(v)))


def main() -> int:
    ap = argparse.ArgumentParser(description="Tune the consent check on your own recordings.")
    ap.add_argument("folder", type=Path)
    ap.add_argument("--env", type=Path, help="write SPEAKER_MATCH to this .env file")
    ap.add_argument("--models", type=Path, default=Path(os.environ.get("MODELS_DIR", "/models")))
    args = ap.parse_args()

    if not args.folder.is_dir():
        print(f"Not a folder: {args.folder}")
        return 2
    verifier = SpeakerVerifier(args.models)
    people: dict[str, list[tuple[str, np.ndarray, np.ndarray]]] = {}
    skipped: list[str] = []
    for person in sorted(p for p in args.folder.iterdir() if p.is_dir()):
        for f in sorted(person.iterdir()):
            if f.suffix.lower() not in AUDIO:
                if f.is_file() and not f.name.startswith("."):
                    skipped.append(f"{person.name}/{f.name} (save it as WAV or MP3)")
                continue
            audio = load(f)
            if audio is None:
                skipped.append(f"{person.name}/{f.name} (couldn't read it)")
                continue
            full, full_ms = verifier.embed(audio)
            speech, _ = voiced(audio)
            crop, crop_ms = verifier.embed(speech[: int(CONSENT_SECONDS * SAMPLE_RATE)])
            if full_ms < 3000 or not crop:
                skipped.append(f"{person.name}/{f.name} (less than 3 seconds of speech)")
                continue
            people.setdefault(person.name, []).append((f.name, np.array(full), np.array(crop)))

    for s in skipped:
        print(f"  skipped {s}")
    people = {k: v for k, v in people.items() if len(v) >= 3}
    n_rec = sum(len(v) for v in people.values())
    print(f"\n{len(people)} people with at least 3 usable recordings, {n_rec} recordings in all.")
    if len(people) < 2:
        print("Add a subfolder for at least two people, with three or more recordings each, and run it again.")
        return 1

    enrolled = {k: unit(np.mean([e for _, e, _ in v], axis=0)) for k, v in people.items()}
    same: list[tuple[float, str]] = []
    diff: list[tuple[float, str]] = []
    for name, recs in people.items():
        for i, (fname, _, crop) in enumerate(recs):
            others = unit(np.mean([e for j, (_, e, _) in enumerate(recs) if j != i], axis=0))
            same.append((float(crop @ others), f"{name}/{fname}"))
            for other, emb in enrolled.items():
                if other != name:
                    diff.append((float(crop @ emb), f"{name}/{fname} vs {other}"))

    s = np.array([x for x, _ in same])
    d = np.array([x for x, _ in diff])
    print(f"Same person:      lowest {s.min():.3f}, median {np.median(s):.3f} ({len(s)} trials)")
    print(f"Different people: highest {d.max():.3f}, median {np.median(d):.3f} ({len(d)} trials)")

    mark = float(np.clip(max(d.max() + MARGIN, (d.max() + s.min()) / 2 if s.min() > d.max() else 0), LOWEST, HIGHEST))
    mark = round(mark, 2)
    refused = sorted((x, n) for x, n in same if x < mark)
    passed = [(x, n) for x, n in diff if x >= mark]
    print(f"\nPass mark: {mark}")
    print(f"  Different-person trials that would pass: {len(passed)} of {len(d)}")
    print(f"  Same-person trials that would be refused: {len(refused)} of {len(s)}")
    for x, n in refused[:10]:
        print(f"    {n}: {x:.3f} (a quieter room or a closer microphone usually fixes this)")
    if len(refused) > len(s) * 0.2:
        print("  More than 1 in 5 same-person trials fall short. Check those recordings for noise, music or other voices.")

    if args.env:
        detail = f"{dt.date.today().isoformat()} · {n_rec} recordings, {len(people)} people"
        lines = args.env.read_text().splitlines() if args.env.exists() else []
        lines = [ln for ln in lines if not re.match(r"^\s*SPEAKER_MATCH(_TUNED)?\s*=", ln)]
        lines += [f"SPEAKER_MATCH={mark}", f"SPEAKER_MATCH_TUNED={detail}"]
        args.env.write_text("\n".join(lines) + "\n")
        print(f"\nSaved to {args.env}. Restart Mimix to use it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
