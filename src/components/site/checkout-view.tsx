"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Truck, ChevronRight, CreditCard, Banknote,
  Smartphone, Wallet, Check, Lock,
} from "lucide-react";
import { useApp, type CartLine } from "@/lib/store";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: CartLine[];
}

type PayMethod =
  | "mtn"
  | "orange"
  | "wave"
  | "paystack"
  | "cinetpay"
  | "bank";

const PAY_METHODS: {
  id: PayMethod;
  label: string;
  desc: string;
  color: string;
  icon: typeof Smartphone;
}[] = [
  { id: "mtn", label: "MTN MoMo", desc: "Mobile money — pay with your MTN wallet", color: "#FFCC00", icon: Smartphone },
  { id: "orange", label: "Orange Money", desc: "Mobile money — pay with your Orange wallet", color: "#FF6600", icon: Smartphone },
  { id: "wave", label: "Wave", desc: "Mobile money — pay with Wave", color: "#1DC9FF", icon: Wallet },
  { id: "paystack", label: "Card via Paystack", desc: "Visa / Mastercard / Verve", color: "#011B5D", icon: CreditCard },
  { id: "cinetpay", label: "Card via CinetPay", desc: "Visa / Mastercard (West Africa)", color: "#0066B3", icon: CreditCard },
  { id: "bank", label: "Bank transfer", desc: "Wire transfer to our escrow account", color: "#16A34A", icon: Banknote },
];

const COUNTRIES = [
  "Ghana", "Côte d'Ivoire", "Nigeria", "Senegal", "Mali", "Burkina Faso",
  "Niger", "Togo", "Benin", "Guinea", "Liberia", "Sierra Leone",
];

export function CheckoutView() {
  const { cart, clearCart, setView, currency } = useApp();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    country: "Ghana",
    city: "",
    address: "",
    zip: "",
    delivery: "standard",
  });
  const [pay, setPay] = useState<PayMethod>("mtn");
  const [payDetail, setPayDetail] = useState({
    momoPhone: "",
    cardNumber: "",
    cardExp: "",
    cardCvc: "",
  });
  const [placing, setPlacing] = useState(false);

  // Redirect to cart if empty
  useEffect(() => {
    if (cart.length === 0) setView("cart");
  }, [cart.length, setView]);

  const groups: SupplierGroup[] = useMemo(() => {
    const m = new Map<string, SupplierGroup>();
    for (const line of cart) {
      if (!m.has(line.supplierId)) {
        m.set(line.supplierId, {
          supplierId: line.supplierId,
          supplierName: line.supplierName,
          items: [],
        });
      }
      m.get(line.supplierId)!.items.push(line);
    }
    return Array.from(m.values());
  }, [cart]);

  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);
  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const shipping = subtotal > 0 ? (form.delivery === "express" ? 45 : Math.max(15, subtotal * 0.05)) : 0;
  const total = subtotal + shipping;

  if (cart.length === 0) return null;

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function placeOrder() {
    if (!form.name || !form.phone || !form.city || !form.address) {
      toast.error("Please complete the shipping form.");
      return;
    }
    setPlacing(true);
    // simulate network
    await new Promise((r) => setTimeout(r, 700));
    const ref =
      "AB-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();
    clearCart();
    setPlacing(false);
    toast.success(`Order placed! Ref #${ref}`);
    setView("buyer-dashboard");
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh] pb-32 md:pb-10">
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        <div className="benjamin-bar mb-4">Checkout</div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          {/* ---- LEFT: shipping form + payment ---- */}
          <div className="space-y-4">
            {/* shipping */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Shipping information</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name *" required>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    className={inputCls}
                  />
                </Field>
                <Field label="Phone number *" required>
                  <input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+233 …"
                    className={inputCls}
                  />
                </Field>
                <Field label="Country">
                  <select
                    value={form.country}
                    onChange={(e) => setField("country", e.target.value)}
                    className={inputCls}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="City *" required>
                  <input
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="e.g. Accra"
                    className={inputCls}
                  />
                </Field>
                <Field label="Address line *" required className="sm:col-span-2">
                  <input
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="Street name, building, unit…"
                    className={inputCls}
                  />
                </Field>
                <Field label="ZIP / postal code">
                  <input
                    value={form.zip}
                    onChange={(e) => setField("zip", e.target.value)}
                    placeholder="e.g. GA-001"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* delivery method */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Delivery method</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DeliveryOption
                  id="standard"
                  selected={form.delivery === "standard"}
                  onSelect={() => setField("delivery", "standard")}
                  title="Standard delivery"
                  desc="5–12 business days"
                  price={Math.max(15, subtotal * 0.05)}
                  currency={currency}
                />
                <DeliveryOption
                  id="express"
                  selected={form.delivery === "express"}
                  onSelect={() => setField("delivery", "express")}
                  title="Express delivery"
                  desc="2–5 business days"
                  price={45}
                  currency={currency}
                  badge="Recommended"
                />
              </div>
            </div>

            {/* payment method */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Payment method</div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = pay === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPay(m.id)}
                      className={`benjamin-tile ${active ? "active" : ""} text-left !items-start`}
                    >
                      <span
                        className="w-7 h-7 shrink-0 flex items-center justify-center"
                        style={{ background: m.color }}
                      >
                        <Icon className="w-4 h-4 text-white" strokeWidth={1.8} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold leading-tight">{m.label}</span>
                        <span className="block text-[11px] opacity-80 leading-tight mt-0.5">
                          {m.desc}
                        </span>
                      </span>
                      {active && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* payment detail inputs */}
              <div className="border-t border-[#ECECEC] p-4">
                {(pay === "mtn" || pay === "orange" || pay === "wave") && (
                  <Field label="Mobile money number *">
                    <input
                      value={payDetail.momoPhone}
                      onChange={(e) => setPayDetail({ ...payDetail, momoPhone: e.target.value })}
                      placeholder="e.g. +233 24 123 4567"
                      className={inputCls}
                    />
                  </Field>
                )}
                {(pay === "paystack" || pay === "cinetpay") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Card number *" className="sm:col-span-2">
                      <input
                        value={payDetail.cardNumber}
                        onChange={(e) => setPayDetail({ ...payDetail, cardNumber: e.target.value })}
                        placeholder="0000 0000 0000 0000"
                        className={inputCls}
                        inputMode="numeric"
                      />
                    </Field>
                    <Field label="Expiry date *">
                      <input
                        value={payDetail.cardExp}
                        onChange={(e) => setPayDetail({ ...payDetail, cardExp: e.target.value })}
                        placeholder="MM / YY"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="CVC *">
                      <input
                        value={payDetail.cardCvc}
                        onChange={(e) => setPayDetail({ ...payDetail, cardCvc: e.target.value })}
                        placeholder="123"
                        className={inputCls}
                        inputMode="numeric"
                      />
                    </Field>
                  </div>
                )}
                {pay === "bank" && (
                  <div className="text-[12px] text-[#555] bg-[#FAFAFA] border border-[#ECECEC] p-3 leading-relaxed">
                    <div className="font-bold text-[#333] mb-1">Bank transfer instructions</div>
                    After placing your order, you will receive the escrow
                    account details by email &amp; SMS. Your order ships once
                    payment is confirmed (usually within 24h).
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A] mt-3">
                  <Lock className="w-3.5 h-3.5" />
                  Payments are secured by 256-bit SSL &amp; Trade Assurance escrow.
                </div>
              </div>
            </div>
          </div>

          {/* ---- RIGHT: order summary ---- */}
          <aside className="hidden lg:block">
            <div className="sticky top-[140px]">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Order Summary</div>
                <div className="p-4 max-h-[280px] overflow-y-auto benjamin-scroll">
                  {groups.map((g) => {
                    const groupSub = g.items.reduce((s, l) => s + l.price * l.quantity, 0);
                    return (
                      <div key={g.supplierId} className="mb-3 last:mb-0">
                        <div className="text-[11px] font-bold text-[#333] uppercase tracking-wide border-b border-[#ECECEC] pb-1.5 mb-2">
                          {g.supplierName}
                        </div>
                        {g.items.map((l) => (
                          <div key={`${l.productId}-${l.variant}`} className="flex items-start gap-2 mb-2">
                            <div className="relative w-12 h-12 shrink-0 bg-[#ECECEC]">
                              <img src={l.image} alt={l.title} className="w-full h-full object-cover" />
                              <span className="absolute -top-1.5 -right-1.5 bg-[#0A0F4D] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                                {l.quantity}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-[#333] line-clamp-2 leading-snug">{l.title}</div>
                              {l.variant && (
                                <div className="text-[10px] text-[#999]">{l.variant}</div>
                              )}
                            </div>
                            <div className="text-[12px] font-semibold text-[#333] whitespace-nowrap">
                              {formatPrice(l.price * l.quantity, currency)}
                            </div>
                          </div>
                        ))}
                        <div className="text-right text-[11px] text-[#777] mt-1">
                          Group subtotal:{" "}
                          <span className="font-bold text-[#333]">
                            {formatPrice(groupSub, currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-[#ECECEC] space-y-2 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">Items ({itemCount})</span>
                    <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666] flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Shipping
                    </span>
                    <span className="font-semibold">{formatPrice(shipping, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#ECECEC] pt-2">
                    <span className="font-bold text-[13px]">Total</span>
                    <span className="font-extrabold text-[18px] text-[#FF6A00]">
                      {formatPrice(total, currency)}
                    </span>
                  </div>

                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="btn-benjamin-orange w-full mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {placing ? "Placing order…" : <>Place order <ChevronRight className="w-4 h-4" /></>}
                  </button>

                  <div className="border-t border-[#ECECEC] pt-3 mt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Trade Assurance — money-back protection
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#666]">
                      <Lock className="w-3.5 h-3.5" /> Secured payment via escrow
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ---- MOBILE sticky bottom ---- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#FF6A00] px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-[#999] uppercase">Total ({itemCount} items)</div>
          <div className="text-[16px] font-extrabold text-[#FF6A00]">
            {formatPrice(total, currency)}
          </div>
        </div>
        <button
          onClick={placeOrder}
          disabled={placing}
          className="btn-benjamin-orange flex items-center gap-1.5 disabled:opacity-60"
        >
          {placing ? "Placing…" : <>Place order <ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-[#DADAD9] bg-white px-3 py-2 text-[13px] text-[#333] outline-none focus:border-[#FF6A00] placeholder:text-[#999]";

function Field({
  label,
  children,
  required,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold text-[#555] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#FF6A00]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function DeliveryOption({
  selected,
  onSelect,
  title,
  desc,
  price,
  currency,
  badge,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  price: number;
  currency: "GHS" | "XOF" | "USD";
  badge?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`benjamin-tile ${selected ? "active" : ""} text-left !items-start`}
    >
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold">{title}</span>
          {badge && (
            <span className="text-[9px] uppercase font-bold bg-[#16A34A] text-white px-1.5 py-0.5">
              {badge}
            </span>
          )}
        </span>
        <span className="block text-[11px] opacity-80 mt-0.5">{desc}</span>
      </span>
      <span className="text-right text-[12px] font-bold whitespace-nowrap">
        {formatPrice(price, currency)}
      </span>
    </button>
  );
}
