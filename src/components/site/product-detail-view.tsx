"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star, BadgeCheck, MessageCircle, ShieldCheck, CreditCard, RefreshCw,
  ChevronRight, ChevronLeft, Minus, Plus, Play, Image as ImageIcon,
  FileText, Truck, MapPin,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type SupplierT, unitLabel } from "@/lib/format";
import { ProductCard } from "./product-card";
import { toast } from "sonner";

type Review = {
  id: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  createdAt: string;
};

type FullProduct = ProductT & { reviews: Review[] };

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < Math.round(n) ? "fill-[#FF6A00] text-[#FF6A00]" : "text-[#DADAD9]"}`}
          strokeWidth={1.6}
        />
      ))}
    </span>
  );
}

function Skeleton3() {
  return (
    <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr_300px] gap-4">
        <div className="bg-white border border-[#DADAD9] p-3">
          <div className="aspect-square bg-[#ECECEC] animate-pulse" />
          <div className="h-8 mt-3 bg-[#ECECEC] animate-pulse" />
        </div>
        <div className="bg-white border border-[#DADAD9] p-4 space-y-3">
          <div className="h-6 w-3/4 bg-[#ECECEC] animate-pulse" />
          <div className="h-4 w-1/3 bg-[#ECECEC] animate-pulse" />
          <div className="h-24 bg-[#ECECEC] animate-pulse" />
        </div>
        <div className="bg-white border border-[#DADAD9] p-4 space-y-3">
          <div className="h-6 bg-[#ECECEC] animate-pulse" />
          <div className="h-10 bg-[#ECECEC] animate-pulse" />
          <div className="h-10 bg-[#ECECEC] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function CertChip({ c }: { c: string }) {
  return (
    <span className="inline-block text-[9px] font-bold uppercase border border-[#DADAD9] text-[#333] px-1.5 py-0.5 leading-tight">
      {c}
    </span>
  );
}

export function ProductDetailView() {
  const {
    productId, setView, setSupplierId, setChatSupplierId, setChatProductId, currency, addToCart, favorites, toggleFavorite,
  } = useApp();

  const [data, setData] = useState<{ product: FullProduct; related: ProductT[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [mediaTab, setMediaTab] = useState<"photos" | "video">("photos");
  const [qty, setQty] = useState(1);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [showAllAttrs, setShowAllAttrs] = useState(false);
  const [infoTab, setInfoTab] = useState<"attributes" | "reviews" | "supplier" | "description">("attributes");
  const [shipCountry, setShipCountry] = useState("Côte d'Ivoire");
  const [shipQty, setShipQty] = useState(1);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/${productId}`);
        const d = await res.json();
        if (!cancelled) {
          setData(d);
          setActiveImg(0);
          setQty(Math.max(1, Number.parseInt(d?.product?.minOrder, 10) || 1));
          setVariants({});
          setShowAllAttrs(false);
          setShipQty(1);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const tier = useMemo(() => {
    const product = data?.product;
    if (!product?.priceTiers?.length) return null;
    const sorted = [...product.priceTiers].sort((a, b) => a.minQty - b.minQty);
    let pick = sorted[sorted.length - 1];
    for (const t of sorted) {
      if (qty >= t.minQty && (!t.maxQty || qty <= t.maxQty)) {
        pick = t;
        break;
      }
    }
    return pick;
  }, [data, qty]);

  if (!productId && !loading) {
    return (
      <div className="bg-[#f4f1ec] min-h-screen">
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-[#DADAD9] p-10">
            <div className="benjamin-section-title mb-3">Sélectionnez un produit</div>
            <p className="text-[12px] text-[#888] mb-5">
              Parcourez notre marketplace pour trouver un produit à consulter en détail.
            </p>
            <button onClick={() => setView("home")} className="btn-benjamin-orange">
              Aller à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton3 />;
  if (!data) {
    return (
      <div className="bg-[#f4f1ec] min-h-screen">
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-[#DADAD9] p-10">
            <div className="text-[14px] font-bold mb-2">Produit introuvable</div>
            <button onClick={() => setView("home")} className="btn-benjamin-orange">
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { product, related } = data;
  const isFav = favorites.includes(product.id);

  const breadcrumbCat = product.categoryName;
  const subtotal = (tier?.price ?? 0) * qty;
  // Delivery is agreed with the shop after the order (same rule as checkout): no invented fee.
  const total = subtotal;

  function handleAddToCart(buyNow = false) {
    if (!tier) return;
    const variantStr = Object.values(variants).join(", ") || undefined;
    addToCart({
      productId: product.id,
      title: product.title,
      image: product.images[0] ?? "",
      price: tier.price,
      quantity: qty,
      unit: product.unit,
      variant: variantStr,
      supplierId: product.supplierId,
      supplierName: product.supplierName ?? "",
    });
    if (buyNow) {
      toast.success("Redirection vers le paiement", { description: product.title.slice(0, 80) });
      setView("cart");
    } else {
      toast.success("Ajouté au panier", { description: product.title.slice(0, 80) });
    }
  }

  function openSupplier() {
    setSupplierId(product.supplierId);
    setView("supplier");
  }

  function openCategory() {
    useApp.getState().setCategoryId(product.categoryId);
    useApp.getState().setSearchQuery("");
    setView("search");
  }

  return (
    <div className="bg-[#f4f1ec] min-h-screen pb-24 lg:pb-4">
      {/* BREADCRUMB */}
      <div className="bg-white border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-2 text-[12px] text-[#555]">
          <button onClick={() => setView("home")} className="hover:text-[#FF6A00] hover:underline">
            Accueil
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <button onClick={openCategory} className="hover:text-[#FF6A00] hover:underline">
            {breadcrumbCat ?? "Catégorie"}
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <span className="hidden sm:inline text-[#333]">{product.title}</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr_300px] gap-4">
          {/* LEFT: gallery + supplier card (on mobile children join the grid so we can reorder) */}
          <div className="contents lg:block lg:space-y-4">
            <div className="order-1 lg:order-none bg-white border border-[#DADAD9] p-2 sm:p-3">
              <div className="flex gap-3">
                {/* thumbs */}
                <div className="hidden sm:flex flex-col gap-1.5 w-14 max-h-[440px] overflow-y-auto benjamin-scroll">
                  {product.images.slice(0, 8).map((img, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveImg(i); setMediaTab("photos"); }}
                      className={`w-14 h-14 border overflow-hidden ${activeImg === i && mediaTab === "photos" ? "border-[#FF6A00]" : "border-[#DADAD9]"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {product.videoUrl && (
                    <button
                      onClick={() => setMediaTab("video")}
                      className={`w-14 h-14 border flex items-center justify-center ${mediaTab === "video" ? "border-[#FF6A00] bg-[#FF6A00]" : "border-[#DADAD9] bg-[#ECECEC]"}`}
                    >
                      <Play className={`w-4 h-4 ${mediaTab === "video" ? "text-white" : "text-[#555]"}`} />
                    </button>
                  )}
                </div>
                {/* main */}
                <div className="flex-1">
                  <div className="aspect-square bg-[#ECECEC] overflow-hidden relative">
                    {mediaTab === "photos" ? (
                      <img
                        src={product.images[activeImg]}
                        alt={product.title}
                        className="w-full h-full object-contain bg-white"
                      />
                    ) : product.videoUrl ? (
                      <video src={product.videoUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#999]">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    <button
                      onClick={async () => {
                        const r = await toggleFavorite(product.id);
                        if (r === "added") toast.success("Ajouté à vos favoris");
                        else if (r === "removed") toast.message("Retiré de vos favoris");
                        else if (r === "login") toast.message("Connectez-vous pour enregistrer vos favoris.");
                        else toast.error("Action impossible pour le moment.");
                      }}
                      className="absolute top-2 right-2 bg-white/95 p-2 hover:bg-white"
                      title={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                      aria-pressed={isFav}
                    >
                      <Star className={`w-4 h-4 ${isFav ? "fill-[#FF6A00] text-[#FF6A00]" : "text-[#888]"}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-[#888]">
                    <button
                      onClick={() => setMediaTab("photos")}
                      className={`px-2 py-1 border ${mediaTab === "photos" ? "border-[#FF6A00] text-[#FF6A00] font-bold" : "border-[#DADAD9]"}`}
                    >
                      <ImageIcon className="w-3 h-3 inline mr-1" /> Photos ({product.images.length})
                    </button>
                    {product.videoUrl && (
                      <button
                        onClick={() => setMediaTab("video")}
                        className={`px-2 py-1 border ${mediaTab === "video" ? "border-[#FF6A00] text-[#FF6A00] font-bold" : "border-[#DADAD9]"}`}
                      >
                        <Play className="w-3 h-3 inline mr-1" /> Vidéo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier card */}
            <div className="order-4 lg:order-none bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Informations sur la boutique</div>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-[#ECECEC] border border-[#DADAD9] overflow-hidden shrink-0 flex items-center justify-center">
                    {product.supplierName ? (
                      <span className="text-[14px] font-extrabold text-[#FF6A00]">
                        {product.supplierName.slice(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <BadgeCheck className="w-5 h-5 text-[#888]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={openSupplier}
                        className="text-[13px] font-bold hover:text-[#FF6A00] hover:underline truncate"
                      >
                        {product.supplierName}
                      </button>
                      {product.supplierVerified && (
                        <BadgeCheck className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                      )}
                    </div>
                    <div className="text-[11px] text-[#888] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {product.city}, {product.country}
                    </div>
                    <div className="text-[11px] text-[#888] mt-0.5">
                      {product.years} ans · {product.storeRating ? "★" : ""} {product.storeRating?.toFixed(1) ?? "-"} · {product.type}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center border-y border-[#ECECEC] py-3">
                  <div>
                    <div className="text-[10px] text-[#888] uppercase">Réponse</div>
                    <div className="text-[11px] font-bold text-[#333]">{product.responseTime ?? "—"}</div>
                  </div>
                  <div className="border-x border-[#ECECEC]">
                    <div className="text-[10px] text-[#888] uppercase">Ponctualité</div>
                    <div className="text-[11px] font-bold text-[#16A34A]">{product.onTimeDispatch ?? 0}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#888] uppercase">Fidélité</div>
                    <div className="text-[11px] font-bold text-[#FF6A00]">{Math.round(product.reorderRate)}%</div>
                  </div>
                </div>
                <button
                  onClick={() => toast.success("Rapport de vérification de la boutique", { description: "Génération du rapport de vérification par l'IA…" })}
                  className="btn-outline-grey w-full mt-3 text-[11px] flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Vérification de la boutique / Générer le rapport
                </button>
              </div>
            </div>
          </div>

          {/* CENTER: info */}
          <div className="order-2 lg:order-none bg-white border border-[#DADAD9] p-4 sm:p-5">
            <h1 className="text-[21px] font-medium leading-snug text-[#1a1a1a]">{product.title}</h1>

            {/* meta line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[12px] text-[#666]">
              <div className="flex items-center gap-1">
                <Stars n={product.rating} />
                <span className="font-bold text-[#333]">{product.rating.toFixed(1)}</span>
                <button
                  onClick={() => setInfoTab("reviews")}
                  className="benjamin-link ml-0.5"
                >
                  ({product.reviewCount} avis)
                </button>
              </div>
              <span className="text-[#DADAD9]">|</span>
              <span>
                <span className="font-bold text-[#333]">{product.sold.toLocaleString("fr-FR")}</span> vendus
              </span>
              {product.rank > 0 && (
                <>
                  <span className="text-[#DADAD9]">|</span>
                  <span className="text-[#FF6A00] font-semibold">
                    N°{product.rank} des plus populaires en {breadcrumbCat ?? "catégorie"}
                  </span>
                </>
              )}
            </div>

            {/* trust chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.tradeAssurance && (
                <span className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-bold px-2 py-1 border border-[#16A34A]/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> Commande protégée
                </span>
              )}
              {product.readyToShip && (
                <span className="inline-flex items-center gap-1 bg-[#FF6A00]/10 text-[#FF6A00] text-[11px] font-bold px-2 py-1 border border-[#FF6A00]/30">
                  <Truck className="w-3.5 h-3.5" /> Prêt à expédier
                </span>
              )}
              {product.customizable && (
                <span className="inline-flex items-center gap-1 bg-[#0A0F4D]/5 text-[#333] text-[11px] font-bold px-2 py-1 border border-[#0A0F4D]/15">
                  Personnalisable
                </span>
              )}
              {product.lowestPrice && (
                <span className="inline-flex items-center gap-1 bg-[#FF6A00]/10 text-[#FF6A00] text-[11px] font-bold px-2 py-1 border border-[#FF6A00]/30">
                  <RefreshCw className="w-3.5 h-3.5" /> Prix le plus bas sur 180 jours
                </span>
              )}
            </div>

            {/* PRICE TIERS */}
            <div className="mt-4 border border-[#DADAD9]">
              <div className="bg-[#ECECEC] px-3 py-2 flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase text-[#333]">Prix par quantité</span>
                <span className="text-[11px] text-[#666]">par {unitLabel(product.unit)}</span>
              </div>
              <div className="divide-y divide-[#ECECEC]">
                {[...product.priceTiers]
                  .sort((a, b) => a.minQty - b.minQty)
                  .map((t, i) => {
                    const active =
                      qty >= t.minQty && (!t.maxQty || qty <= t.maxQty);
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between px-3 py-2.5 ${active ? "bg-[#FF6A00] text-white" : "hover:bg-[#ECECEC]"}`}
                      >
                        <div className="text-[12px] font-semibold">
                          {t.minQty}
                          {t.maxQty ? ` - ${t.maxQty}` : "+"} {unitLabel(t.unit)}
                        </div>
                        <div className="text-[15px] font-extrabold">
                          {formatPrice(t.price, currency)}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="px-3 py-2 bg-[#fafafa] text-[11px] text-[#888] border-t border-[#ECECEC]">
                Commande min. : <span className="font-bold text-[#333]">{product.minOrder} {unitLabel(product.minOrderUnit)}</span>
                {product.stock != null && (
                  <span className={`ml-3 font-bold ${product.stock === 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                    {product.stock === 0 ? "Rupture de stock" : `${product.stock.toLocaleString("fr-FR")} en stock`}
                  </span>
                )}
              </div>
            </div>

            {/* VARIANTS */}
            {product.variants.length > 0 && (
              <div className="mt-4 space-y-3">
                {product.variants.map((v) => (
                  <div key={v.name}>
                    <div className="text-[12px] font-bold uppercase text-[#555] mb-1.5">
                      {v.name} : <span className="text-[#333]">{variants[v.name] ?? v.options[0]}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {v.options.map((o) => (
                        <button
                          key={o}
                          onClick={() => setVariants((s) => ({ ...s, [v.name]: o }))}
                          className={`px-2.5 py-1 border text-[12px] ${
                            (variants[v.name] ?? v.options[0]) === o
                              ? "border-[#FF6A00] text-[#FF6A00] font-bold"
                              : "border-[#DADAD9] hover:border-[#FF6A00]"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-4 flex items-center gap-3">
              <div className="text-[12px] font-bold uppercase text-[#555]">Quantité</div>
              <div className="flex items-center border border-[#DADAD9]">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-9 hover:bg-[#ECECEC]"
                >
                  <Minus className="w-3.5 h-3.5 mx-auto" />
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-9 text-center text-[13px] font-semibold outline-none border-x border-[#DADAD9]"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-8 h-9 hover:bg-[#ECECEC]"
                >
                  <Plus className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>
              <span className="text-[11px] text-[#888]">{unitLabel(product.unit)}</span>
              {tier && (
                <span className="text-[12px] text-[#333] ml-auto">
                  Sous-total :{" "}
                  <span className="font-extrabold text-[#FF6A00]">{formatPrice(tier.price * qty, currency)}</span>
                </span>
              )}
            </div>

            {/* customization */}
            {product.customizable && (
              <div className="mt-4 border border-[#ECECEC] p-3 bg-[#fafafa]">
                <div className="text-[12px] font-bold text-[#333] mb-1.5">
                  Capacités de personnalisation de la boutique
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["OEM", "ODM", "Logo personnalisé", "Emballage personnalisé"].map((c) => (
                    <span key={c} className="text-[10px] font-bold uppercase border border-[#DADAD9] bg-white text-[#333] px-1.5 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* KEY ATTRIBUTES */}
            {product.keyAttributes.length > 0 && (
              <div className="mt-5">
                <div className="benjamin-section-title mb-2">Caractéristiques principales</div>
                <div className="border border-[#DADAD9]">
                  {product.keyAttributes
                    .slice(0, showAllAttrs ? undefined : 4)
                    .map((a, i) => (
                      <div
                        key={i}
                        className="flex text-[12px] border-b border-[#ECECEC] last:border-b-0"
                      >
                        <div className="w-1/3 bg-[#ECECEC]/60 px-3 py-2 font-semibold text-[#555]">
                          {a.k}
                        </div>
                        <div className="flex-1 px-3 py-2 text-[#333]">{a.v}</div>
                      </div>
                    ))}
                </div>
                {product.keyAttributes.length > 4 && (
                  <button
                    onClick={() => setShowAllAttrs((v) => !v)}
                    className="benjamin-link text-[12px] mt-1.5"
                  >
                    {showAllAttrs ? "Afficher moins" : `Afficher plus (${product.keyAttributes.length - 4} de plus)`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: order box */}
          <div className="order-3 lg:order-none">
            <div className="bg-white border border-[#DADAD9] lg:sticky lg:top-[124px]">
              <div className="benjamin-bar-red">Commander</div>
              <div className="p-4 space-y-3">
                {/* Shipping calculator */}
                <div>
                  <div className="text-[11px] uppercase font-bold text-[#888] mb-1">
                    Livraison
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={shipCountry}
                      onChange={(e) => setShipCountry(e.target.value)}
                      className="h-9 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]"
                    >
                      <option>Côte d&apos;Ivoire</option>
                      <option>Ghana</option>
                      <option>Nigeria</option>
                      <option value="USA">États-Unis</option>
                      <option value="UK">Royaume-Uni</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={shipQty}
                      onChange={(e) => setShipQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-9 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
                    />
                  </div>
                  <div className="text-[11px] text-[#666] mt-1 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-[#FF6A00]" />
                    Délai : {product.readyToShip ? "Prêt à expédier ≤ 7 j" : "15-25 j"} · Frais de livraison à convenir avec la boutique
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-[#ECECEC] pt-3 space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#888]">Sous-total articles ({qty} {unitLabel(product.unit)})</span>
                    <span className="font-semibold">{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#888]">Livraison vers {shipCountry === "USA" ? "États-Unis" : shipCountry === "UK" ? "Royaume-Uni" : shipCountry}</span>
                    <span className="font-semibold">À convenir</span>
                  </div>
                  <div className="flex justify-between text-[14px] border-t border-[#ECECEC] pt-2 mt-1">
                    <span className="font-bold">Total articles</span>
                    <span className="font-extrabold text-[#FF6A00]">{formatPrice(total, currency)}</span>
                  </div>
                </div>

                {/* protection */}
                <div className="bg-[#16A34A]/5 border border-[#16A34A]/30 p-2.5">
                  <div className="text-[11px] font-bold text-[#16A34A] flex items-center gap-1.5 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Protection de commande
                  </div>
                  <div className="text-[11px] text-[#555] space-y-0.5">
                    <div>✓ Paiement sécurisé sous séquestre</div>
                    <div>✓ Garantie de remboursement</div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      const p = data?.product;
                      if (p) {
                        setChatSupplierId(p.supplierId);
                        setChatProductId(p.id);
                      }
                      setView("chat");
                    }}
                    className="btn-benjamin-orange w-full flex items-center justify-center gap-1.5 py-2.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Contacter la boutique
                  </button>
                  <button
                    onClick={() => {
                      const p = data?.product;
                      if (p) {
                        setChatSupplierId(p.supplierId);
                        setChatProductId(p.id);
                      }
                      setView("chat");
                    }}
                    className="btn-square-black w-full flex items-center justify-center gap-1.5 py-2.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Discuter maintenant
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddToCart(false)}
                      className="btn-square-black py-2.5"
                    >
                      Ajouter au panier
                    </button>
                    <button
                      onClick={() => handleAddToCart(true)}
                      className="btn-benjamin-orange py-2.5"
                    >
                      Acheter maintenant
                    </button>
                  </div>
                </div>

                {/* trust mini */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-[#888] pt-1">
                  <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Paiement sécurisé</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Remboursement</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED CAROUSEL */}
        {related.length > 0 && (
          <div className="mt-6">
            <div className="benjamin-bar mb-3">Autres recommandations</div>
            <div className="overflow-x-auto benjamin-scroll">
              <div className="flex gap-3 min-w-max pb-2">
                {related.map((p) => (
                  <div key={p.id} className="w-[220px] shrink-0">
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* INFO TABS */}
        <div className="mt-6 bg-white border border-[#DADAD9]">
          <div className="flex border-b border-[#ECECEC] overflow-x-auto benjamin-scroll">
            {(["attributes", "reviews", "supplier", "description"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setInfoTab(t)}
                className={`px-4 py-3 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap ${
                  infoTab === t
                    ? "bg-white text-[#FF6A00] border-b-2 border-[#FF6A00] -mb-px"
                    : "text-[#666] hover:text-[#FF6A00]"
                }`}
              >
                {t === "attributes" && "Caractéristiques"}
                {t === "reviews" && `Avis (${product.reviewCount})`}
                {t === "supplier" && "Boutique"}
                {t === "description" && "Description"}
              </button>
            ))}
          </div>

          <div className="p-4">
            {infoTab === "attributes" && (
              <div>
                {product.keyAttributes.length === 0 ? (
                  <p className="text-[12px] text-[#888]">Aucune caractéristique disponible.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    {product.keyAttributes.map((a, i) => (
                      <div key={i} className="flex text-[12px] border-b border-[#ECECEC] py-1.5">
                        <div className="w-1/3 text-[#888]">{a.k}</div>
                        <div className="flex-1 text-[#333] font-semibold">{a.v}</div>
                      </div>
                    ))}
                  </div>
                )}
                {product.certifications.length > 0 && (
                  <div className="mt-4">
                    <div className="benjamin-section-title mb-1.5">Certifications du produit</div>
                    <div className="flex flex-wrap gap-1.5">
                      {product.certifications.map((c) => <CertChip key={c} c={c} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {infoTab === "reviews" && (
              <div>
                <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[#ECECEC]">
                  <div className="text-center">
                    <div className="text-[28px] font-extrabold text-[#FF6A00]">{product.rating.toFixed(1)}</div>
                    <Stars n={product.rating} />
                    <div className="text-[11px] text-[#888] mt-1">{product.reviewCount} avis</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const pct = s === Math.round(product.rating) ? 70 : s === 5 ? 20 : 5;
                      return (
                        <div key={s} className="flex items-center gap-2 text-[11px]">
                          <span className="w-6 text-[#888]">{s}★</span>
                          <div className="flex-1 h-2 bg-[#ECECEC]">
                            <div className="h-full bg-[#FF6A00]" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-[#888]">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {product.reviews.length === 0 ? (
                  <p className="text-[12px] text-[#888]">Aucun avis pour le moment. Soyez le premier à donner votre avis sur ce produit.</p>
                ) : (
                  <div className="space-y-4">
                    {product.reviews.map((r) => (
                      <div key={r.id} className="border-b border-[#ECECEC] pb-3 last:border-b-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Stars n={r.rating} />
                            <span className="text-[12px] font-bold">{r.title}</span>
                            {r.verified && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#16A34A] font-bold">
                                <BadgeCheck className="w-3 h-3" /> Vérifié
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#999]">
                            {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#555] leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {infoTab === "supplier" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={openSupplier}
                      className="text-[14px] font-bold hover:text-[#FF6A00] hover:underline"
                    >
                      {product.supplierName}
                    </button>
                    {product.supplierVerified && (
                      <BadgeCheck className="w-4 h-4 text-[#16A34A]" strokeWidth={2} />
                    )}
                  </div>
                  <div className="text-[12px] text-[#555] space-y-0.5">
                    <div>📍 {product.city}, {product.country}</div>
                    <div>🏭 {product.years} ans · {product.type}</div>
                    <div>★ Note de la boutique : {product.storeRating?.toFixed(1) ?? "—"}</div>
                    <div>⏱ Délai de réponse : {product.responseTime ?? "—"}</div>
                    <div>🚚 Expédition dans les délais : {product.onTimeDispatch ?? 0}%</div>
                    <div>🔁 Taux de recommande : {Math.round(product.reorderRate)}%</div>
                  </div>
                </div>
                <div>
                  <div className="benjamin-section-title mb-1.5">Certifications</div>
                  {product.certifications.length === 0 ? (
                    <p className="text-[12px] text-[#888]">Aucune certification indiquée.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {product.certifications.map((c) => <CertChip key={c} c={c} />)}
                    </div>
                  )}
                  <button
                    onClick={openSupplier}
                    className="btn-outline-grey mt-3 text-[11px] flex items-center gap-1"
                  >
                    Visiter la boutique <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {infoTab === "description" && (
              <div>
                <p className="text-[13px] text-[#333] leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#DADAD9] z-40 flex pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => {
            if (data?.product) {
              setChatSupplierId(data.product.supplierId);
              setChatProductId(data.product.id);
            }
            setView("chat");
          }}
          className="btn-square-black flex-1 py-3.5"
        >
          <MessageCircle className="w-4 h-4 inline mr-1.5" /> Discuter maintenant
        </button>
        <button
          onClick={() => handleAddToCart(true)}
          className="btn-benjamin-orange flex-1 py-3.5"
        >
          Commander
        </button>
      </div>
    </div>
  );
}
