"use client";

import { useEffect, useRef } from "react";
import { Map, MapArc, MapMarker, MarkerContent, MapControls, useMap } from "@/components/ui/mapcn-map-arc";

const STATIONS = [
  { id: "42840", lng: 68.83, lat: 23.27 },
  { id: "42851", lng: 69.67, lat: 23.29 },
  { id: "42855", lng: 70.10, lat: 23.11 },
  { id: "42867", lng: 72.63, lat: 23.08 },
  { id: "42869", lng: 70.78, lat: 22.31 },
  { id: "42873", lng: 72.74, lat: 21.11 },
  { id: "42872", lng: 73.23, lat: 22.34 },
  { id: "42862", lng: 69.07, lat: 22.47 },
  { id: "42863", lng: 70.37, lat: 20.90 },
  { id: "42801", lng: 70.92, lat: 26.90 },
  { id: "42809", lng: 73.05, lat: 26.25 },
  { id: "42823", lng: 71.40, lat: 25.75 },
  { id: "42824", lng: 73.21, lat: 28.07 },
  { id: "43003", lng: 72.87, lat: 19.09 },
  { id: "43014", lng: 73.91, lat: 18.58 },
  { id: "43279", lng: 80.17, lat: 12.99 },
  { id: "43333", lng: 78.83, lat:  9.37 },
  { id: "43356", lng: 77.70, lat:  8.72 },
];

const HUB: [number, number] = [72.0, 22.5];

const GLOBAL_ARCS = [
  { id: "noaa-hq",    from: [-77.03, 38.89] as [number, number], to: [70.10, 23.11] as [number, number] },
  { id: "met-office", from: [-0.13,  51.51] as [number, number], to: [73.21, 28.07] as [number, number] },
  { id: "jma-tokyo",  from: [139.69, 35.69] as [number, number], to: [80.17, 12.99] as [number, number] },
];

const STATION_ARCS = STATIONS.map((s) => ({
  id: `hub-${s.id}`,
  from: HUB,
  to: [s.lng, s.lat] as [number, number],
}));

// ── Auto-rotation engine ───────────────────────────────────────────────────────
// Lives inside <Map> so it can call useMap(). Rotates at ~0.6°/s (one full
// revolution every ~10 minutes) — slow enough to feel ambient, fast enough
// to be clearly visible.
function AutoRotate() {
  const { map, isLoaded } = useMap();
  const rafRef      = useRef<number>(0);
  const userActive  = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Pause while the user is interacting; resume 1.5 s after they let go.
    const pause  = () => {
      userActive.current = true;
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
    const resume = () => {
      resumeTimer.current = setTimeout(() => { userActive.current = false; }, 1500);
    };

    const container = map.getContainer();
    container.addEventListener("mousedown",  pause);
    container.addEventListener("touchstart", pause, { passive: true });
    container.addEventListener("mouseup",    resume);
    container.addEventListener("touchend",   resume);

    // rAF loop — increments bearing by 0.26° per frame ≈ 15.6°/s at 60 fps
    const spin = () => {
      if (!userActive.current) {
        map.setBearing((map.getBearing() + 0.26) % 360);
      }
      rafRef.current = requestAnimationFrame(spin);
    };
    rafRef.current = requestAnimationFrame(spin);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      container.removeEventListener("mousedown",  pause);
      container.removeEventListener("touchstart", pause);
      container.removeEventListener("mouseup",    resume);
      container.removeEventListener("touchend",   resume);
    };
  }, [map, isLoaded]);

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingMap() {
  return (
    <div className="h-full w-full">
      <Map
        center={[77.0, 20.5]}
        zoom={3.8}
        pitch={20}
        theme="dark"
        scrollZoom={false}
        dragRotate={false}
      >
        <AutoRotate />

        {/* Global arcs — sky blue, dashed */}
        <MapArc
          id="global"
          data={GLOBAL_ARCS}
          curvature={0.35}
          samples={80}
          paint={{
            "line-color": "#60B8E0",
            "line-width": 1.2,
            "line-opacity": 0.55,
            "line-dasharray": [3, 3],
          }}
          interactive={false}
        />

        {/* Hub → station arcs — emerald, solid */}
        <MapArc
          id="stations"
          data={STATION_ARCS}
          curvature={0.18}
          samples={48}
          paint={{
            "line-color": "#22c55e",
            "line-width": 0.8,
            "line-opacity": 0.45,
          }}
          interactive={false}
        />

        {/* Hub dot */}
        <MapMarker longitude={HUB[0]} latitude={HUB[1]}>
          <MarkerContent>
            <div className="relative">
              <span className="absolute -inset-2 rounded-full bg-sky-400/20 animate-ping" />
              <div className="relative w-3 h-3 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_rgba(96,184,224,0.8)]" />
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Station dots */}
        {STATIONS.map((s) => (
          <MapMarker key={s.id} longitude={s.lng} latitude={s.lat}>
            <MarkerContent>
              <div className="w-2 h-2 rounded-full bg-emerald-400 border border-white/60 shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
            </MarkerContent>
          </MapMarker>
        ))}

        <MapControls showZoom position="bottom-right" />
      </Map>
    </div>
  );
}
