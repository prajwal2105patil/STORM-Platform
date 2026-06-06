"use client";
import { useEffect, useState } from "react";
import { Wind, MapPin, Clock, Zap, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton }   from "@/components/ui/skeleton";
import { cn }         from "@/lib/utils";

interface Threshold {
  wind_threshold_ms: number;
  max_range_km: number;
  exceedance_hours: number;
  idw_power: number;
}

interface Station {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

interface AuditEntry {
  id: string;
  claim_id?: string;
  event_type: "submitted" | "adjudicated" | "escalated" | "overridden";
  actor: string;
  payload: Record<string, any>;
  created_at: string;
}

interface PolicyData {
  thresholds: Threshold;
  stations: Station[];
  audit_log: AuditEntry[];
}

const EVENT_COLOR: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  adjudicated: "bg-green-100 text-green-700",
  escalated: "bg-amber-100 text-amber-700",
  overridden: "bg-red-100 text-red-700",
};

export default function PolicyPage() {
  const [data, setData] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch("/api/policy")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader title="Policy & Compliance" description="Adjudication thresholds & audit trail" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const auditPerPage = 20;
  const auditSlice = data.audit_log.slice(
    (auditPage - 1) * auditPerPage,
    auditPage * auditPerPage
  );
  const auditPages = Math.ceil(data.audit_log.length / auditPerPage);

  const TH_CLS = "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide";
  const TD_CLS = "px-4 py-3 text-sm";

  return (
    <div className="p-8 space-y-8">

      <PageHeader title="Policy & Compliance" description="Adjudication thresholds & audit trail" />

      {/*  Threshold cards  */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
          ASRE Deterministic Thresholds
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Wind,   label: "Wind Threshold",        value: data.thresholds.wind_threshold_ms, unit: "m/s",   sub: "Beaufort 8",      iconColor: "text-blue-600",  bg: "bg-blue-50"  },
            { icon: MapPin, label: "Search Radius",         value: data.thresholds.max_range_km,      unit: "km",    sub: "IDW interpolation", iconColor: "text-red-500",   bg: "bg-red-50"   },
            { icon: Clock,  label: "Exceedance Requirement",value: `≥ ${data.thresholds.exceedance_hours}`, unit: "h", sub: "Above threshold", iconColor: "text-green-600", bg: "bg-green-50" },
            { icon: Zap,    label: "IDW Power",             value: data.thresholds.idw_power,          unit: "",     sub: "Inverse distance",  iconColor: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ icon: Icon, label, value, unit, sub, iconColor, bg }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-2 tabular-nums">
                  {value}<span className="text-base font-semibold text-gray-500 ml-1">{unit}</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={cn("p-2 rounded-lg flex-shrink-0", bg)}>
                <Icon size={20} className={iconColor} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Thresholds are enforced <strong>deterministically</strong>. VALIDATED requires: peak wind ≥ 17.2 m/s <strong>AND</strong> exceedance ≥ 3 hours, using NOAA Rule 803(8) public records within 300 km of the asset. Zero human override.
            </p>
          </div>
        </div>
      </div>

      {/*  Station registry  */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
          Station Registry -- {data.stations.length} NOAA ISD Stations
        </p>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Station ID", "Name", "State", "Latitude", "Longitude", "Radius"].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.stations.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className={cn(TD_CLS, "font-mono text-xs text-gray-500")}>{s.id}</td>
                  <td className={cn(TD_CLS, "font-semibold text-gray-900")}>{s.name}</td>
                  <td className={cn(TD_CLS, "text-gray-600")}>{s.state}</td>
                  <td className={cn(TD_CLS, "text-gray-600 tabular-nums")}>{s.lat.toFixed(2)}°</td>
                  <td className={cn(TD_CLS, "text-gray-600 tabular-nums")}>{s.lon.toFixed(2)}°</td>
                  <td className={cn(TD_CLS, "text-gray-500")}>{data.thresholds.max_range_km} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/*  Audit log  */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
          Audit Log -- {data.audit_log.length} Events
        </p>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Timestamp", "Event Type", "Claim ID", "Actor", "Details"].map((h) => (
                  <th key={h} className={TH_CLS}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditSlice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No audit events yet.
                  </td>
                </tr>
              ) : (
                auditSlice.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className={cn(TD_CLS, "text-gray-500 text-xs whitespace-nowrap")}>
                      {new Date(entry.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className={TD_CLS}>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-semibold capitalize", EVENT_COLOR[entry.event_type])}>
                        {entry.event_type}
                      </span>
                    </td>
                    <td className={cn(TD_CLS, "font-mono text-xs text-gray-500")}>
                      {entry.claim_id ? entry.claim_id.slice(0, 8) + "…" : "--"}
                    </td>
                    <td className={cn(TD_CLS, "font-semibold text-gray-800")}>{entry.actor}</td>
                    <td className={cn(TD_CLS, "text-gray-500 text-xs max-w-[200px] truncate")}
                      title={entry.payload ? JSON.stringify(entry.payload) : ""}>
                      {entry.payload ? JSON.stringify(entry.payload).slice(0, 60) + "…" : "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {auditPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>Page {auditPage} of {auditPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                ← Prev
              </button>
              <button onClick={() => setAuditPage((p) => Math.min(auditPages, p + 1))} disabled={auditPage >= auditPages}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs text-gray-600">
          <strong>Policy enforced deterministically by ASRE v2 engine.</strong> No human override. All decisions are final and subject to attestation by a qualified legal operator.
        </p>
      </div>
    </div>
  );
}
