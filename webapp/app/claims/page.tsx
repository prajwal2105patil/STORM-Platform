"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Search, FileText, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

const LABEL_META: Record<string, { bg: string; text: string; dot: string; short: string }> = {
  VALIDATED:                 { bg: "bg-green-100",  text: "text-green-800",  dot: "bg-green-500",  short: "VALIDATED"         },
  REJECTED_BELOW_THRESHOLD:  { bg: "bg-red-100",    text: "text-red-800",    dot: "bg-red-500",    short: "Below Threshold"   },
  REJECTED_WRONG_MONTH:      { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", short: "No Data"           },
  REJECTED_NON_WEATHER:      { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", short: "Non-Weather"       },
  REJECTED_MALFORMED_COORDS: { bg: "bg-pink-100",   text: "text-pink-800",   dot: "bg-pink-500",   short: "Bad Coords"        },
  REJECTED_MISSING_DATES:    { bg: "bg-amber-100",  text: "text-amber-800",  dot: "bg-amber-500",  short: "Missing Dates"     },
  INSUFFICIENT_DATA:         { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400",   short: "No Station"        },
  PENDING:                   { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500",   short: "Pending"           },
};

export default function ClaimsPage() {
  const [claims,  setClaims]  = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  useEffect(() => { document.title = "Claims — DREADNOUGHT ASRE"; }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filter !== "all") params.set("status", filter);
    fetch(`/api/claims?${params}`)
      .then((r) => r.json())
      .then((d) => { setClaims(d.claims || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, filter]);

  const filtered = search
    ? claims.filter((c) =>
        c.petitioner?.toLowerCase().includes(search.toLowerCase()) ||
        c.asset_name?.toLowerCase().includes(search.toLowerCase())
      )
    : claims;

  const validated = claims.filter((c) => c.adjudication_label === "VALIDATED").length;
  const rejected  = claims.filter((c) => c.adjudication_label && c.adjudication_label !== "VALIDATED").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
          <p className="text-sm text-gray-500">{total} total claims in the system</p>
        </div>
        <Link href="/adjudicate"
          className="bg-[#1A3A5C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors flex items-center gap-2">
          <span>+</span> New Claim
        </Link>
      </div>

      {/* Summary Pills */}
      <div className="flex gap-3">
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
          <span className="text-sm font-semibold text-blue-800">{total - validated - rejected} Pending</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search petitioner or asset..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]"
          />
        </div>
        {["all","adjudicated","pending"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx("px-3 py-2 text-xs font-medium rounded-lg border transition-colors capitalize",
              filter === f
                ? "bg-[#1A3A5C] text-white border-[#1A3A5C]"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Petitioner","Asset","Period","Station","Wind","Verdict","Time","Report"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <FileText size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500 font-medium">No claims found</p>
                  <p className="text-gray-400 text-xs mt-1">Submit your first claim to get started</p>
                  <Link href="/adjudicate"
                    className="inline-block mt-4 bg-[#1A3A5C] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors">
                    Submit a Claim →
                  </Link>
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const meta = LABEL_META[c.adjudication_label] || LABEL_META["PENDING"];
                const isValidated = c.adjudication_label === "VALIDATED";
                return (
                  <tr key={c.id} className={clsx(
                    "hover:bg-gray-50 transition-colors",
                    isValidated && "border-l-4 border-l-green-500"
                  )}>
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[130px]">{c.petitioner}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[130px]">{c.asset_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {c.start_date} → {c.end_date}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{c.station_name || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.peak_wind_ms
                        ? <span className={clsx("font-semibold", c.peak_wind_ms >= 17.2 ? "text-green-700" : "text-red-600")}>
                            {c.peak_wind_ms}m/s
                          </span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        meta.bg, meta.text
                      )}>
                        <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", meta.dot)} />
                        {meta.short}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.processing_ms ? `${c.processing_ms}ms` : "—"}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/api/claims/${c.id}/report`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#1A3A5C] hover:text-[#0D6B8E] font-medium transition-colors"
                        title="View Evidence Report"
                      >
                        <ExternalLink size={12} />
                        Report
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
