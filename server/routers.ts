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
} from "./db";
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
        sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'discount']).optional(),
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
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        if (!seller.isApproved) throw new TRPCError({ code: "FORBIDDEN", message: "Seller not approved yet" });
        const id = await createProduct({
          ...input,
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
        if (!apiKey) return { viewCount: "0", subscriberCount: "0", videoCount: "0" };
        const now = Date.now();
        if (_youtubeStatsCache && now - _youtubeStatsCache.ts < 30 * 60 * 1000) {
          return _youtubeStatsCache.data;
        }
        try {
          const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=katta.chegirma&key=${apiKey}`;
          const res = await fetch(url);
          if (!res.ok) return { viewCount: "0", subscriberCount: "0", videoCount: "0" };
          const json = await res.json() as { items?: Array<{ statistics: { viewCount?: string; subscriberCount?: string; videoCount?: string } }> };
          const s = json.items?.[0]?.statistics ?? {};
          const result: YTChannelStats = {
            viewCount: s.viewCount ?? "0",
            subscriberCount: s.subscriberCount ?? "0",
            videoCount: s.videoCount ?? "0",
          };
          _youtubeStatsCache = { ts: now, data: result };
          return result;
        } catch {
          return { viewCount: "0", subscriberCount: "0", videoCount: "0" };
        }
      }),
    getChannelVideos: publicProcedure
      .input(z.object({ pageToken: z.string().optional(), maxResults: z.number().min(1).max(50).default(20) }))
      .query(async ({ input }) => {
        const apiKey = ENV.youtubeApiKey;
        const UPLOADS_PLAYLIST = "UUo0v66OjZ8Z3LujfipwuQUA";
        if (!apiKey) return { videos: [] as YTVideoItem[], nextPageToken: null as string | null, totalResults: 0 };
        const cacheKey = `channel_${input.pageToken ?? "first"}_${input.maxResults}`;
        const now = Date.now();
        if (youtubeChanCache[cacheKey] && now - youtubeChanCache[cacheKey].ts < 10 * 60 * 1000) {
          return youtubeChanCache[cacheKey].data;
        }
        try {
          // Step 1: get video IDs from uploads playlist
          let plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${UPLOADS_PLAYLIST}&maxResults=${input.maxResults}&key=${apiKey}`;
          if (input.pageToken) plUrl += `&pageToken=${input.pageToken}`;
          const plRes = await fetch(plUrl);
          if (!plRes.ok) return { videos: [] as YTVideoItem[], nextPageToken: null as string | null, totalResults: 0 };
          const plJson = await plRes.json() as {
            nextPageToken?: string;
            pageInfo: { totalResults: number };
            items?: Array<{ snippet: { resourceId: { videoId: string }; title: string; description: string; thumbnails: { high?: { url: string }; medium?: { url: string } }; publishedAt: string } }>;
          };
          const items = plJson.items ?? [];
          const videoIds = items.map(i => i.snippet.resourceId.videoId).filter(Boolean);
          if (videoIds.length === 0) return { videos: [] as YTVideoItem[], nextPageToken: plJson.nextPageToken ?? null, totalResults: plJson.pageInfo.totalResults };
          // Step 2: get statistics for those videos
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
          return result;
        } catch {
          return { videos: [] as YTVideoItem[], nextPageToken: null as string | null, totalResults: 0 };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
