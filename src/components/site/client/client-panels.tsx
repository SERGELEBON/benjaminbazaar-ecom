"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch as api, jsonInit } from "@/lib/api-client";
import { Heart, MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import type { ProductT } from "@/lib/format";
import { ProductCard } from "../product-card";

const json = jsonInit;

function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-[#ECECEC] flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="benjamin-section-title">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#888] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ favorites
/** Saved products, stored on the account (synced across devices). */
export function FavoritesPanel() {
  const { setView } = useApp();
  const favoriteIds = useApp((s) => s.favorites);
  const [products, setProducts] = useState<ProductT[] | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ products: ProductT[] }>("/api/me/favorites");
      setProducts(d.products);
    } catch (e) {
      toast.error((e as Error).message);
      setProducts([]);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  // Reflect removals made from a product page without refetching.
  const visible = (products ?? []).filter((p) => favoriteIds.includes(p.id));

  return (
    <div>
      <Header title="Favoris" subtitle={products ? `${visible.length} produit${visible.length > 1 ? "s" : ""} enregistré${visible.length > 1 ? "s" : ""}` : "…"} />
      {products === null ? (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-[3/4] bg-[#ECECEC] animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center">
          <Heart className="w-10 h-10 mx-auto text-[#DADAD9]" />
          <p className="text-[13px] mt-2 text-[#333] font-semibold">Aucun favori pour le moment</p>
          <p className="text-[12px] text-[#888] mt-1">Touchez l&apos;étoile sur la fiche d&apos;un produit pour le retrouver ici, sur tous vos appareils.</p>
          <button onClick={() => setView("home")} className="btn-benjamin-orange mt-4">Parcourir les produits</button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {visible.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ addresses
export type Address = {
  id: string; name: string; phone: string; country: string; city: string; line: string; zip: string | null; isDefault: boolean;
};
export type AddressForm = Omit<Address, "id" | "zip"> & { zip: string };
export const emptyAddress = (name = "", phone = ""): AddressForm => ({ name, phone, country: "Côte d'Ivoire", city: "", line: "", zip: "", isDefault: false });

export function AddressEditor({ initial, onSave, onCancel }: { initial: AddressForm; onSave: (v: AddressForm) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof AddressForm) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const input = "w-full h-10 border border-[#DADAD9] px-3 text-[13px] outline-none focus:border-[#1A1F8A]";
  const label = "block text-[11px] font-bold uppercase text-[#555] mb-1";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(v);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="p-4 bg-[#FAFAFA] border-b border-[#ECECEC] space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={label} htmlFor="ad-name">Destinataire *</label><input id="ad-name" required maxLength={80} value={v.name} onChange={set("name")} className={input} /></div>
        <div><label className={label} htmlFor="ad-phone">Téléphone *</label><input id="ad-phone" required type="tel" maxLength={30} value={v.phone} onChange={set("phone")} placeholder="+225 07 00 00 00 00" className={input} /></div>
        <div className="sm:col-span-2"><label className={label} htmlFor="ad-line">Adresse * (quartier, rue, repère)</label><input id="ad-line" required maxLength={200} value={v.line} onChange={set("line")} className={input} /></div>
        <div><label className={label} htmlFor="ad-city">Ville *</label><input id="ad-city" required maxLength={60} value={v.city} onChange={set("city")} className={input} /></div>
        <div><label className={label} htmlFor="ad-country">Pays *</label><input id="ad-country" required maxLength={60} value={v.country} onChange={set("country")} className={input} /></div>
        <div><label className={label} htmlFor="ad-zip">Code postal / boîte postale</label><input id="ad-zip" maxLength={20} value={v.zip} onChange={set("zip")} className={input} /></div>
        <label className="flex items-center gap-2 text-[13px] self-end h-10">
          <input type="checkbox" checked={v.isDefault} onChange={(e) => setV((s) => ({ ...s, isDefault: e.target.checked }))} /> Adresse par défaut
        </label>
      </div>
      {error && <p role="alert" className="text-[12px] text-[#B91C1C]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-outline-grey">Annuler</button>
        <button type="submit" disabled={busy} className="btn-benjamin-orange flex items-center gap-1.5 disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
        </button>
      </div>
    </form>
  );
}

/** Delivery addresses (CRUD), also used by checkout. */
export function AddressesPanel() {
  const user = useApp((s) => s.user);
  const [items, setItems] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ addresses: Address[] }>("/api/me/addresses");
      setItems(d.addresses);
    } catch (e) {
      toast.error((e as Error).message);
      setItems([]);
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save(v: AddressForm) {
    if (editing === "new") await api("/api/me/addresses", json("POST", v));
    else if (editing) await api(`/api/me/addresses/${editing.id}`, json("PATCH", v));
    toast.success("Adresse enregistrée");
    setEditing(null);
    await load();
  }

  async function remove(a: Address) {
    if (!window.confirm(`Supprimer l'adresse « ${a.line}, ${a.city} » ?`)) return;
    try {
      await api(`/api/me/addresses/${a.id}`, { method: "DELETE" });
      toast.success("Adresse supprimée");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function makeDefault(a: Address) {
    try {
      await api(`/api/me/addresses/${a.id}`, json("PATCH", { isDefault: true }));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div>
      <Header
        title="Adresses de livraison"
        subtitle="Utilisées pour vos commandes"
        action={
          editing === null && (
            <button onClick={() => setEditing("new")} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          )
        }
      />
      {editing !== null && (
        <AddressEditor
          initial={editing === "new" ? emptyAddress(user?.name ?? "", user?.phone ?? "") : { ...editing, zip: editing.zip ?? "" }}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
      {items === null ? (
        <div className="p-4 space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-[#F3F3F3] animate-pulse" />)}</div>
      ) : items.length === 0 && editing === null ? (
        <div className="p-8 text-center text-[13px] text-[#666]">
          <MapPin className="w-9 h-9 mx-auto text-[#DADAD9] mb-2" />
          Aucune adresse enregistrée.
        </div>
      ) : (
        <ul className="divide-y divide-[#ECECEC]">
          {items.map((a) => (
            <li key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="w-9 h-9 bg-[#ECECEC] flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-[#FF6A00]" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-[13px]">{a.name}</span>
                  {a.isDefault && <span className="bg-[#16A34A] text-white text-[10px] font-bold uppercase px-1.5 py-0.5">Par défaut</span>}
                </div>
                <div className="text-[12px] text-[#444] mt-1">{a.phone}</div>
                <div className="text-[12px] text-[#666] mt-0.5">{a.line}, {a.city}, {a.country}{a.zip ? ` · ${a.zip}` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.isDefault && (
                  <button onClick={() => void makeDefault(a)} className="btn-outline-grey text-[11px] flex items-center gap-1"><Star className="w-3 h-3" /> Par défaut</button>
                )}
                <button onClick={() => setEditing(a)} className="btn-outline-grey text-[11px] flex items-center gap-1"><Pencil className="w-3 h-3" /> Modifier</button>
                <button onClick={() => void remove(a)} className="btn-outline-grey text-[11px] flex items-center gap-1 hover:!border-[#DC2626] hover:!text-[#DC2626]"><Trash2 className="w-3 h-3" /> Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
