"use client";

import { Image as ImageIcon, BadgeCheck, Star } from "lucide-react";
import type { ProductT } from "@/lib/format";
import { formatPrice } from "@/lib/format";
import { useApp } from "@/lib/store";

export function ProductCard({ product }: { product: ProductT }) {
  const setView = useApp((s) => s.setView);
  const setProductId = useApp((s) => s.setProductId);
  const currency = useApp((s) => s.currency);

  const tiers = product.priceTiers;
  const min = tiers.length ? tiers[tiers.length - 1].price : 0;
  const max = tiers.length ? tiers[0].price : 0;

  function open() {
    setProductId(product.id);
    setView("product");
  }

  return (
    <div className="bg-white border border-[#DADAD9] flex flex-col group cursor-pointer">
      {/* image */}
      <div
        className="relative aspect-square overflow-hidden bg-[#ECECEC] cursor-zoom-in"
        onClick={open}
      >
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-2 right-2 bg-white/90 p-1.5 cursor-pointer hover:bg-white">
          <ImageIcon className="w-4 h-4 text-[#FF6A00]" strokeWidth={1.6} />
        </span>
        {product.readyToShip && (
          <span className="absolute top-2 left-2 bg-[#16A34A] text-white text-[10px] font-bold uppercase px-1.5 py-0.5">
            Ready to ship
          </span>
        )}
      </div>

      {/* certifications */}
      <div className="px-2 sm:px-3 pt-2 flex flex-wrap gap-1">
        {product.certifications.slice(0, 4).map((c) => (
          <span
            key={c}
            className="text-[9px] font-bold uppercase border border-[#DADAD9] text-[#333] px-1 py-0.5 leading-tight"
          >
            {c}
          </span>
        ))}
      </div>

      {/* title */}
      <h3
        className="px-2 sm:px-3 pt-1.5 text-[12px] sm:text-[13px] leading-snug text-[#333] line-clamp-2 hover:text-[#FF6A00] cursor-pointer min-h-[34px]"
        onClick={open}
      >
        {product.title}
      </h3>

      {/* reorder / lowest */}
      <div className="px-2 sm:px-3 pt-1 text-[10px] sm:text-[11px] truncate">
        {product.lowestPrice ? (
          <span className="text-[#FF6A00] font-semibold">
            ✓ 180-day lowest prices
          </span>
        ) : (
          <span className="text-[#16A34A] font-semibold">
            ✓ Reorder rate {Math.round(product.reorderRate)}%
          </span>
        )}
      </div>

      {/* price range */}
      <div className="px-2 sm:px-3 pt-1 leading-tight">
        <span className="text-[#FF6A00] font-extrabold text-[15px] sm:text-[17px] whitespace-nowrap">
          {formatPrice(min, currency)}
        </span>
        <span className="text-[#999] text-[12px]"> - </span>
        <span className="text-[#FF6A00] font-bold text-[12px] sm:text-[13px] whitespace-nowrap">
          {formatPrice(max, currency)}
        </span>
      </div>

      {/* moq + sold */}
      <div className="px-2 sm:px-3 pt-0.5 text-[10px] sm:text-[11px] text-[#666]">
        MOQ: {product.minOrder} {product.minOrderUnit}
        <span className="mx-1 text-[#DADAD9]">|</span>
        <span>{product.sold.toLocaleString()} sold</span>
      </div>

      {/* supplier verified */}
      <div className="px-2 sm:px-3 pt-1.5 pb-3 mt-auto flex items-center gap-1 text-[10px] sm:text-[11px] text-[#666] whitespace-nowrap overflow-hidden">
        {product.supplierVerified && (
          <span className="inline-flex items-center gap-1 text-[#16A34A] font-semibold">
            <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} />
            Verified
          </span>
        )}
        <span className="mx-1 text-[#DADAD9]">|</span>
        <span>
          {product.years} yrs · {product.country === "China" ? "CN" : product.country?.slice(0, 2).toUpperCase()}
        </span>
      </div>

      {/* rating footer */}
      <div className="px-2 sm:px-3 pb-2.5 flex items-center gap-1 text-[11px] text-[#888] border-t border-[#ECECEC] pt-2">
        <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
        <span className="font-semibold text-[#333]">{product.rating.toFixed(1)}</span>
        <span>({product.reviewCount})</span>
      </div>
    </div>
  );
}
