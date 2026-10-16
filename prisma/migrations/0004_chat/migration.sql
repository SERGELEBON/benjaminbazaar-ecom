-- 0004_chat: professional buyer <-> supplier messaging.
--   * Conversation: one thread per (buyer, supplier), real foreign keys, product
--     context, last-message summary and per-side unread counters / read receipts.
--   * Message: real sender (User), optional image attachment stored in a PRIVATE
--     Supabase Storage bucket, index for paginated history.
--   * Storage: bucket "chat-attachments" + policies so only the participants of a
--     conversation can upload/read its files (path = <conversationId>/<file>).

-- ---------------------------------------------------------------- Conversation
ALTER TABLE "Conversation" RENAME COLUMN "userId" TO "buyerId";

ALTER TABLE "Conversation"
  ADD COLUMN "lastMessageAt"      TIMESTAMP(3),
  ADD COLUMN "lastMessagePreview" TEXT,
  ADD COLUMN "lastSenderRole"     TEXT,
  ADD COLUMN "buyerUnread"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "supplierUnread"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "buyerLastReadAt"    TIMESTAMP(3),
  ADD COLUMN "supplierLastReadAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Conversation" ALTER COLUMN "updatedAt" DROP DEFAULT; -- managed by Prisma (@updatedAt)

-- Legacy rows (prototype socket service) that cannot satisfy the new constraints.
DELETE FROM "Conversation" c
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u."id" = c."buyerId")
   OR NOT EXISTS (SELECT 1 FROM "Supplier" s WHERE s."id" = c."supplierId");
UPDATE "Conversation" c SET "productId" = NULL
WHERE "productId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Product" p WHERE p."id" = c."productId");
-- Keep the most recent thread when a buyer had several with the same supplier.
DELETE FROM "Conversation" c
USING "Conversation" newer
WHERE c."buyerId" = newer."buyerId" AND c."supplierId" = newer."supplierId"
  AND (c."createdAt", c."id") < (newer."createdAt", newer."id");

-- --------------------------------------------------------------------- Message
ALTER TABLE "Message" RENAME COLUMN "fromRole" TO "senderRole";
ALTER TABLE "Message" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "Message"
  ADD COLUMN "senderId"         TEXT,
  ADD COLUMN "attachmentPath"   TEXT,
  ADD COLUMN "attachmentType"   TEXT,
  ADD COLUMN "attachmentSize"   INTEGER,
  ADD COLUMN "attachmentWidth"  INTEGER,
  ADD COLUMN "attachmentHeight" INTEGER;

-- Backfill the sender from the legacy role.
UPDATE "Message" m SET "senderId" = c."buyerId"
FROM "Conversation" c
WHERE m."conversationId" = c."id" AND m."senderRole" = 'buyer';
UPDATE "Message" m SET "senderId" = s."userId"
FROM "Conversation" c JOIN "Supplier" s ON s."id" = c."supplierId"
WHERE m."conversationId" = c."id" AND m."senderRole" = 'supplier';
DELETE FROM "Message" WHERE "senderId" IS NULL;
ALTER TABLE "Message" ALTER COLUMN "senderId" SET NOT NULL;

-- Summary columns for existing threads.
UPDATE "Conversation" c SET
  "lastMessageAt" = last."createdAt",
  "lastMessagePreview" = LEFT(COALESCE(last."content", 'Photo'), 140),
  "lastSenderRole" = last."senderRole"
FROM (
  SELECT DISTINCT ON ("conversationId") "conversationId", "createdAt", "content", "senderRole"
  FROM "Message" ORDER BY "conversationId", "createdAt" DESC
) last
WHERE last."conversationId" = c."id";

-- -------------------------------------------------------- Indexes & foreign keys
CREATE UNIQUE INDEX "Conversation_buyerId_supplierId_key" ON "Conversation"("buyerId", "supplierId");
CREATE INDEX "Conversation_buyerId_lastMessageAt_idx" ON "Conversation"("buyerId", "lastMessageAt");
CREATE INDEX "Conversation_supplierId_lastMessageAt_idx" ON "Conversation"("supplierId", "lastMessageAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -------------------------------------------- Supabase Storage (Supabase only)
-- Skipped on a plain Postgres (local dev). Wrapped so that a privilege problem
-- never blocks the deployment: the API then answers "upload unavailable".
DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE NOTICE 'Supabase storage/auth schemas not found: chat storage setup skipped';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('chat-attachments', 'chat-attachments', false, 5242880,
          ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO UPDATE
    SET public = false,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- Helper in a schema that is NOT exposed by the Data API.
  CREATE SCHEMA IF NOT EXISTS app_private;
  REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
  GRANT USAGE ON SCHEMA app_private TO authenticated;

  CREATE OR REPLACE FUNCTION app_private.chat_can_access(conversation_id text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $fn$
    SELECT EXISTS (
      SELECT 1
      FROM public."Conversation" c
      JOIN public."Supplier" s   ON s."id" = c."supplierId"
      JOIN public."User" owner   ON owner."id" = s."userId"
      JOIN public."User" me      ON me."authId" = (SELECT auth.uid())::text AND me."status" = 'active'
      WHERE c."id" = conversation_id
        AND (
             c."buyerId" = me."id"
          OR (s."userId" = me."id" AND s."status" = 'approved')
          OR (me."role" = 'ADMIN' AND owner."status" = 'system')
        )
    );
  $fn$;
  REVOKE ALL ON FUNCTION app_private.chat_can_access(text) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION app_private.chat_can_access(text) TO authenticated;

  DROP POLICY IF EXISTS "chat_attachments_select" ON storage.objects;
  CREATE POLICY "chat_attachments_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'chat-attachments'
           AND app_private.chat_can_access((storage.foldername(name))[1]));

  DROP POLICY IF EXISTS "chat_attachments_insert" ON storage.objects;
  CREATE POLICY "chat_attachments_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'chat-attachments'
                AND app_private.chat_can_access((storage.foldername(name))[1]));
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'chat storage setup skipped (insufficient privilege): %', SQLERRM;
END $storage$;
