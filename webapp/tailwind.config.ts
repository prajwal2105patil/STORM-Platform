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
        navy:        "#1A3A5C",
        "navy-dark": "#0e2640",
        teal:        "#0D6B8E",
        "teal-light":"#1E88BE",
        steel:       "#2E75B6",
        sky:         "#60B8E0",
      },
      backgroundImage: {
        "navy-gradient":    "linear-gradient(135deg, #1A3A5C 0%, #0D6B8E 100%)",
        "teal-gradient":    "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)",
        "hero-gradient":    "linear-gradient(135deg, #0e2640 0%, #1A3A5C 50%, #0D6B8E 100%)",
        "sidebar-gradient": "linear-gradient(180deg, #0e2640 0%, #1A3A5C 45%, #0a1f35 100%)",
      },
      boxShadow: {
        "navy-sm": "0 2px 8px -1px rgba(26,58,92,0.20)",
        "navy-md": "0 4px 16px -2px rgba(26,58,92,0.26)",
        "teal-sm": "0 2px 8px -1px rgba(13,107,142,0.20)",
        "teal-md": "0 4px 16px -2px rgba(13,107,142,0.26)",
        "card":      "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover":"0 4px 16px -2px rgba(0,0,0,0.09), 0 2px 6px -2px rgba(0,0,0,0.05)",
      },
      keyframes: {
        "node-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(26,58,92,0.4)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(26,58,92,0)" },
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
      },
      animation: {
        "node-pulse": "node-pulse 1.2s ease-in-out infinite",
        "fade-up":    "fade-up 0.4s ease-out forwards",
        shimmer:      "shimmer 1.6s linear infinite",
        "slide-in":   "slide-in 0.25s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
