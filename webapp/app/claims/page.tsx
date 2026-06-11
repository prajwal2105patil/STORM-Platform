"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, XCircle, Clock, Search,
  FileText, ExternalLink, ChevronDown, ChevronRight,
  ListFilter, Columns,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { VerdictBadge }  from "@/components/ui/verdict-badge";
import { PageHeader }    from "@/components/ui/page-header";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import type { AdjudicationLabel } from "@/types";

// ── Column definitions ────────────────────────────────────────────────────────

type ColKey = "petitioner" | "asset_name" | "period" | "peak_wind_ms" | "adjudication_label" | "processing_ms" | "report";

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "petitioner",        label: "Petitioner" },
  { key: "asset_name",        label: "Asset"      },
  { key: "period",            label: "Period"     },
  { key: "peak_wind_ms",      label: "Wind"       },
  { key: "adjudication_label",label: "Verdict"    },
  { key: "processing_ms",     label: "Time"       },
  { key: "report",            label: "Report"     },
];

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-white/6">
          <td className="px-3 py-3 w-8" />
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-white/6 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Row variants ──────────────────────────────────────────────────────────────

const rowVariants = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.28, ease: "easeOut" as const },
  }),
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ClaimsPage() {
  const [claims,     setClaims]     = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(COLUMNS.map(c => c.key))
  );

  useEffect(() => { document.title = "Claims — DREADNOUGHT ASRE"; }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (filter !== "all") params.set("status", filter);
    fetch("/api/claims?" + params)
      .then(r => r.json())
      .then(d => { setClaims(d.claims || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, filter]);

  const filtered = useMemo(() =>
    search
      ? claims.filter(c =>
          c.petitioner?.toLowerCase().includes(search.toLowerCase()) ||
          c.asset_name?.toLowerCase().includes(search.toLowerCase())
        )
      : claims,
    [claims, search]
  );

  const validated = claims.filter(c => c.adjudication_label === "VALIDATED").length;
  const rejected  = claims.filter(c => c.adjudication_label && c.adjudication_label !== "VALIDATED").length;
  const pending   = total - validated - rejected;

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const STATUS_FILTERS = [
    { key: "all",         label: "All"         },
    { key: "adjudicated", label: "Adjudicated" },
    { key: "pending",     label: "Pending"     },
    { key: "validated",   label: "Validated"   },
  ];

  return (
    <div className="p-8 space-y-6">

      <PageHeader
        title="Claims"
        description={total + " total claims in the system"}
        actions={
          <Link href="/adjudicate" className="btn-primary-3d text-sm">
            + New Claim
          </Link>
        }
      />

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-lg px-4 py-2">
          <CheckCircle size={14} className="text-green-400" />
          <span className="text-sm font-semibold text-green-400">{validated} Validated</span>
        </div>
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2">
          <XCircle size={14} className="text-red-400" />
          <span className="text-sm font-semibold text-red-400">{rejected} Rejected</span>
        </div>
        <div className="flex items-center gap-2 bg-sky/8 border border-sky/20 rounded-lg px-4 py-2">
          <Clock size={14} className="text-sky" />
          <span className="text-sm font-semibold text-sky">{pending} Pending</span>
        </div>
      </div>

      {/* Search + dropdowns */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            placeholder="Search petitioner or asset..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-white/5 border border-white/12 text-white rounded-xl placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-sky/30 focus:border-sky/50 hover:border-white/20 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {/* Status filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-white/12 bg-white/5 text-white/60 hover:bg-white/8 hover:text-white transition-colors">
                <ListFilter size={13} />
                <span>Status{filter !== "all" ? `: ${STATUS_FILTERS.find(f => f.key === filter)?.label}` : ""}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_FILTERS.map(f => (
                <DropdownMenuCheckboxItem
                  key={f.key}
                  checked={filter === f.key}
                  onCheckedChange={() => { setFilter(f.key); setPage(1); }}
                >
                  {f.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Column toggle dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border border-white/12 bg-white/5 text-white/60 hover:bg-white/8 hover:text-white transition-colors">
                <Columns size={13} />
                <span>Columns</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLUMNS.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleCols.has(col.key)}
                  onCheckedChange={() => toggleCol(col.key)}
                  className="capitalize"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card-dark rounded-2xl overflow-hidden shadow-glass-lg">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* expand toggle col */}
              <TableHead className="w-8 px-3" />
              {COLUMNS.filter(c => visibleCols.has(c.key)).map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <SkeletonRows cols={visibleCols.size} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.size + 1} className="px-4 py-16 text-center">
                  <FileText size={36} className="mx-auto text-white/15 mb-3" />
                  <p className="text-white/50 font-medium">No claims found</p>
                  <p className="text-white/30 text-xs mt-1">Submit your first claim to get started</p>
                  <Link href="/adjudicate"
                    className="inline-block mt-4 bg-[#1A3A5C] text-white text-xs px-4 py-2 rounded-lg hover:bg-[#0D6B8E] transition-colors">
                    Submit a Claim
                  </Link>
                </td>
              </tr>
            ) : (
              filtered.map((c, index) => {
                const isValidated = c.adjudication_label === "VALIDATED";
                const isExpanded  = expandedId === c.id;

                return (
                  <React.Fragment key={c.id + "-" + index}>
                    {/* Main row */}
                    <motion.tr
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={rowVariants}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className={cn(
                        "border-b border-white/6 transition-colors cursor-pointer select-none",
                        "hover:bg-white/4",
                        isValidated && "border-l-2 border-l-green-500",
                        isExpanded  && "bg-white/4"
                      )}
                    >
                      {/* Expand chevron */}
                      <TableCell className="w-8 px-3 text-white/35">
                        {isExpanded
                          ? <ChevronDown size={13} />
                          : <ChevronRight size={13} />}
                      </TableCell>

                      {visibleCols.has("petitioner") && (
                        <TableCell className="font-medium text-white truncate max-w-[120px]">
                          {c.petitioner}
                        </TableCell>
                      )}
                      {visibleCols.has("asset_name") && (
                        <TableCell className="text-white/60 truncate max-w-[120px]">
                          {c.asset_name}
                        </TableCell>
                      )}
                      {visibleCols.has("period") && (
                        <TableCell className="text-white/45 text-xs whitespace-nowrap">
                          {c.start_date} / {c.end_date}
                        </TableCell>
                      )}
                      {visibleCols.has("peak_wind_ms") && (
                        <TableCell className="text-xs">
                          {c.peak_wind_ms != null ? (
                            <span className={cn(
                              "font-semibold tabular-nums",
                              c.peak_wind_ms >= 17.2 ? "text-green-400" : "text-red-400"
                            )}>
                              {c.peak_wind_ms}m/s
                            </span>
                          ) : <span className="text-white/25">—</span>}
                        </TableCell>
                      )}
                      {visibleCols.has("adjudication_label") && (
                        <TableCell>
                          <VerdictBadge label={(c.adjudication_label ?? "PENDING") as AdjudicationLabel} />
                        </TableCell>
                      )}
                      {visibleCols.has("processing_ms") && (
                        <TableCell className="text-white/30 text-xs tabular-nums">
                          {c.processing_ms ? c.processing_ms + "ms" : "—"}
                        </TableCell>
                      )}
                      {visibleCols.has("report") && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <a
                            href={"/api/claims/" + c.id + "/report"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky/70 hover:text-sky font-medium transition-colors"
                          >
                            <ExternalLink size={11} /> Report
                          </a>
                        </TableCell>
                      )}
                    </motion.tr>

                    {/* Expanded detail row */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          key="expanded"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="bg-sky/4 border-b border-sky/10"
                        >
                          <td colSpan={visibleCols.size + 1} className="px-8 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              {[
                                { label: "Claim ID",      value: c.id },
                                { label: "Respondent",    value: c.respondent    ?? "—" },
                                { label: "Asset Type",    value: c.asset_type    ?? "—" },
                                { label: "Coordinates",   value: c.asset_lat != null
                                    ? `${c.asset_lat}, ${c.asset_lon}` : "—" },
                                { label: "Claimed Cause", value: c.claimed_cause ?? "—" },
                                { label: "Claimed Loss",  value: c.claimed_loss_inr != null
                                    ? `INR ${Number(c.claimed_loss_inr).toLocaleString("en-IN")}` : "—" },
                                { label: "Station",       value: c.station_name  ?? "—" },
                                { label: "Exceedance",    value: c.exceedance_hours != null
                                    ? `${c.exceedance_hours}h` : "—" },
                                { label: "Submitted",     value: c.submitted_at
                                    ? new Date(c.submitted_at).toLocaleDateString("en-IN") : "—" },
                                { label: "Adjudicated",   value: c.adjudicated_at
                                    ? new Date(c.adjudicated_at).toLocaleDateString("en-IN") : "—" },
                              ].map(({ label, value }) => (
                                <div key={label}>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p>
                                  <p className="font-medium text-white/70 mt-0.5 font-mono truncate" title={value}>{value}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-white/35">
              Page {page} of {Math.ceil(total / 20)} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-white/12 bg-white/5 text-white/60 rounded-lg disabled:opacity-40 hover:bg-white/8 font-medium transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1.5 text-xs border border-white/12 bg-white/5 text-white/60 rounded-lg disabled:opacity-40 hover:bg-white/8 font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
