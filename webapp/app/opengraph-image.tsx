import { ImageResponse } from "next/og";

export const alt = "DREADNOUGHT ASRE — Force Majeure Adjudication Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #040810 0%, #0e2640 55%, #1A3A5C 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg,#0D6B8E,#1E88BE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>DREADNOUGHT ASRE</span>
        </div>

        <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.1, maxWidth: 900 }}>
          Force-majeure claims, adjudicated in 500ms.
        </div>

        <div style={{ fontSize: 30, color: "#9fc6e0", marginTop: 28, maxWidth: 920 }}>
          99.7% accuracy · 0% hallucination · NOAA Rule 803(8) public records
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {["Deterministic engine", "409 real NOAA stations", "$0 cloud spend"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 22,
                color: "#60B8E0",
                border: "1px solid rgba(96,184,224,0.4)",
                borderRadius: 999,
                padding: "8px 22px",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
