"use client";

import { sendNudge } from "@/lib/chat-realtime";
import type { ChatConversationDTO } from "@/lib/chat";

/**
 * Sends a first message ("inquiry") to a supplier through the real chat:
 * opens (or reuses) the conversation, posts the message and nudges the supplier.
 * Throws an Error with a user-facing French message on failure (401 = not signed in).
 */
export async function sendInquiry(supplierId: string, content: string, productId?: string | null) {
  const open = await fetch("/api/chat/conversations", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ supplierId, productId: productId ?? null }),
  });
  const o = (await open.json().catch(() => ({}))) as { conversation?: ChatConversationDTO; error?: string };
  if (!open.ok || !o.conversation) throw Object.assign(new Error(o.error || "Envoi impossible"), { status: open.status });

  const res = await fetch(`/api/chat/conversations/${o.conversation.id}/messages`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const r = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw Object.assign(new Error(r.error || "Envoi impossible"), { status: res.status });

  void sendNudge([o.conversation.inboxChannels.peer], { type: "message", conversationId: o.conversation.id });
  return o.conversation;
}
