"use client";

import {
  MessageSquare, Bot, Image as ImageIcon, HelpCircle, ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

const TOOLS = [
  { icon: MessageSquare, label: "MESSAGES", color: "#FF6A00" },
  { icon: Bot, label: "AI ASSISTANT", color: "#FF6A00" },
  { icon: ImageIcon, label: "IMAGE SEARCH", color: "#FF6A00" },
  { icon: HelpCircle, label: "HELP", color: "#FF6A00" },
];

export function RightToolbar() {
  const [showTop, setShowTop] = useState(false);
  const setView = useApp((s) => s.setView);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col">
      <div className="bg-[#2a2a2a] border border-[#000] flex flex-col">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            onClick={() => {
              if (t.label === "HELP") setView("help");
              else if (t.label === "MESSAGES") setView("chat");
            }}
            className="group flex flex-col items-center justify-center w-12 py-3 border-b border-[#1a1a1a] hover:bg-[#FF6A00] transition-colors"
            title={t.label}
          >
            <t.icon className="w-4 h-4" style={{ color: t.color }} strokeWidth={1.8} />
            <span className="text-[8px] text-white font-bold uppercase tracking-tight mt-1 group-hover:text-white">
              {t.label}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowTop(false)}
          disabled={!showTop}
          className="group flex flex-col items-center justify-center w-12 py-3 hover:bg-[#FF6A00] disabled:hover:bg-[#2a2a2a] transition-colors"
          title="BACK TO TOP"
        >
          <ChevronUp
            className="w-4 h-4"
            style={{ color: showTop ? "#FF6A00" : "#666" }}
            strokeWidth={1.8}
          />
          <span className="text-[8px] text-white font-bold uppercase tracking-tight mt-1">
            TOP
          </span>
        </button>
      </div>
    </div>
  );
}
