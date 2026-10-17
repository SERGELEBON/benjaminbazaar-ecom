"use client";

import { useEffect, useState } from "react";
import {
  Package, FileText, Heart, MapPin, User as UserIcon, LogOut, Plus,
  Trash2, Pencil, Star, ChevronRight, Truck, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { formatPrice, type ProductT, type Currency } from "@/lib/format";
import { AddressesPanel, FavoritesPanel, OrdersPlaceholder } from "./client/client-panels";

type Tab = "orders" | "rfqs" | "favorites" | "addresses" | "account";

interface Rfq {
  id: string;
  title: string;
  category: string;
  quantity: string;
  unit: string;
  budget: string | null;
  details: string;
  status: string;
  createdAt: string;
  quotes: unknown[];
}

export function BuyerDashboard() {
  const { user, signOut, currency, setCurrency } = useApp();
  const [tab, setTab] = useState<Tab>("orders");

  if (!user) return null; // guarded by <RequireAuth>


  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "orders", label: "Commandes", icon: Package },
    { key: "rfqs", label: "Demandes de devis", icon: FileText },
    { key: "favorites", label: "Favoris", icon: Heart },
    { key: "addresses", label: "Adresses", icon: MapPin },
    { key: "account", label: "Mon compte", icon: UserIcon },
  ];

  return (
    <div className="bg-[#ECECEC] min-h-screen">

      {/* top bar */}
      <div className="benjamin-bar">Mon espace client</div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-5">
        {/* greeting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-[#666]">Espace client</div>
            <div className="text-[20px] font-extrabold">Bonjour, {user.name ?? user.email}</div>
          </div>
          <button
            onClick={async () => { await signOut(); toast.success("Vous êtes déconnecté."); }}
            className="btn-outline-grey flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* sidebar (vertical on desktop, horizontal scroll on mobile) */}
          <aside className="lg:block">
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
                    <ChevronRight className="w-3.5 h-3.5 lg:block hidden" />
                  </button>
                );
              })}
            </div>
          </aside>

          {/* content */}
          <section className="bg-white border border-[#DADAD9] min-h-[400px]">
            {tab === "orders" && <OrdersPlaceholder />}
            {tab === "rfqs" && <RfqsTab />}
            {tab === "favorites" && <FavoritesPanel />}
            {tab === "addresses" && <AddressesPanel />}
            {tab === "account" && <AccountTab currency={currency} setCurrency={setCurrency} />}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: "bg-[#16A34A]",
    shipped: "bg-[#337AB7]",
    paid: "bg-[#FF6A00]",
    pending: "bg-[#999]",
    cancelled: "bg-[#333]",
    open: "bg-[#337AB7]",
    closed: "bg-[#999]",
    paid_out: "bg-[#16A34A]",
    pending_payout: "bg-[#FF6A00]",
  };
  return (
    <span className={`${map[status] || "bg-[#999]"} text-white text-[10px] font-bold uppercase px-2 py-0.5 tracking-wide`}>
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-[#ECECEC]">
      <div className="w-10 h-10 bg-[#ECECEC] animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-[#ECECEC] animate-pulse w-1/2" />
        <div className="h-2.5 bg-[#ECECEC] animate-pulse w-1/3" />
      </div>
    </div>
  );
}

function RfqsTab() {
  const { setView } = useApp();
  const [rfqs, setRfqs] = useState<Rfq[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/rfq");
        const d = (await r.json()) as Rfq[];
        if (mounted) setRfqs(Array.isArray(d) ? d : []);
      } catch {
        if (mounted) setRfqs([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center justify-between">
        <div>
          <h3 className="benjamin-section-title">Inquiries / RFQs</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Request quotations from verified suppliers</p>
        </div>
        <button onClick={() => setView("rfq")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New RFQ
        </button>
      </div>

      {rfqs === null ? (
        <div className="p-4 space-y-2">
          {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : rfqs.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="w-10 h-10 mx-auto text-[#DADAD9]" />
          <p className="text-[13px] mt-2 text-[#666]">No RFQs yet.</p>
          <button onClick={() => setView("rfq")} className="btn-benjamin-orange mt-4">Submit your first RFQ</button>
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {rfqs.map((r) => (
            <li key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-[#FAFAFA]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px] truncate">{r.title}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-[#888] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Category: {r.category}</span>
                  <span>Qty: {r.quantity} {r.unit}</span>
                  {r.budget && <span>Budget: {r.budget}</span>}
                  <span>Created {new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.details && <p className="text-[12px] text-[#555] mt-1 line-clamp-2">{r.details}</p>}
              </div>
              <div className="text-right md:w-44">
                <div className="text-[11px] text-[#888] uppercase tracking-wide">Quotes</div>
                <div className="text-[22px] font-extrabold text-[#FF6A00]">{r.quotes.length}</div>
                <button onClick={() => toast.info("Viewing quotes")} className="benjamin-link text-[12px]">View quotes →</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountTab({
  currency, setCurrency,
}: {
  currency: Currency;
  setCurrency: (c: Currency) => void;
}) {
  const { user, setSession } = useApp();
  const [name, setName] = useState(user?.name ?? "");
  const email = user?.email ?? "";
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSession(d.user);
      toast.success("Profil enregistré.");
    } catch {
      toast.error("Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <h3 className="benjamin-section-title mb-3">Mon compte</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Nom complet</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Email (identifiant)</label>
          <input value={email} readOnly className="w-full border border-[#DADAD9] bg-[#F5F5F5] text-[#666] px-3 py-2 text-[13px] outline-none" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-[#666] mb-1">Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 …" className="w-full border border-[#DADAD9] focus:border-[#FF6A00] px-3 py-2 text-[13px] outline-none" />
        </div>
      </div>

      <div className="mt-6 border-t border-[#ECECEC] pt-4">
        <div className="benjamin-section-title mb-2">Devise d&apos;affichage</div>
        <div className="flex flex-wrap gap-2">
          {(["GHS", "XOF", "USD"] as Currency[]).map((c) => (
            <button
              key={c}
              onClick={() => { setCurrency(c); toast.success(`Devise : ${c}`); }}
              className={`px-4 py-2 text-[12px] font-bold border ${
                currency === c
                  ? "bg-[#FF6A00] text-white border-[#FF6A00]"
                  : "bg-white text-[#666] border-[#DADAD9] hover:border-[#FF6A00]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={save} disabled={saving} className="btn-benjamin-orange disabled:opacity-60">{saving ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </div>
  );
}
