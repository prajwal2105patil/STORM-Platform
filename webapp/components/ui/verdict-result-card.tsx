"use client";
import { CheckCircle, XCircle, AlertTriangle, Clock, Download, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdjudicationResult } from "@/types";
import Link from "next/link";

const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string; icon: any; iconBg: string }> = {
  VALIDATED: {
    bg: "bg-green-50", border: "border-green-300", text: "text-green-800",
    icon: CheckCircle, iconBg: "bg-green-500",
  },
  REJECTED_BELOW_THRESHOLD: {
    bg: "bg-red-50", border: "border-red-300", text: "text-red-800",
    icon: XCircle, iconBg: "bg-red-500",
  },
  REJECTED_WRONG_MONTH: {
    bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800",
    icon: XCircle, iconBg: "bg-orange-500",
  },
  REJECTED_NON_WEATHER: {
    bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800",
    icon: XCircle, iconBg: "bg-purple-500",
  },
  REJECTED_MALFORMED_COORDS: {
    bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-800",
    icon: AlertTriangle, iconBg: "bg-pink-500",
  },
  REJECTED_MISSING_DATES: {
    bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800",
    icon: AlertTriangle, iconBg: "bg-amber-500",
  },
  INSUFFICIENT_DATA: {
    bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700",
    icon: AlertTriangle, iconBg: "bg-gray-500",
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
    <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md overflow-hidden animate-[fade-up_0.4s_ease-out] transition-shadow duration-200">
      {/* Verdict banner */}
      <div className={cn("px-6 py-5 border-b flex items-center justify-between gap-4", style.bg, style.border)}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", style.iconBg)}>
            <VIcon size={20} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">ASRE Verdict</p>
            <p className={cn("text-xl font-extrabold leading-tight", style.text)}>
              {VERDICT_LABELS[result.label] ?? result.label}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500 flex items-center gap-1 justify-end">
            <Clock size={11} /> {result.processing_ms}ms
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">NOAA Rule 803(8)</p>
        </div>
      </div>

      {/* Legal summary */}
      <div className="px-6 py-4 bg-blue-50/50 border-b border-blue-100">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5">Legal Summary</p>
        <p className="text-sm text-gray-700 leading-relaxed">{result.legal_summary}</p>
      </div>

      {/* Metric grid */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {[
            { label: "NEAREST STATION",   value: result.nearest_station    ?? "N/A" },
            { label: "DISTANCE",          value: result.nearest_station_km != null ? `${result.nearest_station_km.toFixed(1)} km` : "N/A" },
            { label: "PEAK WIND",         value: result.peak_wind_ms       != null ? `${result.peak_wind_ms.toFixed(1)} m/s`     : "N/A" },
            { label: "EXCEEDANCE HOURS",  value: result.exceedance_hours   != null ? `${result.exceedance_hours}h`               : "N/A" },
            { label: "IDW CONFIDENCE",    value: result.idw_confidence     != null ? `${(result.idw_confidence * 100).toFixed(1)}%` : "N/A" },
            { label: "NODE PATH",         value: result.node_path?.join(" → ") ?? "N/A" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-800 font-mono mt-0.5 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isValid && (
        <div className="px-6 pb-5 flex gap-3 border-t border-gray-100 pt-4">
          <button className="flex items-center gap-2 text-xs font-semibold text-[#1A3A5C] hover:text-[#0D6B8E] border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors">
            <Download size={13} /> Evidence Report
          </button>
          <Link href="/sla" className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-800 border border-green-200 rounded-lg px-3 py-2 hover:bg-green-50 transition-colors">
            <Calculator size={13} /> Calculate Settlement
          </Link>
        </div>
      )}

      {/* Claim ID */}
      {result.claim_id && (
        <p className="px-6 pb-4 text-[10px] text-gray-300 font-mono">
          Claim ID: {result.claim_id}
        </p>
      )}
    </div>
  );
}
