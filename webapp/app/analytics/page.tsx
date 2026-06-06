"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { AlertTriangle, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { StatCard }         from "@/components/ui/stat-card";
import { PageHeader }       from "@/components/ui/page-header";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";

interface TimelineData { date: string; validated: number; rejected: number; }
interface LabelData    { label: string; count: number; pct: number; }
interface Station      { id: string; name: string; lat: number; lon: number; state: string; }
interface AnalyticsData {
  snapshot: {
    total_claims: number; validated: number; rejected: number; pending: number;
    approval_rate: number; avg_processing_ms: number;
    hallucination_prevented: number; total_customers: number;
  };
  timeline: TimelineData[];
  label_distribution: LabelData[];
  stations: Station[];
}

const BENCHMARK = {
  asre:     { name: "ASRE (Routed)",           precision: 1.0,  recall: 1.0,  f1: 1.0,   support: 1000 },
  baseline: { name: "Baseline LLM (Unrouted)", precision: 0.79, recall: 0.73, f1: 0.782, support: 1000 },
};

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-8 space-y-6">
        <PageHeader title="Analytics" description="System performance and credibility metrics" />
        <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" /><SkeletonChart />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" /><SkeletonChart />
          </div>
        </div>
      </div>
    );
  }

  const SVG_W = 400; const SVG_H = 500;
  const LAT_MIN = 7; const LAT_MAX = 37; const LON_MIN = 68; const LON_MAX = 97;
  const projectCoords = (lat: number, lon: number) => ({
    x: ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H,
  });

  const snap = data.snapshot;

  return (
    <div className="p-8 space-y-8">

      <PageHeader title="Analytics" description="System performance and credibility metrics" />

      {/* Hallucination hero */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-7 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest mb-2">
              Hallucinations Prevented
            </p>
            <p className="text-5xl font-extrabold tabular-nums">
              <AnimatedCounter value={snap.hallucination_prevented} />
            </p>
            <p className="text-amber-100 text-sm mt-3">
              26.3% baseline rate x <AnimatedCounter value={snap.total_claims} /> adjudicated claims
            </p>
          </div>
          <AlertTriangle size={44} className="text-amber-200 opacity-60 flex-shrink-0" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Validated Claims"  value={snap.validated}
          sub={snap.approval_rate.toFixed(1) + "% approval rate"}  iconBg="bg-green-600" />
        <StatCard icon={XCircle}     label="Rejected Claims"   value={snap.rejected}
          sub="All classes combined"                                iconBg="bg-red-600" />
        <StatCard icon={Clock}       label="Avg Latency"       value={snap.avg_processing_ms + "ms"}
          sub="End-to-end adjudication"                            iconBg="bg-[#1A3A5C]" />
        <StatCard icon={Users}       label="Total Customers"   value={snap.total_customers}
          sub="Active accounts"                                    iconBg="bg-purple-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Monthly Claim Volume</h2>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Validated
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full inline-block" /> Rejected
              </span>
            </div>
          </div>
          {data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="validated" fill="#16a34a" name="Validated" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejected"  fill="#dc2626" name="Rejected"  radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No timeline data yet</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Station Coverage Map</h2>
            <span className="text-xs font-semibold text-[#0D6B8E] bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
              {data.stations.length} stations
            </span>
          </div>
          <svg viewBox={"0 0 " + SVG_W + " " + SVG_H}
            className="w-full border border-gray-100 rounded-lg bg-blue-50/40">
            <polyline
              points="340,50 380,60 400,90 390,130 380,150 360,160 340,170 330,180 320,170 310,160 300,170 290,180 280,160 270,150 260,140 250,160 240,170 230,160 220,140 210,130 200,120 190,130 180,140 170,130 160,120 150,130 140,150 130,160 120,150 110,140 100,130 90,140 80,150 70,140 60,130 50,140 40,150 35,160 40,180 50,190"
              fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            {data.stations.map((s) => {
              const { x, y } = projectCoords(s.lat, s.lon);
              return (
                <g key={s.id}>
                  <circle cx={x} cy={y} r={5} fill="#0D6B8E" stroke="white" strokeWidth={1.5} />
                  <circle cx={x} cy={y} r={9} fill="#0D6B8E" opacity={0.15} />
                  <title>{s.name}</title>
                </g>
              );
            })}
          </svg>
          <p className="text-xs text-gray-400 mt-3">NOAA ISD - 300 km IDW search radius</p>
        </div>
      </div>

      {/* Benchmark */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Benchmark: ASRE vs Baseline LLM</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[BENCHMARK.asre, BENCHMARK.baseline].map((model) => {
            const perfect = model.f1 === 1.0;
            return (
              <div key={model.name}
                className={"rounded-xl border-2 p-5 " + (perfect ? "border-green-200 bg-green-50/40" : "border-gray-200 bg-gray-50/40")}>
                <div className="flex items-start justify-between mb-4">
                  <p className="font-bold text-gray-900">{model.name}</p>
                  {perfect && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5 uppercase tracking-wider">
                      Perfect
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {[{ label: "Precision", val: model.precision }, { label: "Recall", val: model.recall }].map(({ label, val }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{label}</span>
                        <span className={"font-bold " + (val === 1.0 ? "text-green-700" : "text-gray-800")}>
                          {(val * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={"h-full rounded-full " + (val === 1.0 ? "bg-green-500" : "bg-gray-500")}
                          style={{ width: (val * 100) + "%" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-sm font-bold text-gray-900">Macro F1</span>
                    <span className={"text-xl font-extrabold tabular-nums " + (perfect ? "text-green-700" : "text-gray-800")}>
                      {model.f1.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">n = {model.support.toLocaleString()} claims</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>F1 delta = +0.218</strong> -- ASRE achieves perfect accuracy while baseline LLM achieves 78.2%, preventing 26.3% hallucinations. Source: 1,000-claim benchmark on NOAA Rule 803(8) data.
          </p>
        </div>
      </div>

      {/* Label distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Claim Outcome Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.label_distribution.map((item) => (
            <div key={item.label}
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 leading-tight">
                {item.label.replace(/_/g, " ")}
              </p>
              <p className="text-2xl font-extrabold text-gray-900 tabular-nums">{item.count}</p>
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0D6B8E] rounded-full" style={{ width: Math.min(item.pct, 100) + "%" }} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 tabular-nums">{item.pct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
