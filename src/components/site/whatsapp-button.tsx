"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { MessageCircle, Phone } from "lucide-react";
import { BRAND, whatsappLink } from "@/lib/brand";

export function WhatsAppButton() {
  const view = useApp((s) => s.view);
  const productId = useApp((s) => s.productId);
  const [productName, setProductName] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      let name = "";
      if (view === "product" && productId) {
        try {
          const r = await fetch(`/api/products/${productId}`);
          const d = await r.json();
          if (d?.product?.title) name = d.product.title;
        } catch {
          /* ignore */
        }
      }
      if (active) setProductName(name);
    })();
    return () => {
      active = false;
    };
  }, [view, productId]);

  const text = productName
    ? `Bonjour ${BRAND.name}, je suis intéressé par : ${productName}`
    : `Bonjour ${BRAND.name}, j'aimerais une assistance pour mon sourcing.`;

  const href = whatsappLink(text);

  // The chat has its own composer at the bottom of the screen: avoid covering it.
  if (view === "chat") return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`wa-fab fixed left-4 md:left-6 z-[60] group flex items-center ${view === "product" ? "bottom-20 lg:bottom-6" : "bottom-4 md:bottom-6"}`}
      aria-label="Discuter avec nous sur WhatsApp"
    >
      <span className="relative isolate w-14 h-14 md:w-[60px] md:h-[60px] bg-[#25D366] hover:bg-[#1EBE5A] transition-colors flex items-center justify-center text-white border-2 border-white">
        <span className="wa-ring absolute inset-0 bg-[#25D366]" aria-hidden="true" />
        {BRAND.whatsappIcon ? (
          // Official WhatsApp glyph supplied by the site owner (public/brand/…).
          <img src={BRAND.whatsappIcon} alt="" className="relative w-8 h-8 md:w-9 md:h-9" />
        ) : (
          <span className="relative">
            <MessageCircle className="w-8 h-8 md:w-9 md:h-9" strokeWidth={2} />
            <Phone className="absolute inset-0 m-auto w-3.5 h-3.5 md:w-4 md:h-4 fill-white" strokeWidth={0} />
          </span>
        )}
      </span>
      <span className="ml-2 hidden md:group-hover:flex flex-col bg-white text-[#111] border border-[#DADAD9] px-3 py-1.5 whitespace-nowrap">
        <span className="text-[12px] font-bold">Besoin d&apos;aide ?</span>
        <span className="text-[11px] text-[#16A34A] font-semibold">Écrivez-nous sur WhatsApp</span>
      </span>
    </a>
  );
}
