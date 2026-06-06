"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Search, AlertTriangle, Clock, Database, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

type QueryResult = Record<string, any>;

const EXAMPLES = [
  "What was the peak wind in Mumbai in August 2023?",
  "Average wind speed in Surat during July 2022?",
  "How many gale-force hours in Mumbai last August?",
  "Was there a storm in Chennai in September 2022?",
];

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [results,  setResults]  = useState<QueryResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = "Weather Q&A -- DREADNOUGHT ASRE"; }, []);
  useEffect(() => {
    if (results.length) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results.length]);

  async function handleQuery(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res    = await fetch("/api/query", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      setResults((prev) => [{ ...data, _question: trimmed }, ...prev]);
      setQuestion("");
    } catch {
      setResults((prev) => [{ _question: trimmed, answer: "Network error -- check API connectivity.", value: null }, ...prev]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <PageHeader
        title="Weather Intelligence Query"
        description="18 Indian NOAA ISD stations · 2014–2024 · Rule 803(8) certified"
      />

      {/* Example chips */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Example Questions</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => handleQuery(ex)} disabled={loading}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium transition-colors disabled:opacity-50 border border-blue-100">
              {ex.length > 48 ? ex.slice(0, 45) + "…" : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input ref={inputRef} type="text" value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuery(question); }}
            placeholder="Ask a weather question…" disabled={loading}
            className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-lg text-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/20 focus:border-[#1A3A5C] disabled:bg-gray-50 transition-all hover:border-gray-300" />
        </div>
        <button onClick={() => handleQuery(question)} disabled={loading || !question.trim()}
          className="bg-gradient-to-r from-[#1A3A5C] to-[#0D6B8E] hover:from-[#0D6B8E] hover:to-[#1E88BE] disabled:opacity-50 text-white px-5 py-3 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all shadow-sm hover:shadow-md">
          {loading ? <span className="animate-spin text-base">⚙</span> : <Send size={14} />}
          Ask
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((r, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {/* Question header */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 bg-gray-50/60">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Query</p>
                <p className="text-sm font-semibold text-gray-800">{r._question}</p>
              </div>
              {/* Answer */}
              <div className="px-5 py-4 space-y-3">
                {r.value != null ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-green-700 tabular-nums">{r.value}</span>
                    {r.unit && <span className="text-base text-green-600 font-semibold">{r.unit}</span>}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700 leading-relaxed">{r.answer ?? "No matching data found."}</p>
                  </div>
                )}
                {r.answer && r.value != null && (
                  <p className="text-sm text-gray-600 leading-relaxed">{r.answer}</p>
                )}
              </div>
              {/* Metadata footer */}
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400">
                {r.station && <span className="flex items-center gap-1"><Database size={10} /> {r.station}</span>}
                {r.processing_ms != null && <span className="flex items-center gap-1"><Clock size={10} /> {r.processing_ms}ms</span>}
                {r.confidence != null && <span className="font-mono">confidence: {(r.confidence * 100).toFixed(0)}%</span>}
                <span className="ml-auto text-gray-300 font-mono text-[10px]">NOAA Rule 803(8)</span>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && !loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-[#1A3A5C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={26} className="text-[#1A3A5C]" />
          </div>
          <p className="font-semibold text-gray-700">Ask Anything About NOAA Weather</p>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
            Peak wind, gale hours, pressure, temperature &mdash; any metric across 18 stations from 2014 to 2024.
          </p>
          <p className="text-[10px] text-gray-300 font-mono mt-6 uppercase tracking-widest">
            Groq llama-3.1-8b &middot; DuckDB partition scan &middot; &lt;500ms
          </p>
        </div>
      )}
    </div>
  );
}