"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { MapPin, Radio, Zap } from "lucide-react";
import { FloatingPaths } from "@/components/ui/background-paths";

/* ── Station type (loaded live from /api/stations → Supabase, 409 stations) ── */
type Station = { id: string; name: string; lat: number; lng: number; region: string };

/* ── Geographic zone classifier ──
   The NOAA catalog leaves the `state` field blank for non-US stations, so we
   bucket each station into a broad Indian zone by latitude/longitude. Used only
   for dot colour + grouping; the IDW engine is purely distance-based. */
function classifyZone(lat: number, lon: number): string {
  if (lat >= 28) return "north";                         // J&K, HP, Punjab, Haryana, Delhi, N-UP
  if (lat >= 23 && lon < 75) return "west";              // Gujarat, W-Rajasthan
  if (lat >= 22 && lon >= 82) return "east";             // Bihar, WB, NE, Odisha-N
  if (lat >= 18 && lon < 76) return "westcoast";         // Maharashtra, Goa
  if (lat >= 18) return "central";                       // MP, Chhattisgarh, Telangana-N, E-states
  return "south";                                        // TN, Kerala, Karnataka, AP, Telangana-S
}

const REGION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  north:     { label: "North India",      color: "#0284c7", bg: "rgba(96,184,224,0.08)", border: "rgba(96,184,224,0.25)" },
  west:      { label: "West (Guj/Raj)",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)" },
  westcoast: { label: "West Coast",       color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.25)" },
  central:   { label: "Central India",    color: "#ec4899", bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)" },
  east:      { label: "East & Northeast", color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.25)" },
  south:     { label: "South India",      color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)"  },
};

const REGION_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(REGION_META).map(([k, v]) => [k, v.color])
);

/* Global provenance arcs only — NOAA's worldwide network feeding the India set */
const ARCS = [
  { id: "g1", from: [-77.03, 38.89] as [number, number], to: [72.87, 19.09] as [number, number] },
  { id: "g2", from: [-0.13,  51.51] as [number, number], to: [73.21, 28.07] as [number, number] },
  { id: "g3", from: [139.69, 35.69] as [number, number], to: [80.17, 12.99] as [number, number] },
];

const StationMapView = dynamic(() => import("@/components/ui/station-map-view"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-2xl border border-white/8 flex items-center justify-center" style={{ background: "rgba(14,38,64,0.4)" }}>
      <div className="flex gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-2 w-2 rounded-full bg-sky-400/60 animate-pulse" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  ),
});

function IndiaOutlineFallback({ stations }: { stations: Station[] }) {
  const W = 400, H = 500, LAT_MIN = 7, LAT_MAX = 37, LON_MIN = 68, LON_MAX = 97;
  const proj = (lat: number, lon: number) => ({
    x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H,
  });
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm border border-white/8 rounded-xl"
        style={{ background: "rgba(13,107,142,0.06)", maxHeight: 420 }}>
        <text x="200" y="20" textAnchor="middle" fontSize="10" fill="rgba(96,184,224,0.4)">
          {stations.length} NOAA ISD Stations
        </text>
        {stations.map(s => {
          const { x, y } = proj(s.lat, s.lng);
          const meta = REGION_META[s.region];
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={4} fill={meta?.color ?? "#60B8E0"} opacity={0.7} />
              <title>{s.name}</title>
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-white/30 text-center">
        WebGL unavailable — showing station scatter plot.<br />
        <a href="https://get.webgl.org" target="_blank" rel="noreferrer" className="text-sky/50 hover:text-sky underline">
          Enable WebGL
        </a>{" "}for the interactive map.
      </p>
    </div>
  );
}

export default function MapPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Station Map — DREADNOUGHT ASRE";
    fetch("/api/stations")
      .then((r) => r.json())
      .then((rows: { id: string; name: string; lat: number; lon: number }[]) => {
        const mapped: Station[] = (Array.isArray(rows) ? rows : []).map((s) => ({
          id: String(s.id), name: s.name, lat: s.lat, lng: s.lon,
          region: classifyZone(s.lat, s.lon),
        }));
        setStations(mapped);
      })
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapContainerRef.current?.querySelector("canvas")) {
        setMapTimedOut(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const stationCount = stations.length;
  const zonesCovered = new Set(stations.map((s) => s.region)).size;
  const grouped = Object.entries(REGION_META).map(([key, meta]) => ({
    ...meta, region: key, stations: stations.filter((s) => s.region === key),
  })).filter((g) => g.stations.length > 0);

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />

      {/* Header */}
      <div className="relative z-[1] px-8 pt-10 pb-6 border-b border-white/8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/20">
            <Radio size={18} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">NOAA ISD Station Network</h1>
            <p className="text-xs text-white/40 mt-0.5">{loading ? "Loading stations…" : `${stationCount} ground stations`} · pan-India · 300 km IDW search radius · NOAA Rule 803(8)</p>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-8 py-8 max-w-7xl space-y-8">

        {/* KPI chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: Radio,  label: "Active Stations", value: loading ? "…" : String(stationCount) },
            { icon: MapPin, label: "Zones Covered",   value: loading ? "…" : String(zonesCovered)  },
            { icon: Zap,    label: "IDW Radius",       value: "300 km"    },
            { icon: Zap,    label: "Data Archive",     value: "2015–2025" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card-dark rounded-xl px-4 py-2.5 flex items-center gap-3 border border-white/8">
              <Icon size={13} className="text-sky-400 flex-shrink-0" />
              <div>
                <p className="text-base font-extrabold text-white tabular-nums leading-none">{value}</p>
                <p className="text-[9px] text-white/35 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* MapLibre station map */}
        <div className="glass-card-dark rounded-2xl p-5 border border-white/8 shadow-glass-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/70">
                Live Station Coverage · Interactive Map
              </p>
              <p className="text-xs text-white/35 mt-0.5">
                Click any station for details · Arcs show data provenance from NOAA global network
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              <span className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div ref={mapContainerRef} style={{ height: 480 }}>
            {mapTimedOut ? (
              <IndiaOutlineFallback stations={stations} />
            ) : (
              <StationMapView stations={stations} arcs={ARCS} regionColors={REGION_COLORS} />
            )}
          </div>
        </div>

        {/* Station grid */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">{stationCount} Stations · Regional Breakdown</p>
          <div className="space-y-6">
            {grouped.map(({ label, color, bg, border, stations }) => (
              <div key={label}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>
                  {label} · {stations.length} stations
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {stations.slice(0, 10).map((s) => (
                    <div key={s.id} className="rounded-xl px-3 py-2.5 border" style={{ background: bg, borderColor: border }}>
                      <p className="text-xs font-bold text-white/85 leading-tight">{s.name}</p>
                      <p className="text-[9px] font-mono text-white/35 mt-1">{s.lat}°N {s.lng}°E</p>
                      <p className="text-[8px] text-white/25 mt-0.5 font-mono">ID {s.id}</p>
                    </div>
                  ))}
                  {stations.length > 10 && (
                    <div className="rounded-xl px-3 py-2.5 border flex items-center justify-center" style={{ background: bg, borderColor: border }}>
                      <p className="text-xs font-bold" style={{ color }}>+{stations.length - 10} more</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9px] text-white/20 font-mono pb-4">
          Source: NOAA Integrated Surface Database (ISD) 2015–2025 · Rule 803(8) public records · Indian Evidence Act s74/s78 · IT Act s65B · Wind threshold 17.2 m/s (Beaufort 8) · Exceedance ≥ 3 hours
        </p>
      </div>
    </div>
  );
}
