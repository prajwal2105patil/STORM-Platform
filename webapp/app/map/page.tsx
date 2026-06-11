"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { MapPin, Radio, Zap } from "lucide-react";

/* ── Station data ── */
const STATIONS = [
  { id: "42840", name: "Naliya AF",   lat: 23.27, lng: 68.83, region: "gujarat"     },
  { id: "42851", name: "Bhuj",        lat: 23.29, lng: 69.67, region: "gujarat"     },
  { id: "42855", name: "Kandla",      lat: 23.11, lng: 70.10, region: "gujarat"     },
  { id: "42867", name: "Ahmedabad",   lat: 23.08, lng: 72.63, region: "gujarat"     },
  { id: "42869", name: "Rajkot",      lat: 22.31, lng: 70.78, region: "gujarat"     },
  { id: "42873", name: "Surat",       lat: 21.11, lng: 72.74, region: "gujarat"     },
  { id: "42872", name: "Vadodara",    lat: 22.34, lng: 73.23, region: "gujarat"     },
  { id: "42862", name: "Okha",        lat: 22.47, lng: 69.07, region: "gujarat"     },
  { id: "42863", name: "Veraval",     lat: 20.90, lng: 70.37, region: "gujarat"     },
  { id: "42801", name: "Jaisalmer",   lat: 26.90, lng: 70.92, region: "rajasthan"   },
  { id: "42809", name: "Jodhpur",     lat: 26.25, lng: 73.05, region: "rajasthan"   },
  { id: "42823", name: "Barmer",      lat: 25.75, lng: 71.40, region: "rajasthan"   },
  { id: "42824", name: "Bikaner",     lat: 28.07, lng: 73.21, region: "rajasthan"   },
  { id: "43003", name: "Mumbai",      lat: 19.09, lng: 72.87, region: "maharashtra" },
  { id: "43014", name: "Pune",        lat: 18.58, lng: 73.91, region: "maharashtra" },
  { id: "43279", name: "Chennai",     lat: 12.99, lng: 80.17, region: "tamilnadu"   },
  { id: "43333", name: "Ramnad",      lat:  9.37, lng: 78.83, region: "tamilnadu"   },
  { id: "43356", name: "Tirunelveli", lat:  8.72, lng: 77.70, region: "tamilnadu"   },
];

const REGION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  gujarat:     { label: "Gujarat",     color: "#60B8E0", bg: "rgba(96,184,224,0.08)",  border: "rgba(96,184,224,0.25)" },
  rajasthan:   { label: "Rajasthan",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)" },
  maharashtra: { label: "Maharashtra", color: "#a855f7", bg: "rgba(168,85,247,0.08)",  border: "rgba(168,85,247,0.25)" },
  tamilnadu:   { label: "Tamil Nadu",  color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "rgba(34,197,94,0.25)"  },
};

const REGION_COLORS: Record<string, string> = {
  gujarat:     "#60B8E0",
  rajasthan:   "#f59e0b",
  maharashtra: "#a855f7",
  tamilnadu:   "#22c55e",
};

const ARCS = [
  // Global provenance
  { id: "g1", from: [-77.03, 38.89] as [number, number], to: [70.10, 23.11] as [number, number] },
  { id: "g2", from: [-0.13,  51.51] as [number, number], to: [73.21, 28.07] as [number, number] },
  { id: "g3", from: [139.69, 35.69] as [number, number], to: [80.17, 12.99] as [number, number] },
  // Gujarat
  { id: "gj1", from: [68.83, 23.27] as [number, number], to: [69.07, 22.47] as [number, number] },
  { id: "gj2", from: [70.10, 23.11] as [number, number], to: [70.78, 22.31] as [number, number] },
  { id: "gj3", from: [72.63, 23.08] as [number, number], to: [70.37, 20.90] as [number, number] },
  { id: "gj4", from: [73.23, 22.34] as [number, number], to: [72.74, 21.11] as [number, number] },
  // Rajasthan
  { id: "rj1", from: [70.92, 26.90] as [number, number], to: [71.40, 25.75] as [number, number] },
  { id: "rj2", from: [73.05, 26.25] as [number, number], to: [73.21, 28.07] as [number, number] },
  // Maharashtra
  { id: "mh1", from: [72.87, 19.09] as [number, number], to: [73.91, 18.58] as [number, number] },
  // Tamil Nadu
  { id: "tn1", from: [80.17, 12.99] as [number, number], to: [78.83,  9.37] as [number, number] },
  { id: "tn2", from: [78.83,  9.37] as [number, number], to: [77.70,  8.72] as [number, number] },
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

export default function MapPage() {
  useEffect(() => { document.title = "Station Map — DREADNOUGHT ASRE"; }, []);

  const grouped = Object.entries(REGION_META).map(([key, meta]) => ({
    ...meta, region: key, stations: STATIONS.filter((s) => s.region === key),
  }));

  return (
    <div className="min-h-screen">

      {/* Header */}
      <div className="px-8 pt-10 pb-6 border-b border-white/8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/20">
            <Radio size={18} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">NOAA ISD Station Network</h1>
            <p className="text-xs text-white/40 mt-0.5">18 ground stations · 4 states · 300 km IDW search radius · NOAA Rule 803(8)</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl space-y-8">

        {/* KPI chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: Radio,  label: "Active Stations", value: "18"        },
            { icon: MapPin, label: "States Covered",   value: "4"         },
            { icon: Zap,    label: "IDW Radius",       value: "300 km"    },
            { icon: Zap,    label: "Data Archive",     value: "2014–2024" },
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
          <div style={{ height: 480 }}>
            <StationMapView stations={STATIONS} arcs={ARCS} regionColors={REGION_COLORS} />
          </div>
        </div>

        {/* Station grid */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">All 18 Stations · Regional Breakdown</p>
          <div className="space-y-6">
            {grouped.map(({ label, color, bg, border, stations }) => (
              <div key={label}>
                <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color }}>
                  {label} · {stations.length} stations
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {stations.map((s) => (
                    <div key={s.id} className="rounded-xl px-3 py-2.5 border" style={{ background: bg, borderColor: border }}>
                      <p className="text-xs font-bold text-white/85 leading-tight">{s.name}</p>
                      <p className="text-[9px] font-mono text-white/35 mt-1">{s.lat}°N {s.lng}°E</p>
                      <p className="text-[8px] text-white/25 mt-0.5 font-mono">ID {s.id}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[9px] text-white/20 font-mono pb-4">
          Source: NOAA Integrated Surface Database (ISD) 2014–2024 · Rule 803(8) public records · Indian Evidence Act s74/s78 · IT Act s65B · Wind threshold 17.2 m/s (Beaufort 8) · Exceedance ≥ 3 hours
        </p>
      </div>
    </div>
  );
}
