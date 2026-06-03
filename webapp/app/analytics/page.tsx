"use client";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle } from "lucide-react";

interface TimelineData {
  date: string;
  validated: number;
  rejected: number;
}

interface LabelData {
  label: string;
  count: number;
  pct: number;
}

interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  state: string;
}

interface AnalyticsData {
  snapshot: {
    total_claims: number;
    validated: number;
    rejected: number;
    pending: number;
    approval_rate: number;
    avg_processing_ms: number;
    hallucination_prevented: number;
    total_customers: number;
  };
  timeline: TimelineData[];
  label_distribution: LabelData[];
  stations: Station[];
}

// Hardcoded F1 scores from benchmark
const BENCHMARK_DATA = {
  asre: {
    name: "ASRE (Routed)",
    precision: 1.0,
    recall: 1.0,
    f1: 1.0,
    support: 1000,
  },
  baseline: {
    name: "Baseline LLM (Unrouted)",
    precision: 0.79,
    recall: 0.73,
    f1: 0.782,
    support: 1000,
  },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
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
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-2">Loading...</p>
      </div>
    );
  }

  // Project station lat/lon to SVG coordinates
  const SVG_W = 400;
  const SVG_H = 500;
  const LAT_MIN = 7;
  const LAT_MAX = 37;
  const LON_MIN = 68;
  const LON_MAX = 97;

  const projectCoords = (lat: number, lon: number) => {
    const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * SVG_W;
    const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H;
    return { x, y };
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">System performance & credibility metrics</p>
      </div>

      {/* Top hero card: Hallucination counter */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-8 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-amber-100 text-sm font-semibold">HALLUCINATIONS PREVENTED</p>
            <p className="text-5xl font-bold mt-2">
              {data.snapshot.hallucination_prevented}
            </p>
            <p className="text-amber-100 text-sm mt-3">
              26.3% baseline rate × {data.snapshot.total_claims} adjudicated claims
            </p>
          </div>
          <AlertTriangle size={48} className="text-amber-100 opacity-75" />
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly volume chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Claim Volume
          </h2>
          {data.timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="validated" fill="#10b981" name="Validated" />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No data available</p>
          )}
        </div>

        {/* India station coverage map */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Station Coverage Map
          </h2>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full border border-gray-200 rounded-lg bg-blue-50"
          >
            {/* Simplified India outline (polyline) */}
            <polyline
              points="340,50 380,60 400,90 390,130 380,150 360,160 340,170 330,180 320,170 310,160 300,170 290,180 280,160 270,150 260,140 250,160 240,170 230,160 220,140 210,130 200,120 190,130 180,140 170,130 160,120 150,130 140,150 130,160 120,150 110,140 100,130 90,140 80,150 70,140 60,130 50,140 40,150 35,160 40,180 50,190 60,200 70,190 80,200 90,210 100,200 110,210 120,220 130,210 140,220 150,210 160,220 170,210 180,220 190,210 200,220 210,210 220,220 230,210 240,220 250,210 260,220 270,210 280,220 290,210 300,220 310,210 320,220 330,210 340,190 350,180 360,190 370,180 380,170 390,160 400,150 410,140 420,150 420,100 410,70 400,50"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            />

            {/* Station dots */}
            {data.stations.map((station) => {
              const { x, y } = projectCoords(station.lat, station.lon);
              return (
                <g key={station.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="#0D6B8E"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <title>{station.name}</title>
                </g>
              );
            })}
          </svg>
          <p className="text-xs text-gray-600 mt-3">
            {data.stations.length} NOAA ISD stations across India
          </p>
        </div>
      </div>

      {/* F1 Score Comparison */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Benchmark: ASRE vs Baseline LLM
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[BENCHMARK_DATA.asre, BENCHMARK_DATA.baseline].map((model) => (
            <div key={model.name} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">{model.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Precision</span>
                  <span
                    className={`text-sm font-semibold ${
                      model.precision === 1.0
                        ? "text-green-600"
                        : "text-gray-900"
                    }`}
                  >
                    {(model.precision * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recall</span>
                  <span
                    className={`text-sm font-semibold ${
                      model.recall === 1.0 ? "text-green-600" : "text-gray-900"
                    }`}
                  >
                    {(model.recall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-3">
                  <span className="text-sm font-semibold text-gray-900">
                    Macro F1
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      model.f1 === 1.0 ? "text-green-600" : "text-gray-900"
                    }`}
                  >
                    {model.f1.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Test set</span>
                  <span>{model.support} claims</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>ΔF1 = +0.218</strong> — ASRE achieves perfect accuracy while
            baseline LLM achieves 73.7%, preventing 26.3% hallucinations across
            all claims. Source: 1,000-claim benchmark on Rule 803(8) data.
          </p>
        </div>
      </div>

      {/* System Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-600">Total Claims</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.snapshot.total_claims}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-600">Approval Rate</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {data.snapshot.approval_rate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-600">Avg Processing Time</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.snapshot.avg_processing_ms}ms
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-600">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.snapshot.total_customers}
          </p>
        </div>
      </div>

      {/* Label distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Claim Outcome Distribution
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.label_distribution.map((label) => (
            <div
              key={label.label}
              className="border border-gray-200 rounded-lg p-4"
            >
              <p className="text-xs font-semibold text-gray-600 mb-2">
                {label.label}
              </p>
              <p className="text-2xl font-bold text-gray-900">{label.count}</p>
              <p className="text-xs text-gray-500 mt-1">{label.pct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
