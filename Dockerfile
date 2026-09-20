FROM python:3.12-slim

# Install system dependencies (ffmpeg and build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir demucs torch torchaudio

# Copy app code
COPY . .

# Ensure upload/output directories exist
RUN mkdir -p uploads output demo

# Set environment variables
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["python", "server.py"]
