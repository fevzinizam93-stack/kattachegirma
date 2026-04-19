import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
} from "./db";
import { storagePut } from "./storage";
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
          // Create JWT session
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({ userId: user.id, role: user.role })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "EMAIL_EXISTS") {
            throw new TRPCError({ code: "CONFLICT", message: "Bu email allaqachon ro'yxatdan o'tgan / Этот email уже зарегистрирован" });
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
          // Create JWT session
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({ userId: user.id, role: user.role })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "INVALID_CREDENTIALS") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Email yoki parol noto'g'ri / Неверный email или пароль" });
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

    create: adminProcedure
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
        isFeatured: z.boolean().default(false),
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
          images: [],
          specs: (input.specs ?? {}) as Record<string, string>,
        });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        categoryId: z.number().optional(),
        brand: z.string().optional(),
        price: z.string().optional(),
        originalPrice: z.string().optional(),
        discount: z.number().optional(),
        imageUrl: z.string().optional(),
        stock: z.number().optional(),
        isNew: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
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

    // Seller: list own products
    sellerList: sellerProcedure.query(async ({ ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) return [];
      return getSellerProducts(seller.id);
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
});
export type AppRouter = typeof appRouter;
