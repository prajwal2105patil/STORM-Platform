-- =============================================================
-- Migration: add wind distribution columns to weather_monthly_stats
-- Date: 2026-06-17
-- =============================================================
--
-- WHY: the table previously stored only avg / p95 / peak. To round out the
-- statistical picture (and back the /api/weather metric allowlist) we add the
-- low end and the spread of each month's hourly-mean wind distribution.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR *BEFORE* the next noaa_free_pipeline.py
-- rebuild. The pipeline now emits these three keys; without the columns the
-- PostgREST upsert fails with "column ... does not exist".
--
-- Idempotent: ADD COLUMN IF NOT EXISTS is safe to run repeatedly. Existing
-- rows get NULLs until the next rebuild repopulates the table.
-- =============================================================

ALTER TABLE weather_monthly_stats
    ADD COLUMN IF NOT EXISTS min_wind_ms    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS median_wind_ms DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS std_wind_ms    DOUBLE PRECISION;
