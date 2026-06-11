"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Shield, Radio, Database } from "lucide-react";

const LandingMap = dynamic(
  () => import("@/components/ui/landing-map"),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#040810]" /> },
);

const STATS = [
  { value: "18",     label: "NOAA Stations"   },
  { value: "300km",  label: "IDW Radius"       },
  { value: "<500ms", label: "Adjudication"     },
  { value: "10yr",   label: "Data Archive"     },
];

export default function LandingPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#040810]">

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

      {/* ── Hero content ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10 pointer-events-none">

        {/* Brand chip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 1.2 }}
          className="flex items-center gap-2 mb-8 pointer-events-auto"
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
            style={{
              background: "rgba(13,107,142,0.15)",
              borderColor: "rgba(96,184,224,0.3)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/70 uppercase">
              DREADNOUGHT ASRE · NOAA Rule 803(8) Certified
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 1.5 }}
          className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-white leading-[1.05] mb-4 pointer-events-auto"
        >
          Force Majeure
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-[#60B8E0]">
            Adjudicated.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 1.2 }}
          className="text-base md:text-lg text-white/45 mb-10 max-w-lg leading-relaxed pointer-events-auto"
        >
          AI-powered storm-event verification backed by 11 years of NOAA ISD data.
          Legally admissible · Deterministic · Zero human bias.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 1.0 }}
          className="flex flex-col sm:flex-row gap-4 pointer-events-auto"
        >
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
            Join the Movement
          </Link>
        </motion.div>
      </div>

      {/* ── Bottom stats bar ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 1.0 }}
        className="absolute bottom-0 left-0 right-0 z-10 px-6 pb-6"
      >
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
            <span className="text-[9px] text-white/30 font-mono tracking-wider">NOAA ISD 2014–2024 · Rule 803(8)</span>
          </div>
        </div>
      </motion.div>

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
    </div>
  );
}
