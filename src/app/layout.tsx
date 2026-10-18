import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/brand";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const SITE_TITLE = `${BRAND.name} (${BRAND.shortName}) — Marché de gros B2B en Côte d'Ivoire`;
const SITE_DESCRIPTION = `${BRAND.name} connecte les acheteurs aux fabricants vérifiés dans le monde entier. Sourcez des produits, demandez des devis, personnalisez et échangez en toute confiance. Paiement en XOF, livraison en Côte d'Ivoire et en Afrique de l'Ouest.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://benjaminbazaar-ecom.vercel.app"),
  title: { default: SITE_TITLE, template: `%s | ${BRAND.shortName}` },
  description: SITE_DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [
    BRAND.name,
    BRAND.shortName,
    "marché de gros",
    "marketplace B2B",
    "fabricants",
    "Côte d'Ivoire",
    "Afrique de l'Ouest",
    "sourcing",
    "demande de devis",
    "XOF",
  ],
  authors: [{ name: BRAND.name }],
  openGraph: {
    title: SITE_TITLE,
    description: `Sourcez auprès de fabricants vérifiés. Commandes sécurisées, assistant IA, livraison mondiale. ${BRAND.slogan} !`,
    siteName: BRAND.name,
    locale: "fr_CI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.primaryDark,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${openSans.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
