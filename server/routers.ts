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
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const items = await getProducts({ ...input, approvedOnly: true });
        const total = await countProducts({ categoryId: input.categoryId, search: input.search, approvedOnly: true, isPremium: input.isPremium, minPrice: input.minPrice, maxPrice: input.maxPrice, brands: input.brands });
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

    incrementView: publicProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(async ({ input }) => {
        const newCount = await incrementViewCount(input.productId);
        return { viewCount: newCount };
      }),
    similar: publicProcedure
      .input(z.object({ categoryId: z.number(), excludeId: z.number(), limit: z.number().default(8) }))
      .query(async ({ input }) => {
        const items = await getProducts({ categoryId: input.categoryId, approvedOnly: true, limit: input.limit + 1 });
        return items.filter((p: { id: number }) => p.id !== input.excludeId).slice(0, input.limit);
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

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await updateOrderStatus(input.id, input.status);
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
        name: z.string().min(2),
        phone: z.string().min(7),
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
});
export type AppRouter = typeof appRouter;
