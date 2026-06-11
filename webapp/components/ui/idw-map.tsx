"use client";
import { useEffect, useRef, useState } from "react";

// Station registry — matches asre/idw.py exactly
// Format: [id, name, lat, lon, region]
const STATIONS: [string, string, number, number, string][] = [
  // Gujarat / Kutch
  ["42840", "Naliya AF",      23.27, 68.83, "gujarat"],
  ["42851", "Bhuj",           23.29, 69.67, "gujarat"],
  ["42855", "Kandla",         23.11, 70.10, "gujarat"],
  ["42867", "Ahmedabad",      23.08, 72.63, "gujarat"],
  ["42869", "Rajkot",         22.31, 70.78, "gujarat"],
  ["42873", "Surat",          21.11, 72.74, "gujarat"],
  ["42872", "Vadodara",       22.34, 73.23, "gujarat"],
  ["42862", "Okha",           22.47, 69.07, "gujarat"],
  ["42863", "Veraval",        20.90, 70.37, "gujarat"],
  // Rajasthan
  ["42801", "Jaisalmer",      26.90, 70.92, "rajasthan"],
  ["42809", "Jodhpur",        26.25, 73.05, "rajasthan"],
  ["42823", "Barmer",         25.75, 71.40, "rajasthan"],
  ["42824", "Bikaner",        28.07, 73.21, "rajasthan"],
  // Maharashtra
  ["43003", "Mumbai",         19.09, 72.87, "maharashtra"],
  ["43014", "Pune",           18.58, 73.91, "maharashtra"],
  // Tamil Nadu
  ["43279", "Chennai",        12.99, 80.17, "tamilnadu"],
  ["43333", "Ramnad",          9.37, 78.83, "tamilnadu"],
  ["43356", "Tirunelveli",     8.72, 77.70, "tamilnadu"],
];

const REGION_COLORS: Record<string, string> = {
  gujarat:     "#60B8E0",
  rajasthan:   "#d97706",
  maharashtra: "#a855f7",
  tamilnadu:   "#22c55e",
};

// Bounding box: lat 7.5–30, lon 67.5–82
const LAT_MIN = 7.5,  LAT_MAX = 30;
const LON_MIN = 67.5, LON_MAX = 82;

function toPixel(lat: number, lon: number, W: number, H: number): [number, number] {
  const px = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const py = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
  return [px, py];
}

// Demo asset: wind farm near Kutch
const ASSET = { lat: 23.13, lon: 68.93, label: "Kutch Wind Farm" };

export function IDWMap({ className = "" }: { className?: string }) {
  const [active,   setActive]  = useState<string | null>(null);
  const [tick,     setTick]    = useState(0);
  const [mounted,  setMounted] = useState(false);
  const W = 560, H = 380;

  // Only animate after client hydration to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const [ax, ay] = toPixel(ASSET.lat, ASSET.lon, W, H);

  // Sort stations by distance to asset for IDW preview
  const withDist = STATIONS.map(([id, name, lat, lon, region]) => {
    const [sx, sy] = toPixel(lat, lon, W, H);
    const dPx = Math.sqrt((sx - ax) ** 2 + (sy - ay) ** 2);
    // real km (approx)
    const dlat = lat - ASSET.lat, dlon = lon - ASSET.lon;
    const km = Math.round(Math.sqrt(dlat * dlat * 12321 + dlon * dlon * 9801));
    return { id, name, lat, lon, region, sx, sy, dPx, km };
  }).sort((a, b) => a.km - b.km);

  const nearest = withDist.slice(0, 4); // show IDW lines to 4 nearest

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label="NOAA ISD Station Coverage Map — India"
      >
        {/* Background */}
        <rect width={W} height={H} fill="#060d1a" rx="12" />

        {/* Dot grid */}
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="rgba(255,255,255,0.07)" />
          </pattern>
          {/* Radial glow filter */}
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-lg">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#dot-grid)" rx="12" />

        {/* India landmass simplified outline (stylized bounding polygon) */}
        <path
          d={`M 35,${H * 0.04} L ${W * 0.7},${H * 0.04}
              L ${W * 0.75},${H * 0.12}
              L ${W * 0.82},${H * 0.2}
              L ${W * 0.95},${H * 0.28}
              L ${W * 0.98},${H * 0.55}
              L ${W * 0.9},${H * 0.72}
              L ${W * 0.85},${H * 0.82}
              L ${W * 0.78},${H * 0.95}
              L ${W * 0.7},${H}
              L ${W * 0.62},${H}
              L ${W * 0.58},${H * 0.88}
              L ${W * 0.5},${H * 0.78}
              L ${W * 0.42},${H * 0.72}
              L ${W * 0.35},${H * 0.65}
              L ${W * 0.28},${H * 0.55}
              L ${W * 0.18},${H * 0.55}
              L ${W * 0.08},${H * 0.5}
              L ${W * 0.04},${H * 0.42}
              L ${W * 0.02},${H * 0.3}
              L ${W * 0.04},${H * 0.18}
              L 35,${H * 0.04} Z`}
          fill="rgba(26,58,92,0.18)"
          stroke="rgba(96,184,224,0.15)"
          strokeWidth="1"
        />

        {/* IDW lines from asset to nearest 4 stations */}
        {nearest.map(({ id, sx, sy, km }, i) => {
          const weight = Math.max(0.05, 1 - km / 300);
          const opacity = weight * 0.5 + 0.1;
          const dash = `${6 + i * 3} ${4 + i * 2}`;
          const dashOffset = mounted ? -(tick * (0.8 - i * 0.15)) : 0;
          return (
            <line
              key={id}
              x1={ax} y1={ay}
              x2={sx} y2={sy}
              stroke="#60B8E0"
              strokeWidth={weight * 2.5 + 0.4}
              strokeOpacity={opacity}
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
            />
          );
        })}

        {/* Station dots */}
        {withDist.map(({ id, name, sx, sy, region, km }) => {
          const color  = REGION_COLORS[region];
          const isNear = nearest.some((n) => n.id === id);
          const isHov  = active === id;
          const pPhase = mounted ? ((tick * 0.04) + STATIONS.findIndex((s) => s[0] === id) * 0.8) % (Math.PI * 2) : 0;
          const pulseR = isNear ? 10 + 6 * Math.abs(Math.sin(pPhase)) : 0;

          return (
            <g
              key={id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive(null)}
            >
              {/* Pulse ring */}
              {isNear && (
                <circle
                  cx={sx} cy={sy}
                  r={pulseR}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  strokeOpacity={0.3 + 0.2 * Math.abs(Math.sin(pPhase))}
                />
              )}
              {/* Station dot */}
              <circle
                cx={sx} cy={sy}
                r={isNear ? 5 : isHov ? 4.5 : 3.5}
                fill={color}
                fillOpacity={isNear ? 1 : 0.75}
                filter={isNear ? "url(#glow-sm)" : undefined}
              />
              {/* Label on hover */}
              {isHov && (
                <g>
                  <rect
                    x={sx + 8} y={sy - 14}
                    width={name.length * 6.8 + 16} height={20}
                    rx="4" fill="#0e2640" stroke={color}
                    strokeWidth="0.8" strokeOpacity="0.7"
                  />
                  <text
                    x={sx + 16} y={sy}
                    fontSize="9" fill={color}
                    fontFamily="monospace" fontWeight="600"
                  >
                    {name} · {km}km
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Asset pin */}
        <g filter="url(#glow-lg)">
          <circle cx={ax} cy={ay} r={14} fill="rgba(220,38,38,0.12)" />
          <circle cx={ax} cy={ay} r={8}  fill="rgba(220,38,38,0.25)" />
          <circle cx={ax} cy={ay} r={4}  fill="#ef4444" />
          <line x1={ax} y1={ay + 4} x2={ax} y2={ay + 16}
            stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.7" />
        </g>
        <text x={ax + 10} y={ay - 10}
          fontSize="9" fill="#fca5a5"
          fontFamily="monospace" fontWeight="700"
        >
          {ASSET.label}
        </text>

        {/* Region legend */}
        {Object.entries(REGION_COLORS).map(([region, color], i) => (
          <g key={region} transform={`translate(12, ${H - 60 + i * 14})`}>
            <circle cx="5" cy="5" r="4" fill={color} fillOpacity="0.8" />
            <text x="14" y="9" fontSize="9" fill="rgba(255,255,255,0.55)"
              fontFamily="sans-serif">
              {region.charAt(0).toUpperCase() + region.slice(1)}
            </text>
          </g>
        ))}

        {/* IDW range ring (300 km = ~87px at this scale) */}
        <circle
          cx={ax} cy={ay} r={87}
          fill="none"
          stroke="rgba(96,184,224,0.08)"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <text x={ax + 58} y={ay - 72}
          fontSize="8" fill="rgba(96,184,224,0.35)"
          fontFamily="monospace"
        >
          300 km
        </text>
      </svg>

      {/* Nearest station callout */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {nearest.map(({ id, name, km, region }, i) => {
          const weight = Math.max(0, 1 - km / 300);
          const pct = (weight * 100).toFixed(1);
          const color = REGION_COLORS[region];
          return (
            <div
              key={id}
              className="rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: `${color}33`, background: `${color}0a` }}
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive(null)}
            >
              <p className="font-mono font-bold" style={{ color }}>
                #{i + 1} · {name}
              </p>
              <p className="text-gray-400 mt-0.5">{km} km · IDW {pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
