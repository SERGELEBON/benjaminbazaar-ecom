"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { MessageCircle } from "lucide-react";

const PHONE = "2250707365136"; // BENJAMINBAZAAR WhatsApp business line (Côte d'Ivoire)

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
    ? `Bonjour BENJAMINBAZAAR, je suis intéressé par : ${productName}`
    : "Bonjour BENJAMINBAZAAR, j'aimerais une assistance pour mon sourcing.";

  const href = `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-[60] group flex items-center"
      aria-label="Chat with us on WhatsApp"
    >
      <span className="wa-pulse w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-none">
        <MessageCircle className="w-7 h-7" strokeWidth={2} />
      </span>
      <span className="ml-2 hidden group-hover:block bg-black text-white text-[11px] uppercase font-bold tracking-wide px-2 py-1 whitespace-nowrap">
        Chat with us
      </span>
    </a>
  );
}
