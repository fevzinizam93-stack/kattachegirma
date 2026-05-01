import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "seller"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  icon: varchar("icon", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;

// Store settings table
export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreSetting = typeof storeSettings.$inferSelect;

// Sellers table
export const sellers = mysqlTable("sellers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  telegram: varchar("telegram", { length: 128 }),
  description: text("description"),
  isApproved: boolean("isApproved").default(false),
  isBlocked: boolean("isBlocked").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  nameUz: varchar("nameUz", { length: 256 }),
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  descriptionUz: text("descriptionUz"),
  categoryId: int("categoryId").notNull(),
  brand: varchar("brand", { length: 128 }),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 12, scale: 2 }),
  discount: int("discount").default(0),
  imageUrl: text("imageUrl"),
  images: json("images").$type<string[]>().default([]),
  stock: int("stock").default(0),
  isNew: boolean("isNew").default(false),
  isFeatured: boolean("isFeatured").default(false),
  isHit: boolean("isHit").default(false),
  isPremium: boolean("isPremium").default(false),
  hitOrder: int("hitOrder").default(0),
  specs: json("specs").$type<Record<string, string>>().default({}),
  // Seller info
  sellerId: int("sellerId"),
  sellerPhone: varchar("sellerPhone", { length: 32 }),
  sellerTelegram: varchar("sellerTelegram", { length: 128 }),
  sellerName: varchar("sellerName", { length: 256 }),
  isApproved: boolean("isApproved").default(true),
  isActive: boolean("isActive").default(true).notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["approved", "pending", "rejected"]).default("approved").notNull(),
  viewCount: int("viewCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 256 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  items: json("items").$type<Array<{ productId: number; name: string; price: number; quantity: number; imageUrl?: string }>>().notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "delivered", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Favorites table
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Analytics events table
export const analyticsEvents = mysqlTable("analytics_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 64 }).notNull(), // page_view, product_view, add_to_cart, order_placed, search
  productId: int("productId"),
  productName: varchar("productName", { length: 256 }),
  page: varchar("page", { length: 256 }),
  sessionId: varchar("sessionId", { length: 64 }),
  userId: int("userId"),
  meta: json("meta").$type<Record<string, string | number>>().default({}),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// Reviews table
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  authorName: varchar("authorName", { length: 256 }).notNull(),
  userId: int("userId"),
  rating: int("rating").notNull(), // 1-5
  comment: text("comment").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "hidden"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// Promotional banners table
export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  titleUz: varchar("titleUz", { length: 256 }),
  description: text("description"),
  descriptionUz: text("descriptionUz"),
  bgColor: varchar("bgColor", { length: 32 }).default("#dc2626").notNull(),
  textColor: varchar("textColor", { length: 32 }).default("#ffffff").notNull(),
  link: varchar("link", { length: 512 }),
  linkText: varchar("linkText", { length: 128 }),
  linkTextUz: varchar("linkTextUz", { length: 128 }),
  endsAt: timestamp("endsAt"),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Banner = typeof banners.$inferSelect;
export type InsertBanner = typeof banners.$inferInsert;

// Telegram notification recipients
export const telegramRecipients = mysqlTable("telegram_recipients", {
  id: int("id").autoincrement().primaryKey(),
  chatId: varchar("chatId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelegramRecipient = typeof telegramRecipients.$inferSelect;
export type InsertTelegramRecipient = typeof telegramRecipients.$inferInsert;

// UTM tracking table
export const utmVisits = mysqlTable("utm_visits", {
  id: int("id").autoincrement().primaryKey(),
  utmSource: varchar("utmSource", { length: 128 }),
  utmMedium: varchar("utmMedium", { length: 128 }),
  utmCampaign: varchar("utmCampaign", { length: 128 }),
  utmContent: varchar("utmContent", { length: 128 }),
  utmTerm: varchar("utmTerm", { length: 128 }),
  landingPage: varchar("landingPage", { length: 512 }),
  referrer: varchar("referrer", { length: 512 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UtmVisit = typeof utmVisits.$inferSelect;
