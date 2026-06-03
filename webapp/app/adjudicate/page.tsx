"use client";
import { useState } from "react";
import { Zap, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { clsx } from "clsx";
import { AdjudicationResult } from "@/types";

const LABEL_META: Record<string, { color: string; icon: any; text: string }> = {
  VALIDATED:                  { color: "text-green-700 bg-green-50 border-green-200",  icon: CheckCircle,    text: "Claim Validated" },
  REJECTED_BELOW_THRESHOLD:   { color: "text-red-700 bg-red-50 border-red-200",        icon: XCircle,        text: "Below Wind Threshold" },
  REJECTED_WRONG_MONTH:       { color: "text-orange-700 bg-orange-50 border-orange-200", icon: XCircle,      text: "No Data for Period" },
  REJECTED_NON_WEATHER:       { color: "text-purple-700 bg-purple-50 border-purple-200", icon: XCircle,      text: "Not a Weather Event" },
  REJECTED_MALFORMED_COORDS:  { color: "text-pink-700 bg-pink-50 border-pink-200",     icon: AlertTriangle,  text: "Invalid Coordinates" },
  REJECTED_MISSING_DATES:     { color: "text-amber-700 bg-amber-50 border-amber-200",  icon: AlertTriangle,  text: "Missing Dates" },
  INSUFFICIENT_DATA:          { color: "text-gray-700 bg-gray-50 border-gray-200",     icon: AlertTriangle,  text: "No Station in Range" },
};

const CAUSES = [
  "Cyclone / Hurricane", "Gale Force Wind", "Storm Surge",
  "Tornado", "Severe Weather Event", "High Wind Event",
];

export default function AdjudicatePage() {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<(AdjudicationResult & { claim_id?: string }) | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    petitioner:       "",
    respondent:       "",
    asset_name:       "",
    asset_type:       "wind_farm",
    asset_lat:        "",
    asset_lon:        "",
    asset_capacity_mw:"",
    start_date:       "",
    end_date:         "",
    claimed_cause:    "Cyclone / Hurricane",
    claimed_loss_inr: "",
  });

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      const res  = await fetch("/api/adjudicate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Adjudication failed"); }
      else         { setResult(data); }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? (LABEL_META[result.label] ?? LABEL_META["INSUFFICIENT_DATA"]) : null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Claim for Adjudication</h1>
        <p className="text-sm text-gray-500 mt-1">
          ASRE 4-node pipeline: validation → IDW spatial lookup → Supabase weather query → deterministic decision
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Claim Details</h2>

          {[
            { k: "petitioner",   label: "Petitioner (Company)",  type: "text",   req: true },
            { k: "respondent",   label: "Respondent",            type: "text",   req: false },
            { k: "asset_name",   label: "Asset / Project Name",  type: "text",   req: true },
          ].map(({ k, label, type, req }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}{req && " *"}</label>
              <input required={req} type={type} value={(form as any)[k]} onChange={set(k)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset Type</label>
            <select value={form.asset_type} onChange={set("asset_type")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]">
              {["wind_farm","solar_park","hybrid","transmission","substation"].map((t) => (
                <option key={t} value={t}>{t.replace("_"," ")}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Latitude *</label>
              <input required type="number" step="0.0001" placeholder="26.9090"
                value={form.asset_lat} onChange={set("asset_lat")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Longitude *</label>
              <input required type="number" step="0.0001" placeholder="70.9000"
                value={form.asset_lon} onChange={set("asset_lon")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
              <input required type="date" value={form.start_date} onChange={set("start_date")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date *</label>
              <input required type="date" value={form.end_date} onChange={set("end_date")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Claimed Cause *</label>
            <select value={form.claimed_cause} onChange={set("claimed_cause")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]">
              {CAUSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Claimed Loss (INR)</label>
            <input type="number" placeholder="5000000" value={form.claimed_loss_inr} onChange={set("claimed_loss_inr")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-[#1A3A5C] hover:bg-[#0D6B8E] disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
            {loading ? (
              <><span className="animate-spin">⚙</span> Processing...</>
            ) : (
              <><Zap size={15} /> Submit for Adjudication</>
            )}
          </button>
        </form>

        {/* Result panel */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
              <p className="font-semibold">Error</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {result && meta && (
            <div className={clsx("rounded-xl border p-6 space-y-4", meta.color)}>
              <div className="flex items-start gap-3">
                <meta.icon size={24} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-lg">{meta.text}</p>
                  <p className="text-xs font-mono mt-0.5 opacity-75">{result.label}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs opacity-60">Processed in</p>
                  <p className="font-bold text-lg">{result.processing_ms}ms</p>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4 text-sm space-y-2">
                <p className="font-semibold text-gray-800">Legal Summary</p>
                <p className="text-gray-700 leading-relaxed">{result.legal_summary}</p>
              </div>

              {result.nearest_station && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Nearest Station",   value: result.nearest_station },
                    { label: "Distance",           value: `${result.nearest_station_km} km` },
                    { label: "Peak Wind",          value: result.peak_wind_ms ? `${result.peak_wind_ms} m/s` : "—" },
                    { label: "Exceedance Hours",   value: result.exceedance_hours ?? "—" },
                    { label: "IDW Confidence",     value: result.idw_confidence ? `${(result.idw_confidence * 100).toFixed(1)}%` : "—" },
                    { label: "Node Path",          value: result.node_path?.join(" → ") || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/60 rounded-lg px-3 py-2">
                      <p className="text-xs opacity-60">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {result.claim_id && (
                <p className="text-xs opacity-50 font-mono">Claim ID: {result.claim_id}</p>
              )}
            </div>
          )}

          {!result && !error && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              <Zap size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Submit a claim to see the ASRE adjudication result</p>
              <p className="text-xs mt-2 opacity-60">Try: Lat 26.9090 / Lon 70.9000 (Jaisalmer area)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
