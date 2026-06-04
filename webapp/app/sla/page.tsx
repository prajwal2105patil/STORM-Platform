"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

interface SLAResult {
  force_majeure_days: number;
  revenue_loss_inr: number;
  recommended_settlement_inr: number;
  coverage_pct: number;
  daily_loss_inr: number;
  breakdown: string[];
}

export default function SLACalculatorPage() {
  const [form, setForm] = useState({
    capacity_mw: "",
    tariff_inr_per_kwh: "",
    plant_load_factor: "0.25",
    start_date: "",
    end_date: "",
    coverage_pct: "80",
    deductible_days: "1",
  });
  const [result, setResult] = useState<SLAResult | null>(null);

  const calculate = () => {
    const capacityMW = parseFloat(form.capacity_mw);
    const tariff = parseFloat(form.tariff_inr_per_kwh);
    const plf = parseFloat(form.plant_load_factor);
    const coveragePct = parseFloat(form.coverage_pct) / 100;
    const deductible = parseInt(form.deductible_days);

    if (!capacityMW || !tariff || !form.start_date || !form.end_date) return;

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const fmDays = Math.max(0, totalDays - deductible);

    // Daily generation: Capacity (MW) × PLF × 24h × 1000 (kWh per MWh)
    const dailyKWh = capacityMW * plf * 24 * 1000;
    const dailyRevenueINR = dailyKWh * tariff;
    const totalRevenueLoss = dailyRevenueINR * fmDays;
    const settlement = totalRevenueLoss * coveragePct;

    setResult({
      force_majeure_days: fmDays,
      revenue_loss_inr: Math.round(totalRevenueLoss),
      recommended_settlement_inr: Math.round(settlement),
      coverage_pct: parseFloat(form.coverage_pct),
      daily_loss_inr: Math.round(dailyRevenueINR),
      breakdown: [
        `Asset capacity: ${capacityMW} MW`,
        `Plant load factor: ${(plf * 100).toFixed(0)}%`,
        `Daily generation: ${(dailyKWh / 1000).toFixed(1)} MWh`,
        `Daily revenue: ₹${Math.round(dailyRevenueINR).toLocaleString("en-IN")}`,
        `Force majeure period: ${totalDays} days (less ${deductible} day deductible = ${fmDays} days)`,
        `Gross revenue loss: ₹${Math.round(totalRevenueLoss).toLocaleString("en-IN")}`,
        `Policy coverage: ${form.coverage_pct}%`,
        `Recommended settlement: ₹${Math.round(settlement).toLocaleString("en-IN")}`,
      ],
    });
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">SLA Breach Calculator</h1>
          <p className="text-gray-500 mb-8">Calculate recommended settlement for validated force majeure claims.</p>

          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-800 mb-4">Asset & Contract Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Capacity (MW)</label>
                <input type="number" placeholder="e.g. 50" value={form.capacity_mw}
                  onChange={e => setForm({ ...form, capacity_mw: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Tariff (₹/kWh)</label>
                <input type="number" placeholder="e.g. 3.50" step="0.01" value={form.tariff_inr_per_kwh}
                  onChange={e => setForm({ ...form, tariff_inr_per_kwh: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Plant Load Factor (0-1)</label>
                <input type="number" placeholder="0.25" step="0.01" min="0" max="1" value={form.plant_load_factor}
                  onChange={e => setForm({ ...form, plant_load_factor: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Policy Coverage (%)</label>
                <input type="number" placeholder="80" min="0" max="100" value={form.coverage_pct}
                  onChange={e => setForm({ ...form, coverage_pct: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Force Majeure Start</label>
                <input type="date" value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Force Majeure End</label>
                <input type="date" value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Deductible (days)</label>
                <input type="number" placeholder="1" min="0" value={form.deductible_days}
                  onChange={e => setForm({ ...form, deductible_days: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button onClick={calculate}
              className="mt-6 w-full bg-[#1A3A5C] hover:bg-[#0D6B8E] text-white font-semibold py-3 rounded-lg transition-colors">
              Calculate Settlement
            </button>
          </div>

          {result && (
            <div className="space-y-4">
              {/* Hero metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <p className="text-3xl font-bold text-[#1A3A5C]">{result.force_majeure_days}</p>
                  <p className="text-sm text-gray-500 mt-1">FM Days Covered</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <p className="text-3xl font-bold text-red-600">{fmt(result.revenue_loss_inr)}</p>
                  <p className="text-sm text-gray-500 mt-1">Gross Revenue Loss</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-5 text-center">
                  <p className="text-3xl font-bold text-green-700">{fmt(result.recommended_settlement_inr)}</p>
                  <p className="text-sm text-gray-500 mt-1">Recommended Settlement ({result.coverage_pct}% coverage)</p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-800 mb-3">Calculation Breakdown</h3>
                <ul className="space-y-2">
                  {result.breakdown.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-0.5">→</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <strong>Disclaimer:</strong> This calculation is for indicative purposes only. Final settlement is subject to policy terms, legal review, and ASRE adjudication verdict.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
