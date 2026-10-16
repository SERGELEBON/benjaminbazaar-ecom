import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { myInboxChannels } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Total unread messages for the header badge (0 for anonymous visitors, never an error). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unread: 0, channels: [] }, { headers: { "Cache-Control": "no-store" } });

  const [asBuyer, asSupplier, asPlatform] = await Promise.all([
    db.conversation.aggregate({ where: { buyerId: user.id }, _sum: { buyerUnread: true } }),
    user.supplier && user.supplier.status === "approved"
      ? db.conversation.aggregate({ where: { supplierId: user.supplier.id }, _sum: { supplierUnread: true } })
      : null,
    user.role === "ADMIN"
      ? db.conversation.aggregate({ where: { supplier: { user: { status: "system" } } }, _sum: { supplierUnread: true } })
      : null,
  ]);
  const unread =
    (asBuyer._sum.buyerUnread ?? 0) + (asSupplier?._sum.supplierUnread ?? 0) + (asPlatform?._sum.supplierUnread ?? 0);
  return NextResponse.json({ unread, channels: myInboxChannels(user) }, { headers: { "Cache-Control": "no-store" } });
}
