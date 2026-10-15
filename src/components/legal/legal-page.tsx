import type { ReactNode } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Shared layout for static legal pages (server component, indexable). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F4F5FB]">
      <header className="bg-brand-gradient text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src={BRAND.logo.fallback} alt={BRAND.logo.alt} width={44} height={44} className="rounded-full" />
            <span className="leading-tight">
              <span className="block font-extrabold text-[18px]">{BRAND.shortName}</span>
              <span className="block text-[11px] text-[#CFD6F5]">{BRAND.name}</span>
            </span>
          </Link>
          <Link href="/" className="text-[12px] font-bold uppercase tracking-wide border border-white/40 px-3 py-2 hover:bg-white/10">
            ← Retour au site
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="bg-white border border-[#DADAD9] p-6 sm:p-10 legal-content">
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-[#0A0F4D] leading-tight">{title}</h1>
          <p className="text-[12px] text-[#888] mt-2">Dernière mise à jour : {updated}</p>
          <div className="mt-6 space-y-6 text-[14px] leading-relaxed text-[#333]">{children}</div>
        </article>
        <p className="text-center text-[12px] text-[#666] mt-6">
          <Link href="/confidentialite" className="hover:underline">Confidentialité</Link> ·{" "}
          <Link href="/conditions" className="hover:underline">Conditions d&apos;utilisation</Link> ·{" "}
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </main>
    </div>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-[18px] font-bold text-[#1A1F8A] mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
