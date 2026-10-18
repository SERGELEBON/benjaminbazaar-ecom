/** Home hero settings (shared by client and server). */
export type HeroSettings = {
  /** Background video (MP4/WebM), looped and muted. */
  videoUrl: string;
  /** Still image shown while the video loads, on slow connections and for "reduced motion". */
  posterUrl: string;
  /** Small promo label above the title (empty = hidden). */
  badge: string;
  title: string;
  /** End of the title, highlighted in green (empty = none). */
  highlight: string;
  subtitle: string;
  /** Dark overlay over the video, 0–85 % (keeps the text readable). */
  overlay: number;
};

export const HERO_DEFAULTS: HeroSettings = {
  videoUrl: "/hero/hero-default.mp4",
  posterUrl: "/hero/hero-poster.jpg",
  badge: "Sourcing B2B · Côte d'Ivoire",
  title: "Sourcez plus intelligemment auprès de",
  highlight: "fabricants vérifiés",
  subtitle:
    "Produits en gros · Boutiques vérifiées · Paiement à la livraison ou Mobile Money · Livraison en Côte d'Ivoire, Afrique de l'Ouest & dans le monde.",
  overlay: 45,
};
