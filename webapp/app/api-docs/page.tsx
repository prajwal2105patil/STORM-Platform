"use client";

import { PageHeader }    from "@/components/ui/page-header";
import { FloatingPaths } from "@/components/ui/background-paths";

const endpoints = [
  {
    method: "POST",
    path: "/api/adjudicate",
    description: "Submit a claim for ASRE adjudication",
    rateLimit: "10 requests/min",
    body: `{
  "petitioner": "Acme Power Solutions",
  "respondent": "State Grid Corp",
  "asset_name": "Mumbai Wind Farm",
  "asset_type": "wind farm",
  "asset_lat": 19.09,
  "asset_lon": 72.85,
  "asset_capacity_mw": 50,
  "start_date": "2023-08-15",
  "end_date": "2023-08-31",
  "claimed_cause": "Cyclone",
  "claimed_loss_inr": 5000000,
  "customer_id": "uuid (optional)"
}`,
    response: `{
  "claim_id": "uuid",
  "label": "VALIDATED",
  "nearest_station": "Mumbai",
  "nearest_station_km": 0,
  "peak_wind_ms": 20.7,
  "exceedance_hours": 3,
  "idw_confidence": 1.0,
  "processing_ms": 358,
  "legal_summary": "VALIDATED under NOAA Rule 803(8)...",
  "node_path": ["IntentRouter","SQLGenerator","ExecutionCage","Adjudicator"]
}`,
  },
  {
    method: "GET",
    path: "/api/claims",
    description: "List all adjudicated claims with pagination",
    rateLimit: "Unlimited",
    body: `Query params:
  page=1 (default)
  limit=20 (default)
  status=adjudicated|pending
  customer_id=uuid`,
    response: `{
  "claims": [...],
  "total": 7,
  "page": 1,
  "limit": 20
}`,
  },
  {
    method: "GET",
    path: "/api/claims/[id]/report",
    description: "Generate printable PDF evidence report for a claim",
    rateLimit: "Unlimited",
    body: "No body required. Returns HTML for printing/PDF.",
    response: "HTML document (Content-Type: text/html)",
  },
  {
    method: "POST",
    path: "/api/query",
    description: "Natural language weather intelligence query (Groq LLM)",
    rateLimit: "30 requests/min",
    body: `{
  "question": "What was the peak wind in Mumbai in August 2023?"
}`,
    response: `{
  "question": "...",
  "station": "Mumbai",
  "year": 2023,
  "month": 8,
  "metric": "wind",
  "value": 20.7,
  "unit": "m/s",
  "source": "NOAA ISD (Rule 803(8))",
  "confidence": "exact",
  "message": "Peak Wind Speed in Mumbai (8/2023): 20.7 m/s",
  "processing_ms": 242
}`,
  },
  {
    method: "GET",
    path: "/api/weather",
    description: "Direct weather data lookup by station/year/month/metric",
    rateLimit: "Unlimited",
    body: `Query params:
  station_id=43003
  year=2023
  month=8
  metric=peak_wind_ms`,
    response: `{
  "value": 20.7,
  "station_id": "43003",
  "year": 2023,
  "month": 8,
  "metric": "peak_wind_ms"
}`,
  },
  {
    method: "GET",
    path: "/api/analytics",
    description: "System performance metrics and claim distribution",
    rateLimit: "Unlimited",
    body: "No body required.",
    response: `{
  "snapshot": {
    "total_claims": 7,
    "validated": 2,
    "rejected": 5,
    "approval_rate": 28.6,
    "avg_processing_ms": 1107,
    "total_customers": 3,
    "hallucinations_avoided_proj": 2
  },
  "timeline": [...],
  "label_distribution": [...],
  "stations": [...]
}`,
  },
];

const METHOD_COLOR: Record<string, string> = {
  GET:    "bg-green-500/15 text-green-400 border border-green-500/25",
  POST:   "bg-sky/12 text-sky border border-sky/25",
  PATCH:  "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  DELETE: "bg-red-500/15 text-red-400 border border-red-500/25",
};

export default function APIDocsPage() {
  return (
    <div className="relative min-h-screen bg-[#040810] overflow-hidden">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    <div className="relative z-[1] p-8 max-w-4xl space-y-8">

      <PageHeader
        title="API Reference"
        description="DREADNOUGHT ASRE v2 — REST API Documentation"
      />

      {/* Base URL */}
      <div className="glass-card-dark rounded-xl p-4 font-mono text-sm flex items-center gap-3">
        <span className="text-sky/50 flex-shrink-0 text-[10px] uppercase tracking-widest font-bold">Base URL</span>
        <span className="text-white/80">https://storm-platform.vercel.app</span>
      </div>

      {/* Auth notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300/80 leading-relaxed">
        <strong className="text-amber-300">Authentication:</strong> Routes are open for demo. Production should include{" "}
        <code className="bg-amber-500/15 px-1.5 py-0.5 rounded font-mono text-xs text-amber-300">Authorization: Bearer TOKEN</code>.
      </div>

      {/* Thresholds */}
      <div className="glass-card-dark rounded-2xl p-6 shadow-glass-md">
        <h2 className="text-sm font-bold text-white mb-4">ASRE Adjudication Thresholds</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Wind Threshold", value: "17.2 m/s",  sub: "Beaufort Force 8" },
            { label: "Exceedance",     value: "≥ 3 hours",  sub: "Above threshold"  },
            { label: "Search Radius",  value: "300 km",     sub: "Max station range" },
            { label: "IDW Power",      value: "2",          sub: "Inverse distance"  },
          ].map((t) => (
            <div key={t.label} className="p-4 bg-white/3 rounded-xl border border-white/8 text-center">
              <p className="text-xl font-extrabold text-sky">{t.value}</p>
              <p className="text-xs font-semibold text-white/70 mt-1">{t.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{t.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-5">
        {endpoints.map((ep, i) => (
          <div key={i} className="glass-card-dark rounded-2xl overflow-hidden shadow-glass-sm">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/8 bg-white/3">
              <span className={`px-2.5 py-1 rounded text-xs font-extrabold tracking-wide ${METHOD_COLOR[ep.method]}`}>
                {ep.method}
              </span>
              <code className="font-mono text-sm text-white/85">{ep.path}</code>
              <span className="ml-auto text-[10px] font-semibold text-white/30 bg-white/5 border border-white/8 px-2 py-1 rounded">
                {ep.rateLimit}
              </span>
            </div>
            <div className="p-5">
              <p className="text-sm text-white/55 mb-4">{ep.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Request</p>
                  <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-white/65 overflow-auto leading-relaxed">{ep.body}</pre>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Response</p>
                  <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-white/65 overflow-auto leading-relaxed">{ep.response}</pre>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 text-center text-xs text-white/20 font-mono">
        DREADNOUGHT ASRE v2 · Supabase · Groq LLM · NOAA ISD · DuckDB
      </div>
    </div>
    </div>
  );
}
