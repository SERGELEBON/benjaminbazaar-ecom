"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Search, RefreshCw, Package, Pencil, Eye, EyeOff, Archive, ArchiveRestore, Trash2, ExternalLink, AlertTriangle, MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { ProductEditor, emptyProduct, type EditableProduct } from "./product-editor";

type Status = "draft" | "published" | "archived";
type Row = EditableProduct & {
  id: string;
  slug: string;
  status: Status;
  moderation: string;
  moderationReason: string | null;
  priceFrom: number | null;
  categoryName: string | null;
  sold: number;
  updatedAt: string;
};
type Filter = "all" | Status | "blocked";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "published", label: "En ligne" },
  { key: "draft", label: "Brouillons" },
  { key: "archived", label: "Archivés" },
  { key: "blocked", label: "Bloqués" },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(d.error ?? `Erreur ${r.status}`);
  return d;
}

function StatusPill({ p }: { p: Row }) {
  if (p.moderation === "blocked") return <span className="bg-[#DC2626] text-white text-[10px] font-bold uppercase px-2 py-0.5">Bloqué</span>;
  const map = { published: ["bg-[#16A34A]", "En ligne"], draft: ["bg-[#6B7280]", "Brouillon"], archived: ["bg-[#333]", "Archivé"] } as const;
  const [c, l] = map[p.status];
  return <span className={`${c} text-white text-[10px] font-bold uppercase px-2 py-0.5`}>{l}</span>;
}

/** Merchant catalogue: list, filters, create / edit / publish / archive / delete. */
export function ProductManager({ onChanged }: { onChanged?: () => void }) {
  const { setProductId, setView } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<EditableProduct | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (q.trim()) params.set("q", q.trim());
    try {
      const d = await api<{ products: Row[]; counts: Record<string, number> }>(`/api/merchant/products?${params}`);
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

  async function act(p: Row, action: "publish" | "unpublish" | "archive" | "restore") {
    setBusyId(p.id);
    setMenu(null);
    try {
      await api(`/api/merchant/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      toast.success({ publish: "Produit publié", unpublish: "Produit retiré du site (brouillon)", archive: "Produit archivé", restore: "Produit restauré en brouillon" }[action]);
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message, action === "publish" ? { description: "Complétez la fiche puis réessayez." } : undefined);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: Row) {
    setMenu(null);
    if (!window.confirm(`Supprimer définitivement « ${p.title} » et ses photos ?\n\nS'il figure dans des commandes, il sera archivé à la place.`)) return;
    setBusyId(p.id);
    try {
      const d = await api<{ result: string; message?: string }>(`/api/merchant/products/${p.id}`, { method: "DELETE" });
      toast.success(d.result === "deleted" ? "Produit supprimé" : "Produit archivé", { description: d.message });
      await load();
      onChanged?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function openEditor(p?: Row) {
    if (!p) return setEditing(emptyProduct());
    try {
      const d = await api<{ product: EditableProduct }>(`/api/merchant/products/${p.id}`);
      setEditing(d.product);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  // Editor and list are long on mobile: always show the top after switching.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [editing]);

  if (editing) {
    return (
      <ProductEditor
        key={editing.id ?? "new"}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={(msg) => {
          toast.success(msg);
          setEditing(null);
          void load();
          onChanged?.();
        }}
      />
    );
  }

  const total = (counts.published ?? 0) + (counts.draft ?? 0) + (counts.archived ?? 0);

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="benjamin-section-title">Mes produits</h3>
            <p className="text-[11px] text-[#888] mt-0.5">{counts.published ?? 0} en ligne · {counts.draft ?? 0} brouillon(s) · {counts.archived ?? 0} archivé(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="btn-outline-grey !px-2" aria-label="Actualiser"><RefreshCw className="w-3.5 h-3.5" /></button>
            <button onClick={() => void openEditor()} className="btn-benjamin-orange text-[12px] flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Ajouter un produit
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex overflow-x-auto benjamin-scroll">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => { if (f.key !== filter) { setRows(null); setFilter(f.key); } }}
                className={`shrink-0 px-3 py-1.5 text-[11px] font-bold uppercase border flex items-center gap-1.5 ${filter === f.key ? "bg-[#0A0F4D] text-white border-[#0A0F4D]" : "bg-white text-[#666] border-[#DADAD9]"}`}>
                {f.label}
                <span className="text-[10px] opacity-80">{f.key === "all" ? total : counts[f.key] ?? 0}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center border border-[#DADAD9] px-2 sm:ml-auto sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#888]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Titre ou référence" aria-label="Rechercher un produit" className="flex-1 px-2 py-1.5 text-[12px] outline-none min-w-0" />
          </label>
        </div>
      </div>

      {rows === null ? (
        <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#F3F3F3] animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-[13px] text-[#666] max-w-md mx-auto">
          <Package className="w-10 h-10 mx-auto text-[#DADAD9] mb-3" />
          {total === 0 ? (
            <>
              <p className="font-semibold text-[#333]">Publiez votre premier produit</p>
              <p className="mt-1">Ajoutez des photos, vos prix par quantité et votre stock. Vous pouvez enregistrer un brouillon et publier plus tard.</p>
              <button onClick={() => void openEditor()} className="btn-benjamin-orange mt-4 inline-flex items-center gap-1.5"><Plus className="w-4 h-4" /> Ajouter un produit</button>
            </>
          ) : (
            <p>Aucun produit dans cette liste.</p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {rows.map((p) => (
            <li key={p.id} className={`p-3 flex gap-3 items-start ${busyId === p.id ? "opacity-60" : ""}`}>
              <button onClick={() => void openEditor(p)} className="shrink-0" aria-label={`Modifier ${p.title}`}>
                {p.images[0] ? (
                   
                  <img src={p.images[0]} alt="" className="w-16 h-16 object-cover border border-[#ECECEC] bg-[#F3F3F3]" />
                ) : (
                  <div className="w-16 h-16 bg-[#F3F3F3] border border-dashed border-[#DADAD9] flex items-center justify-center"><Package className="w-5 h-5 text-[#BBB]" /></div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => void openEditor(p)} className="font-semibold text-[13px] text-left hover:text-[#1A1F8A] truncate max-w-full">{p.title}</button>
                  <StatusPill p={p} />
                </div>
                <div className="text-[12px] text-[#666] mt-0.5 flex flex-wrap gap-x-3">
                  <span className="text-[#FF6A00] font-bold">{p.priceFrom ? `dès ${p.priceFrom.toLocaleString("fr-FR")} FCFA` : "Prix non défini"}</span>
                  <span>{p.stock == null ? "Sur commande" : p.stock === 0 ? <b className="text-[#DC2626]">Rupture</b> : `${p.stock} en stock`}</span>
                  <span>{p.categoryName ?? "—"}</span>
                  <span className="text-[#999]">modifié le {new Date(p.updatedAt).toLocaleDateString("fr-FR")}</span>
                </div>
                {p.moderation === "blocked" && p.moderationReason && (
                  <p className="text-[12px] text-[#B91C1C] mt-1 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {p.moderationReason}</p>
                )}
              </div>
              <div className="relative shrink-0">
                <button onClick={() => setMenu(menu === p.id ? null : p.id)} disabled={busyId === p.id} className="p-2 text-[#555] hover:text-[#1A1F8A]" aria-label="Actions" aria-haspopup="menu" aria-expanded={menu === p.id}>
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menu === p.id && (
                  <div role="menu" className="absolute right-0 top-full z-20 w-56 bg-white border border-[#DADAD9] shadow-lg text-[13px]">
                    <MenuItem icon={<Pencil className="w-4 h-4" />} label="Modifier" onClick={() => { setMenu(null); void openEditor(p); }} />
                    {p.status === "published" && p.moderation === "ok" && (
                      <MenuItem icon={<ExternalLink className="w-4 h-4" />} label="Voir sur le site" onClick={() => { setMenu(null); setProductId(p.id); setView("product"); }} />
                    )}
                    {p.status === "draft" && <MenuItem icon={<Eye className="w-4 h-4" />} label="Publier" onClick={() => void act(p, "publish")} />}
                    {p.status === "published" && <MenuItem icon={<EyeOff className="w-4 h-4" />} label="Retirer du site" onClick={() => void act(p, "unpublish")} />}
                    {p.status !== "archived" && <MenuItem icon={<Archive className="w-4 h-4" />} label="Archiver" onClick={() => void act(p, "archive")} />}
                    {p.status === "archived" && <MenuItem icon={<ArchiveRestore className="w-4 h-4" />} label="Restaurer" onClick={() => void act(p, "restore")} />}
                    <MenuItem danger icon={<Trash2 className="w-4 h-4" />} label="Supprimer" onClick={() => void remove(p)} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button role="menuitem" onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#F5F5F5] ${danger ? "text-[#B91C1C] border-t border-[#ECECEC]" : ""}`}>
      {icon} {label}
    </button>
  );
}
