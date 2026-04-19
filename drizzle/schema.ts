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
  specs: json("specs").$type<Record<string, string>>().default({}),
  // Seller info
  sellerId: int("sellerId"),
  sellerPhone: varchar("sellerPhone", { length: 32 }),
  sellerTelegram: varchar("sellerTelegram", { length: 128 }),
  sellerName: varchar("sellerName", { length: 256 }),
  isApproved: boolean("isApproved").default(true),
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
