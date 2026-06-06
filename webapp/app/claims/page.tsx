"use client";
import React, { useEffect, useState } from "react";
import {
  CheckCircle, XCircle, Clock, Search,
  FileText, ExternalLink, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { VerdictBadge } from "@/components/ui/verdict-badge";
import { PageHeader }   from "@/components/ui/page-header";
import type { AdjudicationLabel } from "@/types";

function SkeletonTr() {
  return (
    <tr className="animate-pulse">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded" />
        </td>
      ))}
    </tr>
  );
}

export default function ClaimsPage() {
  const [claims,     setClaims]     = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { document.title = "Claims -- DREADNOUGHT ASRE"; }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filter !== "all") params.set("status", filter);
    fetch("/api/claims?" + params)
      .then((r) => r.json())
      .then((d) => { setClaims(d.claims || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, filter]);

  const filtered = search
    ? claims.filter(
        (c) =>
          c.petitioner?.toLowerCase().includes(search.toLowerCase()) ||
          c.asset_name?.toLowerCase().includes(search.toLowerCase())
      )
    : claims;

  const validated = claims.filter((c) => c.adjudication_label === "VALIDATED").length;
  const rejected  = claims.filter((c) => c.adjudication_label && c.adjudication_label !== "VALIDATED").length;
  const pending   = total - validated - rejected;

  const FILTERS = [
    { key: "all",         label: "All"          },
    { key: "adjudicated", label: "Adjudicated"  },
    { key: "pending",     label: "Pending"       },
  ];

  return (
    <div className="p-8 space-y-6">

      <PageHeader
        title="Claims"
        description={total + " total claims in the system"}
        actions={
          <Link href="/adjudicate"
            className="bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            + New Claim
          </Link>
        }
      />

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <CheckCircle size={14} className="text-green-600" />
          <span className="text-sm font-semibold text-green-800">{validated} Validated</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <XCircle size={14} className="text-red-600" />
          <span className="text-sm font-semibold text-red-800">{rejected} Rejected</span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <Clock size={14} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-800">{pending} Pending</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search petitioner or asset..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] transition-all hover:border-gray-300"
          />
        </div>
        {FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-2 text-xs font-semibold rounded-lg border transition-colors",
              filter === key
                ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-3 py-3" />
              {["Petitioner","Asset","Period","Wind","Verdict","Time","Report"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonTr key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <FileText size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No claims found</p>
                  <p className="text-gray-400 text-xs mt-1">Submit your first claim to get started</p>
                  <Link href="/adjudicate"
                    className="inline-block mt-4 bg-[#1A3A5C] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors">
                    Submit a Claim
                  </Link>
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const isValidated = c.adjudication_label === "VALIDATED";
                const isExpanded  = expandedId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className={cn(
                        "hover:bg-gray-50 transition-colors cursor-pointer select-none",
                        isValidated && "border-l-4 border-l-green-500",
                        isExpanded  && "bg-gray-50"
                      )}
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[120px]">{c.petitioner}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">{c.asset_name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {c.start_date} / {c.end_date}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {c.peak_wind_ms != null ? (
                          <span className={cn("font-semibold tabular-nums",
                            c.peak_wind_ms >= 17.2 ? "text-green-700" : "text-red-600")}>
                            {c.peak_wind_ms}m/s
                          </span>
                        ) : <span className="text-gray-400">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.adjudication_label
                          ? <VerdictBadge label={c.adjudication_label as AdjudicationLabel} />
                          : <VerdictBadge label="PENDING" />}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">
                        {c.processing_ms ? c.processing_ms + "ms" : "--"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <a href={"/api/claims/" + c.id + "/report"} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#1A3A5C] hover:text-[#0D6B8E] font-medium">
                          <ExternalLink size={12} /> Report
                        </a>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50/30">
                        <td colSpan={8} className="px-8 py-4 border-b border-blue-100">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            {[
                              { label: "Claim ID",      value: c.id },
                              { label: "Respondent",    value: c.respondent ?? "--" },
                              { label: "Asset Type",    value: c.asset_type ?? "--" },
                              { label: "Coordinates",   value: c.asset_lat != null
                                  ? (c.asset_lat + ", " + c.asset_lon) : "--" },
                              { label: "Claimed Cause", value: c.claimed_cause ?? "--" },
                              { label: "Claimed Loss",  value: c.claimed_loss_inr != null
                                  ? ("INR " + Number(c.claimed_loss_inr).toLocaleString("en-IN")) : "--" },
                              { label: "Station",       value: c.station_name ?? "--" },
                              { label: "Exceedance",    value: c.exceedance_hours != null
                                  ? (c.exceedance_hours + "h") : "--" },
                              { label: "Submitted",     value: c.submitted_at
                                  ? new Date(c.submitted_at).toLocaleDateString("en-IN") : "--" },
                              { label: "Adjudicated",   value: c.adjudicated_at
                                  ? new Date(c.adjudicated_at).toLocaleDateString("en-IN") : "--" },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                                <p className="font-medium text-gray-800 mt-0.5 font-mono truncate" title={value}>{value}</p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-medium">
                Prev
              </button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 font-medium">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
