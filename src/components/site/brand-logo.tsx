import { BRAND } from "@/lib/brand";

type Props = {
  /** "light" for light backgrounds (header), "dark" for dark backgrounds (footer) */
  variant?: "light" | "dark";
  /** Logo size in px */
  size?: number;
  /** Show the full name under the wordmark */
  showName?: boolean;
  className?: string;
};

export function BrandLogo({ variant = "light", size = 44, showName = true, className = "" }: Props) {
  const dark = variant === "dark";
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <picture className="shrink-0">
        <source srcSet={BRAND.logo.src} type="image/webp" />
        <img
          src={BRAND.logo.fallback}
          alt={BRAND.logo.alt}
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="rounded-full"
          decoding="async"
        />
      </picture>
      <span className="leading-none text-left">
        <span className={`block font-extrabold tracking-tight text-[18px] sm:text-[20px] ${dark ? "text-white" : "text-[#1A1F8A]"}`}>
          {BRAND.shortName}
        </span>
        {showName && (
          <span className="block text-[10px] sm:text-[11px] font-bold mt-0.5 whitespace-nowrap">
            <span className="text-[#FF6A00]">Ivoire</span>{" "}
            <span className={dark ? "text-white" : "text-[#0A0F4D]"}>Jobs</span>{" "}
            <span className="text-[#16A34A]">Connexion</span>
          </span>
        )}
      </span>
    </span>
  );
}
