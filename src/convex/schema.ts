import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ---- Roles & statuses -----------------------------------------------------
export const ROLES = {
  CLIENT: "client",
  SUPPLIER: "supplier",
  ADMIN: "admin",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.CLIENT),
  v.literal(ROLES.SUPPLIER),
  v.literal(ROLES.ADMIN),
);

export const SUPPLIER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const supplierStatusValidator = v.union(
  v.literal(SUPPLIER_STATUS.PENDING),
  v.literal(SUPPLIER_STATUS.APPROVED),
  v.literal(SUPPLIER_STATUS.REJECTED),
);

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

export const orderStatusValidator = v.union(
  v.literal(ORDER_STATUS.PENDING),
  v.literal(ORDER_STATUS.CONFIRMED),
  v.literal(ORDER_STATUS.SHIPPED),
  v.literal(ORDER_STATUS.IN_TRANSIT),
  v.literal(ORDER_STATUS.DELIVERED),
  v.literal(ORDER_STATUS.CANCELLED),
);

export const STOCK_MOVEMENT_TYPE = {
  DECREMENT: "decrement",
  RESTOCK: "restock",
} as const;

// ---- Schema ---------------------------------------------------------------
const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),

      role: v.optional(roleValidator),
      supplierStatus: v.optional(supplierStatusValidator),
      company: v.optional(v.string()),
      phone: v.optional(v.string()),
      country: v.optional(v.string()),
      businessType: v.optional(v.string()),
      rejectedReason: v.optional(v.string()),
    }).index("email", ["email"]),

    products: defineTable({
      supplierId: v.id("users"),
      name: v.string(),
      description: v.string(),
      category: v.string(),
      price: v.number(),
      unit: v.string(),
      imageUrl: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      currency: v.optional(v.string()),
      stock: v.number(),
      moq: v.optional(v.number()),
      active: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_supplier", ["supplierId"])
      .index("by_active", ["active"]),

    conversations: defineTable({
      clientId: v.id("users"),
      supplierId: v.id("users"),
      productId: v.optional(v.id("products")),
      createdAt: v.number(),
      updatedAt: v.number(),
      lastMessage: v.optional(v.string()),
      lastMessageAt: v.optional(v.number()),
      clientLastReadAt: v.optional(v.number()),
      supplierLastReadAt: v.optional(v.number()),
    })
      .index("by_client", ["clientId"])
      .index("by_supplier", ["supplierId"])
      .index("by_client_supplier", ["clientId", "supplierId"]),

    messages: defineTable({
      conversationId: v.id("conversations"),
      senderId: v.id("users"),
      type: v.union(
        v.literal(MESSAGE_TYPE.TEXT),
        v.literal(MESSAGE_TYPE.PAYMENT),
        v.literal(MESSAGE_TYPE.ORDER),
        v.literal(MESSAGE_TYPE.SYSTEM),
      ),
      content: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      paymentRequestId: v.optional(v.id("paymentRequests")),
      orderId: v.optional(v.id("orders")),
      createdAt: v.number(),
    }).index("by_conversation", ["conversationId", "createdAt"]),

    paymentRequests: defineTable({
      conversationId: v.id("conversations"),
      orderId: v.optional(v.id("orders")),
      supplierId: v.id("users"),
      clientId: v.id("users"),
      amount: v.number(),
      currency: v.string(),
      note: v.optional(v.string()),
      status: v.union(v.literal(PAYMENT_STATUS.PENDING), v.literal(PAYMENT_STATUS.PAID)),
      createdAt: v.number(),
      paidAt: v.optional(v.number()),
    })
      .index("by_conversation", ["conversationId"])
      .index("by_client", ["clientId"])
      .index("by_supplier", ["supplierId"]),

    orders: defineTable({
      orderNumber: v.string(),
      clientId: v.id("users"),
      supplierId: v.id("users"),
      productId: v.optional(v.id("products")),
      productName: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
      currency: v.string(),
      status: orderStatusValidator,
      paymentStatus: v.union(v.literal("unpaid"), v.literal("paid")),
      tracking: v.array(
        v.object({
          status: v.string(),
          location: v.optional(v.string()),
          note: v.optional(v.string()),
          time: v.number(),
        }),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
      .index("by_client", ["clientId"])
      .index("by_supplier", ["supplierId"])
      .index("by_orderNumber", ["orderNumber"]),

    stockMovements: defineTable({
      productId: v.id("products"),
      orderId: v.optional(v.id("orders")),
      supplierId: v.id("users"),
      type: v.union(
        v.literal(STOCK_MOVEMENT_TYPE.DECREMENT),
        v.literal(STOCK_MOVEMENT_TYPE.RESTOCK),
      ),
      quantity: v.number(),
      stockAfter: v.number(),
      reason: v.optional(v.string()),
      createdAt: v.number(),
    })
      .index("by_product", ["productId", "createdAt"])
      .index("by_supplier", ["supplierId", "createdAt"])
      .index("by_order", ["orderId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
