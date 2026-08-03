import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import { MESSAGE_TYPE, ORDER_STATUS, ROLES, SUPPLIER_STATUS } from "./schema";
import { DEFAULT_CURRENCY } from "./adminConfig";

const VALID_SUPPLIER_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["shipped", "cancelled"],
  shipped: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
};

/** Client places a direct order on a product. */
export const createOrder = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || !product.active) throw new Error("Produit introuvable.");
    const supplier = await ctx.db.get(product.supplierId);
    if (!supplier || supplier.supplierStatus !== SUPPLIER_STATUS.APPROVED) {
      throw new Error("Le fournisseur de ce produit n'est pas encore validé.");
    }
    if (args.quantity < 1) throw new Error("Quantité invalide.");
    if (args.quantity > product.stock) throw new Error("Stock insuffisant.");

    const now = Date.now();
    const total = args.quantity * product.price;
    const orderNumber = `INX-${now.toString().slice(-6)}`;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      clientId: userId,
      supplierId: product.supplierId,
      productId: product._id,
      productName: product.name,
      quantity: args.quantity,
      unitPrice: product.price,
      total,
      currency: product.currency ?? DEFAULT_CURRENCY,
      status: ORDER_STATUS.PENDING,
      paymentStatus: "unpaid",
      tracking: [
        {
          status: "pending",
          note: "Commande créée — en attente de paiement",
          time: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });

    // make sure a conversation exists so tracking updates flow into chat
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_client_supplier", (q) =>
        q.eq("clientId", userId).eq("supplierId", product.supplierId),
      )
      .collect();
    const match =
      existing.find((c) => (c.productId ?? null) === product._id) ??
      existing.find((c) => !c.productId) ??
      existing[0];
    let conversationId = match?._id;
    if (!conversationId) {
      conversationId = await ctx.db.insert("conversations", {
        clientId: userId,
        supplierId: product.supplierId,
        productId: product._id,
        createdAt: now,
        updatedAt: now,
        lastMessage: `Commande ${orderNumber} créée`,
        lastMessageAt: now,
      });
    }
    await ctx.db.insert("messages", {
      conversationId,
      senderId: userId,
      type: MESSAGE_TYPE.ORDER,
      orderId,
      content: `Commande ${orderNumber} : ${args.quantity} × ${product.name}`,
      createdAt: now,
    });
    await ctx.db.patch(conversationId, {
      lastMessage: `Commande ${orderNumber} créée`,
      lastMessageAt: now,
      updatedAt: now,
    });

    return { orderId, conversationId };
  },
});

/** Simulated payment for a direct order. */
export const payOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) throw new Error("Commande introuvable.");
    if (order.paymentStatus === "paid") return;
    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      paymentStatus: "paid",
      status: ORDER_STATUS.CONFIRMED,
      tracking: [
        ...order.tracking,
        { status: "confirmed", note: "Paiement reçu", time: now },
      ],
      updatedAt: now,
    });
    // Decrement the product stock once the payment is confirmed + log the movement.
    if (order.productId) {
      const product = await ctx.db.get(order.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - order.quantity);
        await ctx.db.patch(product._id, {
          stock: newStock,
        });
        await ctx.db.insert("stockMovements", {
          productId: product._id,
          orderId: order._id,
          supplierId: order.supplierId,
          type: "decrement",
          quantity: order.quantity,
          stockAfter: newStock,
          reason: "Paiement de la commande",
          createdAt: now,
        });
      }
    }
    // notify in chat
    const convs = await ctx.db
      .query("conversations")
      .withIndex("by_client_supplier", (q) =>
        q.eq("clientId", userId).eq("supplierId", order.supplierId),
      )
      .collect();
    const conv = convs.find((c) => (c.productId ?? null) === (order.productId ?? null)) ?? convs[0];
    if (conv) {
      await ctx.db.insert("messages", {
        conversationId: conv._id,
        senderId: userId,
        type: MESSAGE_TYPE.ORDER,
        orderId: order._id,
        content: `Paiement reçu pour la commande ${order.orderNumber}`,
        createdAt: now,
      });
      await ctx.db.patch(conv._id, {
        lastMessage: `Paiement reçu (commande ${order.orderNumber})`,
        lastMessageAt: now,
        updatedAt: now,
      });
    }
  },
});

export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_client", (q) => q.eq("clientId", userId))
      .collect();
    const enriched = [];
    for (const o of orders.sort((a, b) => b.createdAt - a.createdAt)) {
      const supplier = await ctx.db.get(o.supplierId);
      enriched.push({
        ...o,
        supplierName: supplier?.company ?? supplier?.name ?? "Fournisseur",
      });
    }
    return enriched;
  },
});

export const listSupplierOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userId))
      .collect();
    const enriched = [];
    for (const o of orders.sort((a, b) => b.createdAt - a.createdAt)) {
      const client = await ctx.db.get(o.clientId);
      let stockRemaining: number | null = null;
      if (o.productId) {
        const product = await ctx.db.get(o.productId);
        stockRemaining = product ? product.stock : null;
      }
      enriched.push({
        ...o,
        clientName: client?.name ?? "Client",
        clientCountry: client?.country,
        stockRemaining,
      });
    }
    return enriched;
  },
});

/** Stock movement history for all the supplier's products (linked to orders). */
export const listSupplierStockMovements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const movements = await ctx.db
      .query("stockMovements")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userId))
      .collect();
    const enriched = [];
    for (const m of movements.sort((a, b) => b.createdAt - a.createdAt)) {
      const product = await ctx.db.get(m.productId);
      let orderNumber: string | null = null;
      if (m.orderId) {
        const order = await ctx.db.get(m.orderId);
        orderNumber = order?.orderNumber ?? null;
      }
      enriched.push({
        ...m,
        productName: product?.name ?? "Produit supprimé",
        orderNumber,
      });
    }
    return enriched;
  },
});

export const getOrder = query({
  args: { id: v.id("orders") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const order = await ctx.db.get(id);
    if (!order) return null;
    const isClient = order.clientId === userId;
    const isSupplier = order.supplierId === userId;
    if (!isClient && !isSupplier) return null;
    const other = await ctx.db.get(isClient ? order.supplierId : order.clientId);
    return {
      ...order,
      otherName: other?.company ?? other?.name ?? "Partenaire",
      myRole: isClient ? ROLES.CLIENT : ROLES.SUPPLIER,
    };
  },
});

/** Supplier pushes the order through tracking states with location/note. */
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal(ORDER_STATUS.CONFIRMED),
      v.literal(ORDER_STATUS.SHIPPED),
      v.literal(ORDER_STATUS.IN_TRANSIT),
      v.literal(ORDER_STATUS.DELIVERED),
      v.literal(ORDER_STATUS.CANCELLED),
    ),
    location: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.supplierId !== userId) throw new Error("Commande introuvable.");

    const allowed = VALID_SUPPLIER_TRANSITIONS[order.status];
    if (order.status === "cancelled" || order.status === "delivered") {
      throw new Error("Cette commande est déjà terminée.");
    }
    if (order.status === "pending") {
      throw new Error("Le client doit d'abord payer la commande.");
    }
    if (allowed && !allowed.includes(args.status)) {
      throw new Error(`Transition invalide depuis "${order.status}".`);
    }
    if (args.status === "cancelled") {
      // Put the units back in stock if the order had been paid + log the movement.
      if (order.paymentStatus === "paid" && order.productId) {
        const product = await ctx.db.get(order.productId);
        if (product) {
          const newStock = product.stock + order.quantity;
          await ctx.db.patch(product._id, { stock: newStock });
          await ctx.db.insert("stockMovements", {
            productId: product._id,
            orderId: order._id,
            supplierId: order.supplierId,
            type: "restock",
            quantity: order.quantity,
            stockAfter: newStock,
            reason: args.note?.trim() || "Commande annulée",
            createdAt: Date.now(),
          });
        }
      }
      await ctx.db.patch(args.orderId, {
        status: ORDER_STATUS.CANCELLED,
        tracking: [
          ...order.tracking,
          { status: "cancelled", note: args.note || "Commande annulée", time: Date.now() },
        ],
        updatedAt: Date.now(),
      });
      return;
    }
    const now = Date.now();
    await ctx.db.patch(args.orderId, {
      status: args.status,
      tracking: [
        ...order.tracking,
        {
          status: args.status,
          location: args.location?.trim() || undefined,
          note: args.note?.trim() || undefined,
          time: now,
        },
      ],
      updatedAt: now,
    });
  },
});
