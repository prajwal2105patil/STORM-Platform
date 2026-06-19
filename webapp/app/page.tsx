"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Radio, Database, CheckCircle } from "lucide-react";

const LandingMap = dynamic(
  () => import("@/components/ui/landing-map"),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#040810]" /> },
);

const STATS = [
  { value: "409",    label: "NOAA Stations"   },
  { value: "300km",  label: "IDW Radius"       },
  { value: "<500ms", label: "Adjudication"     },
  { value: "10yr",   label: "Data Archive"     },
];

export default function LandingPage() {
  return (
    <div className="relative w-full bg-[#040810]">
    <div className="relative h-screen overflow-hidden">

      {/* ── Full-screen map ── */}
      <div className="absolute inset-0">
        <LandingMap />
      </div>

      {/* ── Gradient overlays to make content legible ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(4,8,16,0.55) 0%, transparent 80%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(4,8,16,0.75) 0%, rgba(4,8,16,0.2) 30%, rgba(4,8,16,0.2) 65%, rgba(4,8,16,0.85) 100%)" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(13,107,142,0.15) 0%, transparent 60%)" }}
      />

      {/* ── Hero content (animations removed — renders instantly) ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 pointer-events-none">

        {/* Brand chip */}
        <div className="flex items-center gap-2 mb-8 pointer-events-auto">
          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
            style={{
              background: "rgba(13,107,142,0.15)",
              borderColor: "rgba(96,184,224,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/70 uppercase">
              DREADNOUGHT ASRE · NOAA Rule 803(8) Grounded
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-4 pointer-events-auto">
          Force Majeure
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-[#60B8E0]">
            Adjudicated.
          </span>
        </h1>

        <p className="text-base md:text-lg text-white/45 mb-10 max-w-lg leading-relaxed pointer-events-auto">
          AI-powered storm-event verification backed by 10 years of NOAA ISD data.
          Admissible under US FRE 803(8) · Deterministic · Reproducible.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pointer-events-auto">
          <Link
            href="/login"
            className="group relative overflow-hidden rounded-2xl px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(96,184,224,0.35)]"
            style={{
              background: "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 55%, #38bdf8 100%)",
              boxShadow: "0 4px 20px rgba(13,107,142,0.45)",
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Zap size={15} />
              Begin Journey
              <ArrowRight size={13} />
            </span>
            {/* Shimmer */}
            <div className="absolute inset-0 flex justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover:duration-700 group-hover:[transform:skew(-13deg)_translateX(100%)]">
              <div className="relative h-full w-10 bg-white/15" />
            </div>
          </Link>

          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white/80 hover:text-white border transition-all duration-300 hover:scale-[1.03]"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Radio size={14} className="text-sky-400" />
            Request a Demo
          </Link>
        </div>
      </div>

      {/* ── Bottom stats bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6">
        <div
          className="flex items-center justify-center gap-1 flex-wrap max-w-2xl mx-auto rounded-2xl px-6 py-4"
          style={{
            background: "rgba(4,8,16,0.65)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {STATS.map(({ value, label }, i) => (
            <div key={label} className="flex items-center gap-4">
              <div className="text-center px-4">
                <p className="text-base font-extrabold text-white tabular-nums leading-none">{value}</p>
                <p className="text-[9px] text-white/35 uppercase tracking-widest mt-1">{label}</p>
              </div>
              {i < STATS.length - 1 && <div className="h-6 w-px bg-white/10" />}
            </div>
          ))}
          <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block" />
          <div className="flex items-center gap-2 px-4">
            <Shield size={12} className="text-sky-400/60" />
            <span className="text-[9px] text-white/30 font-mono tracking-wider">NOAA ISD 2015–2025 · Rule 803(8)</span>
          </div>
        </div>
      </div>

      {/* ── Top-left logo ── */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)",
            boxShadow: "0 2px 12px rgba(13,107,142,0.6)",
          }}
        >
          <Database size={14} className="text-white" />
        </div>
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-white/70 uppercase leading-none">DREADNOUGHT</p>
          <p className="text-[8px] text-sky-400/50 tracking-widest uppercase mt-0.5">ASRE Platform v2</p>
        </div>
      </div>
    </div>{/* end hero */}

    {/* ── Pricing section ── */}
    <section className="relative z-10 px-6 py-24 border-t border-white/8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/60 mb-3">Pricing</p>
          <h2 className="text-3xl font-extrabold text-white mb-3">Simple, Transparent Pricing</h2>
          <p className="text-white/40 text-sm">Start free. Scale when you need to. No lock-in.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="glass-card-dark rounded-2xl p-8 border border-white/8 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-3">Starter</p>
            <p className="text-4xl font-extrabold text-white mb-1">Free</p>
            <p className="text-white/35 text-sm mb-6">Up to 10 claims / month</p>
            <ul className="space-y-2.5 text-sm text-white/60 mb-8 flex-1">
              {["NOAA ISD adjudication", "VALIDATED / REJECTED verdict", "Legal summary export", "409-station network"].map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn-glass w-full justify-center text-sm">
              Get Started
            </Link>
          </div>

          {/* Professional */}
          <div className="glass-card-dark rounded-2xl p-8 border border-sky/30 flex flex-col relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-sky text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                Most Popular
              </span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-3">Professional</p>
            <p className="text-4xl font-extrabold text-white mb-1">Contact us</p>
            <p className="text-white/35 text-sm mb-6">Up to 500 claims / month</p>
            <ul className="space-y-2.5 text-sm text-white/60 mb-8 flex-1">
              {["Everything in Starter", "Bulk adjudication API", "Priority email support", "Custom reporting dashboard"].map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn-primary-3d w-full justify-center text-sm">
              Request Demo
            </Link>
          </div>

          {/* Enterprise */}
          <div className="glass-card-dark rounded-2xl p-8 border border-white/8 flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-3">Enterprise</p>
            <p className="text-4xl font-extrabold text-white mb-1">Custom</p>
            <p className="text-white/35 text-sm mb-6">Unlimited · SLA guarantee</p>
            <ul className="space-y-2.5 text-sm text-white/60 mb-8 flex-1">
              {["Everything in Professional", "Dedicated infrastructure", "SLA contract & indemnity", "Custom legal stamping"].map(f => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle size={13} className="text-green-400 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
            <Link href="/login" className="btn-glass w-full justify-center text-sm">
              Talk to Sales
            </Link>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/20 mt-12 font-mono">
          DREADNOUGHT ASRE · NOAA ISD 2015–2025 · Rule 803(8) · Partition-safe BigQuery engine
        </p>
      </div>
    </section>
    </div>
  );
}
