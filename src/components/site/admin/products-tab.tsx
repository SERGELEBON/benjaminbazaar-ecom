"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, ExternalLink, Package, RefreshCw, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Pill, ReasonDialog, SkeletonRows, adminFetch, fmtDate, jsonInit, useAutoRefresh } from "./shared";

type Filter = "published" | "draft" | "blocked" | "archived";
type Row = {
  id: string; title: string; cover: string | null; status: string; moderation: string; moderationReason: string | null;
  stock: number | null; priceFrom: number | null; updatedAt: string; createdAt: string;
  supplier: { id: string; name: string; status: string }; category: { name: string } | null;
};

const TABS: { key: Filter; label: string }[] = [
  { key: "published", label: "En ligne" },
  { key: "blocked", label: "Bloqués" },
  { key: "draft", label: "Brouillons" },
  { key: "archived", label: "Archivés" },
];

/** ADMIN: moderation of products published by merchants. */
export function ProductsTab() {
  const { setProductId, setView } = useApp();
  const [filter, setFilter] = useState<Filter>("published");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [blocking, setBlocking] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ filter });
    if (q.trim()) params.set("q", q.trim());
    try {
      const d = await adminFetch<{ products: Row[]; counts: Record<string, number> }>(`/api/admin/products?${params}`);
      setRows(d.products);
      setCounts(d.counts);
    } catch (e) {
      toast.error((e as Error).message);
      setRows((r) => r ?? []);
    }
  }, [filter, q]);
  useEffect(() => {
    const t = setTimeout(() => void load(), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);
  useAutoRefresh(() => void load(), 60_000);

  async function moderate(p: Row, moderation: "ok" | "blocked", reason?: string) {
    setBusyId(p.id);
    try {
      await adminFetch(`/api/admin/products/${p.id}`, jsonInit("PATCH", { moderation, reason }));
      toast.success(moderation === "blocked" ? `« ${p.title} » est masqué du site` : `« ${p.title} » est de nouveau visible`);
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
            <h3 className="benjamin-section-title">Produits des marchands</h3>
            <p className="text-[11px] text-[#888] mt-0.5">Bloquez un produit non conforme : il disparaît du site et le marchand voit le motif.</p>
          </div>
          <button onClick={() => void load()} className="btn-outline-grey text-[11px] flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Actualiser</button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex overflow-x-auto benjamin-scroll">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => { if (t.key !== filter) { setRows(null); setFilter(t.key); } }}
                className={`shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase border flex items-center gap-1.5 ${filter === t.key ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "bg-white text-[#666] border-[#DADAD9]"}`}>
                {t.label}
                {counts[t.key] !== undefined && <span className="text-[10px] opacity-80">{counts[t.key]}</span>}
              </button>
            ))}
          </div>
          <label className="flex items-center border border-[#DADAD9] px-2 sm:ml-auto sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#888]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Produit ou boutique" aria-label="Rechercher" className="flex-1 px-2 py-1.5 text-[12px] outline-none min-w-0" />
          </label>
        </div>
      </div>

      {rows === null ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-[13px] text-[#666]">
          <Package className="w-8 h-8 mx-auto text-[#DADAD9] mb-2" /> Aucun produit marchand dans cette liste.
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {rows.map((p) => (
            <li key={p.id} className={`p-3 flex gap-3 items-start ${busyId === p.id ? "opacity-60" : ""}`}>
              {p.cover ? (
                 
                <img src={p.cover} alt="" className="w-14 h-14 object-cover border border-[#ECECEC] bg-[#F3F3F3] shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-[#F3F3F3] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13px]">{p.title}</span>
                  {p.moderation === "blocked" ? <Pill tone="red">Bloqué</Pill> : <Pill tone={p.status === "published" ? "green" : "grey"}>{{ published: "En ligne", draft: "Brouillon", archived: "Archivé" }[p.status] ?? p.status}</Pill>}
                </div>
                <div className="text-[12px] text-[#666] mt-0.5 flex flex-wrap gap-x-3">
                  <span className="font-semibold text-[#1A1F8A]">{p.supplier.name}</span>
                  <span>{p.priceFrom ? `dès ${p.priceFrom.toLocaleString("fr-FR")} FCFA` : "sans prix"}</span>
                  <span>{p.category?.name ?? "—"}</span>
                  <span className="text-[#999]">màj {fmtDate(p.updatedAt)}</span>
                </div>
                {p.moderationReason && p.moderation === "blocked" && (
                  <p className="text-[12px] text-[#B91C1C] mt-1 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {p.moderationReason}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {p.status === "published" && p.moderation === "ok" && (
                  <button onClick={() => { setProductId(p.id); setView("product"); }} className="btn-outline-grey text-[11px] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Voir</button>
                )}
                {p.moderation === "ok" ? (
                  <button disabled={busyId === p.id} onClick={() => setBlocking(p)} className="bg-[#333] text-white text-[11px] font-bold uppercase px-2.5 py-1.5 flex items-center gap-1"><Ban className="w-3 h-3" /> Bloquer</button>
                ) : (
                  <button disabled={busyId === p.id} onClick={() => moderate(p, "ok").catch((e) => toast.error(e.message))} className="bg-[#16A34A] text-white text-[11px] font-bold uppercase px-2.5 py-1.5 flex items-center gap-1"><Check className="w-3 h-3" /> Débloquer</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {blocking && (
        <ReasonDialog
          title={`Bloquer « ${blocking.title} »`}
          description="Le produit sera masqué du site. Le marchand verra ce motif dans son espace."
          confirmLabel="Bloquer"
          placeholder="Ex. Photos non conformes, produit interdit, contrefaçon…"
          onConfirm={(reason) => moderate(blocking, "blocked", reason)}
          onClose={() => setBlocking(null)}
        />
      )}
    </div>
  );
}
