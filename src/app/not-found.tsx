import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="bg-white border border-[#DADAD9] max-w-md w-full p-8 text-center">
        <div className="text-[48px] font-extrabold text-[#1A1F8A] leading-none">404</div>
        <h1 className="text-[18px] font-bold text-[#222] mt-3">Page introuvable</h1>
        <p className="text-[13px] text-[#666] mt-2">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn-benjamin-orange inline-block mt-6">
          Retour à l&apos;accueil {BRAND.shortName}
        </Link>
      </div>
    </main>
  );
}
