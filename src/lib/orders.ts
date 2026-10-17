/**
 * Orders & checkout (server only).
 *
 * Security rules
 * - Prices, totals, stock and availability are ALWAYS recomputed here from the
 *   database: the browser only sends product ids, quantities and options.
 * - A checkout is idempotent per (user, Idempotency-Key): a double click or a
 *   network retry returns the same orders instead of creating new ones.
 * - Stock is reserved inside the same transaction with a conditional update
 *   (stock >= qty) and a DB CHECK constraint, so it can never be oversold.
 * - Status changes are compare-and-set (updateMany where status = expected) so two
 *   concurrent actions cannot both apply; every change is written to the timeline.
 */
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { baseToXof } from "@/lib/catalog";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/merchant";
import { cleanMultiline, cleanText, parseJsonArray, toInt } from "@/lib/sanitize";
import { cinetpayConfig, roundUpTo5 } from "@/lib/payments/cinetpay";

export type Viewer = Awaited<ReturnType<typeof requireUser>>;
export type PaymentMethod = "cod" | "cinetpay";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type OrderAction = "confirm" | "ship" | "deliver" | "cancel";
type ActorRole = "buyer" | "supplier" | "admin" | "system";

export const MAX_LINES = 50;
const MAX_QTY = 1_000_000;
const CHECKOUTS_PER_10_MIN = 10;

export function availablePaymentMethods(): PaymentMethod[] {
  return cinetpayConfig() ? ["cod", "cinetpay"] : ["cod"];
}

// ------------------------------------------------------------------ quote
export type CartItemInput = { productId: string; quantity: number; variant: string | null };
export type QuoteLine = {
  productId: string;
  title: string;
  image: string;
  unit: string;
  variant: string | null;
  quantity: number;
  unitPrice: number; // XOF
  total: number; // XOF
  minOrder: number;
  stock: number | null;
};
export type QuoteGroup = { supplierId: string; supplierName: string; lines: QuoteLine[]; subtotal: number };
export type QuoteIssue = { productId: string; variant: string | null; message: string };
export type Quote = { groups: QuoteGroup[]; total: number; issues: QuoteIssue[]; currency: "XOF" };

/** Normalises the raw cart sent by the browser (merges duplicate lines). */
export function parseCartItems(raw: unknown): CartItemInput[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new ApiError(400, "Votre panier est vide.");
  const merged = new Map<string, CartItemInput>();
  for (const r of raw.slice(0, MAX_LINES * 2) as Record<string, unknown>[]) {
    const productId = cleanText(r?.productId, 40);
    const quantity = toInt(r?.quantity);
    const variant = cleanText(r?.variant, 120) || null;
    if (!productId) continue;
    if (!(quantity >= 1 && quantity <= MAX_QTY)) throw new ApiError(400, "Quantité invalide.");
    const key = `${productId}|${variant ?? ""}`;
    const prev = merged.get(key);
    merged.set(key, { productId, variant, quantity: Math.min(MAX_QTY, (prev?.quantity ?? 0) + quantity) });
  }
  if (merged.size === 0) throw new ApiError(400, "Votre panier est vide.");
  if (merged.size > MAX_LINES) throw new ApiError(400, `${MAX_LINES} articles différents maximum par commande.`);
  return [...merged.values()];
}

/** Unit price for a quantity: the highest tier whose minimum is reached. */
export function unitPriceFor(tiers: { minQty: number; price: number }[], qty: number): number | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let price: number | null = null;
  for (const t of sorted) if (qty >= t.minQty) price = t.price;
  return price ?? (sorted[0]?.price ?? null);
}

/**
 * Prices the cart from the database. Problems (unavailable product, quantity under
 * the minimum, stock…) are returned as `issues` for the UI; `placeOrder` refuses them.
 */
export async function quoteCart(buyer: Viewer, items: CartItemInput[]): Promise<Quote> {
  const products = await db.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] }, ...PUBLIC_PRODUCT_WHERE },
    include: { priceTiers: true, supplier: { select: { id: true, name: true, userId: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const issues: QuoteIssue[] = [];
  const groups = new Map<string, QuoteGroup>();
  const reserved = new Map<string, number>(); // same product in several variants shares the stock

  for (const item of items) {
    const p = byId.get(item.productId);
    const issue = (message: string) => issues.push({ productId: item.productId, variant: item.variant, message });
    if (!p) {
      issue("Ce produit n'est plus disponible.");
      continue;
    }
    if (p.supplier.userId === buyer.id) {
      issue("Vous ne pouvez pas commander dans votre propre boutique.");
      continue;
    }
    const minOrder = Math.max(1, Number.parseInt(p.minOrder, 10) || 1);
    if (item.quantity < minOrder) issue(`Quantité minimum : ${minOrder} ${p.unit}.`);
    const used = (reserved.get(p.id) ?? 0) + item.quantity;
    reserved.set(p.id, used);
    if (p.stock != null && used > p.stock) {
      issue(p.stock === 0 ? "Rupture de stock." : `Stock disponible : ${p.stock} ${p.unit}.`);
    }
    if (item.variant) {
      const allowed = new Set(parseJsonArray<{ options?: string[] }>(p.variantsJson).flatMap((v) => v.options ?? []));
      if (item.variant.split(",").map((s) => s.trim()).some((v) => !allowed.has(v))) issue("Option non proposée pour ce produit.");
    }
    const base = unitPriceFor(p.priceTiers, item.quantity);
    if (base == null) {
      issue("Prix non défini par le fournisseur.");
      continue;
    }
    const unitPrice = baseToXof(base);
    const group = groups.get(p.supplierId) ?? { supplierId: p.supplierId, supplierName: p.supplier.name, lines: [], subtotal: 0 };
    group.lines.push({
      productId: p.id,
      title: p.title,
      image: parseJsonArray<string>(p.images)[0] ?? "",
      unit: p.unit,
      variant: item.variant,
      quantity: item.quantity,
      unitPrice,
      total: unitPrice * item.quantity,
      minOrder,
      stock: p.stock,
    });
    group.subtotal += unitPrice * item.quantity;
    groups.set(p.supplierId, group);
  }
  const list = [...groups.values()];
  return { groups: list, total: list.reduce((n, g) => n + g.subtotal, 0), issues, currency: "XOF" };
}

// ------------------------------------------------------------------ checkout
const ORDER_INCLUDE = {
  items: true,
  events: { orderBy: { createdAt: "asc" } },
  supplier: { select: { id: true, name: true, phone: true, city: true, userId: true } },
  user: { select: { id: true, name: true, email: true } },
  payment: { select: { id: true, provider: true, status: true, amount: true, paymentUrl: true } },
} satisfies Prisma.OrderInclude;
export type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

function newRef() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `IJC-${ymd}-${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

export type CheckoutInput = {
  items: CartItemInput[];
  addressId: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  idempotencyKey: string;
};

export function parseCheckoutInput(body: Record<string, unknown>, idempotencyKey: string | null): CheckoutInput {
  if (!idempotencyKey || !/^[A-Za-z0-9-]{16,80}$/.test(idempotencyKey)) {
    throw new ApiError(400, "Requête invalide (clé d'idempotence manquante).");
  }
  const paymentMethod = body.paymentMethod === "cinetpay" ? "cinetpay" : body.paymentMethod === "cod" ? "cod" : null;
  if (!paymentMethod) throw new ApiError(400, "Choisissez un mode de paiement.");
  if (!availablePaymentMethods().includes(paymentMethod)) throw new ApiError(400, "Ce mode de paiement n'est pas disponible.");
  const addressId = cleanText(body.addressId, 40);
  if (!addressId) throw new ApiError(400, "Choisissez une adresse de livraison.");
  return {
    items: parseCartItems(body.items),
    addressId,
    paymentMethod,
    note: cleanMultiline(body.note, 500) || null,
    idempotencyKey,
  };
}

export type CheckoutResult = { paymentId: string; provider: PaymentMethod; orders: { id: string; ref: string; total: number }[]; amount: number; paymentStatus: string };

async function existingCheckout(userId: string, key: string): Promise<CheckoutResult | null> {
  const p = await db.payment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
    include: { orders: { select: { id: true, ref: true, total: true }, orderBy: { createdAt: "asc" } } },
  });
  return p
    ? { paymentId: p.id, provider: p.provider as PaymentMethod, orders: p.orders, amount: p.amount, paymentStatus: p.status }
    : null;
}

/** Creates one order per shop + one payment, reserving stock atomically. */
export async function placeOrder(buyer: Viewer, input: CheckoutInput): Promise<CheckoutResult> {
  const replay = await existingCheckout(buyer.id, input.idempotencyKey);
  if (replay) return replay;

  const recent = await db.payment.count({ where: { userId: buyer.id, createdAt: { gt: new Date(Date.now() - 600_000) } } });
  if (recent >= CHECKOUTS_PER_10_MIN) throw new ApiError(429, "Trop de commandes en peu de temps. Réessayez dans quelques minutes.");

  const address = await db.address.findFirst({ where: { id: input.addressId, userId: buyer.id } });
  if (!address) throw new ApiError(400, "Adresse de livraison introuvable.");

  const quote = await quoteCart(buyer, input.items);
  if (quote.issues.length) throw new ApiError(409, quote.issues[0].message);
  if (quote.total <= 0) throw new ApiError(400, "Montant de commande invalide.");

  const amount = input.paymentMethod === "cinetpay" ? roundUpTo5(quote.total) : quote.total;
  try {
    return await db.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            userId: buyer.id,
            idempotencyKey: input.idempotencyKey,
            provider: input.paymentMethod,
            status: input.paymentMethod === "cod" ? "cod" : "pending",
            amount,
            transactionId: `IJC${Date.now().toString(36).toUpperCase()}${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`,
          },
        });
        const orders: CheckoutResult["orders"] = [];
        for (const g of quote.groups) {
          for (const line of g.lines) {
            if (line.stock == null) continue;
            const r = await tx.product.updateMany({
              where: { id: line.productId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (r.count !== 1) throw new ApiError(409, `Stock insuffisant pour « ${line.title} ». Actualisez votre panier.`);
          }
          const order = await tx.order.create({
            data: {
              ref: newRef(),
              userId: buyer.id,
              supplierId: g.supplierId,
              status: "pending",
              paymentMethod: input.paymentMethod,
              paymentStatus: "unpaid",
              paymentId: payment.id,
              currency: "XOF",
              subtotal: g.subtotal,
              shipping: 0,
              total: g.subtotal,
              addressId: address.id,
              shippingName: address.name,
              shippingPhone: address.phone,
              shippingCountry: address.country,
              shippingCity: address.city,
              shippingLine: [address.line, address.zip].filter(Boolean).join(" · "),
              buyerNote: input.note,
              items: {
                create: g.lines.map((l) => ({
                  productId: l.productId,
                  title: l.title,
                  image: l.image,
                  quantity: l.quantity,
                  unit: l.unit,
                  price: l.unitPrice,
                  variant: l.variant,
                })),
              },
              events: { create: { status: "pending", actorId: buyer.id, actorRole: "buyer", note: "Commande passée" } },
            },
            select: { id: true, ref: true, total: true },
          });
          orders.push(order);
        }
        return { paymentId: payment.id, provider: input.paymentMethod, orders, amount, paymentStatus: payment.status };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
  } catch (e) {
    // Concurrent double submit with the same key: the other request won, return its result.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await existingCheckout(buyer.id, input.idempotencyKey);
      if (again) return again;
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      throw new ApiError(409, "Le stock a changé pendant votre commande. Réessayez.");
    }
    throw e;
  }
}

// ------------------------------------------------------------------ lifecycle
type Tx = Prisma.TransactionClient;

async function restoreStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { productId: true, quantity: true } });
  for (const it of items) {
    // Only products whose stock is tracked (null = on demand stays null).
    await tx.product.updateMany({ where: { id: it.productId, stock: { not: null } }, data: { stock: { increment: it.quantity } } });
  }
}

/** Who is looking at an order: buyer, owning shop, or platform admin (else 404). */
export async function getOrderFor(viewer: Viewer, id: string): Promise<{ order: OrderFull; role: Exclude<ActorRole, "system"> }> {
  const order = await db.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (order) {
    if (order.userId === viewer.id) return { order, role: "buyer" };
    if (order.supplier.userId === viewer.id) return { order, role: "supplier" };
    if (viewer.role === "ADMIN") return { order, role: "admin" };
  }
  throw new ApiError(404, "Commande introuvable");
}

const TRANSITIONS: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus; roles: ActorRole[] }> = {
  confirm: { from: ["pending"], to: "confirmed", roles: ["supplier", "admin"] },
  ship: { from: ["confirmed"], to: "shipped", roles: ["supplier", "admin"] },
  deliver: { from: ["shipped"], to: "delivered", roles: ["supplier", "admin"] },
  cancel: { from: ["pending", "confirmed"], to: "cancelled", roles: ["buyer", "supplier", "admin"] },
};

/** Applies an action with role checks and compare-and-set on the current status. */
export async function transitionOrder(
  viewer: Viewer,
  orderId: string,
  action: OrderAction,
  opts: { note?: unknown; reason?: unknown; tracking?: unknown },
) {
  const { order, role } = await getOrderFor(viewer, orderId);
  const rule = TRANSITIONS[action];
  if (!rule) throw new ApiError(400, "Action inconnue");
  if (!rule.roles.includes(role)) throw new ApiError(403, "Action non autorisée");
  if (!rule.from.includes(order.status as OrderStatus)) throw new ApiError(409, "Le statut de la commande a changé. Actualisez la page.");

  // Online payment: the shop confirms only once the money is received.
  if (action === "confirm" && order.paymentMethod === "cinetpay" && order.paymentStatus !== "paid") {
    throw new ApiError(409, "Paiement en ligne non encore reçu : attendez la confirmation avant d'accepter.");
  }
  // A buyer can cancel alone only before the shop accepts and before paying online.
  if (action === "cancel" && role === "buyer" && (order.status !== "pending" || order.paymentStatus === "paid")) {
    throw new ApiError(409, "La commande est déjà acceptée ou payée : contactez le fournisseur par messagerie.");
  }
  const reason = cleanText(opts.reason, 300);
  if (action === "cancel" && role !== "buyer" && reason.length < 5) throw new ApiError(400, "Indiquez le motif d'annulation (5 caractères minimum).");
  const note = cleanText(opts.note, 300) || null;
  const tracking = cleanText(opts.tracking, 200) || null;
  const now = new Date();

  const data: Prisma.OrderUpdateManyMutationInput = { status: rule.to };
  if (action === "confirm") data.confirmedAt = now;
  if (action === "ship") {
    data.shippedAt = now;
    if (tracking) data.trackingInfo = tracking;
  }
  if (action === "deliver") {
    data.deliveredAt = now;
    // Cash on delivery: the money is collected at delivery.
    if (order.paymentMethod === "cod") data.paymentStatus = "paid";
  }
  if (action === "cancel") {
    data.cancelledAt = now;
    data.cancelReason = reason || "Annulée par le client";
    data.cancelledBy = role;
    if (order.paymentStatus === "paid") data.paymentStatus = "refund_due";
  }

  await db.$transaction(async (tx) => {
    const r = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data });
    if (r.count !== 1) throw new ApiError(409, "Le statut de la commande a changé. Actualisez la page.");
    if (action === "cancel") await restoreStock(tx, orderId);
    await tx.orderEvent.create({
      data: { orderId, status: rule.to, actorId: viewer.id, actorRole: role, note: action === "cancel" ? data.cancelReason as string : tracking ?? note },
    });
  });
  return getOrderFor(viewer, orderId);
}

// ------------------------------------------------------------------ payments
/**
 * Applies the authoritative result of an online payment to the payment and its
 * orders. Idempotent: replays (webhook + return page) change nothing twice.
 */
export async function settlePayment(paymentId: string, outcome: { status: "paid" | "failed" | "pending"; amount: number | null; currency: string | null; raw: string }) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.provider === "cod") return payment;
  if (outcome.status === "pending" || payment.status === "paid") {
    if (outcome.raw) await db.payment.update({ where: { id: paymentId }, data: { providerData: outcome.raw } });
    return db.payment.findUnique({ where: { id: paymentId } });
  }

  if (outcome.status === "paid") {
    // Never trust an amount we did not ask for.
    if (outcome.amount !== payment.amount || (outcome.currency && outcome.currency !== payment.currency)) {
      console.error("[payments] amount mismatch", { paymentId, expected: payment.amount, got: outcome.amount, currency: outcome.currency });
      await db.payment.update({ where: { id: paymentId }, data: { providerStatus: "AMOUNT_MISMATCH", providerData: outcome.raw } });
      return db.payment.findUnique({ where: { id: paymentId } });
    }
    await db.$transaction(async (tx) => {
      const r = await tx.payment.updateMany({ where: { id: paymentId, status: { not: "paid" } }, data: { status: "paid", paidAt: new Date(), providerStatus: "ACCEPTED", providerData: outcome.raw } });
      if (r.count !== 1) return;
      const orders = await tx.order.findMany({ where: { paymentId }, select: { id: true, status: true } });
      for (const o of orders) {
        if (o.status === "cancelled") {
          // Paid after cancellation (rare race): the shop/admin must refund.
          await tx.order.update({ where: { id: o.id }, data: { paymentStatus: "refund_due" } });
          await tx.orderEvent.create({ data: { orderId: o.id, status: "cancelled", actorRole: "system", note: "Paiement reçu après annulation : remboursement à effectuer" } });
        } else {
          await tx.order.update({ where: { id: o.id }, data: { paymentStatus: "paid" } });
          await tx.orderEvent.create({ data: { orderId: o.id, status: o.status, actorRole: "system", note: "Paiement en ligne reçu" } });
        }
      }
    });
  } else {
    await db.$transaction(async (tx) => {
      const r = await tx.payment.updateMany({ where: { id: paymentId, status: "pending" }, data: { status: "failed", providerStatus: "REFUSED", providerData: outcome.raw } });
      if (r.count !== 1) return;
      const orders = await tx.order.findMany({ where: { paymentId, status: "pending" }, select: { id: true } });
      for (const o of orders) {
        const u = await tx.order.updateMany({
          where: { id: o.id, status: "pending" },
          data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "system", cancelReason: "Paiement en ligne échoué ou annulé" },
        });
        if (u.count === 1) {
          await restoreStock(tx, o.id);
          await tx.orderEvent.create({ data: { orderId: o.id, status: "cancelled", actorRole: "system", note: "Paiement en ligne échoué ou annulé" } });
        }
      }
    });
  }
  return db.payment.findUnique({ where: { id: paymentId } });
}

/** Cancels the orders of a payment that could not even be started (provider down). */
export async function abortPayment(paymentId: string, reason: string) {
  await settlePayment(paymentId, { status: "failed", amount: null, currency: null, raw: JSON.stringify({ reason }).slice(0, 500) });
}

// ------------------------------------------------------------------ views
export function orderView(o: OrderFull, role: "buyer" | "supplier" | "admin") {
  return {
    id: o.id,
    ref: o.ref,
    role,
    status: o.status as OrderStatus,
    paymentMethod: o.paymentMethod as PaymentMethod,
    paymentStatus: o.paymentStatus,
    payment: o.payment ? { id: o.payment.id, status: o.payment.status, amount: o.payment.amount, paymentUrl: o.payment.status === "pending" ? o.payment.paymentUrl : null } : null,
    currency: o.currency,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    supplier: { id: o.supplier.id, name: o.supplier.name, phone: role === "buyer" && o.status === "pending" ? null : o.supplier.phone },
    // The shop sees the buyer's contact only once it has to deliver; never the email.
    buyer: role === "buyer" ? null : { name: o.user.name ?? "Client" },
    shippingAddress:
      role === "supplier" && o.status === "pending"
        ? { name: o.shippingName, city: o.shippingCity, country: o.shippingCountry, phone: null, line: null }
        : { name: o.shippingName, city: o.shippingCity, country: o.shippingCountry, phone: o.shippingPhone, line: o.shippingLine },
    buyerNote: o.buyerNote,
    trackingInfo: o.trackingInfo,
    cancelReason: o.cancelReason,
    cancelledBy: o.cancelledBy,
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, title: i.title, image: i.image, quantity: i.quantity, unit: i.unit, price: i.price, variant: i.variant })),
    events: o.events.map((e) => ({ id: e.id, status: e.status, note: e.note, actorRole: e.actorRole, createdAt: e.createdAt.toISOString() })),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
export type OrderDTO = ReturnType<typeof orderView>;

export { ORDER_INCLUDE };
