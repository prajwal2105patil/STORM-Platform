/**
 * validate-historical.mjs — Ground-truth validation against the documented
 * meteorological record (NOT synthetic claims).
 *
 * WHAT THIS IS
 *   The /benchmark page reports 99.7% F1 on 1,000 SYNTHETIC claims vs a
 *   SIMULATED control. That proves internal consistency, not real-world skill.
 *   This harness instead asks the only question a buyer cares about:
 *
 *     "When a real, documented cyclone hit a real place on a real date, does
 *      the engine — running on the actual NOAA ISD record — return VALIDATED?
 *      And during documented calm periods, does it correctly REJECT?"
 *
 *   Ground truth = IMD / JTWC best-track public record (severe cyclonic storms
 *   that made landfall on the Indian coast, 2015–2025). Coordinates are
 *   approximate landfall points and should be cross-checked against IMD RSMC
 *   bulletins before any external use.
 *
 * HOW IT STAYS HONEST
 *   - Read-only. It replicates lib/asre.ts EXACTLY (haversine → 300km → top-5
 *     IDW peak wind → ≥17.2 m/s & ≥3h) but does NOT call /api/adjudicate, so it
 *     writes nothing to the claims table and cannot skew the dashboard.
 *   - A "miss" (documented cyclone the engine REJECTs) is reported as a
 *     COVERAGE GAP with the reason (nearest-station distance, recorded sustained
 *     wind), not hidden. NOAA ISD reports hourly-MEAN wind; a cyclone's extreme
 *     GUSTS at the eyewall are often not captured as sustained mean wind at a
 *     station tens of km away. That operating envelope is the deliverable.
 *
 * RUN:  node scripts/validate-historical.mjs   (from webapp/)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Engine constants (mirror lib/asre.ts) ────────────────────────────────────
const WIND_THRESHOLD_MS = 17.2;
const EXCEEDANCE_HOURS  = 3;
const MAX_RANGE_KM      = 300.0;
const IDW_POWER         = 2;

// ── Load env from .env.local WITHOUT printing secrets ────────────────────────
function loadEnv() {
  let raw = "";
  try { raw = readFileSync(join(ROOT, ".env.local"), "utf8"); }
  catch { console.error("Cannot read webapp/.env.local"); process.exit(1); }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Haversine + IDW (verbatim from lib/asre.ts) ──────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Ground-truth event set ───────────────────────────────────────────────────
// Documented severe/very-severe cyclonic storms (IMD RSMC), landfall approx.
// `expect: "VALIDATE"` = a severe wind event genuinely occurred here/then.
const CYCLONES = [
  { name: "Cyclone Tauktae",   lat: 20.85, lon: 71.05, year: 2021, month: 5,  place: "Una, Gujarat" },
  { name: "Cyclone Yaas",      lat: 21.60, lon: 86.95, year: 2021, month: 5,  place: "Dhamra, Odisha" },
  { name: "Cyclone Amphan",    lat: 21.65, lon: 88.30, year: 2020, month: 5,  place: "Sundarbans, WB" },
  { name: "Cyclone Fani",      lat: 19.80, lon: 85.83, year: 2019, month: 5,  place: "Puri, Odisha" },
  { name: "Cyclone Nivar",     lat: 12.00, lon: 79.85, year: 2020, month: 11, place: "Puducherry, TN" },
  { name: "Cyclone Gaja",      lat: 10.78, lon: 79.85, year: 2018, month: 11, place: "Nagapattinam, TN" },
  { name: "Cyclone Vardah",    lat: 13.05, lon: 80.27, year: 2016, month: 12, place: "Chennai, TN" },
  { name: "Cyclone Titli",     lat: 18.77, lon: 84.40, year: 2018, month: 10, place: "Palasa, AP" },
  { name: "Cyclone Biparjoy",  lat: 23.25, lon: 68.60, year: 2023, month: 6,  place: "Jakhau, Gujarat" },
  { name: "Cyclone Michaung",  lat: 15.90, lon: 80.47, year: 2023, month: 12, place: "Bapatla, AP" },
  { name: "Cyclone Mandous",   lat: 12.62, lon: 80.19, year: 2022, month: 12, place: "Mahabalipuram, TN" },
  { name: "Cyclone Ockhi",     lat: 8.50,  lon: 76.95, year: 2017, month: 12, place: "off Thiruvananthapuram" },
].map((e) => ({ ...e, expect: "VALIDATE", kind: "documented-cyclone" }));

// Calm controls — same coastal regions, non-cyclone months with no documented
// severe wind. `expect: "REJECT"` = the engine should NOT validate a gale here.
const CONTROLS = [
  { name: "Chennai (calm)",     lat: 13.05, lon: 80.27, year: 2019, month: 2,  place: "Chennai, TN" },
  { name: "Gujarat (calm)",     lat: 20.85, lon: 71.05, year: 2022, month: 1,  place: "Una, Gujarat" },
  { name: "Odisha (calm)",      lat: 19.80, lon: 85.83, year: 2021, month: 3,  place: "Puri, Odisha" },
  { name: "Visakhapatnam(calm)",lat: 17.69, lon: 83.22, year: 2020, month: 2,  place: "Vizag, AP" },
  { name: "Kolkata (calm)",     lat: 22.57, lon: 88.36, year: 2019, month: 1,  place: "Kolkata, WB" },
  { name: "Mumbai (calm)",      lat: 19.09, lon: 72.87, year: 2021, month: 2,  place: "Mumbai, MH" },
].map((e) => ({ ...e, expect: "REJECT", kind: "calm-control" }));

const EVENTS = [...CYCLONES, ...CONTROLS];

// ── Adjudicate one event (read-only replica of lib/asre.ts NODE 2–4) ─────────
// `monthRows` = weather_monthly_stats rows for this event's (station_ids, year,
// month), fetched scoped per-event (exactly like the engine) so we never hit
// PostgREST's 1000-row default cap.
function adjudicateLocal(event, stations, monthRows) {
  const inRange = stations
    .map((s) => ({ station: s, distKm: haversine(event.lat, event.lon, s.lat, s.lon) }))
    .filter((d) => d.distKm <= MAX_RANGE_KM)
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 5);

  if (inRange.length === 0) {
    return { label: "INSUFFICIENT_DATA", reason: "no NOAA station within 300 km" };
  }
  const nearest = inRange[0];

  const distById = new Map(inRange.map((d) => [String(d.station.id), d.distKm]));
  const rows = monthRows
    .filter((r) => distById.has(String(r.station_id)))
    .map((r) => ({ ...r, distKm: distById.get(String(r.station_id)) }));

  if (rows.length === 0) {
    return {
      label: "REJECTED_WRONG_MONTH",
      nearest: nearest.station.name, nearestKm: round1(nearest.distKm),
      reason: `no NOAA ISD row for any in-range station in ${event.year}/${event.month}`,
    };
  }

  const weighted = rows.map((row) => {
    const w = row.distKm < 0.001 ? 1e6 : 1 / Math.pow(row.distKm, IDW_POWER);
    return { w, peak: row.peak_wind_ms, exc: row.exceedance_hours };
  });
  const totalW = weighted.reduce((a, b) => a + b.w, 0);
  const idwWind = weighted.reduce((a, b) => a + (b.w / totalW) * b.peak, 0);
  const bestExc = Math.max(...weighted.map((w) => w.exc));
  const peak = idwWind > 0 ? idwWind : Math.max(...rows.map((r) => r.peak_wind_ms));

  const validated = peak >= WIND_THRESHOLD_MS && bestExc >= EXCEEDANCE_HOURS;
  return {
    label: validated ? "VALIDATED" : "REJECTED_BELOW_THRESHOLD",
    nearest: nearest.station.name, nearestKm: round1(nearest.distKm),
    peak: round2(peak), exc: bestExc, nStations: rows.length,
    reason: validated
      ? `peak ${peak.toFixed(1)} m/s ≥ ${WIND_THRESHOLD_MS} & ${bestExc}h ≥ ${EXCEEDANCE_HOURS}h`
      : `peak ${peak.toFixed(1)} m/s / exceedance ${bestExc}h below threshold`,
  };
}

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Loading station registry + weather record (read-only)…\n");

  const { data: stationsRaw, error: sErr } = await supabase
    .from("stations").select("id, name, lat, lon, state");
  if (sErr) { console.error("stations query failed:", sErr.message); process.exit(1); }
  const stations = stationsRaw.map((s) => ({ id: String(s.id), name: s.name, lat: s.lat, lon: s.lon }));

  // Per-event SCOPED weather fetch — for each event, query only the
  // weather_monthly_stats rows for its in-range station ids at its (year,
  // month). Each query returns ≤5 rows, so PostgREST's 1000-row cap is never a
  // factor. This mirrors lib/asre.ts NODE 3 exactly.
  console.log(`Stations: ${stations.length}. Fetching scoped weather per event…\n`);

  const results = [];
  for (const e of EVENTS) {
    const ids = stations
      .map((s) => ({ s, d: haversine(e.lat, e.lon, s.lat, s.lon) }))
      .filter((x) => x.d <= MAX_RANGE_KM)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map((x) => String(x.s.id));

    let monthRows = [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("weather_monthly_stats")
        .select("station_id, year, month, peak_wind_ms, exceedance_hours")
        .in("station_id", ids)
        .eq("year", e.year)
        .eq("month", e.month);
      if (error) { console.error("weather query failed:", error.message); process.exit(1); }
      monthRows = data || [];
    }
    results.push({ ...e, ...adjudicateLocal(e, stations, monthRows) });
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  const cyc = results.filter((r) => r.kind === "documented-cyclone");
  const ctl = results.filter((r) => r.kind === "calm-control");
  const captured = cyc.filter((r) => r.label === "VALIDATED");
  const missed   = cyc.filter((r) => r.label !== "VALIDATED");
  const ctlCorrect = ctl.filter((r) => r.label !== "VALIDATED");
  const ctlFalsePos = ctl.filter((r) => r.label === "VALIDATED");

  const fmt = (r) => {
    const v = r.label === "VALIDATED" ? "✓ VALIDATED " : "· " + r.label.replace("REJECTED_", "REJ_");
    const wind = r.peak != null ? `${String(r.peak).padStart(5)} m/s ${String(r.exc ?? "").padStart(2)}h` : "      —      ";
    const st = r.nearest ? `${r.nearest} @ ${r.nearestKm}km` : "(no station)";
    return `  ${r.name.padEnd(22)} ${r.year}/${String(r.month).padStart(2,"0")}  ${v.padEnd(26)} ${wind}  ${st}`;
  };

  console.log("DOCUMENTED CYCLONES (ground truth = severe wind occurred):");
  cyc.forEach((r) => console.log(fmt(r)));
  console.log("\nCALM CONTROLS (ground truth = no severe wind):");
  ctl.forEach((r) => console.log(fmt(r)));

  const recall = captured.length / cyc.length;
  const specificity = ctlCorrect.length / ctl.length;
  console.log("\n──────────────────────────────────────────────");
  console.log(`Cyclone capture (recall):   ${captured.length}/${cyc.length}  (${(recall*100).toFixed(0)}%)`);
  console.log(`Calm-control specificity:   ${ctlCorrect.length}/${ctl.length}  (${(specificity*100).toFixed(0)}%)`);
  console.log(`False positives on controls: ${ctlFalsePos.length}`);
  console.log("──────────────────────────────────────────────");
  console.log("\nMisses are COVERAGE GAPS (nearest station too far / hourly-mean");
  console.log("wind below gale), not adjudication errors. See reasons above.\n");

  // ── Sensitivity analysis: how do the tunable levers move recall vs the
  // cost in specificity? Operates only on events that HAD data. GUST_FACTOR
  // 1.4 is a standard WMO/NOAA mean→3-sec-gust ratio for open terrain. This
  // does NOT change the engine — it quantifies the design tradeoff.
  const GUST = 1.4;
  const withData = (r) => r.peak != null && r.exc != null;
  const settings = [
    { key: "current (peak≥17.2, exc≥3h)",         pass: (r) => r.peak >= 17.2 && r.exc >= 3 },
    { key: "gust×1.4 (peak·1.4≥17.2, exc≥3h)",    pass: (r) => r.peak * GUST >= 17.2 && r.exc >= 3 },
    { key: "relaxed exc (peak≥17.2, exc≥1h)",     pass: (r) => r.peak >= 17.2 && r.exc >= 1 },
    { key: "gust×1.4 + exc≥1h",                   pass: (r) => r.peak * GUST >= 17.2 && r.exc >= 1 },
  ];
  console.log("\nSENSITIVITY — recall (cyclones) vs false-positives (controls):");
  const sensitivity = settings.map((s) => {
    const cycHit = cyc.filter(withData).filter(s.pass).length;
    const cycN   = cyc.length; // misses without data still count as misses
    const ctlFp  = ctl.filter(withData).filter(s.pass).length;
    console.log(`  ${s.key.padEnd(34)} recall ${cycHit}/${cycN}  ·  control false-pos ${ctlFp}/${ctl.length}`);
    return { setting: s.key, cyclone_recall: `${cycHit}/${cycN}`, control_false_positives: `${ctlFp}/${ctl.length}` };
  });
  console.log("");

  const summary = {
    generated_note: "Read-only replica of lib/asre.ts against live Supabase NOAA data. Ground truth = IMD/JTWC public best-track (approximate landfall).",
    sensitivity,
    thresholds: { wind_ms: WIND_THRESHOLD_MS, exceedance_h: EXCEEDANCE_HOURS, max_range_km: MAX_RANGE_KM },
    n_documented_cyclones: cyc.length,
    cyclones_validated: captured.length,
    cyclone_recall: round2(recall),
    n_controls: ctl.length,
    controls_correct_reject: ctlCorrect.length,
    control_specificity: round2(specificity),
    control_false_positives: ctlFalsePos.length,
    results,
  };
  writeFileSync(join(ROOT, "..", "benchmarks", "historical_validation_results.json"), JSON.stringify(summary, null, 2));
  console.log("Wrote benchmarks/historical_validation_results.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
