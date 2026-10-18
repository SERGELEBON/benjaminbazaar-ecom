"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star, BadgeCheck, MessageCircle, MapPin, Building2, Users, DollarSign,
  Globe2, Clock, Truck, RefreshCw, ShieldCheck, FileText, ChevronRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type SupplierT } from "@/lib/format";
import { ProductCard } from "./product-card";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";
import { sendInquiry } from "@/lib/chat-client";

type SupplierFull = SupplierT & { products: ProductT[] };

const TABS = ["Home", "Products", "Company Profile", "Certificates", "Contact"] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  Home: "Accueil",
  Products: "Produits",
  "Company Profile": "Profil de l'entreprise",
  Certificates: "Certificats",
  Contact: "Contact",
};

const TYPE_LABELS: Record<string, string> = {
  Manufacturer: "Fabricant",
  "Trading Company": "Société de négoce",
};
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;

const COUNTRY_LABELS: Record<string, string> = {
  China: "Chine",
  Ghana: "Ghana",
  India: "Inde",
  Vietnam: "Vietnam",
  Turkey: "Turquie",
  Nigeria: "Nigeria",
};
const countryLabel = (c: string) => COUNTRY_LABELS[c] ?? c;

const MARKET_LABELS: Record<string, string> = {
  Africa: "Afrique",
  Europe: "Europe",
  Americas: "Amériques",
  "Middle East": "Moyen-Orient",
  Asia: "Asie",
};
const marketLabels = (m: string[]) => m.map((x) => MARKET_LABELS[x] ?? x);

const responseLabel = (r: string) => r.replace(/^<=\s*/, "≤ ");

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

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex-1 min-w-[100px] p-2.5 text-center border-r border-[#ECECEC] last:border-r-0">
      <div className="text-[10px] text-[#888] uppercase tracking-wide">{label}</div>
      <div className={`text-[13px] font-bold ${accent ?? "text-[#333]"}`}>{value}</div>
    </div>
  );
}

function SkeletonSupplier() {
  return (
    <div className="bg-[#f4f1ec] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        <div className="bg-white border border-[#DADAD9] p-5 h-48 bg-[#ECECEC] animate-pulse" />
        <div className="mt-4 h-12 bg-[#ECECEC] animate-pulse" />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-[#DADAD9]">
              <div className="aspect-square bg-[#ECECEC] animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-full bg-[#ECECEC] animate-pulse" />
                <div className="h-3 w-2/3 bg-[#ECECEC] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SupplierView() {
  const { supplierId, setSupplierId, setView, setProductId, setChatSupplierId, currency, authStatus, setAuthMode, openChat } = useApp();
  const [sending, setSending] = useState(false);
  const [supplier, setSupplier] = useState<SupplierFull | null>(null);
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Home");

  // If no supplierId, fetch list and pick first
  useEffect(() => {
    if (supplierId) return;
    (async () => {
      try {
        const res = await fetch(`/api/suppliers`);
        const d: SupplierT[] = await res.json();
        if (d.length) {
          const first = d[0];
          setFallbackId(first.id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [supplierId]);

  const effectiveId = supplierId ?? fallbackId;

  useEffect(() => {
    if (!effectiveId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/suppliers/${effectiveId}`);
        const d = await res.json();
        if (!cancelled) setSupplier(d);
      } catch {
        if (!cancelled) setSupplier(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveId]);

  const allCats = useMemo(() => {
    if (!supplier) return [] as string[];
    const set = new Set<string>();
    supplier.products.forEach((p) => p.categoryName && set.add(p.categoryName));
    return Array.from(set);
  }, [supplier]);

  if (loading) return <SkeletonSupplier />;
  if (!supplier) {
    return (
      <div className="bg-[#f4f1ec] min-h-screen">
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center">
          <div className="bg-white border border-[#DADAD9] p-10">
            <div className="text-[14px] font-bold mb-2">Fournisseur introuvable</div>
            <button onClick={() => setView("manufacturers")} className="btn-benjamin-orange">
              Voir les fabricants
            </button>
          </div>
        </div>
      </div>
    );
  }

  function openProduct(p: ProductT) {
    setProductId(p.id);
    setView("product");
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
          <button
            onClick={() => setView("manufacturers")}
            className="hover:text-[#FF6A00] hover:underline"
          >
            Fabricants
          </button>
          <span className="mx-1 text-[#DADAD9]">›</span>
          <span className="text-[#333]">{supplier.name}</span>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-4">
        {/* BANNER */}
        <div className="bg-white border border-[#DADAD9]">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
            {/* Logo block */}
            <div className="bg-[#1a1a1a] text-white p-5 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-white border-2 border-[#FF6A00] overflow-hidden flex items-center justify-center">
                {supplier.logo ? (
                  <img src={supplier.logo} alt={supplier.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[22px] font-extrabold text-[#FF6A00]">
                    {supplier.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="mt-3 text-[14px] font-bold text-center">{supplier.name}</div>
              <div className="flex items-center gap-1 text-[11px] text-[#9c9c9c] mt-1">
                {supplier.verified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A]" strokeWidth={2} />
                )}
                {typeLabel(supplier.type)} · {supplier.years} ans
              </div>
              <div className="text-[10px] text-[#777] uppercase tracking-wider mt-2">
                ID: {supplier.id.slice(-8).toUpperCase()}
              </div>
            </div>

            {/* Info */}
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-[20px] font-bold text-[#1a1a1a]">{supplier.name}</h1>
                    {supplier.verified && (
                      <span className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] text-[11px] font-bold px-2 py-0.5 border border-[#16A34A]/30">
                        <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} /> Vérifié
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#888] flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {supplier.city}, {countryLabel(supplier.country)}
                    <span className="mx-1 text-[#DADAD9]">|</span>
                    <Building2 className="w-3.5 h-3.5" /> {typeLabel(supplier.type)}
                    <span className="mx-1 text-[#DADAD9]">|</span>
                    <span>📅 {supplier.years} ans</span>
                  </div>
                  <div className="text-[12px] text-[#555] mt-1">
                    Catégorie principale : <span className="font-bold text-[#333]">{supplier.mainCategory ?? "—"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (supplier?.id) setChatSupplierId(supplier.id);
                      setView("chat");
                    }}
                    className="btn-square-black flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> Discuter
                  </button>
                  <button
                    onClick={() => setTab("Contact")}
                    className="btn-benjamin-orange flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4" /> Envoyer une demande
                  </button>
                </div>
              </div>

              {/* Quick facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 mt-4 border-y border-[#ECECEC] py-2 text-[11px] text-[#666]">
                {supplier.employees && (
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span><b className="text-[#333]">{supplier.employees}</b> employés</span>
                  </div>
                )}
                {supplier.annualRevenue && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#FF6A00]" />
                    <span>Chiffre d&apos;affaires : <b className="text-[#333]">{supplier.annualRevenue}</b></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Marchés : <b className="text-[#333]">{marketLabels(supplier.markets.slice(0, 3)).join(", ") || "—"}</b></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span>Commande protégée</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap mt-3 border border-[#ECECEC]">
                <Metric label="Note boutique" value={supplier.storeRating.toFixed(1).replace(".", ",")} accent="text-[#FF6A00]" />
                <Metric label="Réponse" value={responseLabel(supplier.responseTime)} accent="text-[#337AB7]" />
                <Metric label="Expédition à temps" value={`${supplier.onTimeDispatch} %`} accent="text-[#16A34A]" />
                <Metric label="Taux de recommande" value={`${Math.round(supplier.reorderRate)} %`} accent="text-[#FF6A00]" />
                <Metric label="Produits" value={String(supplier.productCount ?? supplier.products.length)} />
              </div>

              {/* Certifications */}
              {supplier.certifications.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-[#888]">Certifications :</span>
                  {supplier.certifications.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-bold uppercase border border-[#16A34A]/30 px-1.5 py-0.5">
                      <BadgeCheck className="w-3 h-3" /> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="bg-white border border-t-0 border-[#DADAD9]">
          <div className="flex overflow-x-auto benjamin-scroll">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-[12px] font-bold uppercase tracking-wide whitespace-nowrap ${
                  tab === t
                    ? "bg-[#0A0F4D] text-white"
                    : "text-[#666] hover:bg-[#ECECEC] hover:text-[#FF6A00]"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="mt-4">
          {tab === "Home" && (
            <div className="space-y-4">
              {/* Featured products */}
              <div>
                <div className="benjamin-bar mb-3">Produits phares</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {supplier.products.slice(0, 8).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
              {/* Company snapshot */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">L&apos;entreprise en bref</div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[12px]">
                  {[
                    ["Ancienneté", `${supplier.years} ans`],
                    ["Type d'activité", typeLabel(supplier.type)],
                    ["Localisation", `${supplier.city}, ${countryLabel(supplier.country)}`],
                    ["Employés", supplier.employees ?? "—"],
                    ["Chiffre d'affaires annuel", supplier.annualRevenue ?? "—"],
                    ["Catégorie principale", supplier.mainCategory ?? "—"],
                    ["Marchés principaux", marketLabels(supplier.markets).join(", ") || "—"],
                    ["Nombre de produits", String(supplier.productCount ?? supplier.products.length)],
                    ["Note boutique", `${supplier.storeRating.toFixed(1).replace(".", ",")} / 5`],
                    ["Délai de réponse", responseLabel(supplier.responseTime)],
                    ["Expédition à temps", `${supplier.onTimeDispatch} %`],
                    ["Taux de recommande", `${Math.round(supplier.reorderRate)} %`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex border-b border-[#ECECEC] py-1.5">
                      <div className="w-1/2 text-[#888]">{k}</div>
                      <div className="flex-1 text-[#333] font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "Products" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="benjamin-section-title">
                  Tous les produits ({supplier.productCount ?? supplier.products.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allCats.map((c) => (
                    <span key={c} className="text-[10px] font-bold uppercase border border-[#DADAD9] text-[#555] px-1.5 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {supplier.products.length === 0 ? (
                <div className="bg-white border border-[#DADAD9] p-10 text-center text-[12px] text-[#888]">
                  Aucun produit publié pour le moment.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {supplier.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Company Profile" && (
            <div className="space-y-4">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Profil de l&apos;entreprise</div>
                <div className="p-5">
                  <p className="text-[13px] text-[#333] leading-relaxed">
                    {supplier.name} est une entreprise ({typeLabel(supplier.type).toLowerCase()}) basée à {supplier.city}, {countryLabel(supplier.country)},
                    en activité depuis {supplier.years} ans. Spécialisée dans la catégorie {supplier.mainCategory ?? "produits de gros"},
                    elle dessert les marchés suivants : {marketLabels(supplier.markets.slice(0, 3)).join(", ") || "le monde entier"}.
                    Avec un effectif de {supplier.employees ?? "—"} employés et un chiffre d&apos;affaires annuel de {supplier.annualRevenue ?? "—"},
                    {supplier.name} est {supplier.verified ? "un fournisseur vérifié" : "un fournisseur actif"} sur {BRAND.name},
                    avec une note boutique de {supplier.storeRating.toFixed(1).replace(".", ",")}, un taux d&apos;expédition à temps de {supplier.onTimeDispatch} %
                    et un taux de recommande de {Math.round(supplier.reorderRate)} %.
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-[12px]">
                    {[
                      ["Année de création", `${new Date().getFullYear() - supplier.years}`],
                      ["Type d'activité", typeLabel(supplier.type)],
                      ["Localisation", `${supplier.city}, ${countryLabel(supplier.country)}`],
                      ["Employés", supplier.employees ?? "—"],
                      ["Chiffre d'affaires annuel", supplier.annualRevenue ?? "—"],
                      ["Catégorie principale", supplier.mainCategory ?? "—"],
                      ["Marchés principaux", marketLabels(supplier.markets).join(", ") || "—"],
                      ["Capacité de production", "10 000+ unités / mois"],
                      ["Port le plus proche", supplier.country === "China" ? "Shanghai" : supplier.country === "Ghana" ? "Tema" : "—"],
                      ["Incoterms acceptés", "FOB, CIF, EXW, DDP"],
                      ["Paiements acceptés", "Virement (T/T), lettre de crédit (L/C), PayPal, séquestre"],
                      ["Langues parlées", "Anglais, français, mandarin"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex border-b border-[#ECECEC] py-1.5">
                        <div className="w-1/2 text-[#888]">{k}</div>
                        <div className="flex-1 text-[#333] font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Capacité de production et qualité</div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="benjamin-section-title mb-1.5">Indicateurs de production</div>
                    <ul className="text-[12px] text-[#555] space-y-1.5">
                      <li>🏭 Lignes de production : 4</li>
                      <li>👥 Production annuelle : 1,2 million d&apos;unités</li>
                      <li>📦 OEM/ODM accepté</li>
                      <li>🏷️ Marque blanche acceptée</li>
                      <li>📋 Délai pour échantillons : 5 à 7 jours</li>
                      <li>🚚 Délai pour commandes en gros : 15 à 30 jours</li>
                    </ul>
                  </div>
                  <div>
                    <div className="benjamin-section-title mb-1.5">Qualité et conformité</div>
                    <ul className="text-[12px] text-[#555] space-y-1.5">
                      <li>✓ Équipe contrôle qualité : 12 inspecteurs</li>
                      <li>✓ Tests en laboratoire interne</li>
                      <li>✓ Système qualité ISO 9001</li>
                      <li>✓ Inspection avant expédition</li>
                      <li>✓ Inspection par un tiers acceptée</li>
                      <li>✓ Taux de défaut &lt; 0,3 %</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Certificates" && (
            <div>
              <div className="benjamin-bar mb-3">Certifications de gestion et de produits</div>
              {supplier.certifications.length === 0 ? (
                <div className="bg-white border border-[#DADAD9] p-10 text-center text-[12px] text-[#888]">
                  Aucune certification renseignée.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {supplier.certifications.map((c) => (
                    <div key={c} className="bg-white border border-[#DADAD9] p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#16A34A]/10 border border-[#16A34A]/30 flex items-center justify-center">
                          <BadgeCheck className="w-6 h-6 text-[#16A34A]" />
                        </div>
                        <div>
                          <div className="text-[14px] font-bold text-[#333]">{c}</div>
                          <div className="text-[11px] text-[#888]">Vérifié · Valable jusqu&apos;en 2027</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#666] mt-3 leading-snug">
                        Délivré par un organisme de certification tiers accrédité.
                        Atteste la conformité aux normes de qualité internationales.
                      </div>
                      <button
                        onClick={() => toast.success("Certificat demandé", { description: `Le certificat ${c} vous sera envoyé par e-mail.` })}
                        className="btn-outline-grey w-full mt-3 text-[11px] flex items-center justify-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Demander une copie
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Contact" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Contact details */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Coordonnées</div>
                <div className="p-5 space-y-3 text-[12px]">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Adresse</div>
                      <div className="text-[#333] font-semibold">
                        Zone industrielle de {supplier.city}, {supplier.city}, {countryLabel(supplier.country)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Délai de réponse</div>
                      <div className="text-[#333] font-semibold">{responseLabel(supplier.responseTime)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Expédition à temps</div>
                      <div className="text-[#333] font-semibold">{supplier.onTimeDispatch} %</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">Taux de recommande</div>
                      <div className="text-[#333] font-semibold">{Math.round(supplier.reorderRate)} %</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-[#FF6A00] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[#888] uppercase text-[10px]">WhatsApp</div>
                      <div className="text-[#333] font-semibold">+{supplier.country === "China" ? "8613800138000" : "233501234567"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry form */}
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar-red">Envoyer une demande</div>
                <form
                  className="p-5 space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    if (authStatus !== "authenticated") {
                      toast.message("Connectez-vous pour contacter ce fournisseur.");
                      setAuthMode("login");
                      setView("auth");
                      return;
                    }
                    const f = new FormData(form);
                    const content = [
                      `Demande : ${String(f.get("subject") ?? "").trim()}`,
                      `Quantité : ${String(f.get("quantity") ?? "")} ${String(f.get("unit") ?? "")}`,
                      "",
                      String(f.get("details") ?? "").trim(),
                    ].join("\n");
                    setSending(true);
                    try {
                      await sendInquiry(supplier.id, content);
                      toast.success("Demande envoyée", { description: `Retrouvez la conversation avec ${supplier.name} dans vos messages.` });
                      form.reset();
                      openChat(supplier.id);
                    } catch (err) {
                      toast.error("Demande non envoyée", { description: (err as Error).message });
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Objet</label>
                    <input
                      required
                      name="subject"
                      maxLength={200}
                      className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]"
                      defaultValue={`Demande concernant : ${supplier.mainCategory ?? "vos produits"}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Quantité</label>
                      <input required name="quantity" type="number" min={1} defaultValue={100} className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] outline-none focus:border-[#FF6A00]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Unité</label>
                      <select name="unit" className="w-full h-9 border border-[#DADAD9] px-2 text-[12px] bg-white outline-none focus:border-[#FF6A00]">
                        <option value="pièces">pièces</option>
                        <option value="cartons">cartons</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-[#555] mb-1">Détails</label>
                    <textarea
                      rows={4}
                      required
                      name="details"
                      maxLength={3500}
                      placeholder="Décrivez votre besoin : prix cible, date de livraison, personnalisation…"
                      className="w-full border border-[#DADAD9] px-2 py-1.5 text-[12px] outline-none focus:border-[#FF6A00] resize-none"
                    />
                  </div>
                  <button type="submit" disabled={sending} className="btn-benjamin-orange w-full flex items-center justify-center gap-1.5 py-2.5 disabled:opacity-60">
                    <FileText className="w-4 h-4" /> {sending ? "Envoi…" : "Envoyer la demande"}
                  </button>
                  <p className="text-[10px] text-[#888] text-center">
                    Votre demande sera transmise via la messagerie sécurisée {BRAND.name}. En l&apos;envoyant, vous acceptez nos conditions d&apos;utilisation.
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Suggested suppliers */}
        <div className="mt-8">
          <div className="benjamin-bar mb-3">Autres fournisseurs susceptibles de vous intéresser</div>
          <SuggestedSuppliers currentId={supplier.id} onPick={(id) => { setSupplierId(id); setTab("Home"); }} />
        </div>
      </div>
    </div>
  );
}

function SuggestedSuppliers({ currentId, onPick }: { currentId: string; onPick: (id: string) => void }) {
  const [items, setItems] = useState<SupplierT[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/suppliers`);
        const d: SupplierT[] = await res.json();
        setItems(d.filter((s) => s.id !== currentId).slice(0, 4));
      } catch {
        /* ignore */
      }
    })();
  }, [currentId]);
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((s) => (
        <button
          key={s.id}
          onClick={() => onPick(s.id)}
          className="bg-white border border-[#DADAD9] p-4 text-left hover:border-[#FF6A00]"
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#ECECEC] border border-[#DADAD9] flex items-center justify-center text-[12px] font-extrabold text-[#FF6A00]">
              {s.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-bold truncate">{s.name}</span>
                {s.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" strokeWidth={2} />}
              </div>
              <div className="text-[11px] text-[#888] truncate">{s.city}, {countryLabel(s.country)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-[#666]">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
              <b className="text-[#333]">{s.storeRating.toFixed(1).replace(".", ",")}</b>
            </span>
            <span>{s.years} ans</span>
            <span className="text-[#16A34A] font-bold">{s.onTimeDispatch} %</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00]" />
          </div>
        </button>
      ))}
    </div>
  );
}
