"use client";
import {
  Scale, GitBranch, MapPin, Gavel, FileCheck, Database, ArrowRight,
  ShieldCheck, Wind, AlertTriangle, Target,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FloatingPaths } from "@/components/ui/background-paths";

const PIPELINE = [
  { step: "1", title: "Schema & integrity gate", desc: "Reject malformed coordinates, missing dates, and non-weather causes before any data lookup. Fails fast and deterministically.", reject: "REJECTED_MALFORMED_COORDS · REJECTED_MISSING_DATES · REJECTED_NON_WEATHER" },
  { step: "2", title: "Temporal alignment", desc: "Confirm the claimed event window matches the partitioned NOAA record (year + month). A claim for the wrong month is rejected — no exceptions.", reject: "REJECTED_WRONG_MONTH" },
  { step: "3", title: "Spatial resolution (IDW)", desc: "Inverse-distance-weighted interpolation over NOAA stations within a 300 km radius produces a wind estimate at the exact asset coordinates, with a confidence score.", reject: "INSUFFICIENT_DATA (no station in range)" },
  { step: "4", title: "Gale adjudication", desc: "Compare peak interpolated wind against the 17.2 m/s Beaufort-8 gale threshold and exceedance-hour count. Issue a VALIDATED or rejected verdict with the evidence attached.", reject: "VALIDATED ✓ or final rejection" },
];

const LEGAL = [
  { icon: Gavel, title: "NOAA Public Records", body: "NOAA Integrated Surface Database observations are records of a US public agency (US FRE 803(8)). ASRE never invents data; every verdict cites the underlying NOAA station observations. Admissibility in other jurisdictions is subject to local evidence law." },
  { icon: FileCheck, title: "Chain of custody", body: "Every adjudication writes an immutable audit-log entry — input payload, decision node path, evidence, and timestamp. The full reasoning is reconstructable for any claim, months later." },
  { icon: GitBranch, title: "Determinism", body: "Identical inputs always produce identical verdicts. No temperature, no sampling, no model drift. The decision logic is inspectable and can be cross-examined — unlike a black-box LLM." },
];

// Real-world validation against the documented meteorological record.
// Source: webapp/scripts/validate-historical.mjs · benchmarks/HISTORICAL_VALIDATION.md
const VALIDATION_SENSITIVITY = [
  { setting: "Current — peak ≥ 17.2 m/s, exceedance ≥ 3 h", recall: "1 / 12", fp: "0 / 6", current: true },
  { setting: "Gust ×1.4 (WMO factor), exceedance ≥ 3 h",     recall: "2 / 12", fp: "0 / 6", current: false },
  { setting: "Current wind, exceedance ≥ 1 h",               recall: "4 / 12", fp: "0 / 6", current: false },
  { setting: "Gust ×1.4 + exceedance ≥ 1 h",                 recall: "7 / 12", fp: "0 / 6", current: false },
];

export default function MethodologyPage() {
  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div className="relative z-10 p-8 space-y-8 max-w-5xl">
        <PageHeader
          title="Methodology & Admissibility"
          description="How a claim becomes a defensible verdict — and why it holds up in a dispute"
          actions={<span className="glass-badge"><Scale size={12} /> NOAA Public Record</span>}
        />

        {/* ── The adjudication pipeline ───────────────────────────────── */}
        <section className="glass-card-dark rounded-2xl p-7">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-1">The Engine</p>
          <h2 className="text-lg font-bold text-white mb-1">Deterministic adjudication pipeline</h2>
          <p className="text-sm text-white/40 mb-6">
            Every claim flows through four ordered gates. The first gate that fails returns a cited rejection;
            a claim that clears all four is VALIDATED.
          </p>

          <div className="space-y-3">
            {PIPELINE.map((p, i) => (
              <div key={p.step} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-extrabold text-white text-sm ring-1 ring-white/15"
                    style={{ background: "linear-gradient(135deg,#0D6B8E,#1E88BE)" }}>
                    {p.step}
                  </div>
                  {i < PIPELINE.length - 1 && <div className="w-px flex-1 bg-gradient-to-b from-sky/30 to-transparent my-1" />}
                </div>
                <div className="pb-5">
                  <p className="font-bold text-white text-sm">{p.title}</p>
                  <p className="text-sm text-white/50 mt-1 leading-relaxed">{p.desc}</p>
                  <p className="text-[11px] text-white/30 mt-2 font-mono">{p.reject}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── IDW / partition explainer ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="glass-card-dark rounded-2xl p-6">
            <MapPin size={18} className="text-sky mb-3" />
            <h3 className="font-bold text-white mb-2">Spatial: IDW interpolation</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Assets rarely sit on top of a weather station. ASRE weights every NOAA station within 300 km by
              inverse distance to estimate wind at the exact asset location, and reports a confidence score so a
              low-coverage estimate is never silently trusted.
            </p>
          </section>
          <section className="glass-card-dark rounded-2xl p-6">
            <Database size={18} className="text-sky mb-3" />
            <h3 className="font-bold text-white mb-2">Temporal: partition discipline</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Records are partitioned by <code className="text-sky bg-sky/10 px-1 rounded text-xs">year</code> and{" "}
              <code className="text-sky bg-sky/10 px-1 rounded text-xs">month</code>. Every lookup filters on the
              exact partition keys — this keeps each query scanning megabytes, not terabytes, and guarantees a
              claim is checked against the right time window.
            </p>
          </section>
        </div>

        {/* ── Legal admissibility ─────────────────────────────────────── */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-3 ml-1">Legal Standing</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEGAL.map(({ icon: Icon, title, body }) => (
              <div key={title} className="glass-card-dark rounded-2xl p-6 hover:-translate-y-0.5 transition-transform duration-200">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(96,184,224,0.10)", border: "1px solid rgba(96,184,224,0.22)" }}>
                  <Icon size={18} className="text-sky" />
                </div>
                <p className="font-bold text-white text-sm mb-2">{title}</p>
                <p className="text-sm text-white/50 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scope (honest) ──────────────────────────────────────────── */}
        <section className="glass-card-dark rounded-2xl p-6 flex items-start gap-4"
          style={{ border: "1px solid rgba(96,184,224,0.18)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(96,184,224,0.10)", border: "1px solid rgba(96,184,224,0.22)" }}>
            <Wind size={18} className="text-sky" />
          </div>
          <div>
            <p className="font-bold text-white text-sm mb-1">Scope: wind-driven perils</p>
            <p className="text-sm text-white/50 leading-relaxed">
              ASRE today adjudicates <strong className="text-white/70">sustained surface-wind</strong> events
              (gale ≥ 17.2 m/s, Beaufort 8) from NOAA ISD hourly observations. It does <strong>not</strong> yet
              adjudicate flood, storm surge, hail, lightning, or tornado touchdown — those require different
              sensor networks and are out of scope until validated. The engine refuses claims it cannot measure
              rather than guessing.
            </p>
          </div>
        </section>

        {/* ── Real-world validation ───────────────────────────────────── */}
        <section className="glass-card-dark rounded-2xl p-7">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-1">Real-World Validation</p>
          <h2 className="text-lg font-bold text-white mb-1">Replayed against documented cyclones — not only synthetic claims</h2>
          <p className="text-sm text-white/40 mb-6">
            The benchmark page reports 99.7% on 1,000 <em>synthetic</em> claims — a measure of routing discipline.
            Separately, we replay the engine on the <strong className="text-white/60">real NOAA record</strong> for
            12 documented IMD/JTWC cyclones (2016–2023) and 6 calm-period controls. Reproducible:{" "}
            <code className="text-sky bg-sky/10 px-1.5 py-0.5 rounded text-xs">node scripts/validate-historical.mjs</code>.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Target,      k: "Cyclone recall",   v: "1 / 12", sub: "at current thresholds" },
              { icon: ShieldCheck, k: "Calm specificity", v: "6 / 6",  sub: "no false validations" },
              { icon: Gavel,       k: "False positives",  v: "0",       sub: "never validates a non-event" },
            ].map(({ icon: Icon, k, v, sub }) => (
              <div key={k} className="rounded-xl p-4 border border-white/8 bg-white/3">
                <Icon size={15} className="text-sky mb-2" />
                <p className="text-2xl font-extrabold text-white tabular-nums leading-none">{v}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1.5">{k}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-white/50 leading-relaxed mb-5">
            Read this honestly: ASRE is a <strong className="text-white/70">high-specificity, low-recall</strong>{" "}
            instrument on the raw record. It never manufactured a validation (the legally safe direction), but it
            under-detects real cyclones — because NOAA reports hourly-<em>mean</em> wind while cyclones do damage
            through <em>gusts</em>, and the nearest station is often tens of km from the eyewall. That conservatism
            is deliberate: evidence headed to a tribunal should err toward provable.
          </p>

          {/* Sensitivity table */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Sensitivity — the tunable levers</p>
          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/4 text-[10px] uppercase tracking-wider text-white/40">
                  <th className="text-left font-bold px-4 py-2.5">Threshold setting</th>
                  <th className="text-right font-bold px-4 py-2.5">Cyclone recall</th>
                  <th className="text-right font-bold px-4 py-2.5">Control false-pos</th>
                </tr>
              </thead>
              <tbody>
                {VALIDATION_SENSITIVITY.map((r) => (
                  <tr key={r.setting} className="border-t border-white/6">
                    <td className="px-4 py-2.5 text-white/65">
                      {r.setting}
                      {r.current && <span className="ml-2 text-[9px] font-bold text-sky/80 uppercase">live</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-green-400">{r.recall}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/50">{r.fp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2.5 mt-4">
            <AlertTriangle size={14} className="text-sky/60 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/40 leading-relaxed">
              A standard WMO gust factor (×1.4) with a 1-hour sustained bar lifts recall to <strong className="text-white/60">7/12 (58%)</strong>{" "}
              with zero new false positives on this control set. We have not adopted it in production: 0 false positives on
              6 controls is encouraging, not conclusive. Changing the gale threshold is a deliberate legal decision pending a
              larger adversarial control set — not a silent tuning.
            </p>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <a href="/adjudicate"
          className="glass-card-dark rounded-2xl p-6 flex items-center justify-between group hover:-translate-y-0.5 transition-transform duration-200"
          style={{ border: "1px solid rgba(96,184,224,0.22)" }}>
          <div>
            <p className="font-bold text-white">See it adjudicate a live claim</p>
            <p className="text-sm text-white/45 mt-0.5">Submit asset coordinates and a date window — get a cited verdict in under 500 ms.</p>
          </div>
          <ArrowRight size={20} className="text-sky group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </a>
      </div>
    </div>
  );
}
