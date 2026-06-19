"use client";

import { useEffect, useId } from "react";
import {
  Map, MapArc, MapMarker, MarkerContent, MapControls, useMap,
} from "@/components/ui/mapcn-map-arc";
import type { AdjudicationLabel } from "@/types";

/* Verdict → accent colour for the asset pin + IDW link. */
const VERDICT_COLOR: Record<string, string> = {
  VALIDATED:                 "#22c55e",
  REJECTED_BELOW_THRESHOLD:  "#f59e0b",
  REJECTED_WRONG_MONTH:      "#f59e0b",
  REJECTED_NON_WEATHER:      "#a855f7",
  REJECTED_MALFORMED_COORDS: "#dc2626",
  REJECTED_MISSING_DATES:    "#f59e0b",
  INSUFFICIENT_DATA:         "#6b7280",
  PENDING:                   "#d97706",
};

const AREA_COLOR = "#60B8E0"; // the 300 km IDW search radius is always sky

/** Geodesic-ish circle polygon (km radius) around a [lon,lat] centre. */
function circlePolygon(
  lon: number, lat: number, radiusKm: number, steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const earthR = 6371; // km
  const latR = (radiusKm / earthR) * (180 / Math.PI);
  const lonR = latR / Math.cos((lat * Math.PI) / 180);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lon + lonR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

/** Draws the 300 km IDW search area as a dashed fill+outline circle. */
function RadiusArea({ lon, lat, radiusKm }: { lon: number; lat: number; radiusKm: number }) {
  const { map, isLoaded } = useMap();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sourceId = `idw-area-src-${uid}`;
  const fillId   = `idw-area-fill-${uid}`;
  const lineId   = `idw-area-line-${uid}`;

  useEffect(() => {
    if (!isLoaded || !map) return;
    const data: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [circlePolygon(lon, lat, radiusKm)],
    };
    try {
      if (!map.getSource(sourceId)) map.addSource(sourceId, { type: "geojson", data });
      if (!map.getLayer(fillId)) {
        map.addLayer({ id: fillId, type: "fill", source: sourceId,
          paint: { "fill-color": AREA_COLOR, "fill-opacity": 0.08 } });
      }
      if (!map.getLayer(lineId)) {
        map.addLayer({ id: lineId, type: "line", source: sourceId,
          paint: { "line-color": AREA_COLOR, "line-width": 1.2, "line-opacity": 0.55, "line-dasharray": [2, 2] } });
      }
    } catch { /* style not ready — ignore */ }
    return () => {
      try {
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* ignore */ }
    };
  }, [isLoaded, map, lon, lat, radiusKm, sourceId, fillId, lineId]);

  return null;
}

export type EvidenceMapProps = {
  assetLat: number;
  assetLon: number;
  assetName?: string;
  station: { lat: number; lon: number; name: string } | null;
  distanceKm?: number;
  label: AdjudicationLabel;
};

export default function EvidenceMap({
  assetLat, assetLon, assetName, station, distanceKm, label,
}: EvidenceMapProps) {
  const color = VERDICT_COLOR[label] ?? AREA_COLOR;

  // Zoom so the 300 km area roughly fills the frame, tightening when the
  // nearest station is close.
  const zoom = distanceKm != null && distanceKm < 60 ? 6.4
             : distanceKm != null && distanceKm < 150 ? 5.8
             : 5.2;

  const arcs = station
    ? [{ id: "idw-link", from: [assetLon, assetLat] as [number, number], to: [station.lon, station.lat] as [number, number] }]
    : [];

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden">
      <Map center={[assetLon, assetLat]} zoom={zoom} pitch={0} theme="dark">
        {/* 300 km IDW search area */}
        <RadiusArea lon={assetLon} lat={assetLat} radiusKm={300} />

        {/* IDW link: asset → nearest station */}
        {station && (
          <MapArc
            id="idw-link"
            data={arcs}
            curvature={0.18}
            samples={48}
            paint={{ "line-color": color, "line-width": 1.6, "line-opacity": 0.75, "line-dasharray": [2, 1.5] }}
            interactive={false}
          />
        )}

        {/* Asset / hub spot — the exact entered coordinate */}
        <MapMarker longitude={assetLon} latitude={assetLat}>
          <MarkerContent>
            <div className="relative flex items-center justify-center">
              <span
                className="absolute rounded-full animate-ping"
                style={{ width: 24, height: 24, background: `${color}33`, border: `1px solid ${color}80`,
                  top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
              />
              <div
                className="rounded-full border-2 border-white"
                style={{ width: 14, height: 14, background: color, boxShadow: `0 0 14px ${color}` }}
              />
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Nearest NOAA station */}
        {station && (
          <MapMarker longitude={station.lon} latitude={station.lat}>
            <MarkerContent>
              <div
                className="rounded-full border-2 border-white"
                style={{ width: 10, height: 10, background: AREA_COLOR, boxShadow: `0 0 8px ${AREA_COLOR}` }}
              />
            </MarkerContent>
          </MapMarker>
        )}

        <MapControls showZoom position="bottom-right" />
      </Map>

      {/* Legend overlay */}
      <div className="absolute top-3 left-3 z-[1] rounded-lg px-3 py-2 text-[10px] leading-relaxed"
        style={{ background: "rgba(4,8,16,0.72)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full border border-white" style={{ background: color }} />
          <span className="text-white/80 font-semibold">{assetName || "Claimed asset"}</span>
        </div>
        <p className="text-white/40 font-mono mt-0.5">{assetLat.toFixed(3)}°N · {assetLon.toFixed(3)}°E</p>
        {station && (
          <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-white/10">
            <span className="inline-block w-2.5 h-2.5 rounded-full border border-white" style={{ background: AREA_COLOR }} />
            <span className="text-white/60">
              {station.name}{distanceKm != null ? ` · ${distanceKm.toFixed(1)} km` : ""}
            </span>
          </div>
        )}
        <p className="text-white/30 mt-1">Dashed ring = 300 km IDW search area</p>
      </div>
    </div>
  );
}
