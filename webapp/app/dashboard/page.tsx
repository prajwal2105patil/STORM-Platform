"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  CheckCircle, XCircle, Zap, AlertTriangle,
  ArrowRight, Shield, Clock, Database,
  MapPin, Activity, TrendingUp, Globe as GlobeIcon,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AnimatedCounter }  from "@/components/ui/animated-counter";
import { StatCard }         from "@/components/ui/stat-card";
import { SkeletonCard, SkeletonChart } from "@/components/ui/skeleton";
import { LiveBadge }        from "@/components/ui/live-badge";
import { FloatingPaths }    from "@/components/ui/background-paths";
import GlobeViz            from "@/components/ui/globe";
import { TiltCard }         from "@/components/ui/tilt-card";
import { IDWMap }           from "@/components/ui/idw-map";

/* ─── types ─── */
interface Snapshot {
  total_claims: number; validated: number; rejected: number; pending: number;
  approval_rate: number; avg_processing_ms: number; total_customers: number;
  hallucination_prevented: number;
}

/* ─── constants ─── */
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

const PIPELINE_NODES = [
  { num: "01", label: "Intent Router",  desc: "Natural language parsing",     color: "#60B8E0", glow: "rgba(96,184,224,0.3)"  },
  { num: "02", label: "SQL Generator",  desc: "Partition-safe query builder",  color: "#22c55e", glow: "rgba(34,197,94,0.3)"   },
  { num: "03", label: "Execution Cage", desc: "DuckDB NOAA query engine",      color: "#a855f7", glow: "rgba(168,85,247,0.3)"  },
  { num: "04", label: "Adjudicator",    desc: "IDW verdict + legal stamp",     color: "#f59e0b", glow: "rgba(245,158,11,0.3)"  },
];

const SYSTEM_SPECS = [
  { label: "Query Engine",   value: "Supabase PostgreSQL" },
  { label: "LLM Router",     value: "Groq llama-3.1-8b"  },
  { label: "IDW Stations",   value: "18 NOAA ISD"        },
  { label: "Wind Threshold", value: "17.2 m/s (B8)"      },
  { label: "Max Radius",     value: "300 km"             },
  { label: "Exceedance",     value: "≥ 3 hours"          },
  { label: "Frontend",       value: "Next.js on Vercel"  },
  { label: "Cloud Spend",    value: "$0 / month dev"     },
];

/* ─── floating verdict preview card ─── */
function FloatingVerdictPreview() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => p + 1), 60);
    return () => clearInterval(id);
  }, []);
  const pulse = 0.5 + 0.5 * Math.sin(phase * 0.05);

  return (
    <div className="glass-card-dark rounded-2xl p-5 w-60 shadow-glass-lg animate-float">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(34,197,94,${0.15 + pulse * 0.1})`, boxShadow: `0 0 ${12 + pulse * 8}px rgba(34,197,94,0.4)` }}>
          <CheckCircle size={16} className="text-green-400" />
        </div>
        <div>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold">ASRE Verdict</p>
          <p className="text-green-400 font-extrabold text-sm leading-none mt-0.5">VALIDATED</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-mono text-white/30">483ms</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { label: "Peak Wind",  value: "17.8 m/s" },
          { label: "Hours ≥B8", value: "6h"        },
          { label: "Station",   value: "Naliya AF"  },
          { label: "Distance",  value: "14.3 km"   },
          { label: "IDW Conf.", value: "87.4%"     },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-[10px] text-white/35 uppercase tracking-wider">{label}</span>
            <span className="text-[11px] font-mono font-semibold text-white/80">{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
        <Shield size={10} className="text-green-400" />
        <span className="text-[9px] text-green-400 font-semibold uppercase tracking-wider">NOAA Rule 803(8)</span>
      </div>
    </div>
  );
}

/* ─── pipeline 3D node row ─── */
function Pipeline3DRow() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % PIPELINE_NODES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-0 w-full">
      {PIPELINE_NODES.map(({ num, label, desc, color, glow }, i) => (
        <div key={num} className="flex items-center flex-1 min-w-0">
          <div
            className="flex-1 node-card-3d rounded-xl p-4 cursor-default relative overflow-hidden min-w-0"
            style={{
              background: active === i ? `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)` : "rgba(255,255,255,0.03)",
              border: `1px solid ${active === i ? color + "40" : "rgba(255,255,255,0.07)"}`,
              boxShadow: active === i ? `0 0 20px ${glow}` : "none",
              transition: "all 0.4s ease",
            }}
          >
            {active === i && (
              <div className="absolute left-0 right-0 h-px pointer-events-none animate-scan-line" style={{ background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
            )}
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: `${color}99` }}>NODE {num}</p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
              <span className="text-sm font-black" style={{ color }}>{num}</span>
            </div>
            <p className="font-bold text-white text-xs leading-tight mb-1">{label}</p>
            <p className="text-[10px] text-white/40 leading-snug">{desc}</p>
            {active === i && (
              <div className="mt-2 flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
                </span>
                <span className="text-[9px] font-semibold" style={{ color }}>running</span>
              </div>
            )}
          </div>
          {i < PIPELINE_NODES.length - 1 && (
            <div className="flex-shrink-0 w-6 flex items-center justify-center">
              <svg width="20" height="12" viewBox="0 0 20 12">
                <line x1="0" y1="6" x2="14" y2="6"
                  stroke={active > i ? PIPELINE_NODES[i].color : "rgba(255,255,255,0.12)"}
                  strokeWidth="1.5" strokeDasharray="4 3"
                  style={{ animation: active > i ? "data-flow 1.2s linear infinite" : "none" }} />
                <polygon points="14,3 20,6 14,9" fill={active > i ? PIPELINE_NODES[i].color : "rgba(255,255,255,0.12)"} opacity={active > i ? "1" : "0.4"} />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── main page ─── */
export default function DashboardPage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard — DREADNOUGHT ASRE";
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const snap: Snapshot = data?.snapshot ?? {
    total_claims: 0, validated: 0, rejected: 0, pending: 0,
    approval_rate: 0, avg_processing_ms: 0, total_customers: 0, hallucination_prevented: 0,
  };

  return (
    <div className="space-y-0">

      {/* HERO */}
      <div className="relative min-h-[88vh] flex flex-col overflow-hidden">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,107,142,0.18) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 80% at 0% 100%, rgba(26,58,92,0.25) 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none perspective-grid" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between flex-1 px-8 lg:px-12 py-16 gap-10">
          <div className="flex-1 max-w-2xl">
            <div className="glass-badge mb-8 inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              ASRE Engine Online — NOAA Rule 803(8) Certified
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
              <span className="block">
                {["Force", "Majeure"].map((word, wi) => (
                  <span key={wi} className="inline-block mr-3">
                    {word.split("").map((letter, li) => (
                      <motion.span key={`l1-${wi}-${li}`} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: wi * 0.08 + li * 0.025, type: "spring", stiffness: 150, damping: 25 }}
                        className="inline-block text-white">{letter}
                      </motion.span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="block">
                {"Adjudicated.".split("").map((letter, li) => (
                  <motion.span key={`l2-${li}`} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.22 + li * 0.03, type: "spring", stiffness: 150, damping: 25 }}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-[#60B8E0]/80">{letter}
                  </motion.span>
                ))}
              </span>
            </h1>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75, duration: 0.7 }}
              className="text-lg text-white/50 mb-3 font-light tracking-wide">
              In under <span className="text-white/80 font-semibold">500ms.</span>
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7 }}
              className="text-blue-200/50 text-base mb-10 max-w-lg leading-relaxed">
              AI-powered storm-event verification backed by 11 years of NOAA ISD data. Legally admissible. Deterministic. Zero human bias.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.6 }}
              className="flex gap-4 flex-wrap mb-14">
              <Link href="/adjudicate" className="btn-primary-3d"><Zap size={15} /> Submit a Claim <ArrowRight size={13} /></Link>
              <Link href="/query" className="btn-glass">Weather Q&A</Link>
            </motion.div>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Activity,   label: "Claims Processed",      value: snap.total_claims,           suffix: ""   },
                { icon: Clock,      label: "Avg Decision Time",      value: snap.avg_processing_ms,      suffix: "ms" },
                { icon: TrendingUp, label: "Hallucinations Blocked", value: snap.hallucination_prevented, suffix: ""  },
              ].map(({ icon: Icon, label, value, suffix }) => (
                <div key={label} className="glass-card-dark rounded-xl px-4 py-3 flex items-center gap-3">
                  <Icon size={15} className="text-sky flex-shrink-0 opacity-70" />
                  <div>
                    <p className="text-xl font-extrabold text-white tabular-nums leading-none">
                      {loading ? "—" : <AnimatedCounter value={value} suffix={suffix} />}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">{label}</p>
                  </div>
                </div>
              ))}
              <div className="glass-card-dark rounded-xl px-4 py-3 flex items-center gap-3">
                <TrendingUp size={15} className="text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xl font-extrabold text-green-400 tabular-nums leading-none">+26.3%</p>
                  <p className="text-[10px] text-white/35 mt-0.5 uppercase tracking-wider">Accuracy vs Baseline</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-6 pt-8 flex-shrink-0">
            <FloatingVerdictPreview />
            <div className="opacity-90 drop-shadow-[0_0_32px_rgba(96,184,224,0.35)]"><GlobeViz standalone={false} /></div>
          </div>
        </div>
      </div>

      {/* PIPELINE */}
      <div className="section-dark px-8 lg:px-12 py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky/30 to-transparent" />
            <p className="text-[11px] text-sky/60 font-bold uppercase tracking-widest px-4">ASRE 4-Node Pipeline</p>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky/30 to-transparent" />
          </div>
          <Pipeline3DRow />
        </div>
      </div>

      {/* KPI ROW */}
      <div className="bg-[#060d1a] px-8 lg:px-12 py-10 border-t border-white/5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {loading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) : (
            <>
              <TiltCard intensity={5}><StatCard icon={CheckCircle} label="Validated Claims" value={snap.validated} sub={`${snap.approval_rate}% approval`} iconBg="bg-green-600" variant="dark" /></TiltCard>
              <TiltCard intensity={5}><StatCard icon={XCircle}     label="Rejected Claims"  value={snap.rejected}  sub="All classes combined" iconBg="bg-red-600" variant="dark" /></TiltCard>
              <TiltCard intensity={5}><StatCard icon={Clock}       label="Avg Latency"       value={`${snap.avg_processing_ms}ms`} sub="End-to-end adjudication" iconBg="bg-[#0D6B8E]" variant="dark" /></TiltCard>
              <TiltCard intensity={5}><StatCard icon={AlertTriangle} label="Hallucinations Blocked" value={snap.hallucination_prevented} sub="26.3% baseline prevented" iconBg="bg-amber-600" variant="dark" /></TiltCard>
            </>
          )}
        </div>
      </div>

      {/* IDW MAP */}
      <div className="section-dark px-8 lg:px-12 py-14 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="glass-badge mb-6 inline-flex"><MapPin size={10} className="text-sky" /> Spatial Evidence Layer</div>
              <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">18 NOAA Stations.<br /><span className="text-gradient-electric">One defensible verdict.</span></h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">Every adjudication uses Inverse Distance Weighting across all NOAA ISD ground stations within a 300 km search radius. The nearest station, its distance, its IDW confidence weight — all embedded in the evidence packet and admissible under Indian Evidence Act s74 and IT Act s65B.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Search Radius",   value: "300 km",     color: "#60B8E0" },
                  { label: "Station Network", value: "18 NOAA ISD", color: "#22c55e" },
                  { label: "IDW Power",       value: "p = 2",       color: "#a855f7" },
                  { label: "Legal Standard",  value: "Rule 803(8)", color: "#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 border" style={{ borderColor: `${color}25`, background: `${color}0a` }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: `${color}99` }}>{label}</p>
                    <p className="font-bold text-white text-sm mt-1" style={{ textShadow: `0 0 20px ${color}40` }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card-dark rounded-2xl p-4 shadow-glass-lg">
              <p className="text-[10px] text-sky/60 font-bold uppercase tracking-widest mb-3">Live Station Coverage · India</p>
              <IDWMap />
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="bg-[#060d1a] px-8 lg:px-12 py-10 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="glass-card-dark rounded-2xl p-6 shadow-glass-md hover:shadow-glass-lg transition-shadow duration-300">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-white">Claims — Last 30 Days</h2>
              <div className="flex items-center gap-3 text-[10px] text-white/40">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Validated</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Rejected</span>
              </div>
            </div>
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.timeline || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#ffffff30" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#ffffff30" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#0e2640", border: "1px solid rgba(96,184,224,0.2)", borderRadius: 10, fontSize: 12, color: "#fff" }} labelStyle={{ fontWeight: 700, color: "#60B8E0" }} />
                  <Line type="monotone" dataKey="validated" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Validated" />
                  <Line type="monotone" dataKey="rejected"  stroke="#ef4444" strokeWidth={2.5} dot={false} name="Rejected" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="glass-card-dark rounded-2xl p-6 shadow-glass-md hover:shadow-glass-lg transition-shadow duration-300">
            <h2 className="text-sm font-bold text-white mb-5">Adjudication Label Distribution</h2>
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.label_distribution || []} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: "#ffffff30" }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 8, fill: "#ffffff50" }} width={165} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0e2640", border: "1px solid rgba(96,184,224,0.2)", borderRadius: 10, fontSize: 12, color: "#fff" }} formatter={(v: any) => [v, "Claims"]} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {(data?.label_distribution || []).map((entry: any) => (
                      <Cell key={entry.label} fill={LABEL_COLORS[entry.label] ?? "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM ARCH */}
      <div className="section-dark px-8 lg:px-12 py-10 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="relative glass-card-dark rounded-2xl p-6 overflow-hidden shadow-glass-lg">
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"><div className="hero-mesh absolute inset-0 opacity-20" /></div>
            <div className="relative flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] text-sky/50 font-bold uppercase tracking-widest mb-1">System Architecture</p>
                <h2 className="text-base font-bold text-white">ASRE Platform Stack</h2>
              </div>
              <span className="text-[9px] text-sky/40 font-mono uppercase tracking-widest glass-card px-3 py-1 rounded-full border">v2.0.0</span>
            </div>
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
              {SYSTEM_SPECS.map(({ label, value }) => (
                <TiltCard key={label} intensity={4} glare={false}>
                  <div className="rounded-xl p-3 border border-white/8 bg-white/4 hover:bg-white/8 transition-colors">
                    <p className="text-sky/50 text-[9px] uppercase tracking-wider font-bold">{label}</p>
                    <p className="font-semibold text-white text-xs mt-1">{value}</p>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-[#060d1a] px-8 lg:px-12 pb-14 pt-10 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { href: "/adjudicate", label: "Submit a Claim",         desc: "Run ASRE 4-node adjudication pipeline", icon: Zap,       primary: true  },
            { href: "/query",      label: "Weather Intelligence",    desc: "Ask NOAA weather questions via LLM",    icon: GlobeIcon, primary: false },
            { href: "/sla",        label: "SLA Calculator",          desc: "Estimate settlement for FM claims",      icon: TrendingUp,primary: false },
          ].map(({ href, label, desc, icon: Icon, primary }) => (
            <TiltCard key={href} intensity={6}>
              <Link href={href} className={["group flex items-center justify-between p-5 rounded-2xl transition-all duration-200 shadow-glass-sm border", primary ? "bg-gradient-to-br from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] text-white border-sky/20" : "glass-card-dark text-white hover:border-sky/25"].join(" ")}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${primary ? "bg-white/15" : "bg-sky/10"}`}>
                    <Icon size={16} className={primary ? "text-white" : "text-sky"} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className={`text-xs mt-0.5 ${primary ? "text-blue-200/70" : "text-white/40"}`}>{desc}</p>
                  </div>
                </div>
                <ArrowRight size={15} className="flex-shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            </TiltCard>
          ))}
        </div>
      </div>

      <LiveBadge />
    </div>
  );
}
