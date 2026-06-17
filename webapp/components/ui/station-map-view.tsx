"use client";

import { useState } from "react";
import {
  Map, MapArc, MapMarker, MarkerContent, MarkerPopup, MapControls,
} from "@/components/ui/mapcn-map-arc";

type Station = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
};

type Arc = {
  id: string;
  from: [number, number];
  to: [number, number];
};

type Props = {
  stations: Station[];
  arcs: Arc[];
  regionColors: Record<string, string>;
};

export default function StationMapView({ stations, arcs, regionColors }: Props) {
  const [activeStation, setActiveStation] = useState<string | null>(null);

  // Split arcs: global (long distance) vs local (intra-India)
  const globalArcs = arcs.filter((a) => a.id.startsWith("g"));
  const localArcs  = arcs.filter((a) => !a.id.startsWith("g"));

  const isActive = (id: string) => activeStation === id;

  return (
    <div className="h-full w-full rounded-xl overflow-hidden">
      <Map
        center={[73.5, 21.0]}
        zoom={5.2}
        pitch={10}
        theme="dark"
      >
        {/* Global provenance arcs — sky dashed */}
        <MapArc
          id="global-arcs"
          data={globalArcs}
          curvature={0.32}
          samples={80}
          paint={{
            "line-color": "#60B8E0",
            "line-width": 1.2,
            "line-opacity": 0.45,
            "line-dasharray": [3, 3],
          }}
          interactive={false}
        />

        {/* Intra-India arcs — colored by region */}
        <MapArc
          id="local-arcs"
          data={localArcs}
          curvature={0.2}
          samples={48}
          paint={{
            "line-color": "#22c55e",
            "line-width": 1,
            "line-opacity": 0.55,
          }}
          interactive={false}
        />

        {/* Station markers */}
        {stations.map((s) => {
          const color = regionColors[s.region] ?? "#60B8E0";
          const active = isActive(s.id);
          return (
            <MapMarker
              key={s.id}
              longitude={s.lng}
              latitude={s.lat}
              onClick={() => setActiveStation(active ? null : s.id)}
            >
              <MarkerContent>
                <div className="relative flex items-center justify-center cursor-pointer">
                  {active && (
                    <span
                      className="absolute rounded-full animate-ping"
                      style={{
                        width: 20, height: 20,
                        background: `${color}30`,
                        border: `1px solid ${color}60`,
                        top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  )}
                  <div
                    className="rounded-full border-2 border-white shadow-lg transition-all duration-200"
                    style={{
                      width:  active ? 12 : 9,
                      height: active ? 12 : 9,
                      background: color,
                      boxShadow: active ? `0 0 12px ${color}90` : `0 0 5px ${color}60`,
                    }}
                  />
                </div>
              </MarkerContent>

              {/* Popup on click */}
              {active && (
                <MarkerPopup closeButton>
                  <div className="min-w-[160px]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                      />
                      <p className="font-bold text-white text-sm leading-tight">{s.name}</p>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { label: "Station ID", value: s.id },
                        { label: "Region",     value: s.region.charAt(0).toUpperCase() + s.region.slice(1) },
                        { label: "Latitude",   value: `${s.lat}°N` },
                        { label: "Longitude",  value: `${s.lng}°E` },
                        { label: "IDW Radius", value: "300 km" },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center gap-3">
                          <span className="text-[9px] text-white/40 uppercase tracking-wider flex-shrink-0">{label}</span>
                          <span className="text-[10px] font-mono text-white/80 font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-white/8">
                      <p className="text-[8px] text-white/25 font-mono">NOAA ISD 2015–2025 · Rule 803(8)</p>
                    </div>
                  </div>
                </MarkerPopup>
              )}
            </MapMarker>
          );
        })}

        <MapControls showZoom position="bottom-right" />
      </Map>
    </div>
  );
}
