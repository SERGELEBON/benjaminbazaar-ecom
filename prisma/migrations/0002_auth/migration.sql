-- 0002_auth: real authentication via Supabase Auth
-- Schema
-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "authId" TEXT,
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ALTER COLUMN "country" SET DEFAULT 'Côte d''Ivoire';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'approved';

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");


-- Data: remove demo access
-- 1) The demo admin account is removed (admins are now real accounts, see ADMIN_EMAILS).
DELETE FROM "User" WHERE "role" = 'ADMIN' AND "authId" IS NULL;

-- 2) Seeded catalogue accounts (supplier owners, review author) become internal
--    "system" accounts on a reserved, non-routable domain so nobody can sign up
--    with these emails or log into them.
UPDATE "User"
SET "email"  = split_part("email", '@', 1) || '@catalogue.ijobsc.invalid',
    "status" = 'system'
WHERE "authId" IS NULL;
