/**
 * AELF Bazaar — Chat mini-service
 *
 * Socket.io server for the buyer ↔ supplier real-time chat.
 *
 * - Hardcoded port 3004 (NOT from env).
 * - path: "/" (Caddy requires this — do NOT change).
 * - In-memory data: conversations Map, messages array per conversation.
 * - Seeds 4 mock conversations on startup, with starter messages.
 * - Auto-responder for supplier replies based on buyer keywords.
 */
import { createServer } from "node:http";
import { Server } from "socket.io";

// ---------- Types ----------
interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  senderRole: "buyer" | "supplier";
  senderName: string;
  createdAt: string; // ISO string
}

interface Conversation {
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
  messages: ChatMessage[];
}

// ---------- In-memory storage ----------
const conversations = new Map<string, Conversation>();

const SEED_AVATARS = [
  "https://picsum.photos/seed/aelf-supplier-1/100/100",
  "https://picsum.photos/seed/aelf-supplier-2/100/100",
  "https://picsum.photos/seed/aelf-supplier-3/100/100",
  "https://picsum.photos/seed/aelf-supplier-4/100/100",
];

const PRODUCT_IMG_1 = "https://picsum.photos/seed/aelf-prod-wireless-earbuds/200/200";
const PRODUCT_IMG_2 = "https://picsum.photos/seed/aelf-prod-cocoa-beans/200/200";
const PRODUCT_IMG_3 = "https://picsum.photos/seed/aelf-prod-leather-bag/200/200";
const PRODUCT_IMG_4 = "https://picsum.photos/seed/aelf-prod-solar-panel/200/200";

function seedConversations() {
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  const seedData: Conversation[] = [
    {
      id: "conv-1",
      supplierId: "supplier-1",
      supplierName: "Shenzhen Lingtong Tech",
      supplierAvatar: SEED_AVATARS[0],
      supplierCity: "Shenzhen",
      supplierCountry: "China",
      supplierVerified: true,
      storeRating: 4.8,
      responseTime: "≤2h",
      productId: "product-1",
      productTitle: "Wireless Earbuds Pro ANC — OEM/ODM",
      productImage: PRODUCT_IMG_1,
      unread: 2,
      messages: [
        {
          id: "m1",
          conversationId: "conv-1",
          content: "Bonjour, je suis intéressé par vos écouteurs sans fil. Quel est le prix pour 200 pièces ?",
          senderRole: "buyer",
          senderName: "You",
          createdAt: iso(60 * 24),
        },
        {
          id: "m2",
          conversationId: "conv-1",
          content: "Bonjour ! Merci pour votre intérêt. Pour 200 pièces, nous pouvons vous proposer un prix compétitif de 12,50 $ l'unité. Souhaitez-vous une personnalisation du logo ?",
          senderRole: "supplier",
          senderName: "Shenzhen Lingtong Tech",
          createdAt: iso(60 * 23),
        },
        {
          id: "m3",
          conversationId: "conv-1",
          content: "Oui, avec notre logo. Quel est le délai de livraison vers Abidjan ?",
          senderRole: "buyer",
          senderName: "You",
          createdAt: iso(60 * 22),
        },
        {
          id: "m4",
          conversationId: "conv-1",
          content: "Le délai de livraison vers Abidjan est de 7-12 jours. Nous expédions via DHL et FedEx. Le coût est de 185 $ pour 200 pièces.",
          senderRole: "supplier",
          senderName: "Shenzhen Lingtong Tech",
          createdAt: iso(60 * 21),
        },
      ],
    },
    {
      id: "conv-2",
      supplierId: "supplier-2",
      supplierName: "Accra Agro Foods",
      supplierAvatar: SEED_AVATARS[1],
      supplierCity: "Accra",
      supplierCountry: "Ghana",
      supplierVerified: true,
      storeRating: 4.6,
      responseTime: "≤4h",
      productId: "product-2",
      productTitle: "Premium Raw Cocoa Beans — Grade A",
      productImage: PRODUCT_IMG_2,
      unread: 0,
      messages: [
        {
          id: "m5",
          conversationId: "conv-2",
          content: "Bonjour, êtes-vous le producteur direct de fèves de cacao ?",
          senderRole: "buyer",
          senderName: "You",
          createdAt: iso(60 * 5),
        },
        {
          id: "m6",
          conversationId: "conv-2",
          content: "Bonjour ! Oui, nous sommes producteurs directs à Accra. Nos fèves sont de Grade A, fermentation 7 jours, séchage solaire 14 jours.",
          senderRole: "supplier",
          senderName: "Accra Agro Foods",
          createdAt: iso(60 * 4),
        },
      ],
    },
    {
      id: "conv-3",
      supplierId: "supplier-3",
      supplierName: "Istanbul Leather Works",
      supplierAvatar: SEED_AVATARS[2],
      supplierCity: "Istanbul",
      supplierCountry: "Turkey",
      supplierVerified: true,
      storeRating: 4.7,
      responseTime: "≤6h",
      productId: "product-3",
      productTitle: "Genuine Leather Handbag — Custom OEM",
      productImage: PRODUCT_IMG_3,
      unread: 1,
      messages: [
        {
          id: "m7",
          conversationId: "conv-3",
          content: "Puis-je avoir un échantillon du sac en cuir avant de commander ?",
          senderRole: "buyer",
          senderName: "You",
          createdAt: iso(60 * 12),
        },
        {
          id: "m8",
          conversationId: "conv-3",
          content: "Bien sûr, nous pouvons envoyer un échantillon. Les frais d'expédition sont de 15$ remboursables sur commande. Délai : 4-6 jours.",
          senderRole: "supplier",
          senderName: "Istanbul Leather Works",
          createdAt: iso(60 * 11),
        },
      ],
    },
    {
      id: "conv-4",
      supplierId: "supplier-4",
      supplierName: "Nairobi Solar Energy",
      supplierAvatar: SEED_AVATARS[3],
      supplierCity: "Nairobi",
      supplierCountry: "Kenya",
      supplierVerified: true,
      storeRating: 4.5,
      responseTime: "≤8h",
      productId: "product-4",
      productTitle: "Mono Solar Panel 450W — Tier 1 Manufacturer",
      productImage: PRODUCT_IMG_4,
      unread: 0,
      messages: [
        {
          id: "m9",
          conversationId: "conv-4",
          content: "Quelle est la quantité minimum pour les panneaux solaires 450W ?",
          senderRole: "buyer",
          senderName: "You",
          createdAt: iso(60 * 48),
        },
        {
          id: "m10",
          conversationId: "conv-4",
          content: "La commande minimum est de 50 pièces. Pour les commandes supérieures à 500, nous offrons une remise de 8%.",
          senderRole: "supplier",
          senderName: "Nairobi Solar Energy",
          createdAt: iso(60 * 47),
        },
      ],
    },
  ];

  for (const conv of seedData) {
    conversations.set(conv.id, conv);
  }
  console.log(`[chat-service] Seeded ${conversations.size} conversations.`);
}

// ---------- Helpers ----------
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toListPayload() {
  return Array.from(conversations.values()).map((c) => {
    const last = c.messages[c.messages.length - 1];
    return {
      id: c.id,
      supplierId: c.supplierId,
      supplierName: c.supplierName,
      supplierAvatar: c.supplierAvatar,
      supplierCity: c.supplierCity,
      supplierCountry: c.supplierCountry,
      supplierVerified: c.supplierVerified,
      storeRating: c.storeRating,
      responseTime: c.responseTime,
      productId: c.productId,
      productTitle: c.productTitle,
      productImage: c.productImage,
      unread: c.unread,
      lastMessage: last ? last.content : "",
      lastMessageAt: last ? last.createdAt : null,
      lastSenderRole: last ? last.senderRole : null,
    };
  });
}

/**
 * Generate a contextual supplier reply based on the buyer's message content.
 * Matches keywords in both FR and EN.
 */
function generateSupplierReply(buyerMessage: string): string {
  const m = buyerMessage.toLowerCase();

  // Occasional generic probe (1 in 4)
  if (Math.random() < 0.25) {
    return "Auriez-vous une photo ou une référence du produit souhaité ?";
  }

  if (/\b(price|prix|devis|tarif|co[uû]te|coute combien)\b/.test(m)) {
    return "Nous pouvons vous proposer un prix compétitif. Quelle quantité souhaitez-vous commander ?";
  }
  if (/\b(moq|minimum|quantit[eé]|combien de pi[eè]ces|nombre de)\b/.test(m)) {
    return "La commande minimum est de 50 pièces. Pour les commandes supérieures à 500, nous offrons une remise.";
  }
  if (/\b(shipping|livraison|d[eé]lai|exp[eé]dition|livrer|dhl|fedex|transport)\b/.test(m)) {
    return "Le délai de livraison vers Abidjan est de 7-12 jours. Nous expédions via DHL et FedEx.";
  }
  if (/\b(sample|[eé]chantillon|prototype|test)\b/.test(m)) {
    return "Bien sûr, nous pouvons envoyer un échantillon. Les frais d'expédition sont de 15$ remboursables sur commande.";
  }
  if (/\b(custom|personnalis|logo|marque|oem|odm|couleur|emballage)\b/.test(m)) {
    return "Oui, nous offrons la personnalisation OEM/ODM. Logo, couleurs, emballage — tout est possible.";
  }
  if (/\b(payment|paiement|pay[eé]|carte|virement|mobile money|mtn|orange money|wave)\b/.test(m)) {
    return "Nous acceptons les paiements par carte (Visa/Mastercard), virement bancaire, MTN MoMo, Orange Money et Wave via Trade Assurance AELF Bazaar.";
  }
  if (/\b(qualit|quality|certif|iso|ce|rohs|norme)\b/.test(m)) {
    return "Tous nos produits sont certifiés ISO 9001, CE et RoHS. Nous fournissons les certificats sur demande.";
  }
  if (/\b(bonjour|salut|hello|hi|bonsoir)\b/.test(m)) {
    return "Bonjour ! Ravi de vous rencontrer. Comment puis-je vous aider aujourd'hui ? N'hésitez pas à préciser votre besoin.";
  }
  if (/\b(merci|thank|parfait|super|g[eé]nial|ok|d'accord)\b/.test(m)) {
    return "Avec plaisir ! N'hésitez pas si vous avez d'autres questions. Notre équipe est disponible 7j/7.";
  }
  if (/\b(r[eé]duction|remise|discount|promotion|offre)\b/.test(m)) {
    return "Pour les commandes de 500 pièces et plus, nous offrons une remise de 8%. Pour 1000+ pièces, la remise passe à 12%.";
  }
  if (/\b(d[eé]lai de production|production|fabriquer|manufacturing)\b/.test(m)) {
    return "Le délai de production est de 10-15 jours ouvrés pour les commandes standard, et 20-25 jours pour les produits personnalisés.";
  }

  return "Merci pour votre message ! Notre équipe vous répondra avec tous les détails. N'hésitez pas à préciser votre besoin.";
}

// ---------- Socket.io server ----------
const httpServer = createServer((req, res) => {
  // Minimal health-check handler so curl http://localhost:3004/ returns something.
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "aelf-bazaar-chat", port: 3004 }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, {
  path: "/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60_000,
  pingInterval: 25_000,
});

interface ServerToClientEvents {
  "conversations:list": (payload: ReturnType<typeof toListPayload>) => void;
  "conversation:history": (payload: { conversationId: string; messages: ChatMessage[] }) => void;
  "message:new": (message: ChatMessage) => void;
  "typing:update": (payload: { conversationId: string; typing: boolean; role: "buyer" | "supplier" }) => void;
}

interface ClientToServerEvents {
  "conversation:list": (payload: { userId?: string }) => void;
  "conversation:join": (payload: { conversationId: string; userId?: string; role?: "buyer" | "supplier" }) => void;
  "message:send": (payload: { conversationId: string; content: string; senderRole: "buyer" | "supplier"; senderName?: string }) => void;
  "typing:start": (payload: { conversationId: string; role: "buyer" | "supplier" }) => void;
  "typing:stop": (payload: { conversationId: string; role: "buyer" | "supplier" }) => void;
}

io.on("connection", (socket) => {
  console.log(`[chat-service] Client connected: ${socket.id}`);

  // Send conversation list on demand.
  socket.on("conversation:list", (_payload) => {
    socket.emit("conversations:list", toListPayload());
  });

  // Join a conversation room and receive its history.
  socket.on("conversation:join", (payload) => {
    const { conversationId } = payload;
    if (!conversationId) return;
    const conv = conversations.get(conversationId);
    if (!conv) {
      // Conversation not found — emit empty history so the client UI clears.
      socket.emit("conversation:history", { conversationId, messages: [] });
      return;
    }
    // Reset unread count when a buyer joins.
    conv.unread = 0;
    socket.join(`conv:${conversationId}`);
    socket.emit("conversation:history", { conversationId, messages: conv.messages });
    // Broadcast updated list so unread badges clear for everyone.
    io.emit("conversations:list", toListPayload());
  });

  // Handle a new message.
  socket.on("message:send", (payload) => {
    const { conversationId, content, senderRole, senderName } = payload;
    if (!conversationId || !content || !content.trim()) return;
    const conv = conversations.get(conversationId);
    if (!conv) return;

    const buyerMessage: ChatMessage = {
      id: genId("msg"),
      conversationId,
      content: content.trim(),
      senderRole,
      senderName: senderName || "You",
      createdAt: new Date().toISOString(),
    };
    conv.messages.push(buyerMessage);

    // Broadcast the buyer's message to everyone in the room.
    io.to(`conv:${conversationId}`).emit("message:new", buyerMessage);
    io.emit("conversations:list", toListPayload());

    // Auto-responder: typing indicator, then a supplier reply after 1.5–3.5s.
    if (senderRole === "buyer") {
      // Tell the room the supplier is "typing".
      io.to(`conv:${conversationId}`).emit("typing:update", {
        conversationId,
        typing: true,
        role: "supplier",
      });

      const delay = 1500 + Math.random() * 2000; // 1.5–3.5s
      setTimeout(() => {
        // Stop typing indicator.
        io.to(`conv:${conversationId}`).emit("typing:update", {
          conversationId,
          typing: false,
          role: "supplier",
        });

        const reply: ChatMessage = {
          id: genId("msg"),
          conversationId,
          content: generateSupplierReply(content),
          senderRole: "supplier",
          senderName: conv.supplierName,
          createdAt: new Date().toISOString(),
        };
        const target = conversations.get(conversationId);
        if (!target) return;
        target.messages.push(reply);
        // The buyer is presumably still in the room; for other tabs, bump unread.
        io.to(`conv:${conversationId}`).emit("message:new", reply);
        io.emit("conversations:list", toListPayload());
      }, delay);
    }
  });

  // Typing indicators (broadcast to room, exclude sender via socket.to).
  socket.on("typing:start", (payload) => {
    const { conversationId, role } = payload;
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      typing: true,
      role,
    });
  });

  socket.on("typing:stop", (payload) => {
    const { conversationId, role } = payload;
    if (!conversationId) return;
    socket.to(`conv:${conversationId}`).emit("typing:update", {
      conversationId,
      typing: false,
      role,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[chat-service] Client disconnected: ${socket.id} (${reason})`);
  });

  socket.on("error", (err) => {
    console.error(`[chat-service] Socket error (${socket.id}):`, err);
  });
});

// ---------- Start ----------
const PORT = 3004;
seedConversations();

httpServer.listen(PORT, () => {
  console.log(`[chat-service] AELF Bazaar chat service running on port ${PORT}`);
});

// ---------- Graceful shutdown ----------
function shutdown(signal: string) {
  console.log(`[chat-service] Received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log("[chat-service] Server closed.");
      process.exit(0);
    });
  });
  // Force exit after 3s if graceful shutdown hangs.
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export type { ChatMessage, Conversation, ServerToClientEvents, ClientToServerEvents };
