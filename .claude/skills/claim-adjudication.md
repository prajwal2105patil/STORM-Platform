---
name: claim-adjudication
description: Formats the raw DuckDB/BigQuery SQL output into formal legal JSON for the enterprise client.
---

**ASRE OUTPUT SCHEMA — INDIA JURISDICTION (CERC/APTEL COMPLIANT)**

The final output of the ASRE must ALWAYS map to this strict JSON format.
Do not add conversational text outside of this JSON.

**MANDATORY LEGAL FRAMING RULES:**
1. NEVER cite "Rule 803(8)" — that is US Federal law. Irrelevant in Indian proceedings.
2. ALWAYS cite Indian Evidence Act §74 (public documents), §78(6) (foreign official records),
   and IT Act 2000 §65B (electronic records admissibility).
3. ALWAYS include the `disclaimer` field. This is the legal liability shield.
4. ALWAYS include `legal_disclaimer` at the output root. No exceptions.

```json
{
  "claim_status": "VALIDATED | REJECTED | INSUFFICIENT_DATA",
  "resolution_time_ms": 1847,
  "evidence": {
    "target_metric": "wind_speed_ms",
    "threshold_applied": "> 32.9 m/s (Hurricane Force, Beaufort Scale 12)",
    "recorded_peak": 34.7,
    "period_average": 28.3,
    "exceedance_hours": 6,
    "total_observations": 744,
    "station": "42851",
    "station_name": "BHUJ AIRPORT",
    "station_distance_km": 4.4,
    "sla_threshold_exceeded": true
  },
  "data_provenance": "NOAA Integrated Surface Dataset (ISD) — US Federal Public Record. Admissible in Indian proceedings under Indian Evidence Act §74, §78(6) and Information Technology Act 2000 §65B (electronic records). Cross-reference with IMD station data recommended for CERC filings.",
  "disclaimer": "Decision-support output only. Not legal advice. Filing responsibility and legal interpretation remain exclusively with engaging counsel.",
  "legal_disclaimer": "Output constitutes decision-support data only. Legal interpretation and arbitration filing responsibility remains exclusively with the engaging counsel."
}
```

**CERC ADMISSIBILITY NOTE:**
NOAA ISD is a US federal public record (15 CFR Part 295). Under Indian Evidence Act §78(6),
foreign official records certified by a competent authority are admissible.
Section 65B of the IT Act 2000 governs electronic record admissibility — NOAA data
delivered via API satisfies this requirement when accompanied by a Section 65B certificate
from the data custodian or a qualified IT expert.

**STATION PROXIMITY STANDARD:**
A station within 30km of the claim site is considered PRIMARY evidence.
IDW triangulation using 3+ stations is acceptable supporting methodology.
Always surface `station_distance_km` in evidence output.
