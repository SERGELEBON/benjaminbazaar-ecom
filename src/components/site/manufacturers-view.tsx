"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star, BadgeCheck, MessageCircle, MapPin, Clock, Truck, RefreshCw,
  Building2, ChevronRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { type SupplierT } from "@/lib/format";
import { BRAND } from "@/lib/brand";

const COUNTRIES = ["All", "China", "Ghana", "India", "Vietnam", "Turkey"];
const COUNTRY_LABELS: Record<string, string> = {
  All: "Tous les pays",
  China: "Chine",
  Ghana: "Ghana",
  India: "Inde",
  Vietnam: "Vietnam",
  Turkey: "Turquie",
};
const countryLabel = (c: string) => COUNTRY_LABELS[c] ?? c;
const TYPE_LABELS: Record<string, string> = {
  Manufacturer: "Fabricant",
  "Trading Company": "Société de négoce",
};
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;
const responseLabel = (r: string) => r.replace(/^<=\s*/, "≤ ");

const RATINGS = [
  { k: "0", v: "Toutes les notes" },
  { k: "4.0", v: "4,0+" },
  { k: "4.5", v: "4,5+" },
  { k: "5.0", v: "5,0" },
];
const SORTS = [
  { k: "rating", v: "Mieux notés" },
  { k: "years", v: "Ancienneté" },
  { k: "products", v: "Plus de produits" },
  { k: "dispatch", v: "Expédition à temps" },
];

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white border border-[#DADAD9] p-4">
          <div className="flex gap-3">
            <div className="w-14 h-14 bg-[#ECECEC] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 bg-[#ECECEC] animate-pulse" />
              <div className="h-2 w-1/2 bg-[#ECECEC] animate-pulse" />
            </div>
          </div>
          <div className="h-16 mt-4 bg-[#ECECEC] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ManufacturersView() {
  const { setSupplierId, setView, setChatSupplierId } = useApp();

  const [suppliers, setSuppliers] = useState<SupplierT[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("All");
  const [rating, setRating] = useState("0");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suppliers`);
        const d: SupplierT[] = await res.json();
        if (!cancelled) setSuppliers(d);
      } catch {
        if (!cancelled) setSuppliers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allCats = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => s.mainCategory && set.add(s.mainCategory));
    return Array.from(set).sort();
  }, [suppliers]);

  const filtered = useMemo(() => {
    let arr = suppliers.filter((s) => {
      if (country !== "All" && s.country !== country) return false;
      if (rating !== "0" && s.storeRating < parseFloat(rating)) return false;
      if (cat !== "All" && s.mainCategory !== cat) return false;
      return true;
    });
    if (sort === "rating") arr = arr.sort((a, b) => b.storeRating - a.storeRating);
    if (sort === "years") arr = arr.sort((a, b) => b.years - a.years);
    if (sort === "products") arr = arr.sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
    if (sort === "dispatch") arr = arr.sort((a, b) => b.onTimeDispatch - a.onTimeDispatch);
    return arr;
  }, [suppliers, country, rating, cat, sort]);

  function visit(supplierId: string) {
    setSupplierId(supplierId);
    setView("supplier");
  }

  return (
    <div className="bg-[#f4f1ec] min-h-screen">
      {/* BREADCRUMB */}
      <div className="bg-white border-b border-[#ECECEC]">
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-2 text-[12px] text-[#555]">
          <button onClick={() => setView("home")} className="hover:text-[#FF6A00] hover:underline">
            Accueil
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <span className="text-[#333]">Fabricants vérifiés</span>
        </div>
      </div>

      {/* HEADER */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 pt-4">
        <div className="benjamin-bar">▼ Fabricants vérifiés</div>
        <div className="bg-white border border-t-0 border-[#DADAD9] p-4">
          <p className="text-[13px] text-[#555] leading-relaxed">
            Approvisionnez-vous auprès de <b className="text-[#333]">{suppliers.length}+ fabricants vérifiés</b>{" "}
            en Chine, au Ghana, en Inde, au Vietnam et en Turquie. Tous les fournisseurs passent le
            processus de sélection {BRAND.name} : vérification du registre de commerce, audits d&apos;usine
            sur place et suivi continu des performances (délai de réponse, expédition à temps et taux de recommande).
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 mt-4">
        <div className="bg-white border border-[#DADAD9] p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase font-bold text-[#888]">Pays</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-8 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]"
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{countryLabel(c)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase font-bold text-[#888]">Catégorie principale</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="h-8 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]"
            >
              <option value="All">Toutes les catégories</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] uppercase font-bold text-[#888]">Note</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="h-8 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]"
            >
              {RATINGS.map((r) => <option key={r.k} value={r.k}>{r.v}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-[11px] uppercase font-bold text-[#888]">Trier par</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-8 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]"
            >
              {SORTS.map((s) => <option key={s.k} value={s.k}>{s.v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* COUNT */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 pt-3">
        <div className="text-[12px] text-[#555]">
          <b className="text-[#333]">{filtered.length}</b> fabricant(s) affiché(s) sur {suppliers.length}
        </div>
      </div>

      {/* GRID */}
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#DADAD9] p-12 text-center">
            <div className="text-[14px] font-bold mb-1">Aucun fabricant ne correspond à vos filtres</div>
            <p className="text-[12px] text-[#888] mb-4">Essayez d&apos;élargir vos critères de recherche.</p>
            <button
              onClick={() => { setCountry("All"); setRating("0"); setCat("All"); }}
              className="btn-benjamin-orange"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((s) => (
              <div key={s.id} className="bg-white border border-[#DADAD9] flex flex-col">
                {/* header */}
                <div className="p-4 border-b border-[#ECECEC]">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-[#ECECEC] border border-[#DADAD9] overflow-hidden shrink-0 flex items-center justify-center">
                      {s.logo ? (
                        <img src={s.logo} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[14px] font-extrabold text-[#FF6A00]">
                          {s.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => visit(s.id)}
                          className="text-[13px] font-bold hover:text-[#FF6A00] hover:underline line-clamp-1 text-left"
                          title={s.name}
                        >
                          {s.name}
                        </button>
                        {s.verified && (
                          <BadgeCheck className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={2} />
                        )}
                      </div>
                      <div className="text-[11px] text-[#888] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {s.city}, {countryLabel(s.country)}
                      </div>
                      <div className="text-[11px] text-[#888] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" /> {typeLabel(s.type)} · {s.years} ans
                      </div>
                    </div>
                  </div>
                </div>

                {/* metrics */}
                <div className="p-4 flex-1 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-[#666]">
                      <Star className="w-3.5 h-3.5 fill-[#FF6A00] text-[#FF6A00]" />
                      <b className="text-[#333] text-[13px]">{s.storeRating.toFixed(1).replace(".", ",")}</b>
                      <span className="text-[#999]">note boutique</span>
                    </span>
                    <span className="text-[11px] text-[#16A34A] font-bold">
                      {s.productCount ?? 0} produits
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center border-y border-[#ECECEC] py-2">
                    <div>
                      <div className="text-[9px] text-[#888] uppercase">Réponse</div>
                      <div className="text-[11px] font-bold text-[#337AB7]">{responseLabel(s.responseTime)}</div>
                    </div>
                    <div className="border-x border-[#ECECEC]">
                      <div className="text-[9px] text-[#888] uppercase">À temps</div>
                      <div className="text-[11px] font-bold text-[#16A34A]">{s.onTimeDispatch} %</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#888] uppercase">Recommande</div>
                      <div className="text-[11px] font-bold text-[#FF6A00]">{Math.round(s.reorderRate)} %</div>
                    </div>
                  </div>

                  {/* main cat */}
                  <div className="text-[11px] text-[#666] flex items-center gap-1.5">
                    <span className="text-[#888]">Catégorie :</span>
                    <span className="font-bold text-[#333]">{s.mainCategory ?? "—"}</span>
                  </div>

                  {/* certifications */}
                  {s.certifications.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.certifications.slice(0, 4).map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-0.5 bg-[#16A34A]/10 text-[#16A34A] text-[9px] font-bold uppercase border border-[#16A34A]/30 px-1 py-0.5"
                        >
                          <BadgeCheck className="w-2.5 h-2.5" /> {c}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* actions */}
                <div className="grid grid-cols-2 gap-2 p-3 border-t border-[#ECECEC]">
                  <button
                    onClick={() => visit(s.id)}
                    className="btn-square-black flex items-center justify-center gap-1.5 py-2"
                  >
                    Voir la boutique <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setChatSupplierId(s.id);
                      setView("chat");
                    }}
                    className="btn-benjamin-orange flex items-center justify-center gap-1.5 py-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Discuter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* bottom info bar */}
      {!loading && filtered.length > 0 && (
        <div className="max-w-[1280px] mx-auto px-3 lg:px-6 pb-8">
          <div className="bg-[#0A0F4D] text-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-[14px] font-bold uppercase tracking-wide">▼ Devenez fabricant vérifié</div>
              <p className="text-[12px] text-[#bdbdbd] mt-1">
                Référencez votre usine et touchez plus de 10 000 acheteurs en Afrique de l&apos;Ouest et dans le monde.
                Commande protégée et assistant d&apos;approvisionnement IA inclus.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView("supplier-dashboard")}
                className="btn-benjamin-orange"
              >
                Postuler maintenant
              </button>
              <button
                onClick={() => setView("help")}
                className="btn-outline-grey !text-white !border-white/40 hover:!border-white hover:!text-white"
              >
                En savoir plus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
