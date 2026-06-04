"use client";

import { useState } from "react";
import { QueryResult } from "@/lib/nlq";

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);

  const exampleQuestions = [
    "What was the peak wind in Mumbai in August 2023?",
    "Average temperature in Surat during July 2022?",
    "How many gale-force hours in Mumbai last August?",
    "Pressure in Surat in September 2022?",
  ];

  const handleQuery = async (q: string) => {
    if (!q.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const result: QueryResult = await res.json();
      setResults([result, ...results]);
      setQuestion("");
    } catch (err) {
      console.error("Query error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Weather Intelligence Query</h1>
        <p className="text-gray-600">
          Ask natural language questions about NOAA weather data.
          <br />
          <span className="text-sm">18 Indian stations • 2014-2024 • Rule 803(8) certified</span>
        </p>
      </div>

      {/* Example Questions */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-3">Example questions:</p>
        <div className="flex flex-wrap gap-2">
          {exampleQuestions.map((ex, i) => (
            <button
              key={i}
              onClick={() => handleQuery(ex)}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-sm transition"
            >
              {ex.substring(0, 35)}...
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="mb-8 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleQuery(question)}
          placeholder="Ask a weather question..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          onClick={() => handleQuery(question)}
          disabled={loading || !question.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 transition"
        >
          {loading ? "Loading..." : "Ask"}
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {results.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
            No queries yet. Ask a question to get started.
          </div>
        ) : (
          results.map((result, i) => (
            <div key={i} className="p-6 border border-gray-200 rounded-lg">
              {/* Question */}
              <p className="text-gray-600 text-sm mb-3 italic">
                Q: {result.question}
              </p>

              {/* Answer */}
              {result.confidence === "exact" ? (
                <div className="mb-4">
                  <p className="text-2xl font-bold text-green-600">
                    {result.value} {result.unit}
                  </p>
                  <p className="text-gray-700">
                    {result.station} • {result.month}/{result.year}
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                  <p className="text-amber-800">{result.message}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>
                  Source: {result.source} • Confidence: {result.confidence}
                </span>
                <span>{result.processing_ms}ms</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
