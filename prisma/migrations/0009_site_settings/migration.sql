-- 0009_site_settings: settings edited by super admins (home hero video, texts…)
--   * table "SiteSetting" (key -> JSON), server-only (RLS on, no anon/authenticated access)
--   * public Storage bucket "site-media" for hero videos / posters (written by active admins;
--     the app only hands out upload URLs to super admins)

CREATE TABLE "SiteSetting" (
  "key"         TEXT NOT NULL,
  "value"       TEXT NOT NULL,
  "updatedById" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "SiteSetting" FROM anon, authenticated';
  END IF;
END $$;

-- -------------------------------------------- Supabase Storage (Supabase only)
DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'Supabase storage/auth schemas not found: site media setup skipped';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('site-media', 'site-media', true, 52428800,
          ARRAY['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  CREATE SCHEMA IF NOT EXISTS app_private;
  REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
  GRANT USAGE ON SCHEMA app_private TO authenticated;

  -- True when the caller is an active platform admin.
  CREATE OR REPLACE FUNCTION app_private.is_active_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $fn$
    SELECT EXISTS (
      SELECT 1 FROM public."User" me
      WHERE me."role" = 'ADMIN'
        AND me."status" = 'active'
        AND me."authId" = (SELECT auth.uid())::text
    );
  $fn$;
  REVOKE ALL ON FUNCTION app_private.is_active_admin() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION app_private.is_active_admin() TO authenticated;

  -- Public bucket: reads go through the public CDN URL; writes are limited to admins,
  -- inside the "hero/" folder.
  DROP POLICY IF EXISTS "site_media_insert" ON storage.objects;
  CREATE POLICY "site_media_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'site-media'
                AND (storage.foldername(name))[1] = 'hero'
                AND app_private.is_active_admin());

  DROP POLICY IF EXISTS "site_media_select_admin" ON storage.objects;
  CREATE POLICY "site_media_select_admin" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'site-media' AND app_private.is_active_admin());

  DROP POLICY IF EXISTS "site_media_delete" ON storage.objects;
  CREATE POLICY "site_media_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'site-media' AND app_private.is_active_admin());
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'site media storage setup skipped (insufficient privilege): %', SQLERRM;
END $storage$;
