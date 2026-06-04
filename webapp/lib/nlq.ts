/**
 * nlq.ts — Natural Language Query Engine
 *
 * Converts plain English questions about weather into structured Supabase queries.
 * Uses Groq Llama 3.1 for intent extraction (free tier, no cost).
 *
 * Example inputs:
 *   "What was the peak wind in Mumbai in July 2022?"
 *   "Average temperature in Surat during August 2023?"
 *   "How many hours exceeded gale force in Mumbai last August?"
 */

import Groq from "groq-sdk";

// 18-station registry for fuzzy matching
const STATIONS = [
  { id: "42182", name: "Jaisalmer", lat: 26.909, lon: 70.9 },
  { id: "42339", name: "Bikaner", lat: 28.07, lon: 73.3 },
  { id: "42367", name: "Jodhpur", lat: 26.3, lon: 73.02 },
  { id: "42492", name: "Jaipur", lat: 26.82, lon: 75.8 },
  { id: "42647", name: "Ahmedabad", lat: 23.07, lon: 72.63 },
  { id: "42680", name: "Rajkot", lat: 22.3, lon: 70.77 },
  { id: "42701", name: "Bhuj", lat: 23.25, lon: 69.67 },
  { id: "42867", name: "Surat", lat: 21.2, lon: 72.84 },
  { id: "43003", name: "Mumbai", lat: 19.09, lon: 72.85 },
  { id: "43057", name: "Pune", lat: 18.53, lon: 73.86 },
  { id: "43150", name: "Nagpur", lat: 21.1, lon: 79.05 },
  { id: "43285", name: "Hyderabad", lat: 17.45, lon: 78.47 },
  { id: "43346", name: "Chennai", lat: 13.0, lon: 80.18 },
  { id: "43430", name: "Bangalore", lat: 12.97, lon: 77.58 },
  { id: "43466", name: "Kochi", lat: 9.97, lon: 76.28 },
  { id: "42650", name: "Vadodara", lat: 22.36, lon: 73.23 },
  { id: "42971", name: "Bhopal", lat: 23.28, lon: 77.35 },
  { id: "43128", name: "Kolhapur", lat: 16.71, lon: 74.24 },
];

// Supported metrics and their database columns
const METRICS = {
  wind: { column: "peak_wind_ms", unit: "m/s", label: "Peak Wind Speed" },
  "gale force": { column: "exceedance_hours", unit: "hours", label: "Gale Force Hours" },
  temperature: { column: "avg_temp_c", unit: "°C", label: "Average Temperature" },
  pressure: { column: "avg_pressure_hpa", unit: "hPa", label: "Average Pressure" },
  humidity: { column: "avg_humidity_pct", unit: "%", label: "Average Humidity" },
};

export interface QueryResult {
  question: string;
  station: string;
  year: number;
  month: number;
  metric: string;
  value: number | null;
  unit: string;
  source: string;
  confidence: "exact" | "partial" | "no_data";
  message: string;
  processing_ms: number;
}

// Fuzzy match station name to station ID
function fuzzyMatchStation(input: string): { id: string; name: string } | null {
  const normalized = input.toLowerCase().trim();

  for (const station of STATIONS) {
    if (
      station.name.toLowerCase() === normalized ||
      station.name.toLowerCase().includes(normalized) ||
      normalized.includes(station.name.toLowerCase())
    ) {
      return { id: station.id, name: station.name };
    }
  }
  return null;
}

// Fallback regex-based station extraction if Groq fails
function fallbackStationExtraction(question: string): string | null {
  const stationNames = STATIONS.map((s) => s.name.toLowerCase());
  const qLower = question.toLowerCase();
  for (const name of stationNames) {
    if (qLower.includes(name)) {
      return STATIONS.find((s) => s.name.toLowerCase() === name)?.name || null;
    }
  }
  return null;
}

// Extract year/month from question using Groq
async function extractIntents(question: string): Promise<{
  station: string | null;
  metric: string | null;
  year: number | null;
  month: number | null;
}> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn("GROQ_API_KEY not found, using fallback extraction");
    return {
      station: fallbackStationExtraction(question),
      metric: null,
      year: null,
      month: null,
    };
  }

  try {
    const client = new Groq({ apiKey: groqKey });
    const message = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are a JSON extraction tool. Your ONLY job is to extract weather query parameters.

CRITICAL: Return ONLY valid JSON on a single line. No explanation. No markdown.

Extract these fields:
{
  "station": "exact city name from question or null",
  "metric": "wind" | "gale" | "temperature" | "pressure" | "humidity" or null,
  "year": year number (2022-2023) or null,
  "month": month number 1-12 or null
}

Station names available: Mumbai, Surat, Jaipur, Pune, Bangalore, Chennai, Hyderabad, Kolkata

Examples:
Q: "peak wind in Mumbai August 2023" → {"station":"Mumbai","metric":"wind","year":2023,"month":8}
Q: "average temperature in Surat" → {"station":"Surat","metric":"temperature","year":2023,"month":8}
Q: "gale hours in Jaipur July 2022" → {"station":"Jaipur","metric":"gale","year":2022,"month":7}`,
        },
        {
          role: "user",
          content: `Extract: ${question}`,
        },
      ],
    });

    const reply = (message.choices[0].message.content || "{}").trim();
    console.log("[NLQ] Groq response:", reply);

    const parsed = JSON.parse(reply);

    // Fallback to regex if Groq returns null station
    const station = parsed.station || fallbackStationExtraction(question);

    return {
      station,
      metric: parsed.metric || null,
      year: parsed.year || null,
      month: parsed.month || null,
    };
  } catch (err) {
    console.error("[NLQ] Intent extraction error:", err);
    return {
      station: fallbackStationExtraction(question),
      metric: null,
      year: null,
      month: null,
    };
  }
}

export async function queryWeather(question: string, origin?: string): Promise<QueryResult> {
  const startMs = Date.now();

  try {
    const intents = await extractIntents(question);

    // Match station
    const stationMatch = intents.station
      ? fuzzyMatchStation(intents.station)
      : null;
    if (!stationMatch) {
      return {
        question,
        station: "Unknown",
        year: 0,
        month: 0,
        metric: "unknown",
        value: null,
        unit: "",
        source: "NOAA ISD (Rule 803(8))",
        confidence: "no_data",
        message: `Station "${intents.station}" not found. Try: Mumbai, Surat, Jaipur, Chennai, Bangalore.`,
        processing_ms: Date.now() - startMs,
      };
    }

    // Match metric
    let metricKey = intents.metric;

    // Handle aliases
    if (metricKey === "gale") metricKey = "gale force";
    if (metricKey === "temp") metricKey = "temperature";
    if (metricKey === "wind speed") metricKey = "wind";
    if (metricKey === "humidity level") metricKey = "humidity";

    if (!metricKey || !METRICS[metricKey as keyof typeof METRICS]) {
      return {
        question,
        station: stationMatch.name,
        year: intents.year || 0,
        month: intents.month || 0,
        metric: intents.metric || "unknown",
        value: null,
        unit: "",
        source: "NOAA ISD (Rule 803(8))",
        confidence: "no_data",
        message: `Metric "${intents.metric}" not recognized. Try: wind, gale force, temperature, pressure, humidity.`,
        processing_ms: Date.now() - startMs,
      };
    }

    const metric = METRICS[metricKey as keyof typeof METRICS];

    // Default to most recent available data (Aug 2023 for Mumbai/Surat)
    // Our sample data has: 2022 (Jul, Aug, Sep) and 2023 (Aug)
    let year = intents.year;
    let month = intents.month;

    // Smart defaulting
    if (!year && !month) {
      // No date specified → use most recent (Aug 2023)
      year = 2023;
      month = 8;
    } else if (!year && month) {
      // Only month specified → assume 2023 (most recent)
      year = 2023;
    } else if (year && !month) {
      // Only year specified → default to August
      month = 8;
    } else if (!year || !month) {
      // Fallback if still null
      year = 2023;
      month = 8;
    }

    // Validate year/month are in available range
    if (!year || !month || year < 2022 || year > 2023 || month < 1 || month > 12) {
      return {
        question,
        station: stationMatch.name,
        year: year || 0,
        month: month || 0,
        metric: metricKey,
        value: null,
        unit: metric.unit,
        source: "NOAA ISD (Rule 803(8))",
        confidence: "no_data",
        message: `Data available for ${stationMatch.name} only in: July-September 2022, August 2023.`,
        processing_ms: Date.now() - startMs,
      };
    }

    // At this point, year and month must be non-null (ensured by defaults above)
    const safeYear = year as number;
    const safeMonth = month as number;

    // Query weather API
    const weatherUrl = `/api/weather?station_id=${stationMatch.id}&year=${safeYear}&month=${safeMonth}&metric=${metric.column}`;

    // Construct full URL (use passed origin or construct from environment)
    let fullUrl = weatherUrl;
    if (typeof window === "undefined") {
      const baseUrl = origin
        || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : `http://localhost:3000`;
      fullUrl = origin ? `${origin}${weatherUrl}` : `${baseUrl}${weatherUrl}`;
    }

    console.log(`[NLQ] Fetching from ${fullUrl}`);
    const res = await fetch(fullUrl);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[NLQ] Weather API error: ${res.status}`, errorText);
      return {
        question,
        station: stationMatch.name,
        year: safeYear,
        month: safeMonth,
        metric: metricKey,
        value: null,
        unit: metric.unit,
        source: "NOAA ISD (Rule 803(8))",
        confidence: "no_data",
        message: `No data available for ${stationMatch.name} in ${safeMonth}/${safeYear}.`,
        processing_ms: Date.now() - startMs,
      };
    }

    const data = await res.json();
    console.log(`[NLQ] Weather data received:`, data);
    const value = data.value;

    return {
      question,
      station: stationMatch.name,
      year: safeYear,
      month: safeMonth,
      metric: metricKey,
      value,
      unit: metric.unit,
      source: "NOAA ISD (Rule 803(8))",
      confidence: value !== null ? "exact" : "no_data",
      message:
        value !== null
          ? `${metric.label} in ${stationMatch.name} (${safeMonth}/${safeYear}): ${value} ${metric.unit}`
          : `No ${metricKey} data for ${stationMatch.name} in ${safeMonth}/${safeYear}.`,
      processing_ms: Date.now() - startMs,
    };
  } catch (err) {
    return {
      question,
      station: "Error",
      year: 0,
      month: 0,
      metric: "error",
      value: null,
      unit: "",
      source: "NOAA ISD (Rule 803(8))",
      confidence: "no_data",
      message: `Error processing query: ${String(err).substring(0, 100)}`,
      processing_ms: Date.now() - startMs,
    };
  }
}
