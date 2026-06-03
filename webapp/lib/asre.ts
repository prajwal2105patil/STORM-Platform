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

// ── Constants ────────────────────────────────────────────────────────────────
const WIND_THRESHOLD_MS = 17.2;   // Beaufort 8 gale force (m/s)
const EXCEEDANCE_HOURS  = 3;      // minimum hours above threshold
const MAX_RANGE_KM      = 300.0;  // max station search radius
const IDW_POWER         = 2;

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

// ── Groq LLM cause classification ────────────────────────────────────────────
async function classifyCause(claimedCause: string): Promise<boolean> {
  const normalised = claimedCause.toLowerCase().trim();

  // Fast path: exact match
  for (const valid of VALID_CAUSES) {
    if (normalised.includes(valid)) return true;
  }

  // LLM path: Groq for ambiguous cases
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    // No LLM available — conservative reject
    return false;
  }

  try {
    const client  = new Groq({ apiKey: groqKey });
    const message = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 10,
      messages: [
        {
          role: "system",
          content:
            'You classify whether a force majeure cause is weather-related. Reply with only "YES" or "NO".',
        },
        {
          role: "user",
          content: `Is this a weather-related cause of loss: "${claimedCause}"?`,
        },
      ],
    });
    const reply = message.choices[0].message.content?.trim().toUpperCase() || "";
    return reply.startsWith("YES");
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

  // Cause validation (LLM-assisted)
  const isWeather = await classifyCause(payload.claimed_cause);
  if (!isWeather) {
    return { ...base, label: "REJECTED_NON_WEATHER", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `Claim rejected: "${payload.claimed_cause}" is not a qualifying weather event.` };
  }

  // ── NODE 2: SQL Generator (IDW Spatial Lookup) ──────────────────────────
  nodePath.push("SQLGenerator");

  const { data: stations } = await supabase.from("stations").select("*");
  if (!stations || stations.length === 0) {
    return { ...base, label: "INSUFFICIENT_DATA", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: "System error: station registry unavailable." };
  }

  const nearest = nearestStation(lat, lon, stations as Station[]);
  if (!nearest) {
    return { ...base, label: "INSUFFICIENT_DATA", node_path: nodePath,
      processing_ms: Date.now() - startMs,
      legal_summary: `No NOAA ISD station within ${MAX_RANGE_KM} km of asset coordinates (${lat}, ${lon}).` };
  }

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

  // Build a Supabase OR filter across all (year, month) pairs
  const orFilters = ymPairs
    .map(
      ({ year, month }) =>
        `and(station_id.eq.${nearest.station.id},year.eq.${year},month.eq.${month})`
    )
    .join(",");

  const { data: weatherRows } = await supabase
    .from("weather_monthly_stats")
    .select("*")
    .or(orFilters);

  if (!weatherRows || weatherRows.length === 0) {
    const ymDisplay = ymPairs.map((p) => `${p.year}/${p.month}`).join(", ");
    return {
      ...base,
      label: "REJECTED_WRONG_MONTH",
      node_path: nodePath,
      nearest_station: nearest.station.name,
      nearest_station_km: Math.round(nearest.distKm * 10) / 10,
      processing_ms: Date.now() - startMs,
      legal_summary: `No NOAA ISD data for ${nearest.station.name} in ${ymDisplay}. Cannot adjudicate.`,
    };
  }

  // Aggregate across months
  const stats = weatherRows as WeatherStats[];
  const peakWind = Math.max(...stats.map((s) => s.peak_wind_ms));
  const totalExceedance = stats.reduce((a, s) => a + s.exceedance_hours, 0);

  // ── NODE 4: Adjudicator (Deterministic Decision) ────────────────────────
  nodePath.push("Adjudicator");

  const validated =
    peakWind >= WIND_THRESHOLD_MS && totalExceedance >= EXCEEDANCE_HOURS;

  const label = validated ? "VALIDATED" : "REJECTED_BELOW_THRESHOLD";

  const legalSummary = validated
    ? `VALIDATED under NOAA Rule 803(8). Station: ${nearest.station.name} ` +
      `(${Math.round(nearest.distKm)}km). Peak wind: ${peakWind.toFixed(1)} m/s. ` +
      `Exceedance: ${totalExceedance}h ≥ ${EXCEEDANCE_HOURS}h threshold.`
    : `REJECTED: Peak wind ${peakWind.toFixed(1)} m/s (threshold ${WIND_THRESHOLD_MS} m/s) ` +
      `or exceedance ${totalExceedance}h < ${EXCEEDANCE_HOURS}h required. ` +
      `Station: ${nearest.station.name}.`;

  return {
    ...base,
    label,
    nearest_station:    nearest.station.name,
    nearest_station_km: Math.round(nearest.distKm * 10) / 10,
    peak_wind_ms:       Math.round(peakWind * 100) / 100,
    exceedance_hours:   totalExceedance,
    idw_confidence:     Math.round(nearest.confidence * 1000) / 1000,
    node_path:          nodePath,
    processing_ms:      Date.now() - startMs,
    legal_summary:      legalSummary,
  };
}
