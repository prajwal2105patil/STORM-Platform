"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { CheckCircle, XCircle, Clock, Users, TrendingUp, Zap, AlertTriangle } from "lucide-react";

interface Snapshot {
  total_claims: number; validated: number; rejected: number; pending: number;
  approval_rate: number; avg_processing_ms: number; total_customers: number;
  hallucination_prevented: number;
}

const LABEL_COLORS: Record<string, string> = {
  VALIDATED:                "#16a34a",
  REJECTED_BELOW_THRESHOLD: "#dc2626",
  REJECTED_WRONG_MONTH:     "#ea580c",
  REJECTED_NON_WEATHER:     "#7c3aed",
  REJECTED_MALFORMED_COORDS:"#db2777",
  REJECTED_MISSING_DATES:   "#92400e",
  INSUFFICIENT_DATA:        "#6b7280",
  PENDING:                  "#d97706",
};

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const snap: Snapshot = data?.snapshot ?? {
    total_claims: 0, validated: 0, rejected: 0, pending: 0,
    approval_rate: 0, avg_processing_ms: 0, total_customers: 0,
    hallucination_prevented: 0,
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time ASRE adjudication metrics — powered by Supabase + Groq
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Validated Claims"    value={snap.validated}
          sub={`${snap.approval_rate}% approval rate`}   color="bg-green-600" />
        <StatCard icon={XCircle}    label="Rejected Claims"      value={snap.rejected}
          sub="All classes combined"                      color="bg-red-600" />
        <StatCard icon={Zap}        label="Avg Latency"          value={`${snap.avg_processing_ms}ms`}
          sub="End-to-end adjudication"                  color="bg-[#1A3A5C]" />
        <StatCard icon={AlertTriangle} label="Hallucinations Blocked" value={snap.hallucination_prevented}
          sub="26.3% baseline rate prevented"            color="bg-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Claims — Last 30 Days</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.timeline || []}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="validated" stroke="#16a34a" strokeWidth={2} dot={false} name="Validated" />
                <Line type="monotone" dataKey="rejected"  stroke="#dc2626" strokeWidth={2} dot={false} name="Rejected" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Label distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Adjudication Label Distribution</h2>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.label_distribution || []} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={180} />
                <Tooltip formatter={(v, n) => [v, "Claims"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(data?.label_distribution || []).map((entry: any) => (
                    <Cell key={entry.label} fill={LABEL_COLORS[entry.label] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* System Specs */}
      <div className="bg-[#1A3A5C] rounded-xl p-6 text-white">
        <h2 className="text-base font-semibold mb-4">ASRE System Architecture</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Query Engine",  value: "Supabase PostgreSQL" },
            { label: "LLM Router",    value: "Groq llama-3.1-8b"  },
            { label: "IDW Stations",  value: "18 NOAA ISD"        },
            { label: "Wind Threshold",value: "17.2 m/s (B8)"      },
            { label: "Max Radius",    value: "300 km"             },
            { label: "Exceedance",    value: "≥ 3 hours"          },
            { label: "Frontend",      value: "Next.js on Vercel"  },
            { label: "Cloud Spend",   value: "$0 / month"         },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-200 text-xs">{label}</p>
              <p className="font-semibold text-white text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
