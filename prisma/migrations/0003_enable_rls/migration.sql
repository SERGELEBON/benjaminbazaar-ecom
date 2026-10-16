-- 0003_enable_rls: lock down the Supabase Data API (PostgREST).
--
-- The application never reads these tables from the browser: every query goes
-- through our server (Next.js route handlers -> Prisma), connected as the table
-- owner, which is not subject to RLS. The public anon key, however, is shipped to
-- every browser, so without RLS anyone could read or write these tables through
-- https://<project>.supabase.co/rest/v1/<table>.
--
-- Enabling RLS with no policy = deny all for anon/authenticated. We also revoke
-- their table privileges (defense in depth) and the default privileges for
-- tables created later by migrations.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Supabase-only roles (absent on a plain local Postgres).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
  END IF;
END $$;
