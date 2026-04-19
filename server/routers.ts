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
  updateOrderStatus,
  seedInitialData,
  upsertCategory,
} from "./db";
import { storagePut } from "./storage";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
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
  }),

  // ---- Categories ----
  categories: router({
    list: publicProcedure.query(async () => {
      await seedInitialData();
      return getAllCategories();
    }),
    upsert: adminProcedure
      .input(z.object({ id: z.number().optional(), name: z.string(), slug: z.string(), icon: z.string().optional() }))
      .mutation(async ({ input }) => {
        return upsertCategory(input);
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
      }))
      .mutation(async ({ input }) => {
        const id = await createOrder(input);
        return { id };
      }),

    list: adminProcedure.query(async () => {
      return getAllOrders();
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
});

export type AppRouter = typeof appRouter;
