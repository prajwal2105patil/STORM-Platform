-- =============================================================
-- DREADNOUGHT / ASRE — Multi-User Authentication
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to run more than once.
--
-- What it does:
--   1. Creates a `profiles` table (username / full name / role) keyed to
--      Supabase Auth's built-in `auth.users` table.
--   2. Auto-creates a profile row whenever someone signs up (trigger).
--   3. Adds `user_id` ownership to `claims` so each user sees only their own.
--   4. Updates the `claim_summary` view to carry `user_id`.
--
-- Passwords are NEVER stored here — Supabase Auth hashes them (bcrypt) in the
-- managed `auth.users` table. This migration only stores profile metadata.
-- =============================================================

-- ── 1. Profiles ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE,
    full_name   TEXT,
    email       TEXT,
    role        TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- A signed-in user may read & update only their own profile row.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ── 2. Auto-create a profile on signup ──────────────────────────────────
-- Reads username / full_name out of the signup metadata the client sends.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. Claim ownership ──────────────────────────────────────────────────
ALTER TABLE public.claims
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_user ON public.claims(user_id);

-- ── 4. claim_summary view now carries user_id (for per-user filtering) ───
CREATE OR REPLACE VIEW public.claim_summary AS
SELECT
    c.id,
    c.user_id,
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
FROM public.claims c
LEFT JOIN public.stations s ON s.id = c.nearest_station_id
ORDER BY c.submitted_at DESC;

-- ── 5. Promote yourself to admin (EDIT the email, then run this line) ────
-- Admins can see EVERY user's claims + the CRM / policy panels. Regular users
-- see only their own claims.
--
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'prajwal2105patil@gmail.com';
--
-- (Left commented so it doesn't fail before you've signed up. Sign up first,
--  then run the line above with your email.)
