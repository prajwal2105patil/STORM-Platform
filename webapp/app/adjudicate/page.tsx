"use client";
import { useState, useEffect } from "react";
import { Zap, XCircle } from "lucide-react";
import Link from "next/link";
import { PipelineTracker }   from "@/components/ui/pipeline-tracker";
import { VerdictResultCard } from "@/components/ui/verdict-result-card";
import { PageHeader }        from "@/components/ui/page-header";
import type { AdjudicationResult } from "@/types";

const INPUT_CLS =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] transition-all hover:border-gray-300";

const CAUSES = [
  "Cyclone / Hurricane", "Gale Force Wind", "Storm Surge",
  "Tornado", "Severe Weather Event", "High Wind Event",
];

const ASSET_TYPES = [
  "wind_farm", "solar_park", "hybrid", "transmission", "substation",
];

export default function AdjudicatePage() {
  useEffect(() => { document.title = "Adjudicate -- DREADNOUGHT ASRE"; }, []);

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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
    <div className="p-8 space-y-6 max-w-5xl">

      <PageHeader
        title="Submit Claim for Adjudication"
        description="ASRE 4-node pipeline: IntentRouter → SQLGenerator → ExecutionCage → Adjudicator"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/*  CLAIM FORM  */}
        <form onSubmit={submit} className="bg-white border border-gray-200/80 rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200">

          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pb-1 border-b border-gray-100">
            Claim Details
          </p>

          {/* Parties */}
          {[
            { k: "petitioner", label: "Petitioner (Company)", req: true,  ph: "e.g. Adani Green Energy" },
            { k: "respondent", label: "Respondent",           req: false, ph: "e.g. State DISCOM" },
            { k: "asset_name", label: "Asset / Project Name", req: true,  ph: "e.g. Mundra Wind Farm Phase II" },
          ].map(({ k, label, req, ph }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset Type</label>
            <select value={form.asset_type} onChange={set("asset_type")} className={INPUT_CLS}>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Latitude *</label>
              <input required type="number" step="0.0001" placeholder="19.0900"
                value={form.asset_lat} onChange={set("asset_lat")} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Longitude *</label>
              <input required type="number" step="0.0001" placeholder="72.8500"
                value={form.asset_lon} onChange={set("asset_lon")} className={INPUT_CLS} />
            </div>
          </div>
          <p className="text-[10px] text-gray-400 -mt-2">
            Mumbai: 19.09, 72.85 -- Surat: 21.20, 72.84 -- Chennai: 13.09, 80.27
          </p>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input required type="date" value={form.start_date} onChange={set("start_date")} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input required type="date" value={form.end_date}   onChange={set("end_date")}   className={INPUT_CLS} />
            </div>
          </div>

          {/* Cause */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Claimed Cause *</label>
            <select value={form.claimed_cause} onChange={set("claimed_cause")} className={INPUT_CLS}>
              {CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Optional financials */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacity (MW)</label>
              <input type="number" placeholder="100" value={form.asset_capacity_mw} onChange={set("asset_capacity_mw")} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Claimed Loss (INR)</label>
              <input type="number" placeholder="5000000" value={form.claimed_loss_inr} onChange={set("claimed_loss_inr")} className={INPUT_CLS} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 mt-2"
          >
            {loading ? (
              <><span className="animate-spin">⚙</span> Processing ASRE Pipeline...</>
            ) : (
              <><Zap size={15} /> Submit for Adjudication</>
            )}
          </button>
        </form>

        {/*  RESULT PANEL  */}
        <div className="space-y-4">

          {/* Pipeline tracker */}
          {loading && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5">
                ASRE Pipeline -- Running
              </p>
              <PipelineTracker active={loading} />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-600" />
                <p className="font-semibold text-red-700">Adjudication Failed</p>
              </div>
              <p className="text-sm text-red-600">{error}</p>
              <p className="text-xs text-red-400 mt-3">
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
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#1A3A5C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={28} className="text-[#1A3A5C]" />
              </div>
              <p className="font-semibold text-gray-700">Ready for Adjudication</p>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-xs mx-auto">
                Fill in the claim details and submit. ASRE will return a legally admissible verdict in under 500ms.
              </p>

              {/* Sample coordinates */}
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-500">
                {[
                  { city: "Mumbai (validates)", lat: "19.09", lon: "72.85", period: "Aug 2023" },
                  { city: "Surat (validates)",  lat: "21.20", lon: "72.84", period: "Aug 2023" },
                ].map(({ city, lat, lon, period }) => (
                  <div key={city} className="bg-gray-50 rounded-lg p-3 text-left">
                    <p className="font-semibold text-gray-700 mb-1">{city}</p>
                    <p className="font-mono">Lat: {lat} / Lon: {lon}</p>
                    <p className="text-gray-400 mt-0.5">{period}</p>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[10px] text-gray-300 font-mono">
                NOAA ISD data range: 2014–2024 · 18 stations · Threshold: 17.2 m/s
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
