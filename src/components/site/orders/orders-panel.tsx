"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, Check, CreditCard, Loader2, MapPin, MessageCircle, Package, RefreshCw, Search, Truck, X, PackageCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { apiFetch, jsonInit } from "@/lib/api-client";
import { ReasonDialog } from "../admin/shared";
import { whatsappLink, whatsappPaymentText } from "@/lib/brand";
import type { OrderDTO } from "@/lib/orders";

type Scope = "buyer" | "supplier" | "admin";
type Filter = "all" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;
const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Acceptée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};
const STATUS_TONE: Record<string, string> = {
  pending: "bg-[#FF6A00]",
  confirmed: "bg-[#1A1F8A]",
  shipped: "bg-[#337AB7]",
  delivered: "bg-[#16A34A]",
  cancelled: "bg-[#6B7280]",
};
const PAY_LABEL: Record<string, string> = {
  unpaid: "Non payée",
  paid: "Payée",
  refund_due: "Remboursement dû",
  refunded: "Remboursée",
};

const METHOD_LABEL: Record<string, string> = {
  cod: "À la livraison",
  cinetpay: "En ligne",
  whatsapp: "Mobile Money",
};

function StatusPill({ status }: { status: string }) {
  return <span className={`${STATUS_TONE[status] ?? "bg-[#999]"} text-white text-[10px] font-bold uppercase px-2 py-0.5 whitespace-nowrap`}>{STATUS_LABEL[status] ?? status}</span>;
}
function PayPill({ o }: { o: OrderDTO }) {
  const tone = o.paymentStatus === "paid" ? "text-[#16A34A] border-[#16A34A]" : o.paymentStatus === "refund_due" ? "text-[#DC2626] border-[#DC2626]" : "text-[#666] border-[#DADAD9]";
  return (
    <span className={`border ${tone} text-[10px] font-bold uppercase px-1.5 py-0.5 whitespace-nowrap`}>
      {METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod} · {PAY_LABEL[o.paymentStatus] ?? o.paymentStatus}
    </span>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Acceptées" },
  { key: "shipped", label: "Expédiées" },
  { key: "delivered", label: "Livrées" },
  { key: "cancelled", label: "Annulées" },
];

/** Orders list + detail, shared by the client space, the merchant space and the admin console. */
export function OrdersPanel({ scope }: { scope: Scope }) {
  const [filter, setFilter] = useState<Filter>(scope === "supplier" ? "pending" : "all");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<OrderDTO[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useCallback(
    (after?: string | null) => {
      const p = new URLSearchParams({ scope });
      if (filter !== "all") p.set("status", filter);
      if (q.trim()) p.set("q", q.trim());
      if (after) p.set("cursor", after);
      return apiFetch<{ orders: OrderDTO[]; nextCursor: string | null; counts: Record<string, number> }>(`/api/orders?${p}`);
    },
    [scope, filter, q],
  );

  const load = useCallback(async () => {
    try {
      const d = await query();
      setOrders(d.orders);
      setCursor(d.nextCursor);
      setCounts(d.counts);
    } catch (e) {
      toast.error((e as Error).message);
      setOrders((o) => o ?? []);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const d = await query(cursor);
      setOrders((o) => [...(o ?? []), ...d.orders]);
      setCursor(d.nextCursor);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (openId) {
    return (
      <OrderDetail
        id={openId}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
      />
    );
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const title = scope === "buyer" ? "Mes commandes" : scope === "supplier" ? "Commandes reçues" : "Toutes les commandes";

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="benjamin-section-title">{title}</h3>
            <p className="text-[11px] text-[#888] mt-0.5">{total} commande{total > 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => void load()} className="btn-outline-grey !px-2" aria-label="Actualiser"><RefreshCw className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex overflow-x-auto benjamin-scroll">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => { if (f.key !== filter) { setOrders(null); setFilter(f.key); } }}
                className={`shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase border flex items-center gap-1.5 ${filter === f.key ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "bg-white text-[#666] border-[#DADAD9]"}`}>
                {f.label}
                <span className={`text-[10px] ${f.key === "pending" && scope !== "buyer" && counts.pending ? "bg-[#FF6A00] text-white px-1" : "opacity-80"}`}>
                  {f.key === "all" ? total : counts[f.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center border border-[#DADAD9] px-2 sm:ml-auto sm:w-56">
            <Search className="w-3.5 h-3.5 text-[#888]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Référence (IJC-…)" aria-label="Rechercher une commande" className="flex-1 px-2 py-1.5 text-[12px] outline-none min-w-0" />
          </label>
        </div>
      </div>

      {orders === null ? (
        <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-[#F3F3F3] animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[#666]">
          <Package className="w-10 h-10 mx-auto text-[#DADAD9] mb-2" />
          {scope === "buyer" ? "Aucune commande pour le moment." : "Aucune commande dans cette liste."}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-[#ECECEC]">
            {orders.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpenId(o.id)} className="w-full text-left p-3 sm:p-4 flex gap-3 hover:bg-[#FAFAFA]">
                  {o.items[0]?.image ? (
                    <img src={o.items[0].image} alt="" className="w-14 h-14 object-cover border border-[#ECECEC] bg-[#F3F3F3] shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-[#F3F3F3] shrink-0 flex items-center justify-center"><Package className="w-5 h-5 text-[#BBB]" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[13px] font-mono">{o.ref}</span>
                      <StatusPill status={o.status} />
                      <PayPill o={o} />
                    </div>
                    <div className="text-[12px] text-[#555] mt-1 truncate">
                      {scope === "buyer" ? o.supplier.name : o.buyer?.name} · {o.items.length} article{o.items.length > 1 ? "s" : ""} · {fmtDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[14px] text-[#FF6A00]">{fcfa(o.total)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {cursor && (
            <div className="p-3 text-center">
              <button onClick={() => void more()} disabled={loadingMore} className="btn-outline-grey text-[12px] inline-flex items-center gap-1.5">
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Voir plus
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Action = "confirm" | "ship" | "deliver" | "cancel" | "mark_paid";
const ACTION_DONE: Record<Action, string> = {
  confirm: "Commande acceptée",
  ship: "Commande marquée expédiée",
  deliver: "Commande livrée",
  cancel: "Commande annulée",
  mark_paid: "Paiement enregistré",
};

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { openChat } = useApp();
  const [o, setO] = useState<OrderDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"cancel" | "ship" | "paid" | null>(null);

  const load = useCallback(async () => {
    try {
      setO((await apiFetch<{ order: OrderDTO }>(`/api/orders/${id}`)).order);
    } catch (e) {
      toast.error((e as Error).message);
      onBack();
    }
  }, [id, onBack]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  async function act(action: Action, extra: Record<string, string> = {}) {
    setBusy(true);
    try {
      const d = await apiFetch<{ order: OrderDTO }>(`/api/orders/${id}`, jsonInit("PATCH", { action, ...extra }));
      setO(d.order);
      toast.success(ACTION_DONE[action]);
    } finally {
      setBusy(false);
    }
  }
  const run = (action: Action) => act(action).catch((e) => toast.error((e as Error).message));

  if (!o) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#1A1F8A]" /></div>;

  const role = o.role;
  const canCancel =
    (o.status === "pending" || o.status === "confirmed") &&
    (role !== "buyer" || (o.status === "pending" && o.paymentStatus !== "paid"));
  const awaitingOnlinePayment = o.paymentMethod === "cinetpay" && o.paymentStatus !== "paid" && o.status === "pending";
  const awaitingWhatsapp = o.paymentMethod === "whatsapp" && o.paymentStatus === "unpaid" && o.status !== "cancelled";
  const steps = ["pending", "confirmed", "shipped", "delivered"];
  const stepIdx = steps.indexOf(o.status);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 text-[#333] hover:text-[#1A1F8A]" aria-label="Retour aux commandes"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-[15px] font-mono">{o.ref}</h3>
            <StatusPill status={o.status} />
            <PayPill o={o} />
          </div>
          <p className="text-[11px] text-[#888]">Passée le {fmtDate(o.createdAt)}</p>
        </div>
      </div>

      {o.status !== "cancelled" && (
        <ol className="grid grid-cols-4 gap-1 px-4 pt-4" aria-label="Avancement">
          {steps.map((s, i) => (
            <li key={s} className="text-center">
              <div className={`h-1.5 ${i <= stepIdx ? "bg-[#16A34A]" : "bg-[#ECECEC]"}`} />
              <span className={`block text-[10px] mt-1 font-bold uppercase ${i <= stepIdx ? "text-[#16A34A]" : "text-[#999]"}`}>{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ol>
      )}
      {o.status === "cancelled" && (
        <div className="m-4 bg-[#F3F4F6] border-l-[3px] border-[#6B7280] px-3 py-2 text-[13px]">
          Annulée {o.cancelledBy === "buyer" ? "par le client" : o.cancelledBy === "supplier" ? "par la boutique" : o.cancelledBy === "admin" ? "par l'équipe" : "automatiquement"}
          {o.cancelReason ? ` : ${o.cancelReason}` : ""}
          {o.paymentStatus === "refund_due" && <div className="text-[#B91C1C] font-semibold mt-1">Paiement reçu : remboursement à effectuer.</div>}
        </div>
      )}

      {awaitingOnlinePayment && (
        <div className="m-4 bg-[#FFF7ED] border-l-[3px] border-[#FF6A00] px-3 py-2.5 text-[13px] flex flex-wrap items-center gap-3">
          <span className="flex-1">{role === "buyer" ? "Paiement en ligne en attente." : "En attente du paiement en ligne du client : n'acceptez pas avant sa confirmation."}</span>
          {role === "buyer" && o.payment?.paymentUrl?.startsWith("https://") && (
            <a href={o.payment.paymentUrl} className="btn-benjamin-orange text-[12px] inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Payer maintenant</a>
          )}
        </div>
      )}

      {awaitingWhatsapp && (
        <div className="m-4 bg-[#F0FDF4] border-l-[3px] border-[#25D366] px-3 py-2.5 text-[13px] flex flex-wrap items-center gap-3">
          <span className="flex-1">
            {role === "buyer"
              ? "Paiement Mobile Money à finaliser avec notre équipe sur WhatsApp."
              : role === "supplier"
                ? "Paiement Mobile Money en cours avec l'équipe : vous serez prévenu dès sa confirmation."
                : "Paiement Mobile Money via WhatsApp : enregistrez-le dès réception."}
          </span>
          {role === "buyer" && (
            <a
              href={whatsappLink(whatsappPaymentText([o.ref], o.total))}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white text-[12px] font-bold uppercase px-3 py-2 inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" /> Payer sur WhatsApp
            </a>
          )}
          {role === "admin" && (
            <button disabled={busy} onClick={() => setDialog("paid")} className="bg-[#16A34A] text-white text-[12px] font-bold uppercase px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50">
              <Check className="w-4 h-4" /> Marquer payée
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="p-4 lg:border-r border-[#ECECEC]">
          <div className="text-[11px] font-bold uppercase text-[#555] mb-2">{role === "buyer" ? o.supplier.name : `Client : ${o.buyer?.name ?? "—"}`}</div>
          <ul className="divide-y divide-[#ECECEC] border border-[#ECECEC]">
            {o.items.map((i) => (
              <li key={i.id} className="p-2.5 flex gap-3">
                {i.image ? <img src={i.image} alt="" className="w-12 h-12 object-cover bg-[#F3F3F3]" /> : <div className="w-12 h-12 bg-[#F3F3F3]" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold line-clamp-2">{i.title}</div>
                  <div className="text-[11px] text-[#777]">{i.quantity} {i.unit} × {fcfa(i.price)}{i.variant ? ` · ${i.variant}` : ""}</div>
                </div>
                <div className="text-[13px] font-bold whitespace-nowrap">{fcfa(i.price * i.quantity)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 text-[13px]">
            <div className="flex justify-between"><span className="text-[#666]">Sous-total</span><span>{fcfa(o.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#666]">Livraison</span><span>{o.shipping ? fcfa(o.shipping) : "À convenir avec la boutique"}</span></div>
            <div className="flex justify-between font-extrabold text-[15px] border-t border-[#ECECEC] pt-1.5"><span>Total</span><span className="text-[#FF6A00]">{fcfa(o.total)}</span></div>
          </div>
          {o.buyerNote && <p className="mt-3 text-[12px] bg-[#FAFAFA] border border-[#ECECEC] p-2"><b>Note du client :</b> {o.buyerNote}</p>}
          {o.trackingInfo && <p className="mt-2 text-[12px] bg-[#EFF6FF] border border-[#BFDBFE] p-2 flex gap-1.5"><Truck className="w-4 h-4 text-[#337AB7] shrink-0" /> {o.trackingInfo}</p>}
        </div>

        <aside className="p-4 space-y-4">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#555] mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Livraison</div>
            <div className="text-[13px]">
              <div className="font-semibold">{o.shippingAddress.name}</div>
              {o.shippingAddress.line && <div>{o.shippingAddress.line}</div>}
              <div>{o.shippingAddress.city}, {o.shippingAddress.country}</div>
              {o.shippingAddress.phone ? <div>{o.shippingAddress.phone}</div> : role === "supplier" && <div className="text-[11px] text-[#888]">Coordonnées visibles après acceptation.</div>}
            </div>
          </div>

          <div className="space-y-2">
            {role !== "buyer" && o.status === "pending" && (
              <button disabled={busy || awaitingOnlinePayment} onClick={() => void run("confirm")} className="w-full bg-[#16A34A] text-white text-[12px] font-bold uppercase py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Check className="w-4 h-4" /> Accepter la commande
              </button>
            )}
            {role !== "buyer" && o.status === "confirmed" && (
              <button disabled={busy} onClick={() => setDialog("ship")} className="w-full bg-[#1A1F8A] text-white text-[12px] font-bold uppercase py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Truck className="w-4 h-4" /> Marquer expédiée
              </button>
            )}
            {role !== "buyer" && o.status === "shipped" && (
              <button disabled={busy} onClick={() => void run("deliver")} className="w-full bg-[#16A34A] text-white text-[12px] font-bold uppercase py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50">
                <PackageCheck className="w-4 h-4" /> {o.paymentMethod !== "cinetpay" && o.paymentStatus === "unpaid" ? "Livrée et encaissée" : "Marquer livrée"}
              </button>
            )}
            {canCancel && (
              <button disabled={busy} onClick={() => (role === "buyer" ? (window.confirm("Annuler cette commande ?") && void run("cancel")) : setDialog("cancel"))}
                className="w-full btn-outline-grey text-[12px] flex items-center justify-center gap-1.5 hover:!border-[#DC2626] hover:!text-[#DC2626]">
                <X className="w-4 h-4" /> Annuler la commande
              </button>
            )}
            {role === "buyer" && (
              <button onClick={() => openChat(o.supplier.id)} className="w-full btn-outline-grey text-[12px] flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> Contacter la boutique
              </button>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase text-[#555] mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Historique</div>
            <ol className="space-y-2 border-l-2 border-[#ECECEC] pl-3">
              {o.events.map((e) => (
                <li key={e.id} className="text-[12px]">
                  <div className="font-semibold">{STATUS_LABEL[e.status] ?? e.status}</div>
                  {e.note && <div className="text-[#555]">{e.note}</div>}
                  <div className="text-[10px] text-[#999]">{fmtDate(e.createdAt)}</div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {dialog === "cancel" && (
        <ReasonDialog
          title="Annuler la commande"
          description="Le client verra ce motif. Le stock réservé est remis en vente automatiquement."
          confirmLabel="Annuler la commande"
          onConfirm={(reason) => act("cancel", { reason })}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "paid" && (
        <ReasonDialog
          title="Paiement Mobile Money reçu"
          description="Confirmez uniquement après avoir vérifié la réception de l'argent. Optionnel : opérateur et référence de la transaction."
          confirmLabel="Marquer payée"
          tone="green"
          requireReason={false}
          placeholder="Ex. Wave, réf. T123456"
          onConfirm={(note) => act("mark_paid", note ? { note } : {})}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "ship" && (
        <ReasonDialog
          title="Commande expédiée"
          description="Optionnel : transporteur, numéro de suivi ou contact du livreur (visible par le client)."
          confirmLabel="Confirmer l'expédition"
          tone="navy"
          requireReason={false}
          placeholder="Ex. Livreur Yango, 07 00 00 00 00"
          onConfirm={(tracking) => act("ship", { tracking })}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
