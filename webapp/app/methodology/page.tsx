"use client";
import {
  Scale, GitBranch, MapPin, Gavel, FileCheck, Database, ArrowRight,
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
  { icon: Gavel, title: "Rule 803(8) — Public Records", body: "NOAA Integrated Surface Database observations are records of a public agency, admissible under the public-records hearsay exception. ASRE never invents data; every verdict cites the underlying NOAA station observations." },
  { icon: FileCheck, title: "Chain of custody", body: "Every adjudication writes an immutable audit-log entry — input payload, decision node path, evidence, and timestamp. The full reasoning is reconstructable for any claim, months later." },
  { icon: GitBranch, title: "Determinism", body: "Identical inputs always produce identical verdicts. No temperature, no sampling, no model drift. The decision logic is inspectable and can be cross-examined — unlike a black-box LLM." },
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
          actions={<span className="glass-badge"><Scale size={12} /> NOAA Rule 803(8)</span>}
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
