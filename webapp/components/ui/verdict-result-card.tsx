"use client";
import { CheckCircle, XCircle, AlertTriangle, Clock, Download, Calculator, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdjudicationResult } from "@/types";
import Link from "next/link";

const VERDICT_STYLES: Record<string, {
  bg: string; border: string; text: string;
  icon: any; iconBg: string; glow: string; accentBar: string;
}> = {
  VALIDATED: {
    bg: "bg-green-500/8", border: "border-green-500/30", text: "text-green-400",
    icon: CheckCircle, iconBg: "bg-green-500", glow: "rgba(34,197,94,0.2)", accentBar: "bg-green-500",
  },
  REJECTED_BELOW_THRESHOLD: {
    bg: "bg-red-500/8", border: "border-red-500/30", text: "text-red-400",
    icon: XCircle, iconBg: "bg-red-500", glow: "rgba(220,38,38,0.2)", accentBar: "bg-red-500",
  },
  REJECTED_WRONG_MONTH: {
    bg: "bg-orange-500/8", border: "border-orange-500/30", text: "text-orange-400",
    icon: XCircle, iconBg: "bg-orange-500", glow: "rgba(234,88,12,0.2)", accentBar: "bg-orange-500",
  },
  REJECTED_NON_WEATHER: {
    bg: "bg-purple-500/8", border: "border-purple-500/30", text: "text-purple-400",
    icon: XCircle, iconBg: "bg-purple-500", glow: "rgba(124,58,237,0.2)", accentBar: "bg-purple-500",
  },
  REJECTED_MALFORMED_COORDS: {
    bg: "bg-pink-500/8", border: "border-pink-500/30", text: "text-pink-400",
    icon: AlertTriangle, iconBg: "bg-pink-500", glow: "rgba(219,39,119,0.2)", accentBar: "bg-pink-500",
  },
  REJECTED_MISSING_DATES: {
    bg: "bg-amber-500/8", border: "border-amber-500/30", text: "text-amber-400",
    icon: AlertTriangle, iconBg: "bg-amber-500", glow: "rgba(217,119,6,0.2)", accentBar: "bg-amber-500",
  },
  INSUFFICIENT_DATA: {
    bg: "bg-white/4", border: "border-white/15", text: "text-white/60",
    icon: AlertTriangle, iconBg: "bg-gray-600", glow: "rgba(107,114,128,0.15)", accentBar: "bg-gray-600",
  },
};

const VERDICT_LABELS: Record<string, string> = {
  VALIDATED:                 "Claim Validated",
  REJECTED_BELOW_THRESHOLD:  "Below Wind Threshold",
  REJECTED_WRONG_MONTH:      "No Data for Period",
  REJECTED_NON_WEATHER:      "Not a Weather Event",
  REJECTED_MALFORMED_COORDS: "Invalid Coordinates",
  REJECTED_MISSING_DATES:    "Missing Date Range",
  INSUFFICIENT_DATA:         "No Station in Range",
};

interface VerdictResultCardProps {
  result: AdjudicationResult & { claim_id?: string };
}

export function VerdictResultCard({ result }: VerdictResultCardProps) {
  const style   = VERDICT_STYLES[result.label] ?? VERDICT_STYLES["INSUFFICIENT_DATA"];
  const VIcon   = style.icon;
  const isValid = result.label === "VALIDATED";

  return (
    <div
      className={cn(
        "verdict-3d-enter glass-card-dark rounded-2xl overflow-hidden border shadow-glass-lg",
        style.border,
      )}
      style={{ boxShadow: `0 0 40px ${style.glow}, 0 8px 32px rgba(0,0,0,0.45)` }}
    >
      {/* Accent top bar */}
      <div className={cn("h-1 w-full", style.accentBar)} />

      {/* Verdict banner */}
      <div className={cn("px-6 py-5 border-b flex items-center justify-between gap-4", style.bg, "border-white/8")}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-xl shadow-glass-sm", style.iconBg)}>
            <VIcon size={20} className="text-white" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">ASRE Verdict</p>
            <p className={cn("text-2xl font-extrabold leading-tight mt-0.5", style.text)}>
              {VERDICT_LABELS[result.label] ?? result.label}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-white/35 flex items-center gap-1 justify-end">
            <Clock size={10} /> {result.processing_ms}ms
          </p>
          <p className="text-[9px] text-white/25 mt-0.5">NOAA Rule 803(8)</p>
        </div>
      </div>

      {/* Legal summary */}
      <div className="px-6 py-4 border-b border-white/6 bg-sky/5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-sky/60 mb-1.5">Legal Summary</p>
        <p className="text-sm text-white/70 leading-relaxed">{result.legal_summary}</p>
      </div>

      {/* Metric grid */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {[
            { label: "NEAREST STATION",  value: result.nearest_station    ?? "N/A" },
            { label: "DISTANCE",         value: result.nearest_station_km != null ? `${result.nearest_station_km.toFixed(1)} km` : "N/A" },
            { label: "PEAK WIND",        value: result.peak_wind_ms       != null ? `${result.peak_wind_ms.toFixed(1)} m/s`     : "N/A" },
            { label: "EXCEEDANCE HOURS", value: result.exceedance_hours   != null ? `${result.exceedance_hours}h`               : "N/A" },
            { label: "IDW CONFIDENCE",   value: result.idw_confidence     != null ? `${(result.idw_confidence * 100).toFixed(1)}%` : "N/A" },
            { label: "NODE PATH",        value: result.node_path?.join(" → ") ?? "N/A" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</p>
              <p className="text-sm font-semibold text-white/80 font-mono mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isValid && (
        <div className="px-6 pb-5 flex gap-3 border-t border-white/8 pt-4">
          <button className="flex items-center gap-2 text-xs font-semibold text-sky/80 hover:text-sky border border-sky/20 hover:border-sky/40 rounded-lg px-3 py-2 bg-sky/5 hover:bg-sky/10 transition-all">
            <Download size={12} /> Evidence Report
          </button>
          <Link href="/sla" className="flex items-center gap-2 text-xs font-semibold text-green-400/80 hover:text-green-400 border border-green-500/20 hover:border-green-500/40 rounded-lg px-3 py-2 bg-green-500/5 hover:bg-green-500/10 transition-all">
            <Calculator size={12} /> Calculate Settlement
          </Link>
        </div>
      )}

      {/* NOAA badge */}
      <div className="px-6 pb-5 flex items-center gap-2">
        <Shield size={10} className="text-white/25" />
        <p className="text-[9px] text-white/25 font-mono">
          {result.claim_id ? `Claim: ${result.claim_id} · ` : ""}NOAA ISD · Indian Evidence Act s74/s78 · IT Act s65B
        </p>
      </div>
    </div>
  );
}
