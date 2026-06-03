"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Search, Filter } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";

const LABEL_BADGE: Record<string, string> = {
  VALIDATED:                 "bg-green-100 text-green-700",
  REJECTED_BELOW_THRESHOLD:  "bg-red-100 text-red-700",
  REJECTED_WRONG_MONTH:      "bg-orange-100 text-orange-700",
  REJECTED_NON_WEATHER:      "bg-purple-100 text-purple-700",
  REJECTED_MALFORMED_COORDS: "bg-pink-100 text-pink-700",
  REJECTED_MISSING_DATES:    "bg-amber-100 text-amber-700",
  INSUFFICIENT_DATA:         "bg-gray-100 text-gray-600",
  PENDING:                   "bg-blue-100 text-blue-700",
};

export default function ClaimsPage() {
  const [claims,   setClaims]   = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Claims</h1>
          <p className="text-sm text-gray-500">{total} total claims in the system</p>
        </div>
        <Link href="/adjudicate"
          className="bg-[#1A3A5C] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors">
          + New Claim
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
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
              filter === f ? "bg-[#1A3A5C] text-white border-[#1A3A5C]" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Petitioner","Asset","Period","Station","Wind","Verdict","Processing","Submitted"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No claims found</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[140px]">{c.petitioner}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[140px]">{c.asset_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {c.start_date} → {c.end_date}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.station_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {c.peak_wind_ms ? `${c.peak_wind_ms}m/s` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium",
                      LABEL_BADGE[c.adjudication_label] || "bg-gray-100 text-gray-600")}>
                      {c.adjudication_label?.replace("REJECTED_", "REJ: ").replace("_", " ") || "PENDING"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.processing_ms ? `${c.processing_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(c.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
            <span>Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <button onClick={() => setPage((p) => p+1)} disabled={page >= Math.ceil(total/20)}
                className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
