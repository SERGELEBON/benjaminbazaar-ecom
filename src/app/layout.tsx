import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BENJAMINBAZAAR — Marché de gros B2B en Côte d'Ivoire",
  description:
    "BENJAMINBAZAAR connecte les acheteurs aux fabricants vérifiés dans le monde entier. Sourcez des produits, demandez des devis, personnalisez et échangez avec Trade Assurance. Paiement en XOF, livraison en Côte d'Ivoire et en Afrique de l'Ouest.",
  keywords: [
    "BENJAMINBAZAAR",
    " marché de gros",
    "marketplace B2B",
    "fabricants",
    "Côte d'Ivoire",
    "Afrique de l'Ouest",
    "sourcing",
    "demande de devis",
    "XOF",
  ],
  authors: [{ name: "BENJAMINBAZAAR" }],
  openGraph: {
    title: "BENJAMINBAZAAR — Marché de gros B2B en Côte d'Ivoire",
    description:
      "Soursez auprès de fabricants vérifiés. Trade Assurance, assistant IA, livraison mondiale.",
    siteName: "BENJAMINBAZAAR",
    type: "website",
  },
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
