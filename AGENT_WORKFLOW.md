# DREADNOUGHT — Claude Agent SDK Workflow
**Purpose:** Continue DREADNOUGHT development programmatically using the Claude Agent API.
**This file is both a reference document and a copy-paste execution guide.**

---

## Why Agent SDK for This Project

You are past the point of interactive iteration. The remaining work (webapp completion, Supabase migration, paper submission, live benchmark) is well-defined and parallelisable. The Agent SDK lets you:

1. **Run sub-tasks concurrently** (e.g., build customers page + analytics page simultaneously)
2. **Maintain context across sessions** by injecting `HANDOFF.md` as the system prompt
3. **Gate expensive operations** (GCP demo, paid API calls) behind agent checks
4. **Automate CI verification** — agent runs TypeScript check, reports failure, auto-fixes

---

## The Claude Agent SDK — How It Works

The Claude Agents API is built on top of the standard Messages API. An "agent" is a loop:

```
User message → Claude → Tool call(s) → Tool result → Claude → ... → Final answer
```

For DREADNOUGHT, the "tools" are: file read/write, bash execution, web fetch, and sub-agent spawning.

### Base API Pattern

```python
import anthropic

client = anthropic.Anthropic(api_key="YOUR_ANTHROPIC_API_KEY")

# Load handoff context as system prompt
with open("HANDOFF.md") as f:
    handoff = f.read()

response = client.messages.create(
    model="claude-sonnet-4-6",          # or claude-opus-4-6 for complex reasoning
    max_tokens=8096,
    system=f"""You are the Lead Data Architect for Project DREADNOUGHT.
Read this handoff document and execute the task with zero ramp-up.

{handoff}

PRIME DIRECTIVE: $24 GCP budget remaining. All dev is local DuckDB.
Partition law is absolute: every SQL needs year AND month filters.
""",
    messages=[
        {"role": "user", "content": "YOUR TASK HERE"}
    ]
)
print(response.content[0].text)
```

---

## Model Selection Guide

| Task | Model | Reason |
|---|---|---|
| Code generation (webapp pages) | `claude-sonnet-4-6` | Fast, excellent at TypeScript/React |
| Architecture decisions | `claude-opus-4-6` | Deep reasoning for trade-offs |
| Simple file edits | `claude-haiku-4-5-20251001` | Cheap, fast, good for targeted patches |
| Benchmark analysis | `claude-sonnet-4-6` | Math + code balanced |
| Paper writing/editing | `claude-opus-4-6` | Best prose quality |

---

## Tool-Use Pattern (with File + Bash Tools)

The agent needs tools to actually write files and run code. This is the production pattern:

```python
import anthropic, subprocess, os, json
from pathlib import Path

client = anthropic.Anthropic()

# Define tools the agent can use
TOOLS = [
    {
        "name": "read_file",
        "description": "Read a file from the STORM-PLATFORM project",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Absolute or relative path from E:\\STORM-PLATFORM\\"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write or overwrite a file in the project",
        "input_schema": {
            "type": "object",
            "properties": {
                "path":    {"type": "string"},
                "content": {"type": "string"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "run_bash",
        "description": "Run a shell command in the project directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {"type": "string"},
                "cwd":     {"type": "string", "description": "Working directory (default: E:\\STORM-PLATFORM)"}
            },
            "required": ["command"]
        }
    },
    {
        "name": "web_fetch",
        "description": "Fetch a URL and return the text content",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string"}
            },
            "required": ["url"]
        }
    }
]

# Tool execution handlers
def execute_tool(name: str, inputs: dict) -> str:
    project_root = Path("E:/STORM-PLATFORM")

    if name == "read_file":
        p = project_root / inputs["path"]
        return p.read_text(encoding="utf-8") if p.exists() else f"FILE NOT FOUND: {p}"

    elif name == "write_file":
        p = project_root / inputs["path"]
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(inputs["content"], encoding="utf-8")
        return f"Written: {p} ({len(inputs['content'])} chars)"

    elif name == "run_bash":
        cwd = inputs.get("cwd", str(project_root))
        result = subprocess.run(
            inputs["command"], shell=True, cwd=cwd,
            capture_output=True, text=True, timeout=120
        )
        out = result.stdout + result.stderr
        return out[:8000]  # truncate if huge

    elif name == "web_fetch":
        import urllib.request
        try:
            with urllib.request.urlopen(inputs["url"], timeout=10) as r:
                return r.read().decode("utf-8", errors="replace")[:10000]
        except Exception as e:
            return f"FETCH ERROR: {e}"

    return f"Unknown tool: {name}"


# Agentic loop
def run_agent(task: str, model: str = "claude-sonnet-4-6", max_turns: int = 20) -> str:
    with open("E:/STORM-PLATFORM/HANDOFF.md") as f:
        handoff = f.read()

    system = f"""You are the Lead Data Architect for Project DREADNOUGHT.
Full project context is in the handoff below. Act immediately. No ramp-up.

{handoff}

When you write code, write it to disk using write_file.
When you need to verify, use run_bash.
When you need current info (deadlines, APIs), use web_fetch.
"""

    messages = [{"role": "user", "content": task}]

    for turn in range(max_turns):
        response = client.messages.create(
            model=model,
            max_tokens=8096,
            system=system,
            tools=TOOLS,
            messages=messages
        )

        # Check stop reason
        if response.stop_reason == "end_turn":
            # Extract final text
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return "Done."

        # Process tool calls
        messages.append({"role": "assistant", "content": response.content})
        tool_results = []

        for block in response.content:
            if block.type == "tool_use":
                print(f"  [Tool] {block.name}({list(block.input.keys())})")
                result = execute_tool(block.name, block.input)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        if tool_results:
            messages.append({"role": "user", "content": tool_results})
        else:
            break  # no tool calls, no text — something wrong

    return "Max turns reached."


# Usage
if __name__ == "__main__":
    result = run_agent(
        "Build app/customers/page.tsx — a CRM customer table page. "
        "Fetch customers from /api/customers. Show: company name, sector, "
        "total claims, approved claims, approval rate, account status badge, "
        "and a link to view their claims filtered by customer_id. "
        "Match the design of app/claims/page.tsx exactly."
    )
    print(result)
```

---

## Pre-Built Agent Tasks (copy-paste ready)

Each task below is a `run_agent()` call with the exact prompt. Run them in order or in parallel.

### Task A — Build Missing Webapp Pages

```python
# Run these in parallel — they're independent
import concurrent.futures

tasks = [
    (
        "customers_page",
        "claude-sonnet-4-6",
        """Build two files:

1. E:\\STORM-PLATFORM\\webapp\\app\\api\\customers\\route.ts
   - GET: paginated customers list from Supabase (page, limit, search params)
   - POST: create new customer (company_name, contact_name, email, sector)
   - Returns: { customers, total, page, limit }

2. E:\\STORM-PLATFORM\\webapp\\app\\customers\\page.tsx
   - React client component matching the style of claims/page.tsx
   - Table columns: Company, Sector, Total Claims, Approved, Approval Rate (%), Status badge, Created
   - Status badge: active=green, suspended=amber, closed=gray
   - Search bar by company name
   - + New Customer button that opens an inline form (no modal library)
   - POST to /api/customers on submit

Read lib/supabase.ts and types/index.ts first to understand the patterns."""
    ),
    (
        "analytics_page",
        "claude-sonnet-4-6",
        """Build E:\\STORM-PLATFORM\\webapp\\app\\analytics\\page.tsx

This is the full analytics page. It should have:

1. Top KPI row (4 cards): Total Claims | Approval Rate | Avg Latency | Customers
2. 30-day timeline LineChart (recharts) - validated vs rejected per day
3. Label distribution BarChart (recharts) - horizontal, 7 label classes
4. Benchmark comparison section showing:
   - DS-PAF F1 = 1.000 vs Baseline F1 = 0.782 (static from benchmark_summary.json)
   - ΔF1 = +0.218 in a highlighted card
   - Hallucination rate 26.3% with visual bar
5. Station coverage table: 18 stations, each showing how many claims it has served
   - Query /api/analytics for this data

Fetch all data from /api/analytics. Use recharts for charts.
Match the navy/teal colour scheme from globals.css."""
    ),
    (
        "policy_page",
        "claude-haiku-4-5-20251001",
        """Build E:\\STORM-PLATFORM\\webapp\\app\\policy\\page.tsx

A read-only policy management panel showing:

1. Current ASRE Thresholds (static, from the constants in lib/asre.ts):
   - Wind Threshold: 17.2 m/s (Beaufort 8 Gale Force)
   - Exceedance Duration: ≥ 3 hours
   - Max Station Radius: 300 km
   - IDW Power: 2
   - Legal Standard: NOAA Rule 803(8)

2. Audit Log table (last 50 events from Supabase audit_log):
   - Build GET /api/audit route first
   - Columns: Event Type, Claim ID (truncated), Actor, Timestamp

3. Station Registry table: all 18 stations from Supabase stations table
   - Columns: Station ID, Name, State, Lat, Lon

Keep it clean and informational. No editing functionality — read-only."""
    ),
]

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(run_agent, task, model): name for name, model, task in tasks}
    for future in concurrent.futures.as_completed(futures):
        name = futures[future]
        print(f"\n{'='*50}\n{name} COMPLETE\n{'='*50}")
        print(future.result()[:500])
```

### Task B — Run Supabase Migration

```python
result = run_agent(
    """Run the Supabase migration:

1. First, verify the Parquet data exists:
   run_bash: python3 -c "import duckdb; r=duckdb.connect().execute(\"SELECT COUNT(*) FROM read_parquet('data/noaa_isd/**/*.parquet', hive_partitioning=true)\").fetchone(); print(r[0])"

2. Check if SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are set.
   If not, stop and tell the user exactly what to set.

3. If env vars are set, run:
   run_bash: python3 migration/migrate_to_supabase.py

4. Report: how many rows were uploaded to weather_monthly_stats and stations tables.
   If any error occurs, diagnose and fix it.

RUNWAY LAW: This script costs $0 — it only writes to Supabase free tier.
""",
    model="claude-sonnet-4-6"
)
```

### Task C — Search IEEE Submission Deadlines

```python
result = run_agent(
    """Search for current IEEE conference submission deadlines for our paper.

Paper title: "Deterministic Graph-Routing for LLMs: Mitigating Spatial-Legal Hallucinations in Meteorological Pre-Adjudication"

Search these targets:
1. web_fetch: https://ieeecloud2026.cloudcomputing.org  (or current year)
2. web_fetch: https://ieeebigdata.org
3. web_fetch: https://icde2026.github.io

For each, find:
- Abstract submission deadline
- Full paper deadline
- Notification date
- Conference date
- Submission system (EDAS or CMT3)
- Page limit

Then recommend the best target based on:
- Relevance to LLM + data engineering
- Closest deadline that is still open (today is 2026-06-03)
- Prestige level

Output a decision matrix and a final recommendation.
""",
    model="claude-opus-4-6"
)
```

### Task D — TypeScript Build Verification

```python
result = run_agent(
    """Verify the webapp builds cleanly:

1. run_bash in E:\\STORM-PLATFORM\\webapp: npm install
2. run_bash: npm run type-check
3. If type errors exist, fix them by editing the relevant .ts/.tsx files
4. run_bash: npm run build
5. If build fails, diagnose and fix

Report: PASS or FAIL with specific errors.
Do not proceed if type-check fails — fix everything first.
""",
    model="claude-sonnet-4-6"
)
```

### Task E — Git Init + Vercel Deploy

```python
result = run_agent(
    """Set up the GitHub repository and deploy to Vercel.

PREREQUISITE CHECK: Ask the user for:
- GitHub username
- Repository name (suggest: dreadnought-asre)
- Vercel account linked to GitHub? (yes/no)

Then execute:
1. run_bash: git init (in E:\\STORM-PLATFORM)
2. run_bash: git add . && git commit -m "feat: DREADNOUGHT ASRE v2 — zero-cost stack"
3. Instruct user on exact GitHub steps (create repo, push)
4. run_bash in webapp/: npx vercel --yes
5. Report the deployed URL

After deployment, verify:
- GET https://[your-url].vercel.app/api/adjudicate returns system info
- POST with test payload returns adjudication result
""",
    model="claude-sonnet-4-6"
)
```

---

## Multi-Agent Architecture (Advanced)

For the final pilot demo, use three agents in parallel:

```python
import anthropic, threading

client = anthropic.Anthropic()

# Orchestrator — coordinates the demo sequence
def orchestrator():
    return client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        system="You are the DREADNOUGHT demo orchestrator. Coordinate the 60-second pilot recording.",
        messages=[{"role": "user", "content": """
            Produce the exact sequence of API calls for the demo:
            1. A VALIDATED claim (Jaisalmer wind farm, June 2022)
            2. A REJECTED_NON_WEATHER claim (equipment failure)
            3. A REJECTED_MALFORMED_COORDS claim (Null Island 0,0)
            Show expected responses for each. Timing: each call < 5 seconds.
        """}]
    )

# Validator — checks each result is legally correct
def validator(claim_result: str):
    return client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system="You validate ASRE adjudication results for legal correctness under NOAA Rule 803(8).",
        messages=[{"role": "user", "content": f"Validate this result:\n{claim_result}"}]
    )

# Narrator — generates the spoken script for the demo video
def narrator(sequence: str):
    return client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system="You write concise, confident demo narration scripts for enterprise software demos.",
        messages=[{"role": "user", "content": f"Write a 60-second narration for:\n{sequence}"}]
    )

# Run orchestrator first, then validator and narrator in parallel
orch_result = orchestrator()
sequence = orch_result.content[0].text

with threading.Thread(target=lambda: validator(sequence)) as t1, \
     threading.Thread(target=lambda: narrator(sequence))  as t2:
    t1.start(); t2.start()
    t1.join();  t2.join()
```

---

## Environment Setup for Agent SDK

```bash
# Install the SDK
pip install anthropic --break-system-packages

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run the agent
python3 agent_runner.py
```

Create `E:\STORM-PLATFORM\agent_runner.py`:

```python
#!/usr/bin/env python3
"""
agent_runner.py — DREADNOUGHT Agent SDK Runner
Usage: python3 agent_runner.py "your task description"
"""
import sys
# [paste the run_agent() function and execute_tool() from above]

if __name__ == "__main__":
    task = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("Task: ")
    model = "claude-sonnet-4-6"
    print(f"\nRunning agent: {model}\nTask: {task}\n{'='*50}")
    result = run_agent(task, model)
    print(result)
```

---

## Agent Prompt Templates

These are the exact system prompt components that make a Claude agent understand DREADNOUGHT immediately:

### Minimal Context Injection (for Haiku — cost-efficient)
```python
SYSTEM_MINIMAL = """DREADNOUGHT ASRE. Stack: Python FastAPI + LangGraph (local), Next.js + Supabase + Groq (production).
Constants: WIND_THRESHOLD=17.2m/s, EXCEEDANCE=3h, MAX_RANGE=300km.
Rule: ALL SQL must have year AND month filters. Project root: E:\\STORM-PLATFORM\\"""
```

### Full Context Injection (for Opus/Sonnet)
```python
# Inject entire HANDOFF.md
with open("E:/STORM-PLATFORM/HANDOFF.md") as f:
    SYSTEM_FULL = f"You are the Lead Data Architect for DREADNOUGHT.\n\n{f.read()}"
```

### Task-Specific Context (targeted)
```python
SYSTEM_WEBAPP = """DREADNOUGHT webapp context:
- Stack: Next.js 14 App Router, Tailwind, Supabase, Groq, Vercel
- Colour palette: navy=#1A3A5C, teal=#0D6B8E, steel=#2E75B6
- All components are client components ("use client")
- API routes use getServiceClient() from lib/supabase.ts
- All types are in types/index.ts
- Pattern to copy: app/claims/page.tsx (pagination, search, table)"""
```

---

## Cost Estimation for Agent Runs

| Task | Model | Est. Tokens | Est. Cost |
|---|---|---|---|
| Build one webapp page | Sonnet 4.6 | ~8K in + 4K out | ~$0.048 |
| Full analytics page | Sonnet 4.6 | ~10K in + 6K out | ~$0.066 |
| Paper deadline search | Opus 4.6 | ~6K in + 2K out | ~$0.054 |
| TypeScript verification | Sonnet 4.6 | ~12K in + 3K out | ~$0.054 |
| Full deployment task | Sonnet 4.6 | ~15K in + 5K out | ~$0.075 |
| **Total estimated** | | | **~$0.30** |

All remaining work costs roughly **$0.30 in API calls total** — well within budget.

---

## Anti-Patterns (do not do these)

```python
# ❌ Wrong: Asking agent to make BigQuery calls in dev
run_agent("Query BigQuery to get the wind data...")

# ❌ Wrong: Using Opus for simple file edits
run_agent("Add a comment to this function", model="claude-opus-4-6")

# ❌ Wrong: No project context in system prompt
client.messages.create(system="You are a helpful assistant.", ...)

# ❌ Wrong: Injecting credentials into the agent prompt
run_agent(f"Use API key {api_key} to...")  # never pass secrets to LLM

# ✅ Correct: Let the agent read credentials from environment
run_agent("Run the migration script. Credentials are in environment variables.")
```

---

## The 60-Second Demo Sequence (final milestone)

When credits are confirmed and pilot is scheduled, this is the agent task that closes the deal:

```python
result = run_agent(
    """Execute the DREADNOUGHT pilot demo sequence.

PREREQUISITE: Confirm DREADNOUGHT_ALLOW_API_SPEND=1 is set.

Demo sequence (exactly 3 claims, BigQuery production):
1. POST to production API: Jaisalmer wind farm, June 2022 → expect VALIDATED
2. POST to production API: Equipment failure cause → expect REJECTED_NON_WEATHER
3. POST to production API: Coordinates 0.0, 0.0 → expect REJECTED_MALFORMED_COORDS

For each result, confirm:
- Response time < 5 seconds
- Legal summary is present
- Node path shows all 4 nodes (for VALIDATED)

Then run: python3 benchmarks/benchmark_ablation_runner.py --provider anthropic --model claude-haiku-4-5-20251001 --limit 50
Report the first 50-claim accuracy against the empirical LLM baseline.

This is the pilot proof package.
""",
    model="claude-opus-4-6"
)
```
