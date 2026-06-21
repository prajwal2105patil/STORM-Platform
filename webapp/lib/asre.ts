/**
 * asre.ts — ASRE Core Logic (TypeScript port of the Python engine)
 *
 * Implements the 4-node LangGraph state machine:
 *   Node 1: Intent Router (validation)
 *   Node 2: SQL Generator (nearest station via IDW)
 *   Node 3: Execution Cage (Supabase weather lookup)
 *   Node 4: Adjudicator (deterministic decision)
 *
 * LLM (Groq) is used ONLY at Node 1 for cause classification.
 * All other nodes are fully deterministic.
 */

import { getServiceClient } from "./supabase";
import { ClaimPayload, AdjudicationResult, Station, WeatherStats } from "@/types";
import Groq from "groq-sdk";

// ── Thresholds (env-overridable policy knobs) ───────────────────────────────
// Changing these is a deliberate legal/product decision — see
// benchmarks/HISTORICAL_VALIDATION.md for the sensitivity analysis.
// ASRE_GUST_FACTOR=1.4 + ASRE_EXCEEDANCE_HOURS=1 → 58% recall, 0 FP on controls.
const WIND_THRESHOLD_MS = parseFloat(process.env.ASRE_WIND_THRESHOLD_MS || "17.2");
const EXCEEDANCE_HOURS  = parseInt(process.env.ASRE_EXCEEDANCE_HOURS || "3", 10);
const GUST_FACTOR       = parseFloat(process.env.ASRE_GUST_FACTOR || "1.0");
const MAX_RANGE_KM      = parseFloat(process.env.ASRE_MAX_RANGE_KM || "300.0");
const IDW_POWER         = parseInt(process.env.ASRE_IDW_POWER || "2", 10);

// Groq model is env-overridable so a model retirement can be fixed by setting
// GROQ_MODEL in Vercel — no redeploy of code needed. Default tracks a current,
// supported Groq production model.
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

// Cache stations in module memory — they never change between requests
let stationsCache: Station[] | null = null;
let stationsCachedAt = 0;
const STATIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache Groq cause classification — same cause always yields same result
const causeCache = new Map<string, boolean>();

const VALID_CAUSES = new Set([
  "cyclone", "hurricane", "typhoon", "tornado", "storm", "gale",
  "high wind", "wind storm", "strong wind", "severe wind",
  "extreme weather", "force majeure", "weather event", "storm surge",
]);

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── IDW nearest station ───────────────────────────────────────────────────────
function nearestStation(
  lat: number,
  lon: number,
  stations: Station[]
): { station: Station; distKm: number; confidence: number } | null {
  const distances = stations.map((s) => ({
    station: s,
    distKm: haversine(lat, lon, s.lat, s.lon),
  }));

  const inRange = distances.filter((d) => d.distKm <= MAX_RANGE_KM);
  if (inRange.length === 0) return null;

  inRange.sort((a, b) => a.distKm - b.distKm);
  const nearest = inRange[0];

  // Compute IDW confidence weight for nearest station
  if (nearest.distKm < 0.001) {
    return { station: nearest.station, distKm: 0, confidence: 1.0 };
  }
  const weights = inRange.map((d) => 1 / d.distKm ** IDW_POWER);
  const totalW  = weights.reduce((a, b) => a + b, 0);
  const confidence = weights[0] / totalW;

  return { station: nearest.station, distKm: nearest.distKm, confidence };
}

// Negation cues: a claim that explicitly denies a weather event cannot be a
// qualifying force-majeure cause ("there was no storm").
const NEGATION_RE = /\b(no|not|without|absence of|lack of|never|none)\b/;

// Build a word-boundary matcher per valid cause so "brainstorm" does NOT match
// "storm" and "snowstorm" does. Multi-word causes allow flexible whitespace.
function hasWeatherKeyword(text: string): boolean {
  for (const valid of VALID_CAUSES) {
    const pattern = valid.replace(/\s+/g, "\\s+");
    if (new RegExp(`(^|[^a-z])${pattern}([^a-z]|$)`).test(text)) return true;
  }
  return false;
}

// ── Groq LLM cause classification ────────────────────────────────────────────
async function classifyCause(claimedCause: string): Promise<boolean> {
  const normalised = claimedCause.toLowerCase().trim();
  const negated = NEGATION_RE.test(normalised);

  // A negated cause is never a qualifying event — deterministic, no LLM.
  if (negated) return false;

  // Fast path 1: word-boundary keyword match (no LLM needed)
  if (hasWeatherKeyword(normalised)) return true;

  // Fast path 2: in-memory cache (same cause = same result always)
  if (causeCache.has(normalised)) {
    return causeCache.get(normalised)!;
  }

  // LLM path: Groq for ambiguous cases
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return false;

  try {
    const client  = new Groq({ apiKey: groqKey });
    const message = await client.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 5,
      messages: [
        { role: "system", content: 'Classify if weather-related force majeure. Reply YES or NO only.' },
        { role: "user", content: `"${claimedCause}"` },
      ],
    });
    const result = (message.choices[0].message.content?.trim().toUpperCase() || "").startsWith("YES");
    // Cache deterministically, but cap size so the map can't grow without bound.
    if (causeCache.size > 2000) causeCache.clear();
    causeCache.set(normalised, result);
    return result;
  } catch {
    return false;
  }
}

// ── Main ASRE adjudication function ──────────────────────────────────────────
export async function adjudicate(payload: ClaimPayload): Promise<AdjudicationResult> {
  const startMs   = Date.now();
  const nodePath: string[] = [];
  const supabase  = getServiceClient();

  const base = {
    petitioner: payload.petitioner,
    asset_name: payload.asset_name,
    start_date: payload.start_date,
    end_date:   payload.end_date,
    timestamp:  new Date().toISOString(),
  };

  // ── NODE 1: Intent Router (Validation) ─────────────────────────────────
  nodePath.push("IntentRouter");

  // Date validation
  const start = new Date(payload.start_date);
  const end   = new Date(payload.end_date);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { ...base, label: "REJECTED_MISSING_DATES", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: "Claim rejected: missing or invalid date range." };
  }

  // Coordinate validation
  const lat = payload.asset_lat;
  const lon = payload.asset_lon;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) {
    return { ...base, label: "REJECTED_MALFORMED_COORDS", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: "Claim rejected: asset coordinates are invalid or Null Island (0,0)." };
  }

  // NODE 1 + NODE 2 run in PARALLEL: classify cause AND fetch stations simultaneously
  const fetchStations = async (): Promise<Station[]> => {
    const now = Date.now();
    if (stationsCache && (now - stationsCachedAt) < STATIONS_CACHE_TTL_MS) {
      return stationsCache;
    }
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("stations")
      .select("id, name, lat, lon, state");
    if (error || !data) throw new Error(error?.message || "No stations found");
    stationsCache = data as Station[];
    stationsCachedAt = now;
    return stationsCache;
  };

  const [isWeather, stations] = await Promise.allSettled([
    classifyCause(payload.claimed_cause),
    fetchStations(),
  ]);

  if (isWeather.status === "fulfilled" && !isWeather.value) {
    return { ...base, label: "REJECTED_NON_WEATHER", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `Claim rejected: "${payload.claimed_cause}" is not a qualifying weather event.` };
  }

  // ── NODE 2: SQL Generator (IDW Spatial Lookup) ──────────────────────────
  nodePath.push("SQLGenerator");

  if (stations.status === "rejected" || !stations.value || stations.value.length === 0) {
    const errMsg = stations.status === "rejected" ? String(stations.reason) : "empty result";
    return { ...base, label: "INSUFFICIENT_DATA", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `System error: station registry unavailable. [${errMsg}]` };
  }

  const stationList = stations.value;

  const nearest = nearestStation(lat, lon, stationList);
  if (!nearest) {
    return { ...base, label: "INSUFFICIENT_DATA", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `No NOAA ISD station within ${MAX_RANGE_KM} km of asset coordinates (${lat}, ${lon}).` };
  }

  // Multi-station IDW: find ALL stations within range, weight by inverse distance
  const allInRange = stationList
    .map((s) => ({ station: s, distKm: haversine(lat, lon, s.lat, s.lon) }))
    .filter((d) => d.distKm <= MAX_RANGE_KM)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 5); // top 5 nearest stations

  // ── NODE 3: Execution Cage (Supabase weather lookup) ────────────────────
  nodePath.push("ExecutionCage");

  // Collect all (year, month) pairs in the claim window with deduplication
  const seenPairs = new Set<string>();
  const ymPairs: Array<{ year: number; month: number }> = [];
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const key = `${y}-${m}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      ymPairs.push({ year: y, month: m });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  // Build OR filter for ALL nearby stations across all (year, month) pairs
  const stationIds = allInRange.map((d) => d.station.id);

  // Guard: if no stations or no time pairs, fail gracefully
  if (stationIds.length === 0 || ymPairs.length === 0) {
    return { ...base, label: "INSUFFICIENT_DATA", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `No stations in range or no valid time period.` };
  }

  const clauses = ymPairs.flatMap(({ year, month }) =>
    stationIds.map((sid) =>
      `and(station_id.eq.${sid},year.eq.${year},month.eq.${month})`
    )
  );

  // Chunk the OR-clauses so a long claim window (many months × 5 stations)
  // can't blow past PostgREST's request-URL length limit. Batches run in
  // parallel and results are merged.
  const OR_CHUNK = 40;
  const batches: string[] = [];
  for (let i = 0; i < clauses.length; i += OR_CHUNK) {
    batches.push(clauses.slice(i, i + OR_CHUNK).join(","));
  }
  const batchResults = await Promise.all(
    batches.map((b) => supabase.from("weather_monthly_stats").select("*").or(b))
  );
  const weatherRows = batchResults.flatMap((r) => r.data || []);

  if (!weatherRows || weatherRows.length === 0) {
    const ymDisplay = ymPairs.map((p) => `${p.year}/${p.month}`).join(", ");
    return {
      ...base,
      label: "REJECTED_WRONG_MONTH",
      node_path: nodePath,
      nearest_station: nearest.station.name,
      nearest_station_id: nearest.station.id,
      nearest_station_km: Math.round(nearest.distKm * 10) / 10,
      processing_ms: Date.now() - startMs,
      legal_summary: `No NOAA ISD data for ${nearest.station.name} in ${ymDisplay}. Cannot adjudicate.`,
    };
  }

  // IDW-weighted aggregation across all stations
  const stats = weatherRows as WeatherStats[];

  // For each (year, month), compute IDW-weighted peak wind across stations
  let idwPeakWind = 0;
  // Best SINGLE-month sustained exceedance across the window — NOT the sum.
  // Summing non-contiguous months could validate two brief gusts weeks apart
  // as one "sustained" event; a force-majeure gale must clear the ≥3h bar
  // within a single calendar month. Conservative by design (legal safety).
  let bestExceedance = 0;

  for (const ym of ymPairs) {
    const monthRows = stats.filter(
      (s: any) => s.year === ym.year && s.month === ym.month
    );
    if (monthRows.length === 0) continue;

    // IDW weights for this month's stations
    const weighted = monthRows.map((row: any) => {
      const stDist = allInRange.find((d) => d.station.id === row.station_id);
      const dist = stDist?.distKm || 1;
      const weight = dist < 0.001 ? 1e6 : 1 / Math.pow(dist, IDW_POWER);
      return { weight, peak_wind_ms: row.peak_wind_ms, exceedance_hours: row.exceedance_hours };
    });

    const totalW = weighted.reduce((a, b) => a + b.weight, 0);
    const idwWind = weighted.reduce((a, b) => a + (b.weight / totalW) * b.peak_wind_ms, 0);
    const maxExceedance = Math.max(...weighted.map((w) => w.exceedance_hours));

    idwPeakWind = Math.max(idwPeakWind, idwWind);
    bestExceedance = Math.max(bestExceedance, maxExceedance);
  }

  const peakWind = idwPeakWind > 0 ? idwPeakWind : Math.max(...stats.map((s: any) => s.peak_wind_ms));
  const effectiveWind = peakWind * GUST_FACTOR;

  // ── NODE 4: Adjudicator (Deterministic Decision) ────────────────────────
  nodePath.push("Adjudicator");

  const validated =
    effectiveWind >= WIND_THRESHOLD_MS && bestExceedance >= EXCEEDANCE_HOURS;

  const label = validated ? "VALIDATED" : "REJECTED_BELOW_THRESHOLD";

  const gustNote = GUST_FACTOR !== 1.0 ? ` (×${GUST_FACTOR} gust factor → ${effectiveWind.toFixed(1)} m/s)` : "";
  const legalSummary = validated
    ? `VALIDATED — NOAA public record. Station: ${nearest.station.name} ` +
      `(${Math.round(nearest.distKm)}km). Peak wind: ${peakWind.toFixed(1)} m/s${gustNote}. ` +
      `Exceedance: ${bestExceedance}h ≥ ${EXCEEDANCE_HOURS}h threshold.`
    : `REJECTED: Peak wind ${peakWind.toFixed(1)} m/s${gustNote} (threshold ${WIND_THRESHOLD_MS} m/s) ` +
      `or exceedance ${bestExceedance}h < ${EXCEEDANCE_HOURS}h required. ` +
      `Station: ${nearest.station.name}.`;

  return {
    ...base,
    label,
    nearest_station:    nearest.station.name,
    nearest_station_id: nearest.station.id,
    nearest_station_km: Math.round(nearest.distKm * 10) / 10,
    peak_wind_ms:       Math.round(peakWind * 100) / 100,
    exceedance_hours:   bestExceedance,
    idw_confidence:     Math.round(nearest.confidence * 1000) / 1000,
    node_path:          nodePath,
    processing_ms:      Date.now() - startMs,
    legal_summary:      legalSummary,
  };
}
