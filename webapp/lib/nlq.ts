/**
 * nlq.ts — Natural Language Query Engine (data-driven)
 *
 * Converts plain-English weather questions into Supabase lookups against the
 * LIVE station registry and the real weather_monthly_stats schema.
 *
 * Design note: this used to hardcode a stale 18-station list with fake 5-digit
 * IDs and a 2022–2023 window. After the NOAA rebuild (408 stations, 6-digit
 * USAF IDs, 2015–2024, wind-only schema) that broke every query. It now reads
 * stations live (like asre.ts) and only references columns that actually exist.
 */

import Groq from "groq-sdk";
import { getServiceClient } from "@/lib/supabase";

// ── Live station cache (5-min TTL), mirrors asre.ts ──────────────────────────
interface Stn { id: string; name: string }
let stationCache: Stn[] | null = null;
let stationCachedAt = 0;
const STATION_TTL_MS = 5 * 60 * 1000;

async function getStations(): Promise<Stn[]> {
  const now = Date.now();
  if (stationCache && now - stationCachedAt < STATION_TTL_MS) return stationCache;
  const supabase = getServiceClient();
  const { data, error } = await supabase.from("stations").select("id, name");
  if (error || !data) throw new Error(error?.message || "stations unavailable");
  stationCache = data as Stn[];
  stationCachedAt = now;
  return stationCache;
}

// Common city aliases → a token that appears in the NOAA station name.
const ALIASES: Record<string, string> = {
  mumbai: "bombay", bombay: "bombay",
  bengaluru: "bangalore", bangalore: "bangalore",
  kolkata: "calcutta", calcutta: "calcutta",
  madras: "chennai", chennai: "chennai",
  delhi: "delhi", "new delhi": "delhi",
};

// Only metrics that EXIST in weather_monthly_stats.
const METRICS: Record<string, { column: string; unit: string; label: string }> = {
  wind:            { column: "peak_wind_ms",     unit: "m/s",   label: "Peak Wind Speed" },
  "peak wind":     { column: "peak_wind_ms",     unit: "m/s",   label: "Peak Wind Speed" },
  "average wind":  { column: "avg_wind_ms",      unit: "m/s",   label: "Average Wind Speed" },
  "p95 wind":      { column: "p95_wind_ms",      unit: "m/s",   label: "95th-percentile Wind" },
  "gale force":    { column: "exceedance_hours", unit: "hours", label: "Gale-Force Hours" },
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

const YEAR_MIN = 2015;
const YEAR_MAX = 2024;

export interface QueryResult {
  question: string;
  station: string;
  year: number;
  month: number;
  metric: string;
  value: number | null;
  unit: string;
  source: string;
  confidence: number; // 0..1 (page renders confidence * 100)
  answer: string;     // human-readable message (page reads `answer`)
  message: string;    // kept for backwards-compat
  processing_ms: number;
}

// ── Deterministic extraction ─────────────────────────────────────────────────
function detectMetric(q: string): string {
  const s = q.toLowerCase();
  if (/\b(average|avg|mean)\s+wind/.test(s)) return "average wind";
  if (/\bp95|95th/.test(s)) return "p95 wind";
  if (/\bgale|exceedance|storm\s*hours?/.test(s)) return "gale force";
  return "wind"; // default: peak wind
}

function detectYear(q: string): number | null {
  const m = q.match(/\b(20(?:1[5-9]|2[0-4]))\b/);
  return m ? parseInt(m[1], 10) : null;
}

function detectMonth(q: string): number | null {
  const s = q.toLowerCase();
  for (const [name, num] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${name}\\b`).test(s)) return num;
  }
  const ym = s.match(/\b20\d{2}[-/](\d{1,2})\b/) || s.match(/\b(\d{1,2})[-/]20\d{2}\b/);
  if (ym) { const n = parseInt(ym[1], 10); if (n >= 1 && n <= 12) return n; }
  return null;
}

function resolveStation(input: string, stations: Stn[]): Stn | null {
  let norm = input.toLowerCase().trim();
  norm = ALIASES[norm] || norm;
  if (!norm) return null;
  // exact name, then substring either direction (longest name token wins)
  let best: Stn | null = null;
  for (const st of stations) {
    const name = st.name.toLowerCase();
    if (name === norm) return st;
    if (name.includes(norm) || norm.includes(name.split(/[\s/]/)[0])) {
      if (!best || st.name.length < best.name.length) best = st;
    }
  }
  return best;
}

// Scan the whole question against live station names (handles "wind in Surat").
function extractStationFromQuestion(q: string, stations: Stn[]): Stn | null {
  const s = q.toLowerCase();
  // alias tokens first
  for (const [alias, token] of Object.entries(ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`).test(s)) {
      const hit = resolveStation(token, stations);
      if (hit) return hit;
    }
  }
  let best: Stn | null = null;
  for (const st of stations) {
    const first = st.name.toLowerCase().split(/[\s/]/)[0];
    if (first.length >= 4 && new RegExp(`\\b${first}\\b`).test(s)) {
      if (!best || first.length > best.name.split(/[\s/]/)[0].length) best = st;
    }
  }
  return best;
}

async function groqStationFallback(question: string): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  try {
    const client = new Groq({ apiKey: key });
    const r = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 12,
      messages: [
        { role: "system", content: "Extract ONLY the Indian city name from the weather question. Reply with the city name alone, or NONE." },
        { role: "user", content: question },
      ],
    });
    const city = (r.choices[0].message.content || "").trim();
    return city && city.toUpperCase() !== "NONE" ? city : null;
  } catch {
    return null;
  }
}

const noData = (question: string, station: string, year: number, month: number, metric: string, unit: string, msg: string, t0: number): QueryResult => ({
  question, station, year, month, metric, value: null, unit,
  source: "NOAA ISD (Rule 803(8))", confidence: 0, answer: msg, message: msg,
  processing_ms: Date.now() - t0,
});

export async function queryWeather(question: string): Promise<QueryResult> {
  const t0 = Date.now();
  try {
    const stations = await getStations();

    // Station: deterministic scan → Groq fallback → give up
    let station = extractStationFromQuestion(question, stations);
    if (!station) {
      const guess = await groqStationFallback(question);
      if (guess) station = resolveStation(guess, stations);
    }
    if (!station) {
      return noData(question, "Unknown", 0, 0, "unknown", "",
        "Couldn't identify a station. Try a city like Surat, Pune, Jaipur, Chennai, or Bombay.", t0);
    }

    const metricKey = detectMetric(question);
    const metric = METRICS[metricKey];
    const year = detectYear(question);
    const month = detectMonth(question);

    // Build the lookup. If year/month are missing, fall back to the most recent
    // available record for this station+metric instead of guessing a window.
    const supabase = getServiceClient();
    let q = supabase
      .from("weather_monthly_stats")
      .select(`${metric.column}, year, month`)
      .eq("station_id", station.id);
    if (year) q = q.eq("year", year);
    if (month) q = q.eq("month", month);
    q = q.order("year", { ascending: false }).order("month", { ascending: false }).limit(1);

    const { data, error } = await q;
    if (error) {
      return noData(question, station.name, year ?? 0, month ?? 0, metricKey, metric.unit,
        `Lookup failed for ${station.name}. Please try again.`, t0);
    }
    const row: any = data?.[0];
    if (!row) {
      const span = year || month ? ` for ${month ?? "?"}/${year ?? "?"}` : "";
      return noData(question, station.name, year ?? 0, month ?? 0, metricKey, metric.unit,
        `No ${metric.label.toLowerCase()} on record for ${station.name}${span}. Data covers ${YEAR_MIN}–${YEAR_MAX}.`, t0);
    }

    const value = typeof row[metric.column] === "number" ? row[metric.column] : null;
    const ry = row.year as number;
    const rm = row.month as number;
    const dated = year && month ? "" : " (most recent on record)";

    return {
      question,
      station: station.name,
      year: ry,
      month: rm,
      metric: metricKey,
      value,
      unit: metric.unit,
      source: "NOAA ISD (Rule 803(8))",
      confidence: value !== null ? 1 : 0,
      answer:
        value !== null
          ? `${metric.label} at ${station.name} (${rm}/${ry})${dated}: ${value} ${metric.unit}.`
          : `No ${metric.label.toLowerCase()} value recorded for ${station.name} (${rm}/${ry}).`,
      message:
        value !== null
          ? `${metric.label} at ${station.name} (${rm}/${ry}): ${value} ${metric.unit}`
          : `No data for ${station.name} (${rm}/${ry}).`,
      processing_ms: Date.now() - t0,
    };
  } catch (err) {
    return noData(question, "Error", 0, 0, "error", "",
      `Error processing query: ${String(err).slice(0, 120)}`, t0);
  }
}
