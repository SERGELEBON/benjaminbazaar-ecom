"use client";

import { unitLabel } from "@/lib/format";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Banknote, Check, ChevronRight, Loader2, Lock, MapPin, MessageCircle, Plus, ShieldCheck, Smartphone, Truck,
} from "lucide-react";
import { whatsappLink, whatsappPaymentText } from "@/lib/brand";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { apiFetch, jsonInit } from "@/lib/api-client";
import type { PaymentMethod, Quote } from "@/lib/orders";
import { AddressEditor, emptyAddress, type Address, type AddressForm } from "./client/client-panels";
import { fcfa } from "./orders/orders-panel";

type CheckoutResponse = {
  paymentId: string;
  provider: PaymentMethod;
  orders: { id: string; ref: string; total: number }[];
  amount: number;
  paymentStatus: string;
  paymentUrl: string | null;
};

const METHODS: Record<PaymentMethod, { label: string; desc: string; icon: typeof Banknote }> = {
  cod: {
    label: "Paiement à la livraison",
    desc: "En espèces ou Mobile Money, directement au livreur.",
    icon: Banknote,
  },
  cinetpay: {
    label: "Paiement en ligne",
    desc: "Orange Money, MTN, Moov, Wave ou carte — sur la page sécurisée CinetPay.",
    icon: Smartphone,
  },
  whatsapp: {
    label: "Mobile Money via WhatsApp",
    desc: "Orange Money, MTN, Moov ou Wave : notre équipe vous envoie les instructions sur WhatsApp.",
    icon: MessageCircle,
  },
};

const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/** Only follow a payment URL that is a real https page (never a script / data URL). */
const safePaymentUrl = (u: string | null) => {
  if (!u) return null;
  try {
    return new URL(u).protocol === "https:" ? u : null;
  } catch {
    return null;
  }
};

/**
 * Checkout: the browser only sends product ids, quantities and options. Prices, stock
 * and totals are recomputed by the server (/api/checkout/quote, then /api/checkout).
 * No payment data is ever typed on this site: online payment happens on the
 * provider's hosted page.
 */
export function CheckoutView() {
  const cart = useApp((s) => s.cart);
  const user = useApp((s) => s.user);
  const { setView, removeOrdered, openDashboard } = useApp.getState();

  const items = useMemo(
    () => cart.map((l) => ({ productId: l.productId, quantity: l.quantity, variant: l.variant ?? null })),
    [cart],
  );

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  // One key per checkout attempt: a double click or a retry after a network error
  // returns the same orders instead of creating duplicates.
  const [idemKey, setIdemKey] = useState(newKey);

  // Redirect to the cart if it is empty (but not while the order is being placed).
  useEffect(() => {
    if (cart.length === 0 && !placing) setView("cart");
  }, [cart.length, placing, setView]);

  const loadAddresses = useCallback(async (select?: string) => {
    try {
      const d = await apiFetch<{ addresses: Address[] }>("/api/me/addresses");
      setAddresses(d.addresses);
      setAddressId((cur) => select ?? (cur && d.addresses.some((a) => a.id === cur) ? cur : d.addresses[0]?.id ?? null));
      if (d.addresses.length === 0) setAdding(true);
    } catch (e) {
      toast.error((e as Error).message);
      setAddresses([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadAddresses();
      apiFetch<{ methods: PaymentMethod[] }>("/api/checkout/config")
        .then((d) => {
          setMethods(d.methods);
          if (!d.methods.includes("cod") && d.methods[0]) setMethod(d.methods[0]);
        })
        .catch(() => setMethods(["cod"]));
    }, 0);
    return () => clearTimeout(t);
  }, [loadAddresses]);

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const d = await apiFetch<{ quote: Quote }>("/api/checkout/quote", jsonInit("POST", { items }));
      setQuote(d.quote);
      setQuoteError(null);
    } catch (e) {
      setQuoteError((e as Error).message);
    }
  }, [items]);

  useEffect(() => {
    const t = setTimeout(() => void refreshQuote(), 250);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  async function saveAddress(v: AddressForm) {
    const d = await apiFetch<{ address: Address }>("/api/me/addresses", jsonInit("POST", v));
    setAdding(false);
    await loadAddresses(d.address.id);
    toast.success("Adresse enregistrée.");
  }

  const issues = quote?.issues ?? [];
  const lineCount = quote?.groups.reduce((n, g) => n + g.lines.length, 0) ?? 0;
  const total = quote?.total ?? 0;
  const payable = method === "cinetpay" ? Math.ceil(total / 5) * 5 : total;
  const blocked = !quote || issues.length > 0 || !addressId || !methods?.includes(method) || placing;
  const blockReason = !quote
    ? "Calcul du total…"
    : issues.length > 0
      ? "Corrigez votre panier"
      : !addressId
        ? "Ajoutez une adresse de livraison"
        : null;

  async function placeOrder() {
    if (blocked) {
      if (blockReason) toast.error(blockReason);
      return;
    }
    setPlacing(true);
    try {
      const res = await apiFetch<CheckoutResponse>(
        "/api/checkout",
        jsonInit("POST", { items, addressId, paymentMethod: method, note: note.trim() || null }, { "Idempotency-Key": idemKey }),
      );
      removeOrdered(items);
      const url = safePaymentUrl(res.paymentUrl);
      if (res.provider === "cinetpay" && url) {
        toast.message("Redirection vers la page de paiement sécurisée…");
        window.location.assign(url);
        return;
      }
      const refs = res.orders.map((o) => o.ref);
      if (res.provider === "whatsapp") {
        // Mobile Money is arranged with our team: open WhatsApp with the order already written.
        toast.success(`Commande ${refs.join(", ")} enregistrée. Ouverture de WhatsApp pour le paiement…`);
        openDashboard("buyer-dashboard", "orders");
        window.location.assign(whatsappLink(whatsappPaymentText(refs, res.amount)));
        return;
      }
      toast.success(refs.length > 1 ? `Commandes envoyées : ${refs.join(", ")}` : `Commande ${refs[0]} envoyée à la boutique.`);
      openDashboard("buyer-dashboard", "orders");
    } catch (e) {
      const err = e as Error & { status?: number };
      toast.error(err.message);
      // The server answered: nothing to replay, the next attempt is a new checkout.
      // (No status = network failure: keep the key so a retry cannot double-order.)
      if (err.status) setIdemKey(newKey());
      if (err.status === 409 || err.status === 400) void refreshQuote();
      setPlacing(false);
    }
  }

  if (cart.length === 0) return null;

  const issueFor = (productId: string, variant: string | null) =>
    issues.filter((i) => i.productId === productId && (i.variant ?? null) === (variant ?? null));
  const generalIssues = issues.filter((i) => !quote?.groups.some((g) => g.lines.some((l) => l.productId === i.productId)));

  const placeLabel = method === "cinetpay" ? "Payer" : method === "whatsapp" ? "Commander et payer" : "Commander";

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh] pb-32 lg:pb-10">
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        <div className="benjamin-bar mb-4">Finaliser la commande</div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          <div className="space-y-4 min-w-0">
            {/* ---- delivery address ---- */}
            <section className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar flex items-center justify-between">
                <span>1. Adresse de livraison</span>
                {addresses && addresses.length > 0 && !adding && (
                  <button onClick={() => setAdding(true)} className="text-[11px] font-normal normal-case tracking-normal text-white/90 hover:text-white underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Nouvelle adresse
                  </button>
                )}
              </div>
              {addresses === null ? (
                <div className="p-4 space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 bg-[#ECECEC] animate-pulse" />)}</div>
              ) : (
                <>
                  {adding && (
                    <AddressEditor
                      initial={{ ...emptyAddress(user?.name ?? "", user?.phone ?? ""), isDefault: addresses.length === 0 }}
                      onSave={saveAddress}
                      onCancel={() => setAdding(false)}
                    />
                  )}
                  {addresses.length === 0 && !adding ? (
                    <div className="p-4 text-[13px] text-[#666]">
                      Aucune adresse enregistrée.{" "}
                      <button onClick={() => setAdding(true)} className="benjamin-link">Ajouter une adresse</button>
                    </div>
                  ) : (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Adresse de livraison">
                      {addresses.map((a) => {
                        const active = a.id === addressId;
                        return (
                          <button
                            key={a.id}
                            role="radio"
                            aria-checked={active}
                            onClick={() => setAddressId(a.id)}
                            className={`text-left border p-3 text-[12px] leading-snug ${active ? "border-[#FF6A00] bg-[#FFF6EF]" : "border-[#DADAD9] hover:border-[#999]"}`}
                          >
                            <div className="flex items-center gap-1.5 font-bold text-[13px] text-[#333]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{a.name}</span>
                              {active && <Check className="w-4 h-4 ml-auto text-[#FF6A00] shrink-0" />}
                            </div>
                            <div className="text-[#555] mt-1">{a.line}</div>
                            <div className="text-[#555]">{a.city}, {a.country}</div>
                            <div className="text-[#888] mt-0.5">{a.phone}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ---- items (server-priced) ---- */}
            <section className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar flex items-center justify-between">
                <span>2. Articles {quote ? `(${lineCount})` : ""}</span>
                <button onClick={() => setView("cart")} className="text-[11px] font-normal normal-case tracking-normal text-white/90 hover:text-white underline">
                  Modifier le panier
                </button>
              </div>
              {quoteError && (
                <div className="m-3 p-3 border border-[#DC2626] text-[12px] text-[#B91C1C] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {quoteError}
                  <button onClick={() => void refreshQuote()} className="benjamin-link ml-auto">Réessayer</button>
                </div>
              )}
              {!quote && !quoteError ? (
                <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 bg-[#ECECEC] animate-pulse" />)}</div>
              ) : (
                <div className="p-3 space-y-4">
                  {generalIssues.map((i, n) => (
                    <p key={n} role="alert" className="text-[12px] text-[#B91C1C] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {i.message}
                    </p>
                  ))}
                  {quote?.groups.map((g) => (
                    <div key={g.supplierId}>
                      <div className="text-[11px] font-bold text-[#333] uppercase tracking-wide border-b border-[#ECECEC] pb-1.5 mb-2 flex justify-between gap-2">
                        <span className="truncate">{g.supplierName}</span>
                        <span className="whitespace-nowrap">{fcfa(g.subtotal)}</span>
                      </div>
                      {g.lines.map((l) => {
                        const lineIssues = issueFor(l.productId, l.variant);
                        return (
                          <div key={`${l.productId}-${l.variant ?? ""}`} className="flex items-start gap-3 py-2 border-b border-[#F3F3F3] last:border-b-0">
                            <div className="w-14 h-14 shrink-0 bg-[#ECECEC] overflow-hidden">
                              {l.image && <img src={l.image} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] text-[#333] line-clamp-2 leading-snug">{l.title}</div>
                              {l.variant && <div className="text-[11px] text-[#888]">{l.variant}</div>}
                              <div className="text-[11px] text-[#666] mt-0.5">
                                {l.quantity} {unitLabel(l.unit)} × {fcfa(l.unitPrice)}
                              </div>
                              {lineIssues.map((i, n) => (
                                <p key={n} role="alert" className="text-[11px] text-[#B91C1C] mt-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" /> {i.message}
                                </p>
                              ))}
                            </div>
                            <div className="text-[13px] font-bold text-[#333] whitespace-nowrap">{fcfa(l.total)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {quote && quote.groups.length > 1 && (
                    <p className="text-[11px] text-[#666] bg-[#FAFAFA] border border-[#ECECEC] p-2">
                      Votre panier contient des articles de {quote.groups.length} boutiques : une commande sera créée par boutique.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ---- payment ---- */}
            <section className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">3. Mode de paiement</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Mode de paiement">
                {methods === null
                  ? [0, 1].map((i) => <div key={i} className="h-16 bg-[#ECECEC] animate-pulse" />)
                  : methods.map((id) => {
                      const m = METHODS[id];
                      const Icon = m.icon;
                      const active = method === id;
                      return (
                        <button
                          key={id}
                          role="radio"
                          aria-checked={active}
                          onClick={() => setMethod(id)}
                          className={`benjamin-tile ${active ? "active" : ""} text-left !items-start`}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-bold leading-tight">{m.label}</span>
                            <span className="block text-[11px] opacity-80 leading-tight mt-0.5">{m.desc}</span>
                          </span>
                          {active && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
              </div>
              {method === "whatsapp" && (
                <p className="px-4 pb-3 text-[11px] text-[#555]">
                  Après validation, WhatsApp s&apos;ouvre avec votre numéro de commande. La boutique prépare la commande dès que notre équipe confirme le paiement.
                </p>
              )}
              <div className="border-t border-[#ECECEC] p-4">
                <label htmlFor="co-note" className="block text-[11px] font-bold uppercase text-[#555] mb-1">Note pour la boutique (facultatif)</label>
                <textarea
                  id="co-note"
                  value={note}
                  maxLength={500}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Horaires de livraison, repère, précision sur la commande…"
                  className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#1A1F8A] resize-y"
                />
                <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] mt-2">
                  <Lock className="w-3.5 h-3.5" /> Aucune donnée bancaire ni code Mobile Money n&apos;est saisi sur ce site.
                </div>
              </div>
            </section>
          </div>

          {/* ---- summary ---- */}
          <aside className="hidden lg:block">
            <div className="sticky top-[140px] bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Récapitulatif</div>
              <div className="p-4 space-y-2 text-[12px]">
                <Row label={`Articles (${lineCount})`} value={quote ? fcfa(total) : "…"} />
                <Row label={<span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Livraison</span>} value="À convenir avec la boutique" />
                {payable !== total && <Row label="Arrondi paiement mobile" value={fcfa(payable - total)} />}
                <div className="flex items-center justify-between border-t border-[#ECECEC] pt-2">
                  <span className="font-bold text-[13px]">Total à payer</span>
                  <span className="font-extrabold text-[18px] text-[#FF6A00]">{quote ? fcfa(payable) : "…"}</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={blocked}
                  className="btn-benjamin-orange w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {placing ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <>{placeLabel} <ChevronRight className="w-4 h-4" /></>}
                </button>
                {blockReason && !placing && <p className="text-[11px] text-[#888] text-center">{blockReason}</p>}
                <div className="border-t border-[#ECECEC] pt-3 mt-1 space-y-1.5 text-[11px] text-[#666]">
                  <div className="flex items-center gap-1.5 text-[#16A34A]"><ShieldCheck className="w-3.5 h-3.5" /> Prix et stock vérifiés au moment de la commande</div>
                  <div>La boutique confirme votre commande, puis vous contacte pour la livraison.</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ---- mobile sticky bar ---- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#FF6A00] px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] text-[#999] uppercase">Total à payer · livraison à convenir</div>
          <div className="text-[16px] font-extrabold text-[#FF6A00]">{quote ? fcfa(payable) : "…"}</div>
        </div>
        <button onClick={placeOrder} disabled={blocked} className="btn-benjamin-orange flex items-center gap-1.5 disabled:opacity-60 shrink-0">
          {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{placeLabel} <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#666]">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
