import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: `Conditions d'utilisation de la place de marché ${BRAND.name}.`,
  alternates: { canonical: "/conditions" },
};

export default function TermsPage() {
  const mail = BRAND.contactEmail;
  return (
    <LegalPage title="Conditions d'utilisation" updated="15 octobre 2026">
      <p>
        Les présentes conditions encadrent l&apos;utilisation du site {BRAND.name} ({BRAND.shortName}). En créant un
        compte, vous les acceptez.
      </p>

      <Section title="1. Le service">
        <p>
          {BRAND.name} est une place de marché B2B qui permet aux acheteurs de trouver des produits en gros, de demander
          des devis et de contacter des marchands, et aux marchands vérifiés de présenter leurs produits.
        </p>
      </Section>

      <Section title="2. Comptes">
        <ul className="list-disc pl-5 space-y-1">
          <li>Vous devez fournir des informations exactes et garder votre mot de passe confidentiel.</li>
          <li>Vous êtes responsable des actions effectuées depuis votre compte.</li>
          <li>Un compte peut être créé avec une adresse e-mail ou avec votre compte Google.</li>
        </ul>
      </Section>

      <Section title="3. Marchands">
        <ul className="list-disc pl-5 space-y-1">
          <li>Tout compte marchand est vérifié par notre équipe avant de pouvoir vendre ; nous pouvons refuser une demande.</li>
          <li>Le marchand garantit l&apos;exactitude de ses offres (prix, quantités minimales, délais, conformité des produits) et respecte la réglementation applicable.</li>
          <li>Les produits illicites, contrefaits ou dangereux sont interdits.</li>
        </ul>
      </Section>

      <Section title="4. Acheteurs">
        <p>
          L&apos;acheteur s&apos;engage à utiliser le service de bonne foi, à fournir des demandes de devis sérieuses et à
          respecter les conditions convenues avec le marchand.
        </p>
      </Section>

      <Section title="5. Comportements interdits">
        <ul className="list-disc pl-5 space-y-1">
          <li>Usurper l&apos;identité d&apos;une personne ou d&apos;une entreprise.</li>
          <li>Tenter d&apos;accéder sans autorisation aux comptes ou aux systèmes.</li>
          <li>Publier des contenus frauduleux, trompeurs ou contraires à la loi.</li>
        </ul>
        <p>En cas de manquement, nous pouvons suspendre ou supprimer le compte concerné.</p>
      </Section>

      <Section title="6. Responsabilité">
        <p>
          {BRAND.name} met en relation acheteurs et marchands. Sauf mention contraire, les contrats de vente sont conclus
          directement entre eux. Nous faisons nos meilleurs efforts pour assurer la disponibilité et la sécurité du site,
          sans pouvoir garantir l&apos;absence totale d&apos;interruption.
        </p>
      </Section>

      <Section title="7. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans notre{" "}
          <a className="benjamin-link" href="/confidentialite">politique de confidentialité</a>.
        </p>
      </Section>

      <Section title="8. Droit applicable et contact">
        <p>
          Ces conditions sont régies par le droit ivoirien. Pour toute question :{" "}
          <a className="benjamin-link" href={`mailto:${mail}`}>{mail}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
