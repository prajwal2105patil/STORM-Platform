---
name: nl-to-sql-engine
description: Translates corporate claims to deterministic DuckDB/BigQuery SQL. Invoked when a user submits a natural language weather/SLA claim.
---

**INJECTION SCHEMA:**
Use ONLY these available Parquet/BigQuery columns: `station` (STRING), `timestamp` (TIMESTAMP), `year` (INT), `month` (INT), `air_temp_c` (FLOAT), `wind_speed_ms` (FLOAT).

**MAPPING LOGIC:**
1. Temporal mapping is absolute. "August 2023" MUST map to `WHERE year = 2023 AND month = 8`.
2. Threshold mapping: "Hurricane conditions" -> `wind_speed_ms > 32.9`.
3. Execution safety: Always aggregate using `MAX()`, `MIN()`, or `AVG()`. Do not return massive raw row payloads.

**DEPENDENCY:** You must verify the output against `rules/sql-partitions.md` before execution.
