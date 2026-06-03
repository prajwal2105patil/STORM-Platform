"""
DREADNOUGHT — Sniper Outreach Pipeline
Uses ScrapeGraphAI to extract force majeure clause language from target company
public documents, then generates a precision cold email.

Usage:
    python sniper_outreach.py --company "L&T Construction" --url "https://..."
    python sniper_outreach.py --company "ReNew Power" --url "https://renew.com/annual-report"

Requires:
    pip install scrapegraphai
    Set OPENAI_API_KEY or use local Ollama (zero-cost, see config below)
"""

import argparse
import json
from datetime import date

# ── CONFIG ───────────────────────────────────────────────────────────────────
# To run zero-cost with local Ollama (recommended):
#   1. Install Ollama: https://ollama.ai
#   2. Run: ollama pull llama3.1
#   3. Set USE_LOCAL = True
USE_LOCAL = True   # False = OpenAI (costs money), True = local Ollama (free)
LOCAL_MODEL = "ollama/llama3.1"
OPENAI_MODEL = "gpt-4o-mini"

YOUR_NAME  = "Prajwal Patil"
YOUR_EMAIL = "prajwal2105patil@gmail.com"
PILOT_PRICE = "Rs.75,000"
PILOT_DAYS  = "30"
TODAY = date.today().strftime("%B %Y")

# ── KNOWN TARGETS (pre-researched) ───────────────────────────────────────────
TARGETS = {
    "renew_power": {
        "company": "ReNew Power",
        "contact_name": "Vikash Jain",
        "contact_title": "Group President, Legal & CS",
        "contact_linkedin": "https://www.renew.com/leadership",
        "pain_hook": (
            "CERC rejected your force majeure plea for the 250MW Kutch project "
            "because ReNew 'failed to prove the occurrence of any Force Majeure event.' "
            "Your FY25 shortfall of 632 MUs is being contested by SECI on the same grounds. "
            "You are going into arbitration without the weather evidence you need."
        ),
        "clause_quote": "CERC Order: 'failed to prove the occurrence of any Force Majeure event'",
        "email_subject": "Your 632 MU FY25 shortfall — the evidence gap CERC already flagged",
        "email_body": """Mr. Jain,

The CERC order on your 250 MW Kutch project was rejected on one specific ground:
ReNew "failed to prove the occurrence of any Force Majeure event."

You are now in the same position with the FY25 shortfall of 632 MUs.

SECI is threatening deductions. Arbitration is likely. And the evidentiary
problem is identical — you need objective, court-admissible weather data showing
that wind speeds fell below contractual thresholds at your project locations,
on specific dates, for documented durations.

I built a system that generates exactly that.

ASRE queries 1.46 billion NOAA weather observations across 15,000 stations.
Input: a plain-English claim — "wind speed at Kutch fell below P90 threshold
between April and September 2024."
Output: a legally structured adjudication report in 3 seconds. Cites NOAA ISD
public records — the same dataset accepted under equivalent Indian evidentiary
standards and US Federal Rule 803(8).

Before CERC rejected your last claim, this evidence would have taken 3 weeks
to compile. I can run it against your entire FY25 backlog this week.

Pilot: {pilot_price} for {pilot_days}-day access. No setup. API-first.

Are you in a position to discuss this before the next SECI hearing?

{name}
{email}"""
    },

    "lt_construction": {
        "company": "L&T Construction",
        "contact_name": "[Head of Contracts & Claims]",
        "contact_title": "Head of Contracts, Claims & Legal",
        "contact_linkedin": "Search LinkedIn: L&T Construction Head Contracts Claims",
        "pain_hook": (
            "NHAI standard EPC Agreement Clause 21.5 requires weather-based force "
            "majeure claims to be documented with meteorological data within 48 hours "
            "of the event. Across L&T's active highway portfolio, this is being filed "
            "manually on a 48-hour clock, on every weather event, on every project site."
        ),
        "clause_quote": "NHAI EPC Clause 21.5: Duty to report Force Majeure Event within 48 hours with substantiating data",
        "email_subject": "NHAI Clause 21.5 — 48-hour weather documentation. Automated.",
        "email_body": """[Name],

Your NHAI EPC contracts require that any force majeure claim citing adverse weather
be substantiated with meteorological data within 48 hours of the event —
Clause 21.5, Duty to Report.

Across L&T's active highway portfolio, that means your contracts team is manually
pulling IMD or NOAA data, formatting documentation, and filing notices on a
48-hour clock — on every weather event, across every active project site.

I built a tool that eliminates that process entirely.

ASRE takes a location, a weather event, and a date range. It returns a legally
formatted adjudication report — citing NOAA ISD public records — in under 3 seconds.
NHAI-defensible. Generates the exact documentation Clause 21.5 requires.

Run it the moment a weather event occurs. Your 48-hour clock becomes a 3-second task.

Pilot: {pilot_price} flat for {pilot_days}-day access across your active project
portfolio. We can run it retrospectively against your 2024 monsoon delay backlog
in the first week.

Worth 20 minutes?

{name}
{email}"""
    },

    "adani_green": {
        "company": "Adani Green Energy",
        "contact_name": "[VP Asset Management / Commercial Operations]",
        "contact_title": "VP Asset Management or VP Commercial Operations",
        "contact_linkedin": "Search LinkedIn: Adani Green VP Asset Management Commercial",
        "pain_hook": (
            "Adani Green's Kutchh wind project had its force majeure claims rejected "
            "by CERC — insufficient weather evidence. With 10.9 GW under PPAs, "
            "every underdelivery event without documented force majeure becomes a "
            "financial penalty. The evidentiary gap is systematic, not isolated."
        ),
        "clause_quote": "CERC: Adani Wind force majeure claims lacked sufficient meteorological documentation",
        "email_subject": "10.9 GW under PPAs. One weather event you can't prove = penalty you can't avoid.",
        "email_body": """[Name],

Your wind assets operate under SECI PPAs with minimum generation commitments.
When wind speed drops below contracted thresholds, you have two options:
pay the penalty, or prove the shortfall was force majeure.

The Kutchh project established exactly how difficult that proof is to produce.

ASRE takes any generation shortfall event, cross-references it against 1.46
billion NOAA ISD weather observations at the nearest meteorological stations,
and returns a legally structured report in 3 seconds: exact wind speeds,
duration, deviation from P90 baseline, NOAA station ID, and admissibility citation.

At 10.9 GW, a 1% improvement in documented force majeure recovery pays for
this service many times over.

Pilot: {pilot_price}. {pilot_days} days. Run it on your entire FY25 underdelivery
backlog. If it doesn't recover more than its cost in the first month, don't renew.

Can we connect this week?

{name}
{email}"""
    },
}


def scrape_target(url: str, company: str) -> dict:
    """
    Uses ScrapeGraphAI to extract force majeure clause language
    from a target's public documents/website.
    Returns dict with extracted clause text and relevant facts.
    """
    try:
        from scrapegraphai.graphs import SmartScraperGraph

        if USE_LOCAL:
            graph_config = {
                "llm": {
                    "model": LOCAL_MODEL,
                    "temperature": 0,
                    "format": "json",
                    "base_url": "http://localhost:11434",
                },
                "embeddings": {
                    "model": "ollama/nomic-embed-text",
                    "base_url": "http://localhost:11434",
                },
                "verbose": False,
            }
        else:
            import os
            graph_config = {
                "llm": {
                    "api_key": os.environ.get("OPENAI_API_KEY"),
                    "model": OPENAI_MODEL,
                },
                "verbose": False,
            }

        prompt = f"""
        You are analyzing a document from {company}.
        Extract the following specific information:
        1. Any force majeure clause text (exact wording)
        2. Any weather-related penalty or SLA provisions
        3. Any requirements for meteorological proof or weather data documentation
        4. Any reference to NOAA, IMD, or official weather agencies
        5. Any mention of specific weather thresholds (wind speed, rainfall, temperature)
        6. Any timeframes for filing force majeure notices (e.g. 48 hours, 5 days)
        
        Return as JSON with keys: clause_text, weather_penalties, proof_requirements, 
        agencies_mentioned, thresholds, notice_timeframes, key_quote
        """

        scraper = SmartScraperGraph(
            prompt=prompt,
            source=url,
            config=graph_config,
        )
        result = scraper.run()
        return result

    except ImportError:
        print("ScrapeGraphAI not installed. Run: pip install scrapegraphai")
        return {}
    except Exception as e:
        print(f"Scrape error: {e}")
        return {}


def generate_email(target_key: str, scraped_data: dict = None) -> str:
    """Generate precision cold email for a known target."""
    if target_key not in TARGETS:
        print(f"Unknown target. Available: {list(TARGETS.keys())}")
        return ""

    t = TARGETS[target_key]

    # If we have scraped data, inject the actual clause quote
    clause_str = t["clause_quote"]
    if scraped_data and scraped_data.get("key_quote"):
        clause_str = scraped_data["key_quote"]
        print(f"[LIVE CLAUSE] Injecting scraped quote: {clause_str[:100]}...")

    body = t["email_body"].format(
        pilot_price=PILOT_PRICE,
        pilot_days=PILOT_DAYS,
        name=YOUR_NAME,
        email=YOUR_EMAIL,
    )

    output = f"""
{'='*70}
TARGET:  {t['company']}
TO:      {t['contact_name']} — {t['contact_title']}
FIND AT: {t['contact_linkedin']}
{'='*70}

SUBJECT: {t['email_subject']}

{body}

{'='*70}
PAIN HOOK (why this person feels this TODAY):
{t['pain_hook']}

CLAUSE EVIDENCE:
{clause_str}
{'='*70}
"""
    return output


def scrape_and_generate(company_name: str, url: str) -> str:
    """
    Full pipeline: scrape URL for FM clause → generate precision email.
    For NEW targets not in TARGETS dict.
    """
    print(f"Scraping {url} for {company_name}...")
    data = scrape_target(url, company_name)

    if data:
        print(f"Scraped data:\n{json.dumps(data, indent=2)}")

    # Build a generic email from scraped data
    clause = data.get("key_quote", "[No clause found — review document manually]")
    notice_time = data.get("notice_timeframes", "contractually required timeframe")
    threshold = data.get("thresholds", "contractual weather thresholds")

    email = f"""
{'='*70}
TARGET:  {company_name}
SOURCE:  {url}
{'='*70}

SUBJECT: Your force majeure weather documentation — automated in 3 seconds

[Name],

Your contracts contain a force majeure provision that requires meteorological
proof when weather events affect your obligations:

"{clause}"

Compiling that proof manually takes weeks. Filing it within the contractual
notice window is operationally challenging at scale.

ASRE generates that exact documentation — citing NOAA ISD public records
(1.46 billion observations, 15,000 stations) — in under 3 seconds.
Input a plain-English claim. Output: legally structured, court-admissible JSON.

Pilot: {PILOT_PRICE} for {PILOT_DAYS} days. Run it against your current backlog.

Worth 20 minutes this week?

{YOUR_NAME}
{YOUR_EMAIL}

{'='*70}
SCRAPED CLAUSE DATA:
{json.dumps(data, indent=2) if data else 'None — manual research required'}
{'='*70}
"""
    return email


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ASRE Sniper Outreach Pipeline")
    parser.add_argument("--target", choices=list(TARGETS.keys()),
                        help="Known target key")
    parser.add_argument("--company", help="New company name (requires --url)")
    parser.add_argument("--url", help="URL to scrape for FM clause")
    parser.add_argument("--all", action="store_true",
                        help="Print all pre-researched emails")
    args = parser.parse_args()

    if args.all:
        for key in TARGETS:
            print(generate_email(key))
    elif args.target:
        print(generate_email(args.target))
    elif args.company and args.url:
        print(scrape_and_generate(args.company, args.url))
    else:
        print("Usage:")
        print("  python sniper_outreach.py --all")
        print("  python sniper_outreach.py --target renew_power")
        print("  python sniper_outreach.py --target lt_construction")
        print("  python sniper_outreach.py --target adani_green")
        print("  python sniper_outreach.py --company 'Greenko' --url 'https://...'")
