"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Database, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { FloatingPaths }  from "@/components/ui/background-paths";

type QueryResult = Record<string, any>;

const EXAMPLES = [
  "What was the peak wind in Mumbai in August 2023?",
  "Average wind speed in Surat during July 2022?",
  "How many gale-force hours in Mumbai last August?",
  "Was there a storm in Chennai in September 2022?",
];

export default function QueryPage() {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading]  = useState(false);
  useEffect(() => { document.title = "Weather Q&A — DREADNOUGHT ASRE"; }, []);

  async function handleQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      setResults((prev) => [{ ...data, _question: trimmed }, ...prev]);
    } catch {
      setResults((prev) => [{ _question: trimmed, answer: "Network error — check API connectivity.", value: null }, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    <div className="relative z-10 p-8 max-w-3xl space-y-6">
      <PageHeader
        title="Weather Intelligence Query"
        description="409 Indian NOAA ISD stations · 2015–2025 · Public record data"
      />

      {/* Example chips */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-3">Example Questions</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => handleQuery(ex)} disabled={loading}
              className="text-[11px] font-semibold text-sky/70 hover:text-sky border border-sky/15 hover:border-sky/40 rounded-lg px-3 py-1.5 bg-sky/5 hover:bg-sky/10 transition-all disabled:opacity-40">
              {ex.length > 48 ? ex.slice(0, 45) + "…" : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced prompt input */}
      <PromptInputBox
        onSend={(message) => handleQuery(message)}
        isLoading={loading}
        placeholder="Ask a weather question… e.g. peak wind in Surat, July 2022"
      />

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={i} className="glass-card-dark rounded-2xl overflow-hidden shadow-glass-md">
              <div className="px-5 pt-4 pb-3 border-b border-white/8 bg-white/3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Query</p>
                <p className="text-sm font-semibold text-white/85">{r._question}</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {r.value != null ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-green-400 tabular-nums">{r.value}</span>
                    {r.unit && <span className="text-base text-green-400/70 font-semibold">{r.unit}</span>}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-300/80 leading-relaxed">{r.answer ?? "No matching data found."}</p>
                  </div>
                )}
                {r.answer && r.value != null && (
                  <p className="text-sm text-white/55 leading-relaxed">{r.answer}</p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-white/8 flex items-center gap-4 text-[11px] text-white/30">
                {r.station        && <span className="flex items-center gap-1"><Database size={10} /> {r.station}</span>}
                {r.processing_ms != null && <span className="flex items-center gap-1"><Clock size={10} /> {r.processing_ms}ms</span>}
                {r.confidence    != null && <span className="font-mono">confidence: {(r.confidence * 100).toFixed(0)}%</span>}
                <span className="ml-auto text-white/20 font-mono text-[10px]">NOAA Public Record</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && (
        <div className="glass-card-dark rounded-2xl p-12 text-center shadow-glass-md">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, rgba(13,107,142,0.25) 0%, rgba(96,184,224,0.1) 100%)",
              border:     "1px solid rgba(96,184,224,0.2)",
              boxShadow:  "0 0 20px rgba(96,184,224,0.15)",
            }}
          >
            <Zap size={26} className="text-sky/70" />
          </div>
          <p className="font-semibold text-white/80">Ask Anything About NOAA Weather</p>
          <p className="text-sm text-white/35 mt-2 max-w-sm mx-auto leading-relaxed">
            Peak wind, average wind, and gale-force hours across 409 stations from 2015 to 2025.
          </p>
          <p className="text-[10px] text-white/20 font-mono mt-6 uppercase tracking-widest">
            Groq llama-3.1-8b · DuckDB partition scan · &lt;500ms
          </p>
        </div>
      )}
    </div>
    </div>
  );
}
