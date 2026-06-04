"use client";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle, XCircle, Zap, AlertTriangle, ArrowRight, Shield, Clock, Database } from "lucide-react";
import Link from "next/link";

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
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-0">

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#1A3A5C] to-[#0D6B8E] text-white px-8 py-12">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            ASRE Engine Online — NOAA Rule 803(8) Certified
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight mb-3">
            Force Majeure Adjudication<br />
            <span className="text-[#60B8E0]">in under 500ms.</span>
          </h1>
          <p className="text-blue-200 text-lg mb-8 max-w-2xl">
            AI-powered storm-related event verification backed by 11 years of NOAA ISD data.
            Legally admissible. Deterministic. Zero human bias.
          </p>

          {/* CTAs */}
          <div className="flex gap-4 flex-wrap">
            <Link href="/adjudicate"
              className="flex items-center gap-2 bg-white text-[#1A3A5C] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              <Zap size={16} />
              Submit a Claim
              <ArrowRight size={14} />
            </Link>
            <Link href="/query"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Ask Weather Q&A
            </Link>
          </div>

          {/* Live metrics ticker */}
          <div className="flex gap-8 mt-10 pt-8 border-t border-white/10 flex-wrap">
            {[
              { label: "Claims Processed",      value: loading ? "—" : snap.total_claims },
              { label: "Avg Decision Time",      value: loading ? "—" : `${snap.avg_processing_ms}ms` },
              { label: "Hallucinations Blocked", value: loading ? "—" : snap.hallucination_prevented },
              { label: "Accuracy vs Baseline",   value: "+21.8%" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-3xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-blue-300 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">

        {/* ── TRUST SIGNALS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield,   title: "NOAA Rule 803(8)",    desc: "All evidence legally admissible in court as public records",  color: "text-blue-600",  bg: "bg-blue-50"  },
            { icon: Zap,      title: "4-Node Pipeline",     desc: "IntentRouter → SQLGenerator → ExecutionCage → Adjudicator",  color: "text-purple-600",bg: "bg-purple-50"},
            { icon: Database, title: "18 NOAA ISD Stations",desc: "Multi-station IDW interpolation across 300km search radius", color: "text-green-600", bg: "bg-green-50" },
          ].map(({ icon: Icon, title, desc, color, bg }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4 shadow-sm">
              <div className={`p-2 rounded-lg ${bg} flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── KPI ROW ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle}  label="Validated Claims"        value={snap.validated}
            sub={`${snap.approval_rate}% approval rate`}     color="bg-green-600" />
          <StatCard icon={XCircle}      label="Rejected Claims"         value={snap.rejected}
            sub="All classes combined"                        color="bg-red-600" />
          <StatCard icon={Clock}        label="Avg Latency"             value={`${snap.avg_processing_ms}ms`}
            sub="End-to-end adjudication"                    color="bg-[#1A3A5C]" />
          <StatCard icon={AlertTriangle} label="Hallucinations Blocked" value={snap.hallucination_prevented}
            sub="26.3% baseline rate prevented"              color="bg-amber-600" />
        </div>

        {/* ── CHARTS ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Claims — Last 30 Days</h2>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="space-y-2 w-full px-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
                  ))}
                </div>
              </div>
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

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Adjudication Label Distribution</h2>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="space-y-2 w-full px-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + i * 15}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.label_distribution || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={180} />
                  <Tooltip formatter={(v) => [v, "Claims"]} />
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

        {/* ── SYSTEM SPECS ──────────────────────────────────────────── */}
        <div className="bg-[#1A3A5C] rounded-xl p-6 text-white shadow-sm">
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
                <p className="text-blue-300 text-xs">{label}</p>
                <p className="font-semibold text-white text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/adjudicate", label: "Submit a Claim",     desc: "Run ASRE 4-node adjudication",      color: "bg-[#1A3A5C] text-white hover:bg-[#0D6B8E]" },
            { href: "/query",      label: "Weather Intelligence",desc: "Ask NOAA weather questions via LLM", color: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200" },
            { href: "/sla",        label: "SLA Calculator",     desc: "Estimate settlement for FM claims",  color: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200" },
          ].map(({ href, label, desc, color }) => (
            <Link key={href} href={href}
              className={`flex items-center justify-between p-5 rounded-xl transition-all shadow-sm ${color}`}>
              <div>
                <p className="font-semibold">{label}</p>
                <p className={`text-xs mt-1 ${color.includes("white") ? "text-gray-500" : "text-blue-200"}`}>{desc}</p>
              </div>
              <ArrowRight size={16} className="flex-shrink-0" />
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
