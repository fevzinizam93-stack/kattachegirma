import { and, asc, count, desc, eq, getTableColumns, gte, ilike, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2";
import { analyticsEvents, banners, Banner, InsertBanner, brands, Brand, InsertBrand, categories, conversations, Conversation, InsertConversation, favorites, InsertAnalyticsEvent, InsertFavorite, InsertOrder, InsertProduct, InsertSeller, InsertUser, messages, Message, InsertMessage, notifications, InsertNotification, orders, products, reviews, InsertReview, sellers, sellerContacts, SellerContact, InsertSellerContact, sellerReviews, InsertSellerReview, storeSettings, telegramRecipients, TelegramRecipient, users, User, utmVisits, UtmVisit, quickOrders, QuickOrder, youtubeCache, indexingLog, IndexingLog, InsertIndexingLog } from "../drizzle/schema";
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

export async function setUserAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ avatarUrl: avatarUrl || null } as any).where(eq(users.id, userId));
}

export async function setEmailVerifyToken(userId: number, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifyToken: token, emailVerifyExpires: expires }).where(eq(users.id, userId));
}

export async function verifyEmailByToken(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(users).where(eq(users.emailVerifyToken, token)).limit(1);
  const u = rows[0];
  if (!u || !u.emailVerifyExpires || u.emailVerifyExpires < new Date()) return false;
  await db.update(users).set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpires: null }).where(eq(users.id, u.id));
  return true;
}

export async function setPasswordResetToken(email: string, token: string, expires: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserByEmail(email);
  if (!user) return false;
  await db.update(users).set({ passwordResetToken: token, passwordResetExpires: expires }).where(eq(users.id, user.id));
  return true;
}

export async function resetPasswordByToken(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(users).where(eq(users.passwordResetToken, token)).limit(1);
  const u = rows[0];
  if (!u || !u.passwordResetExpires || u.passwordResetExpires < new Date()) return false;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash, passwordResetToken: null, passwordResetExpires: null }).where(eq(users.id, u.id));
  return true;
}

export async function registerUser(data: { name: string; email: string; password: string; phone?: string }): Promise<{ id: number; email: string; name: string; role: string; openId: string }> {
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
    phone: data.phone || null,
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
  // Support both RU slug (/category/stiralnye-mashiny) and UZ slug (/kategoriya/kir-yuvish-mashinalar)
  const result = await db.select().from(categories)
    .where(or(eq(categories.slug, slug), eq((categories as any).slugUz, slug)))
    .limit(1);
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
export async function getProducts(opts?: { categoryId?: number; search?: string; featured?: boolean; limit?: number; offset?: number; approvedOnly?: boolean; isPremium?: boolean; includeInactive?: boolean; minPrice?: number; maxPrice?: number; sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'discount' | 'rating' | 'reviews' | 'popularity'; brands?: string[]; minRating?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts?.search) {
    const { buildSearchClause } = await import("./searchHelper");
    const { tokenGroups, synonymPhrases } = buildSearchClause(opts.search);
    const fieldLike = (pat: string) => or(
      sql`LOWER(${products.name}) LIKE ${pat}`,
      sql`LOWER(COALESCE(${(products as any).nameUz}, '')) LIKE ${pat}`,
      sql`LOWER(${products.brand}) LIKE ${pat}`,
      sql`LOWER(${products.slug}) LIKE ${pat}`,
      sql`LOWER(${products.description}) LIKE ${pat}`,
      sql`LOWER(COALESCE(${(products as any).descriptionUz}, '')) LIKE ${pat}`,
    );
    const orParts: any[] = [];
    if (tokenGroups.length > 0) {
      orParts.push(and(...tokenGroups.map((variants) => or(...variants.map((v) => fieldLike(`%${v}%`))))));
    }
    if (synonymPhrases.length > 0) {
      orParts.push(or(...synonymPhrases.map((p) => fieldLike(`%${p}%`))));
    }
    const rawSearch = opts.search.toLowerCase().trim();
    if (rawSearch) orParts.push(sql`CAST(${products.price} AS CHAR) LIKE ${`%${rawSearch}%`}`);
    if (orParts.length > 0) conditions.push(or(...orParts));
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
  const query = db.select({
    ...getTableColumns(products),
    avgRating: sql<number>`COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved'), 0)`,
    reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`,
  }).from(products);
  if (conditions.length > 0) query.where(and(...conditions));
  const sortBy = opts?.sortBy ?? 'newest';
  if (sortBy === 'price_asc') {
    query.orderBy(asc(sql`CAST(${products.price} AS DECIMAL)`));
  } else if (sortBy === 'price_desc') {
    query.orderBy(desc(sql`CAST(${products.price} AS DECIMAL)`));
  } else if (sortBy === 'discount') {
    query.orderBy(desc(sql`CASE WHEN ${products.originalPrice} IS NOT NULL AND CAST(${products.originalPrice} AS DECIMAL) > 0 THEN (CAST(${products.originalPrice} AS DECIMAL) - CAST(${products.price} AS DECIMAL)) / CAST(${products.originalPrice} AS DECIMAL) ELSE 0 END`));
  } else if (sortBy === 'rating') {
    query.orderBy(desc(sql`(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`));
  } else if (sortBy === 'reviews') {
    query.orderBy(desc(sql`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`));
  } else if (sortBy === 'popularity') {
    query.orderBy(desc(products.hitScore), desc(products.salesCount), desc(products.viewCount));
  } else if (opts?.search) {
    const rq = opts.search.toLowerCase().trim();
    const prefixP = `${rq}%`;
    const containsP = `%${rq}%`;
    query.orderBy(
      desc(sql`(
        (CASE WHEN LOWER(${products.name}) = ${rq} THEN 1000 ELSE 0 END)
        + (CASE WHEN LOWER(${products.name}) LIKE ${prefixP} THEN 400 ELSE 0 END)
        + (CASE WHEN LOWER(${products.name}) LIKE ${containsP} THEN 200 ELSE 0 END)
        + (CASE WHEN LOWER(COALESCE(${(products as any).nameUz}, '')) LIKE ${containsP} THEN 150 ELSE 0 END)
        + (CASE WHEN LOWER(COALESCE(${products.brand}, '')) LIKE ${containsP} THEN 120 ELSE 0 END)
        + (COALESCE(${products.hitScore}, 0) * 2)
        + COALESCE(${products.salesCount}, 0)
      )`),
      desc(products.createdAt)
    );
  } else {
    query.orderBy(desc(products.createdAt));
  }
  if (opts?.limit) query.limit(opts.limit);
  if (opts?.offset) query.offset(opts.offset);
  const rows = await query;
  return rows.map(p => ({ ...p, avgRating: Number(p.avgRating) || 0, reviewCount: Number(p.reviewCount) || 0 }));
}

// Get N products per category for homepage sections (one DB query for all categories)
export async function getProductsByCategories(categoryIds: number[], perCategory = 8): Promise<Record<number, Awaited<ReturnType<typeof getProducts>>>> {
  const db = await getDb();
  if (!db) return {};
  const allProds = await db.select({
    ...getTableColumns(products),
    avgRating: sql<number>`COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved'), 0)`,
    reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`,
  }).from(products)
    .where(and(
      eq(products.isActive, true),
      eq(products.isApproved, true),
      inArray(products.categoryId, categoryIds),
    ))
    .orderBy(desc(products.createdAt));
  const mappedProds = allProds.map(p => ({ ...p, avgRating: Number(p.avgRating) || 0, reviewCount: Number(p.reviewCount) || 0 }));
  const result: Record<number, typeof mappedProds> = {};
  for (const catId of categoryIds) {
    result[catId] = mappedProds.filter(p => p.categoryId === catId).slice(0, perCategory);
  }
  return result;
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

export async function getSlugUzExists(slugUz: string, excludeId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: products.id }).from(products).where(eq((products as any).slugUz, slugUz)).limit(1);
  if (result.length === 0) return false;
  if (excludeId !== undefined) return result[0].id !== excludeId;
  return true;
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Support both RU slug (/product/...) and UZ slug (/mahsulot/...)
  const result = await db.select().from(products)
    .where(or(eq(products.slug, slug), eq((products as any).slugUz, slug)))
    .limit(1);
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
  const rows = await db.select({
    ...getTableColumns(products),
    avgRating: sql<number>`COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved'), 0)`,
    reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`,
  }).from(products).where(inArray(products.id, ids));
  return rows.map(p => ({ ...p, avgRating: Number(p.avgRating) || 0, reviewCount: Number(p.reviewCount) || 0 }));
}

export async function getSimilarProducts(categoryId: number, excludeId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      ...getTableColumns(products),
      avgRating: sql<number>`COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved'), 0)`,
      reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`,
    })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.moderationStatus, 'approved'), sql`${products.id} != ${excludeId}`))
    .orderBy(desc(products.createdAt))
    .limit(limit);
  return rows.map(p => ({ ...p, avgRating: Number(p.avgRating) || 0, reviewCount: Number(p.reviewCount) || 0 }));
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
    const { buildSearchClause } = await import("./searchHelper");
    const { tokenGroups, synonymPhrases } = buildSearchClause(opts.search);
    const fieldLike = (pat: string) => or(
      sql`LOWER(${products.name}) LIKE ${pat}`,
      sql`LOWER(COALESCE(${(products as any).nameUz}, '')) LIKE ${pat}`,
      sql`LOWER(${products.brand}) LIKE ${pat}`,
      sql`LOWER(${products.slug}) LIKE ${pat}`,
      sql`LOWER(${products.description}) LIKE ${pat}`,
      sql`LOWER(COALESCE(${(products as any).descriptionUz}, '')) LIKE ${pat}`,
    );
    const orParts: any[] = [];
    if (tokenGroups.length > 0) {
      orParts.push(and(...tokenGroups.map((variants) => or(...variants.map((v) => fieldLike(`%${v}%`))))));
    }
    if (synonymPhrases.length > 0) {
      orParts.push(or(...synonymPhrases.map((p) => fieldLike(`%${p}%`))));
    }
    const rawSearch = opts.search.toLowerCase().trim();
    if (rawSearch) orParts.push(sql`CAST(${products.price} AS CHAR) LIKE ${`%${rawSearch}%`}`);
    if (orParts.length > 0) conditions.push(or(...orParts));
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

// Get products that need translation (missing nameUz or descriptionUz)
export async function getProductsNeedingTranslation(limit = 2000): Promise<Array<{ id: number; name: string; description: string | null; nameUz: string | null; descriptionUz: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({ id: products.id, name: products.name, description: products.description, nameUz: (products as any).nameUz, descriptionUz: (products as any).descriptionUz })
    .from(products)
    .where(
      or(
        sql`${(products as any).nameUz} IS NULL`,
        sql`${(products as any).nameUz} = ''`,
        sql`${(products as any).descriptionUz} IS NULL`,
        sql`${(products as any).descriptionUz} = ''`,
      )
    )
    .limit(limit);
  return result as Array<{ id: number; name: string; description: string | null; nameUz: string | null; descriptionUz: string | null }>;
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

export async function setOrderTelegramMessages(orderId: number, refs: Array<{ chatId: string; messageId: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ telegramMessages: refs as any }).where(eq(orders.id, orderId));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateOrderStatusWithManager(
  id: number,
  status: "pending" | "confirmed" | "delivered" | "cancelled",
  managerId?: string,
  managerName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: Record<string, unknown> = { status };
  if (managerId) updateData.managerId = managerId;
  if (managerName) updateData.managerName = managerName;
  if (managerId || managerName) updateData.takenAt = new Date();
  await db.update(orders).set(updateData as any).where(eq(orders.id, id));
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return rows[0] ?? null;
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
  await db.update(sellers).set({ isApproved: true, rejectionReason: null }).where(eq(sellers.id, id));
}

export async function rejectSeller(id: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sellers).set({ isApproved: false, rejectionReason: reason }).where(eq(sellers.id, id));
}

export async function getSellerProducts(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.sellerId, sellerId)).orderBy(desc(products.createdAt));
}

export async function getHitProducts(limit?: number, sortByOrder?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const orderCol = sortByOrder ? asc(products.hitOrder) : desc(products.hitScore);
  const query = db.select({
    ...getTableColumns(products),
    avgRating: sql<number>`COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved'), 0)`,
    reviewCount: sql<number>`(SELECT COUNT(*) FROM reviews r WHERE r.productId = ${products.id} AND r.status = 'approved')`,
  }).from(products).where(and(eq(products.isHit, true), eq(products.isActive, true))).orderBy(orderCol);
  if (limit) query.limit(limit);
  const rows = await query;
  return rows.map(p => ({ ...p, avgRating: Number(p.avgRating) || 0, reviewCount: Number(p.reviewCount) || 0 }));
}

export async function toggleProductHit(id: number, isHit: boolean) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // isHitManual = true means admin manually set this, bypass auto-calc
  await db.update(products).set({ isHit, isHitManual: isHit }).where(eq(products.id, id));
}

/** Increment click counter for a product */
export async function trackProductClick(productId: number) {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    sql`UPDATE products SET clickCount = clickCount + 1,
      hitScore = FLOOR(viewCount * 1 + (clickCount + 1) * 3 + salesCount * 10)
      WHERE id = ${productId}`
  );
  // Auto-promote to hit if score exceeds threshold (default 100)
  const settingRows = await db.select().from(storeSettings).where(eq(storeSettings.key, 'auto_hit_threshold'));
  const threshold = settingRows[0] ? parseInt(settingRows[0].value ?? '100') : 100;
  const autoRows = await db.select().from(storeSettings).where(eq(storeSettings.key, 'auto_hit_enabled'));
  const autoEnabled = (autoRows[0]?.value ?? 'true') === 'true';
  if (autoEnabled) {
    await db.execute(
      sql`UPDATE products
        SET isHit = CASE WHEN hitScore >= ${threshold} THEN TRUE ELSE isHit END
        WHERE id = ${productId} AND isHitManual = FALSE`
    );
  }
}

/** Recalculate hitScore for all products and auto-promote/demote hits */
export async function recalcAllHitScores() {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    sql`UPDATE products SET hitScore = FLOOR(viewCount * 1 + clickCount * 3 + salesCount * 10)`
  );
  const settingRows = await db.select().from(storeSettings).where(eq(storeSettings.key, 'auto_hit_threshold'));
  const threshold = settingRows[0] ? parseInt(settingRows[0].value ?? '100') : 100;
  const autoRows = await db.select().from(storeSettings).where(eq(storeSettings.key, 'auto_hit_enabled'));
  const autoEnabled = (autoRows[0]?.value ?? 'true') === 'true';
  if (autoEnabled) {
    await db.execute(
      sql`UPDATE products
        SET isHit = CASE
          WHEN isHitManual = TRUE THEN isHit
          WHEN hitScore >= ${threshold} THEN TRUE
          ELSE FALSE
        END
        WHERE isHitManual = FALSE`
    );
  }
}

/** Get auto-hit settings */
export async function getHitSettings() {
  const db = await getDb();
  if (!db) return { threshold: 100, autoEnabled: true };
  const rows = await db.select().from(storeSettings).where(
    sql`\`key\` IN ('auto_hit_threshold', 'auto_hit_enabled')`
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value ?? '';
  return {
    threshold: parseInt(map['auto_hit_threshold'] ?? '100'),
    autoEnabled: (map['auto_hit_enabled'] ?? 'true') === 'true',
  };
}

/** Save auto-hit settings */
export async function saveHitSettings(threshold: number, autoEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    sql`INSERT INTO store_settings (\`key\`, value) VALUES ('auto_hit_threshold', ${String(threshold)})
        ON DUPLICATE KEY UPDATE value = ${String(threshold)}`
  );
  await db.execute(
    sql`INSERT INTO store_settings (\`key\`, value) VALUES ('auto_hit_enabled', ${autoEnabled ? 'true' : 'false'})
        ON DUPLICATE KEY UPDATE value = ${autoEnabled ? 'true' : 'false'}`
  );
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

export async function getPopularSearchQueries(limit = 30, days = 90) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ query: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(meta, '$.query'))`, total: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "search"), gte(analyticsEvents.createdAt, since)))
    .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(meta, '$.query'))`)
    .orderBy(desc(count()))
    .limit(limit * 3);
  const seen = new Set<string>();
  const out: { query: string; total: number }[] = [];
  for (const r of rows) {
    const q = (r.query ?? "").trim();
    if (!q || q.toLowerCase() === "null" || q.length < 2) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ query: q, total: Number(r.total) });
    if (out.length >= limit) break;
  }
  return out;
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

  // Top viewed products (by product_view events)
  const topProducts = await db
    .select({ productId: analyticsEvents.productId, productName: analyticsEvents.productName, views: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "product_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.productId, analyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(100);

  // Top clicked products (by product_click events)
  const topClickedProducts = await db
    .select({ productId: analyticsEvents.productId, productName: analyticsEvents.productName, clicks: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "product_click"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.productId, analyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(100);

  // Top added to cart products
  const topCartProducts = await db
    .select({ productId: analyticsEvents.productId, productName: analyticsEvents.productName, cartAdds: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "add_to_cart"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.productId, analyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(100);

  // Top favorited products (from analytics events)
  const topFavoritedProducts = await db
    .select({ productId: analyticsEvents.productId, productName: analyticsEvents.productName, favs: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "add_to_favorites"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.productId, analyticsEvents.productName)
    .orderBy(desc(count()))
    .limit(100);

  // Search queries
  const searchQueries = await db
    .select({ query: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(meta, '$.query'))`, total: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "search"), gte(analyticsEvents.createdAt, since)))
    .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(meta, '$.query'))`)
    .orderBy(desc(count()))
    .limit(300);

  // Daily page views
  const dailyViews = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      views: count(),
    })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "page_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);

  // Unique sessions per day (по всем событиям, а не только просмотрам страниц)
  const dailySessions = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      sessions: sql<number>`COUNT(DISTINCT sessionId)`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);

  // Total unique sessions
  const uniqueSessionsResult = await db
    .select({ sessions: sql<number>`COUNT(DISTINCT sessionId)` })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since));
  const uniqueSessions = Number(uniqueSessionsResult[0]?.sessions ?? 0);

  // Unique users
  const uniqueUsersResult = await db
    .select({ users: sql<number>`COUNT(DISTINCT userId)` })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, since), sql`userId IS NOT NULL`));
  const uniqueUsers = Number(uniqueUsersResult[0]?.users ?? 0);

  // Top pages visited
  const topPages = await db
    .select({ page: analyticsEvents.page, views: count() })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "page_view"), gte(analyticsEvents.createdAt, since)))
    .groupBy(analyticsEvents.page)
    .orderBy(desc(count()))
    .limit(15);

  // Orders stats from orders table
  const ordersStats = await db
    .select({
      status: orders.status,
      total: count(),
      revenue: sql<number>`SUM(totalAmount)`,
    })
    .from(orders)
    .where(gte(orders.createdAt, since))
    .groupBy(orders.status);

  // Быстрые заказы (1 клик / Telegram) за период.
  // Цена хранится текстом (productPrice), поэтому выручку считаем по цифрам из строки.
  const quickRows = await db
    .select({ productPrice: quickOrders.productPrice })
    .from(quickOrders)
    .where(gte(quickOrders.createdAt, since));
  let quickRevenue = 0;
  for (const q of quickRows) {
    const digits = (q.productPrice ?? "").replace(/[^\d]/g, "");
    if (digits) quickRevenue += Number(digits);
  }
  const ordersStatsCombined = [
    ...ordersStats.map((r) => ({ status: String(r.status), total: Number(r.total), revenue: Number(r.revenue ?? 0) })),
    ...(quickRows.length > 0 ? [{ status: "Быстрые", total: quickRows.length, revenue: quickRevenue }] : []),
  ];

  // Daily orders
  const dailyOrders = await db
    .select({
      date: sql<string>`DATE(createdAt)`,
      ordersCount: count(),
      revenue: sql<number>`SUM(totalAmount)`,
    })
    .from(orders)
    .where(gte(orders.createdAt, since))
    .groupBy(sql`DATE(createdAt)`)
    .orderBy(sql`DATE(createdAt)`);

  // Top ordered products (from orders.items JSON)
  const recentOrders = await db
    .select({ items: orders.items, createdAt: orders.createdAt })
    .from(orders)
    .where(gte(orders.createdAt, since))
    .orderBy(desc(orders.createdAt))
    .limit(200);
  const productOrderMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const order of recentOrders) {
    for (const item of (order.items ?? [])) {
      const key = String(item.productId);
      if (!productOrderMap[key]) productOrderMap[key] = { name: item.name, count: 0, revenue: 0 };
      productOrderMap[key].count += item.quantity ?? 1;
      productOrderMap[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
    }
  }
  const topOrderedProducts = Object.entries(productOrderMap)
    .map(([productId, v]) => ({ productId: Number(productId), productName: v.name, orders: v.count, revenue: Math.round(v.revenue) }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 100);

  // Favorites count from favorites table
  const favoritesCountResult = await db
    .select({ total: count() })
    .from(favorites)
    .where(gte(favorites.createdAt, since));
  const favoritesCount = Number(favoritesCountResult[0]?.total ?? 0);

  // Ratings summary from reviews
  const ratingsResult = await db
    .select({
      rating: reviews.rating,
      total: count(),
    })
    .from(reviews)
    .where(and(eq(reviews.status, "approved"), gte(reviews.createdAt, since)))
    .groupBy(reviews.rating);
  const totalReviews = ratingsResult.reduce((s, r) => s + Number(r.total), 0);
  const avgRating = totalReviews > 0
    ? ratingsResult.reduce((s, r) => s + r.rating * Number(r.total), 0) / totalReviews
    : 0;

  // Top rated products
  const topRatedProducts = await db
    .select({
      productId: reviews.productId,
      productName: products.name,
      avgRating: sql<number>`ROUND(AVG(rating), 1)`,
      reviewCount: count(),
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.status, "approved"))
    .groupBy(reviews.productId, products.name)
    .having(sql`COUNT(*) >= 1`)
    .orderBy(desc(sql`AVG(rating)`), desc(count()))
    .limit(10);

  // Funnel: views -> add_to_cart -> orders
  const funnelCounts = eventCounts.reduce((acc, row) => {
    acc[row.eventType] = Number(row.total);
    return acc;
  }, {} as Record<string, number>);

  // UTM stats
  const utmStats = await getUtmStats(days);

  // Repeat orders per user
  const repeatOrdersResult = await db
    .select({
      userId: orders.userId,
      orderCount: count(),
    })
    .from(orders)
    .where(sql`userId IS NOT NULL`)
    .groupBy(orders.userId)
    .having(sql`COUNT(*) > 1`);
  const repeatOrderUsers = repeatOrdersResult.length;

  // Воронка по уникальным посетителям (сессиям) — чтобы шаги корректно убывали
  const productSessionsRes = await db
    .select({ n: sql<number>`COUNT(DISTINCT sessionId)` })
    .from(analyticsEvents)
    .where(and(sql`eventType IN ('product_view','product_click')`, gte(analyticsEvents.createdAt, since)));
  const cartSessionsRes = await db
    .select({ n: sql<number>`COUNT(DISTINCT sessionId)` })
    .from(analyticsEvents)
    .where(and(eq(analyticsEvents.eventType, "add_to_cart"), gte(analyticsEvents.createdAt, since)));
  const funnelProductSessions = Number(productSessionsRes[0]?.n ?? 0);
  const funnelCartSessions = Number(cartSessionsRes[0]?.n ?? 0);
  const funnelOrders = ordersStatsCombined.reduce((s, r) => s + Number(r.total), 0);

  return {
    eventCounts,
    topProducts,
    topClickedProducts,
    topCartProducts,
    topFavoritedProducts,
    topOrderedProducts,
    topRatedProducts,
    topPages,
    searchQueries: searchQueries.filter(q => q.query && q.query !== 'null'),
    dailyViews,
    dailySessions,
    uniqueSessions,
    uniqueUsers,
    favoritesCount,
    ratingsDistribution: ratingsResult,
    avgRating: Math.round(avgRating * 10) / 10,
    totalReviews,
    ordersStats: ordersStatsCombined,
    dailyOrders,
    repeatOrderUsers,
    utmStats,
    funnel: {
      visitors: uniqueSessions,
      productSessions: funnelProductSessions,
      cartSessions: funnelCartSessions,
      orders: funnelOrders,
      pageViews: funnelCounts["page_view"] ?? 0,
      productViews: funnelCounts["product_view"] ?? 0,
      productClicks: funnelCounts["product_click"] ?? 0,
      addToCart: funnelCounts["add_to_cart"] ?? 0,
      addToFavorites: funnelCounts["add_to_favorites"] ?? 0,
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


export async function getLatestApprovedReviews(limit: number = 12) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: reviews.id,
    productId: reviews.productId,
    authorName: reviews.authorName,
    rating: reviews.rating,
    comment: reviews.comment,
    createdAt: reviews.createdAt,
    productName: products.name,
  })
  .from(reviews)
  .leftJoin(products, eq(reviews.productId, products.id))
  .where(eq(reviews.status, "approved"))
  .orderBy(desc(reviews.createdAt))
  .limit(limit);
}
export async function getAllReviews(status?: "pending" | "approved" | "hidden") {
  const db = await getDb();
  if (!db) return [];
  const baseQuery = db
    .select({
      id: reviews.id,
      productId: reviews.productId,
      authorName: reviews.authorName,
      userId: reviews.userId,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      reply: reviews.reply,
      createdAt: reviews.createdAt,
      productName: products.name,
      productSlug: products.slug,
      productImage: products.imageUrl,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt));
  if (status) {
    return baseQuery.where(eq(reviews.status, status));
  }
  return baseQuery;
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

export async function setReviewReply(id: number, reply: string, bySeller = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const value = reply.trim();
  await db.update(reviews)
    .set({ reply: value || null, repliedAt: value ? new Date() : null, replyBySeller: value ? bySeller : false })
    .where(eq(reviews.id, id));
}

export async function getReviewsForSeller(sellerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: reviews.id,
    productId: reviews.productId,
    productName: products.name,
    authorName: reviews.authorName,
    rating: reviews.rating,
    comment: reviews.comment,
    status: reviews.status,
    reply: reviews.reply,
    repliedAt: reviews.repliedAt,
    replyBySeller: reviews.replyBySeller,
    createdAt: reviews.createdAt,
  })
  .from(reviews)
  .innerJoin(products, eq(reviews.productId, products.id))
  .where(and(eq(products.sellerId, sellerId), eq(reviews.status, "approved")))
  .orderBy(desc(reviews.createdAt));
}

export async function setReviewReplyForSeller(reviewId: number, reply: string, sellerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({ pid: products.sellerId })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (!rows[0] || rows[0].pid !== sellerId) throw new Error("Это не отзыв на ваш товар");
  await setReviewReply(reviewId, reply, true);
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
  return rows.filter(b => (!b.endsAt || b.endsAt > now) && (!b.startsAt || b.startsAt <= now));
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

export async function setSellerLogo(sellerId: number, logoUrl: string) {
  const db = await getDb();
  if (!db) return;
  const value = logoUrl || null;
  await db.update(sellers).set({ logoUrl: value } as any).where(eq(sellers.id, sellerId));
  // Денормализуем логотип в товары продавца — чтобы он показывался на карточках без join'ов
  await db.update(products).set({ sellerLogoUrl: value } as any).where(eq(products.sellerId, sellerId));
}

export async function setSellerTrusted(sellerId: number, trusted: boolean) {
  const db = await getDb();
  if (!db) return;
  const seller = await getSellerById(sellerId);
  if (!seller) return;
  // Флаг доверия у продавца
  await db.update(sellers).set({ isTrusted: trusted }).where(eq(sellers.id, sellerId));
  // Роль аккаунта: доверенному выдаём admin (полный доступ), при снятии — обратно seller
  if (seller.userId) {
    await db.update(users).set({ role: trusted ? "admin" : "seller" }).where(eq(users.id, seller.userId));
  }
  // Товары доверенного продавца становятся официальными (галочка), при снятии — обычными
  await db.update(products).set({ isOfficial: trusted }).where(eq(products.sellerId, sellerId));
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
  // Include: users with role='vip' OR admin/seller users with vipEnabled=true
  return db.select().from(users).where(
    or(
      eq(users.role, "vip"),
      eq(users.vipEnabled, true)
    )
  ).orderBy(desc(users.createdAt));
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
  const existing = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const currentRole = existing[0]?.role;

  if (isVip) {
    if (currentRole === "admin" || currentRole === "seller") {
      // For admin/seller: set vipEnabled=true, keep role unchanged
      await db.update(users).set({ vipEnabled: true, vipExpiresAt: expiresAt ?? null }).where(eq(users.id, userId));
    } else {
      // Regular user: change role to 'vip' and set vipEnabled=true
      await db.update(users).set({ role: "vip", vipEnabled: true, vipExpiresAt: expiresAt ?? null }).where(eq(users.id, userId));
    }
  } else {
    if (currentRole === "admin" || currentRole === "seller") {
      // For admin/seller: just disable vipEnabled, keep role unchanged
      await db.update(users).set({ vipEnabled: false, vipExpiresAt: null }).where(eq(users.id, userId));
    } else {
      // Regular vip user: revert to 'user' role and disable vipEnabled
      await db.update(users).set({ role: "user", vipEnabled: false, vipExpiresAt: null }).where(eq(users.id, userId));
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

// ---- Quick Orders (1-click buy) ----
export async function createQuickOrder(data: {
  productId?: number;
  productName: string;
  productPrice?: string;
  customerName: string;
  customerPhone: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(quickOrders).values({
    productId: data.productId ?? null,
    productName: data.productName,
    productPrice: data.productPrice ?? null,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    status: "new",
  });
  return (result as any)[0]?.insertId as number;
}

export async function getAllQuickOrders(): Promise<QuickOrder[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quickOrders).orderBy(desc(quickOrders.createdAt));
}

export async function updateQuickOrderStatus(id: number, status: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(quickOrders).set({ status }).where(eq(quickOrders.id, id));
}

// ── YouTube persistent cache helpers ──────────────────────────────────────
export async function getYoutubeCache(cacheKey: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(youtubeCache).where(eq(youtubeCache.cacheKey, cacheKey)).limit(1);
    return rows[0]?.data ?? null;
  } catch {
    return null;
  }
}

export async function setYoutubeCache(cacheKey: string, data: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(youtubeCache)
      .values({ cacheKey, data, updatedAt: new Date() })
      .onDuplicateKeyUpdate({ set: { data, updatedAt: new Date() } });
  } catch {
    // silently ignore cache write errors
  }
}

export const _hitFunctionsLoaded = true;

// ── Indexing Log helpers ──────────────────────────────────────────────────
export async function saveIndexingLog(entry: InsertIndexingLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(indexingLog).values(entry);
  } catch (err) {
    console.warn('[IndexingLog] Failed to save entry:', err);
  }
}

export async function getIndexingLogs(limit = 50): Promise<IndexingLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(indexingLog).orderBy(desc(indexingLog.createdAt)).limit(limit);
}
