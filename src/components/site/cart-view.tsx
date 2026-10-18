"use client";

import { useState, useMemo } from "react";
import {
  Trash2, Minus, Plus, ShoppingCart, BadgeCheck, MessageSquare,
  ChevronRight, ShieldCheck, Truck,
} from "lucide-react";
import { useApp, type CartLine } from "@/lib/store";
import { formatPrice } from "@/lib/format";

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: CartLine[];
}

export function CartView() {
  const { cart, updateQty, removeFromCart, clearCart, setView, setProductId, currency } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Build a unique key per cart line (productId + variant)
  const lineKey = (l: CartLine) => `${l.productId}__${l.variant ?? ""}`;

  // Toggle all items
  const allKeys = useMemo(() => cart.map(lineKey), [cart]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  }
  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Group cart by supplierId (Alibaba-style)
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

  // Totals (only count selected if at least one is selected, else all)
  const counted = selected.size > 0 ? cart.filter((l) => selected.has(lineKey(l))) : cart;
  const itemCount = counted.reduce((s, l) => s + l.quantity, 0);
  const subtotal = counted.reduce((s, l) => s + l.price * l.quantity, 0);
  // Shipping is agreed with each shop; the final price is recomputed at checkout.
  const total = subtotal;

  // ---- Empty state ----
  if (cart.length === 0) {
    return (
      <div className="bg-[#f4f1ec] min-h-[60vh]">
        <div className="max-w-[1100px] mx-auto px-4 py-12">
          <div className="benjamin-bar mb-6">Panier</div>
          <div className="bg-white border border-[#DADAD9] flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-[#ECECEC] flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-[#999]" strokeWidth={1.4} />
            </div>
            <h2 className="text-[18px] font-bold text-[#333]">Votre panier est vide</h2>
            <p className="text-[12px] text-[#777] mt-1.5 max-w-sm">
              Découvrez les produits de nos boutiques vérifiées.
            </p>
            <button
              onClick={() => setView("home")}
              className="btn-benjamin-orange mt-5 flex items-center gap-2"
            >
              Parcourir les produits <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh] pb-32 md:pb-10">
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* Title */}
        <div className="benjamin-bar mb-4 flex items-center justify-between">
          <span>Panier ({cart.length})</span>
          <button
            onClick={clearCart}
            className="text-[11px] font-normal normal-case tracking-normal text-white/80 hover:text-white underline"
          >
            Vider le panier
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* ---- LEFT: cart items grouped by supplier ---- */}
          <div>
            {/* select-all row */}
            <label className="flex items-center gap-2 bg-white border border-[#DADAD9] px-4 py-2.5 mb-3 text-[12px] cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="accent-[#FF6A00] w-3.5 h-3.5"
              />
              <span className="font-semibold">Tout sélectionner</span>
              <span className="text-[#999] ml-2">
                ({cart.length} article{cart.length === 1 ? "" : "s"})
              </span>
            </label>

            {groups.map((g) => {
              const groupSubtotal = g.items.reduce((s, l) => s + l.price * l.quantity, 0);
              return (
                <div key={g.supplierId} className="bg-white border border-[#DADAD9] mb-4">
                  {/* supplier header */}
                  <div className="bg-[#FAFAFA] border-b border-[#DADAD9] px-4 py-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[#16A34A] font-semibold text-[12px]">
                      <BadgeCheck className="w-4 h-4" strokeWidth={2} />
                      Vérifiée
                    </span>
                    <button
                      onClick={() => { useApp.getState().setSupplierId(g.supplierId); setView("supplier"); }}
                      className="text-[13px] font-bold text-[#333] hover:text-[#FF6A00] hover:underline truncate"
                    >
                      {g.supplierName}
                    </button>
                    
                    <button
                      onClick={() => useApp.getState().openChat(g.supplierId)}
                      className="btn-outline-grey ml-auto flex items-center gap-1.5 !text-[11px] !py-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                  </div>

                  {/* item rows */}
                  {g.items.map((l) => {
                    const key = lineKey(l);
                    const isSel = selected.has(key);
                    const lineTotal = l.price * l.quantity;
                    return (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-[#ECECEC] last:border-b-0"
                      >
                        {/* checkbox + image */}
                        <div className="flex items-start gap-3 sm:w-[44%]">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleOne(key)}
                            className="accent-[#FF6A00] w-3.5 h-3.5 mt-1"
                          />
                          <button
                            onClick={() => { setProductId(l.productId); setView("product"); }}
                            className="w-20 h-20 shrink-0 bg-[#ECECEC] overflow-hidden"
                          >
                            <img src={l.image} alt={l.title} className="w-full h-full object-cover" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => { setProductId(l.productId); setView("product"); }}
                              className="text-[13px] text-[#333] hover:text-[#FF6A00] hover:underline line-clamp-2 text-left font-medium"
                            >
                              {l.title}
                            </button>
                            {l.variant && (
                              <div className="text-[11px] text-[#888] mt-1">
                                Option : <span className="text-[#555] font-medium">{l.variant}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* unit price */}
                        <div className="sm:w-[16%] text-[12px]">
                          <div className="text-[10px] text-[#999] uppercase sm:hidden">Prix unitaire</div>
                          <span className="text-[#FF6A00] font-bold text-[14px]">
                            {formatPrice(l.price, currency)}
                          </span>
                          <div className="text-[10px] text-[#999]">/ {l.unit}</div>
                        </div>

                        {/* quantity stepper */}
                        <div className="sm:w-[16%]">
                          <div className="text-[10px] text-[#999] uppercase mb-1 sm:hidden">Quantité</div>
                          <div className="inline-flex items-center border border-[#DADAD9]">
                            <button
                              onClick={() => updateQty(l.productId, l.quantity - 1, l.variant)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#ECECEC] text-[#555]"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                            <input
                              type="number"
                              value={l.quantity}
                              onChange={(e) =>
                                updateQty(l.productId, parseInt(e.target.value) || 1, l.variant)
                              }
                              className="w-12 h-8 text-center text-[12px] font-semibold border-x border-[#DADAD9] outline-none"
                              min={1}
                            />
                            <button
                              onClick={() => updateQty(l.productId, l.quantity + 1, l.variant)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-[#ECECEC] text-[#555]"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        {/* line subtotal */}
                        <div className="sm:w-[16%] text-right">
                          <div className="text-[10px] text-[#999] uppercase mb-1 sm:hidden">Sous-total</div>
                          <div className="text-[14px] font-bold text-[#333]">
                            {formatPrice(lineTotal, currency)}
                          </div>
                        </div>

                        {/* remove */}
                        <div className="sm:w-[8%] flex sm:justify-end">
                          <button
                            onClick={() => removeFromCart(l.productId, l.variant)}
                            className="text-[#999] hover:text-[#FF6A00] p-1.5"
                            aria-label="Retirer l'article"
                            title="Retirer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* group subtotal */}
                  <div className="bg-[#FAFAFA] border-t border-[#ECECEC] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-[#777]">
                      Sous-total {g.supplierName} :{" "}
                      <span className="text-[#333] font-bold">
                        {formatPrice(groupSubtotal, currency)}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#888]">
                      Livraison : <span className="text-[#16A34A] font-semibold">à convenir avec la boutique</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- RIGHT: order summary (desktop sticky) ---- */}
          <aside className="hidden lg:block">
            <div className="sticky top-[140px]">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Récapitulatif</div>
                <div className="p-4 space-y-2.5 text-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#666]">
                      Articles ({itemCount})
                    </span>
                    <span className="text-[#333] font-semibold">
                      {formatPrice(subtotal, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#666] flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Livraison
                    </span>
                    <span className="text-[#333] font-semibold">
                      À convenir
                    </span>
                  </div>
                  <div className="border-t border-[#ECECEC] pt-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px]">Total estimé</span>
                      <span className="font-extrabold text-[18px] text-[#FF6A00]">
                        {formatPrice(total, currency)}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#999] mt-1">
                      Prix et stock confirmés à l&apos;étape suivante
                    </div>
                  </div>

                  <button
                    onClick={() => setView("checkout")}
                    className="btn-benjamin-orange w-full mt-2 flex items-center justify-center gap-2"
                  >
                    Passer la commande <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView("home")}
                    className="btn-outline-grey w-full"
                  >
                    Continuer mes achats
                  </button>

                  <div className="border-t border-[#ECECEC] pt-3 mt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#16A34A]">
                      <ShieldCheck className="w-3.5 h-3.5" /> Paiement à la livraison ou Mobile Money
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ---- MOBILE sticky bottom bar ---- */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-[#FF6A00] px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-[#999] uppercase">Total estimé ({itemCount} art.)</div>
          <div className="text-[16px] font-extrabold text-[#FF6A00]">
            {formatPrice(total, currency)}
          </div>
        </div>
        <button
          onClick={() => setView("checkout")}
          className="btn-benjamin-orange flex items-center gap-1.5"
        >
          Commander <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
