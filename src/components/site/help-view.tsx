"use client";

import { useState } from "react";
import {
  Search, ChevronRight, MessageCircle, Mail, Bot, ShieldCheck,
  Rocket, Truck, CreditCard, ShieldAlert, UserCircle, FileText,
  Boxes, Phone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useApp } from "@/lib/store";
import { BRAND, brandEmail } from "@/lib/brand";

const CATEGORY_TILES = [
  { key: "start", label: "Premiers pas", icon: Rocket, body: "Passez votre première commande en quelques minutes" },
  { key: "orders", label: "Commandes et livraison", icon: Truck, body: "Suivi, expédition, délais de livraison" },
  { key: "payments", label: "Paiements", icon: CreditCard, body: "Mobile Money, virement bancaire, séquestre" },
  { key: "ta", label: "Commande protégée", icon: ShieldCheck, body: "Protection de commande et remboursements" },
  { key: "disputes", label: "Litiges", icon: ShieldAlert, body: "Résoudre un différend" },
  { key: "account", label: "Compte", icon: UserCircle, body: "Profil, mot de passe, paramètres" },
  { key: "rfq", label: "Demande de devis", icon: FileText, body: "Demandez des devis comme un pro" },
  { key: "drop", label: "Dropshipping", icon: Boxes, body: "Vendez sans stock" },
];

const FAQS = [
  {
    q: "Comment passer ma première commande en gros ?",
    a: "Recherchez un produit, choisissez une quantité supérieure ou égale au minimum de commande, puis cliquez sur « Ajouter au panier » ou « Acheter maintenant ». Vous pouvez payer par Mobile Money (MTN MoMo, Orange Money), par virement bancaire ou via le séquestre de la Commande protégée. Les boutiques vérifiées expédient dans le délai indiqué.",
  },
  {
    q: "Qu'est-ce que la Commande protégée et comment me protège-t-elle ?",
    a: `La Commande protégée est la protection gratuite des commandes de ${BRAND.name}. Votre paiement est conservé sous séquestre et n'est versé à la boutique qu'après votre confirmation de réception. Elle couvre l'expédition dans les délais, la qualité des produits et la conformité de la commande. Les réclamations sont traitées sous 7 jours.`,
  },
  {
    q: "Quels sont les délais de livraison en Côte d'Ivoire ?",
    a: "La livraison express (DHL/FedEx) atteint Abidjan en 3 à 5 jours ouvrés. Le fret aérien standard prend 7 à 12 jours. Le fret maritime via le port d'Abidjan prend 25 à 35 jours. Les délais sont indiqués sur chaque fiche produit, avec le délai de réponse de la boutique.",
  },
  {
    q: "Quels moyens de paiement sont acceptés ?",
    a: "Les acheteurs en Côte d'Ivoire et au Ghana peuvent payer par MTN MoMo, Orange Money, Vodafone Cash ou virement bancaire (XOF / GHS). Les acheteurs internationaux peuvent utiliser Visa, Mastercard ou un virement bancaire en USD. Toutes les commandes éligibles sont couvertes par la Commande protégée.",
  },
  {
    q: "Puis-je négocier des prix de gros ?",
    a: "Oui. Cliquez sur « Contacter la boutique » ou publiez une demande de devis en précisant la quantité, le prix visé et vos besoins de personnalisation. Les boutiques vérifiées répondent généralement en moins de 2 heures et proposent des prix dégressifs pour les gros volumes.",
  },
  {
    q: "Qu'est-ce qu'une demande de devis et quand l'utiliser ?",
    a: "Une demande de devis met plusieurs boutiques en concurrence pour votre commande. Utilisez-la pour des produits personnalisés, des quantités supérieures à 500 unités, ou si vous n'avez pas trouvé exactement ce qu'il vous faut dans la recherche. La plupart des demandes reçoivent 3 à 8 devis sous 24 heures.",
  },
  {
    q: "Comment fonctionnent les retours et remboursements ?",
    a: "Si un article ne correspond pas à sa description, ouvrez un litige dans les 15 jours suivant la livraison. La Commande protégée couvre le remboursement intégral en cas de problème de qualité, d'article manquant ou d'expédition en retard. Les remboursements validés sont versés sur votre moyen de paiement d'origine sous 5 à 10 jours ouvrés.",
  },
  {
    q: "Les boutiques sont-elles vérifiées ?",
    a: "Toutes les boutiques portant le badge vert « Vérifié » ont passé les contrôles d'immatriculation de l'entreprise, de compte bancaire et de licence commerciale. Les fabricants audités portent en plus un badge ISO. Vous pouvez demander un rapport d'audit récent depuis la page de n'importe quelle boutique.",
  },
  {
    q: `Puis-je faire du dropshipping avec ${BRAND.name} ?`,
    a: "Oui. Activez le mode Dropshipping dans les paramètres de votre compte et les boutiques retireront leur marque de vos colis. Vous pouvez aussi automatiser le traitement des commandes via notre API pour Shopify, WooCommerce ou TikTok Shop.",
  },
  {
    q: "Comment sont gérées les conversions de devises ?",
    a: "Tous les prix sont enregistrés en GHS (cedi ghanéen). Vous pouvez afficher les prix en XOF (franc CFA), en GHS ou en USD depuis la barre d'outils. Les conversions utilisent les taux moyens du marché, mis à jour toutes les heures.",
  },
];

export function HelpView() {
  const { setView } = useApp();
  const [q, setQ] = useState("");

  return (
    <div className="bg-[#ECECEC] min-h-screen">

      <div className="benjamin-bar">Centre d&apos;aide</div>

      <div className="bg-brand-gradient text-white">
        <div className="max-w-[900px] mx-auto px-4 py-10 text-center">
          <h1 className="text-[26px] lg:text-[34px] font-extrabold leading-tight">
            Comment pouvons-nous vous aider ?
          </h1>
          <p className="text-[#CFD6F5] text-[13px] mt-2 max-w-xl mx-auto">
            Recherchez un article, parcourez les rubriques ou discutez avec notre équipe 24 h/24, 7 j/7.
          </p>
          <div className="mt-5 max-w-xl mx-auto flex items-center bg-white h-12 border-2 border-[#FF6A00]">
            <Search className="w-5 h-5 text-[#999] ml-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && toast.info(`Recherche : « ${q || "…"} »`)}
              placeholder="Rechercher dans l'aide…"
              className="flex-1 h-full px-3 text-[13px] text-[#333] outline-none bg-transparent placeholder:text-[#999]"
            />
            <button
              onClick={() => toast.info(`Recherche : « ${q || "…"} »`)}
              className="bg-[#FF6A00] text-white px-5 h-full font-bold uppercase tracking-wider hover:bg-[#E55A00] flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Rechercher
            </button>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
            {["Commande protégée", "Livraison en Côte d'Ivoire", "Remboursements", "Demande de devis"].map((s) => (
              <button
                key={s}
                onClick={() => { setQ(s); toast.info(`Recherche : « ${s} »`); }}
                className="bg-white/10 hover:bg-[#FF6A00] px-2.5 py-1 border border-white/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-3 lg:px-6 py-8 space-y-8">
        {/* CATEGORY TILES */}
        <section>
          <div className="benjamin-section-title mb-3">Parcourir par rubrique</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {CATEGORY_TILES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => toast.info(`Ouverture : ${c.label}`)}
                  className="benjamin-tile flex-col items-start !p-4 text-left"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="w-4 h-4 text-[#FF6A00] shrink-0" />
                    <span className="font-bold text-[13px] flex-1">{c.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 benjamin-tile-arrow" />
                  </div>
                  <span className="text-[11px] mt-1 text-[#666] group-hover:text-white/80">{c.body}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <div className="bg-white border border-[#DADAD9]">
            <div className="benjamin-bar">Questions fréquentes</div>
            <Accordion type="single" collapsible className="px-4">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#ECECEC]">
                  <AccordionTrigger className="text-[13px] font-semibold hover:text-[#FF6A00] hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[12px] text-[#555] leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* AI ASSISTANT PROMO */}
          <aside className="space-y-5">
            <div className="bg-[#0A0F4D] text-white">
              <div className="benjamin-bar-red">Assistant IA</div>
              <div className="p-5">
                <div className="w-12 h-12 bg-[#FF6A00] flex items-center justify-center mb-3">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-[18px] font-extrabold leading-tight">
                  Des réponses instantanées
                </h3>
                <p className="text-[12px] text-[#CFD6F5] mt-2 leading-relaxed">
                  Rédigez vos demandes de devis, comparez les offres, traduisez les fiches techniques et réglez vos litiges —
                  le tout avec l&apos;Assistant IA {BRAND.shortName}. Disponible 24 h/24, 7 j/7.
                </p>
                <button
                  onClick={() => toast.success("Ouverture de l'Assistant IA…")}
                  className="btn-benjamin-orange w-full mt-4"
                >
                  Essayer l&apos;Assistant IA
                </button>
              </div>
            </div>

            {/* contact strip */}
            <div className="bg-white border border-[#DADAD9]">
              <div className="benjamin-bar">Besoin d&apos;aide supplémentaire ?</div>
              <div className="p-4 space-y-2.5">
                <button
                  onClick={() => {
                    useApp.getState().setChatSupplierId(null);
                    useApp.getState().setChatProductId(null);
                    useApp.getState().setView("chat");
                  }}
                  className="btn-square-black w-full flex items-center gap-2 justify-center"
                >
                  <MessageCircle className="w-4 h-4" /> Discuter maintenant
                </button>
                <a
                  href="https://wa.me/2250707365136"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:opacity-90"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp : +225 0707 36 51 36
                </a>
                <a
                  href="tel:+2250707365136"
                  className="w-full inline-flex items-center justify-center gap-2 border border-[#DADAD9] text-[#222] text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:bg-[#F5F5F5]"
                >
                  <Phone className="w-4 h-4" /> Appeler : +225 0707 36 51 36
                </a>
                <a
                  href={`mailto:${brandEmail("support")}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#337AB7] text-white text-[12px] font-bold uppercase tracking-wide px-4 py-2.5 hover:opacity-90"
                >
                  <Mail className="w-4 h-4" /> Écrire au support
                </a>
                <div className="text-[11px] text-[#888] pt-1 text-center">
                  Délai de réponse moyen : <span className="font-bold text-[#16A34A]">moins de 2 min</span>
                </div>
              </div>
            </div>

            {/* popular quick links */}
            <div className="bg-white border border-[#DADAD9] p-4">
              <div className="benjamin-section-title mb-2">Actions rapides</div>
              <ul className="text-[12px] space-y-1">
                <QuickLink label="Ouvrir un litige" onClick={() => toast.info("Ouverture du formulaire de litige")} />
                <QuickLink label="Suivre une commande" onClick={() => toast.info("Suivi de commande")} />
                <QuickLink label="Demander un devis" onClick={() => setView("rfq")} />
                <QuickLink label="Devenir vendeur" onClick={() => setView("auth")} />
                <QuickLink label="Parcourir les produits" onClick={() => setView("home")} />
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full text-left flex items-center justify-between group py-1.5 hover:text-[#FF6A00]">
        <span>{label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#FF6A00] opacity-0 group-hover:opacity-100" />
      </button>
    </li>
  );
}
