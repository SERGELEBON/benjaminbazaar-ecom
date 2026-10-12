"use client";

import { useApp } from "@/lib/store";
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Apple, Smartphone } from "lucide-react";

const COLS: { title: string; links: string[] }[] = [
  {
    title: "Obtenir de l'aide",
    links: ["Centre d'aide", "Chat en direct", "Déposer une réclamation", "Signaler une activité suspecte", "Politiques & règles"],
  },
  {
    title: "Paiements & protections",
    links: ["Trade Assurance", "Paiement sécurisé", "Protection remboursement", "Résolution des litiges", "Vérification fournisseur"],
  },
  {
    title: "Sourcer sur BENJAMINBAZAAR",
    links: ["Demande de devis", "Top classement", "Dropshipping", "Personnalisation rapide", "Assistant IA sourcing"],
  },
  {
    title: "Vendre sur BENJAMINBAZAAR",
    links: ["Devenir fournisseur", "Tableau de bord fournisseur", "Services de vérification", "Publicité", "Design de boutique"],
  },
  {
    title: "À propos de nous",
    links: ["À propos de BENJAMINBAZAAR", "Carrières", "Communiqués de presse", "Durabilité", "Contactez-nous"],
  },
];

export function Footer() {
  const setView = useApp((s) => s.setView);

  return (
    <footer className="mt-auto bg-[#1b3a28] text-[#c8e0d2] border-t-2 border-[#16A34A]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6 py-9">
        {/* Brand row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7 pb-6 border-b border-[#2a5040]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#16A34A] flex items-center justify-center">
              <span className="text-white font-extrabold text-[18px]">B</span>
            </div>
            <div>
              <div className="text-[18px] font-extrabold tracking-tight text-white uppercase">
                BENJAMIN<span className="text-[#4ade80]">BAZAAR</span>
              </div>
              <div className="text-[10px] text-[#7fa896] uppercase tracking-wider">
                Marché de gros B2B · Côte d'Ivoire 🇨🇮
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#7fa896] uppercase tracking-wide mr-2">Suivez-nous</span>
            {[Facebook, Twitter, Instagram, Youtube, Linkedin].map((Ic, i) => (
              <a
                key={i}
                href="#"
                className="w-8 h-8 border border-[#2a5040] flex items-center justify-center hover:bg-[#16A34A] hover:border-[#16A34A] transition-colors"
              >
                <Ic className="w-4 h-4 text-[#c8e0d2] hover:text-white" strokeWidth={1.6} />
              </a>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {COLS.map((c) => (
            <div key={c.title}>
              <h4 className="text-[#4ade80] uppercase font-bold tracking-wide text-[12px] mb-3">{c.title}</h4>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <button
                      className="text-[12px] text-left text-[#a8c4b4] hover:text-white hover:underline transition-colors"
                      onClick={() => {
                        if (l === "Demande de devis") setView("rfq");
                        else if (l === "Top classement") setView("ranking");
                        else if (l === "Dropshipping") setView("dropshipping");
                        else if (l === "Devenir fournisseur" || l === "Tableau de bord fournisseur") setView("supplier-dashboard");
                        else if (l === "Centre d'aide" || l === "Chat en direct") setView("help");
                        else if (l === "À propos de BENJAMINBAZAAR") setView("home");
                        else if (l === "Assistant IA sourcing") setView("help");
                      }}
                    >
                      {l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* app download */}
          <div>
            <h4 className="text-[#4ade80] uppercase font-bold tracking-wide text-[12px] mb-3">Restez connecté</h4>
            <div className="flex flex-col gap-2">
              <button className="flex items-center gap-2 border border-[#2a5040] px-3 py-2 hover:border-[#16A34A] hover:bg-[#0e2a1c] transition-colors">
                <Apple className="w-4 h-4 text-white" />
                <div className="text-left leading-tight">
                  <div className="text-[9px] text-[#7fa896]">Télécharger sur</div>
                  <div className="text-[11px] text-white font-semibold">App Store</div>
                </div>
              </button>
              <button className="flex items-center gap-2 border border-[#2a5040] px-3 py-2 hover:border-[#16A34A] hover:bg-[#0e2a1c] transition-colors">
                <Smartphone className="w-4 h-4 text-white" />
                <div className="text-left leading-tight">
                  <div className="text-[9px] text-[#7fa896]">Disponible sur</div>
                  <div className="text-[11px] text-white font-semibold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* trust badges */}
        <div className="mt-7 pt-5 border-t border-[#2a5040] flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#7fa896]">
          <span className="flex items-center gap-1.5"><span className="text-[#4ade80]">✓</span> Trade Assurance</span>
          <span className="text-[#2a5040]">|</span>
          <span className="flex items-center gap-1.5"><span className="text-[#4ade80]">✓</span> Paiement sécurisé</span>
          <span className="text-[#2a5040]">|</span>
          <span className="flex items-center gap-1.5"><span className="text-[#4ade80]">✓</span> Fournisseurs vérifiés</span>
          <span className="text-[#2a5040]">|</span>
          <span className="flex items-center gap-1.5"><span className="text-[#4ade80]">✓</span> Livraison en Côte d'Ivoire 🇨🇮</span>
        </div>

        {/* legal */}
        <div className="border-t border-[#2a5040] mt-6 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-[11px] text-[#7fa896]">
            © {new Date().getFullYear()} BENJAMINBAZAAR. Tous droits réservés. Marché de gros B2B — Côte d'Ivoire.
          </div>
          <div className="flex flex-wrap gap-4 text-[11px]">
            <a href="#" className="text-[#a8c4b4] hover:text-white hover:underline">Politique de confidentialité</a>
            <a href="#" className="text-[#a8c4b4] hover:text-white hover:underline">Conditions d'utilisation</a>
            <a href="#" className="text-[#a8c4b4] hover:text-white hover:underline">Cookies</a>
            <a href="#" className="text-[#a8c4b4] hover:text-white hover:underline">Mentions légales</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
