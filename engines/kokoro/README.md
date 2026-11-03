# Mimix Kokoro engine (Kokoro-82M): Voice Mixer, or the main engine

As the main engine (`VOICE_ENGINE=kokoro`, with `MIXER_ENGINE_URL` and `MIXER_ENGINE_TOKEN` pointing
here) it also speaks Text to Speech and Studio, with Mimix's library voices mapped to Kokoro voices in
`src/config/kokoro-voices.ts`, in English (US, UK), Spanish, French, Hindi, Italian, Brazilian
Portuguese and, with misaki installed (Python 3.12 or older), Mandarin and Japanese. Optional extras, set with `KOKORO_FEATURES` on both the server and the app:

| Feature | What | Needs |
|---|---|---|
| `transcribe` | Speech to Text with faster-whisper (MIT) on CPU, int8; model `WHISPER_MODEL` (default `small`), downloaded from Hugging Face on first start; no diarization | `pip install -r requirements-stt.txt` |
| `isolate` | Voice Isolator with DeepFilterNet's standalone `deep-filter` program (MIT/Apache-2.0, model built in) | The binary at `DEEP_FILTER_BIN` or `MODELS_DIR/deep-filter` |
| `clone` | Voice cloning: the consent check's speaker embedding (`speaker.py`, 3D-Speaker CAM++ through sherpa-onnx, Apache-2.0) and OpenVoice v2's tone-colour converter (`tone.py` and `openvoice/`, MIT, PyTorch on CPU). The app also needs `SPEAKER_VERIFIER=neural`, and `transcribe` on for the consent phrase | `pip install --torch-backend cpu -r requirements-clone.txt` (uv); `MODELS_DIR/speaker/campplus_en_voxceleb_16k.onnx` and `MODELS_DIR/openvoice/converter/{config.json,checkpoint.pth}` |

On one computer, `Start Mimix` (see `docs/local-setup.md`) installs and runs all of this for you.
Pronunciation uses espeak-ng through phonemizer (both GPL-3.0). We run them unmodified on our own
server and don't distribute them, which GPL allows; see DECISIONS 2026-11-03.


The Voice Mixer blends Kokoro's library voices into new voices. Kokoro describes each voice as a
style tensor; a weighted sum of two or three tensors is a natural new voice (go/no-go test,
DECISIONS 2026-11-02). It runs on CPU.

| | |
|---|---|
| Model | Kokoro-82M v1.0, ONNX build (weights Apache-2.0; kokoro-onnx code MIT) |
| Voices | 54, all in the Voice Library (`src/config/mixer-voices.ts` and `kokoro-voices.ts`) |
| Hardware | CPU, about 1 GB of memory. One synthesis at a time per process |
| Port | 8810 |

## Run it

```bash
docker build -t mimix-kokoro engines/kokoro
docker run -p 8810:8810 -e MIMIX_MIXER_TOKEN=<random 32+ characters> mimix-kokoro
```

Then set these in the app (Vercel environment variables):

| Variable | Value |
|---|---|
| `MIXER_ENGINE` | `kokoro` |
| `MIXER_ENGINE_URL` | The server's https address, for example `https://mixer.example.com` |
| `MIXER_ENGINE_TOKEN` | The same value as `MIMIX_MIXER_TOKEN` on the server |
| `MIX_CLONE_TO_MAIN` | `true` to also clone saved mixes onto the main engine ("mix, then clone") |

Without Docker: `pip install -r requirements.txt`, put `kokoro-v1.0.onnx` and `voices-v1.0.bin` in
a folder, then `MODELS_DIR=<folder> MIMIX_MIXER_TOKEN=... uvicorn server:app --port 8810`.

## Protocol (Mimix mixer protocol v1)

`GET /v1/health` returns `{ok, model, sampleRate, voices}` with no token.

`POST /v1/tts` with `Authorization: Bearer <token>` and JSON `{text, recipe, seed?}` returns
`audio/wav` (24 kHz, 16-bit, mono). Errors: 401 bad token, 413 text over `MAX_TEXT_CHARS`
(default 5000), 422 bad recipe.

A recipe holds the whole voice, so the server keeps no state:

```
af_heart:0.6,am_michael:0.4;speed=1.05;pitch=0.2;warmth=-0.1
```

- Weights are normalised; one to three voices.
- `speed` 0.5 to 2 is Kokoro's speaking rate.
- `pitch` -1 to 1 shifts by up to 2 semitones (resampling, with the speaking rate compensated so the
  length stays about the same).
- `warmth` -1 to 1 is a low-shelf tilt of up to 4 dB below about 300 Hz.
- `tone` (only with `clone`) is a cloned speaker's timbre: OpenVoice v2's 256-number tone colour as
  base64url float16 (683 characters). Kokoro speaks with the blend, then the converter swaps the
  blend's own tone (measured once from a reference passage and cached) for this one.
- Every response is peak-limited to -1 dBFS.

## Cloning endpoints (`KOKORO_FEATURES=clone`)

| Endpoint | Body | Returns |
|---|---|---|
| `POST /v1/speaker` | multipart `file` | `{embedding: 512 numbers, length 1, voicedMs, model: "campplus-voxceleb"}`. The app compares two embeddings by their dot product |
| `POST /v1/clone` | multipart `files` (up to 25) | `{tone, f0, seconds}`: the speakers' tone for a recipe, and their median pitch, which the app uses to pick the base voice |

`calibrate_verifier.py <folder> --env .env.local --models <MODELS_DIR>` sets the consent check's pass
mark (`SPEAKER_MATCH`) from your own recordings: one subfolder per person, three or more recordings
each. `Tune voice check` on the desktop runs it.

Local check (2026-11-03, CPU, 4 threads): loading both models took 5 s; converting 5.3 s of speech took
1.3 s; a first line with a new base voice took 6.8 s (it measures the base voice once), the next 2.3 s
for 3.6 s of audio. With OpenVoice's v1 converter standing in for v2 (Hugging Face is blocked in
Claude's workspace), the tone distance to the target speaker fell from about 18 to about 6 and the
pitch moved to the target's (120 Hz to 223 Hz for a 201 Hz speaker). On clean speech CAM++ scored the
same person 0.83 to 0.97 and different people −0.03 to 0.29 on 10 to 45 second halves.

Local check (2026-11-02, CPU): a 50/50 Heart and Michael blend read at a median 160 Hz; pitch +1 gave
178 Hz and pitch -1 gave 142 Hz (±2 semitones = ×1.12), with length within 6% of the original and no
clipping.
