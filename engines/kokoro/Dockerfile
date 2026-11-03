# CPU image for the Mimix Voice Mixer (Kokoro-82M, Apache-2.0). No GPU needed: about 1 GB of memory.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 espeak-ng curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Model files from the kokoro-onnx GitHub release (no Hugging Face access needed).
ARG KOKORO_RELEASE=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
RUN mkdir -p /models \
 && curl -fsSL -o /models/kokoro-v1.0.onnx  "$KOKORO_RELEASE/kokoro-v1.0.onnx" \
 && curl -fsSL -o /models/voices-v1.0.bin   "$KOKORO_RELEASE/voices-v1.0.bin"

COPY server.py .
ENV MODELS_DIR=/models
EXPOSE 8810
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fs http://localhost:8810/v1/health || exit 1
# One worker per container: the model is loaded once per process. Scale out with replicas.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8810", "--workers", "1"]
