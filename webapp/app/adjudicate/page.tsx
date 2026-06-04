"use client";
import { useState, useEffect } from "react";
import { Zap, CheckCircle, XCircle, AlertTriangle, FileText, Calculator, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { AdjudicationResult } from "@/types";

const LABEL_META: Record<string, { color: string; icon: any; text: string; bg: string }> = {
  VALIDATED:                  { color: "text-green-700",  bg: "bg-green-50 border-green-300",  icon: CheckCircle,   text: "Claim Validated"      },
  REJECTED_BELOW_THRESHOLD:   { color: "text-red-700",    bg: "bg-red-50 border-red-300",      icon: XCircle,       text: "Below Wind Threshold" },
  REJECTED_WRONG_MONTH:       { color: "text-orange-700", bg: "bg-orange-50 border-orange-300",icon: XCircle,       text: "No Data for Period"   },
  REJECTED_NON_WEATHER:       { color: "text-purple-700", bg: "bg-purple-50 border-purple-300",icon: XCircle,       text: "Not a Weather Event"  },
  REJECTED_MALFORMED_COORDS:  { color: "text-pink-700",   bg: "bg-pink-50 border-pink-300",    icon: AlertTriangle, text: "Invalid Coordinates"  },
  REJECTED_MISSING_DATES:     { color: "text-amber-700",  bg: "bg-amber-50 border-amber-300",  icon: AlertTriangle, text: "Missing Dates"        },
  INSUFFICIENT_DATA:          { color: "text-gray-700",   bg: "bg-gray-50 border-gray-300",    icon: AlertTriangle, text: "No Station in Range"  },
};

const PIPELINE_NODES = ["IntentRouter", "SQLGenerator", "ExecutionCage", "Adjudicator"];

const CAUSES = [
  "Cyclone / Hurricane", "Gale Force Wind", "Storm Surge",
  "Tornado", "Severe Weather Event", "High Wind Event",
];

export default function AdjudicatePage() {
  useEffect(() => { document.title = "Adjudicate — DREADNOUGHT ASRE"; }, []);
  const [loading,       setLoading]       = useState(false);
  const [activeNode,    setActiveNode]    = useState(-1);
  const [result,        setResult]        = useState<(AdjudicationResult & { claim_id?: string }) | null>(null);
  const [error,         setError]         = useState<string | null>(null);

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

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Animate pipeline nodes while loading
  useEffect(() => {
    if (!loading) { setActiveNode(-1); return; }
    let i = 0;
    const interval = setInterval(() => {
      setActiveNode(i % PIPELINE_NODES.length);
      i++;
    }, 600);
    return () => clearInterval(interval);
  }, [loading]);

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
      const res  = await fetch("/api/adjudicate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Adjudication failed");
      else         setResult(data);
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  const meta      = result ? (LABEL_META[result.label] ?? LABEL_META["INSUFFICIENT_DATA"]) : null;
  const isValid   = result?.label === "VALIDATED";

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
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Claim Details</h2>

          {[
            { k: "petitioner", label: "Petitioner (Company)", req: true },
            { k: "respondent", label: "Respondent",           req: false },
            { k: "asset_name", label: "Asset / Project Name", req: true },
          ].map(({ k, label, req }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}{req && " *"}</label>
              <input required={req} type="text" value={(form as any)[k]} onChange={set(k)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset Type</label>
            <select value={form.asset_type} onChange={set("asset_type")}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]">
              {["wind_farm","solar_park","hybrid","transmission","substation"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g," ")}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Latitude *</label>
              <input required type="number" step="0.0001" placeholder="19.0900"
                value={form.asset_lat} onChange={set("asset_lat")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Asset Longitude *</label>
              <input required type="number" step="0.0001" placeholder="72.8500"
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
            className="w-full bg-[#1A3A5C] hover:bg-[#0D6B8E] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
            {loading ? (
              <><span className="animate-spin inline-block">⚙</span> Processing ASRE Pipeline...</>
            ) : (
              <><Zap size={15} /> Submit for Adjudication</>
            )}
          </button>
        </form>

        {/* Result panel */}
        <div className="space-y-4">

          {/* Pipeline progress (shown while loading) */}
          {loading && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">ASRE Pipeline Running</p>
              <div className="space-y-3">
                {PIPELINE_NODES.map((node, i) => (
                  <div key={node} className="flex items-center gap-3">
                    <div className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                      i < activeNode  ? "bg-green-500" :
                      i === activeNode ? "bg-[#1A3A5C] animate-pulse" :
                      "bg-gray-200"
                    )}>
                      {i < activeNode
                        ? <CheckCircle size={14} className="text-white" />
                        : <span className="text-[10px] text-white font-bold">{i + 1}</span>
                      }
                    </div>
                    <span className={clsx(
                      "text-sm transition-all duration-300",
                      i < activeNode  ? "text-green-700 font-medium" :
                      i === activeNode ? "text-[#1A3A5C] font-bold" :
                      "text-gray-400"
                    )}>
                      {node}
                      {i === activeNode && <span className="ml-2 text-xs text-gray-400 animate-pulse">running...</span>}
                      {i < activeNode  && <span className="ml-2 text-xs text-green-500">✓ complete</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-600" />
                <p className="font-semibold text-red-700">Adjudication Failed</p>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <p className="text-xs text-red-400 mt-3">Check your coordinates and dates, then try again.</p>
            </div>
          )}

          {/* Result card */}
          {result && meta && !loading && (
            <div className={clsx("rounded-xl border-2 p-6 space-y-4 shadow-sm", meta.bg)}>
              {/* Verdict header */}
              <div className="flex items-start gap-3">
                <div className={clsx("p-2 rounded-full", isValid ? "bg-green-100" : "bg-red-100")}>
                  <meta.icon size={22} className={meta.color} />
                </div>
                <div className="flex-1">
                  <p className={clsx("font-bold text-xl", meta.color)}>{meta.text}</p>
                  <p className="text-xs font-mono opacity-60 mt-0.5">{result.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Processed in</p>
                  <p className={clsx("font-bold text-xl", meta.color)}>{result.processing_ms}ms</p>
                </div>
              </div>

              {/* Legal summary */}
              <div className="bg-white/70 rounded-lg p-4 text-sm space-y-1 border border-white/50">
                <p className="font-semibold text-gray-800 text-xs uppercase tracking-wide">Legal Summary</p>
                <p className="text-gray-700 leading-relaxed">{result.legal_summary}</p>
              </div>

              {/* Metrics grid */}
              {result.nearest_station && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Nearest Station",  value: result.nearest_station },
                    { label: "Distance",          value: `${result.nearest_station_km} km` },
                    { label: "Peak Wind",         value: result.peak_wind_ms ? `${result.peak_wind_ms} m/s` : "—" },
                    { label: "Exceedance Hours",  value: result.exceedance_hours ?? "—" },
                    { label: "IDW Confidence",    value: result.idw_confidence ? `${(result.idw_confidence * 100).toFixed(1)}%` : "—" },
                    { label: "Node Path",         value: result.node_path?.join(" → ") || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/60 rounded-lg px-3 py-2 border border-white/40">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{String(value)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {result.claim_id && (
                <div className="flex gap-3 pt-2">
                  <a href={`/api/claims/${result.claim_id}/report`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-white/80 hover:bg-white border border-white/60 text-gray-800 text-sm font-medium py-2.5 rounded-lg transition-colors">
                    <FileText size={14} />
                    Download Evidence Report
                  </a>
                  {isValid && (
                    <Link href="/sla"
                      className="flex-1 flex items-center justify-center gap-2 bg-[#1A3A5C] hover:bg-[#0D6B8E] text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                      <Calculator size={14} />
                      Calculate Settlement
                    </Link>
                  )}
                </div>
              )}

              {result.claim_id && (
                <p className="text-xs opacity-40 font-mono">Claim ID: {result.claim_id}</p>
              )}
            </div>
          )}

          {/* Empty state */}
          {!result && !error && !loading && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#1A3A5C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap size={28} className="text-[#1A3A5C]" />
              </div>
              <p className="text-gray-700 font-semibold">Ready for Adjudication</p>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Fill in the claim details and submit.<br />
                ASRE will return a legally admissible verdict in under 500ms.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold text-gray-700">Mumbai (will VALIDATE)</p>
                  <p>Lat: 19.09 / Lon: 72.85</p>
                  <p>Aug 2023</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-semibold text-gray-700">Surat (will VALIDATE)</p>
                  <p>Lat: 21.20 / Lon: 72.84</p>
                  <p>Aug 2023</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
