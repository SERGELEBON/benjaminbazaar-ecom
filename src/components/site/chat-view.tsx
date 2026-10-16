"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, Search, Paperclip, Send, ArrowLeft, BadgeCheck, Star, ChevronRight,
  Loader2, AlertCircle, ImageIcon, X, Check, CheckCheck, RotateCcw, Trash2, Store,
  ShoppingBag, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { sendNudge, useNudges, type ChatNudge } from "@/lib/chat-realtime";
import { prepareImage, type PreparedImage } from "@/lib/image-compress";
import type { ChatConversationDTO, ChatMessageDTO } from "@/lib/chat";

// ---------------------------------------------------------------- Types
type Conversation = ChatConversationDTO;
type UiMessage = ChatMessageDTO & {
  /** Client-only state for optimistic messages */
  status?: "sending" | "failed";
  localImage?: PreparedImage | null;
};

const POLL_MS = 15_000;
const BUYER_QUICK_REPLIES = [
  "Bonjour, quel est votre meilleur prix ?",
  "Quelle est la quantité minimum de commande ?",
  "Quel est le délai de livraison à Abidjan ?",
  "Puis-je recevoir un échantillon ?",
];
const SUPPLIER_QUICK_REPLIES = [
  "Bonjour, merci pour votre intérêt !",
  "Quelle quantité souhaitez-vous commander ?",
  "Je vous envoie une proforma.",
  "Le produit est disponible en stock.",
];

// ---------------------------------------------------------------- Helpers
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const d = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return d;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function PeerAvatar({ c, size = 40 }: { c: Conversation; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (c.peer.avatarUrl && !broken) {
    return (
       
      <img
        src={c.peer.avatarUrl}
        alt=""
        style={style}
        onError={() => setBroken(true)}
        className="object-cover border border-[#DADAD9] flex-shrink-0 bg-white"
      />
    );
  }
  return (
    <div
      style={style}
      className={`flex-shrink-0 flex items-center justify-center text-white font-bold text-[12px] ${
        c.peer.kind === "supplier" ? "bg-[#1A1F8A]" : "bg-[#FF6A00]"
      }`}
      aria-hidden
    >
      {initials(c.peer.name)}
    </div>
  );
}

function mergeMessages(prev: UiMessage[], incoming: UiMessage[]) {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

function sortInbox(list: Conversation[]) {
  return [...list].sort((a, b) => (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt));
}

// ---------------------------------------------------------------- Component
export function ChatView() {
  const { chatSupplierId, chatProductId, user, setView, setProductId, setSupplierId } = useApp();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inboxChannels, setInboxChannels] = useState<string[]>([]);
  const [inboxState, setInboxState] = useState<"loading" | "ready" | "error">("loading");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [historyState, setHistoryState] = useState<"idle" | "loading" | "error">("idle");
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "buyer" | "supplier">("all");
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<PreparedImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat">("list");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const conversationsRef = useRef<Conversation[]>([]);
  const stickToBottom = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const hasBothSides = useMemo(() => new Set(conversations.map((c) => c.side)).size > 1, [conversations]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }, []);

  // ------------------------------------------------------------ Inbox
  const loadInbox = useCallback(async () => {
    try {
      const d = await api<{ conversations: Conversation[]; channels: string[] }>("/api/chat/conversations");
      setConversations((prev) => {
        const ids = new Set(d.conversations.map((c) => c.id));
        // Keep the open conversation even if the server does not list it (e.g. supplier side, still empty).
        const keep = prev.filter((c) => !ids.has(c.id) && c.id === activeIdRef.current);
        return sortInbox([...keep, ...d.conversations]);
      });
      setInboxChannels(d.channels);
      setInboxState("ready");
      const unread = d.conversations.reduce((n, c) => n + (c.id === activeIdRef.current ? 0 : c.unread), 0);
      useApp.setState({ chatUnread: unread });
    } catch {
      setInboxState((s) => (s === "loading" ? "error" : s));
    }
  }, []);

  const markRead = useCallback(async (conversationId: string) => {
    setConversations((list) => list.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)));
    try {
      await api(`/api/chat/conversations/${conversationId}/read`, { method: "POST" });
      void sendNudge([`chat:${conversationId}`], { type: "read", conversationId });
      void useApp.getState().refreshChatUnread();
    } catch {
      /* non-blocking */
    }
  }, []);

  // ------------------------------------------------------------ Messages
  const loadHistory = useCallback(
    async (id: string) => {
      setHistoryState("loading");
      try {
        const d = await api<{ messages: UiMessage[]; hasMore: boolean }>(`/api/chat/conversations/${id}/messages`);
        if (activeIdRef.current !== id) return;
        setMessages(d.messages);
        setHasMore(d.hasMore);
        setHistoryState("idle");
        stickToBottom.current = true;
        scrollToBottom();
      } catch {
        if (activeIdRef.current === id) setHistoryState("error");
      }
    },
    [scrollToBottom],
  );

  const fetchNewer = useCallback(
    async (id: string) => {
      const last = [...messagesRef.current].reverse().find((m) => !m.status);
      const url = last
        ? `/api/chat/conversations/${id}/messages?after=${encodeURIComponent(last.id)}`
        : `/api/chat/conversations/${id}/messages`;
      try {
        const d = await api<{ messages: UiMessage[] }>(url);
        if (activeIdRef.current !== id || d.messages.length === 0) return 0;
        setMessages((prev) => mergeMessages(prev, d.messages));
        if (stickToBottom.current) scrollToBottom("smooth");
        return d.messages.filter((m) => !m.mine).length;
      } catch {
        return 0; // next poll will retry
      }
    },
    [scrollToBottom],
  );

  const loadOlder = async () => {
    if (!activeId || loadingOlder) return;
    const first = messages.find((m) => !m.status);
    if (!first) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const d = await api<{ messages: UiMessage[]; hasMore: boolean }>(
        `/api/chat/conversations/${activeId}/messages?before=${encodeURIComponent(first.id)}`,
      );
      setMessages((prev) => mergeMessages(prev, d.messages));
      setHasMore(d.hasMore);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  };

  const selectConversation = useCallback(
    (conv: Conversation) => {
      activeIdRef.current = conv.id;
      setActiveId(conv.id);
      setMessages([]);
      setHasMore(false);
      setPeerTyping(false);
      setMobilePanel("chat");
      void loadHistory(conv.id);
      if (conv.unread > 0) void markRead(conv.id);
    },
    [loadHistory, markRead],
  );

  // Initial load + opening a conversation requested from a product / supplier page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadInbox();
      const { chatSupplierId: supplierId, chatProductId: productId } = useApp.getState();
      if (!supplierId || cancelled) return;
      useApp.setState({ chatSupplierId: null, chatProductId: null });
      try {
        const d = await api<{ conversation: Conversation }>("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId, productId }),
        });
        if (cancelled) return;
        setConversations((list) => [d.conversation, ...list.filter((c) => c.id !== d.conversation.id)]);
        selectConversation(d.conversation);
        setTimeout(() => textRef.current?.focus(), 50);
      } catch (e) {
        toast.error("Impossible d'ouvrir la conversation", { description: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-runs when the user clicks "Chat" on another product while the chat is open.
  }, [loadInbox, selectConversation, chatSupplierId, chatProductId]);

  // Polling fallback (Realtime can be blocked by some networks / proxies).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void loadInbox();
      const id = activeIdRef.current;
      if (id) {
        void fetchNewer(id).then((received) => {
          if (received > 0) void markRead(id);
        });
      }
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [loadInbox, fetchNewer, markRead]);

  // Realtime nudges (no content is broadcast: we refetch through the API).
  const channels = useMemo(
    () => (activeId ? [...inboxChannels, `chat:${activeId}`] : inboxChannels),
    [inboxChannels, activeId],
  );
  useNudges(channels, (n: ChatNudge) => {
    const current = activeIdRef.current;
    if (n.type === "typing") {
      if (n.conversationId !== current) return;
      const mySide = conversationsRef.current.find((c) => c.id === current)?.side;
      if (n.side === mySide) return;
      setPeerTyping(n.typing);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (n.typing) typingTimer.current = setTimeout(() => setPeerTyping(false), 6000);
      return;
    }
    if (n.type === "message" && current && n.conversationId === current) {
      setPeerTyping(false);
      void fetchNewer(current).then((received) => {
        if (received > 0 && document.visibilityState === "visible") void markRead(current);
      });
    }
    void loadInbox();
  });

  // ------------------------------------------------------------ Sending
  const deliver = async (conv: Conversation, temp: UiMessage) => {
    try {
      let res: { message: UiMessage };
      if (temp.localImage) {
        const form = new FormData();
        if (temp.content) form.set("content", temp.content);
        form.set("file", temp.localImage.file);
        form.set("width", String(temp.localImage.width));
        form.set("height", String(temp.localImage.height));
        res = await api(`/api/chat/conversations/${conv.id}/messages`, { method: "POST", body: form });
      } else {
        res = await api(`/api/chat/conversations/${conv.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: temp.content }),
        });
      }
      if (temp.localImage) URL.revokeObjectURL(temp.localImage.previewUrl);
      setMessages((prev) => mergeMessages(prev.filter((m) => m.id !== temp.id), [res.message]));
      setConversations((list) =>
        sortInbox(
          list.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  lastMessageAt: res.message.createdAt,
                  lastMessagePreview: res.message.content ?? "📷 Photo",
                  lastSenderRole: conv.side,
                }
              : c,
          ),
        ),
      );
      void sendNudge([`chat:${conv.id}`, conv.inboxChannels.peer], { type: "message", conversationId: conv.id });
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? { ...m, status: "failed" } : m)));
      toast.error("Message non envoyé", { description: (e as Error).message });
    }
  };

  const send = (text?: string) => {
    if (!active) return;
    const content = (text ?? draft).trim();
    const image = text === undefined ? pendingImage : null;
    if (!content && !image) return;
    if (content.length > 4000) {
      toast.error("Message trop long (4000 caractères max).");
      return;
    }

    const temp: UiMessage = {
      id: `tmp-${crypto.randomUUID()}`,
      conversationId: active.id,
      senderRole: active.side,
      mine: true,
      content: content || null,
      attachment: image
        ? { url: image.previewUrl, type: image.file.type, size: image.file.size, width: image.width, height: image.height }
        : null,
      createdAt: new Date().toISOString(),
      status: "sending",
      localImage: image,
    };
    setMessages((prev) => [...prev, temp]);
    if (text === undefined) {
      setDraft("");
      setPendingImage(null);
      if (textRef.current) textRef.current.style.height = "auto";
    }
    stickToBottom.current = true;
    scrollToBottom("smooth");
    void sendNudge([`chat:${active.id}`], { type: "typing", conversationId: active.id, side: active.side, typing: false });
    lastTypingSent.current = 0;
    void deliver(active, temp);
  };

  const retry = (m: UiMessage) => {
    if (!active) return;
    const again: UiMessage = { ...m, status: "sending" };
    setMessages((prev) => prev.map((x) => (x.id === m.id ? again : x)));
    void deliver(active, again);
  };

  const discard = (m: UiMessage) => {
    if (m.localImage) URL.revokeObjectURL(m.localImage.previewUrl);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (!active || !value.trim()) return;
    const now = Date.now();
    if (now - lastTypingSent.current > 3000) {
      lastTypingSent.current = now;
      void sendNudge([`chat:${active.id}`], { type: "typing", conversationId: active.id, side: active.side, typing: true });
    }
  };

  const pickImage = async (file: File | null | undefined) => {
    if (!file) return;
    setPreparing(true);
    try {
      const prepared = await prepareImage(file);
      setPendingImage((old) => {
        if (old) URL.revokeObjectURL(old.previewUrl);
        return prepared;
      });
      textRef.current?.focus();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreparing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Close the lightbox with Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // ------------------------------------------------------------ Derived
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        (filter === "all" || c.side === filter) &&
        (!q || c.peer.name.toLowerCase().includes(q) || (c.product?.title ?? "").toLowerCase().includes(q)),
    );
  }, [conversations, search, filter]);

  const groups = useMemo(() => {
    const out: { day: string; items: UiMessage[] }[] = [];
    for (const m of messages) {
      const label = dayLabel(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === label) last.items.push(m);
      else out.push({ day: label, items: [m] });
    }
    return out;
  }, [messages]);

  const lastMineId = useMemo(() => [...messages].reverse().find((m) => m.mine && !m.status)?.id, [messages]);
  const quickReplies = active?.side === "supplier" ? SUPPLIER_QUICK_REPLIES : BUYER_QUICK_REPLIES;

  const openSupplier = (id: string | null) => {
    if (!id) return;
    setSupplierId(id);
    setView("supplier");
  };
  const openProduct = (id: string) => {
    setProductId(id);
    setView("product");
  };

  // ------------------------------------------------------------ Render
  return (
    <div className="w-full max-w-[1280px] mx-auto px-0 sm:px-2 lg:px-4 py-0 sm:py-3">
      <div
        className="flex border-y sm:border border-[#DADAD9] bg-white"
        style={{ height: "calc(100dvh - 150px)", minHeight: 480 }}
      >
        {/* ============ Conversation list ============ */}
        <aside
          className={`${mobilePanel === "list" ? "flex" : "hidden"} md:flex flex-col w-full md:w-[320px] md:border-r md:border-[#DADAD9] bg-white min-w-0`}
          aria-label="Conversations"
        >
          <div className="benjamin-bar">MESSAGERIE</div>
          <div className="p-2 border-b border-[#DADAD9] space-y-2">
            <div className="flex items-center border border-[#DADAD9] bg-[#FAFAFA] px-2">
              <Search className="w-3.5 h-3.5 text-[#888]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Rechercher une conversation"
                className="flex-1 px-2 py-1.5 text-[13px] bg-transparent outline-none"
              />
            </div>
            {hasBothSides && (
              <div className="flex gap-1 text-[11px] font-bold">
                {(
                  [
                    ["all", "Toutes"],
                    ["buyer", "Mes achats"],
                    ["supplier", "Ma boutique"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`flex-1 py-1 border ${
                      filter === k ? "bg-[#1A1F8A] text-white border-[#1A1F8A]" : "border-[#DADAD9] text-[#555]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto benjamin-scroll">
            {inboxState === "loading" && (
              <div className="p-2 space-y-1" aria-busy>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2 p-2 animate-pulse">
                    <div className="w-10 h-10 bg-[#ECECEC]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-2/3 bg-[#ECECEC]" />
                      <div className="h-2.5 w-full bg-[#ECECEC]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {inboxState === "error" && (
              <div className="p-4 text-center text-[12px] text-[#BF2329]">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                Impossible de charger vos conversations.
                <button onClick={() => void loadInbox()} className="block mx-auto mt-2 text-[#1A1F8A] font-bold underline">
                  Réessayer
                </button>
              </div>
            )}
            {inboxState === "ready" && filtered.length === 0 && (
              <div className="p-6 text-center text-[12px] text-[#888]">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-[#DADAD9]" />
                {conversations.length === 0 ? (
                  <>
                    Aucune conversation pour le moment.
                    <br />
                    Contactez un fournisseur depuis la fiche d&apos;un produit.
                  </>
                ) : (
                  "Aucun résultat."
                )}
              </div>
            )}

            {filtered.map((c) => {
              const isActive = c.id === activeId;
              const preview =
                c.lastMessagePreview ?? (c.product ? `À propos de : ${c.product.title}` : "Nouvelle conversation");
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`w-full text-left flex gap-2.5 p-2.5 border-b border-[#ECECEC] hover:bg-[#FAFAFA] transition-colors border-l-[3px] ${
                    isActive ? "bg-[#EEF0FF] border-l-[#1A1F8A]" : "border-l-transparent"
                  }`}
                >
                  <PeerAvatar c={c} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[13px] truncate flex items-center gap-1 ${
                          c.unread ? "font-extrabold text-[#111]" : "font-bold text-[#222]"
                        }`}
                      >
                        {c.peer.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" aria-label="Vérifié" />}
                        <span className="truncate">{c.peer.name}</span>
                      </span>
                      <span className="text-[10px] text-[#888] flex-shrink-0">{relativeTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-[12px] truncate flex-1 ${c.unread ? "text-[#222] font-semibold" : "text-[#666]"}`}>
                        {c.lastSenderRole === c.side ? "Vous : " : ""}
                        {preview}
                      </span>
                      {c.unread > 0 && (
                        <span className="bg-[#FF6A00] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </div>
                    {hasBothSides && (
                      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wide text-[#888] mt-1">
                        {c.side === "buyer" ? <ShoppingBag className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                        {c.side === "buyer" ? "Achat" : "Boutique"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 border-t border-[#DADAD9]">
            <button
              onClick={() => setView("manufacturers")}
              className="btn-benjamin-orange w-full flex items-center justify-center gap-1.5 py-2.5"
            >
              <Store className="w-4 h-4" /> Trouver un fournisseur
            </button>
          </div>
        </aside>

        {/* ============ Thread ============ */}
        <section
          className={`${mobilePanel === "chat" ? "flex" : "hidden"} md:flex flex-col flex-1 bg-white min-w-0 relative`}
          onDragOver={(e) => {
            if (!active) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!active) return;
            e.preventDefault();
            setDragOver(false);
            void pickImage(e.dataTransfer.files?.[0]);
          }}
        >
          {dragOver && (
            <div className="absolute inset-0 z-20 bg-[#1A1F8A]/10 border-2 border-dashed border-[#1A1F8A] flex items-center justify-center pointer-events-none">
              <span className="bg-white px-3 py-2 text-[13px] font-bold text-[#1A1F8A] flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Déposez l&apos;image ici
              </span>
            </div>
          )}

          {active ? (
            <div className="border-b border-[#DADAD9] px-3 py-2 flex items-center gap-2 bg-[#FAFAFA]">
              <button
                onClick={() => setMobilePanel("list")}
                className="md:hidden p-1 -ml-1 text-[#333]"
                aria-label="Retour aux conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <PeerAvatar c={active} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[14px] font-bold text-[#222] truncate">{active.peer.name}</span>
                  {active.peer.verified && <BadgeCheck className="w-4 h-4 text-[#16A34A]" />}
                </div>
                <div className="text-[11px] text-[#666] truncate">
                  {peerTyping ? (
                    <span className="text-[#16A34A] font-semibold">en train d&apos;écrire…</span>
                  ) : (
                    <>
                      {active.peer.kind === "supplier" ? "Fournisseur" : "Acheteur"}
                      {active.peer.location ? ` · ${active.peer.location}` : ""}
                    </>
                  )}
                </div>
              </div>
              {active.peer.kind === "supplier" && active.peer.id && (
                <button
                  onClick={() => openSupplier(active.peer.id)}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-[#1A1F8A] hover:underline"
                >
                  Voir la boutique <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="border-b border-[#DADAD9] px-3 py-2.5 bg-[#FAFAFA] text-[12px] text-[#888]">
              Sélectionnez une conversation
            </div>
          )}

          {active?.product && (
            <button
              onClick={() => openProduct(active.product!.id)}
              className="border-b border-[#ECECEC] px-3 py-1.5 flex items-center gap-2 bg-white text-left hover:bg-[#FAFAFA]"
            >
              {active.product.image && (
                 
                <img src={active.product.image} alt="" className="w-8 h-8 object-cover border border-[#DADAD9]" />
              )}
              <span className="text-[12px] text-[#444] truncate flex-1">{active.product.title}</span>
              <span className="text-[9px] text-[#888] uppercase tracking-wide">Produit concerné</span>
            </button>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            }}
            className="flex-1 overflow-y-auto benjamin-scroll bg-[#F4F5FA] px-2 sm:px-4 py-3"
            aria-live="polite"
          >
            {!active && (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#888] px-6">
                <MessageCircle className="w-12 h-12 mb-3 text-[#DADAD9]" />
                <p className="text-[14px] font-semibold text-[#333]">Vos conversations</p>
                <p className="text-[12px] mt-1 max-w-sm">
                  Échangez avec les fournisseurs, envoyez des photos de produits, négociez les prix et les quantités.
                </p>
              </div>
            )}

            {active && historyState === "loading" && messages.length === 0 && (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#1A1F8A]" />
              </div>
            )}
            {active && historyState === "error" && (
              <div className="text-center text-[12px] text-[#BF2329] py-10">
                Impossible de charger les messages.
                <button
                  onClick={() => void loadHistory(active.id)}
                  className="block mx-auto mt-2 text-[#1A1F8A] font-bold underline"
                >
                  Réessayer
                </button>
              </div>
            )}
            {active && historyState === "idle" && messages.length === 0 && (
              <div className="text-center text-[12px] text-[#888] py-10 px-6">
                Démarrez la conversation avec <b className="text-[#333]">{active.peer.name}</b>.
                <br />
                Vous pouvez joindre des photos (JPEG, PNG, WebP).
              </div>
            )}

            {active && hasMore && (
              <div className="flex justify-center mb-2">
                <button
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="text-[11px] font-bold text-[#1A1F8A] bg-white border border-[#DADAD9] px-3 py-1 flex items-center gap-1.5"
                >
                  {loadingOlder && <Loader2 className="w-3 h-3 animate-spin" />}
                  Messages précédents
                </button>
              </div>
            )}

            {active &&
              groups.map((g) => (
                <div key={g.day + g.items[0].id}>
                  <div className="flex justify-center my-3">
                    <span className="bg-[#0A0F4D] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                      {g.day}
                    </span>
                  </div>
                  {g.items.map((m) => {
                    const read = Boolean(m.mine && active.peerLastReadAt && active.peerLastReadAt >= m.createdAt);
                    return (
                      <div key={m.id} className={`flex mb-1.5 ${m.mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] sm:max-w-[65%] flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
                          <div
                            className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden ${
                              m.mine ? "bg-[#1A1F8A] text-white" : "bg-white text-[#222] border border-[#DADAD9]"
                            } ${m.status === "sending" ? "opacity-70" : ""} ${m.status === "failed" ? "ring-2 ring-[#BF2329]" : ""}`}
                          >
                            {m.attachment && (
                              <button
                                type="button"
                                onClick={() => m.attachment?.url && setLightbox(m.attachment.url)}
                                className="block"
                                aria-label="Agrandir l'image"
                              >
                                {m.attachment.url ? (
                                   
                                  <img
                                    src={m.attachment.url}
                                    alt="Image envoyée"
                                    loading="lazy"
                                    width={m.attachment.width ?? undefined}
                                    height={m.attachment.height ?? undefined}
                                    onLoad={() => {
                                      if (stickToBottom.current) scrollToBottom();
                                    }}
                                    className="block max-w-full w-[260px] sm:w-[300px] h-auto max-h-[360px] object-cover bg-[#ECECEC]"
                                  />
                                ) : (
                                  <span className="flex items-center gap-1.5 px-3 py-6 text-[12px] opacity-80">
                                    <ImageIcon className="w-4 h-4" /> Image indisponible
                                  </span>
                                )}
                              </button>
                            )}
                            {m.content && <div className="px-3 py-2">{m.content}</div>}
                          </div>
                          <div className="text-[10px] mt-0.5 text-[#999] flex items-center gap-1">
                            {m.status === "sending" && (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Envoi…
                              </>
                            )}
                            {m.status === "failed" && (
                              <span className="text-[#BF2329] flex items-center gap-2">
                                Échec de l&apos;envoi
                                <button onClick={() => retry(m)} className="flex items-center gap-0.5 font-bold underline">
                                  <RotateCcw className="w-3 h-3" /> Réessayer
                                </button>
                                <button onClick={() => discard(m)} className="flex items-center gap-0.5" aria-label="Supprimer">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </span>
                            )}
                            {!m.status && formatTime(m.createdAt)}
                            {!m.status &&
                              m.mine &&
                              (read ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#16A34A]" aria-label="Lu" />
                              ) : (
                                <Check className="w-3.5 h-3.5" aria-label="Envoyé" />
                              ))}
                            {!m.status && m.id === lastMineId && read && <span className="text-[#16A34A]">Lu</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

            {active && peerTyping && (
              <div className="flex justify-start mb-1.5">
                <div className="bg-white border border-[#DADAD9] px-3 py-2.5 flex items-center gap-1" aria-label="En train d'écrire">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1.5 h-1.5 bg-[#888] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          {active && (
            <div className="border-t border-[#DADAD9] bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {messages.length === 0 && historyState === "idle" && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 benjamin-scroll">
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="shrink-0 text-[11px] border border-[#DADAD9] bg-[#FAFAFA] px-2 py-1 hover:border-[#1A1F8A] hover:text-[#1A1F8A]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {(pendingImage || preparing) && (
                <div className="flex items-center gap-2 mb-2 p-1.5 border border-[#DADAD9] bg-[#FAFAFA] w-fit">
                  {preparing ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#555] px-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" /> Préparation de l&apos;image…
                    </span>
                  ) : (
                    pendingImage && (
                      <>
                        { }
                        <img src={pendingImage.previewUrl} alt="Aperçu" className="w-16 h-16 object-cover" />
                        <span className="text-[11px] text-[#555]">
                          {(pendingImage.file.size / 1024).toFixed(0)} Ko
                          <br />
                          {pendingImage.width}×{pendingImage.height}
                        </span>
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(pendingImage.previewUrl);
                            setPendingImage(null);
                          }}
                          className="p-1 text-[#666] hover:text-[#BF2329]"
                          aria-label="Retirer l'image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )
                  )}
                </div>
              )}
              <div className="flex items-end gap-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => void pickImage(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={preparing}
                  className="p-2.5 text-[#555] hover:text-[#1A1F8A] disabled:opacity-40"
                  title="Joindre une image"
                  aria-label="Joindre une image"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  ref={textRef}
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  onPaste={(e) => {
                    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
                    if (file) {
                      e.preventDefault();
                      void pickImage(file);
                    }
                  }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                  }}
                  maxLength={4000}
                  rows={1}
                  placeholder={pendingImage ? "Ajouter une légende…" : "Écrivez votre message…"}
                  aria-label="Message"
                  className="flex-1 resize-none border border-[#DADAD9] bg-[#FAFAFA] px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-[#1A1F8A] max-h-32 min-h-[40px]"
                />
                <button
                  onClick={() => send()}
                  disabled={(!draft.trim() && !pendingImage) || preparing}
                  className="btn-benjamin-orange flex items-center justify-center gap-1.5 h-10 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Envoyer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </div>
              <p className="hidden sm:block text-[10px] text-[#999] mt-1">
                Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne · Collez ou glissez une image pour la joindre
              </p>
            </div>
          )}
        </section>

        {/* ============ Context panel (desktop) ============ */}
        {active && (
          <aside className="hidden lg:flex flex-col w-[260px] border-l border-[#DADAD9] bg-white overflow-y-auto benjamin-scroll">
            <div className="p-3 border-b border-[#ECECEC]">
              <div className="flex items-center gap-2.5">
                <PeerAvatar c={active} size={48} />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#222] flex items-center gap-1">
                    <span className="truncate">{active.peer.name}</span>
                    {active.peer.verified && <BadgeCheck className="w-3.5 h-3.5 text-[#16A34A] flex-shrink-0" />}
                  </div>
                  <div className="text-[11px] text-[#666] truncate">{active.peer.location}</div>
                  {active.peer.kind === "supplier" && active.peer.rating != null && active.peer.rating > 0 && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[#666]">
                      <Star className="w-3 h-3 fill-[#FF6A00] text-[#FF6A00]" />
                      <b className="text-[#222]">{active.peer.rating.toFixed(1)}</b>
                      {active.peer.responseTime && <span>· répond en {active.peer.responseTime}</span>}
                    </div>
                  )}
                </div>
              </div>
              {active.peer.kind === "supplier" && active.peer.id && (
                <button
                  onClick={() => openSupplier(active.peer.id)}
                  className="btn-outline-grey w-full mt-3 flex items-center justify-center gap-1.5 !py-2"
                >
                  <Store className="w-3.5 h-3.5" /> Voir la boutique
                </button>
              )}
            </div>

            {active.product && (
              <div className="p-3 border-b border-[#ECECEC]">
                <div className="benjamin-section-title mb-2">Produit concerné</div>
                <div className="border border-[#DADAD9] p-2 flex gap-2">
                  {active.product.image && (
                     
                    <img src={active.product.image} alt="" className="w-12 h-12 object-cover border border-[#DADAD9] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-[#222] line-clamp-2">{active.product.title}</div>
                    <button
                      onClick={() => openProduct(active.product!.id)}
                      className="text-[10px] text-[#1A1F8A] font-bold uppercase tracking-wide mt-1 hover:underline inline-flex items-center gap-0.5"
                    >
                      Voir le produit <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 mt-auto">
              <div className="bg-[#EEF0FF] border-l-[3px] border-l-[#1A1F8A] p-2.5">
                <div className="text-[11px] font-bold text-[#1A1F8A] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Conseil {BRAND.shortName}
                </div>
                <p className="text-[11px] text-[#555] mt-1 leading-relaxed">
                  Gardez vos échanges sur {BRAND.shortName} et ne partagez jamais vos mots de passe ou codes de paiement.
                  Demandez une facture proforma avant toute commande importante.
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>

      {user && (
        <p className="hidden sm:block text-[10px] text-[#888] mt-2 px-1">
          Messages privés entre vous et votre interlocuteur · Images stockées de façon privée
        </p>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-3 right-3 text-white p-2" aria-label="Fermer">
            <X className="w-6 h-6" />
          </button>
          { }
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
