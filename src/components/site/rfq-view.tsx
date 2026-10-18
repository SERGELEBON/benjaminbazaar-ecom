"use client";

import { useEffect, useState } from "react";
import {
  FileText, Paperclip, Check, BadgeCheck, ShieldCheck,
  Bot, Send, ArrowRight, Sparkles, Truck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

const UNITS = ["piece", "kilogram", "box", "carton", "set", "ton"];
const UNIT_LABELS: Record<string, string> = {
  piece: "pièce",
  kilogram: "kilogramme",
  box: "boîte",
  carton: "carton",
  set: "lot",
  ton: "tonne",
};

interface RfqRef {
  id: string;
  ref?: string;
  title?: string;
}

export function RfqView() {
  const { setView } = useApp();
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<RfqRef | null>(null);

  const [form, setForm] = useState({
    title: "",
    category: "",
    quantity: "",
    unit: "piece",
    budget: "",
    details: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const tree = await res.json();
        const flat: string[] = [];
        for (const c of tree) {
          flat.push(c.name);
          if (c.children?.length) {
            for (const s of c.children) flat.push(`${c.name} / ${s.name}`);
          }
        }
        setCategories(flat.length ? flat : []);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Veuillez saisir le nom du produit.");
      return;
    }
    if (!form.quantity || parseInt(form.quantity) <= 0) {
      toast.error("Veuillez saisir une quantité valide.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rfq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category || "Other",
          quantity: parseInt(form.quantity),
          unit: form.unit,
          budget: form.budget || null,
          details: form.details,
          attachments: files.map((f) => f.name),
        }),
      });
      if (res.status === 401) {
        toast.error("Connectez-vous pour envoyer une demande de devis.");
        useApp.getState().setView("auth");
        return;
      }
      if (!res.ok) throw new Error("rfq failed");
      const rfq = await res.json();
      const ref =
        rfq.ref ||
        rfq.id?.slice(0, 8).toUpperCase() ||
        Math.random().toString(36).slice(2, 8).toUpperCase();
      setSuccess({ id: rfq.id, ref, title: form.title });
      setForm({
        title: "", category: "", quantity: "", unit: "piece",
        budget: "", details: "",
      });
      setFiles([]);
      toast.success("Demande de devis envoyée ! Les boutiques vous répondront bientôt.");
    } catch {
      toast.error("Échec de l'envoi de la demande de devis. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#f4f1ec] min-h-[60vh]">
      {/* Hero bar */}
      <div className="bg-brand-gradient text-white">
        <div className="max-w-[1100px] mx-auto px-4 py-10 lg:py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-[#FF6A00] px-3 py-1 text-[11px] uppercase font-bold tracking-wider mb-4">
            <FileText className="w-3.5 h-3.5" /> Achetez selon vos conditions
          </div>
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Demande de devis <span className="text-[#FF6A00]">(RFQ)</span>
          </h1>
          <p className="text-[#CFD6F5] text-[13px] mt-2 max-w-2xl mx-auto">
            Dites-nous ce dont vous avez besoin — des boutiques vérifiées vous enverront
            leurs devis sous 24 h. Gratuit, sans engagement, avec la Commande protégée.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          {/* ---- LEFT: form / success ---- */}
          <div className="space-y-4">
            {success ? (
              <div className="bg-white border-2 border-[#16A34A] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#16A34A] flex items-center justify-center">
                    <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-[#16A34A]">Demande de devis envoyée !</div>
                    <div className="text-[12px] text-[#666]">Les boutiques vous répondront bientôt.</div>
                  </div>
                </div>
                <div className="bg-[#FAFAFA] border border-[#ECECEC] p-3 mb-4">
                  <div className="text-[11px] uppercase text-[#999] tracking-wide">Référence de votre demande</div>
                  <div className="text-[18px] font-extrabold text-[#FF6A00] font-mono">
                    #{success.ref}
                  </div>
                  {success.title && (
                    <div className="text-[12px] text-[#333] mt-1">
                      Pour : <span className="font-semibold">{success.title}</span>
                    </div>
                  )}
                </div>
                <div className="text-[13px] text-[#444] mb-4 leading-relaxed">
                  <span className="font-bold text-[#16A34A]">3 à 5 devis attendus sous 24 h.</span>{" "}
                  Nous vous préviendrons par email et SMS dès que les boutiques répondront.
                  Vous pourrez comparer les devis, négocier avec l&apos;aide de l&apos;IA et
                  passer commande directement depuis votre tableau de bord.
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSuccess(null)}
                    className="btn-benjamin-orange"
                  >
                    Nouvelle demande de devis
                  </button>
                  <button
                    onClick={() => setView("buyer-dashboard")}
                    className="btn-outline-grey"
                  >
                    Aller au tableau de bord
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar">Dites-nous ce dont vous avez besoin</div>
                <div className="p-4 space-y-4 max-w-2xl">
                  {/* title */}
                  <Field label="Nom du produit / intitulé" required>
                    <input
                      value={form.title}
                      onChange={(e) => setField("title", e.target.value)}
                      placeholder="Ex. : T-shirts en coton avec logo personnalisé"
                      className={inputCls}
                    />
                  </Field>

                  {/* category + budget */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Catégorie">
                      {categories.length ? (
                        <select
                          value={form.category}
                          onChange={(e) => setField("category", e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Choisissez une catégorie…</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={form.category}
                          onChange={(e) => setField("category", e.target.value)}
                          placeholder="Ex. : Vêtements / T-shirts"
                          className={inputCls}
                        />
                      )}
                    </Field>
                    <Field label="Budget (facultatif)">
                      <input
                        value={form.budget}
                        onChange={(e) => setField("budget", e.target.value)}
                        placeholder="Ex. : 500–800 FCFA / pièce"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* quantity + unit */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
                    <Field label="Quantité" required>
                      <input
                        type="number"
                        value={form.quantity}
                        onChange={(e) => setField("quantity", e.target.value)}
                        placeholder="Ex. : 1000"
                        min={1}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Unité">
                      <select
                        value={form.unit}
                        onChange={(e) => setField("unit", e.target.value)}
                        className={inputCls}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{UNIT_LABELS[u] ?? u}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* details */}
                  <Field label="Détails (caractéristiques, marché cible, personnalisation…)">
                    <textarea
                      value={form.details}
                      onChange={(e) => setField("details", e.target.value)}
                      placeholder="Décrivez le produit, les matériaux, les certifications requises, le marché cible, l'emballage, la personnalisation…"
                      rows={5}
                      className={`${inputCls} resize-y min-h-[110px]`}
                    />
                  </Field>

                  {/* attachments */}
                  <Field label="Pièces jointes (fiches techniques, images, références)">
                    <label className="flex items-center gap-2 border border-dashed border-[#DADAD9] bg-[#FAFAFA] px-3 py-3 cursor-pointer hover:border-[#FF6A00]">
                      <Paperclip className="w-4 h-4 text-[#FF6A00]" />
                      <span className="text-[12px] text-[#666]">
                        {files.length
                          ? `${files.length} fichier${files.length === 1 ? "" : "s"} sélectionné${files.length === 1 ? "" : "s"}`
                          : "Cliquez pour joindre des fichiers (images, PDF, DOCX)"}
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                      />
                    </label>
                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {files.map((f, i) => (
                          <li key={i} className="text-[11px] text-[#555] flex items-center gap-1.5">
                            <Paperclip className="w-3 h-3 text-[#FF6A00]" /> {f.name}
                            <button
                              type="button"
                              onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-[#999] hover:text-[#FF6A00] ml-auto"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Field>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-benjamin-orange flex items-center gap-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      "Envoi en cours…"
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Envoyer la demande
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-[#999]">
                    En envoyant cette demande, vous acceptez les conditions d&apos;utilisation et la politique de confidentialité de {BRAND.name}.
                  </p>
                </div>
              </form>
            )}

            {/* How it works */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Comment ça marche</div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Step n={1} title="Publiez votre demande" desc="Décrivez le produit, la quantité et le prix visé." />
                <Step n={2} title="Recevez des devis" desc="Les boutiques vérifiées vous répondent sous 24 h." />
                <Step n={3} title="Comparez et commandez" desc="Négociez avec l'IA, comparez, puis commandez avec la Commande protégée." />
              </div>
            </div>
          </div>

          {/* ---- RIGHT: why use RFQ ---- */}
          <aside>
            <div className="sticky top-[140px] space-y-4">
              <div className="bg-white border border-[#DADAD9]">
                <div className="benjamin-bar-red">Pourquoi demander un devis</div>
                <ul className="p-4 space-y-3 text-[12px]">
                  <Benefit
                    icon={BadgeCheck}
                    title="Gratuit, sans engagement"
                    desc="Publiez autant de demandes de devis que vous voulez, sans frais."
                  />
                  <Benefit
                    icon={ShieldCheck}
                    title="Boutiques vérifiées uniquement"
                    desc="Les réponses proviennent de boutiques contrôlées et éligibles à la Commande protégée."
                  />
                  <Benefit
                    icon={Bot}
                    title="Négociation assistée par IA"
                    desc="Notre IA rédige vos contre-offres et traduit les caractéristiques techniques."
                  />
                  <Benefit
                    icon={Truck}
                    title="Expédition dans les délais ≥ 98 %"
                    desc="La Commande protégée sécurise votre argent et votre livraison."
                  />
                </ul>
              </div>

              <div className="bg-[#FF6A00] text-white p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <div className="text-[13px] font-bold uppercase tracking-wide">Conseil</div>
                </div>
                <p className="text-[12px] leading-snug opacity-95">
                  Plus vous donnez de détails (caractéristiques, marché cible, certifications),
                  plus les devis que vous recevrez seront précis.
                </p>
              </div>

              <button
                onClick={() => setView("home")}
                className="btn-outline-grey w-full flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Retour à l&apos;accueil
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-[#DADAD9] bg-white px-3 py-2 text-[13px] text-[#333] outline-none focus:border-[#FF6A00] placeholder:text-[#999]";

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[#555] mb-1 uppercase tracking-wide">
        {label}
        {required && <span className="text-[#FF6A00]"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-[#FF6A00] text-white font-extrabold flex items-center justify-center shrink-0">
        {n}
      </div>
      <div>
        <div
          className="text-[13px] font-bold text-[#333]"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div
          className="text-[11px] text-[#666] mt-0.5 leading-snug"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      </div>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof BadgeCheck;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="w-8 h-8 bg-[#ECECEC] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#FF6A00]" strokeWidth={1.8} />
      </div>
      <div>
        <div
          className="text-[13px] font-bold text-[#333]"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <div
          className="text-[11px] text-[#666] mt-0.5 leading-snug"
          dangerouslySetInnerHTML={{ __html: desc }}
        />
      </div>
    </li>
  );
}
