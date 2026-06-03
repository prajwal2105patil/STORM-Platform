# DREADNOUGHT ASRE — Zero-Cost Deployment Guide

## Stack (all free tiers)
| Service | Purpose | Free limit |
|---------|---------|-----------|
| Supabase | PostgreSQL (data warehouse) | 500MB, unlimited API calls |
| Groq API | LLM routing (llama-3.1-8b) | 14,400 req/day |
| Vercel | Next.js hosting + API routes | 100GB bandwidth/mo |
| GitHub | Repository + CI/CD | Unlimited public repos |

---

## Step 1 — Supabase Setup (10 min)

1. Go to [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste contents of `migration/supabase_schema.sql` → Run
3. Settings → API → copy `URL`, `anon key`, `service_role key`

---

## Step 2 — Run Data Migration (once, from your machine)

```bash
cd STORM-PLATFORM
pip install duckdb supabase python-dotenv --break-system-packages

# Create .env file
cp webapp/.env.example webapp/.env
# Edit webapp/.env with your Supabase credentials

export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJ..."

python migration/migrate_to_supabase.py
```

This reads your local Parquet files, computes monthly wind stats, and uploads to Supabase.
**Run once. Never again. Zero GCP needed.**

---

## Step 3 — Groq API Key (2 min)

1. Go to [console.groq.com](https://console.groq.com) → API Keys → Create
2. Add to `webapp/.env` as `GROQ_API_KEY=gsk_...`

---

## Step 4 — Local Development

```bash
cd STORM-PLATFORM/webapp
npm install
cp .env.example .env.local
# Fill in SUPABASE + GROQ keys

npm run dev
# → http://localhost:3000
```

---

## Step 5 — GitHub Setup

```bash
cd STORM-PLATFORM
git init
git add .
git commit -m "feat: DREADNOUGHT ASRE v2 — zero-cost stack"
git remote add origin https://github.com/YOUR_USERNAME/dreadnought-asre.git
git push -u origin main
```

---

## Step 6 — Vercel Deployment

```bash
npm install -g vercel
cd webapp
vercel
# Follow prompts — link to your GitHub repo
```

**Add environment variables in Vercel dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `GROQ_API_KEY`

**Add GitHub Secrets** (for CI/CD auto-deploy):
- `VERCEL_TOKEN` (from vercel.com → Settings → Tokens)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GROQ_API_KEY`

---

## Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Operations dashboard |
| `/adjudicate` | GET | Claim submission UI |
| `/claims` | GET | Claims table with filters |
| `/customers` | GET | Customer CRM |
| `/analytics` | GET | Charts and metrics |
| `/api/adjudicate` | POST | ASRE adjudication API |
| `/api/claims` | GET | Claims list (paginated) |
| `/api/analytics` | GET | Aggregate metrics |

---

## ASRE API Usage

```bash
curl -X POST https://your-app.vercel.app/api/adjudicate \
  -H "Content-Type: application/json" \
  -d '{
    "petitioner": "Suzlon Energy Ltd",
    "asset_name": "Jaisalmer Wind Farm",
    "asset_lat": 26.9090,
    "asset_lon": 70.9000,
    "start_date": "2022-06-01",
    "end_date": "2022-06-30",
    "claimed_cause": "Cyclone"
  }'
```

**Response:**
```json
{
  "label": "VALIDATED",
  "nearest_station": "Jaisalmer",
  "nearest_station_km": 3.2,
  "peak_wind_ms": 21.4,
  "exceedance_hours": 26,
  "processing_ms": 420,
  "legal_summary": "VALIDATED under NOAA Rule 803(8)...",
  "node_path": ["IntentRouter", "SQLGenerator", "ExecutionCage", "Adjudicator"]
}
```
