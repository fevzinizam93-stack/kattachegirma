import { and, desc, eq, ilike, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { categories, InsertOrder, InsertProduct, InsertUser, orders, products, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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

// ---- Products ----
export async function getProducts(opts?: { categoryId?: number; search?: string; featured?: boolean; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts?.search) conditions.push(or(like(products.name, `%${opts.search}%`), like(products.brand, `%${opts.search}%`)));
  if (opts?.featured) conditions.push(eq(products.isFeatured, true));
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

export async function countProducts(opts?: { categoryId?: number; search?: string }) {
  const db = await getDb();
  if (!db) return 0;
  const conditions = [];
  if (opts?.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts?.search) conditions.push(or(like(products.name, `%${opts.search}%`), like(products.brand, `%${opts.search}%`)));
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

export async function updateOrderStatus(id: number, status: "pending" | "confirmed" | "delivered" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

// ---- Seed Data ----
export async function seedInitialData() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) return; // Already seeded

  const cats = [
    { name: "Elektrikli Süpürgeler", slug: "elektrikli-supurgeler", icon: "🧹" },
    { name: "Çamaşır Makineleri", slug: "camasir-makineleri", icon: "🫧" },
    { name: "Buzdolapları", slug: "buzdolaplari", icon: "🧊" },
    { name: "Mikrodalga Fırınlar", slug: "mikrodalga-firinlar", icon: "📡" },
    { name: "Televizyonlar", slug: "televizyonlar", icon: "📺" },
    { name: "Klimalar", slug: "klimalar", icon: "❄️" },
    { name: "Bulaşık Makineleri", slug: "bulasik-makineleri", icon: "🍽️" },
    { name: "Fırınlar", slug: "firinlar", icon: "🔥" },
    { name: "Kahve Makineleri", slug: "kahve-makineleri", icon: "☕" },
    { name: "Küçük Ev Aletleri", slug: "kucuk-ev-aletleri", icon: "🔌" },
  ];
  await db.insert(categories).values(cats);

  const catRows = await db.select().from(categories);
  const catMap: Record<string, number> = {};
  for (const c of catRows) catMap[c.slug] = c.id;

  const sampleProducts: InsertProduct[] = [
    { name: "AVANGARD AYN2010 Elektrikli Süpürge", slug: "avangard-ayn2010", description: "Güçlü emişli, sessiz çalışan elektrikli süpürge. HEPA filtreli, 2000W motor gücü.", categoryId: catMap["elektrikli-supurgeler"], brand: "AVANGARD", price: "839402", originalPrice: "1036150", discount: 19, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Supurge", isFeatured: true, isNew: false, stock: 15, specs: { "Güç": "2000W", "Filtre": "HEPA", "Ses Seviyesi": "68dB" } },
    { name: "BESTON VCB-5250BW Süpürge", slug: "beston-vcb-5250bw", description: "Torbasız, kompakt tasarımlı elektrikli süpürge. 1800W güç, çoklu ek aparatlı.", categoryId: catMap["elektrikli-supurgeler"], brand: "BESTON", price: "924558", originalPrice: "1295029", discount: 29, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Supurge+2", isFeatured: true, isNew: true, stock: 8, specs: { "Güç": "1800W", "Tip": "Torbasız" } },
    { name: "KONIG Led 50KUW-9000 Televizyon", slug: "konig-led-50kuw-9000", description: "50 inç 4K UHD Smart TV. HDR10, Dolby Vision, 120Hz panel.", categoryId: catMap["televizyonlar"], brand: "KONIG", price: "3029145", originalPrice: "4136182", discount: 27, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=TV+50", isFeatured: true, isNew: false, stock: 5, specs: { "Ekran": "50 inç", "Çözünürlük": "4K UHD", "Panel": "LED" } },
    { name: "AVANGARD AV-2003 Buzdolabı", slug: "avangard-av-2003", description: "NoFrost teknolojili, A++ enerji sınıfı buzdolabı. 350L hacim.", categoryId: catMap["buzdolaplari"], brand: "AVANGARD", price: "669088", originalPrice: "1459029", discount: 54, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Buzdolabi", isFeatured: true, isNew: false, stock: 3, specs: { "Hacim": "350L", "Enerji": "A++", "Teknoloji": "NoFrost" } },
    { name: "FRANCO CFR202G Donduruculu Buzdolabı", slug: "franco-cfr202g", description: "Geniş kapasiteli, çift kapılı buzdolabı. 450L toplam hacim, A+ enerji.", categoryId: catMap["buzdolaplari"], brand: "FRANCO", price: "2785840", originalPrice: "4257804", discount: 35, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Buzdolabi+2", isFeatured: true, isNew: true, stock: 7, specs: { "Hacim": "450L", "Enerji": "A+" } },
    { name: "SAMSUNG WW70T Çamaşır Makinesi", slug: "samsung-ww70t", description: "7 kg kapasiteli, 1400 devir çamaşır makinesi. Eco Bubble teknolojisi.", categoryId: catMap["camasir-makineleri"], brand: "SAMSUNG", price: "1250000", originalPrice: "1650000", discount: 24, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Camasir", isFeatured: false, isNew: true, stock: 10, specs: { "Kapasite": "7 kg", "Devir": "1400 rpm" } },
    { name: "LG MH6535GIS Mikrodalga Fırın", slug: "lg-mh6535gis", description: "25L kapasiteli, grill özellikli mikrodalga fırın. 1000W güç.", categoryId: catMap["mikrodalga-firinlar"], brand: "LG", price: "450000", originalPrice: "580000", discount: 22, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Mikrodalga", isFeatured: false, isNew: false, stock: 20, specs: { "Kapasite": "25L", "Güç": "1000W" } },
    { name: "DAIKIN FTXB35C Klima", slug: "daikin-ftxb35c", description: "12000 BTU inverter klima. A++ enerji sınıfı, ısıtma/soğutma.", categoryId: catMap["klimalar"], brand: "DAIKIN", price: "1850000", originalPrice: "2200000", discount: 16, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Klima", isFeatured: false, isNew: false, stock: 6, specs: { "BTU": "12000", "Enerji": "A++", "Tip": "Inverter" } },
    { name: "BOSCH SMS46KI01E Bulaşık Makinesi", slug: "bosch-sms46ki01e", description: "13 kişilik, A+++ enerji sınıfı bulaşık makinesi. 6 program.", categoryId: catMap["bulasik-makineleri"], brand: "BOSCH", price: "1100000", originalPrice: "1400000", discount: 21, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Bulasik", isFeatured: false, isNew: true, stock: 9, specs: { "Kapasite": "13 kişilik", "Enerji": "A+++" } },
    { name: "ARÇELIK ANF 6270 Fırın", slug: "arcelik-anf-6270", description: "60cm ankastre fırın. Pyroliz temizleme, 10 pişirme fonksiyonu.", categoryId: catMap["firinlar"], brand: "ARÇELİK", price: "780000", originalPrice: "950000", discount: 18, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Firin", isFeatured: false, isNew: false, stock: 12, specs: { "Boyut": "60cm", "Temizlik": "Pyroliz" } },
    { name: "NESPRESSO Vertuo Next Kahve Makinesi", slug: "nespresso-vertuo-next", description: "Kapsüllü kahve makinesi. 5 farklı boyut, 1500W güç.", categoryId: catMap["kahve-makineleri"], brand: "NESPRESSO", price: "350000", originalPrice: "450000", discount: 22, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Kahve", isFeatured: false, isNew: true, stock: 25, specs: { "Güç": "1500W", "Tip": "Kapsüllü" } },
    { name: "PHILIPS HR1861 Blender", slug: "philips-hr1861", description: "600W güçlü el blenderi. 2 hız + turbo, paslanmaz çelik bıçak.", categoryId: catMap["kucuk-ev-aletleri"], brand: "PHILIPS", price: "180000", originalPrice: "250000", discount: 28, imageUrl: "https://via.placeholder.com/400x300/cc0000/ffffff?text=Blender", isFeatured: false, isNew: false, stock: 30, specs: { "Güç": "600W", "Hız": "2 + Turbo" } },
  ];

  for (const p of sampleProducts) {
    try {
      await db.insert(products).values(p);
    } catch (e) {
      // ignore duplicate
    }
  }
}
