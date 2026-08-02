import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";
import { ROLES, SUPPLIER_STATUS } from "./schema";
import { DEFAULT_CURRENCY } from "./adminConfig";

export const listMarketplaceProducts = query({
  args: {
    search: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const visible = [];
    for (const p of products) {
      if (!p.active) continue;
      const supplier = await ctx.db.get(p.supplierId);
      if (!supplier || supplier.role !== ROLES.SUPPLIER) continue;
      if (supplier.supplierStatus !== SUPPLIER_STATUS.APPROVED) continue;

      if (args.category && p.category !== args.category) continue;
      if (args.search) {
        const q = args.search.toLowerCase();
        const hay = `${p.name} ${p.description} ${supplier.company ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      visible.push({
        ...p,
        supplierName: supplier.company ?? supplier.name ?? "Fournisseur",
        supplierVerified: supplier.supplierStatus === SUPPLIER_STATUS.APPROVED,
      });
    }
    return visible.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const categories = new Set<string>();
    for (const p of products) {
      const supplier = await ctx.db.get(p.supplierId);
      if (!supplier || supplier.supplierStatus !== SUPPLIER_STATUS.APPROVED) continue;
      if (p.active) categories.add(p.category);
    }
    return Array.from(categories).sort();
  },
});

export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product) return null;
    const supplier = await ctx.db.get(product.supplierId);
    return {
      ...product,
      supplier: supplier
        ? {
            _id: supplier._id,
            name: supplier.name,
            company: supplier.company,
            country: supplier.country,
            phone: supplier.phone,
            supplierStatus: supplier.supplierStatus,
          }
        : null,
    };
  },
});

export const listMyProducts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_supplier", (q) => q.eq("supplierId", userId))
      .collect();
    return products.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    unit: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.number(),
    moq: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user || user.role !== ROLES.SUPPLIER) {
      throw new Error("Seuls les fournisseurs peuvent ajouter des produits.");
    }
    if (user.supplierStatus !== SUPPLIER_STATUS.APPROVED) {
      throw new Error("Votre compte fournisseur doit être validé par un administrateur.");
    }
    if (args.price < 0 || args.stock < 0) throw new Error("Valeurs invalides.");
    const id = await ctx.db.insert("products", {
      supplierId: userId,
      name: args.name.trim(),
      description: args.description.trim(),
      category: args.category.trim() || "Autre",
      price: args.price,
      unit: args.unit.trim() || "unité",
      imageUrl: args.imageUrl?.trim() || undefined,
      stock: args.stock,
      moq: args.moq,
      active: true,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    moq: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const product = await ctx.db.get(args.id);
    if (!product || product.supplierId !== userId) {
      throw new Error("Produit introuvable.");
    }
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.category !== undefined) patch.category = args.category.trim();
    if (args.price !== undefined) {
      if (args.price < 0) throw new Error("Prix invalide.");
      patch.price = args.price;
    }
    if (args.unit !== undefined) patch.unit = args.unit.trim();
    if (args.imageUrl !== undefined) patch.imageUrl = args.imageUrl.trim() || undefined;
    if (args.stock !== undefined) {
      if (args.stock < 0) throw new Error("Stock invalide.");
      patch.stock = args.stock;
    }
    if (args.moq !== undefined) patch.moq = args.moq;
    if (args.active !== undefined) patch.active = args.active;
    await ctx.db.patch(args.id, patch);
    return await ctx.db.get(args.id);
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const product = await ctx.db.get(id);
    if (!product || product.supplierId !== userId) {
      throw new Error("Produit introuvable.");
    }
    await ctx.db.delete(id);
  },
});

export const currency = DEFAULT_CURRENCY;
