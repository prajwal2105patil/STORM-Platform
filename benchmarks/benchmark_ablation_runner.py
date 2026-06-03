"""
benchmark_ablation_runner.py
DS-PAF Ablation Study — Real LLM Baseline Runner
================================================
Runs the 1,000-claim benchmark through a live LLM API (no routing constraints)
to produce an empirical ablation baseline for the IEEE paper.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...   # or OPENAI_API_KEY
    python benchmarks/benchmark_ablation_runner.py \
        --provider anthropic \
        --model claude-haiku-4-5-20251001 \
        --input benchmarks/benchmark_claims.jsonl \
        --output benchmarks/ablation_results.jsonl

RUNWAY LAW: Zero paid API calls in dev. This script is production-ready but
MUST NOT be executed until the pilot demo phase. Use benchmark_asre.py for
all local development validation.

Requirements:
    pip install anthropic openai tqdm
"""

import argparse
import json
import os
import sys
import time
import random
from pathlib import Path
from typing import Optional
import importlib

# ── Label set (must match benchmark_asre.py) ─────────────────────────────────
VALID_LABELS = {
    "VALIDATED",
    "REJECTED_BELOW_THRESHOLD",
    "REJECTED_WRONG_MONTH",
    "REJECTED_NON_WEATHER",
    "REJECTED_MALFORMED_COORDS",
    "REJECTED_MISSING_DATES",
    "INSUFFICIENT_DATA",
}

# ── System prompt for unconstrained LLM adjudicator ──────────────────────────
SYSTEM_PROMPT = """You are an insurance claims adjudicator evaluating force majeure weather claims.
Given a claim payload (JSON), you must classify it into exactly one of these labels:

  VALIDATED                  - Weather event confirmed; wind speed ≥ 17.2 m/s for ≥ 3 hours
  REJECTED_BELOW_THRESHOLD   - Weather data exists but did not meet the exceedance threshold
  REJECTED_WRONG_MONTH       - Claim date range falls in a month with no matching weather data
  REJECTED_NON_WEATHER       - Claimed cause is not a weather event (e.g., equipment failure)
  REJECTED_MALFORMED_COORDS  - Asset coordinates are invalid (out of range or null island)
  REJECTED_MISSING_DATES     - Start or end date is missing or malformed
  INSUFFICIENT_DATA          - No NOAA station within 300 km of the asset location

Rules:
1. You do NOT have access to real weather databases. Make your best judgment from the claim data.
2. Return ONLY a JSON object: {"label": "<LABEL>", "confidence": <0.0-1.0>, "reasoning": "<one sentence>"}
3. No other text, no markdown, no explanation outside the JSON.
"""

USER_PROMPT_TEMPLATE = """Evaluate this force majeure claim:

{claim_json}

Respond with JSON only."""


# ── Provider clients ──────────────────────────────────────────────────────────

def call_anthropic(client, model: str, claim: dict) -> dict:
    claim_json = json.dumps(claim, indent=2, default=str)
    message = client.messages.create(
        model=model,
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": USER_PROMPT_TEMPLATE.format(claim_json=claim_json)}]
    )
    raw = message.content[0].text.strip()
    return json.loads(raw)


def call_openai(client, model: str, claim: dict) -> dict:
    claim_json = json.dumps(claim, indent=2, default=str)
    response = client.chat.completions.create(
        model=model,
        max_tokens=256,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(claim_json=claim_json)},
        ],
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content.strip()
    return json.loads(raw)


# ── Metrics computation ───────────────────────────────────────────────────────

def compute_metrics(results: list[dict]) -> dict:
    from collections import defaultdict

    labels = sorted(VALID_LABELS)
    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)

    correct = 0
    hallucinated = 0  # LLM predicted VALIDATED when ground truth was rejection
    total = len(results)

    for r in results:
        gt  = r["ground_truth"]
        pred = r["predicted_label"]
        if gt == pred:
            correct += 1
            tp[gt] += 1
        else:
            fp[pred] += 1
            fn[gt]  += 1
            # Hallucination: asserted validation when claim should be rejected
            if pred == "VALIDATED" and gt != "VALIDATED":
                hallucinated += 1

    per_class = {}
    f1_scores = []
    for lbl in labels:
        prec = tp[lbl] / (tp[lbl] + fp[lbl]) if (tp[lbl] + fp[lbl]) > 0 else 0.0
        rec  = tp[lbl] / (tp[lbl] + fn[lbl]) if (tp[lbl] + fn[lbl]) > 0 else 0.0
        f1   = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0
        per_class[lbl] = {"precision": round(prec, 4), "recall": round(rec, 4), "f1": round(f1, 4), "tp": tp[lbl], "fp": fp[lbl], "fn": fn[lbl]}
        f1_scores.append(f1)

    macro_f1  = sum(f1_scores) / len(f1_scores)
    accuracy  = correct / total
    halluc_rate = hallucinated / total

    return {
        "total": total,
        "correct": correct,
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "hallucination_rate": round(halluc_rate, 4),
        "per_class": per_class,
    }


# ── Main runner ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DS-PAF Ablation: LLM baseline runner")
    parser.add_argument("--provider", choices=["anthropic", "openai"], default="anthropic",
                        help="LLM API provider (default: anthropic)")
    parser.add_argument("--model", default="claude-haiku-4-5-20251001",
                        help="Model identifier (default: claude-haiku-4-5-20251001)")
    parser.add_argument("--input", default="benchmarks/benchmark_claims.jsonl",
                        help="Path to benchmark claims JSONL (produced by benchmark_asre.py)")
    parser.add_argument("--output", default="benchmarks/ablation_results.jsonl",
                        help="Path to write per-claim results JSONL")
    parser.add_argument("--summary", default="benchmarks/ablation_summary.json",
                        help="Path to write aggregate metrics JSON")
    parser.add_argument("--limit", type=int, default=None,
                        help="Run only first N claims (for dry-run cost estimation)")
    parser.add_argument("--delay", type=float, default=0.3,
                        help="Seconds between API calls to respect rate limits (default: 0.3)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Load claims and print cost estimate without calling API")
    args = parser.parse_args()

    # ── Load claims ───────────────────────────────────────────────────────────
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        print("Generate it first: python benchmarks/benchmark_asre.py --export-claims")
        sys.exit(1)

    claims = []
    with open(input_path) as f:
        for line in f:
            line = line.strip()
            if line:
                claims.append(json.loads(line))

    if args.limit:
        claims = claims[:args.limit]

    print(f"Loaded {len(claims)} claims from {input_path}")

    # ── Dry run cost estimate ─────────────────────────────────────────────────
    # Haiku: $0.25/1M input + $1.25/1M output tokens
    # Estimate: ~350 input tokens + ~80 output tokens per claim
    est_input_tokens  = len(claims) * 350
    est_output_tokens = len(claims) * 80
    if args.provider == "anthropic" and "haiku" in args.model:
        est_cost = (est_input_tokens / 1_000_000 * 0.25) + (est_output_tokens / 1_000_000 * 1.25)
    elif args.provider == "openai" and "3.5" in args.model:
        est_cost = (est_input_tokens / 1_000_000 * 0.50) + (est_output_tokens / 1_000_000 * 1.50)
    else:
        est_cost = (est_input_tokens / 1_000_000 * 3.0) + (est_output_tokens / 1_000_000 * 15.0)

    print(f"Estimated cost: ${est_cost:.4f} USD ({len(claims)} claims × ~430 tokens)")

    if args.dry_run:
        print("DRY RUN — exiting without API calls.")
        sys.exit(0)

    # ── Runtime guard ─────────────────────────────────────────────────────────
    if os.getenv("DREADNOUGHT_ALLOW_API_SPEND") != "1":
        print("\nRUNWAY GUARD: This script makes paid API calls.")
        print("Set environment variable DREADNOUGHT_ALLOW_API_SPEND=1 to proceed.")
        print("RUNWAY LAW: Only execute during the final pilot demo phase.")
        sys.exit(1)

    # ── Init client ───────────────────────────────────────────────────────────
    if args.provider == "anthropic":
        import anthropic
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("ERROR: ANTHROPIC_API_KEY environment variable not set")
            sys.exit(1)
        client = anthropic.Anthropic(api_key=api_key)
        call_fn = lambda claim: call_anthropic(client, args.model, claim)
    else:
        import openai
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("ERROR: OPENAI_API_KEY environment variable not set")
            sys.exit(1)
        client = openai.OpenAI(api_key=api_key)
        call_fn = lambda claim: call_openai(client, args.model, claim)

    # ── Run ───────────────────────────────────────────────────────────────────
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    results = []
    errors  = 0
    start_ts = time.time()

    with open(output_path, "w") as out_f:
        for i, record in enumerate(claims):
            claim       = record.get("claim", record)          # support both formats
            ground_truth = record.get("ground_truth", record.get("label", "UNKNOWN"))

            try:
                response = call_fn(claim)
                predicted = response.get("label", "UNKNOWN").strip()
                confidence = float(response.get("confidence", 0.0))
                reasoning  = response.get("reasoning", "")

                # Normalise: map unknown labels to closest valid or flag as error
                if predicted not in VALID_LABELS:
                    predicted = "UNKNOWN"
                    errors += 1

            except (json.JSONDecodeError, KeyError, Exception) as e:
                predicted  = "PARSE_ERROR"
                confidence = 0.0
                reasoning  = str(e)
                errors     += 1

            result = {
                "claim_id":       i,
                "ground_truth":   ground_truth,
                "predicted_label": predicted,
                "confidence":     confidence,
                "reasoning":      reasoning,
                "provider":       args.provider,
                "model":          args.model,
            }
            results.append(result)
            out_f.write(json.dumps(result) + "\n")
            out_f.flush()

            # Progress
            if (i + 1) % 50 == 0 or i == 0:
                elapsed = time.time() - start_ts
                rate = (i + 1) / elapsed if elapsed > 0 else 0
                eta  = (len(claims) - i - 1) / rate if rate > 0 else 0
                acc_so_far = sum(1 for r in results if r["ground_truth"] == r["predicted_label"]) / len(results)
                print(f"  [{i+1:4d}/{len(claims)}] acc={acc_so_far:.3f}  errors={errors}  "
                      f"rate={rate:.1f}/s  ETA={eta:.0f}s")

            time.sleep(args.delay)

    elapsed_total = time.time() - start_ts

    # ── Compute and save metrics ──────────────────────────────────────────────
    # Filter out PARSE_ERROR / UNKNOWN for clean metric computation
    clean_results = [r for r in results if r["predicted_label"] in VALID_LABELS]
    metrics = compute_metrics(clean_results)
    metrics["provider"]       = args.provider
    metrics["model"]          = args.model
    metrics["total_with_errors"] = len(results)
    metrics["parse_errors"]   = errors
    metrics["elapsed_seconds"] = round(elapsed_total, 1)
    metrics["claims_per_second"] = round(len(results) / elapsed_total, 2) if elapsed_total > 0 else 0

    summary_path = Path(args.summary)
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    with open(summary_path, "w") as f:
        json.dump(metrics, f, indent=2)

    # ── Print summary ─────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("DS-PAF ABLATION STUDY — LLM BASELINE RESULTS")
    print("="*60)
    print(f"Provider/Model  : {args.provider} / {args.model}")
    print(f"Total claims    : {metrics['total_with_errors']}")
    print(f"Parse errors    : {metrics['parse_errors']}")
    print(f"Accuracy        : {metrics['accuracy']:.4f}")
    print(f"Macro F1        : {metrics['macro_f1']:.4f}")
    print(f"Hallucination   : {metrics['hallucination_rate']:.4f}")
    print(f"Elapsed         : {metrics['elapsed_seconds']}s  ({metrics['claims_per_second']} claims/s)")
    print("-"*60)
    print(f"{'Label':<35} {'Prec':>6} {'Rec':>6} {'F1':>6}")
    print("-"*60)
    for lbl, m in metrics["per_class"].items():
        print(f"  {lbl:<33} {m['precision']:>6.3f} {m['recall']:>6.3f} {m['f1']:>6.3f}")
    print("="*60)
    print(f"Results  → {output_path}")
    print(f"Summary  → {summary_path}")

    # Delta vs DS-PAF baseline (from benchmark_summary.json)
    asre_summary = Path("benchmarks/benchmark_summary.json")
    if asre_summary.exists():
        with open(asre_summary) as f:
            asre = json.load(f)
        asre_f1  = asre.get("asre", {}).get("macro_f1", 1.0)
        delta_f1 = asre_f1 - metrics["macro_f1"]
        print(f"\nDS-PAF routing contribution (ΔF1): +{delta_f1:.3f}")
        print(f"  DS-PAF macro F1  : {asre_f1:.3f}")
        print(f"  Baseline macro F1: {metrics['macro_f1']:.3f}")


if __name__ == "__main__":
    main()
