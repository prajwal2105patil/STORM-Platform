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

const INPUT_CLS = [
  "w-full rounded-xl px-3.5 py-2.5 text-sm",
  "bg-white/5 border border-white/12 text-white",
  "placeholder:text-white/25 focus:outline-none",
  "focus:ring-2 focus:ring-sky/30 focus:border-sky/50",
  "hover:border-white/20 transition-all backdrop-blur-sm",
].join(" ");

const LABEL_CLS = "block text-[10px] font-semibold text-white/45 mb-1";

export default function SLACalculatorPage() {
  useEffect(() => { document.title = "SLA Calc — DREADNOUGHT ASRE"; }, []);

  const [form, setForm] = useState({
    capacity_mw:        "",
    tariff_inr_per_kwh: "",
    plant_load_factor:  "0.25",
    start_date:         "",
    end_date:           "",
    coverage_pct:       "80",
    deductible_days:    "1",
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

    const start        = new Date(form.start_date);
    const end          = new Date(form.end_date);
    const totalDays    = Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1;
    const fmDays       = Math.max(0, totalDays - deductible);
    const dailyKWh     = capacityMW * plf * 24 * 1000;
    const dailyRevenue = dailyKWh * tariff;
    const totalLoss    = dailyRevenue * fmDays;
    const settlement   = totalLoss * coveragePct;

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

        {/* Form */}
        <div className="glass-card-dark rounded-2xl p-6 shadow-glass-lg space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky/50 pb-3 border-b border-white/8">
            Asset &amp; Contract Parameters
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "capacity_mw",        label: "Capacity (MW)",       ph: "100",  type: "number", step: "1"    },
              { k: "tariff_inr_per_kwh", label: "Tariff (₹/kWh)",      ph: "3.50", type: "number", step: "0.01" },
              { k: "plant_load_factor",  label: "Plant Load Factor",    ph: "0.25", type: "number", step: "0.01" },
              { k: "coverage_pct",       label: "Policy Coverage (%)",  ph: "80",   type: "number", step: "1"    },
            ].map(({ k, label, ph, type, step }) => (
              <div key={k}>
                <label className={LABEL_CLS}>{label}</label>
                <input type={type} step={step} placeholder={ph}
                  value={(form as any)[k]} onChange={set(k)} className={INPUT_CLS} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>FM Start Date</label>
              <input type="date" value={form.start_date} onChange={set("start_date")} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>FM End Date</label>
              <input type="date" value={form.end_date} onChange={set("end_date")} className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Deductible (days)</label>
            <input type="number" placeholder="1" min="0"
              value={form.deductible_days} onChange={set("deductible_days")} className={INPUT_CLS} />
          </div>

          <button onClick={calculate}
            className="btn-primary-3d w-full justify-center mt-2">
            <Calculator size={15} /> Calculate Settlement
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Hero metrics */}
              <div className="space-y-3">
                {[
                  { icon: Clock,       label: "Force Majeure Days Covered", value: `${result.force_majeure_days} days`, color: "text-sky",      bg: "bg-[#0D6B8E]"  },
                  { icon: TrendingDown,label: "Gross Revenue Loss",         value: fmt(result.revenue_loss_inr),       color: "text-red-400",  bg: "bg-red-600"    },
                  { icon: TrendingUp,  label: `Recommended Settlement (${result.coverage_pct}% coverage)`,
                                                                             value: fmt(result.recommended_settlement_inr), color: "text-green-400", bg: "bg-green-600" },
                ].map(({ icon: Icon, label, value, color, bg }) => (
                  <div key={label} className="glass-card-dark rounded-xl p-5 flex items-center gap-4 shadow-glass-sm">
                    <div className={`p-2.5 ${bg} rounded-lg flex-shrink-0`}><Icon size={18} className="text-white" /></div>
                    <div>
                      <p className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
                      <p className="text-sm text-white/40 mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="glass-card-dark rounded-xl p-5 shadow-glass-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky/50 mb-3">
                  Calculation Breakdown
                </p>
                <ul className="space-y-2">
                  {result.breakdown.map((line, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/65">
                      <span className="text-sky font-bold mt-0.5 flex-shrink-0">→</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300/80 leading-relaxed">
                <strong className="text-amber-300">Disclaimer:</strong> Indicative only. Final settlement subject to policy terms, legal review, and ASRE adjudication verdict.
              </div>
            </>
          ) : (
            <div className="glass-card-dark rounded-2xl p-10 text-center shadow-glass-md flex flex-col items-center justify-center min-h-[320px]">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, rgba(13,107,142,0.25) 0%, rgba(96,184,224,0.1) 100%)",
                  border:     "1px solid rgba(96,184,224,0.2)",
                  boxShadow:  "0 0 20px rgba(96,184,224,0.15)",
                }}
              >
                <Calculator size={26} className="text-sky/70" />
              </div>
              <p className="font-semibold text-white/80">Enter Parameters to Calculate</p>
              <p className="text-sm text-white/35 mt-2 max-w-xs leading-relaxed">
                Fill in asset capacity, tariff, dates, and coverage to generate the settlement estimate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
