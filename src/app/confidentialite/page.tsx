import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${BRAND.name} collecte, utilise et protège vos données personnelles.`,
  alternates: { canonical: "/confidentialite" },
};

export default function PrivacyPage() {
  const mail = BRAND.contactEmail;
  return (
    <LegalPage title="Politique de confidentialité" updated="15 octobre 2026">
      <p>
        {BRAND.name} ({BRAND.shortName}) est une place de marché B2B qui met en relation des acheteurs et des
        marchands, principalement en Côte d&apos;Ivoire et en Afrique de l&apos;Ouest. Cette politique explique quelles
        données nous collectons, pourquoi, et quels sont vos droits.
      </p>

      <Section title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est l&apos;équipe {BRAND.name}. Pour toute question relative à vos données :{" "}
          <a className="benjamin-link" href={`mailto:${mail}`}>{mail}</a>.
        </p>
      </Section>

      <Section title="2. Données que nous collectons">
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Compte</b> : nom, adresse e-mail, téléphone (facultatif pour les clients), rôle (client, marchand).</li>
          <li><b>Marchands</b> : nom de l&apos;entreprise, ville, pays, téléphone / WhatsApp.</li>
          <li><b>Connexion avec Google</b> : avec votre accord, Google nous transmet votre nom, votre adresse e-mail et votre photo de profil. Nous ne recevons jamais votre mot de passe Google.</li>
          <li><b>Activité</b> : demandes de devis, commandes, favoris, messages avec les marchands.</li>
          <li><b>Données techniques</b> : date de dernière connexion et journaux de sécurité nécessaires au fonctionnement du service.</li>
        </ul>
        <p>Votre mot de passe est chiffré par notre prestataire d&apos;authentification ; il n&apos;est jamais stocké en clair ni accessible par notre équipe.</p>
      </Section>

      <Section title="3. Pourquoi nous utilisons vos données">
        <ul className="list-disc pl-5 space-y-1">
          <li>Créer et sécuriser votre compte, vous connecter et vous permettre de réinitialiser votre mot de passe.</li>
          <li>Vérifier les marchands avant qu&apos;ils puissent vendre, pour protéger les acheteurs.</li>
          <li>Traiter vos demandes de devis et commandes, et vous mettre en relation avec les marchands concernés.</li>
          <li>Vous envoyer les e-mails liés au service (confirmation de compte, sécurité, suivi de commande).</li>
          <li>Prévenir la fraude et les abus.</li>
        </ul>
        <p>Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires sans votre consentement.</p>
      </Section>

      <Section title="4. Partage et hébergement">
        <p>Vos données sont traitées par des prestataires techniques qui agissent pour notre compte :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Supabase</b> : base de données et authentification, hébergées dans l&apos;Union européenne (Francfort, Allemagne).</li>
          <li><b>Vercel</b> : hébergement du site.</li>
          <li><b>Google</b> : uniquement si vous choisissez « Continuer avec Google ».</li>
        </ul>
        <p>Lorsque vous contactez un marchand ou passez commande, les informations nécessaires (nom, e-mail, téléphone, détails de la demande) lui sont transmises.</p>
      </Section>

      <Section title="5. Durée de conservation">
        <p>
          Les données de votre compte sont conservées tant que votre compte est actif. Vous pouvez demander sa suppression
          à tout moment ; certaines données liées aux commandes peuvent être conservées pendant la durée exigée par la loi
          (obligations comptables et fiscales).
        </p>
      </Section>

      <Section title="6. Vos droits">
        <p>
          Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère
          personnel (et, le cas échéant, au RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification,
          d&apos;opposition et de suppression de vos données. Pour l&apos;exercer, écrivez-nous à{" "}
          <a className="benjamin-link" href={`mailto:${mail}`}>{mail}</a>. Vous pouvez aussi saisir l&apos;ARTCI
          (Autorité de Régulation des Télécommunications/TIC de Côte d&apos;Ivoire).
        </p>
        <p>Si vous vous êtes connecté avec Google, vous pouvez retirer l&apos;accès à tout moment depuis les paramètres de votre compte Google.</p>
      </Section>

      <Section id="cookies" title="7. Cookies">
        <p>
          Nous utilisons uniquement des cookies nécessaires au fonctionnement du site, en particulier le cookie de session
          qui vous garde connecté de manière sécurisée. Nous n&apos;utilisons pas de cookies publicitaires.
        </p>
      </Section>

      <Section title="8. Sécurité">
        <p>
          Les échanges sont chiffrés (HTTPS), les mots de passe sont chiffrés et les accès sont contrôlés selon votre rôle.
          Aucun système n&apos;est infaillible : en cas d&apos;incident affectant vos données, nous vous en informerons.
        </p>
      </Section>

      <Section title="9. Modifications">
        <p>Nous pouvons mettre à jour cette politique. La date de mise à jour figure en haut de la page.</p>
      </Section>
    </LegalPage>
  );
}
