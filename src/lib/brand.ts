/**
 * Brand configuration — single source of truth for the site identity.
 * Change the name, logo or colours here instead of editing components.
 */
export const BRAND = {
  /** Full commercial name */
  name: "Ivoire Jobs Connexion",
  /** Short name / wordmark shown next to the logo */
  shortName: "I.JOBS.C",
  /** Brand slogan (from the logo) */
  slogan: "N'abandonne Jamais",
  /** Activity line used under the wordmark and in SEO */
  tagline: "Marché de gros B2B · Côte d'Ivoire",
  /** Logo assets (public/) */
  logo: {
    src: "/brand/ijobsc-logo.webp",
    fallback: "/brand/ijobsc-logo.png",
    alt: "Logo Ivoire Jobs Connexion (I.JOBS.C)",
  },
  /** Public contact / privacy e-mail (used on legal pages) — update when a pro mailbox exists */
  contactEmail: "guehipoegnansergej@gmail.com",
  /** Public contact e-mail domain — update when the real domain is live */
  emailDomain: "ijobsc.ci",
  /** WhatsApp business line (international format, digits only) — support + Mobile Money payments */
  whatsapp: "2250707365136",
  /**
   * Official WhatsApp icon for the floating button (download it from WhatsApp's brand
   * resources and put it in public/brand/, e.g. "/brand/whatsapp.svg"). null = generic icon.
   */
  whatsappIcon: "/brand/whatsapp-3d.webp" as string | null,
  /** Brand colours — primary blue + Ivorian harmony colours */
  colors: {
    primary: "#1A1F8A",
    primaryDark: "#0A0F4D",
    primaryLight: "#2E35C8",
    orange: "#FF6A00",
    green: "#16A34A",
    white: "#FFFFFF",
  },
} as const;

export const brandEmail = (user: string) => `${user}@${BRAND.emailDomain}`;

/** Link that opens a WhatsApp chat with the business line, message pre-filled. */
export const whatsappLink = (text: string) => `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;

/** Pre-filled message to pay orders in Mobile Money with the team. */
export const whatsappPaymentText = (refs: string[], amountFcfa: number) =>
  `Bonjour ${BRAND.name}, je viens de passer ${refs.length > 1 ? "les commandes" : "la commande"} ${refs.join(", ")} ` +
  `d'un montant de ${Math.round(amountFcfa).toLocaleString("fr-FR")} FCFA. Je souhaite payer par Mobile Money.`;
