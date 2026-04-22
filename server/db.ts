import { and, asc, count, desc, eq, gte, ilike, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { analyticsEvents, categories, favorites, InsertAnalyticsEvent, InsertFavorite, InsertOrder, InsertProduct, InsertSeller, InsertUser, orders, products, reviews, InsertReview, sellers, storeSettings, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---- Users ----
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function registerUser(data: { name: string; email: string; password: string }): Promise<{ id: number; email: string; name: string; role: string; openId: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getUserByEmail(data.email);
  if (existing) throw new Error("EMAIL_EXISTS");
  const passwordHash = await bcrypt.hash(data.password, 10);
  const openId = `local_${data.email}_${Date.now()}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash,
    loginMethod: "email",
    role: "user",
    lastSignedIn: new Date(),
  });
  const insertId = (result as any)[0]?.insertId as number;
  return { id: insertId, email: data.email, name: data.name, role: "user", openId };
}

export async function loginUser(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const user = await getUserByEmail(email);
  if (!user || !user.passwordHash) throw new Error("INVALID_CREDENTIALS");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");
  // Update lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function promoteToAdmin(email: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role: "admin" }).where(eq(users.email, email));
}

// ---- Categories ----
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(categories.name);
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result[0];
}

export async function upsertCategory(data: { id?: number; name: string; slug: string; icon?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.id) {
    await db.update(categories).set({ name: data.name, slug: data.slug, icon: data.icon }).where(eq(categories.id, data.id));
    return data.id;
  }
  const result = await db.insert(categories).values({ name: data.name, slug: data.slug, icon: data.icon });
  return (result as any)[0]?.insertId as number;
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(categories).where(eq(categories.id, id));
}

// ---- Products ----
export async function getProducts(opts?: { categoryId?: number; search?: string; featured?: boolean; limit?: number; offset?: number; approvedOnly?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts?.search) {
    const q = `%${opts.search.toLowerCase()}%`;
    conditions.push(or(
      sql`LOWER(${products.name}) LIKE ${q}`,
      sql`LOWER(${products.brand}) LIKE ${q}`,
      sql`LOWER(${products.description}) LIKE ${q}`,
      sql`LOWER(${products.slug}) LIKE ${q}`,
      sql`LOWER(COALESCE(${(products as any).nameUz}, '')) LIKE ${q}`,
      sql`LOWER(COALESCE(${(products as any).descriptionUz}, '')) LIKE ${q}`,
      sql`CAST(${products.price} AS CHAR) LIKE ${q}`,
    ));
  }
  if (opts?.featured) conditions.push(eq(products.isFeatured, true));
  if (opts?.approvedOnly) conditions.push(eq(products.isApproved, true));
  const query = db.select().from(products);
  if (conditions.length > 0) query.where(and(...conditions));
  query.orderBy(desc(products.createdAt));
  if (opts?.limit) query.limit(opts.limit);
  if (opts?.offset) query.offset(opts.offset);
  return query;
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result[0];
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(products).values(data);
  return (result as any)[0]?.insertId as number;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(products).where(eq(products.id, id));
}

export async function countProducts(opts?: { categoryId?: number; search?: string; approvedOnly?: boolean }) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts?.search) {
    const q = `%${opts.search.toLowerCase()}%`;
    conditions.push(or(
      sql`LOWER(${products.name}) LIKE ${q}`,
      sql`LOWER(${products.brand}) LIKE ${q}`,
      sql`LOWER(${products.description}) LIKE ${q}`,
      sql`LOWER(${products.slug}) LIKE ${q}`,
      sql`LOWER(COALESCE(${(products as any).nameUz}, '')) LIKE ${q}`,
      sql`LOWER(COALESCE(${(products as any).descriptionUz}, '')) LIKE ${q}`,
      sql`CAST(${products.price} AS CHAR) LIKE ${q}`,
    ));
  }
  if (opts?.approvedOnly) conditions.push(eq(products.isApproved, true));
  const query = db.select({ count: sql<number>`count(*)` }).from(products);
  if (conditions.length > 0) query.where(and(...conditions));
  const result = await query;
  return Number(result[0]?.count ?? 0);
}

// ---- Orders ----
export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(orders).values(data);
  return (result as any)[0]?.insertId as number;
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(id: number, status: "pending" | "confirmed" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

// ---- Favorites ----
export async function getFavoritesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
}

export async function addFavorite(userId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Check if already exists
  const existing = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId))).limit(1);
  if (existing.length > 0) return;
  await db.insert(favorites).values({ userId, productId });
}

export async function removeFavorite(userId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
}

export async function isFavorite(userId: number, productId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.productId, productId))).limit(1);
  return result.length > 0;
}

// ---- Store Settings ----
export async function getStoreSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllStoreSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(storeSettings);
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value ?? '';
  }
  return map;
}

export async function setStoreSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(storeSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

// ---- Sellers ----
export async function getAllSellers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellers).orderBy(desc(sellers.createdAt));
}

export async function getSellerByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
  return result[0];
}

export async function createSeller(data: InsertSeller) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sellers).values(data);
  return (result as any)[0]?.insertId as number;
}

export async function updateSeller(id: number, data: Partial<InsertSeller>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellers).set(data).where(eq(sellers.id, id));
}

export async function approveSeller(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellers).set({ isApproved: true }).where(eq(sellers.id, id));
}

export async function getSellerProducts(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.sellerId, sellerId)).orderBy(desc(products.createdAt));
}

export async function getHitProducts(limit?: number, sortByOrder?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const orderCol = sortByOrder ? asc(products.hitOrder) : desc(products.createdAt);
  const query = db.select().from(products).where(eq(products.isHit, true)).orderBy(orderCol);
  if (limit) query.limit(limit);
  return query;
}

export async function toggleProductHit(id: number, isHit: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ isHit }).where(eq(products.id, id));
}

// ---- Analytics ----
export async function trackEvent(event: InsertAnalyticsEvent) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(analyticsEvents).values(event);
  } catch (e) {
    console.warn("[Analytics] Failed to track event:", e);
  }
}

export async function getAnalyticsStats(days = 30) {
  const db = await getDb();
  if (!db) return null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Total counts by event type
  const eventCounts = await db
    .select({ eventType: analyticsEvents.eventType, total: count() })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventType);

  // Top viewed products
  const topProducts = await db
    .select({ productId: analyticsEvents.productId, productName: analyticsEvents.productName, views: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "product_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.productId, analyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(10);

  // Daily page views (last 14 days)
  const dailyViews = await db
    .select({
      date: sql<string>`DATE(${analyticsEvents.createdAt})`,
      views: count(),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "page_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(sql`DATE(${analyticsEvents.createdAt})`)
    .orderBy(sql`DATE(${analyticsEvents.createdAt})`);

  // Funnel: views → add_to_cart → orders
  const funnelCounts = eventCounts.reduce((acc, row) => {
    acc[row.eventType] = Number(row.total);
    return acc;
  }, {} as Record<string, number>);

  return {
    eventCounts,
    topProducts,
    dailyViews,
    funnel: {
      pageViews: funnelCounts["page_view"] ?? 0,
      productViews: funnelCounts["product_view"] ?? 0,
      addToCart: funnelCounts["add_to_cart"] ?? 0,
      orders: funnelCounts["order_placed"] ?? 0,
    },
  };
}

// ---- Reviews ----
export async function insertReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reviews).values(data);
}

export async function getApprovedReviewsByProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt));
}

export async function getAllReviews(status?: "pending" | "approved" | "hidden") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(reviews)
      .where(eq(reviews.status, status))
      .orderBy(desc(reviews.createdAt));
  }
  return db.select().from(reviews).orderBy(desc(reviews.createdAt));
}

export async function setReviewStatus(id: number, status: "pending" | "approved" | "hidden") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
}

export async function deleteReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviews).where(eq(reviews.id, id));
}

export async function getReviewCountsByProduct(productId: number) {
  const db = await getDb();
  if (!db) return { count: 0, avgRating: 0 };
  const rows = await db.select().from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")));
  if (rows.length === 0) return { count: 0, avgRating: 0 };
  const avg = rows.reduce((sum, r) => sum + r.rating, 0) / rows.length;
  return { count: rows.length, avgRating: Math.round(avg * 10) / 10 };
}
