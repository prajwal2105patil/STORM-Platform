-- ============================================================================
-- DREADNOUGHT ASRE — Row Level Security hardening
-- ============================================================================
-- HOW TO APPLY:  Supabase Dashboard → SQL Editor → paste → Run.
--
-- WHY THIS IS SAFE FOR THE APP:
--   Every API route connects with the service_role key, which BYPASSES RLS.
--   So enabling RLS does NOT break any existing read or write. What it DOES is
--   close the hole where a leaked/misconfigured anon key could read or write
--   the entire database. RLS is the defense-in-depth backstop behind the
--   service key — without it, that key is the ONLY wall.
-- ============================================================================

-- 1. Enable RLS on every base table.
--    RLS on + NO policy  =>  anon & authenticated roles get ZERO rows.
--    service_role keeps full access (it bypasses RLS by design).
alter table public.stations              enable row level security;
alter table public.weather_monthly_stats enable row level security;
alter table public.customers             enable row level security;
alter table public.claims                enable row level security;
alter table public.audit_log             enable row level security;

-- 2. Force RLS on the sensitive tables even for the table owner (belt + braces).
alter table public.customers force row level security;
alter table public.claims    force row level security;
alter table public.audit_log force row level security;

-- 3. Revoke any lingering direct grants from the anon role on sensitive tables.
--    (No-op if none exist; keeps a leaked anon key from touching PII / claims.)
revoke all on public.customers from anon;
revoke all on public.claims    from anon;
revoke all on public.audit_log from anon;

-- 4. OPTIONAL — public reference data.
--    Weather + stations are NOAA Rule 803(8) public records. If you ever query
--    them with the anon key client-side, uncomment to allow READ-ONLY public
--    access while everything else stays locked. Leave commented if all access
--    goes through the service key (current setup).
-- create policy "public read stations"
--   on public.stations for select to anon using (true);
-- create policy "public read weather"
--   on public.weather_monthly_stats for select to anon using (true);

-- 5. claim_summary is a VIEW over claims + customers. Make it respect the
--    querying role's RLS instead of the view owner's. (Postgres 15+; Supabase
--    is 15+.) If claim_summary is a table, or this errors, you may skip it.
alter view public.claim_summary set (security_invoker = on);

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Expect rowsecurity = true for all five tables:
--   select tablename, rowsecurity
--   from pg_tables where schemaname = 'public' order by tablename;
