"use client";

import { useEffect, useState } from "react";
import {
  Users, BadgeCheck, FolderTree, Image as ImageIcon, Percent,
  ShieldAlert, BarChart3, LogOut, Plus, Check, X, ChevronRight,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useApp } from "@/lib/store";
import { formatPrice, type SupplierT, type CategoryNode } from "@/lib/format";

type Tab =
  | "users" | "suppliers" | "categories" | "banners"
  | "commissions" | "disputes" | "reports";

const MOCK_USERS = [
  { id: "u1", name: "Kwame Mensah", email: "kwame@example.com", role: "BUYER", status: "active", joined: "Sep 14, 2024" },
  { id: "u2", name: "Wei Zhang", email: "wei@lumelec.cn", role: "SUPPLIER", status: "active", joined: "Aug 02, 2024" },
  { id: "u3", name: "Aya Kouassi", email: "aya@abidjan.ci", role: "BUYER", status: "active", joined: "Oct 21, 2024" },
  { id: "u4", name: "Priya Nair", email: "priya@indtex.in", role: "SUPPLIER", status: "pending", joined: "Oct 28, 2024" },
  { id: "u5", name: "Admin", email: "admin@benjaminbazaar.com", role: "ADMIN", status: "active", joined: "Jan 01, 2024" },
  { id: "u6", name: "Mehmet Yilmaz", email: "mehmet@istapp.tr", role: "SUPPLIER", status: "suspended", joined: "Mar 19, 2024" },
  { id: "u7", name: "John Owusu", email: "john@owusu.gh", role: "BUYER", status: "active", joined: "Jul 11, 2024" },
];

const MOCK_BANNERS = [
  { id: "b1", title: "Source for Christmas", placement: "Home hero", active: true, image: "https://picsum.photos/seed/benjamin-b1/120/60" },
  { id: "b2", title: "Trade Assurance promo", placement: "Home right", active: true, image: "https://picsum.photos/seed/benjamin-b2/120/60" },
  { id: "b3", title: "Top Ranking – Sneakers", placement: "Category page", active: false, image: "https://picsum.photos/seed/benjamin-b3/120/60" },
];

const MOCK_COMMISSIONS = [
  { id: "c1", order: "AB-2410-0182", supplier: "Shenzhen Lumelec Co.", amount: 1240, commission: 62, date: "Oct 18, 2025", status: "paid" },
  { id: "c2", order: "AB-2410-0145", supplier: "Kumasi Textiles Ltd.", amount: 540, commission: 27, date: "Oct 12, 2025", status: "paid" },
  { id: "c3", order: "AB-2409-0312", supplier: "Ivory Coast Cocoa", amount: 2890, commission: 144.5, date: "Sep 28, 2025", status: "paid" },
  { id: "c4", order: "AB-2410-0498", supplier: "Mumbai Garments", amount: 410, commission: 20.5, date: "Oct 08, 2025", status: "pending" },
];

const MOCK_DISPUTES = [
  { id: "d1", ticket: "DSP-2410-021", subject: "Wrong color received", parties: "Accra Trading vs Lumelec", opened: "Oct 19", status: "open", amount: 940 },
  { id: "d2", ticket: "DSP-2410-018", subject: "Late shipment refund", parties: "Lagos Imports vs Kumasi", opened: "Oct 16", status: "investigating", amount: 320 },
  { id: "d3", ticket: "DSP-2409-088", subject: "Quality dispute", parties: "Abidjan Dist. vs Mumbai", opened: "Sep 24", status: "resolved", amount: 1240 },
  { id: "d4", ticket: "DSP-2410-026", subject: "Item not as described", parties: "Cape Coast vs Istanbul", opened: "Oct 22", status: "open", amount: 580 },
];

export function AdminView() {
  const { user, signIn, signOut, setView, currency } = useApp();
  const [tab, setTab] = useState<Tab>("users");
  const [supplierCount, setSupplierCount] = useState<number | null>(null);
  const [productTotal, setProductTotal] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [s, p] = await Promise.all([
          fetch("/api/suppliers").then((r) => r.json()),
          fetch("/api/products?take=1&skip=0").then((r) => r.json()),
        ]);
        if (mounted) {
          setSupplierCount(Array.isArray(s) ? s.length : 0);
          setProductTotal((p as { total?: number }).total ?? 0);
        }
      } catch {
        if (mounted) { setSupplierCount(0); setProductTotal(0); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="bg-[#ECECEC] min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border border-[#DADAD9] max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-10 h-10 mx-auto text-[#FF6A00]" />
          <h2 className="text-[18px] font-bold mt-3">Admin access required</h2>
          <p className="text-[12px] text-[#666] mt-1.5">
            This area is restricted to BENJAMINBAZAAR administrators.
          </p>
          <button
            onClick={() => { signIn("Admin", "admin@benjaminbazaar.com", "ADMIN"); toast.success("Welcome, Admin"); }}
            className="btn-benjamin-orange mt-5 w-full"
          >
            Sign in as admin
          </button>
          <button onClick={() => setView("home")} className="benjamin-link text-[12px] mt-4 inline-block">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "users", label: "Users", icon: Users },
    { key: "suppliers", label: "Supplier Verification", icon: BadgeCheck },
    { key: "categories", label: "Categories", icon: FolderTree },
    { key: "banners", label: "Banners", icon: ImageIcon },
    { key: "commissions", label: "Commissions", icon: Percent },
    { key: "disputes", label: "Disputes", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: BarChart3 },
  ];

  const KPI = [
    { label: "Users", value: "1,284", accent: "#FF6A00" },
    { label: "Suppliers", value: supplierCount === null ? "…" : supplierCount.toString(), accent: "#FF6A00" },
    { label: "Products", value: productTotal === null ? "…" : productTotal.toString(), accent: "#FF6A00" },
    { label: "GMV (30d)", value: formatPrice(1_240_000, currency), accent: "#000" },
    { label: "Pending disputes", value: "12", accent: "#FF6A00" },
    { label: "Commissions", value: formatPrice(38_400, currency), accent: "#16A34A" },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">
      <Toaster position="top-center" richColors closeButton />

      <div className="benjamin-bar">Admin Console</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">BENJAMINBAZAAR · Control panel</div>
            <div className="text-[20px] font-extrabold">Hello, {user.name}</div>
          </div>
          <button
            onClick={() => { signOut(); setView("home"); toast.success("Signed out"); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {KPI.map((k) => (
            <div key={k.label} className="bg-white border border-[#DADAD9] p-4">
              <div className="text-[18px] lg:text-[22px] font-extrabold leading-none" style={{ color: k.accent }}>
                {k.value}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-[#666] font-bold mt-2">
                {k.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* sidebar */}
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
                    <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* content */}
          <section className="bg-white border border-[#DADAD9] min-h-[400px]">
            {tab === "users" && <UsersTab />}
            {tab === "suppliers" && <SuppliersTab />}
            {tab === "categories" && <CategoriesTab />}
            {tab === "banners" && <BannersTab />}
            {tab === "commissions" && <CommissionsTab />}
            {tab === "disputes" && <DisputesTab />}
            {tab === "reports" && <ReportsTab />}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-[#16A34A]",
    pending: "bg-[#FF6A00]",
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
      {status}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    BUYER: "bg-[#337AB7]",
    SUPPLIER: "bg-[#FF6A00]",
    ADMIN: "bg-[#000]",
  };
  return (
    <span className={`${map[role] || "bg-[#999]"} text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wide`}>
      {role}
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

function UsersTab() {
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Users</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{MOCK_USERS.length} shown · 1,284 total</p>
        </div>
        <button onClick={() => toast.info("Opening user form")} className="btn-outline-grey text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add user
        </button>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[720px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">User</th>
              <th className="text-left px-4 py-2.5 font-bold">Role</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
              <th className="text-left px-4 py-2.5 font-bold">Joined</th>
              <th className="text-right px-4 py-2.5 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map((u) => (
              <tr key={u.id} className="border-b border-[#ECECEC] hover:bg-[#FAFAFA]">
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.name}</div>
                  <div className="text-[10px] text-[#888]">{u.email}</div>
                </td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3 text-center"><StatusPill status={u.status} /></td>
                <td className="px-4 py-3 text-[#666]">{u.joined}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => toast.info("Edit user")} className="benjamin-link text-[12px]">Edit</button>
                  <button
                    onClick={() => toast.success(u.status === "suspended" ? "User activated" : "User suspended")}
                    className="benjamin-link text-[12px]"
                  >
                    {u.status === "suspended" ? "Activate" : "Suspend"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<SupplierT[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/suppliers");
        const d = (await r.json()) as SupplierT[];
        if (mounted) setSuppliers(d);
      } catch {
        if (mounted) setSuppliers([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Supplier Verification</h3>
        <p className="text-[11px] text-[#888] mt-0.5">Approve or reject supplier applications</p>
      </div>
      {suppliers === null ? (
        <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {suppliers.map((s) => (
            <li key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="w-10 h-10 bg-[#ECECEC] flex items-center justify-center font-bold text-[13px] text-[#FF6A00] shrink-0">
                {s.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] truncate">{s.name}</span>
                  <StatusPill status={s.verified ? "verified" : "unverified"} />
                </div>
                <div className="text-[11px] text-[#888] mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{s.city}, {s.country}</span>
                  <span>{s.years} yrs</span>
                  <span>★ {s.storeRating.toFixed(1)}</span>
                  <span>Certs: {s.certifications.length}</span>
                  <span>{s.productCount ?? 0} products</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toast.success(`${s.name} verified`)}
                  className="inline-flex items-center gap-1 bg-[#16A34A] text-white text-[11px] font-bold uppercase px-3 py-2 hover:opacity-85"
                >
                  <Check className="w-3.5 h-3.5" /> Verify
                </button>
                <button
                  onClick={() => toast.error(`${s.name} rejected`)}
                  className="inline-flex items-center gap-1 bg-[#FF6A00] text-white text-[11px] font-bold uppercase px-3 py-2 hover:opacity-85"
                >
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
          <h3 className="benjamin-section-title">Categories</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{cats?.length ?? "—"} top-level · {cats?.reduce((n, c) => n + (c.children?.length ?? 0), 0) ?? 0} sub</p>
        </div>
        <button onClick={() => toast.info("Opening category form")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add category
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
                  <span className="text-[10px] text-[#888]">{c.children?.length ?? 0} sub</span>
                </div>
                <button
                  onClick={() => toast.info("Add subcategory to " + c.name)}
                  className="btn-outline-grey text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Sub
                </button>
              </div>
              {c.children && c.children.length > 0 && (
                <ul className="pl-6 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  {c.children.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className="text-[#444]">· {s.name}</span>
                      <button onClick={() => toast.info("Edit " + s.name)} className="benjamin-link text-[11px]">Edit</button>
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

function BannersTab() {
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Banners</h3>
          <p className="text-[11px] text-[#888] mt-0.5">{MOCK_BANNERS.length} banners · {MOCK_BANNERS.filter((b) => b.active).length} active</p>
        </div>
        <button onClick={() => toast.info("Opening banner form")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add banner
        </button>
      </div>
      <ul className="divide-y divide-[#ECECEC]">
        {MOCK_BANNERS.map((b) => (
          <li key={b.id} className="p-4 flex items-center gap-4">
            <img src={b.image} alt={b.title} className="w-24 h-12 object-cover border border-[#ECECEC]" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] truncate">{b.title}</div>
              <div className="text-[11px] text-[#888] mt-0.5">Placement: {b.placement}</div>
            </div>
            <StatusPill status={b.active ? "active" : "pending"} />
            <div className="flex gap-2">
              <button onClick={() => toast.info("Edit banner")} className="benjamin-link text-[12px]">Edit</button>
              <button
                onClick={() => toast.success(b.active ? "Banner disabled" : "Banner enabled")}
                className="benjamin-link text-[12px]"
              >
                {b.active ? "Disable" : "Enable"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommissionsTab() {
  const currency = useApp((s) => s.currency);
  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC]">
        <h3 className="benjamin-section-title">Commission earnings</h3>
        <p className="text-[11px] text-[#888] mt-0.5">5% of every paid order · 30-day window</p>
      </div>
      <div className="overflow-x-auto benjamin-scroll">
        <table className="w-full text-[12px] min-w-[640px]">
          <thead className="bg-[#ECECEC] text-[#666] uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-4 py-2.5 font-bold">Order</th>
              <th className="text-left px-4 py-2.5 font-bold">Supplier</th>
              <th className="text-right px-4 py-2.5 font-bold">Order value</th>
              <th className="text-right px-4 py-2.5 font-bold">Commission (5%)</th>
              <th className="text-left px-4 py-2.5 font-bold">Date</th>
              <th className="text-center px-4 py-2.5 font-bold">Status</th>
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
        <h3 className="benjamin-section-title">Dispute tickets</h3>
        <p className="text-[11px] text-[#888] mt-0.5">{MOCK_DISPUTES.filter((d) => d.status !== "resolved").length} unresolved · {MOCK_DISPUTES.length} total</p>
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
                <span>· Opened {d.opened}</span>
              </div>
            </div>
            <div className="text-right md:w-32">
              <div className="text-[10px] uppercase tracking-wide text-[#888]">In dispute</div>
              <div className="font-extrabold text-[#FF6A00] text-[15px]">{formatPrice(d.amount, currency)}</div>
            </div>
            <button onClick={() => toast.info("Opening " + d.ticket)} className="btn-outline-grey text-[11px]">Open</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportsTab() {
  const { currency } = useApp();
  const topCats = [
    { name: "Apparel & Textiles", gmv: 184_000, share: 22 },
    { name: "Electronics", gmv: 142_500, share: 17 },
    { name: "Beauty & Personal Care", gmv: 98_200, share: 12 },
    { name: "Home & Garden", gmv: 84_400, share: 10 },
    { name: "Renewable Energy", gmv: 76_800, share: 9 },
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
        <h3 className="benjamin-section-title">Reports & Insights</h3>
        <p className="text-[11px] text-[#888] mt-0.5">30-day snapshot · {formatPrice(826_400, currency)} total GMV</p>
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* top categories */}
        <div className="border border-[#DADAD9]">
          <div className="benjamin-bar-red text-[12px]">Top categories</div>
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
          <div className="benjamin-bar-red text-[12px]">Top suppliers</div>
          <ul className="divide-y divide-[#ECECEC]">
            {topSuppliers.map((s, i) => (
              <li key={s.name} className="p-3 flex items-center gap-3">
                <span className="w-6 text-center font-extrabold text-[#000]">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[12px] truncate">{s.name}</div>
                  <div className="text-[11px] text-[#888]">{s.orders} orders</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-[#888]">GMV</div>
                  <div className="font-extrabold text-[#16A34A] text-[14px]">{formatPrice(s.gmv, currency)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* numeric blocks */}
        <div className="border border-[#DADAD9] p-4 lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Avg. order value" value={formatPrice(612, currency)} />
          <Stat label="Conversion rate" value="3.8%" />
          <Stat label="Reorder rate" value="42%" />
          <Stat label="Trade Assurance coverage" value="91%" />
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
