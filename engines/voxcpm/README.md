# Mimix VoxCPM2 engine server

This is the self-hosted voice engine. It runs [VoxCPM2](https://github.com/OpenBMB/VoxCPM) (code and weights Apache-2.0) on a GPU and speaks the small "Mimix engine protocol v1". The app talks to it through `src/lib/voice/selfhosted-engine.ts` when `VOICE_ENGINE=voxcpm`.

> **Status:** written against the VoxCPM README (read 2026-11-02) but **not yet run on a GPU**, because the build workspace has none. Run the smoke test below on the first GPU box before pointing the app at it, then pin the package versions in `requirements.txt` with `pip freeze`.

## What it does

| Endpoint | Feature flag | What it does |
|---|---|---|
| `GET /v1/health` | always | Returns the model, sample rate and enabled features |
| `POST /v1/tts` | always | Text to WAV with a stored voice, or a built-in voice |
| `POST /v1/tts/stream` | `stream` | The same, as a chunked WAV stream |
| `POST /v1/voices` | `clone` | Instant clone from up to 30 s of the uploaded samples |
| `POST /v1/voices/design` | `design` | Up to 3 draft voices from a text description, each with a preview |
| `POST /v1/voices/{id}/publish` | `design` | Keeps a draft. Drafts that aren't published are deleted after 24 hours |
| `DELETE /v1/voices/{id}` | always | Deletes a voice (used for account deletion and takedowns) |
| `POST /v1/transcribe` | `transcribe` | Speech to text with faster-whisper (no speaker labels yet) |
| `POST /v1/isolate` | `isolate` | Removes background noise with DeepFilterNet |

Every request needs `Authorization: Bearer <MIMIX_ENGINE_TOKEN>`.

Voices are stored as a reference clip plus its transcript in `VOICES_DIR`. Two built-in voices, `builtin-low` and `builtin-high`, are designed on first start. Library voices that have no engine voice of their own read with one of them, chosen by pitch.

Voice mixing is not possible with VoxCPM2: it copies a reference clip rather than using a speaker vector that could be blended. Voice conversion and sound effects are not in this server either.

## Run it

You need a Linux machine with an NVIDIA GPU with about 8 GB of memory or more (the VoxCPM model table says "~8 GB"), Docker and the NVIDIA container toolkit.

```bash
cd engines/voxcpm
docker build -t mimix-voxcpm .
docker run --gpus all -p 8808:8808 -v mimix-voxcpm:/data \
  -e MIMIX_ENGINE_TOKEN="$(openssl rand -hex 24)" \
  -e FEATURES=stream,clone,design \
  mimix-voxcpm
```

Copy the token you generated into the app's `SELF_HOSTED_ENGINE_TOKEN`. Keep the server off the public internet if you can (private network or a tunnel). If it must be public, put it behind HTTPS.

| Variable | Default | Meaning |
|---|---|---|
| `MIMIX_ENGINE_TOKEN` | none (required) | Shared secret, at least 16 characters |
| `FEATURES` | `stream,clone,design` | Optional endpoints to enable; add `transcribe` and `isolate` if wanted |
| `MODEL_ID` | `openbmb/VoxCPM2` | Hugging Face model id |
| `VOICES_DIR` | `/data/voices` | Where voices are stored; keep it on a persistent volume |
| `INFERENCE_STEPS` | `10` | Diffusion steps; higher is slower and a little cleaner |
| `DEFAULT_CFG` | `2.0` | Guidance; the app sends 1.5 to 3.0 from the Similarity slider |
| `WHISPER_MODEL` | `large-v3` | faster-whisper model, for `transcribe` |
| `MAX_TEXT_CHARS` | `5000` | Longest text per request |

## Point the app at it

```
VOICE_ENGINE=voxcpm
SELF_HOSTED_ENGINE_URL=https://your-gpu-host:8808
SELF_HOSTED_ENGINE_TOKEN=<the same token>
SELF_HOSTED_FEATURES=stream,clone,design
```

`SELF_HOSTED_FEATURES` must match the server's `FEATURES`. The app hides the tools the engine can't run.

## Smoke test

```bash
TOKEN=...; URL=http://localhost:8808
curl -s -H "Authorization: Bearer $TOKEN" $URL/v1/health
curl -s -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"text":"Hello from Mimix.","voiceId":"builtin-high"}' $URL/v1/tts -o hello.wav
curl -s -H "Authorization: Bearer $TOKEN" -F file=@hello.wav -F name=test $URL/v1/voices
```

Listen to `hello.wav`, then check that the clone call returns a `voiceId`.
