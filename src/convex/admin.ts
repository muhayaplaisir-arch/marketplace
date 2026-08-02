import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import { ROLES, SUPPLIER_STATUS } from "./schema";

export const isAdminUser = async (ctx: any, userId: string | null) => {
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  return user?.role === ROLES.ADMIN;
};

export const listSuppliers = query({
  args: {
    status: v.optional(
      v.union(
        v.literal(SUPPLIER_STATUS.PENDING),
        v.literal(SUPPLIER_STATUS.APPROVED),
        v.literal(SUPPLIER_STATUS.REJECTED),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");
    const users = await ctx.db.query("users").collect();
    const suppliers = users.filter((u) => u.role === ROLES.SUPPLIER);
    let filtered = suppliers;
    if (args.status) filtered = suppliers.filter((s) => s.supplierStatus === args.status);
    const enriched = [];
    for (const s of filtered.sort((a, b) => (a._creationTime > b._creationTime ? -1 : 1))) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_supplier", (q) => q.eq("supplierId", s._id))
        .collect();
      const orders = await ctx.db
        .query("orders")
        .withIndex("by_supplier", (q) => q.eq("supplierId", s._id))
        .collect();
      enriched.push({
        ...s,
        productCount: products.length,
        orderCount: orders.length,
        totalRevenue: orders
          .filter((o) => o.paymentStatus === "paid")
          .reduce((sum, o) => sum + o.total, 0),
      });
    }
    return enriched;
  },
});

export const approveSupplier = mutation({
  args: { supplierId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier || supplier.role !== ROLES.SUPPLIER) throw new Error("Fournisseur introuvable.");
    await ctx.db.patch(args.supplierId, {
      supplierStatus: SUPPLIER_STATUS.APPROVED,
      rejectedReason: undefined,
    });
  },
});

export const rejectSupplier = mutation({
  args: { supplierId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");
    const supplier = await ctx.db.get(args.supplierId);
    if (!supplier || supplier.role !== ROLES.SUPPLIER) throw new Error("Fournisseur introuvable.");
    await ctx.db.patch(args.supplierId, {
      supplierStatus: SUPPLIER_STATUS.REJECTED,
      rejectedReason: args.reason?.trim() || undefined,
    });
  },
});

export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");

    const users = await ctx.db.query("users").collect();
    const suppliers = users.filter((u) => u.role === ROLES.SUPPLIER);
    const clients = users.filter((u) => u.role === ROLES.CLIENT);
    const admins = users.filter((u) => u.role === ROLES.ADMIN);
    const pendingSuppliers = suppliers.filter((s) => s.supplierStatus === SUPPLIER_STATUS.PENDING);

    const products = await ctx.db.query("products").collect();
    const orders = await ctx.db.query("orders").collect();
    const conversations = await ctx.db.query("conversations").collect();
    const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    const recentOrders = [];
    for (const o of [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)) {
      const client = await ctx.db.get(o.clientId);
      const supplier = await ctx.db.get(o.supplierId);
      recentOrders.push({
        ...o,
        clientName: client?.name ?? "Client",
        supplierName: supplier?.company ?? supplier?.name ?? "Fournisseur",
      });
    }

    return {
      totals: {
        users: users.length,
        clients: clients.length,
        suppliers: suppliers.length,
        admins: admins.length,
        pendingSuppliers: pendingSuppliers.length,
        products: products.length,
        orders: orders.length,
        conversations: conversations.length,
        totalRevenue,
      },
      recentOrders,
    };
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");
    const users = await ctx.db.query("users").collect();
    return users
      .filter((u) => u.role)
      .sort((a, b) => (a._creationTime > b._creationTime ? -1 : 1));
  },
});

export const listAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    if (!(await isAdminUser(ctx, userId))) throw new Error("Accès réservé aux administrateurs.");
    const orders = await ctx.db.query("orders").collect();
    const enriched = [];
    for (const o of [...orders].sort((a, b) => b.createdAt - a.createdAt)) {
      const client = await ctx.db.get(o.clientId);
      const supplier = await ctx.db.get(o.supplierId);
      enriched.push({
        ...o,
        clientName: client?.name ?? "Client",
        supplierName: supplier?.company ?? supplier?.name ?? "Fournisseur",
      });
    }
    return enriched;
  },
});
