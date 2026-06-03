#!/bin/bash
# ASRE — GCP Cloud Run Deployment Script
# One-command deploy. Runs 24/7. Scales to zero when idle (costs nothing).
#
# PREREQUISITES (run once on your machine):
#   1. Install gcloud CLI: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login
#   3. gcloud auth configure-docker asia-south1-docker.pkg.dev
#   4. Fill in the variables below.
#
# COST ESTIMATE at demo volume (< 1000 req/day):
#   Cloud Run:      ~$0.00  (free tier: 2M requests/month)
#   Artifact Registry: ~$0.10/month (image storage)
#   Total:          < $0.15/month  ← ZERO credit burn on $24 runway
#
# RUN: bash deploy-cloudrun.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# CONFIGURE THESE — your GCP values
# ---------------------------------------------------------------------------
PROJECT_ID="your-gcp-project-id"          # gcloud projects list
REGION="asia-south1"                       # Mumbai — lowest latency for India
SERVICE_NAME="asre"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/asre/${SERVICE_NAME}:latest"

# ---------------------------------------------------------------------------
# MANDATORY: Set your API key(s) before deploying
# Generate: python -c "import secrets; print(secrets.token_hex(32))"
# ---------------------------------------------------------------------------
API_KEYS="paste-your-generated-api-key-here"

# ---------------------------------------------------------------------------
# Step 1 — Enable required GCP APIs (idempotent, safe to re-run)
# ---------------------------------------------------------------------------
echo "▶ Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}"

# ---------------------------------------------------------------------------
# Step 2 — Create Artifact Registry repo (skip if exists)
# ---------------------------------------------------------------------------
echo "▶ Creating Artifact Registry repository..."
gcloud artifacts repositories create asre \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --quiet 2>/dev/null || echo "  (repo already exists, continuing)"

# ---------------------------------------------------------------------------
# Step 3 — Build and push Docker image
# ---------------------------------------------------------------------------
echo "▶ Building Docker image..."
docker build -t "${IMAGE_NAME}" .

echo "▶ Pushing to Artifact Registry..."
docker push "${IMAGE_NAME}"

# ---------------------------------------------------------------------------
# Step 4 — Deploy to Cloud Run
# ---------------------------------------------------------------------------
echo "▶ Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=30 \
  --set-env-vars="ASRE_API_KEYS=${API_KEYS},ASRE_ENV=production,ASRE_DB_POOL_SIZE=4,ASRE_THREAD_WORKERS=8,ASRE_RATE_LIMIT_PER_MIN=60"

# ---------------------------------------------------------------------------
# Step 5 — Verify deployment
# ---------------------------------------------------------------------------
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(status.url)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  ASRE LIVE: ${SERVICE_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Health check:"
curl -s "${SERVICE_URL}/health" | python3 -m json.tool

echo ""
echo "Test adjudication:"
curl -s -X POST "${SERVICE_URL}/adjudicate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEYS}" \
  -d '{"claim": "Hurricane-force winds at Kutch in August 2023 caused generation shortfall."}' \
  | python3 -m json.tool
