"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  MessageCircle, Search, Plus, Paperclip, Smile, Send, Phone, Video,
  Info, ArrowLeft, BadgeCheck, ShieldCheck, Star, ChevronRight, Loader2,
  WifiOff, AlertCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { toast } from "sonner";

// ---------------- Types ----------------
interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  senderRole: "buyer" | "supplier";
  senderName: string;
  createdAt: string;
}

interface ConversationListItem {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierAvatar: string;
  supplierCity: string;
  supplierCountry: string;
  supplierVerified: boolean;
  storeRating: number;
  responseTime: string;
  productId?: string | null;
  productTitle?: string | null;
  productImage?: string | null;
  unread: number;
  lastMessage: string;
  lastMessageAt: string | null;
  lastSenderRole: "buyer" | "supplier" | null;
}

const QUICK_REPLIES = [
  "Quel est le prix ?",
  "Quelle est la quantité minimum ?",
  "Délai de livraison ?",
  "Puis-je avoir un échantillon ?",
];

// ---------------- Helpers ----------------
function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const msg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msg.getTime() === today.getTime()) return "Aujourd'hui";
  if (msg.getTime() === yesterday.getTime()) return "Hier";
  return msg.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

// ---------------- Component ----------------
export function ChatView() {
  const { chatSupplierId, chatProductId, setChatSupplierId, setChatProductId, setView } = useApp();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState("");

  // Mobile: which panel to show
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEmittedTypingStart = useRef(false);
  // Refs to read latest state inside socket callbacks without re-subscribing.
  const activeIdRef = useRef<string | null>(null);

  // ---------- Conversation selection ----------
  const selectConversation = (id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
    setMessages([]);
    setTyping(false);
    setLoadingHistory(true);
    setMobilePanel("chat");
    setSocket((sock) => {
      if (sock) {
        sock.emit("conversation:join", {
          conversationId: id,
          userId: "me",
          role: "buyer",
        });
      }
      return sock;
    });
  };

  // ---------- Socket lifecycle (mount once) ----------
  useEffect(() => {
    const sock = io("/?XTransformPort=3004", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10_000,
    });
    // Defer setState to avoid synchronous setState in effect body.
    queueMicrotask(() => setSocket(sock));

    sock.on("connect", () => {
      setConnected(true);
      setReconnecting(false);
      sock.emit("conversation:list", {});
      // If we already had an active conversation, re-join.
      if (activeIdRef.current) {
        sock.emit("conversation:join", {
          conversationId: activeIdRef.current,
          userId: "me",
          role: "buyer",
        });
      }
    });
    sock.on("disconnect", () => {
      setConnected(false);
    });
    sock.on("connect_error", () => {
      setConnected(false);
      setReconnecting(true);
    });
    sock.on("reconnect_attempt", () => {
      setReconnecting(true);
    });
    sock.on("reconnect", () => {
      setReconnecting(false);
      setConnected(true);
      sock.emit("conversation:list", {});
      if (activeIdRef.current) {
        sock.emit("conversation:join", {
          conversationId: activeIdRef.current,
          userId: "me",
          role: "buyer",
        });
      }
    });

    sock.on("conversations:list", (payload: ConversationListItem[]) => {
      setConversations(payload);
    });

    sock.on("conversation:history", (payload: { conversationId: string; messages: ChatMessage[] }) => {
      if (payload.conversationId === activeIdRef.current) {
        setMessages(payload.messages);
        setLoadingHistory(false);
        // Auto-scroll after a tick.
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
        }, 30);
      }
    });

    sock.on("message:new", (msg: ChatMessage) => {
      if (msg.conversationId === activeIdRef.current) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 30);
      }
      // Refresh conversation list (last message preview / unread).
      sock.emit("conversation:list", {});
    });

    sock.on("typing:update", (payload: { conversationId: string; typing: boolean; role: "buyer" | "supplier" }) => {
      if (payload.conversationId === activeIdRef.current && payload.role === "supplier") {
        setTyping(payload.typing);
      }
    });

    return () => {
      sock.disconnect();
    };
  }, []);

  // ---------- Auto-select conversation based on chatSupplierId from store ----------
  useEffect(() => {
    if (!socket || conversations.length === 0) return;
    // If a supplier context is set and matches an existing conversation, pick it.
    if (chatSupplierId) {
      const match = conversations.find((c) => c.supplierId === chatSupplierId);
      if (match) {
        // Defer to avoid synchronous setState in effect body.
        const id = match.id;
        queueMicrotask(() => selectConversation(id));
        return;
      }
    }
    // Otherwise default to the first conversation (just highlight, don't join).
    if (!activeId && conversations.length > 0) {
      const firstId = conversations[0].id;
      queueMicrotask(() => {
        setActiveId(firstId);
        activeIdRef.current = firstId;
      });
    }
  }, [chatSupplierId, chatProductId, conversations, socket]);

  // ---------- Send message ----------
  function sendMessage(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || !socket || !activeId) return;
    socket.emit("message:send", {
      conversationId: activeId,
      content,
      senderRole: "buyer",
      senderName: "You",
    });
    // Stop typing indicator on our side.
    if (hasEmittedTypingStart.current) {
      socket.emit("typing:stop", { conversationId: activeId, role: "buyer" });
      hasEmittedTypingStart.current = false;
    }
    setDraft("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  // ---------- Typing indicator (buyer side → notify supplier) ----------
  function handleDraftChange(value: string) {
    setDraft(value);
    if (!socket || !activeId) return;
    if (!hasEmittedTypingStart.current && value.trim().length > 0) {
      socket.emit("typing:start", { conversationId: activeId, role: "buyer" });
      hasEmittedTypingStart.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (hasEmittedTypingStart.current) {
        socket.emit("typing:stop", { conversationId: activeId, role: "buyer" });
        hasEmittedTypingStart.current = false;
      }
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ---------- Filtered conversation list ----------
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) => c.supplierName.toLowerCase().includes(q));
  }, [conversations, search]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  // ---------- Group messages by day for date separators ----------
  const messageGroups = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const label = dayLabel(m.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.day === label) {
        last.items.push(m);
      } else {
        groups.push({ day: label, items: [m] });
      }
    }
    return groups;
  }, [messages]);

  // ---------- Render ----------
  return (
    <div className="w-full max-w-[1280px] mx-auto px-2 lg:px-4 py-3">
      {/* Reconnect banner */}
      {reconnecting && (
        <div className="bg-[#FF6A00] text-white text-[12px] font-bold px-3 py-1.5 flex items-center gap-2 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reconnexion au service de messagerie…
        </div>
      )}
      {!connected && !reconnecting && (
        <div className="bg-[#BF2329] text-white text-[12px] font-bold px-3 py-1.5 flex items-center gap-2 mb-2">
          <WifiOff className="w-3.5 h-3.5" />
          Déconnecté du service de messagerie.
        </div>
      )}

      <div className="flex border border-[#DADAD9] bg-white" style={{ height: "calc(100vh - 220px)", minHeight: "520px" }}>
        {/* ============= LEFT PANEL — conversation list ============= */}
        <aside
          className={`${
            mobilePanel === "list" ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-[300px] md:border-r md:border-[#DADAD9] bg-white`}
        >
          <div className="benjamin-bar">MESSAGERIE</div>

          {/* Search */}
          <div className="p-2 border-b border-[#DADAD9]">
            <div className="flex items-center border border-[#DADAD9] bg-[#FAFAFA] px-2">
              <Search className="w-3.5 h-3.5 text-[#888]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une conversation…"
                className="flex-1 px-2 py-1.5 text-[12px] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto benjamin-scroll">
            {conversations.length === 0 && connected && (
              <div className="p-4 text-center text-[12px] text-[#888]">
                <MessageCircle className="w-7 h-7 mx-auto mb-2 text-[#DADAD9]" />
                Aucune conversation pour le moment.
              </div>
            )}
            {conversations.length === 0 && !connected && (
              <div className="p-4 space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2 p-2 border-b border-[#ECECEC] animate-pulse">
                    <div className="w-10 h-10 bg-[#ECECEC]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 bg-[#ECECEC]" />
                      <div className="h-2.5 w-full bg-[#ECECEC]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-left flex gap-2.5 p-2.5 border-b border-[#ECECEC] hover:bg-[#FAFAFA] transition-colors ${
                    isActive ? "bg-[#FFF3E8] border-l-[3px] border-l-[#FF6A00]" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <img
                    src={c.supplierAvatar}
                    alt={c.supplierName}
                    className="w-10 h-10 object-cover border border-[#DADAD9] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-[12px] font-bold text-[#222] truncate flex items-center gap-1">
                        {c.supplierVerified && <BadgeCheck className="w-3 h-3 text-[#16A34A] flex-shrink-0" />}
                        <span className="truncate">{c.supplierName}</span>
                      </div>
                      <span className="text-[9px] text-[#888] flex-shrink-0">
                        {c.lastMessageAt ? relativeTime(c.lastMessageAt) : ""}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666] truncate mt-0.5">
                      {c.lastSenderRole === "buyer" ? "Vous: " : ""}
                      {c.lastMessage || "—"}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-[#888] flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-[#FF6A00] text-[#FF6A00]" />
                        {c.storeRating.toFixed(1)}
                      </span>
                      <span className="text-[#DADAD9]">·</span>
                      <span className="text-[9px] text-[#888]">{c.responseTime}</span>
                      {c.unread > 0 && (
                        <span className="ml-auto bg-[#FF6A00] text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* New conversation */}
          <div className="p-2 border-t border-[#DADAD9]">
            <button
              onClick={() => {
                setChatSupplierId(null);
                setChatProductId(null);
                toast.message("Nouvelle conversation", {
                  description: "Sélectionnez un fournisseur pour démarrer une discussion.",
                });
              }}
              className="btn-benjamin-orange w-full flex items-center justify-center gap-1.5 py-2.5"
            >
              <Plus className="w-4 h-4" /> Nouvelle conversation
            </button>
          </div>
        </aside>

        {/* ============= CENTER PANEL — chat window ============= */}
        <section
          className={`${
            mobilePanel === "chat" ? "flex" : "hidden"
          } md:flex flex-col flex-1 bg-white min-w-0`}
        >
          {/* Top bar */}
          {active ? (
            <div className="border-b border-[#DADAD9] px-3 py-2 flex items-center gap-2 bg-[#FAFAFA]">
              <button
                onClick={() => setMobilePanel("list")}
                className="md:hidden p-1 -ml-1 text-[#333] hover:text-[#FF6A00]"
                aria-label="Retour"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <img
                src={active.supplierAvatar}
                alt={active.supplierName}
                className="w-9 h-9 object-cover border border-[#DADAD9]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-bold text-[#222] truncate">
                    {active.supplierName}
                  </span>
                  {active.supplierVerified && (
                    <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                  )}
                </div>
                <div className="text-[10px] text-[#666] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#16A34A] inline-block" />
                  En ligne · {active.supplierCity}, {active.supplierCountry}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button className="p-1.5 text-[#555] hover:text-[#FF6A00]" aria-label="Appel" title="Appel vocal">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[#555] hover:text-[#FF6A00]" aria-label="Vidéo" title="Appel vidéo">
                  <Video className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[#555] hover:text-[#FF6A00]" aria-label="Détails" title="Détails">
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="border-b border-[#DADAD9] px-3 py-2.5 bg-[#FAFAFA] text-[12px] text-[#888]">
              Sélectionnez une conversation
            </div>
          )}

          {/* Product context strip */}
          {active?.productTitle && (
            <div className="border-b border-[#ECECEC] px-3 py-1.5 flex items-center gap-2 bg-white">
              <img
                src={active.productImage || ""}
                alt={active.productTitle}
                className="w-7 h-7 object-cover border border-[#DADAD9]"
              />
              <span className="text-[11px] text-[#555] truncate flex-1">{active.productTitle}</span>
              <span className="text-[9px] text-[#888] uppercase tracking-wide">Produit lié</span>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto benjamin-scroll bg-[#F7F7F7] px-2 sm:px-4 py-3"
          >
            {!active && (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#888] px-6">
                <MessageCircle className="w-12 h-12 mb-3 text-[#DADAD9]" />
                <p className="text-[13px] font-semibold text-[#333]">Vos conversations fournisseurs</p>
                <p className="text-[11px] mt-1">
                  Discutez en temps réel avec les fournisseurs vérifiés, négociez les prix,
                  demandez des échantillons et suivez vos commandes.
                </p>
              </div>
            )}

            {active && loadingHistory && messages.length === 0 && (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[70%]">
                      <div className="h-12 w-48 bg-[#ECECEC] animate-pulse" />
                      <div className="h-2 w-12 mt-1 bg-[#ECECEC] animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {active && messageGroups.map((group, gi) => (
              <div key={gi}>
                <div className="flex justify-center my-3">
                  <span className="bg-[#000] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                    {group.day}
                  </span>
                </div>
                {group.items.map((m, idx) => {
                  const isBuyer = m.senderRole === "buyer";
                  const prev = group.items[idx - 1];
                  const showAvatar =
                    !isBuyer && (!prev || prev.senderRole !== "supplier");
                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-1.5 mb-1.5 ${
                        isBuyer ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isBuyer &&
                        (showAvatar ? (
                          <img
                            src={active.supplierAvatar}
                            alt={active.supplierName}
                            className="w-6 h-6 object-cover border border-[#DADAD9] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-6 flex-shrink-0" />
                        ))}
                      <div className={`max-w-[78%] sm:max-w-[65%]`}>
                        <div
                          className={`px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words ${
                            isBuyer
                              ? "bg-[#FF6A00] text-white"
                              : "bg-white text-[#222] border border-[#DADAD9]"
                          }`}
                        >
                          {m.content}
                        </div>
                        <div
                          className={`text-[9px] mt-0.5 text-[#999] ${
                            isBuyer ? "text-right" : "text-left"
                          }`}
                        >
                          {formatTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Typing indicator */}
            {typing && active && (
              <div className="flex items-end gap-1.5 mb-1.5 justify-start">
                <img
                  src={active.supplierAvatar}
                  alt={active.supplierName}
                  className="w-6 h-6 object-cover border border-[#DADAD9] flex-shrink-0"
                />
                <div className="bg-white border border-[#DADAD9] px-3 py-2.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[#888] animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#888] animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[#888] animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          {active && (
            <div className="border-t border-[#DADAD9] bg-white p-2">
              <div className="flex items-end gap-1.5">
                <button
                  className="p-2 text-[#666] hover:text-[#FF6A00]"
                  title="Joindre un fichier"
                  aria-label="Joindre un fichier"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-[#666] hover:text-[#FF6A00] hidden sm:inline-flex"
                  title="Emoji"
                  aria-label="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
                  rows={1}
                  className="flex-1 resize-none border border-[#DADAD9] bg-[#FAFAFA] px-3 py-2 text-[12.5px] outline-none focus:border-[#FF6A00] max-h-28 min-h-[38px]"
                  style={{ height: "auto" }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 112)}px`;
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!draft.trim()}
                  className="btn-benjamin-orange flex items-center justify-center gap-1.5 py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Envoyer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ============= RIGHT PANEL — context ============= */}
        <aside
          className={`${
            mobilePanel === "chat" ? "flex" : "hidden"
          } lg:flex flex-col w-full lg:w-[260px] lg:border-l lg:border-[#DADAD9] bg-white`}
        >
          {active ? (
            <div className="flex flex-col h-full overflow-y-auto benjamin-scroll">
              {/* Supplier mini card */}
              <div className="p-3 border-b border-[#ECECEC]">
                <div className="flex items-center gap-2.5">
                  <img
                    src={active.supplierAvatar}
                    alt={active.supplierName}
                    className="w-12 h-12 object-cover border border-[#DADAD9]"
                  />
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[#222] flex items-center gap-1 truncate">
                      <span className="truncate">{active.supplierName}</span>
                      {active.supplierVerified && <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />}
                    </div>
                    <div className="text-[11px] text-[#666] truncate">
                      {active.supplierCity}, {active.supplierCountry}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
                      <span className="text-[10px] font-bold text-[#222]">{active.storeRating.toFixed(1)}</span>
                      <span className="text-[#DADAD9]">·</span>
                      <span className="text-[10px] text-[#666]">{active.responseTime} réponse</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toast.message("Rapport de vérification", { description: "Génération du rapport fournisseur…" })}
                  className="btn-outline-grey w-full mt-3 flex items-center justify-center gap-1.5 !py-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Vérification fournisseur
                </button>
              </div>

              {/* Quick replies */}
              <div className="p-3 border-b border-[#ECECEC]">
                <div className="benjamin-section-title mb-2">Réponses rapides</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setDraft(q);
                        sendMessage(q);
                      }}
                      className="text-[11px] border border-[#DADAD9] bg-[#FAFAFA] px-2 py-1 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Linked product */}
              {active.productTitle && (
                <div className="p-3 border-b border-[#ECECEC]">
                  <div className="benjamin-section-title mb-2">Produit lié</div>
                  <div className="border border-[#DADAD9] p-2 flex gap-2">
                    <img
                      src={active.productImage || ""}
                      alt={active.productTitle}
                      className="w-12 h-12 object-cover border border-[#DADAD9] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold text-[#222] line-clamp-2">
                        {active.productTitle}
                      </div>
                      <button
                        onClick={() => {
                          if (active.productId) {
                            useApp.getState().setProductId(active.productId);
                            setView("product");
                          }
                        }}
                        className="text-[10px] text-[#FF6A00] font-bold uppercase tracking-wide mt-1 hover:underline inline-flex items-center gap-0.5"
                      >
                        Voir produit <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="p-3 mt-auto">
                <div className="bg-[#FFF3E8] border-l-[3px] border-l-[#FF6A00] p-2.5">
                  <div className="text-[11px] font-bold text-[#FF6A00] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Conseil BENJAMIN
                  </div>
                  <p className="text-[11px] text-[#555] mt-1 leading-relaxed">
                    Demandez toujours une facture proforma et l&apos;envoi d&apos;un échantillon
                    avant toute commande &gt; 500 pièces.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 text-[11px] text-[#888] text-center">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-[#DADAD9]" />
              Sélectionnez une conversation pour voir le contexte.
            </div>
          )}
        </aside>
      </div>

      {/* Bottom hint */}
      <div className="text-[10px] text-[#888] mt-2 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 ${connected ? "bg-[#16A34A]" : "bg-[#BF2329]"}`} />
        {connected ? "Connecté au service de messagerie" : "Hors ligne"}
        <span className="mx-1 text-[#DADAD9]">·</span>
        <span>Réponses automatiques fournisseur activées</span>
      </div>
    </div>
  );
}
