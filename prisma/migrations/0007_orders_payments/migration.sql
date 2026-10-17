-- 0007_orders_payments: real checkout (one order per shop), order timeline,
-- idempotent payments (cash on delivery / CinetPay Mobile Money).

-- Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "transactionId" TEXT NOT NULL,
    "paymentUrl" TEXT,
    "providerStatus" TEXT,
    "providerData" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");
CREATE UNIQUE INDEX "Payment_userId_idempotencyKey_key" ON "Payment"("userId", "idempotencyKey");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Order: payment, delivery snapshot, lifecycle timestamps. Legacy statuses are mapped.
ALTER TABLE "Order"
  ADD COLUMN "paymentStatus"   TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN "paymentId"       TEXT,
  ADD COLUMN "shippingName"    TEXT,
  ADD COLUMN "shippingPhone"   TEXT,
  ADD COLUMN "shippingCountry" TEXT,
  ADD COLUMN "shippingCity"    TEXT,
  ADD COLUMN "shippingLine"    TEXT,
  ADD COLUMN "buyerNote"       TEXT,
  ADD COLUMN "trackingInfo"    TEXT,
  ADD COLUMN "cancelReason"    TEXT,
  ADD COLUMN "cancelledBy"     TEXT,
  ADD COLUMN "confirmedAt"     TIMESTAMP(3),
  ADD COLUMN "shippedAt"       TIMESTAMP(3),
  ADD COLUMN "deliveredAt"     TIMESTAMP(3),
  ADD COLUMN "cancelledAt"     TIMESTAMP(3);
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'cod';
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'XOF';
UPDATE "Order" SET "paymentStatus" = 'paid', "status" = 'confirmed' WHERE "status" = 'paid';
UPDATE "Order" SET "paymentStatus" = 'paid' WHERE "status" IN ('shipped', 'delivered');

CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_supplierId_status_createdAt_idx" ON "Order"("supplierId", "status", "createdAt");
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrderEvent
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stock can never go negative, whatever the code path.
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_non_negative" CHECK ("stock" IS NULL OR "stock" >= 0);

-- Same rule as 0003: no access through the public Data API.
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderEvent" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON "Payment", "OrderEvent" FROM anon, authenticated';
  END IF;
END $$;
