"use client";

import { useState, useEffect } from "react";
import { Calculator, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface SLAResult {
  force_majeure_days: number;
  revenue_loss_inr: number;
  recommended_settlement_inr: number;
  coverage_pct: number;
  daily_loss_inr: number;
  breakdown: string[];
}

const INPUT_CLS =
  "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] transition-all hover:border-gray-300";

export default function SLACalculatorPage() {
  useEffect(() => { document.title = "SLA Calc -- DREADNOUGHT ASRE"; }, []);

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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const calculate = () => {
    const capacityMW  = parseFloat(form.capacity_mw);
    const tariff      = parseFloat(form.tariff_inr_per_kwh);
    const plf         = parseFloat(form.plant_load_factor);
    const coveragePct = parseFloat(form.coverage_pct) / 100;
    const deductible  = parseInt(form.deductible_days);

    if (!capacityMW || !tariff || !form.start_date || !form.end_date) return;

    const start          = new Date(form.start_date);
    const end            = new Date(form.end_date);
    const totalDays      = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const fmDays         = Math.max(0, totalDays - deductible);
    const dailyKWh       = capacityMW * plf * 24 * 1000;
    const dailyRevenue   = dailyKWh * tariff;
    const totalLoss      = dailyRevenue * fmDays;
    const settlement     = totalLoss * coveragePct;

    setResult({
      force_majeure_days:         fmDays,
      revenue_loss_inr:           Math.round(totalLoss),
      recommended_settlement_inr: Math.round(settlement),
      coverage_pct:               parseFloat(form.coverage_pct),
      daily_loss_inr:             Math.round(dailyRevenue),
      breakdown: [
        `Asset capacity: ${capacityMW} MW`,
        `Plant load factor: ${(plf * 100).toFixed(0)}%`,
        `Daily generation: ${(dailyKWh / 1000).toFixed(1)} MWh`,
        `Daily revenue: ₹${Math.round(dailyRevenue).toLocaleString("en-IN")}`,
        `FM period: ${totalDays} days − ${deductible} day deductible = ${fmDays} days`,
        `Gross revenue loss: ₹${Math.round(totalLoss).toLocaleString("en-IN")}`,
        `Policy coverage: ${form.coverage_pct}%`,
        `Recommended settlement: ₹${Math.round(settlement).toLocaleString("en-IN")}`,
      ],
    });
  };

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="p-8 max-w-4xl space-y-6">

      <PageHeader
        title="SLA Breach Calculator"
        description="Estimate recommended settlement for validated force majeure claims"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/*  Form  */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-1 border-b border-gray-100">
            Asset & Contract Parameters
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "capacity_mw",        label: "Capacity (MW)",        ph: "100",  type: "number", step: "1"    },
              { k: "tariff_inr_per_kwh", label: "Tariff (₹/kWh)",       ph: "3.50", type: "number", step: "0.01" },
              { k: "plant_load_factor",  label: "Plant Load Factor",     ph: "0.25", type: "number", step: "0.01" },
              { k: "coverage_pct",       label: "Policy Coverage (%)",   ph: "80",   type: "number", step: "1"    },
            ].map(({ k, label, ph, type, step }) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} step={step} placeholder={ph}
                  value={(form as any)[k]} onChange={set(k)} className={INPUT_CLS} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">FM Start Date</label>
              <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">FM End Date</label>
              <input type="date" value={form.end_date}   onChange={set("end_date")}   className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Deductible (days)</label>
            <input type="number" placeholder="1" min="0"
              value={form.deductible_days} onChange={set("deductible_days")} className={INPUT_CLS} />
          </div>

          <button onClick={calculate}
            className="w-full bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2 shadow-sm hover:shadow-md hover:-translate-y-0.5">
            <Calculator size={15} /> Calculate Settlement
          </button>
        </div>

        {/*  Results  */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Hero metrics */}
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                  <div className="p-2.5 bg-[#1A3A5C] rounded-lg"><Clock size={18} className="text-white" /></div>
                  <div>
                    <p className="text-2xl font-extrabold text-[#1A3A5C] tabular-nums">
                      {result.force_majeure_days} <span className="text-base font-semibold">days</span>
                    </p>
                    <p className="text-sm text-gray-500">Force Majeure Days Covered</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-red-200 p-5 flex items-center gap-4 shadow-sm">
                  <div className="p-2.5 bg-red-500 rounded-lg"><TrendingDown size={18} className="text-white" /></div>
                  <div>
                    <p className="text-2xl font-extrabold text-red-700 tabular-nums">{fmt(result.revenue_loss_inr)}</p>
                    <p className="text-sm text-gray-500">Gross Revenue Loss</p>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-5 flex items-center gap-4 shadow-sm">
                  <div className="p-2.5 bg-green-600 rounded-lg"><TrendingUp size={18} className="text-white" /></div>
                  <div>
                    <p className="text-2xl font-extrabold text-green-700 tabular-nums">
                      {fmt(result.recommended_settlement_inr)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Recommended Settlement ({result.coverage_pct}% coverage)
                    </p>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Calculation Breakdown
                </p>
                <ul className="space-y-2">
                  {result.breakdown.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-[#0D6B8E] font-bold mt-0.5 flex-shrink-0">→</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
                <strong>Disclaimer:</strong> Indicative only. Final settlement subject to policy terms, legal review, and ASRE adjudication verdict.
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm flex flex-col items-center justify-center min-h-[320px]">
              <div className="w-14 h-14 bg-[#1A3A5C]/10 rounded-full flex items-center justify-center mb-4">
                <Calculator size={26} className="text-[#1A3A5C]" />
              </div>
              <p className="font-semibold text-gray-700">Enter Parameters to Calculate</p>
              <p className="text-sm text-gray-400 mt-2 max-w-xs leading-relaxed">
                Fill in asset capacity, tariff, dates, and coverage to generate the settlement estimate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
