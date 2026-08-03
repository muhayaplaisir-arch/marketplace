import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { ROLES, SUPPLIER_STATUS } from "./schema";
import { ADMIN_SIGNUP_CODE } from "./adminConfig";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/** Get the current signed-in user id or throw. */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Vous devez être connecté.");
  return userId;
}

export const isAdminDoc = (user: Doc<"users"> | null | undefined) =>
  user?.role === ROLES.ADMIN;

/**
 * Complete the profile after first sign-in: choose a role
 * (client | supplier | admin).
 * - admin: requires the secret admin code.
 * - supplier: starts as "pending" until an admin approves.
 */
export const completeProfile = mutation({
  args: {
    role: v.union(
      v.literal(ROLES.CLIENT),
      v.literal(ROLES.SUPPLIER),
      v.literal(ROLES.ADMIN),
    ),
    name: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    businessType: v.optional(v.string()),
    adminCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Utilisateur introuvable.");
    if (user.role) throw new Error("Profil déjà complété.");

    const patch: Record<string, string> = {
      name: args.name.trim() || user.email || "Utilisateur",
    };
    if (args.phone) patch.phone = args.phone.trim();
    if (args.country) patch.country = args.country.trim();

    if (args.role === ROLES.ADMIN) {
      if (args.adminCode !== ADMIN_SIGNUP_CODE) {
        throw new Error(
          "Code d'inscription administrateur incorrect. L'accès admin est restreint.",
        );
      }
      patch.role = ROLES.ADMIN;
    } else if (args.role === ROLES.SUPPLIER) {
      if (!args.company || !args.company.trim()) {
        throw new Error("Le nom de votre entreprise est obligatoire.");
      }
      patch.role = ROLES.SUPPLIER;
      patch.supplierStatus = SUPPLIER_STATUS.PENDING;
      patch.company = args.company.trim();
      if (args.businessType) patch.businessType = args.businessType.trim();
    } else {
      patch.role = ROLES.CLIENT;
    }

    await ctx.db.patch(userId, patch);
    return ctx.db.get(userId);
  },
});

/** Update profile info (any authenticated user). */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    businessType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const patch: Record<string, string> = {};
    if (args.name?.trim()) patch.name = args.name.trim();
    if (args.phone) patch.phone = args.phone.trim();
    if (args.country) patch.country = args.country.trim();
    if (args.businessType) patch.businessType = args.businessType.trim();
    await ctx.db.patch(userId, patch);
    return ctx.db.get(userId);
  },
});
