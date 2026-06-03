-- =============================================================
-- DREADNOUGHT / ASRE — Supabase Schema
-- Run this in Supabase SQL Editor BEFORE running migrate_to_supabase.py
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Stations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stations (
    id          TEXT PRIMARY KEY,           -- NOAA station ID e.g. "42182"
    name        TEXT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    state       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Weather Monthly Statistics (pre-aggregated from Parquet) ────────────
CREATE TABLE IF NOT EXISTS weather_monthly_stats (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    station_id          TEXT REFERENCES stations(id),
    year                INTEGER NOT NULL,
    month               INTEGER NOT NULL,
    n_observations      INTEGER,
    avg_wind_ms         DOUBLE PRECISION,
    peak_wind_ms        DOUBLE PRECISION,
    p95_wind_ms         DOUBLE PRECISION,
    exceedance_hours    INTEGER,
    gale_confirmed      BOOLEAN,
    period_start        TIMESTAMPTZ,
    period_end          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(station_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_weather_station_year_month
    ON weather_monthly_stats(station_id, year, month);

-- ── Customers (CRM) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name    TEXT NOT NULL,
    contact_name    TEXT,
    email           TEXT,
    phone           TEXT,
    sector          TEXT,           -- renewable_energy, logistics, infrastructure
    account_status  TEXT DEFAULT 'active',  -- active, suspended, closed
    total_claims    INTEGER DEFAULT 0,
    approved_claims INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Claims ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claims (
    id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id         UUID REFERENCES customers(id),
    petitioner          TEXT NOT NULL,
    respondent          TEXT,
    asset_name          TEXT NOT NULL,
    asset_type          TEXT,
    asset_lat           DOUBLE PRECISION NOT NULL,
    asset_lon           DOUBLE PRECISION NOT NULL,
    asset_capacity_mw   DOUBLE PRECISION,
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    claimed_cause       TEXT NOT NULL,
    claimed_loss_inr    DOUBLE PRECISION,

    -- ASRE adjudication result
    status              TEXT DEFAULT 'pending',
    adjudication_label  TEXT,
    nearest_station_id  TEXT REFERENCES stations(id),
    nearest_station_km  DOUBLE PRECISION,
    peak_wind_ms        DOUBLE PRECISION,
    exceedance_hours    INTEGER,
    idw_confidence      DOUBLE PRECISION,
    processing_ms       INTEGER,
    adjudication_json   JSONB,

    -- Metadata
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    adjudicated_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_customer   ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status     ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_submitted  ON claims(submitted_at);

-- ── Audit Log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id    UUID REFERENCES claims(id),
    event_type  TEXT NOT NULL,   -- submitted, adjudicated, escalated, overridden
    actor       TEXT,
    payload     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security (enable for production) ───────────────────────────
ALTER TABLE stations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_monthly_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log              ENABLE ROW LEVEL SECURITY;

-- Public read on stations and weather (reference data)
CREATE POLICY "stations_public_read"
    ON stations FOR SELECT USING (true);

CREATE POLICY "weather_public_read"
    ON weather_monthly_stats FOR SELECT USING (true);

-- All authenticated users can manage claims/customers
CREATE POLICY "claims_auth"
    ON claims FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "customers_auth"
    ON customers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "audit_auth"
    ON audit_log FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ── Useful views ─────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW claim_summary AS
SELECT
    c.id,
    c.petitioner,
    c.asset_name,
    c.start_date,
    c.end_date,
    c.adjudication_label,
    c.status,
    c.peak_wind_ms,
    c.exceedance_hours,
    c.processing_ms,
    s.name AS station_name,
    c.nearest_station_km,
    c.submitted_at
FROM claims c
LEFT JOIN stations s ON s.id = c.nearest_station_id
ORDER BY c.submitted_at DESC;
