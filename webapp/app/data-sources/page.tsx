"use client";
import { useEffect, useState } from "react";
import { Database, Globe, MapPin, CalendarRange, CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FloatingPaths } from "@/components/ui/background-paths";
import { SkeletonCard } from "@/components/ui/skeleton";

interface Station { id: string; name: string; lat: number; lon: number; state: string; }

export default function DataSourcesPage() {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/stations")
      .then((r) => r.json())
      .then((d) => setStations(Array.isArray(d) ? d : []))
      .catch(() => setError(true));
  }, []);

  const total = stations?.length ?? 0;

  const facts = [
    { icon: Database, label: "Real Stations", value: total ? total.toLocaleString() : "—", sub: "Active NOAA USAF stations" },
    { icon: CalendarRange, label: "Record Window", value: "2015–2025", sub: "11+ years of NOAA hourly observations" },
    { icon: MapPin, label: "Gale Threshold", value: "17.2 m/s", sub: "Beaufort 8, from raw winds" },
    { icon: Globe, label: "Cloud Spend", value: "$0.00", sub: "Rebuilt free from NCEI" },
  ];

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      <div className="relative z-10 p-8 space-y-8 max-w-6xl">
        <PageHeader
          title="Data Provenance"
          description="Every verdict traces back to real, public, government-sourced weather records"
          actions={
            <span className="glass-badge">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              Live
            </span>
          }
        />

        {/* ── Fact cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {facts.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="glass-card-dark rounded-2xl p-5 border border-white/8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</p>
                <Icon size={15} className="text-sky" />
              </div>
              <p className="text-3xl font-extrabold text-white tabular-nums leading-none">{value}</p>
              <p className="text-[11px] text-white/35 mt-2">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Source provenance ───────────────────────────────────────── */}
        <div
          className="glass-card-dark rounded-2xl p-7"
          style={{ background: "linear-gradient(135deg, rgba(96,184,224,0.10) 0%, rgba(96,184,224,0.04) 100%)", border: "1px solid rgba(96,184,224,0.22)" }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70 mb-3">Source of record</p>
          <h2 className="text-lg font-bold text-white mb-3">NOAA Integrated Surface Database (ISD-Lite)</h2>
          <p className="text-sm text-white/55 leading-relaxed max-w-3xl">
            Station coordinates come from NOAA&apos;s master catalog (<code className="text-sky bg-sky/10 px-1 rounded text-xs">isd-history.csv</code>),
            and hourly wind observations from the public ISD-Lite archive. Both are pulled directly from the National
            Centers for Environmental Information — no third-party vendor, no proprietary feed, no cloud bill. Station
            identifiers are the canonical 6-digit USAF codes, so any verdict can be independently verified against the
            government source.
          </p>
          <a
            href="https://www.ncei.noaa.gov/products/land-based-station/integrated-surface-database"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-sky hover:text-sky/80 transition-colors"
          >
            ncei.noaa.gov — Integrated Surface Database <ExternalLink size={13} />
          </a>
        </div>

        {/* ── Pipeline integrity ──────────────────────────────────────── */}
        <div className="glass-card-dark rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4">Data integrity guarantees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Foreign-key integrity — only stations that produced real observations are loaded",
              "Canonical USAF station IDs — no synthetic or conflicting identifiers",
              "Gale flag derived from raw hourly winds (≥17.2 m/s, Beaufort 8)",
              "Idempotent upserts keyed on (station, year, month) — no duplicate records",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-white/55 leading-snug">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Live station sample ─────────────────────────────────────── */}
        <div className="glass-card-dark rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Live station sample</h3>
            {stations && (
              <span className="text-xs font-semibold text-sky bg-sky/10 px-2 py-1 rounded-full border border-sky/20">
                {total} loaded
              </span>
            )}
          </div>

          {error ? (
            <p className="text-sm text-white/40 py-6 text-center">Could not load stations right now.</p>
          ) : !stations ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stations.slice(0, 12).map((s) => (
                <div key={s.id} className="border border-white/8 bg-white/3 rounded-xl p-3 hover:bg-white/6 transition-colors">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  <p className="text-[10px] text-sky/60 font-mono mt-0.5">USAF {s.id}</p>
                  <p className="text-[10px] text-white/25 font-mono mt-1">
                    {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
