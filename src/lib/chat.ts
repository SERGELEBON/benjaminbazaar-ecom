/**
 * Server-side chat domain (never import in client components).
 *
 * Security model
 * - Every read/write goes through our API with `requireUser()`; the browser never
 *   talks to the chat tables directly (RLS denies the Data API, see 0003_enable_rls).
 * - A user may access a conversation only as:
 *     buyer    -> conversation.buyerId === user.id
 *     supplier -> user owns the (approved) supplier store
 *     supplier -> user is ADMIN and the store is an internal catalogue store
 *                 (status "system": nobody else can answer for it)
 *   Anything else answers 404 (no conversation enumeration).
 * - Images live in a PRIVATE Storage bucket; the browser only gets short-lived
 *   signed URLs. Uploads use the caller's own Supabase session, so Storage RLS
 *   (app_private.chat_can_access) checks the participant a second time.
 */
import { NextResponse } from "next/server";
import type { Conversation, Message, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { authErrorResponse, type requireUser } from "@/lib/auth";

export type ChatUser = Awaited<ReturnType<typeof requireUser>>;
export type ChatSide = "buyer" | "supplier";

export const CHAT_BUCKET = "chat-attachments";
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB bodies
export const PAGE_SIZE = 30;
const SIGNED_URL_TTL = 60 * 60; // 1 h
const RATE_LIMIT_PER_MINUTE = 30;

export class ChatError extends Error {
  constructor(public status: 400 | 403 | 404 | 409 | 413 | 415 | 429 | 503, message: string) {
    super(message);
  }
}

const conversationInclude = {
  buyer: { select: { id: true, name: true, avatarUrl: true, country: true } },
  supplier: {
    select: {
      id: true, name: true, slug: true, logo: true, city: true, country: true, verified: true,
      status: true, storeRating: true, responseTime: true, userId: true,
      user: { select: { status: true } },
    },
  },
  product: { select: { id: true, title: true, images: true } },
} satisfies Prisma.ConversationInclude;

export type ConversationWithParties = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

/** Which side `user` plays in `conv`, or null if they are not a participant. */
export function sideOf(user: ChatUser, conv: ConversationWithParties): ChatSide | null {
  if (conv.buyerId === user.id) return "buyer";
  if (conv.supplier.userId === user.id && conv.supplier.status === "approved") return "supplier";
  if (user.role === "ADMIN" && conv.supplier.user.status === "system") return "supplier";
  return null;
}

/** Loads a conversation the user participates in (404 otherwise). */
export async function getConversationFor(user: ChatUser, id: string) {
  const conv = await db.conversation.findUnique({ where: { id }, include: conversationInclude });
  const side = conv ? sideOf(user, conv) : null;
  if (!conv || !side) throw new ChatError(404, "Conversation introuvable");
  return { conv, side };
}

/** Prisma filter for every conversation visible to `user` (as buyer or supplier). */
export function visibleConversationsWhere(user: ChatUser): Prisma.ConversationWhereInput {
  const or: Prisma.ConversationWhereInput[] = [{ buyerId: user.id }];
  if (user.supplier && user.supplier.status === "approved") {
    // Suppliers only see threads where the buyer actually wrote something.
    or.push({ supplierId: user.supplier.id, lastMessageAt: { not: null } });
  }
  if (user.role === "ADMIN") {
    or.push({ supplier: { user: { status: "system" } }, lastMessageAt: { not: null } });
  }
  return { OR: or };
}

export async function listConversations(user: ChatUser) {
  return db.conversation.findMany({
    where: visibleConversationsWhere(user),
    include: conversationInclude,
    orderBy: [{ lastMessageAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
  });
}

/** Get or create the buyer's thread with a supplier (optionally about a product). */
export async function openConversation(user: ChatUser, supplierId: string, productId?: string | null) {
  const supplier = await db.supplier.findUnique({ where: { id: supplierId }, select: { id: true, userId: true, status: true } });
  if (!supplier || supplier.status !== "approved") throw new ChatError(404, "Fournisseur introuvable");
  if (supplier.userId === user.id) throw new ChatError(400, "Vous ne pouvez pas vous écrire à vous-même.");

  let product: { id: string } | null = null;
  if (productId) {
    product = await db.product.findFirst({ where: { id: productId, supplierId }, select: { id: true } });
  }

  const conv = await db.conversation.upsert({
    where: { buyerId_supplierId: { buyerId: user.id, supplierId } },
    create: { buyerId: user.id, supplierId, productId: product?.id ?? null },
    update: product ? { productId: product.id } : {},
    include: conversationInclude,
  });
  return conv;
}

function firstImage(images: string | null | undefined): string | null {
  try {
    const arr = JSON.parse(images ?? "[]");
    return Array.isArray(arr) && typeof arr[0] === "string" ? arr[0] : null;
  } catch {
    return null;
  }
}

/** Browser-safe view of a conversation from `side`'s point of view (no emails, no internal ids of others). */
export function serializeConversation(conv: ConversationWithParties, side: ChatSide) {
  const peer =
    side === "buyer"
      ? {
          kind: "supplier" as const,
          id: conv.supplier.id,
          slug: conv.supplier.slug,
          name: conv.supplier.name,
          avatarUrl: conv.supplier.logo,
          location: [conv.supplier.city, conv.supplier.country].filter(Boolean).join(", "),
          verified: conv.supplier.verified,
          rating: conv.supplier.storeRating,
          responseTime: conv.supplier.responseTime,
        }
      : {
          kind: "buyer" as const,
          id: null,
          slug: null,
          name: conv.buyer.name || "Acheteur",
          avatarUrl: conv.buyer.avatarUrl,
          location: conv.buyer.country,
          verified: false,
          rating: null,
          responseTime: null,
        };
  return {
    id: conv.id,
    side,
    peer,
    // Realtime channels used to nudge the other participant to refetch (no content is broadcast).
    inboxChannels: { mine: inboxChannel(conv, side), peer: inboxChannel(conv, side === "buyer" ? "supplier" : "buyer") },
    product: conv.product ? { id: conv.product.id, title: conv.product.title, image: firstImage(conv.product.images) } : null,
    lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conv.lastMessagePreview,
    lastSenderRole: conv.lastSenderRole as ChatSide | null,
    unread: side === "buyer" ? conv.buyerUnread : conv.supplierUnread,
    peerLastReadAt: (side === "buyer" ? conv.supplierLastReadAt : conv.buyerLastReadAt)?.toISOString() ?? null,
    createdAt: conv.createdAt.toISOString(),
  };
}
export type ChatConversationDTO = ReturnType<typeof serializeConversation>;

export function inboxChannel(conv: Pick<Conversation, "buyerId" | "supplierId">, side: ChatSide) {
  return side === "buyer" ? `inbox:u:${conv.buyerId}` : `inbox:s:${conv.supplierId}`;
}

/** Inbox channels the current user should listen to. */
export function myInboxChannels(user: ChatUser) {
  const channels = [`inbox:u:${user.id}`];
  if (user.supplier && user.supplier.status === "approved") channels.push(`inbox:s:${user.supplier.id}`);
  return channels;
}

export async function serializeMessages(messages: Message[], viewerId: string) {
  const paths = messages.map((m) => m.attachmentPath).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    for (const item of data ?? []) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderRole: m.senderRole as ChatSide,
    mine: m.senderId === viewerId,
    content: m.content,
    attachment: m.attachmentPath
      ? {
          url: urls.get(m.attachmentPath) ?? null,
          type: m.attachmentType,
          size: m.attachmentSize,
          width: m.attachmentWidth,
          height: m.attachmentHeight,
        }
      : null,
    createdAt: m.createdAt.toISOString(),
  }));
}
export type ChatMessageDTO = Awaited<ReturnType<typeof serializeMessages>>[number];

/** Normalises user text: strips control characters (keeps \n and \t), trims, enforces length. */
export function cleanContent(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") throw new ChatError(400, "Message invalide");
   
  const text = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n").trim();
  if (text.length > MAX_MESSAGE_LENGTH) throw new ChatError(400, `Message trop long (${MAX_MESSAGE_LENGTH} caractères max).`);
  return text || null;
}

/** Detects the real image type from its first bytes (never trust the client's MIME type). */
export function sniffImage(buf: Uint8Array): { mime: "image/jpeg" | "image/png" | "image/webp"; ext: string } | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b))
    return { mime: "image/png", ext: "png" };
  if (
    buf.length >= 12 &&
    String.fromCharCode(...buf.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...buf.slice(8, 12)) === "WEBP"
  )
    return { mime: "image/webp", ext: "webp" };
  return null;
}

export async function assertRateLimit(userId: string) {
  const recent = await db.message.count({
    where: { senderId: userId, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= RATE_LIMIT_PER_MINUTE) throw new ChatError(429, "Trop de messages. Patientez quelques secondes.");
}

export async function uploadAttachment(conversationId: string, file: File, dims: { width?: number; height?: number }) {
  if (file.size === 0) throw new ChatError(400, "Fichier vide");
  if (file.size > MAX_IMAGE_BYTES) throw new ChatError(413, "Image trop lourde (4 Mo max).");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw new ChatError(415, "Format non pris en charge (JPEG, PNG ou WebP uniquement).");

  const path = `${conversationId}/${crypto.randomUUID()}.${kind.ext}`;
  const supabase = await getSupabaseServer();
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[chat] storage upload failed", error.message);
    throw new ChatError(503, "Envoi de l'image impossible pour le moment. Réessayez plus tard.");
  }
  const clamp = (n?: number) => (Number.isFinite(n) && n! > 0 && n! < 20000 ? Math.round(n!) : null);
  return { path, mime: kind.mime, size: bytes.length, width: clamp(dims.width), height: clamp(dims.height) };
}

export async function removeAttachment(path: string) {
  try {
    const supabase = await getSupabaseServer();
    await supabase.storage.from(CHAT_BUCKET).remove([path]);
  } catch {
    /* best effort (no DELETE policy for users: an orphan file is harmless and private) */
  }
}

/** Maps auth/chat errors to JSON responses; anything else is logged and hidden. */
export function chatErrorResponse(e: unknown) {
  if (e instanceof ChatError) return NextResponse.json({ error: e.message }, { status: e.status });
  return authErrorResponse(e);
}
