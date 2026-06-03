# ASRE — Production Dockerfile
# Multi-stage build: lean final image, no build tools in prod.
#
# Build:  docker build -t asre:latest .
# Local:  docker run --env-file .env -p 8000:8000 asre:latest
# GCP:    See deploy-cloudrun.sh for one-command Cloud Run deployment
# Health: curl http://localhost:8000/health
#
# DATA STRATEGY: Parquet sample is BAKED INTO the image (100MB).
# No GCS mount needed. Cloud Run startup is fast, no cold-read latency.
# For production at scale: swap ASRE_DATA_PATH to GCS FUSE mount or BigQuery.

# ---------------------------------------------------------------------------
# Stage 1 — Builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build deps only in this stage
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ---------------------------------------------------------------------------
# Stage 2 — Runtime (lean)
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# Security: run as non-root
RUN groupadd -r asre && useradd -r -g asre asre

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY asre/        ./asre/
COPY gunicorn.conf.py .

# Bake the Parquet sample directly into the image.
# 100MB cost is worth zero cold-start I/O and zero GCS complexity at demo scale.
# Replace with GCS FUSE mount when moving to full NOAA dataset (production).
COPY data/        ./data/

RUN chown -R asre:asre /app

# Switch to non-root user
USER asre

# -- Runtime config -----------------------------------------------------------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# Worker heartbeats — must be writable, use RAM
VOLUME ["/dev/shm"]

EXPOSE 8000

# Healthcheck — Docker will mark container unhealthy if this fails 3× in 30s
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" \
    || exit 1

# Entrypoint — gunicorn manages workers; uvicorn handles async I/O per worker
CMD ["gunicorn", "-c", "gunicorn.conf.py", "asre.main:app"]
