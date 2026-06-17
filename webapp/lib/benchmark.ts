/**
 * benchmark.ts — Single source of truth for the public benchmark figures.
 *
 * These are the results from benchmarks/benchmark_asre.py (seed=42, 1000
 * SYNTHETIC claims, NOAA Rule 803(8) sample). Mirrored here so the website
 * never fabricates numbers. Regenerate with `python benchmarks/benchmark_asre.py`.
 *
 * HONESTY: this is a self-consistency evaluation on synthetic claims, and the
 * "baseline" is a SIMULATED stochastic control — NO live LLM is run. It must be
 * presented as a routing-discipline demonstration, not a measured win over a
 * production model. See METHODOLOGY.md (§7) and the disclaimer on /benchmark.
 */

export interface ClassRow {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export const BENCHMARK = {
  config: {
    nClaims: 1000,
    seed: 42,
    windThresholdMs: 17.2, // Beaufort 8 (gale force)
    maxRangeKm: 300,
    generatedAt: "2026-06-16",
  },

  asre: {
    name: "DS-PAF (ASRE)",
    macroF1: 0.9987,
    macroPrecision: 1.0,
    macroRecall: 0.9975,
    accuracy: 0.997,
    falsePositiveRate: 0.0,
    rows: [
      { label: "VALIDATED",                 precision: 1.0, recall: 0.985, f1: 0.9924, support: 200 },
      { label: "REJECTED_WRONG_MONTH",      precision: 1.0, recall: 1.0,   f1: 1.0,    support: 150 },
      { label: "REJECTED_NON_WEATHER",      precision: 1.0, recall: 1.0,   f1: 1.0,    support: 150 },
      { label: "REJECTED_MALFORMED_COORDS", precision: 1.0, recall: 1.0,   f1: 1.0,    support: 150 },
      { label: "INSUFFICIENT_DATA",         precision: 1.0, recall: 1.0,   f1: 1.0,    support: 200 },
      { label: "REJECTED_MISSING_DATES",    precision: 1.0, recall: 1.0,   f1: 1.0,    support: 150 },
    ] as ClassRow[],
  },

  baseline: {
    name: "Simulated Unrouted Control",
    macroF1: 0.7822,
    macroPrecision: 0.904,
    macroRecall: 0.7353,
    accuracy: 0.737,
    hallucinationRate: 0.263, // 263 / 1000
    rows: [
      { label: "VALIDATED",                 precision: 0.4237, recall: 0.875,  f1: 0.571,  support: 200 },
      { label: "REJECTED_WRONG_MONTH",      precision: 1.0,    recall: 0.6,    f1: 0.75,   support: 150 },
      { label: "REJECTED_NON_WEATHER",      precision: 1.0,    recall: 0.8067, f1: 0.893,  support: 150 },
      { label: "REJECTED_MALFORMED_COORDS", precision: 1.0,    recall: 0.6467, f1: 0.7854, support: 150 },
      { label: "INSUFFICIENT_DATA",         precision: 1.0,    recall: 0.63,   f1: 0.773,  support: 200 },
      { label: "REJECTED_MISSING_DATES",    precision: 1.0,    recall: 0.8533, f1: 0.9209, support: 150 },
    ] as ClassRow[],
  },

  delta: {
    macroF1: 0.2165,
    accuracy: 0.26,
  },
} as const;

export const prettyLabel = (l: string) =>
  l.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
