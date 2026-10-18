import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse, noStore, readJson } from "@/lib/http";
import { parseCartItems, quoteCart } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Prices the cart from the database (real prices, stock, minimums) before ordering. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson(req);
    return NextResponse.json({ quote: await quoteCart(user, parseCartItems(body.items)) }, noStore);
  } catch (e) {
    return errorResponse(e);
  }
}
