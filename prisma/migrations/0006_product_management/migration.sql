-- 0006_product_management: merchants create / edit / publish / archive their products.
--   * status: draft | published | archived   (existing catalogue rows stay published)
--   * moderation: ok | blocked (+ reason) set by platform admins
--   * stock / sku / publishedAt
--   * Storage: public bucket "product-images"; a merchant can only write in the folder
--     of their own approved shop (<supplierId>/...).

ALTER TABLE "Product"
  ADD COLUMN "status"           TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN "moderation"       TEXT NOT NULL DEFAULT 'ok',
  ADD COLUMN "moderationReason" TEXT,
  ADD COLUMN "stock"            INTEGER,
  ADD COLUMN "sku"              TEXT,
  ADD COLUMN "publishedAt"      TIMESTAMP(3);

UPDATE "Product" SET "publishedAt" = "createdAt" WHERE "status" = 'published';

CREATE INDEX "Product_supplierId_status_idx" ON "Product"("supplierId", "status");
CREATE INDEX "Product_status_moderation_idx" ON "Product"("status", "moderation");

-- -------------------------------------------- Supabase Storage (Supabase only)
DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'Supabase storage/auth schemas not found: product storage setup skipped';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('product-images', 'product-images', true, 5242880,
          ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  CREATE SCHEMA IF NOT EXISTS app_private;
  REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
  GRANT USAGE ON SCHEMA app_private TO authenticated;

  -- True when the caller owns the approved, active shop `supplier_id`.
  CREATE OR REPLACE FUNCTION app_private.owns_active_shop(supplier_id text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $fn$
    SELECT EXISTS (
      SELECT 1
      FROM public."Supplier" s
      JOIN public."User" me ON me."id" = s."userId"
      WHERE s."id" = supplier_id
        AND s."status" = 'approved'
        AND me."status" = 'active'
        AND me."authId" = (SELECT auth.uid())::text
    );
  $fn$;
  REVOKE ALL ON FUNCTION app_private.owns_active_shop(text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION app_private.owns_active_shop(text) TO authenticated;

  -- Public bucket: reads go through the public CDN URL; only writes need policies.
  DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
  CREATE POLICY "product_images_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-images'
                AND app_private.owns_active_shop((storage.foldername(name))[1]));

  DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
  CREATE POLICY "product_images_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'product-images'
           AND app_private.owns_active_shop((storage.foldername(name))[1]));

  -- DELETE through the Storage API also needs to SELECT the row.
  DROP POLICY IF EXISTS "product_images_select_own" ON storage.objects;
  CREATE POLICY "product_images_select_own" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'product-images'
           AND app_private.owns_active_shop((storage.foldername(name))[1]));
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'product storage setup skipped (insufficient privilege): %', SQLERRM;
END $storage$;
