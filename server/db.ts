import { and, asc, count, desc, eq, gte, ilike, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { analyticsEvents, banners, Banner, InsertBanner, brands, Brand, InsertBrand, categories, conversations, Conversation, InsertConversation, favorites, InsertAnalyticsEvent, InsertFavorite, InsertOrder, InsertProduct, InsertSeller, InsertUser, messages, Message, InsertMessage, notifications, InsertNotification, orders, products, reviews, InsertReview, sellers, sellerContacts, SellerContact, InsertSellerContact, sellerReviews, InsertSellerReview, storeSettings, telegramRecipients, TelegramRecipient, users, User, utmVisits, UtmVisit } from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = createPool({
        uri: process.env.DATABASE_URL,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
      });
      _db = drizzle(pool);
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
export async function getProducts(opts?: { categoryId?: number; search?: string; featured?: boolean; limit?: number; offset?: number; approvedOnly?: boolean; isPremium?: boolean; includeInactive?: boolean; minPrice?: number; maxPrice?: number; sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'discount'; brands?: string[]; minRating?: number }) {
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
  if (!opts?.includeInactive) conditions.push(eq(products.isActive, true));
  if (opts?.approvedOnly) conditions.push(eq(products.isApproved, true));
  if (opts?.isPremium !== undefined) conditions.push(eq(products.isPremium, opts.isPremium));
  if (opts?.minPrice != null) conditions.push(sql`CAST(${products.price} AS DECIMAL) >= ${opts.minPrice}`);
  if (opts?.maxPrice != null) conditions.push(sql`CAST(${products.price} AS DECIMAL) <= ${opts.maxPrice}`);
  if (opts?.brands && opts.brands.length > 0) {
    const brandConds = opts.brands.map(b => sql`LOWER(${products.brand}) = ${b.toLowerCase()}`);
    conditions.push(or(...brandConds));
  }
  if (opts?.minRating != null) {
    const minR = opts.minRating;
    conditions.push(sql`(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved') >= ${minR}`);
  }
  const query = db.select().from(products);
  if (conditions.length > 0) query.where(and(...conditions));
  const sortBy = opts?.sortBy ?? 'newest';
  if (sortBy === 'price_asc') {
    query.orderBy(asc(sql`CAST(${products.price} AS DECIMAL)`));
  } else if (sortBy === 'price_desc') {
    query.orderBy(desc(sql`CAST(${products.price} AS DECIMAL)`));
  } else if (sortBy === 'discount') {
    query.orderBy(desc(sql`CASE WHEN ${products.originalPrice} IS NOT NULL AND CAST(${products.originalPrice} AS DECIMAL) > 0 THEN (CAST(${products.originalPrice} AS DECIMAL) - CAST(${products.price} AS DECIMAL)) / CAST(${products.originalPrice} AS DECIMAL) ELSE 0 END`));
  } else {
    query.orderBy(desc(products.createdAt));
  }
  if (opts?.limit) query.limit(opts.limit);
  if (opts?.offset) query.offset(opts.offset);
  return query;
}

export async function getProductBrands(opts?: { categoryId?: number }): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(products.isActive, true), sql`${products.brand} IS NOT NULL`, sql`${products.brand} != ''`];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  const result = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(and(...conditions))
    .orderBy(asc(products.brand));
  return result.map(r => r.brand).filter(Boolean) as string[];
}

export async function getSlugExists(slug: string, excludeId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
  if (result.length === 0) return false;
  if (excludeId !== undefined) return result[0].id !== excludeId;
  return true;
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

export async function getProductsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(inArray(products.id, ids));
}

export async function getSimilarProducts(categoryId: number, excludeId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.moderationStatus, 'approved'), sql`${products.id} != ${excludeId}`))
    .orderBy(desc(products.createdAt))
    .limit(limit);
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

export async function countProducts(opts?: { categoryId?: number; search?: string; approvedOnly?: boolean; isPremium?: boolean; includeInactive?: boolean; minPrice?: number; maxPrice?: number; brands?: string[]; minRating?: number }) {
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
  if (!opts?.includeInactive) conditions.push(eq(products.isActive, true));
  if (opts?.approvedOnly) conditions.push(eq(products.isApproved, true));
  if (opts?.isPremium !== undefined) conditions.push(eq(products.isPremium, opts.isPremium));
  if (opts?.minPrice != null) conditions.push(sql`CAST(${products.price} AS DECIMAL) >= ${opts.minPrice}`);
  if (opts?.maxPrice != null) conditions.push(sql`CAST(${products.price} AS DECIMAL) <= ${opts.maxPrice}`);
  if (opts?.brands && opts.brands.length > 0) {
    const brandConds = opts.brands.map(b => sql`LOWER(${products.brand}) = ${b.toLowerCase()}`);
    conditions.push(or(...brandConds));
  }
  if (opts?.minRating != null) {
    const minR = opts.minRating;
    conditions.push(sql`(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved') >= ${minR}`);
  }
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
  const query = db.select().from(products).where(and(eq(products.isHit, true), eq(products.isActive, true))).orderBy(orderCol);
  if (limit) query.limit(limit);
  return query;
}

export async function toggleProductHit(id: number, isHit: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ isHit }).where(eq(products.id, id));
}

export async function toggleProductActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set({ isActive }).where(eq(products.id, id));
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

  // Daily page views — use raw SQL alias to avoid MySQL GROUP BY issue with table-qualified column
  const dailyViews = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      views: count(),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "page_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);

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
export async function insertReview(data: InsertReview): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  return (result as any)[0]?.insertId ?? 0;
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

// ---- View Counter ----
export async function incrementViewCount(productId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  await db.update(products)
    .set({ viewCount: sql`COALESCE(viewCount, 0) + 1` })
    .where(eq(products.id, productId));
  const rows = await db.select({ viewCount: products.viewCount }).from(products).where(eq(products.id, productId));
  return rows[0]?.viewCount ?? 0;
}

// ---- Banners ----
export async function getActiveBanners(): Promise<Banner[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const rows = await db.select().from(banners)
    .where(eq(banners.isActive, true))
    .orderBy(asc(banners.sortOrder), desc(banners.createdAt));
  // Filter out expired banners (endsAt < now)
  return rows.filter(b => !b.endsAt || b.endsAt > now);
}

export async function getAllBanners(): Promise<Banner[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(banners).orderBy(asc(banners.sortOrder), desc(banners.createdAt));
}

export async function createBanner(data: Omit<InsertBanner, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(banners).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateBanner(id: number, data: Partial<Omit<InsertBanner, "id" | "createdAt" | "updatedAt">>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(banners).set(data).where(eq(banners.id, id));
}

export async function deleteBanner(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(banners).where(eq(banners.id, id));
}

// ---- Telegram Recipients ----
export async function getTelegramRecipients(): Promise<TelegramRecipient[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telegramRecipients).orderBy(asc(telegramRecipients.createdAt));
}

export async function getActiveTelegramRecipients(): Promise<TelegramRecipient[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telegramRecipients).where(eq(telegramRecipients.isActive, true));
}

export async function addTelegramRecipient(chatId: string, name: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(telegramRecipients).values({ chatId, name, isActive: true });
  return (result[0] as { insertId: number }).insertId;
}

export async function toggleTelegramRecipient(id: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(telegramRecipients).set({ isActive }).where(eq(telegramRecipients.id, id));
}

export async function deleteTelegramRecipient(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(telegramRecipients).where(eq(telegramRecipients.id, id));
}

// ---- Moderation ----
export async function getPendingProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.moderationStatus, "pending")).orderBy(desc(products.createdAt));
}

export async function setProductModerationStatus(id: number, status: "approved" | "pending" | "rejected"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(products).set({ moderationStatus: status, isApproved: status === "approved" }).where(eq(products.id, id));
}

export async function getSellerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function setSellerBlocked(id: number, blocked: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(sellers).set({ isBlocked: blocked }).where(eq(sellers.id, id));
}

// ---- UTM Tracking ----
export async function recordUtmVisit(data: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  userAgent?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(utmVisits).values({
    utmSource: data.utmSource ?? null,
    utmMedium: data.utmMedium ?? null,
    utmCampaign: data.utmCampaign ?? null,
    utmContent: data.utmContent ?? null,
    utmTerm: data.utmTerm ?? null,
    landingPage: data.landingPage ?? null,
    referrer: data.referrer ?? null,
    userAgent: data.userAgent ?? null,
  });
}

export async function getUtmStats(days = 30): Promise<{
  total: number;
  bySource: { source: string; count: number }[];
  byCampaign: { campaign: string; count: number }[];
  byDay: { date: string; count: number }[];
  instagramTotal: number;
}> {
  const db = await getDb();
  if (!db) return { total: 0, bySource: [], byCampaign: [], byDay: [], instagramTotal: 0 };

  const since = new Date();
  since.setDate(since.getDate() - days);

  const allRows = await db
    .select()
    .from(utmVisits)
    .where(gte(utmVisits.createdAt, since))
    .orderBy(desc(utmVisits.createdAt));

  const total = allRows.length;

  // Group by source
  const sourceMap: Record<string, number> = {};
  const campaignMap: Record<string, number> = {};
  const dayMap: Record<string, number> = {};

  for (const row of allRows) {
    const src = row.utmSource ?? "прямой";
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;

    const camp = row.utmCampaign ?? "—";
    campaignMap[camp] = (campaignMap[camp] ?? 0) + 1;

    const day = row.createdAt.toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }

  const bySource = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const byCampaign = Object.entries(campaignMap)
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count);

  // Fill missing days with 0
  const byDay: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.push({ date: key, count: dayMap[key] ?? 0 });
  }

  const instagramTotal = allRows.filter(
    (r) => r.utmSource?.toLowerCase() === "instagram"
  ).length;

  return { total, bySource, byCampaign, byDay, instagramTotal };
}

// ─── VIP User Management ──────────────────────────────────────────────────────

export async function getVipUsers(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.role, "vip")).orderBy(desc(users.createdAt));
}

export async function getAllUsersForAdmin(): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(500);
}

export async function setUserVip(
  userId: number,
  isVip: boolean,
  expiresAt?: Date | null
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (isVip) {
    // Never downgrade admin to vip — admin already has full access including VIP prices
    const existing = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (existing[0]?.role !== "admin") {
      await db.update(users).set({ role: "vip", vipExpiresAt: expiresAt ?? null }).where(eq(users.id, userId));
    } else {
      // Admin: just update vipExpiresAt if provided, keep role as admin
      await db.update(users).set({ vipExpiresAt: expiresAt ?? null }).where(eq(users.id, userId));
    }
  } else {
    // When revoking VIP, only reset to 'user' if they are currently 'vip' (not admin)
    const existing = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (existing[0]?.role !== "admin") {
      await db.update(users).set({ role: "user", vipExpiresAt: null }).where(eq(users.id, userId));
    }
  }
}

export async function findUserByEmailOrPhone(query: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(
    or(eq(users.email, query), eq(users.phone, query))
  ).limit(1);
  return result[0] ?? null;
}

export async function updateUserPhone(userId: number, phone: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ phone }).where(eq(users.id, userId));
}

// ---- Seller Reviews ----
export async function getSellerReviews(sellerId: number, visibleOnly = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sellerReviews.sellerId, sellerId)];
  if (visibleOnly) conditions.push(eq(sellerReviews.isVisible, true));
  return db.select().from(sellerReviews).where(and(...conditions)).orderBy(desc(sellerReviews.createdAt));
}

export async function createSellerReview(data: InsertSellerReview) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sellerReviews).values(data);
  return (result as any)[0]?.insertId as number;
}

export async function getSellerRatingStats(sellerId: number): Promise<{ avgRating: number; totalReviews: number }> {
  const db = await getDb();
  if (!db) return { avgRating: 0, totalReviews: 0 };
  const result = await db
    .select({
      avg: sql<number>`AVG(${sellerReviews.rating})`,
      total: sql<number>`COUNT(*)`,
    })
    .from(sellerReviews)
    .where(and(eq(sellerReviews.sellerId, sellerId), eq(sellerReviews.isVisible, true)));
  return {
    avgRating: Number(result[0]?.avg ?? 0),
    totalReviews: Number(result[0]?.total ?? 0),
  };
}

export async function getSellerProductStats(sellerId: number): Promise<{ productCount: number; totalViews: number }> {
  const db = await getDb();
  if (!db) return { productCount: 0, totalViews: 0 };
  const result = await db
    .select({
      productCount: sql<number>`COUNT(*)`,
      totalViews: sql<number>`SUM(COALESCE(${products.viewCount}, 0))`,
    })
    .from(products)
    .where(and(eq(products.sellerId, sellerId), eq(products.isApproved, true), eq(products.isActive, true)));
  return {
    productCount: Number(result[0]?.productCount ?? 0),
    totalViews: Number(result[0]?.totalViews ?? 0),
  };
}

export async function getApprovedSellers(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sellers.isApproved, true)];
  if (search) {
    const q = `%${search.toLowerCase()}%`;
    conditions.push(sql`LOWER(${sellers.name}) LIKE ${q}`);
  }
  return db.select().from(sellers).where(and(...conditions)).orderBy(asc(sellers.name));
}

export async function hideSellerReview(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellerReviews).set({ isVisible: false }).where(eq(sellerReviews.id, id));
}

export async function getSalesProducts(limit?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        eq(products.isApproved, true),
        sql`(${products.originalPrice} IS NOT NULL AND CAST(${products.originalPrice} AS DECIMAL) > CAST(${products.price} AS DECIMAL))`
      )
    )
    .orderBy(
      desc(sql`CASE WHEN ${products.discountEndsAt} IS NOT NULL THEN 1 ELSE 0 END`),
      asc(products.discountEndsAt),
      desc(sql`(CAST(${products.originalPrice} AS DECIMAL) - CAST(${products.price} AS DECIMAL)) / CAST(${products.originalPrice} AS DECIMAL)`)
    );
  if (limit) query.limit(limit);
  return query;
}

// ---- Notifications ----
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function countUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ---- Admin <-> Seller Messaging ----

/** Get or create a conversation between an admin and a seller (by their user IDs) */
export async function getOrCreateConversation(adminId: number, sellerUserId: number): Promise<Conversation | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.adminId, adminId), eq(conversations.sellerId, sellerUserId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  await db.insert(conversations).values({ adminId, sellerId: sellerUserId });
  const created = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.adminId, adminId), eq(conversations.sellerId, sellerUserId)))
    .limit(1);
  return created[0] ?? null;
}

/** Get all conversations for admin (with last message preview) */
export async function getAdminConversations(adminId: number) {
  const db = await getDb();
  if (!db) return [];
  const convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.adminId, adminId))
    .orderBy(desc(conversations.updatedAt));
  return convs;
}

/** Get conversation for a seller (by their user ID) */
export async function getSellerConversation(sellerUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.sellerId, sellerUserId))
    .limit(1);
  return result[0] ?? null;
}

/** Get messages for a conversation */
export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

/** Send a message */
export async function sendMessage(data: InsertMessage): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(messages).values(data);
  // Update conversation's updatedAt
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, data.conversationId));
}

/** Mark all messages in a conversation as read for a given recipient */
export async function markConversationRead(conversationId: number, recipientId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
        // Only mark messages NOT sent by this user (i.e., messages received by them)
        sql`${messages.senderId} != ${recipientId}`
      )
    );
}

/** Count unread messages for a user across all their conversations */
export async function countUnreadMessages(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  // Find all conversations where user is either admin or seller
  const userConvs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(or(eq(conversations.adminId, userId), eq(conversations.sellerId, userId)));
  if (userConvs.length === 0) return 0;
  const convIds = userConvs.map((c) => c.id);
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(
      and(
        sql`${messages.conversationId} IN (${sql.join(convIds.map((id) => sql`${id}`), sql`, `)})`,
        eq(messages.isRead, false),
        sql`${messages.senderId} != ${userId}`
      )
    );
  return result[0]?.count ?? 0;
}

// ---- Seller Contacts (phone book) ----

/** Get all saved seller contacts (visible to admin and sellers) */
export async function getSellerContacts(): Promise<SellerContact[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sellerContacts).orderBy(asc(sellerContacts.name));
}

/** Create a new seller contact */
export async function createSellerContact(data: InsertSellerContact): Promise<SellerContact | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(sellerContacts).values(data);
  const result = await db
    .select()
    .from(sellerContacts)
    .where(and(eq(sellerContacts.name, data.name), eq(sellerContacts.phone, data.phone)))
    .orderBy(desc(sellerContacts.createdAt))
    .limit(1);
  return result[0] ?? null;
}

/** Delete a seller contact by id */
export async function deleteSellerContact(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(sellerContacts).where(eq(sellerContacts.id, id));
}

// ---- Brands (saved brand list for product forms) ----
/** Get all saved brands ordered by name */
export async function getBrands(): Promise<Brand[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).orderBy(asc(brands.name));
}

/** Create a new brand */
export async function createBrand(data: InsertBrand): Promise<Brand | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(brands).values(data);
  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.name, data.name))
    .orderBy(desc(brands.createdAt))
    .limit(1);
  return result[0] ?? null;
}

/** Delete a brand by id */
export async function deleteBrand(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(brands).where(eq(brands.id, id));
}

// ---- Bulk price recalculation ----
/** Recalculate all product prices based on new USD→UZS rate using costPrice as base.
 *  Only updates products where costPrice > 0.
 *  Returns number of updated products.
 */
export async function bulkRecalcPrices(newRate: number, markupPercent: number = 0): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const prods = await db.select({
    id: products.id,
    costPrice: products.costPrice,
  }).from(products).where(
    and(
      sql`${products.costPrice} IS NOT NULL`,
      sql`CAST(${products.costPrice} AS DECIMAL) > 0`
    )
  );
  let updated = 0;
  const multiplier = 1 + markupPercent / 100;
  for (const prod of prods) {
    const costUsd = parseFloat(prod.costPrice as string);
    const newPriceUzs = Math.round(costUsd * newRate * multiplier);
    await db.update(products)
      .set({ price: String(newPriceUzs) })
      .where(eq(products.id, prod.id));
    updated++;
  }
  return updated;
}

// ---- Public Seller Profile ----
export async function getSellerPublicProfile(sellerId: number) {
  const db = await getDb();
  if (!db) return null;

  const sellerRows = await db.select().from(sellers).where(eq(sellers.id, sellerId)).limit(1);
  const seller = sellerRows[0] ?? null;
  if (!seller || !seller.isApproved || seller.isBlocked) return null;

  const sellerProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.sellerId, sellerId),
        eq(products.isApproved, true),
        eq(products.isActive, true)
      )
    )
    .orderBy(desc(products.createdAt));

  const stats = await getSellerProductStats(sellerId);
  const rating = await getSellerRatingStats(sellerId);

  return {
    seller,
    products: sellerProducts,
    stats,
    rating,
  };
}
