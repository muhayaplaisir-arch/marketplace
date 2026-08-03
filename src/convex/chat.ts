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

/** Start (or reuse) a conversation between a client and a supplier. */
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
    if (match) return match._id;

    const now = Date.now();
    const id = await ctx.db.insert("conversations", {
      clientId: userId,
      supplierId: args.supplierId,
      productId: args.productId,
      createdAt: now,
      updatedAt: now,
    });
    return id;
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
    await ctx.db.patch(args.conversationId, {
      lastMessage: label || "Image",
      lastMessageAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Supplier sends a payment request inside the chat (Alibaba-style button).
 * Creates a payment request + a "payment" message the client can pay.
 */
export const requestPayment = mutation({
  args: {
    conversationId: v.id("conversations"),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.supplierId !== userId) {
      throw new Error("Seul le fournisseur peut demander un paiement.");
    }
    if (args.amount <= 0) throw new Error("Montant invalide.");
    const now = Date.now();
    const paymentRequestId = await ctx.db.insert("paymentRequests", {
      conversationId: args.conversationId,
      supplierId: conv.supplierId,
      clientId: conv.clientId,
      amount: args.amount,
      currency: DEFAULT_CURRENCY,
      note: args.note?.trim() || undefined,
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
    const label = `Demande de paiement : ${args.amount} ${DEFAULT_CURRENCY}`;
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
      const supplier = await ctx.db.get(pr.supplierId);
      const conv = await ctx.db.get(pr.conversationId);
      const product = conv?.productId ? await ctx.db.get(conv.productId) : null;
      const orderNumber = `INX-${now.toString().slice(-6)}`;
      orderId = await ctx.db.insert("orders", {
        orderNumber,
        clientId: pr.clientId,
        supplierId: pr.supplierId,
        productId: product?._id,
        productName: product?.name ?? "Commande (négociée en chat)",
        quantity: 1,
        unitPrice: pr.amount,
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
      // Decrement the product stock once the payment is confirmed.
      if (product) {
        await ctx.db.patch(product._id, {
          stock: Math.max(0, product.stock - 1),
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
