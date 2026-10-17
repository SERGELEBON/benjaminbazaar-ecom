import { NextResponse } from "next/server";
import { audit, requireUser } from "@/lib/auth";
import { errorResponse, noStore, readJson } from "@/lib/http";
import { getOrderFor, orderView, transitionOrder, type OrderAction } from "@/lib/orders";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Order detail for its buyer, its shop or an admin (404 for anyone else). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { order, role } = await getOrderFor(user, id);
    return NextResponse.json({ order: orderView(order, role) }, noStore);
  } catch (e) {
    return errorResponse(e);
  }
}

/** { action: "confirm" | "ship" | "deliver" | "cancel", note?, reason?, tracking? } */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJson(req);
    const action = String(body.action) as OrderAction;
    const { order, role } = await transitionOrder(user, id, action, body);
    if (role === "admin" || action === "cancel") {
      await audit(user.id, `order.${action}`, "order", id, { ref: order.ref, by: role, reason: order.cancelReason ?? undefined });
    }
    return NextResponse.json({ order: orderView(order, role) });
  } catch (e) {
    return errorResponse(e);
  }
}
