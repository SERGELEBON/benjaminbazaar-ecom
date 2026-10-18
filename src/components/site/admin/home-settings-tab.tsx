"use client";

import { useEffect, useRef, useState } from "react";
import { Film, ImageIcon, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminFetch, jsonInit } from "./shared";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { HERO_DEFAULTS, type HeroSettings } from "@/lib/hero";
import { HeroBackground } from "../hero-background";

const VIDEO_TYPES = ["video/mp4", "video/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MB = 1024 * 1024;

type UploadTicket = { path: string; token: string; bucket: string; publicUrl: string };

/** Uploads straight to Storage with a one-time URL issued by the server (super admins only). */
async function uploadMedia(file: File): Promise<string> {
  const t = await adminFetch<UploadTicket>("/api/admin/site/upload-url", jsonInit("POST", { contentType: file.type, size: file.size }));
  const { error } = await getSupabaseBrowser().storage.from(t.bucket).uploadToSignedUrl(t.path, t.token, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error("Envoi du fichier impossible. Vérifiez votre connexion et réessayez.");
  return t.publicUrl;
}

/** SUPER ADMIN: home page hero — background video, cover image and texts. */
export function HomeSettingsTab() {
  const [v, setV] = useState<HeroSettings | null>(null);
  const [saved, setSaved] = useState<HeroSettings | null>(null);
  const [busy, setBusy] = useState<"video" | "poster" | "save" | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    adminFetch<{ hero: HeroSettings }>("/api/admin/site/hero")
      .then((d) => {
        if (!alive) return;
        setV(d.hero);
        setSaved(d.hero);
      })
      .catch((e) => toast.error((e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  if (!v) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#1A1F8A]" /></div>;

  const set = <K extends keyof HeroSettings>(k: K, val: HeroSettings[K]) => setV((s) => (s ? { ...s, [k]: val } : s));
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  async function pick(kind: "video" | "poster", file: File | undefined) {
    if (!file) return;
    const types = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
    const max = kind === "video" ? 50 * MB : 5 * MB;
    if (!types.includes(file.type)) return toast.error(kind === "video" ? "Vidéo MP4 ou WebM uniquement." : "Image JPG, PNG ou WebP uniquement.");
    if (file.size > max) return toast.error(`Fichier trop lourd (${kind === "video" ? "50" : "5"} Mo maximum).`);
    setBusy(kind);
    try {
      const url = await uploadMedia(file);
      set(kind === "video" ? "videoUrl" : "posterUrl", url);
      toast.success(kind === "video" ? "Vidéo envoyée : enregistrez pour la publier." : "Image envoyée : enregistrez pour la publier.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!v) return;
    setBusy("save");
    try {
      const d = await adminFetch<{ hero: HeroSettings }>("/api/admin/site/hero", jsonInit("PUT", v));
      setV(d.hero);
      setSaved(d.hero);
      toast.success("Page d'accueil mise à jour (visible sous une minute).");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const input = "w-full h-10 border border-[#DADAD9] px-3 text-[13px] outline-none focus:border-[#1A1F8A]";
  const label = "block text-[11px] font-bold uppercase text-[#555] mb-1";

  return (
    <div>
      <div className="p-4 border-b border-[#ECECEC] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="benjamin-section-title">Page d&apos;accueil — bannière vidéo</h3>
          <p className="text-[11px] text-[#888] mt-0.5">Vidéo de fond, image de couverture et textes de la bannière principale.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setV({ ...HERO_DEFAULTS })} className="btn-outline-grey text-[11px] flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Valeurs par défaut
          </button>
          <button onClick={() => void save()} disabled={!dirty || busy !== null} className="btn-benjamin-orange text-[11px] flex items-center gap-1.5 disabled:opacity-50">
            {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Enregistrer
          </button>
        </div>
      </div>

      {/* live preview */}
      <div className="p-4">
        <div className="text-[11px] font-bold uppercase text-[#555] mb-1">Aperçu</div>
        <div className="relative h-[220px] sm:h-[260px] text-white overflow-hidden border border-[#DADAD9] flex items-center justify-center text-center px-4">
          <HeroBackground videoUrl={v.videoUrl} posterUrl={v.posterUrl} overlay={v.overlay} />
          <div className="relative">
            {v.badge && <div className="inline-block bg-[#16A34A] px-2 py-0.5 text-[10px] uppercase font-bold mb-2">{v.badge}</div>}
            <div className="text-[18px] sm:text-[24px] font-extrabold leading-tight">
              {v.title} {v.highlight && <span className="text-[#4ade80]">{v.highlight}</span>}
            </div>
            {v.subtitle && <p className="text-[11px] sm:text-[12px] mt-1 text-[#E3E8FF] max-w-xl mx-auto">{v.subtitle}</p>}
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* media */}
        <div className="space-y-4">
          <div>
            <span className={label}>Vidéo de fond (MP4 ou WebM, 50 Mo max.)</span>
            <div className="flex gap-2">
              <input aria-label="Lien de la vidéo" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} className={input} />
              <button onClick={() => videoInput.current?.click()} disabled={busy !== null} className="btn-square-black shrink-0 flex items-center gap-1.5 text-[11px] disabled:opacity-50">
                {busy === "video" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />} Importer
              </button>
            </div>
            <input ref={videoInput} type="file" accept={VIDEO_TYPES.join(",")} className="hidden" onChange={(e) => { void pick("video", e.target.files?.[0]); e.target.value = ""; }} />
            <p className="text-[11px] text-[#888] mt-1">Conseil : 10 à 20 s en boucle, 1280×720 ou 1920×1080, sans son, moins de 10 Mo pour un chargement rapide sur mobile.</p>
          </div>
          <div>
            <span className={label}>Image de couverture (JPG, PNG, WebP — 5 Mo max.)</span>
            <div className="flex gap-2">
              <input aria-label="Lien de l'image de couverture" value={v.posterUrl} onChange={(e) => set("posterUrl", e.target.value)} className={input} />
              <button onClick={() => posterInput.current?.click()} disabled={busy !== null} className="btn-square-black shrink-0 flex items-center gap-1.5 text-[11px] disabled:opacity-50">
                {busy === "poster" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Importer
              </button>
            </div>
            <input ref={posterInput} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => { void pick("poster", e.target.files?.[0]); e.target.value = ""; }} />
            <p className="text-[11px] text-[#888] mt-1">Affichée pendant le chargement et sur les appareils en mode « animations réduites ».</p>
          </div>
          <div>
            <label className={label} htmlFor="hero-overlay">Assombrissement de la vidéo : {v.overlay} %</label>
            <input id="hero-overlay" type="range" min={0} max={85} value={v.overlay} onChange={(e) => set("overlay", Number(e.target.value))} className="w-full accent-[#FF6A00]" />
            <p className="text-[11px] text-[#888]">Augmentez si le texte est difficile à lire sur la vidéo.</p>
          </div>
        </div>

        {/* texts */}
        <div className="space-y-3">
          <div>
            <label className={label} htmlFor="hero-badge">Badge promo (vide = masqué)</label>
            <input id="hero-badge" maxLength={40} value={v.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Ex. Promo de la semaine -20 %" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="hero-title">Titre</label>
            <input id="hero-title" maxLength={90} value={v.title} onChange={(e) => set("title", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="hero-highlight">Fin du titre en vert (facultatif)</label>
            <input id="hero-highlight" maxLength={60} value={v.highlight} onChange={(e) => set("highlight", e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="hero-subtitle">Sous-titre</label>
            <textarea id="hero-subtitle" maxLength={220} rows={3} value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="w-full border border-[#DADAD9] px-3 py-2 text-[13px] outline-none focus:border-[#1A1F8A] resize-none" />
          </div>
          {dirty && (
            <p className="text-[12px] text-[#B45309] flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Modifications non enregistrées.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
