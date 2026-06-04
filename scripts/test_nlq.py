"""
test_nlq.py
===========
Test the NLQ (Natural Language Query) engine locally.

Verifies that Groq can extract intents from various question formats.

Usage:
    python scripts/test_nlq.py
"""

import os
import sys
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("ERROR: Set GROQ_API_KEY in .env")
    sys.exit(1)

# Test questions
TEST_QUESTIONS = [
    "What was the peak wind in Mumbai in August 2023?",
    "Average temperature in Surat during July 2022?",
    "How many gale-force hours in Mumbai last August?",
    "Peak wind speed in Surat 2023?",
    "Wind in Mumbai September 2022?",
    "Pressure in Surat?",
    "Peak wind Mumbai August 2023",
    "Gale hours in Surat July 2022",
]

def extract_intents(question: str):
    """Extract intents using Groq."""
    client = Groq(api_key=GROQ_API_KEY)

    message = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        max_tokens=150,
        messages=[
            {
                "role": "system",
                "content": """You are a weather query parser. Extract ONLY these fields from the question:
{
  "station": "city name" or null,
  "metric": "wind" | "gale" | "temperature" | "pressure" | "humidity" or null,
  "year": 4-digit year (2014-2024) or null,
  "month": 1-12 (January=1, December=12) or null
}

RULES:
- For "gale force" or "storm hours", use metric="gale"
- For "peak wind", use metric="wind"
- If no year given, assume current data (2023)
- If no month given, assume August (8)
- Return ONLY valid JSON, no explanation

Example: "Peak wind in Mumbai August 2023?" → {"station":"Mumbai","metric":"wind","year":2023,"month":8}""",
            },
            {
                "role": "user",
                "content": question,
            },
        ],
    )

    reply = message.choices[0].message.content or "{}"
    return json.loads(reply)

def main():
    print("=" * 80)
    print("NLQ (Natural Language Query) Engine Test")
    print("=" * 80)

    results = []

    for i, question in enumerate(TEST_QUESTIONS, 1):
        try:
            intents = extract_intents(question)
            results.append({
                "question": question,
                "intents": intents,
                "status": "✓"
            })
            print(f"\n[{i}/{len(TEST_QUESTIONS)}] ✓ {question}")
            print(f"    → Station: {intents.get('station', 'N/A')}")
            print(f"    → Metric: {intents.get('metric', 'N/A')}")
            print(f"    → Year: {intents.get('year', 'N/A')}")
            print(f"    → Month: {intents.get('month', 'N/A')}")

        except Exception as e:
            results.append({
                "question": question,
                "error": str(e),
                "status": "✗"
            })
            print(f"\n[{i}/{len(TEST_QUESTIONS)}] ✗ {question}")
            print(f"    → ERROR: {str(e)[:80]}")

    # Summary
    success = sum(1 for r in results if r["status"] == "✓")
    print(f"\n{'=' * 80}")
    print(f"Results: {success}/{len(TEST_QUESTIONS)} questions parsed successfully")
    print(f"{'=' * 80}")

    # Show failures
    failures = [r for r in results if r["status"] == "✗"]
    if failures:
        print("\nFailed questions:")
        for r in failures:
            print(f"  - {r['question']}")
            print(f"    Error: {r['error']}")

if __name__ == "__main__":
    main()
