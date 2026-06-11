"use client";

import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DottedMap from "dotted-map";
import Image from "next/image";
import { useTheme } from "next-themes";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end:   { lat: number; lng: number; label?: string };
  }>;
  lineColor?:         string;
  showLabels?:        boolean;
  labelClassName?:    string;
  animationDuration?: number;
  loop?:              boolean;
}

export function WorldMap({
  dots              = [],
  lineColor         = "#60B8E0",
  showLabels        = true,
  labelClassName    = "text-sm",
  animationDuration = 2,
  loop              = true,
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const { theme } = useTheme();

  const map = useMemo(() => new DottedMap({ height: 100, grid: "diagonal" }), []);

  const svgMap = useMemo(
    () =>
      map.getSVG({
        radius:          0.22,
        color:           theme === "dark" ? "#60B8E033" : "#00000040",
        shape:           "circle",
        backgroundColor: theme === "dark" ? "#040810"  : "white",
      }),
    [map, theme]
  );

  const projectPoint = (lat: number, lng: number) => ({
    x: (lng + 180) * (800 / 360),
    y: (90  - lat) * (400 / 180),
  });

  const createCurvedPath = (
    start: { x: number; y: number },
    end:   { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  // Quadratic bezier midpoint at t=0.5
  const bezierMid = (
    start: { x: number; y: number },
    end:   { x: number; y: number }
  ) => {
    const ctrlX = (start.x + end.x) / 2;
    const ctrlY = Math.min(start.y, end.y) - 50;
    return {
      x: 0.25 * start.x + 0.5 * ctrlX + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * ctrlY + 0.25 * end.y,
    };
  };

  const staggerDelay       = 0.3;
  const totalAnimationTime = dots.length * staggerDelay + animationDuration;
  const pauseTime          = 2;
  const fullCycleDuration  = totalAnimationTime + pauseTime;

  return (
    <div className="w-full aspect-[2/1] md:aspect-[2.5/1] lg:aspect-[2/1] dark:bg-[#040810] bg-white rounded-lg relative font-sans overflow-hidden">
      <Image
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)] pointer-events-none select-none object-cover"
        alt="world map"
        height="495"
        width="1056"
        draggable={false}
        priority
      />
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 pointer-events-auto select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="white"     stopOpacity="0" />
            <stop offset="5%"   stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%"  stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white"     stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Animated arcs + traveling dots ── */}
        {dots.map((dot, i) => {
          const sp        = projectPoint(dot.start.lat, dot.start.lng);
          const ep        = projectPoint(dot.end.lat,   dot.end.lng);
          const mid       = bezierMid(sp, ep);
          const startTime = (i * staggerDelay) / fullCycleDuration;
          const endTime   = (i * staggerDelay + animationDuration) / fullCycleDuration;
          const resetTime = totalAnimationTime / fullCycleDuration;

          return (
            <g key={`arc-${i}`}>
              {/* Arc line */}
              <motion.path
                d={createCurvedPath(sp, ep)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={loop
                  ? { pathLength: [0, 0, 1, 1, 0] }
                  : { pathLength: 1 }}
                transition={loop
                  ? {
                      duration: fullCycleDuration,
                      times:    [0, startTime, endTime, resetTime, 1],
                      ease:     "easeInOut",
                      repeat:   Infinity,
                    }
                  : {
                      duration: animationDuration,
                      delay:    i * staggerDelay,
                      ease:     "easeInOut",
                    }}
              />

              {/* Traveling dot — cx/cy keyframes stay in SVG coordinate space */}
              {loop && (
                <motion.circle
                  r="3"
                  fill={lineColor}
                  filter="url(#glow)"
                  initial={{ opacity: 0 }}
                  animate={{
                    cx:      [sp.x, sp.x,  mid.x, ep.x,  ep.x,  sp.x ],
                    cy:      [sp.y, sp.y,  mid.y, ep.y,  ep.y,  sp.y ],
                    opacity: [0,    0,     1,     1,     0,     0    ],
                  }}
                  transition={{
                    duration: fullCycleDuration,
                    times:    [0, startTime, (startTime + endTime) / 2, endTime, resetTime, 1],
                    ease:     "easeInOut",
                    repeat:   Infinity,
                  }}
                />
              )}
            </g>
          );
        })}

        {/* ── Station dots + SVG-native labels ── */}
        {dots.map((dot, i) => {
          const sp = projectPoint(dot.start.lat, dot.start.lng);
          const ep = projectPoint(dot.end.lat,   dot.end.lng);

          return (
            <g key={`pts-${i}`}>
              {/* Start dot */}
              <motion.g
                onHoverStart={() => setHoveredLocation(dot.start.label ?? `Location ${i}`)}
                onHoverEnd={() => setHoveredLocation(null)}
                style={{ cursor: "pointer" }}
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <circle cx={sp.x} cy={sp.y} r="3" fill={lineColor} filter="url(#glow)" />
                <circle cx={sp.x} cy={sp.y} r="3" fill={lineColor} opacity="0.5">
                  <animate attributeName="r"       from="3" to="12" dur="2s" begin="0s"   repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin="0s"   repeatCount="indefinite" />
                </circle>
              </motion.g>

              {/* Start label — native SVG rect+text, scales with viewBox */}
              {showLabels && dot.start.label && (
                <motion.g
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 * i + 0.3, duration: 0.5 }}
                >
                  <rect
                    x={sp.x - 28}
                    y={sp.y - 22}
                    width="56"
                    height="13"
                    rx="2"
                    fill="#040810"
                    fillOpacity="0.92"
                    stroke="#60B8E0"
                    strokeOpacity="0.4"
                    strokeWidth="0.6"
                  />
                  <text
                    x={sp.x}
                    y={sp.y - 15.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#7dd3fc"
                    fontSize="6.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                    letterSpacing="0.2"
                  >
                    {dot.start.label}
                  </text>
                </motion.g>
              )}

              {/* End dot */}
              <motion.g
                onHoverStart={() => setHoveredLocation(dot.end.label ?? `Destination ${i}`)}
                onHoverEnd={() => setHoveredLocation(null)}
                style={{ cursor: "pointer" }}
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <circle cx={ep.x} cy={ep.y} r="3" fill={lineColor} filter="url(#glow)" />
                <circle cx={ep.x} cy={ep.y} r="3" fill={lineColor} opacity="0.5">
                  <animate attributeName="r"       from="3" to="12" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                </circle>
              </motion.g>

              {/* End label */}
              {showLabels && dot.end.label && (
                <motion.g
                  pointerEvents="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 * i + 0.5, duration: 0.5 }}
                >
                  <rect
                    x={ep.x - 28}
                    y={ep.y - 22}
                    width="56"
                    height="13"
                    rx="2"
                    fill="#040810"
                    fillOpacity="0.92"
                    stroke="#60B8E0"
                    strokeOpacity="0.4"
                    strokeWidth="0.6"
                  />
                  <text
                    x={ep.x}
                    y={ep.y - 15.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#7dd3fc"
                    fontSize="6.5"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fontWeight="600"
                    letterSpacing="0.2"
                  >
                    {dot.end.label}
                  </text>
                </motion.g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Mobile hover tooltip */}
      <AnimatePresence>
        {hoveredLocation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-4 bg-[#040810]/90 text-white px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm sm:hidden border border-sky-400/30"
          >
            {hoveredLocation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
