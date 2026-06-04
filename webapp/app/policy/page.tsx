"use client";
import { useEffect, useState } from "react";
import { Wind, MapPin, Clock, Zap } from "lucide-react";

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
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Policy & Compliance</h1>
        <p className="text-gray-500 mt-2">Loading...</p>
      </div>
    );
  }

  const auditPerPage = 20;
  const auditSlice = data.audit_log.slice(
    (auditPage - 1) * auditPerPage,
    auditPage * auditPerPage
  );
  const auditPages = Math.ceil(data.audit_log.length / auditPerPage);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Policy & Compliance
        </h1>
        <p className="text-gray-600 mt-1">Adjudication thresholds & audit trail</p>
      </div>

      {/* Thresholds section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          ASRE Deterministic Thresholds
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Wind Threshold</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.thresholds.wind_threshold_ms}
                </p>
                <p className="text-xs text-gray-500 mt-1">m/s (Beaufort 8)</p>
              </div>
              <Wind className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Search Radius</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.thresholds.max_range_km}
                </p>
                <p className="text-xs text-gray-500 mt-1">km (IDW)</p>
              </div>
              <MapPin className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Exceedance Requirement</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ≥ {data.thresholds.exceedance_hours}
                </p>
                <p className="text-xs text-gray-500 mt-1">hours above threshold</p>
              </div>
              <Clock className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">IDW Power</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.thresholds.idw_power}
                </p>
                <p className="text-xs text-gray-500 mt-1">inverse distance</p>
              </div>
              <Zap className="text-amber-600" size={32} />
            </div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            These thresholds are enforced deterministically. A claim is VALIDATED
            only if: peak wind ≥ 17.2 m/s AND exceedance hours ≥ 3, using NOAA
            Rule 803(8) public records within 300 km of the asset.
          </p>
        </div>
      </div>

      {/* Station Registry */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Station Registry ({data.stations.length} stations)
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Station ID
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Name
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  State
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Latitude
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Longitude
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Coverage Radius
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.stations.map((station) => (
                <tr key={station.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    {station.id}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {station.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{station.state}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {station.lat.toFixed(2)}°
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {station.lon.toFixed(2)}°
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {data.thresholds.max_range_km} km
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Audit Log (latest {Math.min(100, data.audit_log.length)} events)
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Claim / Reference
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Actor
                </th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditSlice.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No audit events yet.
                  </td>
                </tr>
              ) : (
                auditSlice.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                          EVENT_COLOR[entry.event_type]
                        }`}
                      >
                        {entry.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                      {entry.claim_id ? entry.claim_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-semibold">
                      {entry.actor}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {entry.payload ? JSON.stringify(entry.payload).slice(0, 50) + "..." : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {auditPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {auditPage} of {auditPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setAuditPage((p) => Math.min(auditPages, p + 1))}
                disabled={auditPage >= auditPages}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Policy enforced deterministically by ASRE v2 engine.</strong> No
          human override. All decisions are final and subject to attestation by
          a qualified legal operator.
        </p>
      </div>
    </div>
  );
}
