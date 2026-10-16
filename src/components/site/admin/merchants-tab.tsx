"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, Ban, RotateCcw, RefreshCw, Search, Phone, MapPin, Mail, Store, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Pill, ReasonDialog, SHOP_STATUS_LABEL, SkeletonRows, adminFetch, fmtDate, fmtDateTime, jsonInit, shopTone, useAutoRefresh,
} from "./shared";

type Status = "pending" | "approved" | "rejected" | "suspended";
type Merchant = {
  id: string; name: string; slug: string; city: string; country: string; phone: string | null;
  mainCategory: string | null; description: string | null;
  status: Status; statusReason: string | null; createdAt: string; reviewedAt: string | null;
  reviewedBy: { name: string | null; email: string } | null;
  user: { id: string; name: string | null; email: string; role: string; status: string; lastLoginAt: string | null };
  _count: { products: number };
};

const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Validées" },
  { key: "rejected", label: "Refusées" },
  { key: "suspended", label: "Suspendues" },
];

type Dialog = { merchant: Merchant; action: "rejected" | "suspended" } | null;

export function MerchantsTab({ onCountsChange }: { onCountsChange?: (pending: number) => void }) {
  const [status, setStatus] = useState<Status>("pending");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Merchant[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number>>({ pending: 0, approved: 0, rejected: 0, suspended: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ status });
      if (q.trim()) params.set("q", q.trim());
      const d = await adminFetch<{ suppliers: Merchant[]; counts: Record<Status, number> }>(`/api/admin/suppliers?${params}`);
      setItems(d.suppliers);
      setCounts(d.counts);
      onCountsChange?.(d.counts.pending);
    } catch (e) {
      toast.error((e as Error).message);
      setItems((x) => x ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [status, q, onCountsChange]);

  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useAutoRefresh(() => void load(), 30_000);

  async function decide(m: Merchant, next: Status, reason?: string) {
    setBusyId(m.id);
    try {
      await adminFetch(`/api/admin/suppliers/${m.id}`, jsonInit("PATCH", { status: next, reason }));
      const msg = {
        approved: `« ${m.name} » est validée et visible sur le site`,
        rejected: `Demande de « ${m.name} » refusée`,
        suspended: `« ${m.name} » est suspendue`,
        pending: `« ${m.name} » remise en attente`,
      }[next];
      toast.success(msg, { description: "Le marchand voit le nouveau statut dans son espace." });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="benjamin-section-title">Validation des marchands</h3>
            <p className="text-[11px] text-[#888] mt-0.5">Vérifiez les informations puis validez : la boutique devient visible immédiatement.</p>
          </div>
          <button onClick={() => void load()} disabled={refreshing} className="btn-outline-grey text-[11px] flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Actualiser
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex overflow-x-auto benjamin-scroll">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { if (t.key !== status) { setItems(null); setStatus(t.key); } }}
                className={`shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase border flex items-center gap-1.5 ${
                  status === t.key ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "bg-white text-[#666] border-[#DADAD9]"
                }`}
              >
                {t.label}
                <span className={`min-w-[18px] px-1 text-[10px] ${t.key === "pending" && counts.pending > 0 ? "bg-[#FF6A00] text-white" : status === t.key ? "bg-white/20" : "bg-[#ECECEC]"}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <label className="flex items-center border border-[#DADAD9] px-2 sm:ml-auto sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#888]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Boutique ou email" aria-label="Rechercher un marchand"
              className="flex-1 px-2 py-1.5 text-[12px] outline-none" />
          </label>
        </div>
      </div>

      {items === null ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-[#666]">
          <Store className="w-8 h-8 mx-auto text-[#DADAD9] mb-2" />
          {status === "pending" ? "Aucune demande en attente. Les nouvelles demandes apparaissent ici automatiquement." : "Aucun marchand dans cette liste."}
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {items.map((m) => {
            const incomplete = !m.phone;
            const ownerSuspended = m.user.status === "suspended";
            return (
              <li key={m.id} className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="w-11 h-11 bg-[#EEF0FF] flex items-center justify-center font-extrabold text-[13px] text-[#1A1F8A] shrink-0">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[14px]">{m.name}</span>
                      <Pill tone={shopTone(m.status)}>{SHOP_STATUS_LABEL[m.status]}</Pill>
                      {incomplete && <Pill tone="orange">Infos incomplètes</Pill>}
                      {ownerSuspended && <Pill tone="grey">Compte suspendu</Pill>}
                    </div>
                    <div className="text-[12px] text-[#555] mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1.5 min-w-0"><Mail className="w-3.5 h-3.5 text-[#888] shrink-0" /><span className="truncate">{m.user.name ?? "—"} · {m.user.email}</span></span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#888]" />{m.phone ?? <em className="text-[#B45309]">non renseigné</em>}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#888]" />{m.city}, {m.country}</span>
                      <span className="text-[#888]">{m.mainCategory ?? "Activité non précisée"} · {m._count.products} produit{m._count.products > 1 ? "s" : ""}</span>
                    </div>
                    {m.description && <p className="text-[12px] text-[#444] mt-2 line-clamp-3">{m.description}</p>}
                    <div className="text-[11px] text-[#888] mt-2">
                      Demande du {fmtDate(m.createdAt)}
                      {m.reviewedAt && <> · décision le {fmtDateTime(m.reviewedAt)}{m.reviewedBy ? ` par ${m.reviewedBy.name ?? m.reviewedBy.email}` : ""}</>}
                    </div>
                    {m.statusReason && (m.status === "rejected" || m.status === "suspended") && (
                      <p className="mt-2 text-[12px] bg-[#FEF2F2] border-l-[3px] border-[#DC2626] px-2.5 py-1.5 flex gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" /> {m.statusReason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:w-40">
                    {(m.status === "pending" || m.status === "rejected" || m.status === "suspended") && (
                      <button disabled={busyId === m.id} onClick={() => decide(m, "approved").catch((e) => toast.error(e.message))}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-[#16A34A] text-white text-[11px] font-bold uppercase px-3 py-2 hover:opacity-90 disabled:opacity-60">
                        <Check className="w-3.5 h-3.5" /> {m.status === "suspended" ? "Réactiver" : "Valider"}
                      </button>
                    )}
                    {m.status === "pending" && (
                      <button disabled={busyId === m.id} onClick={() => setDialog({ merchant: m, action: "rejected" })}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-[#DC2626] text-white text-[11px] font-bold uppercase px-3 py-2 hover:opacity-90 disabled:opacity-60">
                        <X className="w-3.5 h-3.5" /> Refuser
                      </button>
                    )}
                    {m.status === "approved" && (
                      <button disabled={busyId === m.id} onClick={() => setDialog({ merchant: m, action: "suspended" })}
                        className="flex-1 inline-flex items-center justify-center gap-1 bg-[#333] text-white text-[11px] font-bold uppercase px-3 py-2 hover:opacity-90 disabled:opacity-60">
                        <Ban className="w-3.5 h-3.5" /> Suspendre
                      </button>
                    )}
                    {m.status === "rejected" && (
                      <button disabled={busyId === m.id} onClick={() => decide(m, "pending").catch((e) => toast.error(e.message))}
                        className="flex-1 btn-outline-grey text-[11px] inline-flex items-center justify-center gap-1">
                        <RotateCcw className="w-3.5 h-3.5" /> Remettre en attente
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog && (
        <ReasonDialog
          title={dialog.action === "rejected" ? `Refuser « ${dialog.merchant.name} »` : `Suspendre « ${dialog.merchant.name} »`}
          description={
            dialog.action === "rejected"
              ? "Expliquez ce qu'il faut corriger : le marchand verra ce motif et pourra renvoyer sa demande."
              : "La boutique et ses produits seront masqués. Le marchand verra ce motif."
          }
          confirmLabel={dialog.action === "rejected" ? "Refuser" : "Suspendre"}
          onConfirm={(reason) => decide(dialog.merchant, dialog.action, reason)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
