import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PUBLIC_PRODUCT_WHERE, PUBLIC_SUPPLIER_WHERE } from "@/lib/merchant";

export const dynamic = "force-dynamic";

/** ADMIN: real dashboard counters. */
export async function GET() {
  try {
    await requireRole("ADMIN");
    const real = { status: { not: "system" } };
    const [users, buyers, merchants, admins, pendingMerchants, publicShops, products] = await Promise.all([
      db.user.count({ where: real }),
      db.user.count({ where: { ...real, role: "BUYER" } }),
      db.user.count({ where: { ...real, role: "SUPPLIER" } }),
      db.user.count({ where: { ...real, role: "ADMIN" } }),
      db.supplier.count({ where: { status: "pending", user: real } }),
      db.supplier.count({ where: PUBLIC_SUPPLIER_WHERE }),
      db.product.count({ where: PUBLIC_PRODUCT_WHERE }),
    ]);
    return NextResponse.json(
      { users, buyers, merchants, admins, pendingMerchants, publicShops, products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
