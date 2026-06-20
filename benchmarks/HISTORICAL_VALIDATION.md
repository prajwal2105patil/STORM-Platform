# Historical Validation — ASRE vs the Documented Meteorological Record

**Reproduce:** `node webapp/scripts/validate-historical.mjs` (read-only against the live Supabase NOAA store; writes nothing to the claims table).

## Why this exists

The `/benchmark` page reports **99.7% macro-F1 on 1,000 *synthetic* claims** against a
*simulated* control. That measures **routing discipline** — whether well-formed claims are
classified correctly — and is honest about being synthetic. It does **not** measure whether
the engine detects **real** storms.

This document answers the question a buyer actually asks:

> *When a real, documented cyclone made landfall on a real coast on a real date, does ASRE —
> running on the actual NOAA ISD record — return VALIDATED? And during documented calm
> periods, does it correctly REJECT?*

**Ground truth:** IMD / JTWC public best-track record — severe/very-severe cyclonic storms
that made landfall on the Indian coast, 2016–2023. Landfall coordinates are approximate and
should be cross-checked against IMD RSMC bulletins before external use.

**Method:** a read-only replica of `webapp/lib/asre.ts` (haversine → 300 km → top-5 IDW
`peak_wind_ms` → **VALIDATED iff peak ≥ 17.2 m/s AND single-month exceedance ≥ 3 h**),
run against the live station registry and `weather_monthly_stats`.

## Headline result (current production thresholds)

| Metric | Result |
|---|---|
| Documented cyclones VALIDATED (recall) | **1 / 12 (8%)** |
| Calm-control correct REJECT (specificity) | **6 / 6 (100%)** |
| False positives on calm controls | **0** |

**Read this correctly:** the engine is **high-precision, low-recall** on the raw hourly-mean
record. It never validated a non-event (good, legally safe) — but it under-detects real
cyclones, because the ground-truth sensor (NOAA ISD **hourly-mean** surface wind) is a
conservative proxy for a cyclone's damaging **gusts**, and the nearest station is often tens
of km from the eyewall.

## Per-event detail — documented cyclones

| Event | Month | Nearest station | Dist | Peak (mean) | Exc. | Verdict | Why |
|---|---|---|---|---|---|---|---|
| Fani | 2019/05 | Puri | 1.4 km | 19.6 m/s | 3 h | ✓ **VALIDATED** | clears both bars |
| Yaas | 2021/05 | Balasore | 9.4 km | 21.8 m/s | 2 h | ✗ | wind OK, only 2 h sustained |
| Michaung | 2023/12 | Bapatla | 0.3 km | 19.6 m/s | 2 h | ✗ | wind OK, only 2 h sustained |
| Ockhi | 2017/12 | Thiruvananthapuram | 1.9 km | 17.6 m/s | 1 h | ✗ | wind OK, only 1 h sustained |
| Titli | 2018/10 | Kalingapatam | 56.2 km | 16.4 m/s | 3 h | ✗ | sustained OK, 0.8 m/s under |
| Gaja | 2018/11 | Nagappattinam | 1.4 km | 15.4 m/s | 1 h | ✗ | below both |
| Biparjoy | 2023/06 | Naliya | 25.5 km | 15.9 m/s | 0 h | ✗ | gusts not captured as mean |
| Vardah | 2016/12 | Nungambakkam | 7.8 km | 12.9 m/s | 2 h | ✗ | inland station |
| Nivar | 2020/11 | Pondicherry | 5.1 km | 12.2 m/s | 0 h | ✗ | mean well below gusts |
| Tauktae | 2021/05 | Diu | 20.1 km | 11.2 m/s | 0 h | ✗ | station off the track |
| Mandous | 2022/12 | Chennai Intl | 41.6 km | 10.0 m/s | 0 h | ✗ | station far from landfall |
| Amphan | 2020/05 | Sagar Island | 25.8 km | 7.0 m/s | 0 h | ✗ | extreme winds inland of station |

All six calm controls rejected with genuinely low wind (3.9–8.2 m/s, 0 h) — correct.

## Sensitivity — the tunable levers

`GUST = 1.4` is a standard WMO/NOAA open-terrain mean→gust ratio. This does **not** change the
engine; it quantifies the design tradeoff between recall and false positives.

| Setting | Cyclone recall | Control false-positives |
|---|---|---|
| **current** — peak ≥ 17.2, exc ≥ 3 h | 1 / 12 | 0 / 6 |
| gust ×1.4 — peak·1.4 ≥ 17.2, exc ≥ 3 h | 2 / 12 | 0 / 6 |
| relaxed exceedance — peak ≥ 17.2, exc ≥ 1 h | 4 / 12 | 0 / 6 |
| **gust ×1.4 + exc ≥ 1 h** | **7 / 12 (58%)** | **0 / 6** |

**Key finding:** applying a standard gust factor and a 1-hour sustained bar lifts recall from
**8% → 58% with zero new false positives** on this control set. There is real, defensible
headroom — the current settings are conservative beyond what specificity requires.

## Honest limitations

- **Hourly-mean vs gust.** NOAA ISD reports hourly-mean wind; cyclone damage is gust-driven.
  A station reading 12–16 m/s mean likely saw 17–22 m/s gusts. The engine adjudicates the
  conservative quantity.
- **Station distance.** Several misses (Amphan, Tauktae, Mandous) had the nearest station
  20–42 km from landfall, inland of the worst winds.
- **Small control set.** 0 false positives on **6** calm months is encouraging, not
  conclusive. A larger, adversarial control set is needed before relaxing thresholds in
  production.
- **Monthly granularity.** `weather_monthly_stats` aggregates by station-month; the harness
  uses the landfall month. Sub-daily resolution would sharpen exceedance counts.
- **Approximate ground truth.** Landfall coordinates are public best-track approximations.

## What this means

1. ASRE is **sound and legally conservative** — it does not manufacture validations.
2. On the raw record it is **a high-specificity, low-recall instrument** — own that, don't
   hide it. "We only validate when the sensor record is unambiguous" is the right posture for
   evidence headed to a tribunal.
3. There is a **clear, data-backed path to higher recall** (gust factor + sustained-hour
   tuning) that — pending a larger control set — costs no specificity. This is a product
   decision with legal tradeoffs, to be made deliberately, not silently.
