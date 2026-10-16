"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Store, Clock, XCircle, Ban, CheckCircle2, Loader2, RefreshCw, Pencil, Send, ShieldCheck, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useApp, type MerchantShop, type SessionUser } from "@/lib/store";
import { BRAND } from "@/lib/brand";

const POLL_MS = 20_000;

type ShopFields = {
  name: string;
  phone: string;
  city: string;
  country: string;
  mainCategory: string;
  description: string;
};

const fromShop = (s?: MerchantShop | null): ShopFields => ({
  name: s?.name ?? "",
  phone: s?.phone ?? "",
  city: s?.city ?? "",
  country: s?.country ?? "Côte d'Ivoire",
  mainCategory: s?.mainCategory ?? "",
  description: s?.description ?? "",
});

async function send(method: "POST" | "PATCH", body: ShopFields) {
  const r = await fetch("/api/me/merchant", {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = (await r.json().catch(() => ({}))) as { user?: SessionUser; error?: string; resubmitted?: boolean };
  if (!r.ok || !d.user) throw new Error(d.error ?? "Enregistrement impossible");
  return d;
}

/** Shop details form shared by "Devenir vendeur" and the status page. */
function ShopForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ShopFields;
  submitLabel: string;
  onSubmit: (v: ShopFields) => Promise<void>;
  onCancel?: () => void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ShopFields) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onSubmit(v);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full h-10 border border-[#DADAD9] px-3 text-[13px] outline-none focus:border-[#1A1F8A] bg-white";
  const label = "block text-[11px] font-bold uppercase text-[#555] mb-1";
  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <div>
        <label className={label} htmlFor="shop-name">Nom de l&apos;entreprise *</label>
        <input id="shop-name" required minLength={2} maxLength={80} value={v.name} onChange={set("name")} className={input} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="shop-phone">Téléphone professionnel *</label>
          <input id="shop-phone" required type="tel" inputMode="tel" maxLength={30} value={v.phone} onChange={set("phone")} placeholder="+225 07 00 00 00 00" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="shop-cat">Activité principale</label>
          <input id="shop-cat" maxLength={80} value={v.mainCategory} onChange={set("mainCategory")} placeholder="Ex. Textile, Électronique…" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="shop-city">Ville *</label>
          <input id="shop-city" required minLength={2} maxLength={60} value={v.city} onChange={set("city")} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="shop-country">Pays *</label>
          <input id="shop-country" required maxLength={60} value={v.country} onChange={set("country")} className={input} />
        </div>
      </div>
      <div>
        <label className={label} htmlFor="shop-desc">Présentation de la boutique</label>
        <textarea id="shop-desc" rows={3} maxLength={1000} value={v.description} onChange={set("description")}
          placeholder="Produits vendus, capacité, zones de livraison…"
          className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#1A1F8A] resize-none" />
      </div>
      {error && <p role="alert" className="text-[12px] text-[#B91C1C] bg-[#FEF2F2] border border-[#FCA5A5] px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline-grey flex-1">Annuler</button>
        )}
        <button type="submit" disabled={busy} className="btn-benjamin-orange flex-1 flex items-center justify-center gap-1.5 disabled:opacity-60">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#ECECEC] min-h-[70vh] flex items-center justify-center px-3 sm:px-4 py-8">
      <div className="bg-white border border-[#DADAD9] max-w-xl w-full p-5 sm:p-8">{children}</div>
    </div>
  );
}

/** For clients (or Google sign-ups) who want to sell: creates a pending shop. */
export function BecomeMerchant() {
  const setSession = useApp((s) => s.setSession);
  return (
    <Card>
      <div className="text-center mb-5">
        <Store className="w-10 h-10 mx-auto text-[#1A1F8A]" />
        <h2 className="text-[20px] font-extrabold mt-3">Devenir vendeur sur {BRAND.shortName}</h2>
        <p className="text-[13px] text-[#666] mt-1.5">
          Présentez votre entreprise. Notre équipe vérifie chaque boutique avant sa mise en ligne, généralement sous 24 à 48 h.
        </p>
      </div>
      <ShopForm
        initial={fromShop(null)}
        submitLabel="Envoyer ma demande"
        onSubmit={async (v) => {
          const d = await send("POST", v);
          setSession(d.user!);
          toast.success("Demande envoyée", { description: "Vous serez informé dès la validation de votre boutique." });
        }}
      />
    </Card>
  );
}

const STEPS = ["Demande envoyée", "Vérification", "Boutique en ligne"];

/** Merchant space while the shop is not approved: status, reason, edit/resubmit, live refresh. */
export function MerchantStatusPanel({ user }: { user: SessionUser }) {
  const shop = user.supplier!;
  const { refreshSession, setSession, setView, openChat } = useApp();
  const [editingPending, setEditing] = useState(false);
  // A rejected application always shows the correction form.
  const editing = editingPending || shop.status === "rejected";
  const [checking, setChecking] = useState(false);
  const previous = useRef(shop.status);

  // Live status: poll while the tab is visible (also refreshed on focus by AuthProvider).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refreshSession();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refreshSession]);

  // Announce a status change coming from the server.
  useEffect(() => {
    if (previous.current !== shop.status) {
      if (shop.status === "rejected") toast.error("Votre demande a été refusée", { description: shop.statusReason ?? undefined });
      if (shop.status === "suspended") toast.error("Votre boutique a été suspendue", { description: shop.statusReason ?? undefined });
      previous.current = shop.status;
    }
  }, [shop.status, shop.statusReason]);

  async function checkNow() {
    setChecking(true);
    const u = await refreshSession();
    setChecking(false);
    if (u?.supplier?.status === "approved") toast.success("Votre boutique est validée !");
    else toast.message("Toujours en cours de vérification", { description: "Nous vous informerons dès la validation." });
  }

  const meta = {
    pending: { icon: <Clock className="w-10 h-10 mx-auto text-[#FF6A00]" />, title: "Boutique en cours de validation", step: 1 },
    rejected: { icon: <XCircle className="w-10 h-10 mx-auto text-[#DC2626]" />, title: "Demande à corriger", step: 1 },
    suspended: { icon: <Ban className="w-10 h-10 mx-auto text-[#333]" />, title: "Boutique suspendue", step: 2 },
    approved: { icon: <CheckCircle2 className="w-10 h-10 mx-auto text-[#16A34A]" />, title: "Boutique validée", step: 3 },
  }[shop.status];

  const incomplete = !shop.phone;

  return (
    <Card>
      <div className="text-center">
        {meta.icon}
        <h2 className="text-[20px] font-extrabold mt-3">{meta.title}</h2>
        <p className="text-[13px] text-[#666] mt-1">« {shop.name} » · demande du {new Date(shop.createdAt).toLocaleDateString("fr-FR")}</p>
      </div>

      {shop.status !== "suspended" && (
        <ol className="grid grid-cols-3 gap-1 mt-5" aria-label="Progression">
          {STEPS.map((s, i) => {
            const done = i < meta.step || (i === 0);
            const current = i === meta.step;
            return (
              <li key={s} className="text-center">
                <div className={`h-1.5 ${done ? "bg-[#16A34A]" : current ? "bg-[#FF6A00]" : "bg-[#ECECEC]"}`} />
                <span className={`block text-[10px] mt-1 font-bold uppercase ${current ? "text-[#FF6A00]" : done ? "text-[#16A34A]" : "text-[#999]"}`}>{s}</span>
              </li>
            );
          })}
        </ol>
      )}

      {shop.status === "pending" && (
        <div className="mt-5 text-[13px] text-[#444] space-y-2">
          <p>Merci {user.name ?? ""} ! Notre équipe vérifie votre boutique. Cette page se met à jour automatiquement dès la validation.</p>
          {incomplete && (
            <p className="bg-[#FFF7ED] border-l-[3px] border-[#FF6A00] px-3 py-2 text-[12px]">
              Complétez votre numéro de téléphone pour accélérer la vérification.
            </p>
          )}
        </div>
      )}

      {(shop.status === "rejected" || shop.status === "suspended") && shop.statusReason && (
        <div className="mt-5 bg-[#FEF2F2] border-l-[3px] border-[#DC2626] px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase text-[#B91C1C]">Motif communiqué par l&apos;équipe</div>
          <p className="text-[13px] text-[#333] mt-1 whitespace-pre-wrap">{shop.statusReason}</p>
        </div>
      )}
      {shop.status === "rejected" && (
        <p className="text-[12px] text-[#555] mt-2">Corrigez les informations ci-dessous puis renvoyez votre demande.</p>
      )}
      {shop.status === "suspended" && (
        <p className="text-[13px] text-[#444] mt-3">Votre boutique et vos produits ne sont plus visibles. Contactez le support pour la réactiver.</p>
      )}

      <div className="mt-5">
        {editing && shop.status !== "suspended" ? (
          <ShopForm
            initial={fromShop(shop)}
            submitLabel={shop.status === "rejected" ? "Renvoyer ma demande" : "Enregistrer"}
            onCancel={shop.status === "rejected" ? undefined : () => setEditing(false)}
            onSubmit={async (v) => {
              const d = await send("PATCH", v);
              setSession(d.user!);
              setEditing(false);
              toast.success(d.resubmitted ? "Demande renvoyée pour vérification" : "Informations mises à jour");
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shop.status === "pending" && (
              <button onClick={() => setEditing(true)} className="btn-outline-grey flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Modifier mes informations
              </button>
            )}
            {shop.status === "suspended" ? (
              <a href={`mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(`Boutique suspendue : ${shop.name}`)}`}
                className="btn-benjamin-orange flex items-center justify-center gap-1.5 sm:col-span-2">
                <MessageCircle className="w-4 h-4" /> Contacter le support
              </a>
            ) : (
              <button onClick={() => void checkNow()} disabled={checking} className="btn-square-black flex items-center justify-center gap-1.5 disabled:opacity-60">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Vérifier maintenant
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-[#ECECEC] flex flex-wrap items-center justify-between gap-2 text-[12px]">
        <span className="flex items-center gap-1.5 text-[#666]"><ShieldCheck className="w-4 h-4 text-[#1A1F8A]" /> En attendant, vous pouvez acheter et discuter avec les fournisseurs.</span>
        <div className="flex gap-3">
          <button onClick={() => openChat()} className="benjamin-link">Messages</button>
          <button onClick={() => setView("home")} className="benjamin-link">Accueil</button>
        </div>
      </div>
    </Card>
  );
}

/** "Ma boutique" settings for an approved merchant (same validation as the application). */
export function ShopSettings({ shop }: { shop: MerchantShop }) {
  const setSession = useApp((s) => s.setSession);
  return (
    <ShopForm
      initial={fromShop(shop)}
      submitLabel="Enregistrer"
      onSubmit={async (v) => {
        const d = await send("PATCH", v);
        setSession(d.user!);
        toast.success("Boutique mise à jour");
      }}
    />
  );
}
