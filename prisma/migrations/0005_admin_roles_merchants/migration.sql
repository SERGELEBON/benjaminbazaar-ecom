-- 0005_admin_roles_merchants
--   * Admin levels: super (manages admins and roles) / standard (moderation).
--   * Admin invitations by email, applied at sign-in.
--   * Merchant review metadata (who/when/why) + public shop description.
--   * Audit log of sensitive admin actions.

-- User: admin level. Existing admins become "standard"; emails in ADMIN_EMAILS are
-- promoted to "super" by the app on their next request.
ALTER TABLE "User" ADD COLUMN "adminLevel" TEXT;
UPDATE "User" SET "adminLevel" = 'standard' WHERE "role" = 'ADMIN';

-- Supplier: review metadata
ALTER TABLE "Supplier"
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "reviewedAt"   TIMESTAMP(3),
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "description"  TEXT;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Supplier_status_createdAt_idx" ON "Supplier"("status", "createdAt");

-- AdminInvite
CREATE TABLE "AdminInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'standard',
    "invitedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminInvite_email_key" ON "AdminInvite"("email");
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New tables follow the same rule as 0003: no access through the public Data API.
ALTER TABLE "AdminInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "AdminInvite", "AuditLog" FROM anon, authenticated';
  END IF;
END $$;
