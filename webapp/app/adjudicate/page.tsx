"use client";
import { useState, useEffect } from "react";
import { Zap, XCircle, Layers, MapPin, Calendar, Building2, DollarSign } from "lucide-react";
import Link from "next/link";
import { PipelineTracker }   from "@/components/ui/pipeline-tracker";
import { VerdictResultCard } from "@/components/ui/verdict-result-card";
import { PageHeader }        from "@/components/ui/page-header";
import { TiltCard }          from "@/components/ui/tilt-card";
import type { AdjudicationResult } from "@/types";

const INPUT_CLS = [
  "w-full rounded-xl px-3.5 py-2.5 text-sm",
  "bg-white/5 border border-white/12 text-white",
  "placeholder:text-white/25 focus:outline-none",
  "focus:ring-2 focus:ring-sky/30 focus:border-sky/50",
  "hover:border-white/20 transition-all",
  "backdrop-blur-sm",
].join(" ");

const SELECT_CLS = INPUT_CLS + " cursor-pointer";

const CAUSES = [
  "Cyclone / Hurricane", "Gale Force Wind", "Storm Surge",
  "Tornado", "Severe Weather Event", "High Wind Event",
];

const ASSET_TYPES = [
  "wind_farm", "solar_park", "hybrid", "transmission", "substation",
];

// Sample demo coordinates
const DEMO_COORDS = [
  { city: "Kutch (validates · Aug 2023)",  lat: "23.13", lon: "68.93" },
  { city: "Mumbai (validates · Aug 2023)", lat: "19.09", lon: "72.85" },
  { city: "Rajkot (validates · Aug 2023)", lat: "22.31", lon: "70.78" },
];

const FORM_SECTIONS = [
  { icon: Building2, label: "Parties & Asset"  },
  { icon: MapPin,    label: "Location"         },
  { icon: Calendar,  label: "Event Period"     },
  { icon: DollarSign,label: "Financials"       },
];

export default function AdjudicatePage() {
  useEffect(() => {
    document.title = "Adjudicate — DREADNOUGHT ASRE";
  }, []);

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<(AdjudicationResult & { claim_id?: string }) | null>(null);
  const [error,   setError]   = useState<string | null>(null);

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

  const fillDemo = (lat: string, lon: string) => {
    setForm((f) => ({ ...f, asset_lat: lat, asset_lon: lon }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);

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
      else         setResult(data);
    } catch (err: any) {
      setError(err.message || "Network error. Check API connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-8 pt-10 pb-6 border-b border-white/8">
        <PageHeader
          title="Submit Claim for Adjudication"
          description="ASRE 4-node pipeline: IntentRouter → SQLGenerator → ExecutionCage → Adjudicator"
        />
      </div>

      <div className="p-8 max-w-6xl">
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
                  {DEMO_COORDS.map(({ city, lat, lon }) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => fillDemo(lat, lon)}
                      className="text-[9px] font-semibold text-sky/60 hover:text-sky border border-sky/15 hover:border-sky/35 rounded-lg px-2 py-1 bg-sky/5 hover:bg-sky/10 transition-all"
                    >
                      {city}
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
              <VerdictResultCard result={result} />
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
                    { label: "Stations", value: "18" },
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
                  NOAA ISD 2014–2024 · 18 stations · Threshold 17.2 m/s (Beaufort 8)
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
