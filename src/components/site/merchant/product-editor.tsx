"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, ImagePlus, Loader2, Plus, Trash2, X, Save, Send, AlertTriangle, Info,
} from "lucide-react";
import { toast } from "sonner";
import type { CategoryNode } from "@/lib/format";
import { prepareImage } from "@/lib/image-compress";

export const UNITS = ["pièce", "carton", "lot", "paire", "kg", "tonne", "litre", "mètre", "sac", "boîte", "douzaine"];
const MAX_IMAGES = 8;

export type EditableProduct = {
  id?: string;
  title: string;
  description: string;
  categoryId: string;
  images: string[];
  unit: string;
  minOrder: number;
  stock: number | null;
  sku: string | null;
  readyToShip: boolean;
  customizable: boolean;
  keyAttributes: { k: string; v: string }[];
  variants: { name: string; options: string[] }[];
  tiers: { minQty: number; price: number }[];
  status?: "draft" | "published" | "archived";
  moderation?: string;
  moderationReason?: string | null;
};

export const emptyProduct = (): EditableProduct => ({
  title: "",
  description: "",
  categoryId: "",
  images: [],
  unit: "pièce",
  minOrder: 1,
  stock: null,
  sku: null,
  readyToShip: false,
  customizable: false,
  keyAttributes: [],
  variants: [],
  tiers: [{ minQty: 1, price: 0 }],
});

type Form = Omit<EditableProduct, "minOrder" | "stock" | "sku" | "tiers" | "variants"> & {
  minOrder: string;
  stock: string;
  sku: string;
  tiers: { minQty: string; price: string }[];
  variants: { name: string; options: string }[];
};

const toForm = (p: EditableProduct): Form => ({
  ...p,
  minOrder: String(p.minOrder),
  stock: p.stock == null ? "" : String(p.stock),
  sku: p.sku ?? "",
  tiers: p.tiers.length ? p.tiers.map((t) => ({ minQty: String(t.minQty), price: t.price ? String(t.price) : "" })) : [{ minQty: "1", price: "" }],
  variants: p.variants.map((v) => ({ name: v.name, options: v.options.join(", ") })),
});

const toPayload = (f: Form) => ({
  title: f.title,
  description: f.description,
  categoryId: f.categoryId,
  images: f.images,
  unit: f.unit,
  minOrder: f.minOrder,
  stock: f.stock.trim() === "" ? null : f.stock,
  sku: f.sku,
  readyToShip: f.readyToShip,
  customizable: f.customizable,
  keyAttributes: f.keyAttributes,
  variants: f.variants.map((v) => ({ name: v.name, options: v.options.split(",").map((o) => o.trim()).filter(Boolean) })),
  tiers: f.tiers.filter((t) => t.minQty.trim() || t.price.trim()).map((t) => ({ minQty: t.minQty, price: t.price })),
});

const fcfa = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} FCFA`;

/** Full product form: photos, price per quantity, stock, attributes, variants. */
export function ProductEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial: EditableProduct;
  onSaved: (msg: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Form>(() => toForm(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toForm(initial)));
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState<"draft" | "publish" | "keep" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const isEdit = Boolean(initial.id);
  const isPublished = initial.status === "published";
  const dirty = JSON.stringify(f) !== baseline;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: CategoryNode[]) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => setCategories([]));
  }, []);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_IMAGES - f.images.length;
    const list = [...files].slice(0, room);
    if (files.length > room) toast.message(`${MAX_IMAGES} photos maximum : ${files.length - room} ignorée(s).`);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const prepared = await prepareImage(file);
        URL.revokeObjectURL(prepared.previewUrl);
        const form = new FormData();
        form.set("file", prepared.file);
        const r = await fetch("/api/merchant/uploads", { method: "POST", body: form, credentials: "same-origin" });
        const d = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!r.ok || !d.url) throw new Error(d.error ?? "Envoi impossible");
        setF((s) => ({ ...s, images: [...s.images, d.url!].slice(0, MAX_IMAGES) }));
      } catch (e) {
        toast.error(`${file.name} : ${(e as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const moveImage = (i: number, d: -1 | 1) =>
    setF((s) => {
      const imgs = [...s.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return s;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...s, images: imgs };
    });

  async function save(mode: "draft" | "publish" | "keep") {
    setError(null);
    setSaving(mode);
    try {
      const body = { ...toPayload(f), ...(mode === "keep" ? {} : { publish: mode === "publish" }) };
      const r = await fetch(isEdit ? `/api/merchant/products/${initial.id}` : "/api/merchant/products", {
        method: isEdit ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Enregistrement impossible");
      setBaseline(JSON.stringify(f));
      onSaved(mode === "publish" ? "Produit publié : il est visible sur le site." : mode === "draft" ? "Brouillon enregistré." : "Modifications enregistrées.");
    } catch (e) {
      setError((e as Error).message);
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    } finally {
      setSaving(null);
    }
  }

  const tierPreview = useMemo(() => {
    const rows = f.tiers
      .map((t) => ({ min: Number(t.minQty), price: Number(t.price) }))
      .filter((t) => t.min >= 1 && t.price > 0)
      .sort((a, b) => a.min - b.min);
    return rows.map((t, i) => {
      const max = rows[i + 1] ? rows[i + 1].min - 1 : null;
      return `${t.min}${max ? `–${max}` : "+"} ${f.unit} : ${fcfa(t.price)}`;
    });
  }, [f.tiers, f.unit]);

  const input = "w-full h-10 border border-[#DADAD9] px-3 text-[13px] outline-none focus:border-[#1A1F8A] bg-white";
  const label = "block text-[11px] font-bold uppercase text-[#555] mb-1";
  const section = "p-4 border-b border-[#ECECEC]";
  const busy = saving !== null || uploading > 0;

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex items-center gap-3 sticky top-0 bg-white z-10">
        <button
          onClick={() => (!dirty || window.confirm("Quitter sans enregistrer vos modifications ?")) && onCancel()}
          className="p-1.5 text-[#333] hover:text-[#1A1F8A]"
          aria-label="Retour à la liste"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="benjamin-section-title truncate">{isEdit ? "Modifier le produit" : "Nouveau produit"}</h3>
          <p className="text-[11px] text-[#888]">
            {isEdit ? (isPublished ? "Publié — les modifications sont visibles immédiatement" : "Brouillon — visible par vous seul") : "Enregistrez un brouillon ou publiez directement"}
            {dirty && <span className="text-[#FF6A00]"> · modifications non enregistrées</span>}
          </p>
        </div>
      </div>

      {initial.moderation === "blocked" && (
        <div className="m-4 bg-[#FEF2F2] border-l-[3px] border-[#DC2626] px-3 py-2.5 text-[13px]">
          <div className="font-bold text-[#B91C1C] flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Produit bloqué par l&apos;équipe</div>
          <p className="mt-1">{initial.moderationReason}</p>
          <p className="text-[12px] text-[#555] mt-1">Corrigez-le puis contactez le support pour une nouvelle vérification.</p>
        </div>
      )}

      {/* --- General */}
      <div className={section}>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={label} htmlFor="p-title">Titre *</label>
            <input id="p-title" maxLength={140} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex. Pagne wax 100 % coton, 6 yards" className={input} />
            <span className="text-[10px] text-[#999]">{f.title.length}/140</span>
          </div>
          <div>
            <label className={label} htmlFor="p-cat">Catégorie *</label>
            <select id="p-cat" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={input}>
              <option value="">— Choisir —</option>
              {categories.map((c) =>
                c.children?.length ? (
                  <optgroup key={c.id} label={c.name}>
                    {c.children.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ) : (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="p-desc">Description * (20 caractères min. pour publier)</label>
            <textarea id="p-desc" rows={6} maxLength={5000} value={f.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Matière, dimensions, usage, conditionnement, délais…"
              className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#1A1F8A] resize-y" />
            <span className="text-[10px] text-[#999]">{f.description.length}/5000</span>
          </div>
        </div>
      </div>

      {/* --- Photos */}
      <div className={section}>
        <div className="flex items-center justify-between mb-2">
          <span className={label}>Photos * ({f.images.length}/{MAX_IMAGES}) — la première est la photo principale</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {f.images.map((url, i) => (
            <div key={url} className={`relative border ${i === 0 ? "border-[#FF6A00] border-2" : "border-[#DADAD9]"} bg-[#F7F7F7] aspect-square`}>
              { }
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && <span className="absolute top-0 left-0 bg-[#FF6A00] text-white text-[9px] font-bold uppercase px-1">Principale</span>}
              <div className="absolute bottom-0 inset-x-0 flex justify-between bg-black/50">
                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="p-1 text-white disabled:opacity-30" aria-label="Déplacer à gauche"><ArrowLeft className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => set("images", f.images.filter((u) => u !== url))} className="p-1 text-white" aria-label="Retirer la photo"><X className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === f.images.length - 1} className="p-1 text-white disabled:opacity-30" aria-label="Déplacer à droite"><ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          {[...Array(uploading)].map((_, i) => (
            <div key={`up${i}`} className="border border-dashed border-[#DADAD9] aspect-square flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1A1F8A]" />
            </div>
          ))}
          {f.images.length + uploading < MAX_IMAGES && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#B8BCE6] aspect-square flex flex-col items-center justify-center text-[#1A1F8A] hover:bg-[#EEF0FF] text-[11px] font-bold gap-1">
              <ImagePlus className="w-6 h-6" /> Ajouter
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="hidden" onChange={(e) => void addFiles(e.target.files)} />
        <p className="text-[11px] text-[#888] mt-2 flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" /> JPEG, PNG ou WebP. Les photos sont redimensionnées automatiquement. Fond clair et produit centré recommandés.</p>
      </div>

      {/* --- Prices */}
      <div className={section}>
        <span className={label}>Prix par quantité (FCFA) *</span>
        <div className="space-y-2">
          {f.tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[12px] text-[#666] w-14 shrink-0">À partir de</span>
              <input type="number" min={1} inputMode="numeric" value={t.minQty} aria-label={`Quantité minimum du palier ${i + 1}`}
                onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))}
                className="w-24 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <span className="text-[12px] text-[#666] shrink-0">{f.unit} :</span>
              <input type="number" min={1} inputMode="numeric" value={t.price} placeholder="Prix unitaire" aria-label={`Prix du palier ${i + 1}`}
                onChange={(e) => set("tiers", f.tiers.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                className="flex-1 min-w-0 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <button type="button" disabled={f.tiers.length === 1} onClick={() => set("tiers", f.tiers.filter((_, j) => j !== i))}
                className="p-2 text-[#999] hover:text-[#DC2626] disabled:opacity-30" aria-label="Supprimer le palier"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        {f.tiers.length < 5 && (
          <button type="button" onClick={() => set("tiers", [...f.tiers, { minQty: "", price: "" }])} className="benjamin-link text-[12px] mt-2 inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajouter un palier (prix dégressif)
          </button>
        )}
        {tierPreview.length > 0 && (
          <div className="mt-3 bg-[#F7F8FF] border border-[#E0E3F7] px-3 py-2 text-[12px] text-[#333]">
            <span className="text-[10px] uppercase font-bold text-[#1A1F8A]">Aperçu acheteur</span>
            <ul className="mt-1 space-y-0.5">{tierPreview.map((l) => <li key={l}>{l}</li>)}</ul>
          </div>
        )}
      </div>

      {/* --- Order & stock */}
      <div className={section}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={label} htmlFor="p-unit">Unité</label>
            <select id="p-unit" value={f.unit} onChange={(e) => set("unit", e.target.value)} className={input}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="p-moq">Commande min.</label>
            <input id="p-moq" type="number" min={1} inputMode="numeric" value={f.minOrder} onChange={(e) => set("minOrder", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="p-stock">Stock</label>
            <input id="p-stock" type="number" min={0} inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} placeholder="Sur commande" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="p-sku">Référence (SKU)</label>
            <input id="p-sku" maxLength={60} value={f.sku} onChange={(e) => set("sku", e.target.value)} className={input} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[13px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.readyToShip} onChange={(e) => set("readyToShip", e.target.checked)} /> Prêt à expédier</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.customizable} onChange={(e) => set("customizable", e.target.checked)} /> Personnalisable (logo, couleur…)</label>
        </div>
      </div>

      {/* --- Attributes */}
      <div className={section}>
        <span className={label}>Caractéristiques</span>
        <div className="space-y-2">
          {f.keyAttributes.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input value={a.k} maxLength={40} placeholder="Ex. Matière" aria-label="Caractéristique"
                onChange={(e) => set("keyAttributes", f.keyAttributes.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))}
                className="w-1/3 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <input value={a.v} maxLength={120} placeholder="Ex. 100 % coton" aria-label="Valeur"
                onChange={(e) => set("keyAttributes", f.keyAttributes.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                className="flex-1 min-w-0 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <button type="button" onClick={() => set("keyAttributes", f.keyAttributes.filter((_, j) => j !== i))} className="p-2 text-[#999] hover:text-[#DC2626]" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        {f.keyAttributes.length < 20 && (
          <button type="button" onClick={() => set("keyAttributes", [...f.keyAttributes, { k: "", v: "" }])} className="benjamin-link text-[12px] mt-2 inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajouter une caractéristique
          </button>
        )}
      </div>

      {/* --- Variants */}
      <div className={section}>
        <span className={label}>Options proposées (tailles, couleurs…)</span>
        <div className="space-y-2">
          {f.variants.map((v, i) => (
            <div key={i} className="flex gap-2">
              <input value={v.name} maxLength={30} placeholder="Ex. Couleur" aria-label="Nom de l'option"
                onChange={(e) => set("variants", f.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                className="w-1/3 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <input value={v.options} placeholder="Rouge, Bleu, Vert (séparés par des virgules)" aria-label="Valeurs"
                onChange={(e) => set("variants", f.variants.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)))}
                className="flex-1 min-w-0 h-10 border border-[#DADAD9] px-2 text-[13px] outline-none focus:border-[#1A1F8A]" />
              <button type="button" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} className="p-2 text-[#999] hover:text-[#DC2626]" aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        {f.variants.length < 4 && (
          <button type="button" onClick={() => set("variants", [...f.variants, { name: "", options: "" }])} className="benjamin-link text-[12px] mt-2 inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ajouter une option
          </button>
        )}
      </div>

      {/* --- Actions */}
      <div className="p-4 sticky bottom-0 bg-white border-t border-[#DADAD9] space-y-2 z-10">
        {error && (
          <p ref={errorRef} role="alert" className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2">{error}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          {isPublished ? (
            <>
              <button type="button" disabled={busy} onClick={() => void save("draft")} className="btn-outline-grey flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Dépublier et enregistrer
              </button>
              <button type="button" disabled={busy} onClick={() => void save("keep")} className="btn-benjamin-orange flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving === "keep" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
              </button>
            </>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={() => void save("draft")} className="btn-outline-grey flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving === "draft" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer le brouillon
              </button>
              <button type="button" disabled={busy} onClick={() => void save("publish")} className="btn-benjamin-orange flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving === "publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publier
              </button>
            </>
          )}
        </div>
        {uploading > 0 && <p className="text-[11px] text-[#888] text-right">Envoi des photos en cours…</p>}
      </div>
    </div>
  );
}
