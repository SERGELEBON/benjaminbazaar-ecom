import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatErrorResponse, getConversationFor } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** Marks the conversation as read for the caller's side (read receipts + unread badge). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { side } = await getConversationFor(user, id);
    const now = new Date();
    await db.conversation.update({
      where: { id },
      data: side === "buyer" ? { buyerUnread: 0, buyerLastReadAt: now } : { supplierUnread: 0, supplierLastReadAt: now },
    });
    return NextResponse.json({ ok: true, readAt: now.toISOString() });
  } catch (e) {
    return chatErrorResponse(e);
  }
}
