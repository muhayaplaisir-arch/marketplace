import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import { MESSAGE_TYPE, PAYMENT_STATUS, ROLES } from "./schema";
import { DEFAULT_CURRENCY } from "./adminConfig";

export const listMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();
    const asSupplier = await ctx.db
      .query("conversations")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userId))
      .collect();

    const seen = new Set<string>();
    const all = [...asClient, ...asSupplier].filter((c) => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });

    const enriched = [];
    for (const c of all) {
      const otherId = c.clientId === userId ? c.supplierId : c.clientId;
      const other = await ctx.db.get(otherId);
      const product = c.productId ? await ctx.db.get(c.productId) : null;
      enriched.push({
        ...c,
        other: other
          ? {
              _id: other._id,
              name: other.name,
              company: other.company,
              country: other.country,
              role: other.role,
              supplierStatus: other.supplierStatus,
            }
          : null,
        productName: product?.name ?? null,
        myRole: c.clientId === userId ? ROLES.CLIENT : ROLES.SUPPLIER,
      });
    }
    return enriched.sort((a, b) => (b.lastMessageAt ?? b.createdAt) - (a.lastMessageAt ?? a.createdAt));
  },
});

export const getConversation = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(id);
    if (!conv || (conv.clientId !== userId && conv.supplierId !== userId)) return null;
    const otherId = conv.clientId === userId ? conv.supplierId : conv.clientId;
    const other = await ctx.db.get(otherId);
    const product = conv.productId ? await ctx.db.get(conv.productId) : null;
    return {
      ...conv,
      other: other
        ? {
            _id: other._id,
            name: other.name,
            company: other.company,
            country: other.country,
            role: other.role,
            supplierStatus: other.supplierStatus,
          }
        : null,
      productName: product?.name ?? null,
      myRole: conv.clientId === userId ? ROLES.CLIENT : ROLES.SUPPLIER,
    };
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(conversationId);
    if (!conv || (conv.clientId !== userId && conv.supplierId !== userId)) return [];
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    const enriched = [];
    for (const m of messages.sort((a, b) => a.createdAt - b.createdAt)) {
      let paymentRequest = null;
      if (m.paymentRequestId) paymentRequest = await ctx.db.get(m.paymentRequestId);
      let order = null;
      if (m.orderId) order = await ctx.db.get(m.orderId);
      const sender = await ctx.db.get(m.senderId);
      let imageUrl: string | null = null;
      if (m.imageStorageId) imageUrl = await ctx.storage.getUrl(m.imageStorageId);
      enriched.push({
        ...m,
        senderName: sender?.name ?? "Inconnu",
        senderRole: sender?.role ?? null,
        paymentRequest,
        order,
        imageUrl,
      });
    }
    return enriched;
  },
});

/** Total + per-conversation count of messages from the other party not yet read. */
export const getUnreadSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const asClient = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();
    const asSupplier = await ctx.db
      .query("conversations")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userId))
      .collect();
    const seen = new Set<string>();
    const convs = [...asClient, ...asSupplier].filter((c) => {
      if (seen.has(c._id)) return false;
      seen.add(c._id);
      return true;
    });

    let total = 0;
    const perConversation: Record<string, number> = {};
    for (const c of convs) {
      const lastRead =
        c.clientId === userId ? (c.clientLastReadAt ?? 0) : (c.supplierLastReadAt ?? 0);
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
        .collect();
      let count = 0;
      for (const m of messages) {
        if (m.senderId !== userId && m.createdAt > lastRead) count++;
      }
      if (count > 0) {
        perConversation[c._id] = count;
        total += count;
      }
    }
    return { total, perConversation };
  },
});

/** Mark the current user's messages in a conversation as read. */
export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(conversationId);
    if (!conv || (conv.clientId !== userId && conv.supplierId !== userId)) return;
    const now = Date.now();
    if (conv.clientId === userId) {
      await ctx.db.patch(conversationId, { clientLastReadAt: now });
    } else {
      await ctx.db.patch(conversationId, { supplierLastReadAt: now });
    }
  },
});

/**
 * Start (or reuse) a conversation between a client and a supplier.
 * Each time the client clicks "Discuter" on a product, the product (name +
 * price) is announced as a message — even when the conversation is reused —
 * so the supplier always knows which product the client is talking about
 * (a client may discuss several products in the same chat).
 */
export const startConversation = mutation({
  args: {
    supplierId: v.id("users"),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier || supplier.role !== ROLES.SUPPLIER) {
      throw new Error("Fournisseur introuvable.");
    }

    // Build the auto intro message about the product (name + price).
    const product = args.productId ? await ctx.db.get(args.productId) : null;
    let autoContent: string | null = null;
    if (product) {
      const currency = product.currency ?? DEFAULT_CURRENCY;
      const priceLabel = `${product.price.toLocaleString("fr-FR")} ${currency}`;
      autoContent = `Bonjour, je suis intéressé par « ${product.name} » au prix de ${priceLabel}/${product.unit}.`;
    }

    // Reuse an existing conversation if one exists for this pair (+product).
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_client_supplier", (q) =>
        q.eq("clientId", userId).eq("supplierId", args.supplierId),
      )
      .collect();
    const match =
      existing.find((c) => (c.productId ?? null) === (args.productId ?? null)) ??
      existing.find((c) => !c.productId) ??
      existing[0];

    const now = Date.now();
    const conversationId = match
      ? match._id
      : await ctx.db.insert("conversations", {
          clientId: userId,
          supplierId: args.supplierId,
          productId: args.productId,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: now,
          clientLastReadAt: now,
        });

    // Announce the product in the conversation, once per product (dedup by
    // exact content) so repeated clicks don't spam the supplier.
    if (autoContent) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect();
      const alreadySent = messages.some((m) => m.content === autoContent);
      if (!alreadySent) {
        await ctx.db.insert("messages", {
          conversationId,
          senderId: userId,
          type: MESSAGE_TYPE.TEXT,
          content: autoContent,
          createdAt: now,
        });
        await ctx.db.patch(conversationId, {
          lastMessage: autoContent,
          lastMessageAt: now,
          updatedAt: now,
        });
      }
    }

    return conversationId;
  },
});

/** Return a URL the client can POST a file to (Convex storage). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || (conv.clientId !== userId && conv.supplierId !== userId)) {
      throw new Error("Conversation introuvable.");
    }
    const content = args.content?.trim() || undefined;
    if (!content && !args.imageStorageId) throw new Error("Message vide.");
    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      type: MESSAGE_TYPE.TEXT,
      content,
      imageStorageId: args.imageStorageId,
      createdAt: now,
    });
    const label = [
      args.imageStorageId ? "📷 Image" : null,
      content ?? null,
    ]
      .filter(Boolean)
      .join(" ");
    // Sending counts as having read the conversation.
    const readPatch =
      conv.clientId === userId ? { clientLastReadAt: now } : { supplierLastReadAt: now };
    await ctx.db.patch(args.conversationId, {
      lastMessage: label || "Image",
      lastMessageAt: now,
      updatedAt: now,
      ...readPatch,
    });
  },
});

/**
 * Supplier sends a payment request inside the chat (Alibaba-style button).
 * The supplier picks the negotiated product (+ quantity), the amount is
 * computed after any discount and the product's own currency is used.
 */
export const requestPayment = mutation({
  args: {
    conversationId: v.id("conversations"),
    amount: v.number(),
    note: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.supplierId !== userId) {
      throw new Error("Seul le fournisseur peut demander un paiement.");
    }
    if (args.amount <= 0) throw new Error("Montant invalide.");
    const now = Date.now();

    // Resolve the negotiated product (its currency + name follow the order).
    let currency = DEFAULT_CURRENCY;
    let product: { _id: any; name: string; currency?: string } | null = null;
    if (args.productId) {
      const p = await ctx.db.get(args.productId);
      if (!p || p.supplierId !== userId) throw new Error("Produit introuvable.");
      product = p;
      currency = p.currency ?? DEFAULT_CURRENCY;
    }

    const paymentRequestId = await ctx.db.insert("paymentRequests", {
      conversationId: args.conversationId,
      supplierId: conv.supplierId,
      clientId: conv.clientId,
      amount: args.amount,
      currency,
      note: args.note?.trim() || undefined,
      productId: product?._id,
      productName: product?.name,
      quantity: args.quantity && args.quantity > 0 ? args.quantity : undefined,
      status: PAYMENT_STATUS.PENDING,
      createdAt: now,
    });
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      type: MESSAGE_TYPE.PAYMENT,
      paymentRequestId,
      content: args.note?.trim() || undefined,
      createdAt: now,
    });
    const label = `Demande de paiement : ${args.amount} ${currency}`;
    await ctx.db.patch(args.conversationId, {
      lastMessage: label,
      lastMessageAt: now,
      updatedAt: now,
    });
    return paymentRequestId;
  },
});

/** Mark a payment request as paid (client side, simulated gateway). */
export const payPaymentRequest = mutation({
  args: { paymentRequestId: v.id("paymentRequests") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const pr = await ctx.db.get(args.paymentRequestId);
    if (!pr || pr.clientId !== userId) throw new Error("Demande de paiement introuvable.");
    if (pr.status === PAYMENT_STATUS.PAID) return;
    const now = Date.now();

    // Create the corresponding order the first time.
    let orderId = pr.orderId;
    if (!orderId) {
      const conv = await ctx.db.get(pr.conversationId);
      const product = pr.productId
        ? await ctx.db.get(pr.productId)
        : conv?.productId
          ? await ctx.db.get(conv.productId)
          : null;
      const qty = pr.quantity && pr.quantity > 0 ? pr.quantity : 1;
      const orderNumber = `INX-${now.toString().slice(-6)}`;
      orderId = await ctx.db.insert("orders", {
        orderNumber,
        clientId: pr.clientId,
        supplierId: pr.supplierId,
        productId: product?._id,
        productName: pr.productName ?? product?.name ?? "Commande (négociée en chat)",
        quantity: qty,
        unitPrice: qty > 1 ? Math.round(pr.amount / qty) : pr.amount,
        total: pr.amount,
        currency: pr.currency,
        status: "confirmed",
        paymentStatus: "paid",
        tracking: [
          {
            status: "confirmed",
            note: "Paiement reçu",
            time: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
      // Decrement the product stock once the payment is confirmed + log the movement.
      if (product) {
        const newStock = Math.max(0, product.stock - qty);
        await ctx.db.patch(product._id, {
          stock: newStock,
        });
        await ctx.db.insert("stockMovements", {
          productId: product._id,
          orderId,
          supplierId: pr.supplierId,
          type: "decrement",
          quantity: qty,
          stockAfter: newStock,
          reason: "Paiement négocié en chat",
          createdAt: now,
        });
      }
      await ctx.db.patch(args.paymentRequestId, { orderId, status: PAYMENT_STATUS.PAID, paidAt: now });
      // notify in chat
      await ctx.db.insert("messages", {
        conversationId: pr.conversationId,
        senderId: userId,
        type: MESSAGE_TYPE.ORDER,
        orderId,
        content: `Commande ${orderNumber} payée`,
        createdAt: now,
      });
      await ctx.db.patch(pr.conversationId, {
        lastMessage: `Paiement reçu (${pr.amount} ${pr.currency})`,
        lastMessageAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(args.paymentRequestId, { status: PAYMENT_STATUS.PAID, paidAt: now });
    }
  },
});
