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
  /** Public contact e-mail domain — update when the real domain is live */
  emailDomain: "ijobsc.ci",
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
