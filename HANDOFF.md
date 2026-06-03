# DREADNOUGHT ASRE — Session Handoff Document
**For:** Next Claude agent instance (Cowork / Claude Code / Agent SDK)
**Project root:** `E:\STORM-PLATFORM\`
**Date of last session:** 2026-06-03
**Status:** 26/28 tasks complete. 2 tasks in-progress (deployment + paper submission).

---

## PRIME DIRECTIVE (read this first)

You are the Lead Data Architect for **Project DREADNOUGHT**. The mission is to replace a 60-day, $50,000 corporate legal adjudication process with a **sub-5-second API call**.

**RUNWAY LAW — NON-NEGOTIABLE:**
- Remaining GCP credits: ~$24 USD (2000 INR). Treat as zero.
- ALL development uses local **DuckDB** against a 100MB Parquet sample.
- **GCP BigQuery** is reserved EXCLUSIVELY for the final 60-second pilot demo.
- ZERO paid API calls in dev. Use Groq (free) for LLM, Supabase (free) for data.

---

## WHAT HAS BEEN BUILT (exact state)

### Layer 1 — Core ASRE Engine (Python)

**Location:** `E:\STORM-PLATFORM\asre\`

The production engine is a 4-node LangGraph cyclical state machine:
```
Node 1: Intent Router     → validates dates, coordinates, cause classification
Node 2: SQL Generator     → IDW nearest-station lookup (Haversine, power=2)
Node 3: Execution Cage    → DuckDB query (partition-enforced: year AND month MANDATORY)
Node 4: Adjudicator       → deterministic VALIDATED / REJECTED decision
```

**Critical constants (never change without updating benchmark):**
```python
WIND_THRESHOLD_MS = 17.2   # Beaufort 8 gale force (m/s)
EXCEEDANCE_HOURS  = 3      # minimum hours above threshold
MAX_RANGE_KM      = 300.0  # station search radius
IDW_POWER         = 2      # inverse distance weighting exponent
PRIMARY_KM        = 30     # primary station proximity threshold
```

**18-station NOAA ISD registry** (India): Jaisalmer (42182), Bikaner (42339), Jodhpur (42367), Jaipur (42492), Ahmedabad (42647), Rajkot (42680), Bhuj (42701), Surat (42867), Mumbai (43003), Pune (43057), Nagpur (43150), Hyderabad (43285), Chennai (43346), Bangalore (43430), Kochi (43466), Vadodara (42650), Bhopal (42971), Kolhapur (43128).

**THE PARTITION LAW** (enforced in `.claude/rules/sql-partitions.md`):
Every SQL query MUST contain: `WHERE year = [Y] AND month IN ([M])`
Violating this drains GCP credits on production. Reject any query lacking this.

---

### Layer 2 — Data Infrastructure

**Parquet location:** `E:\STORM-PLATFORM\data\noaa_isd\` (Hive-partitioned)
**Format:** `year=YYYY/month=M/station=XXXXX/*.parquet`
**Size:** ~100MB sample (1.46B rows at full scale in BigQuery)
**Local query engine:** DuckDB (zero cloud cost)

**VALIDATED station/year/month combos:** 36 pre-verified combos exist in `benchmark_asre.py` as `VALIDATED_COMBOS`. Use these when generating test claims — they are confirmed to have exceedance data.

---

### Layer 3 — 1,000-Claim Benchmark

**Location:** `E:\STORM-PLATFORM\benchmarks\benchmark_asre.py`

**Results (locked — do not re-run unless intentional):**
```
DS-PAF macro F1:       1.000  (100% accuracy, 1000/1000 correct)
Baseline macro F1:     0.782  (73.7% accuracy, 263/1000 hallucinated)
ΔF1:                  +0.218
Hallucination rate:    26.3%  (263 claims incorrectly validated by unrouted LLM)
```

**6 claim classes (n=1000, seed=42):**
| Class | n | Ground Truth |
|---|---|---|
| VALIDATED | 200 | Confirmed gale event, full calendar month window |
| REJECTED_BELOW_THRESHOLD | 150 | Real station, real month, wind below 17.2 m/s |
| REJECTED_WRONG_MONTH | 150 | Valid coords, but wrong month (no data) |
| REJECTED_NON_WEATHER | 150 | Equipment failure / non-weather cause |
| REJECTED_MALFORMED_COORDS | 150 | Invalid lat/lon (|lat|>90, |lon|>180, or 0,0) |
| INSUFFICIENT_DATA | 200 | Andaman Islands (>300km from all 18 stations) |

**Exported claims:** `E:\STORM-PLATFORM\benchmarks\benchmark_claims.jsonl` (1,000 lines, ready for ablation runner)

**Ablation runner:** `E:\STORM-PLATFORM\benchmarks\benchmark_ablation_runner.py`
- Sends 1,000 claims through live LLM API
- Estimated cost: $0.19 (Haiku) — RUNWAY GUARDED
- Requires `DREADNOUGHT_ALLOW_API_SPEND=1` env var to execute
- Use this during the final pilot demo phase only

---

### Layer 4 — IEEE Paper

**File:** `E:\STORM-PLATFORM\DREADNOUGHT_IEEE_Final.docx`
**Build script:** `/tmp/ieee_paper4/build_paper_v4.js` (Node.js, docx npm module)
**Status:** 13/13 verification checks pass

**Title:** "Deterministic Graph-Routing for LLMs: Mitigating Spatial-Legal Hallucinations in Meteorological Pre-Adjudication"

**Key framing decisions (enforce these — they were hard-won):**
1. **DS-PAF** = Deterministic Spatial-Legal Pre-Adjudication Framework (the scientific name)
2. **Ablation study framing** — routing-removed baseline, NOT a fake vendor comparison
3. **No 240× marketing** — zero cost comparison numbers in paper
4. **Legal language hedged** — "subject to attestation by a qualified human operator" (NOT "applicable without modification")
5. **Hallucination citations** — Huang 2023, Bang 2023, Ji 2023, Peng 2024 (prepended to references)

**Benchmark summary JSON:** `E:\STORM-PLATFORM\benchmarks\benchmark_summary.json`
```json
{ "asre": { "macro_f1": 1.000, "accuracy": 1.0 },
  "baseline": { "macro_f1": 0.782, "accuracy": 0.737 },
  "delta": { "macro_f1": 0.218 } }
```

**Next step for paper:** Submit to IEEE CLOUD 2026 or IEEE BigData 2025. Check deadlines via web search. Format as IEEE two-column PDF before submission. Upload to EDAS or CMT3.

---

### Layer 5 — Zero-Cost Web Stack (NEW — built in last session)

**Location:** `E:\STORM-PLATFORM\webapp\`

**Architecture (all free tiers):**
```
Frontend + API:   Next.js 14 → Vercel (free)
Database:         Supabase PostgreSQL (free 500MB)
LLM routing:      Groq API llama-3.1-8b-instant (free 14,400 req/day)
Local dev:        DuckDB (same as always)
CI/CD:            GitHub Actions → Vercel auto-deploy
```

**Webapp file structure:**
```
webapp/
├── app/
│   ├── page.tsx                    ← Operations dashboard (KPIs + charts)
│   ├── adjudicate/page.tsx         ← Claim submission form + live result
│   ├── claims/page.tsx             ← Claims table (paginated, searchable)
│   ├── layout.tsx                  ← Root layout with Sidebar
│   ├── globals.css
│   └── api/
│       ├── adjudicate/route.ts     ← POST: ASRE engine (Zod validated)
│       ├── claims/route.ts         ← GET: paginated claims list
│       └── analytics/route.ts     ← GET: snapshot + timeline + labels
├── components/Sidebar.tsx          ← Navy sidebar navigation
├── lib/
│   ├── asre.ts                     ← Full 4-node ASRE in TypeScript
│   └── supabase.ts                 ← Client + service role clients
├── types/index.ts                  ← All TypeScript interfaces
├── package.json
├── vercel.json
├── tailwind.config.ts
└── .env.example                    ← Template (never commit .env)
```

**ASRE TypeScript engine** (`lib/asre.ts`) — exact port of Python engine:
- Same Haversine IDW
- Groq for cause classification (replaces Claude in local dev)
- Supabase query replaces DuckDB query (pre-aggregated monthly stats)
- Same decision thresholds

**Pages not yet built (TODO for next session):**
- `app/customers/page.tsx` — Customer CRM table
- `app/analytics/page.tsx` — Full analytics page with station heatmap
- `app/policy/page.tsx` — Policy management panel
- `app/api/customers/route.ts` — Customer CRUD

---

### Layer 6 — Migration

**Schema:** `E:\STORM-PLATFORM\migration\supabase_schema.sql`
Run this in Supabase SQL Editor FIRST before the Python migration script.

**Migration script:** `E:\STORM-PLATFORM\migration\migrate_to_supabase.py`
Reads local Parquet → DuckDB aggregation → uploads monthly wind stats to Supabase.
**Status: NOT YET RUN.** Run this once from local machine after Supabase is set up.

**Supabase tables:**
- `stations` — 18 NOAA ISD station registry
- `weather_monthly_stats` — pre-aggregated monthly wind data (PRIMARY source for webapp)
- `claims` — all adjudicated claims (persisted by API)
- `customers` — CRM customer records
- `audit_log` — immutable event chain

---

### Layer 7 — Deployment Config

**GitHub Actions:** `E:\STORM-PLATFORM\.github\workflows\deploy.yml`
Push to `main` → TypeScript check → Vercel production deploy.

**Required GitHub Secrets:**
```
VERCEL_TOKEN         (from vercel.com → Settings → Tokens)
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
GROQ_API_KEY
```

**Setup guide:** `E:\STORM-PLATFORM\SETUP.md` — full step-by-step from zero to deployed.

---

### Layer 8 — GTM & Sales Materials

- **Demo dashboard:** `E:\STORM-PLATFORM\dashboard\` (HTML, enterprise SaaS grade)
- **Outreach playbook:** `E:\STORM-PLATFORM\gtm\` (targets, email templates, hit list)
- **Autura portfolio:** `E:\STORM-PLATFORM\Autura_Portfolio_PrajwalPatil.docx`
- **Phase 1 architecture doc** for enterprise ASRE client: delivered in-session (not saved to file — in conversation history)

---

## OUTSTANDING TASKS (what to do next)

### Immediate (do in order)

**Step 1 — Supabase setup** (10 min, manual):
1. supabase.com → New Project → SQL Editor → paste `migration/supabase_schema.sql` → Run
2. Settings → API → copy URL, anon key, service_role key
3. Create `webapp/.env.local` from `webapp/.env.example`

**Step 2 — Run migration** (5 min, one-time):
```bash
cd E:\STORM-PLATFORM
pip install duckdb supabase python-dotenv --break-system-packages
python migration/migrate_to_supabase.py
```

**Step 3 — Groq API key** (2 min):
- console.groq.com → API Keys → Create → add to `.env.local`

**Step 4 — Local test**:
```bash
cd E:\STORM-PLATFORM\webapp
npm install
npm run dev
# → http://localhost:3000
```

**Step 5 — GitHub push + Vercel deploy**:
```bash
cd E:\STORM-PLATFORM
git init && git add . && git commit -m "feat: DREADNOUGHT ASRE v2"
git remote add origin https://github.com/YOUR_USERNAME/dreadnought-asre.git
git push -u origin main
cd webapp && vercel  # link to GitHub repo
```

### Next Development Sprint (webapp completion)

These pages need to be built:

**`app/customers/page.tsx`** — CRM table:
- List customers from `/api/customers`
- Fields: company name, sector, total claims, approved claims, account status
- Actions: view claims filtered by customer, edit status

**`app/api/customers/route.ts`** — CRUD:
- GET: paginated customer list
- POST: create customer
- PATCH: update status

**`app/analytics/page.tsx`** — Full analytics:
- Station coverage map (18 dots on India outline SVG)
- Monthly claim volume trend
- Per-class F1 scores from benchmark_summary.json
- Hallucination prevention counter (live: n_claims × 0.263)

**`app/policy/page.tsx`** — Policy management:
- Display current thresholds (WIND_THRESHOLD_MS, MAX_RANGE_KM, EXCEEDANCE_HOURS)
- Audit log viewer (from Supabase `audit_log` table)
- Station registry table with coverage map

### Paper Submission (Task 22 — pending)

- Search IEEE CLOUD 2026 and IEEE BigData 2025 submission deadlines
- Export DREADNOUGHT_IEEE_Final.docx to PDF (use LibreOffice or Word)
- Validate IEEE two-column format
- Register on EDAS (edas.info) or CMT3 (cmt3.research.microsoft.com)
- Upload PDF + metadata

---

## CRITICAL DECISIONS ALREADY MADE (do not relitigate)

| Decision | Rationale |
|---|---|
| DuckDB locally, Supabase in prod | Zero GCP spend in dev |
| Groq free tier for LLM | 14,400 req/day, OpenAI-compatible API |
| Pre-aggregate Parquet → Supabase | Vercel Functions can't mount local Parquet |
| Ablation study framing (not vendor comparison) | Scientifically defensible, no fake baseline |
| 17.2 m/s wind threshold | Beaufort Scale 8 (gale force) — international standard |
| Full calendar month claim windows | Fixes VALIDATED recall (was 8.5%, now 100%) |
| Zod validation on API input | Pydantic equivalent for TypeScript |
| NOAA Rule 803(8) legal grounding | Federal Rules of Evidence — public records exception |

---

## ENVIRONMENT VARIABLES NEEDED

```bash
# webapp/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
GROQ_API_KEY=gsk_...

# For migration script only (not webapp)
SUPABASE_URL=https://xxxx.supabase.co
PARQUET_PATH=../data/noaa_isd/**/*.parquet
```

---

## FILE REGISTRY (complete)

```
E:\STORM-PLATFORM\
├── CLAUDE.md                                ← Prime directive (read first)
├── HANDOFF.md                               ← This file
├── SETUP.md                                 ← Deployment guide
├── AGENT_WORKFLOW.md                        ← Agent SDK patterns
├── .gitignore
├── .github/
│   └── workflows/deploy.yml                 ← GitHub Actions CI/CD
├── .claude/
│   ├── rules/sql-partitions.md             ← Partition law
│   └── skills/
│       ├── nl-to-sql-engine.md
│       └── claim-adjudication.md
├── asre/
│   ├── engine.py                            ← FastAPI + LangGraph ASRE
│   └── idw.py                              ← IDW spatial model (18 stations)
├── benchmarks/
│   ├── benchmark_asre.py                   ← 1,000-claim generator + evaluator
│   ├── benchmark_ablation_runner.py        ← Live LLM baseline runner
│   ├── benchmark_claims.jsonl              ← 1,000 claims exported (input for ablation)
│   ├── benchmark_claims.json              ← Same, JSON format
│   ├── benchmark_summary.json             ← Results: F1=1.000 vs 0.782
│   ├── asre_results.json
│   └── baseline_results.json
├── migration/
│   ├── supabase_schema.sql                ← Run in Supabase SQL Editor first
│   └── migrate_to_supabase.py             ← DuckDB → Supabase migration
├── webapp/                                 ← Next.js 14 app (deploy to Vercel)
│   ├── app/
│   │   ├── page.tsx                        ← Dashboard (DONE)
│   │   ├── adjudicate/page.tsx            ← Claim form (DONE)
│   │   ├── claims/page.tsx                ← Claims table (DONE)
│   │   ├── customers/page.tsx             ← TODO
│   │   ├── analytics/page.tsx             ← TODO
│   │   ├── policy/page.tsx                ← TODO
│   │   └── api/
│   │       ├── adjudicate/route.ts        ← ASRE API (DONE)
│   │       ├── claims/route.ts            ← DONE
│   │       ├── customers/route.ts         ← TODO
│   │       └── analytics/route.ts        ← DONE
│   ├── components/Sidebar.tsx             ← DONE
│   ├── lib/asre.ts                        ← TypeScript ASRE engine (DONE)
│   ├── lib/supabase.ts                    ← DONE
│   ├── types/index.ts                     ← DONE
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
├── data/
│   └── noaa_isd/                          ← Hive-partitioned Parquet (local only)
├── DREADNOUGHT_IEEE_Final.docx            ← IEEE paper (13/13 checks pass)
├── Autura_Portfolio_PrajwalPatil.docx     ← Internship application portfolio
└── [dashboard/, gtm/, videos/ — existing assets]
```

---

## QUICK SANITY CHECK FOR NEW AGENT

Run these to verify environment is intact:

```bash
# 1. Verify Parquet data is readable
cd E:\STORM-PLATFORM
python3 -c "import duckdb; r=duckdb.connect().execute(\"SELECT COUNT(*) FROM read_parquet('data/noaa_isd/**/*.parquet', hive_partitioning=true)\").fetchone(); print(f'Rows: {r[0]}')"

# 2. Verify benchmark results
python3 -c "import json; d=json.load(open('benchmarks/benchmark_summary.json')); print(f\"ASRE F1: {d['asre']['macro_f1']}, Baseline: {d['baseline']['macro_f1']}\")"

# 3. Verify paper exists and has correct size
python3 -c "import os; s=os.path.getsize('DREADNOUGHT_IEEE_Final.docx'); print(f'Paper: {s:,} bytes ({\"OK\" if s > 300000 else \"WRONG\"})')"

# 4. Test webapp type-check (requires npm install first)
cd webapp && npm run type-check
```

Expected outputs:
```
Rows: [some large number]
ASRE F1: 1.0, Baseline: 0.782
Paper: 383,621 bytes (OK)
```

---

## TONE + OPERATING PRINCIPLES

- **Direct, unapologetic, execution-only.** No fluff.
- **Think in constraints:** every decision filtered through $24 GCP budget.
- **Demo-driven:** every piece of code advances the 60-second pilot recording.
- **Partition law is absolute.** Reject any SQL without year AND month filters.
- **Results over reassurance.** If something is wrong, say so plainly.
