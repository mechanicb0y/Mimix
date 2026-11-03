# Mimix Chatterbox Multilingual engine (graphics card)

Chatterbox Multilingual (Resemble AI; code and weights MIT) on an NVIDIA graphics card, speaking the
same "Mimix engine protocol v1" as `engines/voxcpm`. The app uses it as the **graphics-card engine**
next to Kokoro (`GPU_ENGINE=chatterbox`): cloned voices are made and spoken here, and text in a
language Kokoro doesn't speak is read here with a built-in voice picked by pitch.

> **Status: not yet run on a GPU.** Claude's workspace has no graphics card and can't reach
> huggingface.co, where the weights are. Written against chatterbox-tts 0.1.7 and its README.

| | |
|---|---|
| Languages | 23: Arabic, Danish, German, Greek, English, Spanish, Finnish, French, Hebrew, Hindi, Italian, Japanese, Korean, Malay, Dutch, Norwegian, Polish, Portuguese, Russian, Swedish, Swahili, Turkish, Chinese |
| Cloning | From the samples (up to 20 s are kept as the reference) |
| Hardware | NVIDIA GPU, 8 GB of graphics memory or more (our conservative figure) |
| Port | 8820 (the launcher) |
| Watermark | Resemble's Perth watermark in every output (built into the package) |

## On one computer

`Start Mimix` finds the card with `nvidia-smi` and asks once which engine to use. It installs this
engine into `local/py-gpu` (Python 3.11, PyTorch for your driver through uv's `--torch-backend auto`),
writes the two built-in voices from Kokoro, and starts the server. The model downloads from
huggingface.co on the first start (about 6 GB in all).

## Smoke test (first GPU computer)

```bash
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8820/v1/health
curl -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"text":"مرحبا، هذا اختبار.","language":"ar"}' http://127.0.0.1:8820/v1/tts -o ar.wav
```

Then clone a voice in the app (Voices, Clone a voice) and play a line in Malay and in Arabic.
