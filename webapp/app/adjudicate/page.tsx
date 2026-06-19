"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Zap, XCircle, Layers, MapPin, Calendar, Building2, DollarSign } from "lucide-react";
import Link from "next/link";
import { PipelineTracker }   from "@/components/ui/pipeline-tracker";
import { VerdictResultCard } from "@/components/ui/verdict-result-card";
import { PageHeader }        from "@/components/ui/page-header";
import { TiltCard }          from "@/components/ui/tilt-card";
import { FloatingPaths } from "@/components/ui/background-paths";
import type { AdjudicationResult } from "@/types";

const EvidenceMap = dynamic(() => import("@/components/ui/evidence-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center" style={{ background: "rgba(14,38,64,0.4)" }}>
      <div className="flex gap-1.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-2 w-2 rounded-full bg-sky-400/60 animate-pulse" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  ),
});

const INPUT_CLS = [
  "w-full rounded-xl px-3.5 py-2.5 text-sm",
  "bg-white/5 border border-white/12 text-white",
  "placeholder:text-white/25 focus:outline-none",
  "focus:ring-2 focus:ring-sky/30 focus:border-sky/50",
  "hover:border-white/20 transition-all",
  "backdrop-blur-sm",
].join(" ");

const SELECT_CLS = INPUT_CLS + " cursor-pointer";

// Wind-driven perils ONLY — the engine adjudicates strictly on sustained
// surface wind from NOAA ISD (peak ≥ 17.2 m/s, ≥3h). Non-wind perils
// (storm surge, tornado touchdown) are NOT measured by hourly-mean wind and
// were removed so the form can't promise an evaluation the engine can't make.
const CAUSES = [
  "Cyclone / Hurricane", "Gale Force Wind", "High Wind Event",
];

const ASSET_TYPES = [
  "wind_farm", "solar_park", "hybrid", "transmission", "substation",
];

// Demo presets — each is a COMPLETE claim that genuinely VALIDATES against the
// QC'd NOAA data (real gale month: peak wind >= 17.2 m/s, exceedance >= 3h).
// Verified post-rebuild: Nanded 23.7 m/s/6h, Cochin 21.6/4h, Amini 24.7/5h.
const DEMO_COORDS = [
  { city: "Nanded — Oct 2021",      lat: "19.083", lon: "77.333", start: "2021-10-01", end: "2021-10-31" },
  { city: "Cochin — Aug 2021",      lat: "9.946",  lon: "76.272", start: "2021-08-01", end: "2021-08-31" },
  { city: "Lakshadweep — Oct 2019", lat: "11.117", lon: "72.733", start: "2019-10-01", end: "2019-10-31" },
];

const FORM_SECTIONS = [
  { icon: Building2, label: "Parties & Asset"  },
  { icon: MapPin,    label: "Location"         },
  { icon: Calendar,  label: "Event Period"     },
  { icon: DollarSign,label: "Financials"       },
];

function downloadReport(
  result: AdjudicationResult & { claim_id?: string },
  form: { petitioner: string; respondent: string; asset_name: string; asset_type: string; asset_lat: string; asset_lon: string; start_date: string; end_date: string; claimed_cause: string; claimed_loss_inr: string }
) {
  const w = window.open("", "_blank");
  if (!w) { alert("Enable pop-ups to download the report."); return; }
  const ts     = new Date().toLocaleString("en-IN");
  const status = result.label === "VALIDATED" ? "VALIDATED" : result.label.replace(/_/g, " ");
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>ASRE Report — ${result.claim_id ?? "N/A"}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;max-width:760px;margin:40px auto;color:#1e293b;font-size:14px}
  h1{font-size:22px;font-weight:800;color:#0f172a;margin-bottom:4px}
  .sub{color:#64748b;font-size:13px;margin-bottom:32px}
  .verdict{padding:16px 20px;border-radius:10px;margin-bottom:24px;font-weight:700;font-size:18px}
  .V{background:#dcfce7;color:#166534;border:1px solid #86efac}
  .R{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding:8px 12px}
  td{padding:10px 12px;border-bottom:1px solid #e2e8f0}
  .l{color:#64748b;width:40%}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8}
  @media print{body{margin:20px}}
</style></head>
<body>
<h1>ASRE Adjudication Report</h1>
<p class="sub">Claim ID: ${result.claim_id ?? "N/A"} &nbsp;·&nbsp; Generated: ${ts}</p>
<div class="verdict ${result.label === "VALIDATED" ? "V" : "R"}">Verdict: ${status}</div>
<table>
  <tr><th colspan="2">Claim Details</th></tr>
  <tr><td class="l">Petitioner</td><td>${form.petitioner}</td></tr>
  <tr><td class="l">Respondent</td><td>${form.respondent || "—"}</td></tr>
  <tr><td class="l">Asset</td><td>${form.asset_name}</td></tr>
  <tr><td class="l">Asset Type</td><td>${form.asset_type.replace(/_/g, " ")}</td></tr>
  <tr><td class="l">Coordinates</td><td>${form.asset_lat}°N, ${form.asset_lon}°E</td></tr>
  <tr><td class="l">Event Period</td><td>${result.start_date} – ${result.end_date}</td></tr>
  <tr><td class="l">Claimed Cause</td><td>${form.claimed_cause}</td></tr>
  ${form.claimed_loss_inr ? `<tr><td class="l">Claimed Loss</td><td>₹${Number(form.claimed_loss_inr).toLocaleString("en-IN")}</td></tr>` : ""}
</table>
<table>
  <tr><th colspan="2">ASRE Evidence</th></tr>
  <tr><td class="l">Nearest Station</td><td>${result.nearest_station ?? "—"}${result.nearest_station_km != null ? ` (${result.nearest_station_km.toFixed(1)} km)` : ""}</td></tr>
  <tr><td class="l">Peak Wind Speed</td><td>${result.peak_wind_ms != null ? result.peak_wind_ms + " m/s" : "—"}</td></tr>
  <tr><td class="l">Exceedance Hours</td><td>${result.exceedance_hours != null ? result.exceedance_hours + " h above 17.2 m/s" : "—"}</td></tr>
  <tr><td class="l">IDW Confidence</td><td>${result.idw_confidence != null ? (result.idw_confidence * 100).toFixed(1) + "%" : "—"}</td></tr>
  <tr><td class="l">Processing Time</td><td>${result.processing_ms} ms</td></tr>
  <tr><td class="l">Pipeline</td><td>${result.node_path?.join(" → ") ?? "—"}</td></tr>
</table>
<table>
  <tr><th>Legal Summary</th></tr>
  <tr><td style="line-height:1.6">${result.legal_summary}</td></tr>
</table>
<div class="footer">Generated by DREADNOUGHT ASRE &nbsp;·&nbsp; NOAA ISD &nbsp;·&nbsp; Rule 803(8) compliant<br>Decision-support only · Not legal advice.</div>
<script>window.print();</script>
</body></html>`);
  w.document.close();
}

export default function AdjudicatePage() {
  useEffect(() => {
    document.title = "Adjudicate — DREADNOUGHT ASRE";
  }, []);

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<(AdjudicationResult & { claim_id?: string }) | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  // Coordinates the verdict was actually computed on (captured at submit so
  // later form edits don't move the pin), plus the station registry for
  // resolving the nearest-station location on the evidence map.
  const [verdictGeo, setVerdictGeo] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [stationsById, setStationsById] = useState<Record<string, { lat: number; lon: number; name: string }>>({});

  useEffect(() => {
    fetch("/api/stations")
      .then((r) => r.json())
      .then((rows: { id: string; name: string; lat: number; lon: number }[]) => {
        const map: Record<string, { lat: number; lon: number; name: string }> = {};
        (Array.isArray(rows) ? rows : []).forEach((s) => {
          map[String(s.id)] = { lat: s.lat, lon: s.lon, name: s.name };
        });
        setStationsById(map);
      })
      .catch(() => setStationsById({}));
  }, []);

  const [form, setForm] = useState({
    petitioner:        "",
    respondent:        "",
    asset_name:        "",
    asset_type:        "wind_farm",
    asset_lat:         "",
    asset_lon:         "",
    asset_capacity_mw: "",
    start_date:        "",
    end_date:          "",
    claimed_cause:     "Cyclone / Hurricane",
    claimed_loss_inr:  "",
  });

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const fillDemo = (d: (typeof DEMO_COORDS)[number]) => {
    const place = d.city.split(" — ")[0];
    setForm((f) => ({
      ...f,
      petitioner:    f.petitioner || "Demo Petitioner Pvt Ltd",
      asset_name:    f.asset_name || `${place} Wind Farm`,
      asset_lat:     d.lat,
      asset_lon:     d.lon,
      start_date:    d.start,
      end_date:      d.end,
      claimed_cause: "Cyclone / Hurricane",
    }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null); setVerdictGeo(null);

    const payload = {
      ...form,
      asset_lat:         parseFloat(form.asset_lat),
      asset_lon:         parseFloat(form.asset_lon),
      asset_capacity_mw: form.asset_capacity_mw ? parseFloat(form.asset_capacity_mw) : undefined,
      claimed_loss_inr:  form.claimed_loss_inr  ? parseFloat(form.claimed_loss_inr)  : undefined,
    };

    try {
      const res  = await fetch("/api/adjudicate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Adjudication failed");
      else {
        setResult(data);
        if (Number.isFinite(payload.asset_lat) && Number.isFinite(payload.asset_lon)) {
          setVerdictGeo({ lat: payload.asset_lat, lon: payload.asset_lon, name: form.asset_name });
        }
      }
    } catch (err: any) {
      setError(err.message || "Network error. Check API connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
      {/* Page header */}
      <div className="relative z-[1] px-8 pt-10 pb-6 border-b border-white/8">
        <PageHeader
          title="Submit Claim for Adjudication"
          description="Submit your claim details. ASRE returns a legally admissible verdict in under 500ms."
        />
      </div>

      <div className="relative z-[1] p-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── CLAIM FORM ── */}
          <TiltCard intensity={3} glare={false} className="rounded-2xl">
            <form
              onSubmit={submit}
              className="glass-card-dark rounded-2xl p-6 space-y-5 shadow-glass-lg border border-white/10"
            >
              {/* Section labels */}
              <div className="flex flex-wrap gap-2 pb-4 border-b border-white/8">
                {FORM_SECTIONS.map(({ icon: Icon, label }) => (
                  <div key={label}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider"
                  >
                    <Icon size={9} /> {label}
                  </div>
                ))}
              </div>

              {/* Parties + asset */}
              <div className="space-y-3">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 flex items-center gap-1.5">
                  <Building2 size={9} /> Parties &amp; Asset
                </p>
                {[
                  { k: "petitioner", label: "Petitioner (Company)", req: true,  ph: "e.g. Adani Green Energy" },
                  { k: "respondent", label: "Respondent",           req: false, ph: "e.g. State DISCOM"       },
                  { k: "asset_name", label: "Asset / Project Name", req: true,  ph: "e.g. Mundra Wind Farm II" },
                ].map(({ k, label, req, ph }) => (
                  <div key={k}>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">
                      {label}{req && " *"}
                    </label>
                    <input
                      required={req}
                      type="text"
                      placeholder={ph}
                      value={(form as any)[k]}
                      onChange={set(k)}
                      className={INPUT_CLS}
                    />
                  </div>
                ))}

                {/* Asset type */}
                <div>
                  <label className="block text-[10px] font-semibold text-white/45 mb-1">Asset Type</label>
                  <select value={form.asset_type} onChange={set("asset_type")} className={SELECT_CLS}>
                    {ASSET_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-[#0e2640]">
                        {t.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 flex items-center gap-1.5 mb-2">
                  <MapPin size={9} /> Location Coordinates
                </p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">Latitude *</label>
                    <input required type="number" step="0.0001" placeholder="23.13"
                      value={form.asset_lat} onChange={set("asset_lat")} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">Longitude *</label>
                    <input required type="number" step="0.0001" placeholder="68.93"
                      value={form.asset_lon} onChange={set("asset_lon")} className={INPUT_CLS} />
                  </div>
                </div>

                {/* Quick-fill demo coords */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {DEMO_COORDS.map((d) => (
                    <button
                      key={d.city}
                      type="button"
                      onClick={() => fillDemo(d)}
                      className="text-[9px] font-semibold text-sky/60 hover:text-sky border border-sky/15 hover:border-sky/35 rounded-lg px-2 py-1 bg-sky/5 hover:bg-sky/10 transition-all"
                    >
                      {d.city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 flex items-center gap-1.5 mb-2">
                  <Calendar size={9} /> Event Period
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">Start Date *</label>
                    <input required type="date" value={form.start_date} onChange={set("start_date")} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">End Date *</label>
                    <input required type="date" value={form.end_date}   onChange={set("end_date")}   className={INPUT_CLS} />
                  </div>
                </div>
              </div>

              {/* Cause */}
              <div>
                <label className="block text-[10px] font-semibold text-white/45 mb-1">Claimed Cause *</label>
                <select value={form.claimed_cause} onChange={set("claimed_cause")} className={SELECT_CLS}>
                  {CAUSES.map((c) => (
                    <option key={c} value={c} className="bg-[#0e2640]">{c}</option>
                  ))}
                </select>
              </div>

              {/* Optional financials */}
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 flex items-center gap-1.5 mb-2">
                  <DollarSign size={9} /> Financials (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">Capacity (MW)</label>
                    <input type="number" placeholder="100"
                      value={form.asset_capacity_mw} onChange={set("asset_capacity_mw")} className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-white/45 mb-1">Claimed Loss (₹)</label>
                    <input type="number" placeholder="5000000"
                      value={form.claimed_loss_inr} onChange={set("claimed_loss_inr")} className={INPUT_CLS} />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary-3d w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Layers size={14} className="animate-spin" /> Processing ASRE Pipeline...</>
                ) : (
                  <><Zap size={14} /> Submit for Adjudication</>
                )}
              </button>

              {/* Legal disclaimer */}
              <p className="text-[9px] text-white/20 text-center leading-relaxed">
                Decision-support only · Not legal advice · NOAA ISD public record
              </p>
            </form>
          </TiltCard>

          {/* ── RESULT PANEL ── */}
          <div className="space-y-5">

            {/* Pipeline tracker */}
            {loading && (
              <div className="glass-card-dark rounded-2xl p-6 shadow-glass-lg border border-white/10">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 mb-5 flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky" />
                  </span>
                  ASRE Pipeline — Executing
                </p>
                <PipelineTracker active={loading} />
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div className="glass-card-dark rounded-2xl p-5 border border-red-500/25 shadow-neon-red">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/25">
                    <XCircle size={14} className="text-red-400" />
                  </div>
                  <p className="font-bold text-red-400">Adjudication Failed</p>
                </div>
                <p className="text-sm text-red-400/70">{error}</p>
                <p className="text-[10px] text-white/25 mt-3">
                  Verify coordinates, date range, and API connectivity then retry.
                </p>
              </div>
            )}

            {/* Verdict card */}
            {result && !loading && (
              <VerdictResultCard
                result={result}
                onDownloadReport={() => downloadReport(result, form)}
              />
            )}

            {/* Spatial evidence — entered coordinate, 300 km IDW area, nearest station */}
            {result && !loading && verdictGeo && (
              <div className="glass-card-dark rounded-2xl p-4 border border-white/8 shadow-glass-lg">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={13} className="text-sky" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky/70">
                    Spatial Evidence · Claimed Location
                  </p>
                </div>
                <div style={{ height: 320 }}>
                  <EvidenceMap
                    assetLat={verdictGeo.lat}
                    assetLon={verdictGeo.lon}
                    assetName={verdictGeo.name}
                    label={result.label}
                    distanceKm={result.nearest_station_km}
                    station={
                      (result.nearest_station_id ? stationsById[result.nearest_station_id] : undefined)
                      ?? (result.nearest_station
                            ? Object.values(stationsById).find((s) => s.name === result.nearest_station)
                            : undefined)
                      ?? null
                    }
                  />
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !error && !loading && (
              <div className="glass-card-dark rounded-2xl p-8 text-center border border-white/8 shadow-glass-md">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{
                    background:  "linear-gradient(135deg, rgba(13,107,142,0.25) 0%, rgba(96,184,224,0.1) 100%)",
                    border:      "1px solid rgba(96,184,224,0.2)",
                    boxShadow:   "0 0 20px rgba(96,184,224,0.15)",
                  }}
                >
                  <Zap size={28} className="text-sky/70" />
                </div>
                <p className="font-bold text-white/80 text-base">Ready for Adjudication</p>
                <p className="text-sm text-white/35 mt-2 leading-relaxed max-w-xs mx-auto">
                  Fill in the claim details and submit. ASRE will return a legally admissible verdict in under 500ms.
                </p>

                {/* IDW stats */}
                <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: "Stations", value: "409" },
                    { label: "Radius",   value: "300km" },
                    { label: "Latency",  value: "<500ms" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl p-3 border border-white/8 bg-white/3">
                      <p className="text-xl font-extrabold text-sky/80 tabular-nums">{value}</p>
                      <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-[9px] text-white/20 font-mono">
                  NOAA ISD 2015–2025 · 409 stations · Threshold 17.2 m/s (Beaufort 8)
                </p>
              </div>
            )}

            {/* Info panel — always visible */}
            <div className="glass-card-dark rounded-2xl p-5 border border-white/6">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-sky/50 mb-3">
                What ASRE Checks
              </p>
              <div className="space-y-2">
                {[
                  { label: "Wind threshold exceeded",   detail: "> 17.2 m/s for ≥ 3 hours" },
                  { label: "Station within range",      detail: "Nearest NOAA ISD within 300 km" },
                  { label: "IDW spatial weighting",     detail: "Power-2 inverse distance confidence" },
                  { label: "Legal provenance attached", detail: "NOAA Rule 803(8) public record" },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky/40 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white/65">{label}</p>
                      <p className="text-[10px] text-white/30">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
