import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:           "#1A3A5C",
        "navy-dark":    "#0e2640",
        "navy-deepest": "#040810",
        teal:           "#0D6B8E",
        "teal-light":   "#1E88BE",
        steel:          "#2E75B6",
        sky:            "#60B8E0",
        electric:       "#38bdf8",
      },
      backgroundImage: {
        "navy-gradient":    "linear-gradient(135deg, #1A3A5C 0%, #0D6B8E 100%)",
        "teal-gradient":    "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)",
        "hero-gradient":    "linear-gradient(135deg, #0e2640 0%, #1A3A5C 50%, #0D6B8E 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #0e2640 0%, #1A3A5C 45%, #0a1f35 100%)",
        "deep-space":       "linear-gradient(180deg, #040810 0%, #060d1a 60%, #0e1f36 100%)",
        "electric-gradient":"linear-gradient(135deg, #60B8E0 0%, #22c55e 55%, #38bdf8 100%)",
        "glass-shimmer":    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
      },
      boxShadow: {
        "navy-sm":    "0 2px 8px -1px rgba(26,58,92,0.20)",
        "navy-md":    "0 4px 16px -2px rgba(26,58,92,0.26)",
        "teal-sm":    "0 2px 8px -1px rgba(13,107,142,0.20)",
        "teal-md":    "0 4px 16px -2px rgba(13,107,142,0.26)",
        "card":       "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px -2px rgba(0,0,0,0.09), 0 2px 6px -2px rgba(0,0,0,0.05)",
        // 3D / glow shadows
        "neon-sky":    "0 0 16px rgba(96,184,224,0.35), 0 0 48px rgba(96,184,224,0.12)",
        "neon-green":  "0 0 16px rgba(34,197,94,0.40),  0 0 48px rgba(34,197,94,0.12)",
        "neon-amber":  "0 0 16px rgba(217,119,6,0.40),  0 0 48px rgba(217,119,6,0.12)",
        "neon-red":    "0 0 16px rgba(220,38,38,0.40),  0 0 48px rgba(220,38,38,0.12)",
        "glass-sm":    "0 2px 12px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-md":    "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass-lg":    "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)",
        "inner-glow":  "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)",
      },
      backdropBlur: {
        xs: "4px",
      },
      keyframes: {
        "node-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(26,58,92,0.4)" },
          "50%":       { boxShadow: "0 0 0 8px rgba(26,58,92,0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-6px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%":     { transform: "translateY(-10px)" },
        },
        "glow-pulse": {
          "0%,100%": { opacity: "0.6" },
          "50%":     { opacity: "1" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "card-3d-in": {
          from: { opacity: "0", transform: "perspective(800px) rotateX(-14deg) translateY(20px)" },
          to:   { opacity: "1", transform: "perspective(800px) rotateX(0deg)   translateY(0px)" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(1)",   opacity: "0.7" },
          "100%": { transform: "scale(2.8)", opacity: "0"   },
        },
        "data-flow": {
          from: { strokeDashoffset: "120" },
          to:   { strokeDashoffset: "-120" },
        },
        "scan-line": {
          "0%":   { top: "0%",   opacity: "0.6" },
          "100%": { top: "100%", opacity: "0"   },
        },
      },
      animation: {
        "node-pulse":  "node-pulse 1.2s ease-in-out infinite",
        "fade-up":     "fade-up 0.4s ease-out forwards",
        shimmer:       "shimmer 1.6s linear infinite",
        "slide-in":    "slide-in 0.25s ease-out forwards",
        float:         "float 3.5s ease-in-out infinite",
        "glow-pulse":  "glow-pulse 2s ease-in-out infinite",
        "spin-slow":   "spin-slow 18s linear infinite",
        "card-3d-in":  "card-3d-in 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-ring":  "pulse-ring 2s ease-out infinite",
        "data-flow":   "data-flow 1.8s linear infinite",
        "scan-line":   "scan-line 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
