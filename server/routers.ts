import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyNewOrder } from "./telegram";
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
  trackEvent,
  getAnalyticsStats,
  insertReview,
  getApprovedReviewsByProduct,
  getAllReviews,
  setReviewStatus,
  deleteReview,
  getReviewCountsByProduct,
  incrementViewCount,
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

// Seller guard middleware
const sellerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "seller" && ctx.user.role !== "admin") {
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
        limit: z.number().default(20),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const items = await getProducts({ ...input, approvedOnly: true });
        const total = await countProducts({ categoryId: input.categoryId, search: input.search, approvedOnly: true });
        return { items, total };
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
        const items = await getProducts(input);
        const total = await countProducts({ categoryId: input.categoryId, search: input.search });
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
        hitOrder: z.number().default(0),
        specs: z.record(z.string(), z.string()).optional(),
        sellerPhone: z.string().optional(),
        sellerTelegram: z.string().optional(),
        sellerName: z.string().optional(),
        sellerId: z.number().optional(),
        isApproved: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const id = await createProduct({
          ...input,
          images: input.images ?? [],
          specs: (input.specs ?? {}) as Record<string, string>,
        });
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
        hitOrder: z.number().optional(),
        specs: z.record(z.string(), z.string()).optional(),
        sellerPhone: z.string().optional(),
        sellerTelegram: z.string().optional(),
        sellerName: z.string().optional(),
        sellerId: z.number().optional(),
        isApproved: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateProduct(id, { ...data, specs: data.specs as Record<string, string> | undefined });
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

    // Seller: create product (pending approval)
    sellerCreate: sellerProcedure
      .input(z.object({
        name: z.string(),
        slug: z.string(),
        description: z.string().optional(),
        categoryId: z.number(),
        brand: z.string().optional(),
        price: z.string(),
        originalPrice: z.string().optional(),
        discount: z.number().default(0),
        imageUrl: z.string().optional(),
        stock: z.number().default(0),
        isNew: z.boolean().default(false),
        specs: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
        const id = await createProduct({
          ...input,
          images: [],
          specs: (input.specs ?? {}) as Record<string, string>,
          sellerId: seller.id,
          sellerName: seller.name,
          sellerPhone: seller.phone ?? undefined,
          sellerTelegram: seller.telegram ?? undefined,
          isApproved: false,
          isFeatured: false,
        });
        return { id };
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
      return getSellerByUserId(ctx.user.id);
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
        return { success: true };
      }),

     // Admin: approve product
    approveProduct: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateProduct(input.id, { isApproved: true });
        return { success: true };
      }),
    // Admin: promote user to admin by email
    promoteUser: adminProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        await promoteToAdmin(input.email);
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
        await insertReview({
          productId: input.productId,
          authorName: input.authorName,
          rating: input.rating,
          comment: input.comment,
          status: "pending",
          userId: ctx.user?.id ?? null,
        });
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
});
export type AppRouter = typeof appRouter;
