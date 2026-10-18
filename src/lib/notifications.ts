/**
 * Who gets which e-mail (server only). Each function re-reads the data it needs,
 * so callers just pass ids, and is meant to run via `afterResponse`.
 * The buyer's e-mail is never sent to a shop and vice versa.
 */
import { db } from "@/lib/db";
import { sendMail, type Mail } from "@/lib/email";

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const METHOD: Record<string, string> = {
  cod: "Paiement à la livraison",
  whatsapp: "Mobile Money via WhatsApp",
  cinetpay: "Paiement en ligne",
};
const ORDERS_LINK = { label: "Voir mes commandes", path: "/?open=purchases" };
const SHOP_ORDERS_LINK = { label: "Gérer la commande", path: "/?open=sales" };

const orderInclude = {
  user: { select: { email: true, name: true } },
  supplier: { select: { name: true, user: { select: { email: true } } } },
  items: { select: { title: true, quantity: true } },
} as const;

type OrderForMail = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;
const loadOrder = (id: string) => db.order.findUnique({ where: { id }, include: orderInclude });

const itemsLine = (o: OrderForMail) =>
  o.items.slice(0, 5).map((i) => `${i.quantity} × ${i.title}`).join(", ") + (o.items.length > 5 ? "…" : "");

const send = (m: Mail) => sendMail(m);

/** Checkout: one recap to the buyer, one "new order" per shop. */
export async function notifyCheckout(paymentId: string) {
  const orders = await db.order.findMany({ where: { paymentId }, include: orderInclude, orderBy: { createdAt: "asc" } });
  if (!orders.length) return;
  const buyer = orders[0].user;
  const total = orders.reduce((s, o) => s + o.total, 0);
  const method = orders[0].paymentMethod;
  await send({
    to: buyer.email,
    subject: orders.length > 1 ? `Commandes ${orders.map((o) => o.ref).join(", ")} reçues` : `Commande ${orders[0].ref} reçue`,
    lines: [
      `Bonjour ${buyer.name ?? ""}, merci pour votre commande.`.replace(" ,", ","),
      method === "whatsapp"
        ? "Finalisez le paiement Mobile Money avec notre équipe sur WhatsApp : la boutique prépare la commande dès la confirmation."
        : method === "cinetpay"
          ? "Votre paiement en ligne est en cours de vérification."
          : "La boutique va confirmer votre commande puis vous contacter pour la livraison. Vous payez à la réception.",
    ],
    rows: [...orders.map((o) => [`${o.ref} · ${o.supplier.name}`, fcfa(o.total)] as [string, string]), ["Total", fcfa(total)], ["Paiement", METHOD[method] ?? method]],
    cta: ORDERS_LINK,
    idempotencyKey: `checkout-buyer-${paymentId}`,
  });
  for (const o of orders) {
    await send({
      to: o.supplier.user.email,
      subject: `Nouvelle commande ${o.ref}`,
      lines: [
        `Vous avez reçu une nouvelle commande sur ${o.supplier.name}.`,
        o.paymentMethod === "cinetpay"
          ? "Attendez la confirmation du paiement en ligne avant de l'accepter."
          : "Acceptez-la depuis votre espace marchand pour voir les coordonnées de livraison du client.",
      ],
      rows: [["Articles", itemsLine(o)], ["Montant", fcfa(o.total)], ["Paiement", METHOD[o.paymentMethod] ?? o.paymentMethod]],
      cta: SHOP_ORDERS_LINK,
      idempotencyKey: `checkout-shop-${o.id}`,
    });
  }
}

const BUYER_UPDATE: Record<string, (o: OrderForMail) => { subject: string; lines: string[] }> = {
  confirm: (o) => ({ subject: `Commande ${o.ref} acceptée`, lines: [`${o.supplier.name} a accepté votre commande et prépare l'envoi.`] }),
  ship: (o) => ({
    subject: `Commande ${o.ref} expédiée`,
    lines: [`${o.supplier.name} a expédié votre commande.`, ...(o.trackingInfo ? [`Suivi / livreur : ${o.trackingInfo}`] : [])],
  }),
  deliver: (o) => ({ subject: `Commande ${o.ref} livrée`, lines: ["Votre commande est marquée livrée. Merci pour votre confiance !"] }),
  cancel: (o) => ({
    subject: `Commande ${o.ref} annulée`,
    lines: [
      o.cancelledBy === "supplier" ? `${o.supplier.name} a annulé votre commande.` : o.cancelledBy === "admin" ? "Notre équipe a annulé votre commande." : "Votre commande a été annulée.",
      ...(o.cancelReason ? [`Motif : ${o.cancelReason}`] : []),
      ...(o.paymentStatus === "refund_due" ? ["Votre paiement vous sera remboursé : notre équipe vous contactera."] : []),
    ],
  }),
  mark_paid: (o) => ({ subject: `Paiement reçu pour ${o.ref}`, lines: ["Nous avons bien reçu votre paiement Mobile Money. La boutique prépare votre commande."] }),
};

/** After a status change: tells the other party (never the one who acted). */
export async function notifyOrderAction(orderId: string, action: string, actor: "buyer" | "supplier" | "admin") {
  const o = await loadOrder(orderId);
  if (!o) return;
  const key = `order-${action}-${orderId}`;
  const rows: [string, string][] = [["Commande", o.ref], ["Montant", fcfa(o.total)]];

  if (actor !== "buyer" && BUYER_UPDATE[action]) {
    const m = BUYER_UPDATE[action](o);
    await send({ to: o.user.email, ...m, rows, cta: ORDERS_LINK, idempotencyKey: `${key}-buyer` });
  }
  if (actor !== "supplier" && (action === "cancel" || action === "mark_paid")) {
    await send({
      to: o.supplier.user.email,
      subject: action === "cancel" ? `Commande ${o.ref} annulée` : `Commande ${o.ref} payée`,
      lines:
        action === "cancel"
          ? [actor === "buyer" ? "Le client a annulé sa commande. Le stock réservé a été remis en vente." : "Notre équipe a annulé cette commande. Le stock réservé a été remis en vente.", ...(o.cancelReason ? [`Motif : ${o.cancelReason}`] : [])]
          : ["Le paiement Mobile Money du client est confirmé. Vous pouvez préparer la commande."],
      rows,
      cta: SHOP_ORDERS_LINK,
      idempotencyKey: `${key}-shop`,
    });
  }
}

/** Online payment result (webhook / return page). */
export async function notifyPaymentResult(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, select: { status: true } });
  if (!payment || (payment.status !== "paid" && payment.status !== "failed")) return;
  const orders = await db.order.findMany({ where: { paymentId }, include: orderInclude });
  if (!orders.length) return;
  const refs = orders.map((o) => o.ref).join(", ");
  if (payment.status === "paid") {
    await send({ to: orders[0].user.email, subject: `Paiement reçu (${refs})`, lines: ["Votre paiement en ligne est confirmé. La boutique prépare votre commande."], cta: ORDERS_LINK, idempotencyKey: `pay-paid-buyer-${paymentId}` });
    for (const o of orders.filter((x) => x.status !== "cancelled")) {
      await send({ to: o.supplier.user.email, subject: `Commande ${o.ref} payée`, lines: ["Le paiement en ligne est confirmé : vous pouvez accepter et préparer la commande."], rows: [["Montant", fcfa(o.total)]], cta: SHOP_ORDERS_LINK, idempotencyKey: `pay-paid-shop-${o.id}` });
    }
  } else {
    await send({ to: orders[0].user.email, subject: `Paiement non abouti (${refs})`, lines: ["Le paiement n'a pas abouti : la commande a été annulée et aucun montant n'a été débité par notre site. Vous pouvez recommander à tout moment."], cta: ORDERS_LINK, idempotencyKey: `pay-failed-buyer-${paymentId}` });
  }
}

/** Merchant application lifecycle. */
export async function notifyMerchantApplied(supplierId: string) {
  const s = await db.supplier.findUnique({ where: { id: supplierId }, select: { name: true, city: true, user: { select: { email: true } } } });
  if (!s) return;
  await send({
    to: s.user.email,
    subject: "Demande de boutique reçue",
    lines: [`Votre demande pour « ${s.name} » est en cours de vérification par notre équipe. Vous recevrez un e-mail dès la décision.`],
    cta: { label: "Mon espace marchand", path: "/?open=shop" },
    idempotencyKey: `merchant-applied-${supplierId}-${Date.now().toString().slice(0, -5)}`,
  });
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "active" }, select: { email: true }, take: 20 });
  if (admins.length) {
    await send({
      to: admins.map((a) => a.email),
      subject: `Nouvelle boutique à valider : ${s.name}`,
      lines: [`Une boutique attend votre validation (${s.city}).`],
      cta: { label: "Ouvrir la console", path: "/?open=admin" },
      idempotencyKey: `merchant-applied-admins-${supplierId}-${Date.now().toString().slice(0, -5)}`,
    });
  }
}

export async function notifyMerchantDecision(supplierId: string, status: string) {
  const s = await db.supplier.findUnique({ where: { id: supplierId }, select: { name: true, statusReason: true, reviewedAt: true, user: { select: { email: true } } } });
  if (!s) return;
  const msg: Record<string, { subject: string; lines: string[] }> = {
    approved: { subject: "Votre boutique est validée", lines: [`« ${s.name} » est maintenant en ligne. Ajoutez vos produits pour commencer à vendre.`] },
    rejected: { subject: "Votre demande de boutique est à compléter", lines: [`La demande pour « ${s.name} » n'a pas été validée.`, ...(s.statusReason ? [`Motif : ${s.statusReason}`] : []), "Corrigez les informations dans votre espace pour la soumettre à nouveau."] },
    suspended: { subject: "Votre boutique est suspendue", lines: [`« ${s.name} » n'est plus visible sur le site.`, ...(s.statusReason ? [`Motif : ${s.statusReason}`] : []), "Contactez le support pour en savoir plus."] },
  };
  const m = msg[status];
  if (!m) return;
  await send({ to: s.user.email, ...m, cta: { label: "Mon espace marchand", path: "/?open=shop" }, idempotencyKey: `merchant-${status}-${supplierId}-${s.reviewedAt?.getTime() ?? 0}` });
}
