import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyNewOrder, notifyNewReview, notifyNewSeller, notifySellerApproved, notifyNewProduct, broadcastTelegramMessage } from "./telegram";
import {
  getAllCategories,
  getProducts,
  getProductBySlug,
  getProductById,
  getProductsByIds,
  getSimilarProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  countProducts,
  createOrder,
  getAllOrders,
  getOrdersByUserId,
  updateOrderStatus,
  upsertCategory,
  deleteCategory,
  getAllStoreSettings,
  setStoreSetting,
  getAllSellers,
  getSellerByUserId,
  createSeller,
  updateSeller,
  approveSeller,
  setSellerBlocked,
  getSellerProducts,
  registerUser,
  loginUser,
  getUserById,
  getFavoritesByUserId,
  addFavorite,
  removeFavorite,
  isFavorite,
  getProductById as getProductByIdDb,
  promoteToAdmin,
  getHitProducts,
  toggleProductHit,
  toggleProductActive,
  trackEvent,
  getAnalyticsStats,
  insertReview,
  getApprovedReviewsByProduct,
  getAllReviews,
  getLatestApprovedReviews,
  setReviewStatus,
  deleteReview,
  getReviewCountsByProduct,
  incrementViewCount,
  getSlugExists,
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getPendingProducts,
  setProductModerationStatus,
  getSellerById,
  getTelegramRecipients,
  addTelegramRecipient,
  toggleTelegramRecipient,
  deleteTelegramRecipient,
  recordUtmVisit,
  getUtmStats,
  getVipUsers,
  getAllUsersForAdmin,
  setUserVip,
  findUserByEmailOrPhone,
  updateUserPhone,
  getApprovedSellers,
  getSellerReviews,
  createSellerReview,
  getSellerRatingStats,
  getSellerProductStats,
  hideSellerReview,
  getProductBrands,
  getSalesProducts,
  createNotification,
  getUserNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getOrCreateConversation,
  getAdminConversations,
  getSellerConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  countUnreadMessages,
  getSellerContacts,
  createSellerContact,
  deleteSellerContact,
  getBrands,
  createBrand,
  deleteBrand,
  bulkRecalcPrices,
  getSellerPublicProfile,
  createQuickOrder,
  getAllQuickOrders,
  updateQuickOrderStatus,
  getYoutubeCache,
  setYoutubeCache,
  trackProductClick,
  recalcAllHitScores,
  getHitSettings,
  saveHitSettings,
  getProductsNeedingTranslation,
  getDb,
} from "./db";
import { eq } from "drizzle-orm";
import { categories, products as productsTable } from "../drizzle/schema";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// Seller guard middleware - checks if user has a seller profile OR is admin
const sellerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role === "admin") {
    return next({ ctx });
  }
  // Allow any user who has a seller profile registered (role may not be updated yet)
  const sellerProfile = await getSellerByUserId(ctx.user.id);
  if (!sellerProfile) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seller access required" });
  }
  return next({ ctx });
});

// YouTube API in-memory cache
const youtubeCache: Record<string, { ts: number; data: Record<string, { viewCount: string; likeCount: string }> }> = {};
type YTVideoItem = { id: string; title: string; description: string; thumbnail: string; viewCount: string; likeCount: string; publishedAt: string };
type YTChannelStats = { viewCount: string; subscriberCount: string; videoCount: string };
const youtubeChanCache: Record<string, { ts: number; data: { videos: YTVideoItem[]; nextPageToken: string | null; totalResults: number } }> = {};
let _youtubeStatsCache: { ts: number; data: YTChannelStats } | null = null;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Email/password registration
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await registerUser(input);
          // Create JWT session with fields expected by sdk.verifySession: openId, appId, name
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({
            openId: user.openId ?? `local_${user.email}`,
            appId: ENV.appId,
            name: user.name ?? user.email,
            role: user.role,
            userId: user.id,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "EMAIL_EXISTS") {
            throw new TRPCError({ code: "CONFLICT", message: "Этот email уже зарегистрирован" });
          }
          throw e;
        }
      }),

    // Email/password login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await loginUser(input.email, input.password);
          // Create JWT session with fields expected by sdk.verifySession: openId, appId, name
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({
            openId: user.openId ?? `local_${user.email}`,
            appId: ENV.appId,
            name: user.name ?? user.email,
            role: user.role,
            userId: user.id,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "INVALID_CREDENTIALS") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный email или пароль" });
          }
          throw e;
        }
      }),
  }),

  // ---- Categories ----
  categories: router({
    list: publicProcedure.query(async () => {
      return getAllCategories();
    }),
    upsert: adminProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), slug: z.string(), icon: z.string().optional() }))
      .mutation(async ({ input }) => {
        return upsertCategory(input);
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCategory(input.id);
        return { success: true };
      }),
    // Admin: generate UZ slugs for all categories via LLM
    generateUzSlugs: adminProcedure
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
        const allCats = await getAllCategories();
        const needsSlug = allCats.filter(c => !(c as any).slugUz);
        let updated = 0;
        for (const cat of needsSlug) {
          try {
            const response = await invokeLLM({
              messages: [
                { role: "system", content: "You are a URL slug generator. Given a Russian product category name, generate a short SEO-friendly Uzbek slug in Latin script (as used in Uzbekistan). Use hyphens between words, only lowercase a-z and hyphens. Output ONLY the slug. Examples: 'Стиральные машины' -> 'kir-yuvish-mashinalar', 'Холодильники' -> 'muzlatgichlar', 'Пылесосы' -> 'changyutkichlar', 'Кондиционеры' -> 'konditsionerlar'" },
                { role: "user", content: cat.name },
              ],
            });
            const raw = (response.choices?.[0]?.message?.content ?? "").toString().trim().toLowerCase();
            const slugUz = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
            if (slugUz) {
              await db.update(categories).set({ slugUz } as any).where(eq(categories.id, cat.id));
              updated++;
            }
          } catch { /* skip on error */ }
        }
        return { total: needsSlug.length, updated };
      }),
    // Admin: set slugUz for a single category
    setUzSlug: adminProcedure
      .input(z.object({ id: z.number(), slugUz: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
        await db.update(categories).set({ slugUz: input.slugUz } as any).where(eq(categories.id, input.id));
        return { success: true };
      }),
  }),

  // ---- Products ----
  products: router({
    list: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
        isPremium: z.boolean().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'discount', 'rating', 'reviews']).optional(),
        brands: z.array(z.string()).optional(),
        minRating: z.number().min(1).max(5).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const items = await getProducts({ ...input, approvedOnly: true });
        const total = await countProducts({ categoryId: input.categoryId, search: input.search, approvedOnly: true, isPremium: input.isPremium, minPrice: input.minPrice, maxPrice: input.maxPrice, brands: input.brands, minRating: input.minRating });
        return { items, total };
      }),
    getBrands: publicProcedure
      .input(z.object({ categoryId: z.number().optional() }))
      .query(async ({ input }) => {
        return getProductBrands({ categoryId: input.categoryId });
      }),

    // Admin: all products including unapproved
    adminList: adminProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const items = await getProducts({ ...input, includeInactive: true });
        const total = await countProducts({ categoryId: input.categoryId, search: input.search, includeInactive: true });
        return { items, total };
      }),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const product = await getProductBySlug(input.slug);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),
    getByIds: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .query(async ({ input }) => {
        return getProductsByIds(input.ids);
      }),
    getSimilar: publicProcedure
      .input(z.object({ categoryId: z.number(), excludeId: z.number(), limit: z.number().default(8) }))
      .query(async ({ input }) => {
        return getSimilarProducts(input.categoryId, input.excludeId, input.limit);
      }),

    incrementView: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const newCount = await incrementViewCount(input.productId);
        return { viewCount: newCount };
      }),
    similar: publicProcedure
      .input(z.object({ categoryId: z.number(), excludeId: z.number(), limit: z.number().default(8) }))
      .query(async ({ input }) => {
        return getSimilarProducts(input.categoryId, input.excludeId, input.limit);
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string(),
        nameUz: z.string().optional(),
        slug: z.string(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        categoryId: z.number(),
        brand: z.string().optional(),
        price: z.string(),
        originalPrice: z.string().optional(),
        discount: z.number().default(0),
        imageUrl: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().default(0),
        isNew: z.boolean().default(false),
        isFeatured: z.boolean().default(false),
        isHit: z.boolean().default(false),
        isPremium: z.boolean().default(false),
        hitOrder: z.number().default(0),
        specs: z.record(z.string(), z.string()).optional(),
        sellerPhone: z.string().optional(),
        sellerTelegram: z.string().optional(),
        sellerName: z.string().optional(),
        sellerId: z.number().optional(),
        isApproved: z.boolean().default(true),
        costPrice: z.string().optional(),
        stockCount: z.number().optional(),
        discountEndsAt: z.string().optional(),
        contactPhone: z.string().max(64).optional(),
        videoId: z.string().max(32).optional(),
      }))
      .mutation(async ({ input }) => {
        // Normalize slug server-side: transliterate Cyrillic, strip emojis/special chars
        const cyrMap: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
        const translit = (s: string) => s.toLowerCase().split("").map(c => cyrMap[c] ?? c).join("");
        const rawSlug = translit(input.slug).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const baseSlug = rawSlug || `product-${Date.now()}`;
        // Ensure slug uniqueness: add -2, -3, ... suffix if slug already exists
        let safeSlug = baseSlug;
        let suffix = 2;
        while (await getSlugExists(safeSlug)) {
          safeSlug = `${baseSlug}-${suffix++}`;
          if (suffix > 100) { safeSlug = `${baseSlug}-${Date.now()}`; break; }
        }
        const id = await createProduct({
          ...input,
          slug: safeSlug,
          images: input.images ?? [],
          specs: (input.specs ?? {}) as Record<string, string>,
          discountEndsAt: input.discountEndsAt ? new Date(input.discountEndsAt) : undefined,
        } as Parameters<typeof createProduct>[0]);
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameUz: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        categoryId: z.number().optional(),
        brand: z.string().optional(),
        price: z.string().optional(),
        originalPrice: z.string().optional(),
        discount: z.number().optional(),
        imageUrl: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().optional(),
        isNew: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        isHit: z.boolean().optional(),
        isPremium: z.boolean().optional(),
        hitOrder: z.number().optional(),
        specs: z.record(z.string(), z.string()).optional(),
        sellerPhone: z.string().optional(),
        sellerTelegram: z.string().optional(),
        sellerName: z.string().optional(),
        sellerId: z.number().optional(),
        isApproved: z.boolean().optional(),
        costPrice: z.string().optional(),
        stockCount: z.number().optional(),
        discountEndsAt: z.string().optional(),
        contactPhone: z.string().max(64).optional(),
        videoId: z.string().max(32).optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data, specs: data.specs as Record<string, string> | undefined };
        if (data.discountEndsAt) updateData.discountEndsAt = new Date(data.discountEndsAt);
        else if (data.discountEndsAt === '') updateData.discountEndsAt = null;
        await updateProduct(id, updateData as Parameters<typeof updateProduct>[1]);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProduct(input.id);
        return { success: true };
      }),

    uploadImage: adminProcedure
      .input(z.object({
        productId: z.number(),
        base64: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `products/${input.productId}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateProduct(input.productId, { imageUrl: url });
        return { url };
      }),

    // Seller: upload image (returns URL only, no product ID needed)
    sellerUploadImage: sellerProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string(),
        filename: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        const buffer = Buffer.from(input.base64, "base64");
        const key = `seller-products/${seller.id}/${Date.now()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),

    // Seller: create product (pending approval)
    sellerCreate: sellerProcedure
      .input(z.object({
        name: z.string(),
        nameUz: z.string().optional(),
        slug: z.string(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        categoryId: z.number(),
        brand: z.string().optional(),
        price: z.string(),
        priceUsd: z.string().optional(),
        originalPrice: z.string().optional(),
        originalPriceUsd: z.string().optional(),
        discount: z.number().default(0),
        imageUrl: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().default(0),
        isNew: z.boolean().default(false),
        specs: z.record(z.string(), z.string()).optional(),
        contactPhone: z.string().max(64).optional(),
        videoId: z.string().max(32).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        if (!seller.isApproved) throw new TRPCError({ code: "FORBIDDEN", message: "Seller not approved yet" });
        // Normalize slug: transliterate Cyrillic, strip leading/trailing dashes
        const cyrMap2: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
        const translit2 = (s: string) => s.toLowerCase().split("").map(c => cyrMap2[c] ?? c).join("");
        const rawSlug2 = translit2(input.slug).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
        const safeSlug2 = rawSlug2 || `product-${Date.now()}`;
        const id = await createProduct({
          ...input,
          slug: safeSlug2,
          images: input.images ?? [],
          specs: (input.specs ?? {}) as Record<string, string>,
          sellerId: seller.id,
          sellerName: seller.name,
          sellerPhone: seller.phone ?? undefined,
          sellerTelegram: seller.telegram ?? undefined,
          isApproved: false,
          moderationStatus: "pending" as const,
          isFeatured: false,
        });
        // Send rich notification with inline Approve/Reject buttons
        notifyNewProduct({
          id,
          name: input.name,
          price: input.price,
          imageUrl: input.imageUrl,
          sellerName: seller.name,
          sellerPhone: seller.phone ?? undefined,
        }).catch(e => console.error("[Telegram] notifyNewProduct failed:", e));
        return { id };
      }),
    // Seller: update own productt (only pending/rejected ones)
    sellerUpdate: sellerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameUz: z.string().optional(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        categoryId: z.number().optional(),
        brand: z.string().optional(),
        price: z.string().optional(),
        priceUsd: z.string().optional(),
        originalPrice: z.string().optional(),
        originalPriceUsd: z.string().optional(),
        discount: z.number().optional(),
        imageUrl: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().optional(),
        isNew: z.boolean().optional(),
        specs: z.record(z.string(), z.string()).optional(),
        contactPhone: z.string().max(64).optional(),
        videoId: z.string().max(32).optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        const { id, ...data } = input;
        const product = await getProductByIdDb(id);
        if (!product || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
        await updateProduct(id, { ...data, moderationStatus: "pending" as const, isApproved: false });
        return { ok: true };
      }),

    // Seller: delete own product
    sellerDelete: sellerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        const product = await getProductByIdDb(input.id);
        if (!product || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
        await deleteProduct(input.id);
        return { ok: true };
      }),

    // Admin: auto-translate product name/description from RU to UZ
    translate: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = [
          "Translate the following product information from Russian to Uzbek (Latin script, as used in modern Uzbekistan).",
          "Return ONLY a JSON object with keys \"nameUz\" and \"descriptionUz\". No extra text.",
          "",
          `Name (Russian): ${input.name}`,
          input.description ? `Description (Russian): ${input.description}` : "",
        ].filter(Boolean).join("\n");

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional Russian-to-Uzbek translator. Output only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "product_translation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  nameUz: { type: "string", description: "Product name in Uzbek" },
                  descriptionUz: { type: "string", description: "Product description in Uzbek" },
                },
                required: ["nameUz", "descriptionUz"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        return {
          nameUz: parsed.nameUz ?? "",
          descriptionUz: parsed.descriptionUz ?? "",
        };
      }),

    // Admin: bulk translate all products without UZ fields
    bulkTranslate: adminProcedure
      .mutation(async () => {
        const toTranslate = await getProductsNeedingTranslation(2000);
        const total = toTranslate.length;
        let translated = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches of 5 to avoid LLM rate limits
        const BATCH_SIZE = 5;
        for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
          const batch = toTranslate.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (product) => {
              try {
                // Skip if both fields already exist
                if (product.nameUz && product.descriptionUz) {
                  skipped++;
                  return;
                }
                const prompt = [
                  "Translate the following product information from Russian to Uzbek (Latin script, as used in modern Uzbekistan).",
                  "Return ONLY a JSON object with keys \"nameUz\" and \"descriptionUz\". No extra text.",
                  "",
                  `Name (Russian): ${product.name}`,
                  product.description ? `Description (Russian): ${product.description}` : "",
                ].filter(Boolean).join("\n");

                const response = await invokeLLM({
                  messages: [
                    { role: "system", content: "You are a professional Russian-to-Uzbek translator. Output only valid JSON." },
                    { role: "user", content: prompt },
                  ],
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: "product_translation",
                      strict: true,
                      schema: {
                        type: "object",
                        properties: {
                          nameUz: { type: "string", description: "Product name in Uzbek" },
                          descriptionUz: { type: "string", description: "Product description in Uzbek" },
                        },
                        required: ["nameUz", "descriptionUz"],
                        additionalProperties: false,
                      },
                    },
                  },
                });

                const content = response.choices?.[0]?.message?.content ?? "{}";
                const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

                const updateData: Record<string, string> = {};
                if (!product.nameUz && parsed.nameUz) updateData.nameUz = parsed.nameUz;
                if (!product.descriptionUz && parsed.descriptionUz) updateData.descriptionUz = parsed.descriptionUz;

                if (Object.keys(updateData).length > 0) {
                  await updateProduct(product.id, updateData as any);
                  translated++;
                } else {
                  skipped++;
                }
              } catch (e) {
                console.error(`[bulkTranslate] Error translating product ${product.id}:`, e);
                errors++;
              }
            })
          );
          // Small delay between batches to be gentle on the LLM API
          if (i + BATCH_SIZE < toTranslate.length) {
            await new Promise(r => setTimeout(r, 500));
          }
        }

        return { total, translated, skipped, errors };
      }),

    // Public: translate product description on demand (RU→UZ) for users who don't know Russian
    translateDescription: publicProcedure
      .input(z.object({
        text: z.string().min(1).max(8000),
      }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional Russian-to-Uzbek translator. Translate the given text to Uzbek using modern Latin script (as used in Uzbekistan). Output only the translated text, no explanations." },
            { role: "user", content: input.text },
          ],
        });
        const translated = response.choices?.[0]?.message?.content ?? "";
        return { translated: typeof translated === "string" ? translated : JSON.stringify(translated) };
      }),

    // Admin: generate UZ slugs for all products via LLM (uses nameUz if available, else name)
    generateUzSlugs: adminProcedure
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
        const allProducts = await getProducts({ limit: 5000, offset: 0, includeInactive: true });
        const needsSlug = allProducts.filter((p: any) => !p.slugUz);
        let updated = 0;
        const BATCH_SIZE = 10;
        for (let i = 0; i < needsSlug.length; i += BATCH_SIZE) {
          const batch = needsSlug.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (p: any) => {
            try {
              const sourceName = p.nameUz || p.name;
              const response = await invokeLLM({
                messages: [
                  { role: "system", content: "You are a URL slug generator. Given a product name (Russian or Uzbek), generate a short SEO-friendly URL slug in Uzbek Latin script. Use hyphens between words, only lowercase a-z, 0-9 and hyphens, max 80 chars. Output ONLY the slug, nothing else." },
                  { role: "user", content: sourceName },
                ],
              });
              const raw = (response.choices?.[0]?.message?.content ?? "").toString().trim().toLowerCase();
              const slugUz = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
              if (slugUz) {
                await db.update(productsTable).set({ slugUz } as any).where(eq(productsTable.id, p.id));
                updated++;
              }
            } catch { /* skip on error */ }
          }));
          await new Promise(r => setTimeout(r, 300));
        }
        return { total: needsSlug.length, updated };
      }),

    // Admin/Seller: generate unique SEO description for a product using AI
    generateDescription: protectedProcedure
      .input(z.object({
        productId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const product = await getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        // Allow admin or the seller who owns the product
        if (ctx.user.role !== "admin") {
          const seller = await getSellerByUserId(ctx.user.id);
          if (!seller || (product as any).sellerId !== seller.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
          }
        }
        const categories = await getAllCategories();
        const category = categories.find((c: any) => c.id === (product as any).categoryId);
        const categoryName = category ? (category as any).name : "бытовая техника";

        const prompt = [
          "Ты — SEO-копирайтер интернет-магазина бытовой техники в Узбекистане.",
          "Напиши уникальное, привлекательное описание товара для карточки товара (150-250 слов).",
          "Описание должно:",
          "- Содержать ключевые слова для поиска (название, бренд, категория)",
          "- Описывать преимущества и характеристики товара",
          "- Быть написано простым языком для покупателей",
          "- Включать призыв к покупке",
          "",
          `Товар: ${product.name}`,
          `Бренд: ${(product as any).brand || 'не указан'}`,
          `Категория: ${categoryName}`,
          `Цена: ${product.price} сум`,
          (product as any).originalPrice ? `Старая цена: ${(product as any).originalPrice} сум (скидка!)` : "",
          (product as any).specs && Object.keys((product as any).specs).length > 0 ? `Характеристики: ${JSON.stringify((product as any).specs)}` : "",
          "",
          "Верни JSON с двумя полями:",
          '"description" — описание на русском языке',
          '"descriptionUz" — описание на узбекском языке (латиница)',
        ].filter(Boolean).join("\n");

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Ты SEO-копирайтер. Пиши только JSON без дополнительного текста." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "product_description",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  description: { type: "string", description: "Product description in Russian" },
                  descriptionUz: { type: "string", description: "Product description in Uzbek Latin" },
                },
                required: ["description", "descriptionUz"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        const description = parsed.description ?? "";
        const descriptionUz = parsed.descriptionUz ?? "";

        // Save to DB
        await updateProduct(input.productId, { description, descriptionUz } as any);

        return { description, descriptionUz };
      }),

    // Admin: bulk generate descriptions for all products without descriptions
    bulkGenerateDescriptions: adminProcedure
      .mutation(async () => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
        const allProducts = await getProducts({ limit: 5000, offset: 0, includeInactive: true });
        const needsDescription = allProducts.filter((p: any) => !p.description || p.description.trim().length < 20);
        const total = needsDescription.length;
        let generated = 0;
        let skipped = 0;
        let errors = 0;

        const categories = await getAllCategories();

        const BATCH_SIZE = 3;
        for (let i = 0; i < needsDescription.length; i += BATCH_SIZE) {
          const batch = needsDescription.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (product: any) => {
              try {
                const category = categories.find((c: any) => c.id === product.categoryId);
                const categoryName = category ? (category as any).name : "бытовая техника";

                const prompt = [
                  "Ты — SEO-копирайтер интернет-магазина бытовой техники в Узбекистане.",
                  "Напиши уникальное описание товара (150-250 слов) с ключевыми словами для поиска.",
                  "",
                  `Товар: ${product.name}`,
                  `Бренд: ${product.brand || 'не указан'}`,
                  `Категория: ${categoryName}`,
                  product.specs && Object.keys(product.specs).length > 0 ? `Характеристики: ${JSON.stringify(product.specs)}` : "",
                  "",
                  "Верни JSON: {\"description\": \"...\", \"descriptionUz\": \"...\"}",
                ].filter(Boolean).join("\n");

                const response = await invokeLLM({
                  messages: [
                    { role: "system", content: "Ты SEO-копирайтер. Пиши только JSON." },
                    { role: "user", content: prompt },
                  ],
                  response_format: {
                    type: "json_schema",
                    json_schema: {
                      name: "product_description",
                      strict: true,
                      schema: {
                        type: "object",
                        properties: {
                          description: { type: "string", description: "Product description in Russian" },
                          descriptionUz: { type: "string", description: "Product description in Uzbek Latin" },
                        },
                        required: ["description", "descriptionUz"],
                        additionalProperties: false,
                      },
                    },
                  },
                });

                const content = response.choices?.[0]?.message?.content ?? "{}";
                const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

                if (parsed.description && parsed.description.length > 20) {
                  await updateProduct(product.id, {
                    description: parsed.description,
                    descriptionUz: parsed.descriptionUz || "",
                  } as any);
                  generated++;
                } else {
                  skipped++;
                }
              } catch (e) {
                console.error(`[bulkGenerateDescriptions] Error for product ${product.id}:`, e);
                errors++;
              }
            })
          );
          if (i + BATCH_SIZE < needsDescription.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        return { total, generated, skipped, errors };
      }),

    // Seller: list own products
    sellerList: sellerProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) return [];
      return getSellerProducts(seller.id);
    }),

    // Public: get sale products (with discount)
    getSales: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getSalesProducts(input.limit);
      }),
    // Public: get hit products (bestsellers)
    getHits: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return getHitProducts(input.limit, true);
      }),

    // Admin: toggle isHit flag
    toggleHit: adminProcedure
      .input(z.object({ id: z.number(), isHit: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleProductHit(input.id, input.isHit);
        return { success: true };
      }),

    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleProductActive(input.id, input.isActive);
        return { success: true };
      }),

    setVideoReview: protectedProcedure
      .input(z.object({ productId: z.number(), videoId: z.string().max(32).nullable() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          const product = await getProductById(input.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND" });
          const seller = await getSellerByUserId(ctx.user.id);
          if (!seller || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updateProduct(input.productId, { videoId: input.videoId ?? undefined });
        return { success: true };
      }),

    autoScanVideoReviews: adminProcedure
      .input(z.object({ overwrite: z.boolean().default(false) }))
      .mutation(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        if (!apiKey) return { updated: 0, skipped: 0 };
        const allProducts = await getProducts({ limit: 2000, offset: 0, approvedOnly: true });
        const CHANNEL_ID = "UCo0v66OjZ8Z3LujfipwuQUA";
        let updated = 0;
        let skipped = 0;
        for (const product of allProducts) {
          if (!input.overwrite && product.videoId) { skipped++; continue; }
          try {
            const q = encodeURIComponent(product.name.slice(0, 100));
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${q}&type=video&maxResults=1&order=relevance&key=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) { skipped++; continue; }
            const json = await res.json() as { items?: Array<{ id: { videoId: string } }> };
            const videoId = json.items?.[0]?.id?.videoId ?? null;
            if (videoId) { await updateProduct(product.id, { videoId }); updated++; }
            else skipped++;
            await new Promise(r => setTimeout(r, 250));
          } catch { skipped++; }
        }
        return { updated, skipped };
      }),
  }),

  // ---- Hits (auto-scoring) ----
  hits: router({
    // Public: track product click (increments clickCount and recalcs hitScore)
    trackClick: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        await trackProductClick(input.productId);
        return { success: true };
      }),

    // Admin: recalculate all hit scores and auto-promote/demote
    recalcHits: adminProcedure
      .mutation(async () => {
        await recalcAllHitScores();
        return { success: true };
      }),

    // Admin: get auto-hit settings
    getHitSettings: adminProcedure
      .query(async () => {
        return getHitSettings();
      }),

    // Admin: save auto-hit settings
    saveHitSettings: adminProcedure
      .input(z.object({ threshold: z.number().min(1).max(100000), autoEnabled: z.boolean() }))
      .mutation(async ({ input }) => {
        await saveHitSettings(input.threshold, input.autoEnabled);
        await recalcAllHitScores();
        return { success: true };
      }),
  }),

  // ---- Orders ----
  orders: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string().min(2),
        customerPhone: z.string().min(7),
        deliveryAddress: z.string().min(5),
        items: z.array(z.object({
          productId: z.number(),
          name: z.string(),
          price: z.number(),
          quantity: z.number(),
          imageUrl: z.string().optional(),
        })),
        totalAmount: z.string(),
        userId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createOrder(input);
        // Send Telegram notification (non-blocking)
        notifyNewOrder({
          id,
          phone: input.customerPhone,
          address: input.deliveryAddress,
          items: input.items.map(item => ({
            productName: item.name,
            quantity: item.quantity,
            price: String(item.price),
          })),
          total: input.totalAmount,
        }).catch(e => console.error("[Telegram] notify failed:", e));
        return { id };
      }),

    list: adminProcedure.query(async () => {
      return getAllOrders();
    }),

    // User: get own orders
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      return getOrdersByUserId(ctx.user.id);
    }),
    // User: reorder — returns items from a past order to re-add to cart
    reorder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userOrders = await getOrdersByUserId(ctx.user.id);
        const order = userOrders.find((o) => o.id === input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        return { items: order.items };
      }),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await updateOrderStatus(input.id, input.status);
        // Notify the user if status changed to confirmed, delivered or cancelled
        const allOrders = await getAllOrders();
        const order = allOrders.find((o) => o.id === input.id);
        if (order?.userId) {
          const statusMessages: Record<string, { title: string; message: string } | undefined> = {
            confirmed: {
              title: "Заказ подтверждён ✅",
              message: `Ваш заказ #${input.id} подтверждён и передан в обработку.`,
            },
            delivered: {
              title: "Заказ доставлен 🎉",
              message: `Ваш заказ #${input.id} успешно доставлен. Спасибо за покупку!`,
            },
            cancelled: {
              title: "Заказ отменён ❌",
              message: `Ваш заказ #${input.id} был отменён. Свяжитесь с нами для уточнения деталей.`,
            },
          };
          const notif = statusMessages[input.status];
          if (notif) {
            await createNotification({
              userId: order.userId,
              title: notif.title,
              message: notif.message,
              orderId: input.id,
            }).catch((e) => console.error("[Notification] Failed:", e));
          }
        }
        return { success: true };
      }),
  }),

  // ---- Notifications ----
  notifications: router({
    // Get current user's notifications
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserNotifications(ctx.user.id);
    }),
    // Count unread notifications
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await countUnreadNotifications(ctx.user.id);
      return { count };
    }),
    // Mark a single notification as read
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    // Mark all notifications as read
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ---- Favorites ----
  favorites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const favs = await getFavoritesByUserId(ctx.user.id);
      // Get product details for each favorite
      const productIds = favs.map(f => f.productId);
      const productDetails = await Promise.all(productIds.map(id => getProductByIdDb(id)));
      return productDetails.filter(Boolean);
    }),

    add: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await addFavorite(ctx.user.id, input.productId);
        return { success: true };
      }),

    remove: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await removeFavorite(ctx.user.id, input.productId);
        return { success: true };
      }),

    check: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input, ctx }) => {
        return isFavorite(ctx.user.id, input.productId);
      }),
  }),

  // ---- Store Settings ----
  storeSettings: router({
    getAll: publicProcedure.query(async () => {
      return getAllStoreSettings();
    }),
    set: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await setStoreSetting(input.key, input.value);
        return { success: true };
      }),
    setMany: adminProcedure
      .input(z.record(z.string(), z.string()))
      .mutation(async ({ input }) => {
        for (const [key, value] of Object.entries(input)) {
          await setStoreSetting(key, value);
        }
        return { success: true };
      }),
  }),

  // ---- Sellers ----
  sellers: router({
    // Get current user's seller profile
    me: protectedProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      return seller ?? null;
    }),

    // Register as seller
    register: protectedProcedure
      .input(z.object({
        name: z.string().min(2, "Название магазина обязательно"),
        phone: z.string()
          .regex(
            /^\+998(33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/,
            "Некорректный номер телефона. Формат: +998XXXXXXXXX (операторы UZ)"
          ),
        telegram: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getSellerByUserId(ctx.user.id);
        if (existing) {
          await updateSeller(existing.id, input);
          return { id: existing.id, isNew: false };
        }
        const id = await createSeller({ ...input, userId: ctx.user.id, isApproved: false });
        // Send Telegram notification (non-blocking)
        notifyNewSeller({
          id,
          name: input.name,
          phone: input.phone,
          telegram: input.telegram,
          description: input.description,
          userId: ctx.user.id,
        }).catch(e => console.error("[Telegram] notifyNewSeller failed:", e));
        return { id, isNew: true };
      }),

    // Admin: list all sellers
    list: adminProcedure.query(async () => {
      return getAllSellers();
    }),

    // Admin: approve seller
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await approveSeller(input.id);
        // Notify the seller via Telegram (non-blocking)
        getSellerById(input.id)
          .then(seller => {
            if (seller) {
              notifySellerApproved({ name: seller.name, telegram: seller.telegram }).catch(
                e => console.error("[Telegram] notifySellerApproved failed:", e)
              );
            }
          })
          .catch(() => {});
        return { success: true };
      }),

     // Admin: approve product
    approveProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { isApproved: true, moderationStatus: "approved" as const });
        return { success: true };
      }),

    // Admin: reject product
    rejectProduct: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { isApproved: false, moderationStatus: "rejected" as const });
        return { success: true };
      }),

    // Admin: list pending products for moderation
    pendingProducts: adminProcedure.query(async () => {
      return getPendingProducts();
    }),

    // Admin: block/unblock seller
    blockSeller: adminProcedure
      .input(z.object({ id: z.number(), blocked: z.boolean() }))
      .mutation(async ({ input }) => {
        await setSellerBlocked(input.id, input.blocked);
        return { success: true };
      }),
    // Admin: promote user to admin by email
    promoteUser: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await promoteToAdmin(input.email);
        return { success: true };
      }),

    // Public: get seller profile by ID
    getPublicProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const seller = await getSellerById(input.id);
        if (!seller || seller.isBlocked || !seller.isApproved) return null;
        // Return only public fields
        return {
          id: seller.id,
          name: seller.name,
          description: seller.description,
          createdAt: seller.createdAt,
        };
      }),

    // Public: get full seller profile (seller info + products + stats + rating) in one call
    getFullPublicProfile: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSellerPublicProfile(input.id);
      }),

    // Public: get approved products by seller ID
    getPublicProducts: publicProcedure
      .input(z.object({ id: z.number(), limit: z.number().min(1).max(100).default(48), offset: z.number().min(0).default(0) }))
      .query(async ({ input }) => {
        const seller = await getSellerById(input.id);
        if (!seller || seller.isBlocked || !seller.isApproved) return [];
        const allProducts = await getSellerProducts(seller.id);
        // Only return approved and active products
         return allProducts
          .filter((p: any) => p.isApproved && p.isActive)
          .slice(input.offset, input.offset + input.limit);
      }),

    // Public: list all approved sellers (with optional search)
    listPublic: publicProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ input }) => {
        return getApprovedSellers(input.search);
      }),

    // Public: get seller stats (product count, total views, avg rating)
    getStats: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const [productStats, ratingStats] = await Promise.all([
          getSellerProductStats(input.id),
          getSellerRatingStats(input.id),
        ]);
        return { ...productStats, ...ratingStats };
      }),

    // Public: get seller reviews
    getReviews: publicProcedure
      .input(z.object({ sellerId: z.number() }))
      .query(async ({ input }) => {
        return getSellerReviews(input.sellerId, true);
      }),

    // Public (authenticated): submit a review about a seller
    submitReview: protectedProcedure
      .input(z.object({
        sellerId: z.number(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerById(input.sellerId);
        if (!seller || !seller.isApproved) throw new Error("Seller not found");
        const id = await createSellerReview({
          sellerId: input.sellerId,
          userId: ctx.user.id,
          authorName: ctx.user.name ?? "Покупатель",
          rating: input.rating,
          comment: input.comment ?? null,
          isVisible: true,
        });
        return { id };
      }),

    // Admin: hide a seller review
    hideReview: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await hideSellerReview(input.id);
        return { success: true };
      }),
  }),
  // ---- Analytics ----
  analytics: router({
    // Public: track any event (fire-and-forget)
    track: publicProcedure
      .input(z.object({
        eventType: z.enum(["page_view", "product_view", "add_to_cart", "order_placed", "search"]),
        productId: z.number().optional(),
        productName: z.string().optional(),
        page: z.string().optional(),
        sessionId: z.string().optional(),
        meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await trackEvent({
          eventType: input.eventType,
          productId: input.productId ?? null,
          productName: input.productName ?? null,
          page: input.page ?? null,
          sessionId: input.sessionId ?? null,
          userId: ctx.user?.id ?? null,
          meta: (input.meta ?? {}) as Record<string, string | number>,
        });
        return { ok: true };
      }),

    // Admin: get stats dashboard
    stats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(90).default(30) }))
      .query(async ({ input }) => {
        return getAnalyticsStats(input.days);
      }),
  }),
  reviews: router({
    // Public: list approved reviews for a product
    listByProduct: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return getApprovedReviewsByProduct(input.productId);
      }),

    // Public: get rating summary
    summary: publicProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return getReviewCountsByProduct(input.productId);
      }),

    // Public: submit a review (starts as pending)
    submit: publicProcedure
      .input(z.object({
        productId: z.number(),
        authorName: z.string().min(1).max(256),
        rating: z.number().min(1).max(5),
        comment: z.string().min(3).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        const reviewId = await insertReview({
          productId: input.productId,
          authorName: input.authorName,
          rating: input.rating,
          comment: input.comment,
          status: "pending",
          userId: ctx.user?.id ?? null,
        });
        // Notify admin via Telegram (fire-and-forget, don't block response)
        const product = await getProductById(input.productId);
        notifyNewReview({
          id: reviewId,
          productName: product?.name ?? `Товар #${input.productId}`,
          authorName: input.authorName,
          rating: input.rating,
          comment: input.comment,
        }).catch(() => {}); // ignore errors
        return { ok: true };
      }),

    // Admin: list all reviews (optionally filtered by status)
    adminList: adminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "hidden"]).optional() }))
      .query(async ({ input }) => {
        return getAllReviews(input.status);
      }),

    // Admin: set review status
    adminSetStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "hidden"]),
      }))
      .mutation(async ({ input }) => {
        await setReviewStatus(input.id, input.status);
        return { ok: true };
      }),

    // Admin: delete review
    adminDelete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteReview(input.id);
        return { ok: true };
      }),
    // Public: latest approved reviews (for About page)
    listLatest: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(12) }))
      .query(async ({ input }) => {
        return getLatestApprovedReviews(input.limit);
      }),
  }),
  banners: router({
    // Public: list active banners
    listActive: publicProcedure.query(async () => {
      return getActiveBanners();
    }),

    // Admin: list all banners
    listAll: adminProcedure.query(async () => {
      return getAllBanners();
    }),

    // Admin: create banner
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        titleUz: z.string().max(256).optional(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        bgColor: z.string().max(32).default("#dc2626"),
        textColor: z.string().max(32).default("#ffffff"),
        link: z.string().max(512).optional(),
        linkText: z.string().max(128).optional(),
        linkTextUz: z.string().max(128).optional(),
        endsAt: z.date().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await createBanner(input);
        return { id };
      }),

    // Admin: update banner
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        titleUz: z.string().max(256).optional(),
        description: z.string().optional(),
        descriptionUz: z.string().optional(),
        bgColor: z.string().max(32).optional(),
        textColor: z.string().max(32).optional(),
        link: z.string().max(512).optional(),
        linkText: z.string().max(128).optional(),
        linkTextUz: z.string().max(128).optional(),
        endsAt: z.date().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBanner(id, data);
        return { ok: true };
      }),

    // Admin: delete banner
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBanner(input.id);
        return { ok: true };
      }),
  }),
  // ---- Telegram Recipients ----
  telegram: router({
    // List all recipients (admin only)
    listRecipients: adminProcedure.query(async () => {
      return getTelegramRecipients();
    }),
    // Add a new recipient (admin only)
    addRecipient: adminProcedure
      .input(z.object({
        chatId: z.string().min(1).max(64),
        name: z.string().min(1).max(128),
      }))
      .mutation(async ({ input }) => {
        const id = await addTelegramRecipient(input.chatId, input.name);
        return { ok: true, id };
      }),
    // Toggle active/inactive (admin only)
    toggleRecipient: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleTelegramRecipient(input.id, input.isActive);
        return { ok: true };
      }),
    // Delete a recipient (admin only)
    deleteRecipient: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTelegramRecipient(input.id);
        return { ok: true };
      }),
    // Register Telegram webhook (admin only)
    registerWebhook: adminProcedure
      .input(z.object({ siteUrl: z.string().url() }))
      .mutation(async ({ input }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "TELEGRAM_BOT_TOKEN not set" });
        const webhookUrl = `${input.siteUrl}/api/telegram/webhook`;
        const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            allowed_updates: ["callback_query"],
            secret_token: secret || undefined,
          }),
        });
        const data = await res.json() as { ok: boolean; description?: string };
        if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.description ?? "setWebhook failed" });
        return { ok: true, webhookUrl };
      }),
    // Get current webhook info (admin only)
    getWebhookInfo: adminProcedure.query(async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "TELEGRAM_BOT_TOKEN not set" });
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      return res.json();
    }),
  }),

  // ---- UTM Tracking ----
  utm: router({
    // Track a UTM visit (public — called on page load when UTM params present)
    trackVisit: publicProcedure
      .input(z.object({
        utmSource: z.string().max(128).optional(),
        utmMedium: z.string().max(128).optional(),
        utmCampaign: z.string().max(128).optional(),
        utmContent: z.string().max(128).optional(),
        utmTerm: z.string().max(128).optional(),
        landingPage: z.string().max(512).optional(),
        referrer: z.string().max(512).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userAgent = (ctx as any).req?.headers?.['user-agent'] ?? undefined;
        await recordUtmVisit({ ...input, userAgent });
        return { ok: true };
      }),
    // Get UTM stats (admin only)
    getStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        return getUtmStats(input.days);
      }),
  }),

  // ---- VIP Management ----
  vip: router({
    // List all VIP users (admin only)
    listUsers: adminProcedure.query(async () => {
      return getVipUsers();
    }),

    // List all users for admin to manage (admin only)
    listAllUsers: adminProcedure.query(async () => {
      return getAllUsersForAdmin();
    }),

    // Grant VIP access to a user by email or phone (admin only)
    grantAccess: adminProcedure
      .input(z.object({
        emailOrPhone: z.string().min(1),
        expiresAt: z.string().optional(), // ISO date string
      }))
      .mutation(async ({ input }) => {
        const user = await findUserByEmailOrPhone(input.emailOrPhone.trim());
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Пользователь не найден. Попросите его сначала зарегистрироваться на сайте." });
        const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
        await setUserVip(user.id, true, expiresAt);
        return { ok: true, userId: user.id, name: user.name, email: user.email };
      }),

    // Revoke VIP access (admin only)
    revokeAccess: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await setUserVip(input.userId, false);
        return { ok: true };
      }),

    // Get current user's VIP status (protected)
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      return {
        isVip: ctx.user.role === "vip" || ctx.user.role === "admin",
        role: ctx.user.role,
        vipExpiresAt: (ctx.user as any).vipExpiresAt ?? null,
      };
    }),
  }),

  // ---- Currency ----
  currency: router({
    // Bulk recalculate all product prices based on new exchange rate
    bulkUpdatePrices: adminProcedure
      .input(z.object({
        newRate: z.number().min(1),
        markupPercent: z.number().min(0).max(500).default(0),
      }))
      .mutation(async ({ input }) => {
        const updated = await bulkRecalcPrices(input.newRate, input.markupPercent);
        return { updated, newRate: input.newRate };
      }),

    // Get current USD -> UZS exchange rate (no API key required)
    getRate: publicProcedure.query(async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error("Exchange rate API error");
        const data = await res.json() as { rates: Record<string, number>; time_last_update_utc: string };
        const rate = data.rates["UZS"];
        if (!rate) throw new Error("UZS rate not found");
        return {
          usdToUzs: Math.round(rate),
          updatedAt: data.time_last_update_utc,
        };
      } catch {
        // Fallback rate if API is unavailable
        return { usdToUzs: 12700, updatedAt: null };
      }
    }),
  }),

  // ---- Admin <-> Seller Messaging ----
  messaging: router({
    /**
     * Admin: get list of all conversations (one per seller they've contacted)
     */
    adminConversations: adminProcedure.query(async ({ ctx }) => {
      const convs = await getAdminConversations(ctx.user.id);
      // Enrich with seller user info
      const enriched = await Promise.all(
        convs.map(async (conv) => {
          const sellerUser = await getUserById(conv.sellerId);
          // Count unread messages for admin in this conversation
          const msgs = await getConversationMessages(conv.id);
          const unread = msgs.filter((m) => !m.isRead && m.senderId !== ctx.user.id).length;
          return { ...conv, sellerName: sellerUser?.name ?? "Продавец", unread };
        })
      );
      return enriched;
    }),

    /**
     * Admin: open/create conversation with a specific seller (by seller user ID)
     * and get messages
     */
    openConversation: adminProcedure
      .input(z.object({ sellerUserId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const conv = await getOrCreateConversation(ctx.user.id, input.sellerUserId);
        if (!conv) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const msgs = await getConversationMessages(conv.id);
        await markConversationRead(conv.id, ctx.user.id);
        return { conversation: conv, messages: msgs };
      }),

    /**
     * Seller: get their own conversation with admin (read-only access to own conv)
     */
    sellerConversation: protectedProcedure.query(async ({ ctx }) => {
      // Allow any user who has a seller profile OR is admin
      // (sellers may have role="user" if role was not updated at registration)
      if (ctx.user.role === "admin") {
        // Admin should use adminConversations instead, but return empty for safety
        return { conversation: null, messages: [] };
      }
      // Check if user has a seller profile
      const sellerProfile = await getSellerByUserId(ctx.user.id);
      if (!sellerProfile) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only sellers can access messages" });
      }
      const conv = await getSellerConversation(ctx.user.id);
      if (!conv) return { conversation: null, messages: [] };
      const msgs = await getConversationMessages(conv.id);
      await markConversationRead(conv.id, ctx.user.id);
      return { conversation: conv, messages: msgs };
    }),

    /**
     * Send a message — admin can send to any seller, seller can only reply in their own conv
     */
    send: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        body: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify the user belongs to this conversation
        // Admin: check adminConversations; Seller (any role): check sellerConversation
        let isParticipant = false;
        if (ctx.user.role === "admin") {
          const adminConvs = await getAdminConversations(ctx.user.id);
          isParticipant = adminConvs.some((c) => c.id === input.conversationId);
        } else {
          // Any user with a seller profile can reply
          const sellerConv = await getSellerConversation(ctx.user.id);
          isParticipant = sellerConv?.id === input.conversationId;
        }
        if (!isParticipant) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant of this conversation" });
        }
        await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          body: input.body,
        });
        // If admin sent the message, create an in-app notification for the seller
        if (ctx.user.role === "admin") {
          const adminConvs = await getAdminConversations(ctx.user.id);
          const conv = adminConvs.find((c) => c.id === input.conversationId);
          if (conv) {
            await createNotification({
              userId: conv.sellerId,
              title: "Новое сообщение от администратора",
              message: input.body.length > 80 ? input.body.slice(0, 80) + "..." : input.body,
              orderId: null,
              type: "message",
            });
          }
        }
        return { success: true };
      }),

    /**
     * Count unread messages for the current user
     */
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      // Admin always has access; for other users check if they have a seller profile
      if (ctx.user.role !== "admin") {
        const sellerProfile = await getSellerByUserId(ctx.user.id);
        if (!sellerProfile) return { count: 0 };
      }
      const count = await countUnreadMessages(ctx.user.id);
      return { count };
    }),
  }),

  // ---- Seller Contacts (phone book) ----
  sellerContacts: router({
    /** List all saved contacts — accessible to admin and sellers */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        // Check if user has a seller profile
        const sellerProfile = await getSellerByUserId(ctx.user.id);
        if (!sellerProfile) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admin and sellers can access contacts" });
        }
      }
      return getSellerContacts();
    }),

    /** Create a new contact */
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        phone: z.string().min(5).max(64),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          const sellerProfile = await getSellerByUserId(ctx.user.id);
          if (!sellerProfile) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const contact = await createSellerContact({
          name: input.name,
          phone: input.phone,
          createdBy: ctx.user.id,
        });
        return contact;
      }),

    /** Delete a contact — admin only */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteSellerContact(input.id);
        return { success: true };
      }),
  }),

  brands: router({
    /** List all saved brands — accessible to admin and sellers */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        const sellerProfile = await getSellerByUserId(ctx.user.id);
        if (!sellerProfile) throw new TRPCError({ code: "FORBIDDEN", message: "Only admin and sellers can access brands" });
      }
      return getBrands();
    }),

    /** Create a new brand */
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(128) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          const sellerProfile = await getSellerByUserId(ctx.user.id);
          if (!sellerProfile) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const brand = await createBrand({ name: input.name.trim(), createdBy: ctx.user.id });
        return brand;
      }),

    /** Delete a brand — admin only */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBrand(input.id);
        return { success: true };
      }),
  }),

  // ---- Quick Orders (1-click buy) ----
  quickOrders: router({
    /** Submit a quick buy request (public) */
    create: publicProcedure
      .input(z.object({
        productId: z.number().optional(),
        productName: z.string().min(1).max(512),
        productPrice: z.string().optional(),
        customerName: z.string().min(1).max(128),
        customerPhone: z.string()
          .regex(
            /^\+998(33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/,
            "Некорректный номер телефона. Формат: +998XXXXXXXXX"
          ),
      }))
      .mutation(async ({ input }) => {
        const id = await createQuickOrder(input);
        // Notify admin via Telegram
        try {
          const msg = [
            "🛒 *Новая заявка «Купить в 1 клик»*",
            `Товар: ${input.productName}${input.productPrice ? ` (цена: ${input.productPrice})` : ""}`,
            `Покупатель: ${input.customerName}`,
            `Телефон: ${input.customerPhone}`,
          ].join("\n");
          await broadcastTelegramMessage(msg);
        } catch (e) {
          console.warn("[QuickOrder] Telegram notify failed:", e);
        }
        return { id, success: true };
      }),

    /** List all quick orders — admin only */
    list: adminProcedure.query(async () => {
      return getAllQuickOrders();
    }),

    /** Update status — admin only */
    updateStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["new", "called", "done", "cancelled"]) }))
      .mutation(async ({ input }) => {
        await updateQuickOrderStatus(input.id, input.status);
        return { success: true };
      }),
  }),

  // ---- AI Shopping Assistant ----
  ai: router({
    /**
     * Chat with AI shopping assistant.
     * Accepts conversation history and returns assistant reply.
     * Public — no login required.
     */
    chat: publicProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(4000),
        })).max(20),
        // Optional: current product context
        productContext: z.object({
          name: z.string(),
          price: z.number().optional(),
          category: z.string().optional(),
        }).optional(),
        // Recently viewed products from localStorage
        viewedProducts: z.array(z.object({
          id: z.number(),
          name: z.string(),
          brand: z.string().nullable().optional(),
          price: z.string(),
          discount: z.number().nullable().optional(),
          categoryId: z.number().optional(),
          viewedAt: z.number().optional(),
        })).max(10).optional(),
      }))
      .mutation(async ({ input }) => {
        // Load top products for context (limit 40 for prompt size)
        const products = await getProducts({ limit: 40, offset: 0 });
        const settings = await getAllStoreSettings();
        const settingsMap = settings as Record<string, string>;
        const storeName = settingsMap["store_name"] ?? "Katta Chegirma";
        const storePhone = settingsMap["phone"] ?? "";
        const storeAddress = settingsMap["address"] ?? "";

        // Build product list for system prompt (compact format)
        const productLines = (products as Array<{ name: string; price: string; originalPrice?: string | null; brand?: string | null; stockCount?: number | null }>)
          .slice(0, 40).map((p) => {
          const priceNum = parseFloat(p.price) || 0;
          const origNum = p.originalPrice ? parseFloat(p.originalPrice) : null;
          const discount = origNum && origNum > priceNum
            ? ` (скидка ${Math.round((1 - priceNum / origNum) * 100)}%)`
            : "";
          const stock = p.stockCount != null ? ` [${p.stockCount} шт]` : "";
          return `- ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${priceNum.toLocaleString("ru")} сум${discount}${stock}`;
        }).join("\n");

        // Build viewed products section if available
        let viewedSection = "";
        if (input.viewedProducts && input.viewedProducts.length > 0) {
          const viewedLines = input.viewedProducts.map((p) => {
            const priceNum = parseFloat(p.price) || 0;
            const discount = p.discount ? ` (скидка ${p.discount}%)` : "";
            return `- ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${priceNum.toLocaleString("ru")} сум${discount}`;
          }).join("\n");
          viewedSection = `\n\nНедавно просмотренные товары пользователя (${input.viewedProducts.length} шт — используй для персональных рекомендаций):\n${viewedLines}\n\nВАЖНО: Пользователь интересовался этими товарами. Учитывай его предпочтения по категориям, ценовому диапазону и брендам при рекомендациях. Если он спрашивает «что посоветуете» или «что у вас есть» — опирайся на его интересы.`;
        }

        const systemPrompt = `Ты — умный помощник интернет-магазина «${storeName}» (kattachegirma.uz). Помогаешь покупателям выбрать товар, отвечаешь на вопросы о ценах, наличии, доставке и оформлении заказа.${viewedSection}

Текущий каталог товаров (${products.length} позиций):
${productLines}

Информация о магазине:
- Телефон: ${storePhone || "+998 XX XXX-XX-XX"}
- Адрес: ${storeAddress || "Узбекистан"}
- Доставка: по всему Узбекистану
- Оплата: наличными при получении
- Сайт: kattachegirma.uz

Правила:
1. Отвечай ТОЛЬКО на русском языке, кратко и по делу
2. Рекомендуй конкретные товары из каталога с ценами
3. Если товара нет в списке — скажи что уточнишь у менеджера
4. Для оформления заказа направляй на кнопку «Успей по скидке» или «Купить в 1 клик»
5. Будь дружелюбным и профессиональным
6. Не выдумывай цены и характеристики — используй только данные из каталога
7. Если есть история просмотров — используй её для персонализации ответов`;

        const llmMessages = [
          { role: "system" as const, content: systemPrompt },
          ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ];

        // Add product context if provided
        if (input.productContext) {
          const lastUserIdx = [...llmMessages].reverse().findIndex((m) => m.role === "user");
          if (lastUserIdx !== -1) {
            const idx = llmMessages.length - 1 - lastUserIdx;
            llmMessages[idx] = {
              ...llmMessages[idx],
              content: `[Пользователь смотрит товар: ${input.productContext.name}${input.productContext.price ? ` за ${input.productContext.price.toLocaleString("ru")} сум` : ""}]\n${llmMessages[idx].content}`,
            };
          }
        }

        const result = await invokeLLM({ messages: llmMessages });
        const reply = result.choices?.[0]?.message?.content ?? "Извините, не смог ответить. Попробуйте ещё раз.";
        return { reply };
      }),
  }),
  youtube: router({
    getVideoStats: publicProcedure
      .input(z.object({ ids: z.array(z.string()).min(1).max(50) }))
      .query(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        if (!apiKey) return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
        // Simple in-memory cache: 5 minutes
        const cacheKey = input.ids.sort().join(",");
        const now = Date.now();
        if (youtubeCache[cacheKey] && now - youtubeCache[cacheKey].ts < 5 * 60 * 1000) {
          return { stats: youtubeCache[cacheKey].data };
        }
        try {
          const idsParam = input.ids.join(",");
          const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsParam}&key=${apiKey}`;
          const res = await fetch(url);
          if (!res.ok) return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
          const json = await res.json() as { items?: Array<{ id: string; statistics: { viewCount?: string; likeCount?: string } }> };
          const stats: Record<string, { viewCount: string; likeCount: string }> = {};
          for (const item of json.items ?? []) {
            stats[item.id] = {
              viewCount: item.statistics.viewCount ?? "0",
              likeCount: item.statistics.likeCount ?? "0",
            };
          }
          youtubeCache[cacheKey] = { ts: now, data: stats };
          return { stats };
        } catch {
          return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
        }
      }),
    getChannelStats: publicProcedure
      .query(async () => {
        const apiKey = ENV.youtubeApiKey;
        const DB_CACHE_KEY = "channel_stats";
        const now = Date.now();
        // 1. In-memory cache (30 min)
        if (_youtubeStatsCache && now - _youtubeStatsCache.ts < 30 * 60 * 1000) {
          return _youtubeStatsCache.data;
        }
        // 2. Try YouTube API
        if (apiKey) {
          try {
            const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=katta.chegirma&key=${apiKey}`;
            const res = await fetch(url);
            if (res.ok) {
              const json = await res.json() as { items?: Array<{ statistics: { viewCount?: string; subscriberCount?: string; videoCount?: string } }> };
              const s = json.items?.[0]?.statistics ?? {};
              // Only store if we got real data (not quota error)
              if (json.items && json.items.length > 0) {
                const result: YTChannelStats = {
                  viewCount: s.viewCount ?? "0",
                  subscriberCount: s.subscriberCount ?? "0",
                  videoCount: s.videoCount ?? "0",
                };
                _youtubeStatsCache = { ts: now, data: result };
                // Persist to DB
                await setYoutubeCache(DB_CACHE_KEY, JSON.stringify(result));
                return result;
              }
            }
          } catch { /* fall through to DB cache */ }
        }
        // 3. Fallback: DB persistent cache
        const cached = await getYoutubeCache(DB_CACHE_KEY);
        if (cached) {
          try {
            const result = JSON.parse(cached) as YTChannelStats;
            _youtubeStatsCache = { ts: now - 25 * 60 * 1000, data: result }; // keep in memory but allow refresh soon
            return result;
          } catch { /* ignore parse error */ }
        }
        return { viewCount: "0", subscriberCount: "0", videoCount: "0" };
      }),
    getChannelVideos: publicProcedure
      .input(z.object({ pageToken: z.string().optional(), maxResults: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        const UPLOADS_PLAYLIST = "UUo0v66OjZ8Z3LujfipwuQUA";
        const cacheKey = `channel_${input.pageToken ?? "first"}_${input.maxResults}`;
        const DB_CACHE_KEY = `videos_${cacheKey}`;
        const now = Date.now();
        // 1. In-memory cache (10 min)
        if (youtubeChanCache[cacheKey] && now - youtubeChanCache[cacheKey].ts < 10 * 60 * 1000) {
          return youtubeChanCache[cacheKey].data;
        }
        // 2. Try YouTube API
        if (apiKey) {
          try {
            let plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${UPLOADS_PLAYLIST}&maxResults=${input.maxResults}&key=${apiKey}`;
            if (input.pageToken) plUrl += `&pageToken=${input.pageToken}`;
            const plRes = await fetch(plUrl);
            if (plRes.ok) {
              const plJson = await plRes.json() as {
                nextPageToken?: string;
                pageInfo: { totalResults: number };
                items?: Array<{ snippet: { resourceId: { videoId: string }; title: string; description: string; thumbnails: { high?: { url: string }; medium?: { url: string } }; publishedAt: string } }>;
              };
              const items = plJson.items ?? [];
              const videoIds = items.map(i => i.snippet.resourceId.videoId).filter(Boolean);
              if (videoIds.length > 0) {
                const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`;
                const statsRes = await fetch(statsUrl);
                const statsJson = statsRes.ok ? await statsRes.json() as { items?: Array<{ id: string; statistics: { viewCount?: string; likeCount?: string } }> } : { items: [] };
                const statsMap: Record<string, { viewCount: string; likeCount: string }> = {};
                for (const s of statsJson.items ?? []) {
                  statsMap[s.id] = { viewCount: s.statistics.viewCount ?? "0", likeCount: s.statistics.likeCount ?? "0" };
                }
                const videos: YTVideoItem[] = items.map(i => ({
                  id: i.snippet.resourceId.videoId,
                  title: i.snippet.title,
                  description: (i.snippet.description ?? "").split("\n")[0].slice(0, 200),
                  thumbnail: i.snippet.thumbnails.high?.url ?? i.snippet.thumbnails.medium?.url ?? "",
                  viewCount: statsMap[i.snippet.resourceId.videoId]?.viewCount ?? "0",
                  likeCount: statsMap[i.snippet.resourceId.videoId]?.likeCount ?? "0",
                  publishedAt: i.snippet.publishedAt,
                }));
                const result = { videos, nextPageToken: plJson.nextPageToken ?? null, totalResults: plJson.pageInfo.totalResults };
                youtubeChanCache[cacheKey] = { ts: now, data: result };
                // Persist to DB
                await setYoutubeCache(DB_CACHE_KEY, JSON.stringify(result));
                return result;
              }
            }
          } catch { /* fall through to DB cache */ }
        }
        // 3. Fallback: DB persistent cache
        const cached = await getYoutubeCache(DB_CACHE_KEY);
        if (cached) {
          try {
            const result = JSON.parse(cached) as { videos: YTVideoItem[]; nextPageToken: string | null; totalResults: number };
            youtubeChanCache[cacheKey] = { ts: now - 8 * 60 * 1000, data: result };
            return result;
          } catch { /* ignore */ }
        }
        return { videos: [] as YTVideoItem[], nextPageToken: null as string | null, totalResults: 0 };
      }),
    searchVideos: publicProcedure
      .input(z.object({ query: z.string().min(1).max(200), maxResults: z.number().min(1).max(8).default(6) }))
      .query(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        if (!apiKey) return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
        const cacheKey = `search_${input.query.toLowerCase().replace(/\s+/g, "_").slice(0, 80)}_${input.maxResults}`;
        const now = Date.now();
        if ((youtubeChanCache as any)[cacheKey] && now - (youtubeChanCache as any)[cacheKey].ts < 30 * 60 * 1000) {
          return (youtubeChanCache as any)[cacheKey].data;
        }
        try {
          const CHANNEL_ID = "UCo0v66OjZ8Z3LujfipwuQUA";
          const q = encodeURIComponent(input.query.slice(0, 100));
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${q}&type=video&maxResults=${input.maxResults}&order=relevance&key=${apiKey}`;
          const res = await fetch(url);
          if (!res.ok) return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
          const json = await res.json() as {
            items?: Array<{
              id: { videoId: string };
              snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
            }>;
          };
          const videos = (json.items ?? []).map(i => ({
            videoId: i.id.videoId,
            title: i.snippet.title,
            thumbnail: i.snippet.thumbnails.medium?.url ?? i.snippet.thumbnails.default?.url ?? "",
          }));
          const result = { videos };
          (youtubeChanCache as any)[cacheKey] = { ts: now, data: result };
          return result;
        } catch {
          return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
        }
      }),
    findVideoForProduct: publicProcedure
      .input(z.object({ productName: z.string().min(1).max(200) }))
      .query(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        if (!apiKey) return { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
        // Normalize product name: extract key words (brand + model), strip noise
        const name = input.productName.trim();
        const cacheKey = `product_video_${name.toLowerCase().replace(/\s+/g, "_").slice(0, 80)}`;
        const now = Date.now();
        if (youtubeChanCache[cacheKey] && now - (youtubeChanCache[cacheKey] as any).ts < 60 * 60 * 1000) {
          return (youtubeChanCache[cacheKey] as any).data;
        }
        try {
          // Search within the channel using YouTube Data API v3 search endpoint
          const query = encodeURIComponent(name.slice(0, 100));
          const CHANNEL_ID = "UCo0v66OjZ8Z3LujfipwuQUA";
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${query}&type=video&maxResults=1&order=relevance&key=${apiKey}`;
          const res = await fetch(url);
          if (!res.ok) return { videoId: null, title: null, thumbnail: null };
          const json = await res.json() as {
            items?: Array<{
              id: { videoId: string };
              snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
            }>;
          };
          const item = json.items?.[0];
          if (!item) {
            const result = { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
            (youtubeChanCache as any)[cacheKey] = { ts: now, data: result };
            return result;
          }
          const result = {
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? null,
          };
          (youtubeChanCache as any)[cacheKey] = { ts: now, data: result };
          return result;
        } catch {
          return { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
