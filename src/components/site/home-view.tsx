"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search, Camera, FileUp, ChevronLeft, ChevronRight, X, Bot,
  FileText, TrendingUp, Zap,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { CategoryNode, ProductT } from "@/lib/format";
import { CatIcon } from "./cat-icon";
import { ProductCard } from "./product-card";

/* ─────────────────────────────────────────────────────────────
   PromoSlider — slider 3 images pro compact, intégré dans la zone pub.
   Chaque slide : image pro + dégradé sombre + badge + titre + CTA.
   Auto-rotation 5s, flèches, points indicateurs.
   ───────────────────────────────────────────────────────────── */
const PROMO_SLIDES = [
  {
    image: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/36bec25fd4e4.jpg",
    badge: "TRADE ASSURANCE",
    badgeColor: "#16A34A",
    title: "Sourcez en toute confiance",
    text: "Paiement sécurisé, remboursement garanti, expédition à temps ≥ 98%.",
    cta: "Découvrir",
    view: "help" as const,
  },
  {
    image: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/fcf2c3e07cc9.png",
    badge: "DEMANDE DE DEVIS",
    badgeColor: "#FF6A00",
    title: "3 à 5 devis en 24h",
    text: "Décrivez votre besoin, recevez les meilleures offres. Gratuit.",
    cta: "Créer un devis",
    view: "rfq" as const,
  },
  {
    image: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/daa43bc52bb1.jpg",
    badge: "LIVRAISON CI",
    badgeColor: "#16A34A",
    title: "Livraison Abidjan & Afrique de l'Ouest",
    text: "Délai 7-15j. Dédouanement pris en charge.",
    cta: "Voir les produits",
    view: "search" as const,
  },
];

function PromoSlider() {
  const setView = useApp((s) => s.setView);
  const setSearchQuery = useApp((s) => s.setSearchQuery);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % PROMO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  const go = (dir: number) => setActive((i) => (i + dir + PROMO_SLIDES.length) % PROMO_SLIDES.length);

  function handleCta(view: "help" | "rfq" | "search") {
    if (view === "search") setSearchQuery("ready to ship");
    setView(view);
  }

  return (
    <div
      className="relative bg-[#1a2e22] overflow-hidden border-t border-[#ECECEC]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[180px] sm:h-[200px]">
        {PROMO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
          >
            <img src={s.image} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06140d]/95 via-[#06140d]/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06140d]/70 via-transparent to-transparent" />
            <div className="relative h-full px-4 flex flex-col justify-center">
              <span
                className="inline-block self-start text-[9px] font-bold uppercase tracking-[0.1em] text-white px-2 py-0.5 mb-2"
                style={{ backgroundColor: s.badgeColor }}
              >
                {s.badge}
              </span>
              <h3 className="text-[15px] sm:text-[17px] font-extrabold text-white leading-tight drop-shadow-lg">
                {s.title}
              </h3>
              <p className="text-[11px] sm:text-[12px] text-white/90 mt-1 leading-snug drop-shadow-md max-w-[280px]">
                {s.text}
              </p>
              <button
                onClick={() => handleCta(s.view)}
                className="self-start mt-2 inline-flex items-center gap-1 bg-white text-[#063d1f] font-bold uppercase text-[10px] tracking-wider px-3 py-1.5 hover:bg-[#16A34A] hover:text-white transition-colors"
              >
                {s.cta}
                <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => go(-1)}
        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/50 hover:bg-[#16A34A] text-white flex items-center justify-center transition-colors"
        aria-label="Précédent"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <button
        onClick={() => go(1)}
        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 bg-black/50 hover:bg-[#16A34A] text-white flex items-center justify-center transition-colors"
        aria-label="Suivant"
      >
        <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
      </button>
      <div className="absolute bottom-2 right-3 z-20 flex gap-1.5">
        {PROMO_SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 transition-all ${i === active ? "w-6 bg-[#16A34A]" : "w-1.5 bg-white/50 hover:bg-white"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}



const FREQUENT = [
  "baskets", "panneaux solaires", "t-shirts", "écouteurs", "ruban LED",
  "coques téléphone", "sacs à dos", "casques", "farine d'igname", "climatiseur",
  "perruques", "montres", "mobilier", "boîtes d'emballage", "beauté",
];

const FREQUENT_IMAGES: Record<string, string> = {
  "baskets": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/452a174ed6e2.webp",
  "panneaux solaires": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b6a1160f8306.jpg",
  "t-shirts": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/011a74e70a59.jpg",
  "écouteurs": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/92c54eb2e4a5.jpg",
  "ruban LED": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/e7b70d3f3ea4.jpg",
  "coques téléphone": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a04b92df934a.jpg",
  "sacs à dos": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/33e0c6240d35.jpg",
  "casques": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/da7264b3f8eb.jpg",
  "farine d'igname": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6d5cb724210a.jpg",
  "climatiseur": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/aa801f4f6085.jpg",
  "perruques": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1e475a0483e0.webp",
  "montres": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/db272ea2c99e.jpg",
  "mobilier": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/6bf3d7f15603.jpg",
  "boîtes d'emballage": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a1e0f14b44c1.jpeg",
  "beauté": "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/81f1195f0185.jpg",
};

export function HomeView({ categories }: { categories: CategoryNode[] }) {
  const { setView, setCategoryId, setSearchQuery } = useApp();
  const [products, setProducts] = useState<ProductT[]>([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const skipRef = useRef(0);

  // keep refs in sync
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const cur = skipRef.current;
      const res = await fetch(`/api/products?take=20&skip=${cur}`);
      const d = await res.json();
      if (!d.products || d.products.length === 0) {
        setHasMore(false);
        hasMoreRef.current = false;
      } else {
        setProducts((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          const fresh = d.products.filter((x: ProductT) => !seen.has(x.id));
          return [...prev, ...fresh];
        });
        skipRef.current = cur + d.products.length;
        setSkip(skipRef.current);
        if (d.products.length < 20) {
          setHasMore(false);
          hasMoreRef.current = false;
        }
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/products?take=20&skip=0`);
      const d = await res.json();
      setProducts(d.products);
      skipRef.current = d.products.length;
      setSkip(d.products.length);
    })();
    const t = setTimeout(() => setPopupOpen(true), 3500);
    return () => clearTimeout(t);
  }, []);

  // infinite scroll observer
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  function search(qv?: string) {
    setSearchQuery(qv ?? q);
    setView("search");
  }
  function openCategory(catId: string) {
    setCategoryId(catId);
    setSearchQuery("");
    setView("search");
  }

  const topCats = categories.slice(0, 14);

  return (
    <div className="bg-transparent">
      {/* HERO — fond sombre préservé, accents verts */}
      <section className="relative bg-gradient-to-b from-[#2a1c14] to-[#1a130d] text-white overflow-hidden">
        {/* motif décoratif vert */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #16A34A 0, transparent 45%), radial-gradient(circle at 80% 70%, #16A34A 0, transparent 40%)" }} />
        <div className="relative max-w-[1100px] mx-auto px-4 py-7 sm:py-10 lg:py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-[#16A34A] px-3 py-1 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider mb-3 sm:mb-4 border border-[#1ea84d]">
            <Bot className="w-3.5 h-3.5" /> Sourcing IA 2025
          </div>
          <h1 className="text-[24px] sm:text-[30px] lg:text-[40px] font-extrabold leading-tight">
            Sourcez plus intelligemment auprès de <span className="text-[#4ade80]">fabricants vérifiés</span>
          </h1>
          <p className="text-[#cdbfb5] text-[13px] sm:text-[14px] mt-2 max-w-2xl mx-auto">
            200+ produits en gros · 20 fournisseurs vérifiés · Trade Assurance ·
            Devis en quelques minutes · Livraison en Côte d'Ivoire, Afrique de l'Ouest &amp; dans le monde.
          </p>

          {/* big search */}
          <div className="mt-5 sm:mt-6 max-w-3xl mx-auto flex items-center bg-white h-12 sm:h-14 border-2 border-[#16A34A]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Que recherchez-vous ?"
              className="flex-1 min-w-0 h-full px-3 sm:px-4 text-[14px] text-[#333] outline-none bg-transparent placeholder:text-[#999]"
            />
            <button className="px-2.5 sm:px-3 h-full border-l border-[#ECECEC] hover:bg-[#ECECEC]" title="Recherche par image">
              <Camera className="w-5 h-5 text-[#555]" />
            </button>
            <button className="hidden sm:block px-3 h-full border-l border-[#ECECEC] hover:bg-[#ECECEC]" title="Recherche par fichier">
              <FileUp className="w-5 h-5 text-[#555]" />
            </button>
            <button onClick={() => search()} aria-label="Rechercher" className="bg-[#16A34A] text-white px-4 sm:px-7 h-full shrink-0 font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#15803D]">
              <Search className="w-5 h-5" /> <span className="hidden sm:inline">Rechercher</span>
            </button>
          </div>
          <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:flex-wrap sm:justify-center gap-2 text-[11px] overflow-x-auto no-scrollbar">
            {FREQUENT.slice(0, 7).map((f) => (
              <button key={f} onClick={() => { setQ(f); search(f); }} className="shrink-0 whitespace-nowrap bg-white/10 hover:bg-[#16A34A] px-2.5 py-1.5 border border-white/20">
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* welcome + quick links */}
      <div className="bg-[#000] text-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-6 flex items-center gap-x-5 sm:gap-x-6 h-11 text-[12px] overflow-x-auto no-scrollbar whitespace-nowrap">
          <span className="hidden sm:inline font-bold uppercase tracking-wide">
            ▼ Bienvenue sur BENJAMINBAZAAR
          </span>
          <button onClick={() => setView("rfq")} className="shrink-0 hover:text-[#FF6A00] flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-[#FF6A00]" /> Demande de devis
          </button>
          <button onClick={() => setView("ranking")} className="shrink-0 hover:text-[#FF6A00] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#FF6A00]" /> Top classement
          </button>
          <button onClick={() => setView("search")} className="shrink-0 hover:text-[#FF6A00] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#FF6A00]" /> Personnalisation rapide
          </button>
        </div>
      </div>

      {/* 3-zone row */}
      <section className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4 sm:py-5">
        {/* mobile categories: horizontal chips */}
        <div className="md:hidden bg-white border border-[#DADAD9] mb-3">
          <div className="benjamin-bar">Catégories pour vous</div>
          <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
            {topCats.map((c) => (
              <button
                key={c.id}
                onClick={() => openCategory(c.id)}
                className="shrink-0 w-[84px] flex flex-col items-center gap-1.5 text-center"
              >
                <span className="w-12 h-12 bg-[#f4f1ec] border border-[#ECECEC] flex items-center justify-center text-[#FF6A00]">
                  <CatIcon name={c.icon} className="w-5 h-5" />
                </span>
                <span className="text-[11px] leading-tight text-[#333] line-clamp-2">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr_280px] gap-3">
          {/* left categories (tablet / desktop) */}
          <div className="hidden md:block bg-white border border-[#DADAD9]">
            <div className="benjamin-bar">Catégories pour vous</div>
            <div className="relative">
              <div className="max-h-[460px] overflow-y-auto benjamin-scroll">
                {topCats.map((c) => (
                  <div
                    key={c.id}
                    onMouseEnter={() => setHoveredCat(c.id)}
                    onMouseLeave={() => setHoveredCat(null)}
                    onClick={() => openCategory(c.id)}
                    className={`benjamin-tile border-0 border-b border-[#ECECEC] ${hoveredCat === c.id ? "active" : ""}`}
                  >
                    <CatIcon name={c.icon} className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="benjamin-tile-arrow text-[14px]">›</span>
                  </div>
                ))}
              </div>
              {/* flyout */}
              {hoveredCat && categories.find((c) => c.id === hoveredCat)?.children?.length ? (
                <div className="hidden md:block absolute left-full top-0 ml-px w-[420px] bg-white border border-[#DADAD9] z-30 p-4">
                  <div className="benjamin-section-title mb-3">
                    {categories.find((c) => c.id === hoveredCat)?.name}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {categories.find((c) => c.id === hoveredCat)?.children?.map((s) => (
                      <button key={s.id} onClick={() => openCategory(s.id)} className="text-left text-[12px] hover:text-[#FF6A00] hover:underline">
                        {s.name}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => openCategory(hoveredCat)} className="btn-benjamin-orange mt-4 text-[11px]">Voir tout ›</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* center frequently searched carousel */}
          <div className="bg-white border border-[#DADAD9]">
            <div className="benjamin-bar">Recherches fréquentes</div>
            <div className="p-3 overflow-x-auto benjamin-scroll">
              <div className="flex gap-3 min-w-max">
                {FREQUENT.map((f, i) => (
                  <button
                    key={f}
                    onClick={() => { setQ(f); search(f); }}
                    className="w-[120px] sm:w-[150px] shrink-0 border border-[#ECECEC] hover:border-[#FF6A00] text-left bg-white"
                  >
                    <div className="aspect-[4/3] bg-[#ECECEC] overflow-hidden">
                      <img src={FREQUENT_IMAGES[f] || `https://picsum.photos/seed/benjamin-freq-${i}/300/220`} alt={f} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] font-semibold text-[#333] line-clamp-1">{f}</div>
                      <div className="text-[10px] text-[#999] mt-0.5">{1200 + i * 87} recherches</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* slider pub 3 images pro */}
            <PromoSlider />
          </div>

          {/* right promo */}
          <div className="bg-white border border-[#DADAD9] md:col-span-2 lg:col-span-1">
            <div className="benjamin-bar-red">Trade Assurance</div>
            <div className="p-4">
              <img src="https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=600&q=70" alt="entrepôt" className="w-full h-32 object-cover" />
              <div className="benjamin-section-title mt-3">Protection des commandes</div>
              <ul className="text-[12px] text-[#555] mt-2 space-y-1.5">
                <li>✓ Paiement sécurisé (séquestre)</li>
                <li>✓ Remboursement garanti</li>
                <li>✓ Expédition à temps ≥ 98%</li>
                <li>✓ Rapports de vérification fournisseur</li>
              </ul>
              <button onClick={() => setView("help")} className="btn-outline-grey w-full mt-3">En savoir plus</button>
            </div>
          </div>
        </div>
      </section>

      {/* JUST FOR YOU infinite feed */}
      <section className="max-w-[1280px] mx-auto px-3 lg:px-6 pb-10">
        <div className="benjamin-bar mb-3">Pour vous</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div ref={sentinel} className="h-10" />
        {loading && (
          <div className="text-center py-6 text-[12px] text-[#888] uppercase tracking-wider">
            Chargement de plus de produits…
          </div>
        )}
        {!hasMore && (
          <div className="text-center py-6 text-[12px] text-[#888] uppercase tracking-wider">
            — Fin du fil —
          </div>
        )}
      </section>

      {/* AI popup */}
      {popupOpen && (
        <div className="fixed bottom-24 left-6 z-[65] hidden md:block">
          <div className="bg-white border-2 border-[#FF6A00] w-72 p-4">
            <button onClick={() => setPopupOpen(false)} className="absolute top-1 right-1 p-1">
              <X className="w-4 h-4 text-[#888]" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-[#FF6A00] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-[13px]">Assistant IA BENJAMIN</div>
            </div>
            <p className="text-[12px] text-[#555] leading-snug">
              Négociez sans effort avec l'IA — rédigez des demandes de devis, comparez les offres, traduisez les spécifications. Essai gratuit.
            </p>
            <button
              onClick={() => { setPopupOpen(false); setView("help"); }}
              className="btn-benjamin-orange w-full mt-3 text-[11px]"
            >
              Essayer gratuitement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
