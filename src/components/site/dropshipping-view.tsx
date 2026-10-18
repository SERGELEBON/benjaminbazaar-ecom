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
        toast.success(`« ${title} » retiré de votre liste dropshipping`);
      } else {
        next.add(id);
        toast.success(`« ${title} » ajouté à votre liste dropshipping`);
      }
      return next;
    });
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh]">
      {/* Hero */}
      <div className="bg-brand-gradient text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-10 lg:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00] px-3 py-1 text-[11px] uppercase font-bold tracking-wider mb-4">
            <Rocket className="w-3.5 h-3.5" /> Espace dropshipping
          </div>
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Vendez sans stock
          </h1>
          <p className="text-[#CFD6F5] text-[13px] mt-2 max-w-2xl mx-auto">
            Approvisionnez-vous auprès de fournisseurs vérifiés et faites livrer directement vos clients.
            Quantité minimale réduite, traitement automatisé des commandes, aucun stock à financer.
          </p>
          <button
            onClick={() => setView("auth")}
            className="btn-benjamin-orange mt-4 inline-flex items-center gap-2"
          >
            Commencer le dropshipping <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-6 space-y-6">
        {/* ---- 3 benefit cards ---- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BenefitCard
            icon={Package}
            title="Aucun stock nécessaire"
            desc="Publiez et vendez des produits sans acheter de stock à l'avance. Vous ne payez que lorsque votre client commande."
          />
          <BenefitCard
            icon={Zap}
            title="Traitement automatisé"
            desc="Les commandes sont transmises automatiquement aux fournisseurs. Les numéros de suivi remontent dans votre boutique en temps réel."
          />
          <BenefitCard
            icon={Boxes}
            title="Quantité minimale réduite"
            desc="Commandez dès 1 pièce. Testez vos produits avant de passer aux achats en gros."
          />
        </section>

        {/* ---- how it works 4-step ---- */}
        <section className="bg-white border border-[#DADAD9]">
          <div className="benjamin-bar">Comment ça marche</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Step n={1} icon={Search} title="Trouvez des produits" desc="Parcourez les produits prêts pour le dropshipping proposés par des fournisseurs vérifiés." />
            <Step n={2} icon={Store} title="Publiez-les dans votre boutique" desc="Ajoutez-les à votre boutique Shopify, WooCommerce ou sur les réseaux sociaux en un clic." />
            <Step n={3} icon={ShoppingCart} title="Votre client commande" desc="Votre client passe commande dans votre boutique au prix de détail." />
            <Step n={4} icon={Truck} title="Le fournisseur expédie" desc="Nous transmettons automatiquement la commande au fournisseur, qui livre directement votre client." />
          </div>
        </section>

        {/* ---- dropshipping-ready products grid ---- */}
        <section>
          <div className="benjamin-bar mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#FF6A00]" />
              Produits prêts pour le dropshipping
            </span>
            {dropList.size > 0 && (
              <span className="text-[11px] normal-case tracking-normal text-white/80">
                {dropList.size} dans votre liste dropshipping
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
                        : "bg-[#0A0F4D] text-white border border-[#0A0F4D] hover:opacity-85"
                    }`}
                  >
                    {dropList.has(p.id) ? (
                      <>✓ Dans votre liste</>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Ajouter à ma liste
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {products.length === 0 && !loading && (
            <div className="bg-white border border-[#DADAD9] px-4 py-12 text-center text-[12px] text-[#999] uppercase tracking-wide">
              Aucun produit prêt pour le dropshipping
            </div>
          )}
        </section>

        {/* ---- CTA ---- */}
        <section className="bg-[#FF6A00] text-white p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider opacity-80">
              Prêt à vous lancer ?
            </div>
            <div className="text-[22px] font-extrabold mt-1">
              Créez gratuitement votre compte dropshipper
            </div>
            <div className="text-[13px] opacity-90 mt-1">
              Sans carte bancaire · Produits en ligne en quelques minutes · Sans engagement
            </div>
          </div>
          <button
            onClick={() => setView("auth")}
            className="bg-[#0A0F4D] text-white px-6 py-3 text-[13px] uppercase font-bold tracking-wide hover:opacity-85 flex items-center gap-2 whitespace-nowrap"
          >
            Commencer le dropshipping <ArrowRight className="w-4 h-4" />
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
        <span className="absolute -top-1.5 -right-1.5 bg-[#0A0F4D] text-white text-[10px] font-extrabold w-5 h-5 flex items-center justify-center">
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
