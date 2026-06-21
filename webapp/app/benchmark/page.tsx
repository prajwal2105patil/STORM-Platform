"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, Zap, AlertTriangle, Target, GitBranch, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FloatingPaths } from "@/components/ui/background-paths";
import { BENCHMARK, prettyLabel } from "@/lib/benchmark";

function pct(n: number, dp = 1) {
  return (n * 100).toFixed(dp) + "%";
}

// Illustrative average force-majeure claim value (₹25 L) for the business
// translation below. Never presented as realized revenue.
const AVG_CLAIM_INR = 2_500_000;
const formatCr = (n: number) => `₹${(n / 1e7).toFixed(2)} Cr`;

export default function BenchmarkPage() {
  const { asre, baseline, config, delta } = BENCHMARK;
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  const headline = [
    {
      icon: Target,
      label: "Macro F1",
      value: pct(asre.macroF1, 1),
      sub: `vs ${pct(baseline.macroF1, 1)} for a simulated unrouted control`,
      tone: "green",
    },
    {
      icon: ShieldCheck,
      label: "False-Positive Rate",
      value: pct(asre.falsePositiveRate, 0),
      sub: `simulated control erred on ${pct(baseline.hallucinationRate, 1)} of claims`,
      tone: "sky",
    },
    {
      icon: Zap,
      label: "Accuracy",
      value: pct(asre.accuracy, 1),
      sub: `+${pct(delta.accuracy, 0)} over baseline · ${config.nClaims.toLocaleString()} claims`,
      tone: "green",
    },
  ];

  const toneRing: Record<string, string> = {
    green: "rgba(34,197,94,0.25)",
    sky: "rgba(96,184,224,0.25)",
  };
  const toneBg: Record<string, string> = {
    green: "rgba(34,197,94,0.08)",
    sky: "rgba(96,184,224,0.08)",
  };
  const toneText: Record<string, string> = {
    green: "text-green-400",
    sky: "text-sky",
  };

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div className="relative z-10 p-8 space-y-8 max-w-6xl">
        <PageHeader
          title="Benchmark Evidence"
          description={`${config.nClaims.toLocaleString()} synthetic claims · seed ${config.seed} · fully reproducible on NOAA ISD public-record data`}
          actions={
            <span className="glass-badge">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              Reproducible
            </span>
          }
        />

        {/* ── Headline stats ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {headline.map(({ icon: Icon, label, value, sub, tone }) => (
            <div
              key={label}
              className="glass-card-dark rounded-2xl p-6"
              style={{ border: `1px solid ${toneRing[tone]}`, background: toneBg[tone] }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
                <Icon size={16} className={toneText[tone]} />
              </div>
              <p className={`text-4xl font-extrabold tabular-nums leading-none ${toneText[tone]}`}>{value}</p>
              <p className="text-xs text-white/40 mt-3 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Why deterministic wins ──────────────────────────────────── */}
        <div
          className="glass-card-dark rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg, rgba(96,184,224,0.10) 0%, rgba(34,197,94,0.06) 100%)", border: "1px solid rgba(96,184,224,0.22)" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#0D6B8E,#1E88BE)" }}>
              <GitBranch size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white mb-1">Why deterministic routing beats unrouted generation</p>
              <p className="text-sm text-white/55 leading-relaxed">
                ASRE routes every claim through a fixed decision tree backed by NOAA observations — the same
                input always yields the same verdict, with a citable evidence trail. The comparison is against
                a <strong>simulated</strong> unrouted control (a calibrated stochastic model, <strong>not a live
                LLM</strong>) that erred on <strong className="text-amber-300">{pct(baseline.hallucinationRate, 1)}</strong> of
                claims (mostly false <em>VALIDATED</em> rulings) — illustrating the cost of unrouted generation
                in an evidence-grade setting. ASRE&apos;s false-positive rate is{" "}
                <strong className="text-green-400">{pct(asre.falsePositiveRate, 0)}</strong>. This is a
                self-consistency benchmark on synthetic claims — see METHODOLOGY.md, not a measured win over a
                production model.
              </p>
            </div>
          </div>
        </div>

        {/* ── Per-class comparison ────────────────────────────────────── */}
        <div className="glass-card-dark rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-1">Per-class F1 — ASRE vs Simulated Control</h2>
          <p className="text-xs text-white/35 mb-5">
            Each row is a claim category. Bar length = F1 score. Green = ASRE, grey = simulated control.
          </p>
          <div className="space-y-4">
            {asre.rows.map((row, i) => {
              const base = baseline.rows[i];
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/70 font-semibold">{prettyLabel(row.label)}</span>
                    <span className="text-white/35 tabular-nums">
                      n = {row.support} ·{" "}
                      <span className="text-green-400 font-bold">{row.f1.toFixed(3)}</span>
                      {" "}vs{" "}
                      <span className="text-white/50">{base.f1.toFixed(3)}</span>
                    </span>
                  </div>
                  {/* ASRE bar */}
                  <div className="h-2 bg-white/6 rounded-full overflow-hidden mb-1">
                    <div className="h-full rounded-full bg-green-500"
                      style={{ width: animate ? pct(row.f1) : "0%", transition: `width 800ms ${i * 70}ms cubic-bezier(0.16,1,0.3,1)` }} />
                  </div>
                  {/* Baseline bar */}
                  <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-white/35"
                      style={{ width: animate ? pct(base.f1) : "0%", transition: `width 800ms ${i * 70 + 120}ms cubic-bezier(0.16,1,0.3,1)` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Macro row */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
            {[
              { k: "Macro F1", a: asre.macroF1, b: baseline.macroF1 },
              { k: "Macro Precision", a: asre.macroPrecision, b: baseline.macroPrecision },
              { k: "Macro Recall", a: asre.macroRecall, b: baseline.macroRecall },
            ].map(({ k, a, b }) => (
              <div key={k}>
                <p className="text-[10px] uppercase tracking-widest text-white/35 mb-1">{k}</p>
                <p className="text-lg font-extrabold text-green-400 tabular-nums">{pct(a, 1)}</p>
                <p className="text-[11px] text-white/35 tabular-nums">{pct(b, 1)} ctrl</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Business translation (illustrative) ─────────────────────── */}
        <div
          className="glass-card-dark rounded-2xl p-6"
          style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(96,184,224,0.06) 100%)", border: "1px solid rgba(34,197,94,0.22)" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#15803d,#16a34a)" }}>
              <IndianRupee size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white mb-1">What the {pct(delta.macroF1, 1)} F1 gap is worth</p>
              <p className="text-sm text-white/55 leading-relaxed">
                The simulated control erred on{" "}
                <strong className="text-amber-300">{pct(baseline.hallucinationRate, 1)}</strong> of claims, mostly as false{" "}
                <em>VALIDATED</em> rulings. At a portfolio of <strong className="text-white/80">1,000 claims/year</strong> and a{" "}
                <strong className="text-white/80">₹25 L</strong> average claim, that error profile corresponds to{" "}
                <strong className="text-white/80">~{Math.round(config.nClaims * baseline.hallucinationRate)}</strong> wrongful
                payouts — an illustrative{" "}
                <strong className="text-green-400">{formatCr(config.nClaims * baseline.hallucinationRate * AVG_CLAIM_INR)}</strong>{" "}
                in payout exposure that deterministic routing removes. This is a projection from the synthetic benchmark&apos;s
                error rate, scaled by an assumed claim value — <strong>illustrative, not a measured or realized figure</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Reproducibility note ────────────────────────────────────── */}
        <div className="glass-card-dark rounded-2xl p-6 flex items-start gap-4">
          <AlertTriangle size={18} className="text-sky/70 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white text-sm mb-1">How to reproduce</p>
            <p className="text-sm text-white/50 leading-relaxed">
              Run <code className="text-sky bg-sky/10 px-1.5 py-0.5 rounded text-xs">python benchmarks/benchmark_asre.py</code>{" "}
              against the local DuckDB Parquet sample. Fixed seed ({config.seed}), {config.nClaims.toLocaleString()} claims
              across 6 categories. Gale threshold {config.windThresholdMs} m/s (Beaufort 8), {config.maxRangeKm} km IDW
              search radius. Zero cloud spend, zero paid API calls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
