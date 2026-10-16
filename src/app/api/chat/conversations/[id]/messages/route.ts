import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ChatError,
  PAGE_SIZE,
  assertRateLimit,
  chatErrorResponse,
  cleanContent,
  getConversationFor,
  removeAttachment,
  serializeMessages,
  uploadAttachment,
} from "@/lib/chat";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * History, newest page first:
 *   ?before=<messageId>  older page (infinite scroll up)
 *   ?after=<messageId>   only messages newer than this one (realtime catch-up)
 * Messages are always returned in chronological order.
 */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await getConversationFor(user, id);

    const url = new URL(req.url);
    const before = url.searchParams.get("before");
    const after = url.searchParams.get("after");

    const anchorId = before || after;
    const anchor = anchorId
      ? await db.message.findFirst({ where: { id: anchorId, conversationId: id }, select: { id: true, createdAt: true } })
      : null;
    if (anchorId && !anchor) throw new ChatError(400, "Curseur invalide");

    let where: Prisma.MessageWhereInput = { conversationId: id };
    if (anchor && after) {
      where = {
        conversationId: id,
        OR: [{ createdAt: { gt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { gt: anchor.id } }],
      };
    } else if (anchor && before) {
      where = {
        conversationId: id,
        OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }],
      };
    }

    const take = after ? 200 : PAGE_SIZE + 1;
    const rows = await db.message.findMany({
      where,
      orderBy: after ? [{ createdAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }],
      take,
    });

    let hasMore = false;
    let page = rows;
    if (!after) {
      hasMore = rows.length > PAGE_SIZE;
      page = rows.slice(0, PAGE_SIZE).reverse();
    }
    const messages = await serializeMessages(page, user.id);
    return NextResponse.json({ messages, hasMore }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return chatErrorResponse(e);
  }
}

/**
 * Sends a message.
 *   application/json     { content }
 *   multipart/form-data  content?, file (JPEG/PNG/WebP <= 4 MB), width?, height?
 */
export async function POST(req: Request, { params }: Ctx) {
  let uploadedPath: string | null = null;
  try {
    const user = await requireUser();
    const { id } = await params;
    const { conv, side } = await getConversationFor(user, id);
    await assertRateLimit(user.id);

    let content: string | null = null;
    let attachment: Awaited<ReturnType<typeof uploadAttachment>> | null = null;

    const type = req.headers.get("content-type") ?? "";
    if (type.startsWith("multipart/form-data")) {
      const form = await req.formData().catch(() => {
        throw new ChatError(400, "Requête invalide");
      });
      content = cleanContent(form.get("content") ?? null);
      const file = form.get("file");
      if (file && typeof file !== "string") {
        attachment = await uploadAttachment(conv.id, file, {
          width: Number(form.get("width")),
          height: Number(form.get("height")),
        });
        uploadedPath = attachment.path;
      }
    } else {
      const body = (await req.json().catch(() => ({}))) as { content?: unknown };
      content = cleanContent(body.content ?? null);
    }
    if (!content && !attachment) throw new ChatError(400, "Message vide");

    const now = new Date();
    const preview = content ? content.replace(/\s+/g, " ").slice(0, 140) : "📷 Photo";
    const message = await db.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conv.id,
          senderId: user.id,
          senderRole: side,
          content,
          attachmentPath: attachment?.path ?? null,
          attachmentType: attachment?.mime ?? null,
          attachmentSize: attachment?.size ?? null,
          attachmentWidth: attachment?.width ?? null,
          attachmentHeight: attachment?.height ?? null,
          createdAt: now,
        },
      });
      await tx.conversation.update({
        where: { id: conv.id },
        data: {
          lastMessageAt: now,
          lastMessagePreview: preview,
          lastSenderRole: side,
          // Sending implies having read the thread; the other side gets one more unread.
          ...(side === "buyer"
            ? { supplierUnread: { increment: 1 }, buyerUnread: 0, buyerLastReadAt: now }
            : { buyerUnread: { increment: 1 }, supplierUnread: 0, supplierLastReadAt: now }),
        },
      });
      return created;
    });

    const [dto] = await serializeMessages([message], user.id);
    return NextResponse.json({ message: dto }, { status: 201 });
  } catch (e) {
    if (uploadedPath) await removeAttachment(uploadedPath);
    return chatErrorResponse(e);
  }
}
