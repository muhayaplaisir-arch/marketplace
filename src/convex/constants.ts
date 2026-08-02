/**
 * Shared domain constants — safe to import from both Convex functions and
 * the client bundle (no `convex/server` imports here).
 */

export const ROLES = {
  CLIENT: "client",
  SUPPLIER: "supplier",
  ADMIN: "admin",
} as const;

export const SUPPLIER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const MESSAGE_TYPE = {
  TEXT: "text",
  PAYMENT: "payment",
  ORDER: "order",
  SYSTEM: "system",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
} as const;

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SHIPPED: "shipped",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;
