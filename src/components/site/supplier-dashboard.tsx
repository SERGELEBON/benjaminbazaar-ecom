"use client";

import { useEffect, useState } from "react";
import {
  Package, ShoppingCart, FileText, Store, Wallet, BadgeCheck, LogOut, ChevronRight, MessageCircle,
  ExternalLink, Clock, Construction,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { ShopSettings } from "./merchant/merchant-onboarding";
import { ProductManager } from "./merchant/product-manager";

type Tab = "products" | "store" | "orders" | "quotes" | "payouts" | "verification";

/**
 * Merchant space (approved shops only — see <RequireAuth requireApprovedSupplier>).
 * Every figure shown here is real: the shop's own products, unread messages and
 * review status. Modules not built yet say so instead of showing sample data.
 */
export function SupplierDashboard() {
  const { user, signOut, setView, setSupplierId, chatUnread } = useApp();
  const [tab, setTab] = useState<Tab>("products");
  const [total, setTotal] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const shopId = user?.supplier?.id;
  const shopApproved = user?.supplier?.status === "approved";

  useEffect(() => {
    if (!shopId || !shopApproved) return;
    let mounted = true;
    fetch("/api/merchant/products?status=published", { cache: "no-store", credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => mounted && setTotal(d.counts?.published ?? 0))
      .catch(() => mounted && setTotal(0));
    return () => {
      mounted = false;
    };
  }, [shopId, shopApproved, reload]);

  if (!user) return null; // guarded by <RequireAuth>
  const shop = user.supplier;
  if (!shop) {
    return (
      <div className="bg-[#ECECEC] min-h-[60vh] flex items-center justify-center px-4 py-10">
        <div className="bg-white border border-[#DADAD9] max-w-md w-full p-8 text-center">
          <Store className="w-10 h-10 mx-auto text-[#1A1F8A]" />
          <h2 className="text-[18px] font-bold mt-3">Aucune boutique sur ce compte</h2>
          <p className="text-[13px] text-[#666] mt-1.5">Les boutiques des marchands se gèrent depuis la console d&apos;administration.</p>
          <button onClick={() => setView("admin")} className="btn-square-black mt-5 w-full">Ouvrir la console admin</button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Package; soon?: boolean }[] = [
    { key: "products", label: "Mes produits", icon: Package },
    { key: "store", label: "Ma boutique", icon: Store },
    { key: "verification", label: "Vérification", icon: BadgeCheck },
    { key: "orders", label: "Commandes", icon: ShoppingCart, soon: true },
    { key: "quotes", label: "Devis (RFQ)", icon: FileText, soon: true },
    { key: "payouts", label: "Paiements", icon: Wallet, soon: true },
  ];

  const KPI = [
    { label: "Produits en ligne", value: total === null ? "…" : String(total) },
    { label: "Messages non lus", value: String(chatUnread), onClick: () => setView("chat") },
    { label: "Statut boutique", value: "En ligne" },
    { label: "Membre depuis", value: new Date(shop.createdAt).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <div className="benjamin-bar">Espace marchand</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">Espace marchand</div>
            <div className="text-[20px] font-extrabold">Bonjour, {user.name ?? user.email}</div>
            {shop && (
              <button
                onClick={() => { setSupplierId(shop.id); setView("supplier"); }}
                className="text-[12px] text-[#1A1F8A] font-semibold inline-flex items-center gap-1 hover:underline"
              >
                {shop.name} <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={async () => { await signOut(); toast.success("Vous êtes déconnecté."); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {KPI.map((k) => (
            <button
              key={k.label}
              onClick={k.onClick}
              disabled={!k.onClick}
              className="bg-white border border-[#DADAD9] p-4 text-left hover:border-[#1A1F8A] disabled:hover:border-[#DADAD9] disabled:cursor-default"
            >
              <div className="text-[20px] lg:text-[24px] font-extrabold text-[#FF6A00] leading-none">{k.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-[#666] font-bold mt-2">{k.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          <aside>
            <div className="flex lg:flex-col gap-0 overflow-x-auto benjamin-scroll -mx-3 px-3 lg:mx-0 lg:px-0">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`benjamin-tile whitespace-nowrap shrink-0 lg:w-full ${tab === t.key ? "active" : ""}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{t.label}</span>
                    {t.soon ? <span className="text-[9px] uppercase font-bold opacity-70">bientôt</span> : <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />}
                  </button>
                );
              })}
              <button onClick={() => setView("chat")} className="benjamin-tile whitespace-nowrap shrink-0 lg:w-full">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Messages</span>
                {chatUnread > 0 && (
                  <span className="bg-[#FF6A00] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />
              </button>
            </div>
          </aside>

          <section className="bg-white border border-[#DADAD9] min-h-[400px] min-w-0">
            {tab === "products" && <ProductManager onChanged={() => setReload((n) => n + 1)} />}
            {tab === "store" && (
              <div>
                <Header title="Ma boutique" subtitle="Ces informations sont visibles par les acheteurs sur votre page boutique." />
                <div className="p-4 max-w-2xl">{shop ? <ShopSettings shop={shop} /> : <p className="text-[13px] text-[#666]">Aucune boutique liée à ce compte.</p>}</div>
              </div>
            )}
            {tab === "verification" && shop && (
              <div>
                <Header title="Vérification" subtitle="Statut de validation de votre boutique par l'équipe." />
                <div className="p-4 space-y-3 text-[13px]">
                  <div className="flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-[#16A34A]" /> <b>Boutique validée</b> — visible par tous les acheteurs.</div>
                  {shop.reviewedAt && (
                    <div className="flex items-center gap-2 text-[#555]"><Clock className="w-4 h-4" /> Validée le {new Date(shop.reviewedAt).toLocaleDateString("fr-FR")}</div>
                  )}
                  <p className="text-[12px] text-[#666]">Gardez vos informations à jour dans « Ma boutique ». En cas de manquement aux conditions d&apos;utilisation, la boutique peut être suspendue.</p>
                </div>
              </div>
            )}
            {(tab === "orders" || tab === "quotes" || tab === "payouts") && (
              <ComingSoon
                title={{ orders: "Commandes", quotes: "Devis (RFQ)", payouts: "Paiements" }[tab]}
                text={{
                  orders: "Les commandes passées sur vos produits apparaîtront ici avec leur statut de livraison.",
                  quotes: "Vous pourrez répondre aux demandes de devis des acheteurs depuis cet onglet.",
                  payouts: "Le suivi de vos encaissements (Mobile Money, virement) arrivera avec le paiement en ligne.",
                }[tab]}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-4 border-b border-[#ECECEC]">
      <h3 className="benjamin-section-title">{title}</h3>
      {subtitle && <p className="text-[11px] text-[#888] mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <Header title={title} />
      <div className="p-10 text-center text-[13px] text-[#666] max-w-md mx-auto">
        <Construction className="w-9 h-9 mx-auto text-[#DADAD9] mb-3" />
        <p className="font-semibold text-[#333]">Module en préparation</p>
        <p className="mt-1">{text}</p>
      </div>
    </div>
  );
}
