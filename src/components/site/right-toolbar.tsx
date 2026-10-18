"use client";

import {
  MessageSquare, Bot, Image as ImageIcon, HelpCircle, ChevronUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

const TOOLS = [
  { key: "messages", icon: MessageSquare, label: "Messages", color: "#FF6A00" },
  { key: "ai", icon: Bot, label: "Assistant IA", color: "#FF6A00" },
  { key: "image", icon: ImageIcon, label: "Recherche image", color: "#FF6A00" },
  { key: "help", icon: HelpCircle, label: "Aide", color: "#FF6A00" },
];

export function RightToolbar() {
  const [showTop, setShowTop] = useState(false);
  const setView = useApp((s) => s.setView);
  const chatUnread = useApp((s) => s.chatUnread);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col">
      <div className="bg-[#2a2a2a] border border-[#0A0F4D] flex flex-col">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === "help") setView("help");
              else if (t.key === "messages") setView("chat");
            }}
            className="group flex flex-col items-center justify-center w-12 py-3 border-b border-[#1a1a1a] hover:bg-[#FF6A00] transition-colors"
            title={t.label}
          >
            <span className="relative">
              <t.icon className="w-4 h-4" style={{ color: t.color }} strokeWidth={1.8} />
              {t.key === "messages" && chatUnread > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-[#16A34A] text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 flex items-center justify-center">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </span>
            <span className="text-[8px] text-white font-bold uppercase tracking-tight mt-1 group-hover:text-white">
              {t.label}
            </span>
          </button>
        ))}
        <button
          onClick={() => setShowTop(false)}
          disabled={!showTop}
          className="group flex flex-col items-center justify-center w-12 py-3 hover:bg-[#FF6A00] disabled:hover:bg-[#2a2a2a] transition-colors"
          title="Retour en haut"
        >
          <ChevronUp
            className="w-4 h-4"
            style={{ color: showTop ? "#FF6A00" : "#666" }}
            strokeWidth={1.8}
          />
          <span className="text-[8px] text-white font-bold uppercase tracking-tight mt-1">
            Haut
          </span>
        </button>
      </div>
    </div>
  );
}
