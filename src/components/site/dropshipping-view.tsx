"use client";

import { useEffect, useState } from "react";
import {
  Package, Zap, Boxes, Search, Store, ShoppingCart, Truck,
  Plus, ArrowRight, Rocket,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { type ProductT } from "@/lib/format";
import { ProductCard } from "./product-card";
import { toast } from "sonner";

export function DropshippingView() {
  const { setView, setProductId } = useApp();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductT[]>([]);
  const [dropList, setDropList] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products?take=24");
        const d = await res.json();
        const ready = (d.products ?? []).filter((p: ProductT) => p.readyToShip);
        // If too few ready-to-ship, fill with any products so the grid isn't empty
        if (ready.length < 8) {
          const extra = (d.products ?? []).filter(
            (p: ProductT) => !p.readyToShip,
          );
          setProducts([...ready, ...extra].slice(0, 24));
        } else {
          setProducts(ready);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleDrop(id: string, title: string) {
    setDropList((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success(`Removed "${title}" from dropship list`);
      } else {
        next.add(id);
        toast.success(`Added "${title}" to dropship list`);
      }
      return next;
    });
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-[#2a1c14] to-[#1a130d] text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-10 lg:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00] px-3 py-1 text-[11px] uppercase font-bold tracking-wider mb-4">
            <Rocket className="w-3.5 h-3.5" /> Dropshipping Center
          </div>
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Sell without inventory
          </h1>
          <p className="text-[#cdbfb5] text-[13px] mt-2 max-w-2xl mx-auto">
            Source from verified suppliers and ship directly to your customers.
            Low MOQ, automated fulfillment, no upfront stock needed.
          </p>
          <button
            onClick={() => setView("auth")}
            className="btn-benjamin-orange mt-4 inline-flex items-center gap-2"
          >
            Start dropshipping <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-6 space-y-6">
        {/* ---- 3 benefit cards ---- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BenefitCard
            icon={Package}
            title="No inventory needed"
            desc="List and sell products without buying stock upfront. Pay only when your customer orders."
          />
          <BenefitCard
            icon={Zap}
            title="Automated fulfillment"
            desc="Orders route to suppliers automatically. Tracking numbers sync back to your store in real time."
          />
          <BenefitCard
            icon={Boxes}
            title="Low MOQ"
            desc="Source from as little as 1 piece. Test products before scaling up to bulk wholesale."
          />
        </section>

        {/* ---- how it works 4-step ---- */}
        <section className="bg-white border border-[#DADAD9]">
          <div className="benjamin-bar">How it works</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Step n={1} icon={Search} title="Find products" desc="Browse dropshipping-ready products from verified suppliers." />
            <Step n={2} icon={Store} title="List on your store" desc="Add to your Shopify, WooCommerce, or social store in one click." />
            <Step n={3} icon={ShoppingCart} title="Customer orders" desc="Your customer places an order on your store at retail price." />
            <Step n={4} icon={Truck} title="Supplier ships" desc="We auto-forward to the supplier, who ships directly to your customer." />
          </div>
        </section>

        {/* ---- dropshipping-ready products grid ---- */}
        <section>
          <div className="benjamin-bar mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#FF6A00]" />
              Dropshipping-ready products
            </span>
            {dropList.size > 0 && (
              <span className="text-[11px] normal-case tracking-normal text-white/80">
                {dropList.size} in dropship list
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#DADAD9] h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((p) => (
                <div key={p.id} className="relative">
                  <ProductCard product={p} />
                  <button
                    onClick={() => toggleDrop(p.id, p.title)}
                    className={`w-full mt-px flex items-center justify-center gap-1.5 py-2 text-[11px] uppercase font-bold tracking-wide ${
                      dropList.has(p.id)
                        ? "bg-[#16A34A] text-white border border-[#16A34A]"
                        : "bg-[#000] text-white border border-[#000] hover:opacity-85"
                    }`}
                  >
                    {dropList.has(p.id) ? (
                      <>✓ In dropship list</>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add to dropship list
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 && !loading && (
            <div className="bg-white border border-[#DADAD9] px-4 py-12 text-center text-[12px] text-[#999] uppercase tracking-wide">
              No dropshipping-ready products found
            </div>
          )}
        </section>

        {/* ---- CTA ---- */}
        <section className="bg-[#FF6A00] text-white p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">
              Ready to start?
            </div>
            <div className="text-[22px] font-extrabold mt-1">
              Create your free dropshipper account
            </div>
            <div className="text-[13px] opacity-90 mt-1">
              No credit card required · List products in minutes · Cancel anytime
            </div>
          </div>
          <button
            onClick={() => setView("auth")}
            className="bg-[#000] text-white px-6 py-3 text-[13px] uppercase font-bold tracking-wide hover:opacity-85 flex items-center gap-2 whitespace-nowrap"
          >
            Start dropshipping <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>
    </div>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Package;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white border border-[#DADAD9] p-4 hover:border-[#FF6A00] transition-colors">
      <div className="w-10 h-10 bg-[#FF6A00] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-white" strokeWidth={1.8} />
      </div>
      <div className="benjamin-section-title">{title}</div>
      <p className="text-[12px] text-[#555] mt-1.5 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  desc,
}: {
  n: number;
  icon: typeof Search;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="relative shrink-0">
        <div className="w-10 h-10 bg-[#FF6A00] text-white flex items-center justify-center">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <span className="absolute -top-1.5 -right-1.5 bg-[#000] text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center">
          {n}
        </span>
      </div>
      <div>
        <div className="text-[13px] font-bold text-[#333]">{title}</div>
        <div className="text-[11px] text-[#666] mt-0.5 leading-snug">{desc}</div>
      </div>
    </div>
  );
}
