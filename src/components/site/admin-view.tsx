"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, BadgeCheck, FolderTree, Image as ImageIcon, Percent,
  ShieldAlert, BarChart3, LogOut, Plus, ChevronRight, Crown, History, Package, ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, useDashboardTab } from "@/lib/store";
import { OrdersPanel } from "./orders/orders-panel";
import { formatPrice, type CategoryNode } from "@/lib/format";
import { BRAND } from "@/lib/brand";
import { MerchantsTab } from "./admin/merchants-tab";
import { UsersTab } from "./admin/users-tab";
import { ProductsTab } from "./admin/products-tab";
import { TeamTab } from "./admin/team-tab";
import { AuditTab } from "./admin/audit-tab";
import { useAutoRefresh } from "./admin/shared";
import { HomeSettingsTab } from "./admin/home-settings-tab";

type Tab =
  | "users" | "suppliers" | "products" | "orders" | "team" | "audit" | "categories" | "home"
  | "commissions" | "disputes" | "reports";
const TABS: readonly Tab[] = ["users", "suppliers", "products", "orders", "team", "audit", "categories", "home", "commissions", "disputes", "reports"];


const MOCK_COMMISSIONS = [
  { id: "c1", order: "AB-2410-0182", supplier: "Shenzhen Lumelec Co.", amount: 1240, commission: 62, date: "18 oct. 2025", status: "paid" },
  { id: "c2", order: "AB-2410-0145", supplier: "Kumasi Textiles Ltd.", amount: 540, commission: 27, date: "12 oct. 2025", status: "paid" },
  { id: "c3", order: "AB-2409-0312", supplier: "Ivory Coast Cocoa", amount: 2890, commission: 144.5, date: "28 sept. 2025", status: "paid" },
  { id: "c4", order: "AB-2410-0498", supplier: "Mumbai Garments", amount: 410, commission: 20.5, date: "8 oct. 2025", status: "pending" },
];

const MOCK_DISPUTES = [
  { id: "d1", ticket: "DSP-2410-021", subject: "Mauvaise couleur reçue", parties: "Accra Trading / Lumelec", opened: "19 oct.", status: "open", amount: 940 },
  { id: "d2", ticket: "DSP-2410-018", subject: "Remboursement pour retard", parties: "Lagos Imports / Kumasi", opened: "16 oct.", status: "investigating", amount: 320 },
  { id: "d3", ticket: "DSP-2409-088", subject: "Litige qualité", parties: "Abidjan Dist. / Mumbai", opened: "24 sept.", status: "resolved", amount: 1240 },
  { id: "d4", ticket: "DSP-2410-026", subject: "Article non conforme", parties: "Cape Coast / Istanbul", opened: "22 oct.", status: "open", amount: 580 },
];

export function AdminView() {
  const { user, signOut } = useApp();
  const [tab, setTab] = useDashboardTab<Tab>("suppliers", TABS);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as Stats;
      setStats(d);
      setPending(d.pendingMerchants);
    } catch {
      /* keep last values */
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void loadStats(), 0);
    return () => clearTimeout(t);
  }, [loadStats]);
  useAutoRefresh(() => void loadStats(), 30_000);

  if (!user) return null; // guarded by <RequireAuth roles={["ADMIN"]}>
  const isSuper = user.isSuperAdmin;

  type TabDef = { key: Tab; label: string; icon: typeof Users; badge?: number | null; superOnly?: boolean };
  const allTabs: TabDef[] = [
    { key: "suppliers", label: "Validation marchands", icon: BadgeCheck, badge: pending },
    { key: "products", label: "Produits", icon: Package },
    { key: "orders", label: "Commandes", icon: ShoppingCart },
    { key: "users", label: "Utilisateurs", icon: Users },
    { key: "team", label: "Administrateurs", icon: Crown, superOnly: true },
    { key: "audit", label: "Journal", icon: History, superOnly: true },
    { key: "categories", label: "Catégories", icon: FolderTree },
    { key: "home", label: "Page d'accueil", icon: ImageIcon, superOnly: true },
    { key: "commissions", label: "Commissions (démo)", icon: Percent },
    { key: "disputes", label: "Litiges (démo)", icon: ShieldAlert },
    { key: "reports", label: "Rapports (démo)", icon: BarChart3 },
  ];
  const tabs = allTabs.filter((t) => !t.superOnly || isSuper);

  const v = (n: number | undefined) => (stats ? String(n ?? 0) : "…");
  const KPI = [
    { label: "Comptes", value: v(stats?.users), accent: "#1A1F8A", go: "users" as Tab },
    { label: "Clients", value: v(stats?.buyers), accent: "#337AB7", go: "users" as Tab },
    { label: "Marchands", value: v(stats?.merchants), accent: "#FF6A00", go: "users" as Tab },
    { label: "En attente de validation", value: v(stats?.pendingMerchants), accent: stats?.pendingMerchants ? "#DC2626" : "#16A34A", go: "suppliers" as Tab },
    { label: "Boutiques en ligne", value: v(stats?.publicShops), accent: "#16A34A", go: "suppliers" as Tab },
    { label: "Produits en ligne", value: v(stats?.products), accent: "#0A0F4D", go: "products" as Tab },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <div className="benjamin-bar">Console d&apos;administration</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">
              {BRAND.shortName} · {isSuper ? "Super administrateur" : "Administrateur"}
            </div>
            <div className="text-[20px] font-extrabold">Bonjour, {user.name ?? user.email}</div>
          </div>
          <button
            onClick={async () => { await signOut(); toast.success("Vous êtes déconnecté."); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {KPI.map((k) => (
            <button
              key={k.label}
              onClick={() => k.go && setTab(k.go)}
              disabled={!k.go}
              className="bg-white border border-[#DADAD9] p-4 text-left hover:border-[#1A1F8A] disabled:hover:border-[#DADAD9] disabled:cursor-default"
            >
              <div className="text-[20px] lg:text-[24px] font-extrabold leading-none" style={{ color: k.accent }}>{k.value}</div>
              <div className="text-[10px] uppercase tracking-wide text-[#666] font-bold mt-2">{k.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5">
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
                    {t.badge ? (
                      <span className="bg-[#FF6A00] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center">{t.badge}</span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white border border-[#DADAD9] min-h-[400px] min-w-0">
            {tab === "suppliers" && <MerchantsTab onCountsChange={setPending} />}
            {tab === "products" && <ProductsTab />}
            {tab === "orders" && <OrdersPanel scope="admin" />}
            {tab === "users" && <UsersTab />}
            {tab === "team" && isSuper && <TeamTab />}
            {tab === "audit" && isSuper && <AuditTab />}
            {tab === "categories" && <CategoriesTab />}
            {tab === "home" && isSuper && <HomeSettingsTab />}
            {tab === "commissions" && <CommissionsTab />}
            {tab === "disputes" && <DisputesTab />}
            {tab === "reports" && <ReportsTab />}
          </section>
        </div>
      </div>
    </div>
  );
}

type Stats = {
  users: number; buyers: number; merchants: number; admins: number;
  pendingMerchants: number; publicShops: number; products: number;
};

const STATUS_FR: Record<string, string> = {
  active: "Actif", pending: "En attente", approved: "Validé", rejected: "Refusé", suspended: "Suspendu",
  open: "Ouvert", investigating: "En cours", resolved: "Résolu", paid: "Payé", verified: "Vérifié", unverified: "Non vérifié",
};

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-[#16A34A]",
    pending: "bg-[#FF6A00]",
    approved: "bg-[#16A34A]",
    rejected: "bg-[#DC2626]",
    suspended: "bg-[#333]",
    open: "bg-[#FF6A00]",
    investigating: "bg-[#337AB7]",
    resolved: "bg-[#16A34A]",
    paid: "bg-[#16A34A]",
    verified: "bg-[#16A34A]",
    unverified: "bg-[#999]",
  };
  return (
    <span className={`${map[status] || "bg-[#999]"} text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wide`}>
      {STATUS_FR[status] ?? status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-[#ECECEC]">
      <div className="w-9 h-9 bg-[#ECECEC] animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#ECECEC] animate-pulse w-1/2" />
        <div className="h-2.5 bg-[#ECECEC] animate-pulse w-1/3" />
      </div>
    </div>
  );
}

function CategoriesTab() {
  const [cats, setCats] = useState<CategoryNode[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/categories");
        const d = (await r.json()) as CategoryNode[];
        if (mounted) setCats(d);
      } catch {
        if (mounted) setCats([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Catégories</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{cats?.length ?? "—"} principales · {cats?.reduce((n, c) => n + (c.children?.length ?? 0), 0) ?? 0} sous-catégories</p>
        </div>
        <button onClick={() => toast.info("Gestion des catégories bientôt disponible")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Ajouter une catégorie
        </button>
      </div>
      {cats === null ? (
        <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : (
        <div className="p-3 max-h-[640px] overflow-y-auto benjamin-scroll">
          {cats.map((c) => (
            <div key={c.id} className="border-b border-[#ECECEC] last:border-b-0 py-2">
              <div className="flex items-center justify-between gap-2 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00] rotate-90 shrink-0" />
                  <span className="font-bold text-[13px] truncate">{c.name}</span>
                  <span className="text-[10px] text-[#888]">{c.children?.length ?? 0} sous-cat.</span>
                </div>
                <button
                  onClick={() => toast.info("Gestion des catégories bientôt disponible")}
                  className="btn-outline-grey text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Sous-catégorie
                </button>
              </div>
              {c.children && c.children.length > 0 && (
                <ul className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  {c.children.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className="text-[#444]">· {s.name}</span>
                      <button onClick={() => toast.info("Gestion des catégories bientôt disponible")} className="benjamin-link text-[11px]">Modifier</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommissionsTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Commissions (données de démonstration)</h3>
        <p className="text-[11px] text-[#888] mt-0.5">5 % de chaque commande payée · 30 derniers jours</p>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Commande</th>
              <th className="text-left px-4 py-2.5 font-bold">Boutique</th>
              <th className="text-right px-4 py-2.5 font-bold">Montant</th>
              <th className="text-right px-4 py-2.5 font-bold">Commission (5 %)</th>
              <th className="text-left px-4 py-2.5 font-bold">Date</th>
              <th className="text-center px-4 py-2.5 font-bold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_COMMISSIONS.map((c) => (
              <tr key={c.id} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-semibold text-[#337AB7]">{c.order}</td>
                <td className="px-4 py-3">{c.supplier}</td>
                <td className="px-4 py-3 text-right">{formatPrice(c.amount, currency)}</td>
                <td className="px-4 py-3 text-right font-bold text-[#16A34A]">{formatPrice(c.commission, currency)}</td>
                <td className="px-4 py-3 text-[#666]">{c.date}</td>
                <td className="px-4 py-3 text-center"><StatusPill status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DisputesTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Litiges (données de démonstration)</h3>
        <p className="text-[11px] text-[#888] mt-0.5">{MOCK_DISPUTES.filter((d) => d.status !== "resolved").length} non résolus · {MOCK_DISPUTES.length} au total</p>
      </div>
      <ul className="divide-y divide-[#ECECEC]">
        {MOCK_DISPUTES.map((d) => (
          <li key={d.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[13px]">{d.subject}</span>
                <StatusPill status={d.status} />
              </div>
              <div className="text-[11px] text-[#888] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{d.ticket}</span>
                <span>· {d.parties}</span>
                <span>· Ouvert le {d.opened}</span>
              </div>
            </div>
            <div className="text-right md:w-32">
              <div className="text-[10px] uppercase tracking-wide text-[#888]">Montant en litige</div>
              <div className="font-extrabold text-[#FF6A00] text-[15px]">{formatPrice(d.amount, currency)}</div>
            </div>
            <button onClick={() => toast.info("Gestion des litiges bientôt disponible")} className="btn-outline-grey text-[11px]">Ouvrir</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportsTab() {
  const { currency } = useApp();
  const topCats = [
    { name: "Vêtements & textile", gmv: 184_000, share: 22 },
    { name: "Électronique", gmv: 142_500, share: 17 },
    { name: "Beauté & soins", gmv: 98_200, share: 12 },
    { name: "Maison & jardin", gmv: 84_400, share: 10 },
    { name: "Énergies renouvelables", gmv: 76_800, share: 9 },
  ];
  const topSuppliers = [
    { name: "Shenzhen Lumelec Co.", orders: 412, gmv: 88_400 },
    { name: "Ivory Coast Cocoa", orders: 281, gmv: 64_200 },
    { name: "Kumasi Textiles Ltd.", orders: 198, gmv: 41_900 },
    { name: "Mumbai Garments", orders: 142, gmv: 32_400 },
  ];
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Rapports (données de démonstration)</h3>
        <p className="text-[11px] text-[#888] mt-0.5">30 derniers jours · {formatPrice(826_400, currency)} de volume d&apos;affaires</p>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* top categories */}
        <div className="border border-[#DADAD9]">
          <div className="benjamin-bar-red text-[12px]">Meilleures catégories</div>
          <ul className="divide-y divide-[#ECECEC]">
            {topCats.map((c, i) => (
              <li key={c.name} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center font-extrabold text-[#FF6A00]">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold truncate">{c.name}</span>
                    <span className="font-bold text-[#FF6A00]">{formatPrice(c.gmv, currency)}</span>
                  </div>
                  <div className="mt-1 h-2 bg-[#ECECEC]">
                    <div className="h-full bg-[#FF6A00]" style={{ width: `${c.share * 4}%` }} />
                  </div>
                </div>
                <span className="text-[11px] text-[#888] w-9 text-right">{c.share}%</span>
              </li>
            ))}
          </ul>
        </div>

        {/* top suppliers */}
        <div className="border border-[#DADAD9]">
          <div className="benjamin-bar-red text-[12px]">Meilleures boutiques</div>
          <ul className="divide-y divide-[#ECECEC]">
            {topSuppliers.map((s, i) => (
              <li key={s.name} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center font-extrabold text-[#000]">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[12px] truncate">{s.name}</div>
                  <div className="text-[11px] text-[#888]">{s.orders} commandes</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-[#888]">Volume</div>
                  <div className="font-extrabold text-[#16A34A] text-[14px]">{formatPrice(s.gmv, currency)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* numeric blocks */}
        <div className="border border-[#DADAD9] p-4 lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Panier moyen" value={formatPrice(612, currency)} />
          <Stat label="Taux de conversion" value="3,8 %" />
          <Stat label="Taux de recommande" value="42 %" />
          <Stat label="Commandes protégées" value="91 %" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[20px] font-extrabold text-[#FF6A00]">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-[#666] font-bold mt-1">{label}</div>
    </div>
  );
}
