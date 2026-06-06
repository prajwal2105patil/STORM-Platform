"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle, XCircle, Zap, AlertTriangle,
  ArrowRight, Shield, Clock, Database,
} from "lucide-react";
import Link from "next/link";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StatCard }         from "@/components/ui/stat-card";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";
import { LiveBadge }        from "@/components/ui/live-badge";

interface Snapshot {
  total_claims: number; validated: number; rejected: number; pending: number;
  approval_rate: number; avg_processing_ms: number; total_customers: number;
  hallucination_prevented: number;
}

const LABEL_COLORS: Record<string, string> = {
  VALIDATED:                 "#16a34a",
  REJECTED_BELOW_THRESHOLD:  "#dc2626",
  REJECTED_WRONG_MONTH:      "#ea580c",
  REJECTED_NON_WEATHER:      "#7c3aed",
  REJECTED_MALFORMED_COORDS: "#db2777",
  REJECTED_MISSING_DATES:    "#92400e",
  INSUFFICIENT_DATA:         "#6b7280",
  PENDING:                   "#d97706",
};

const TRUST_SIGNALS = [
  {
    icon: Shield,   title: "NOAA Rule 803(8)",
    desc: "All evidence legally admissible in court as public records",
    color: "text-blue-600",  bg: "bg-blue-50",  accent: "bg-blue-400",
  },
  {
    icon: Zap,      title: "4-Node LangGraph Pipeline",
    desc: "IntentRouter → SQLGenerator → ExecutionCage → Adjudicator",
    color: "text-purple-600", bg: "bg-purple-50", accent: "bg-purple-400",
  },
  {
    icon: Database, title: "18 NOAA ISD Stations",
    desc: "Multi-station IDW interpolation across 300 km search radius",
    color: "text-green-600",  bg: "bg-green-50",  accent: "bg-green-400",
  },
];

const SYSTEM_SPECS = [
  { label: "Query Engine",   value: "Supabase PostgreSQL" },
  { label: "LLM Router",     value: "Groq llama-3.1-8b"  },
  { label: "IDW Stations",   value: "18 NOAA ISD"        },
  { label: "Wind Threshold", value: "17.2 m/s (B8)"      },
  { label: "Max Radius",     value: "300 km"             },
  { label: "Exceedance",     value: "≥ 3 hours"          },
  { label: "Frontend",       value: "Next.js on Vercel"  },
  { label: "Cloud Spend",    value: "$0 / month dev"      },
];

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

      {/* HERO */}
      <div className="relative bg-gradient-to-br from-[#0e2640] via-[#1A3A5C] to-[#0D6B8E] text-white px-8 py-14 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 hero-mesh pointer-events-none opacity-60" />
        <div className="absolute -top-28 -right-28 w-96 h-96 bg-[#0D6B8E]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-56 h-56 bg-[#60B8E0]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl">

          {/* Engine status badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold mb-6 tracking-wide backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            ASRE Engine Online — NOAA Rule 803(8) Certified
          </div>

          <h1 className="text-4xl font-extrabold leading-tight mb-3">
            Force Majeure Adjudication<br />
            <span className="text-[#60B8E0]">in under 500ms.</span>
          </h1>
          <p className="text-blue-200/80 text-lg mb-8 max-w-2xl leading-relaxed">
            AI-powered storm-event verification backed by 11 years of NOAA ISD data.
            Legally admissible. Deterministic. Zero human bias.
          </p>

          {/* Primary CTAs */}
          <div className="flex gap-4 flex-wrap">
            <Link href="/adjudicate"
              className="flex items-center gap-2 bg-white text-[#1A3A5C] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200">
              <Zap size={16} /> Submit a Claim <ArrowRight size={14} />
            </Link>
            <Link href="/query"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-semibold px-6 py-3 rounded-xl transition-all backdrop-blur-sm hover:-translate-y-0.5 duration-200">
              Ask Weather Q&A
            </Link>
          </div>

          {/* Live animated metrics ticker */}
          <div className="flex mt-10 pt-8 border-t border-white/10 flex-wrap gap-y-6">
            <div className="pr-8 mr-8 border-r border-white/10">
              <p className="text-3xl font-extrabold text-white tabular-nums">
                {loading ? "—" : <AnimatedCounter value={snap.total_claims} />}
              </p>
              <p className="text-xs text-blue-300/70 mt-1 uppercase tracking-wide">Claims Processed</p>
            </div>
            <div className="pr-8 mr-8 border-r border-white/10">
              <p className="text-3xl font-extrabold text-white tabular-nums">
                {loading ? "—" : <AnimatedCounter value={snap.avg_processing_ms} suffix="ms" />}
              </p>
              <p className="text-xs text-blue-300/70 mt-1 uppercase tracking-wide">Avg Decision Time</p>
            </div>
            <div className="pr-8 mr-8 border-r border-white/10">
              <p className="text-3xl font-extrabold text-white tabular-nums">
                {loading ? "—" : <AnimatedCounter value={snap.hallucination_prevented} />}
              </p>
              <p className="text-xs text-blue-300/70 mt-1 uppercase tracking-wide">Hallucinations Blocked</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">+21.8%</p>
              <p className="text-xs text-blue-300/70 mt-1 uppercase tracking-wide">Accuracy vs Baseline</p>
            </div>
          </div>

        </div>
      </div>

      <div className="p-8 space-y-8">

        {/* TRUST SIGNALS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TRUST_SIGNALS.map(({ icon: Icon, title, desc, color, bg, accent }) => (
            <div key={title} className="relative bg-white rounded-xl border border-gray-200/80 p-5 flex gap-4 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
              <div className={`p-2 rounded-lg ${bg} flex-shrink-0 mt-0.5`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* KPI ROW */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard icon={CheckCircle}   label="Validated Claims"        value={snap.validated}
                sub={`${snap.approval_rate}% approval rate`}   iconBg="bg-green-600" />
              <StatCard icon={XCircle}       label="Rejected Claims"         value={snap.rejected}
                sub="All classes combined"                      iconBg="bg-red-600" />
              <StatCard icon={Clock}         label="Avg Latency"             value={`${snap.avg_processing_ms}ms`}
                sub="End-to-end adjudication"                   iconBg="bg-[#1A3A5C]" />
              <StatCard icon={AlertTriangle} label="Hallucinations Blocked"  value={snap.hallucination_prevented}
                sub="26.3% baseline rate prevented"             iconBg="bg-amber-600" />
            </>
          )}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Claims — Last 30 Days</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Validated
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Rejected
                </span>
              </div>
            </div>
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.timeline || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Line type="monotone" dataKey="validated" stroke="#16a34a" strokeWidth={2} dot={false} name="Validated" />
                  <Line type="monotone" dataKey="rejected"  stroke="#dc2626" strokeWidth={2} dot={false} name="Rejected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Label distribution */}
          <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Adjudication Label Distribution</h2>
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.label_distribution || []} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#6b7280" }} width={160} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [v, "Claims"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(data?.label_distribution || []).map((entry: any) => (
                      <Cell key={entry.label} fill={LABEL_COLORS[entry.label] ?? "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SYSTEM ARCHITECTURE */}
        <div className="relative bg-gradient-to-br from-[#0e2640] to-[#1A3A5C] rounded-xl p-6 text-white shadow-navy-md overflow-hidden">
          <div className="absolute inset-0 hero-mesh opacity-30 pointer-events-none" />
          <div className="relative flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">ASRE System Architecture</h2>
            <span className="text-[10px] text-sky/60 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/10">v2.0.0</span>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
            {SYSTEM_SPECS.map(({ label, value }) => (
              <div key={label} className="bg-white/8 hover:bg-white/12 transition-colors rounded-lg p-3 border border-white/8">
                <p className="text-sky/60 text-[10px] uppercase tracking-wider font-medium">{label}</p>
                <p className="font-semibold text-white text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: "/adjudicate", label: "Submit a Claim",
              desc: "Run ASRE 4-node adjudication pipeline",
              primary: true,
            },
            {
              href: "/query",      label: "Weather Intelligence",
              desc: "Ask NOAA weather questions via LLM",
              primary: false,
            },
            {
              href: "/sla",        label: "SLA Calculator",
              desc: "Estimate settlement for FM claims",
              primary: false,
            },
          ].map(({ href, label, desc, primary }) => (
            <Link key={href} href={href}
              className={`group flex items-center justify-between p-5 rounded-xl transition-all duration-200 shadow-sm border hover:-translate-y-0.5 ${
                primary
                  ? "bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white border-transparent shadow-navy-md hover:shadow-navy-md"
                  : "bg-white hover:bg-gray-50 text-gray-900 border-gray-200/80 hover:border-gray-300 hover:shadow"
              }`}>
              <div>
                <p className="font-semibold">{label}</p>
                <p className={`text-xs mt-1 ${primary ? "text-blue-200/80" : "text-gray-500"}`}>{desc}</p>
              </div>
              <ArrowRight size={16} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>

      </div>

      <LiveBadge />
    </div>
  );
}
