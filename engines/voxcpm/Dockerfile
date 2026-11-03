# GPU image for the Mimix VoxCPM2 engine. Needs an NVIDIA GPU with about 8 GB of memory or more.
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt requirements-extras.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-extras.txt
COPY server.py .

ENV VOICES_DIR=/data/voices HF_HOME=/data/hf
VOLUME ["/data"]
EXPOSE 8808
# One worker per GPU: the model is loaded once per process.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8808", "--workers", "1"]
