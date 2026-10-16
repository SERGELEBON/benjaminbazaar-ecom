import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ChatError,
  chatErrorResponse,
  listConversations,
  myInboxChannels,
  openConversation,
  serializeConversation,
  sideOf,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Inbox of the current user (as buyer and, for approved merchants / admins, as supplier). */
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await listConversations(user);
    const conversations = rows.flatMap((c) => {
      const side = sideOf(user, c);
      return side ? [serializeConversation(c, side)] : [];
    });
    return NextResponse.json(
      { conversations, channels: myInboxChannels(user) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return chatErrorResponse(e);
  }
}

/** Opens (get or create) the buyer's conversation with a supplier: { supplierId, productId? }. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { supplierId?: unknown; productId?: unknown };
    if (typeof body.supplierId !== "string" || !body.supplierId) throw new ChatError(400, "Fournisseur manquant");
    const productId = typeof body.productId === "string" && body.productId ? body.productId : null;
    const conv = await openConversation(user, body.supplierId, productId);
    return NextResponse.json({ conversation: serializeConversation(conv, "buyer") });
  } catch (e) {
    return chatErrorResponse(e);
  }
}
