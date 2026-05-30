import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getAllSellers,
  getSellerByUserId,
  createSeller,
  updateSeller,
  approveSeller,
  rejectSeller,
  setSellerBlocked,
  setSellerTrusted,
  setSellerLogo,
  getSellerProducts,
  promoteToAdmin,
  getPendingProducts,
  getSellerById,
  getApprovedSellers,
  getSellerReviews,
  createSellerReview,
  getSellerRatingStats,
  getSellerProductStats,
  hideSellerReview,
  getSellerPublicProfile,
  updateProduct,
  getProductById,
} from "../db";
import { notifyNewSeller, notifySellerApproved, notifySellerRejected } from "../telegram";
import { indexNowProduct } from "../indexNow";

export const sellersRouter = router({
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
  // Seller: обновить логотип своего магазина
  updateLogo: protectedProcedure
    .input(z.object({ logoUrl: z.string().max(1024) }))
    .mutation(async ({ input, ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Профиль продавца не найден" });
      await setSellerLogo(seller.id, input.logoUrl);
      return { success: true };
    }),

  list: adminProcedure.query(async () => {
    return getAllSellers();
  }),

  // Admin: быстро добавить продавца в базу (для импорта)
  quickCreate: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      telegram: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createSeller({
        name: input.name,
        phone: input.phone || null,
        telegram: input.telegram || null,
        isApproved: true,
      } as any);
      return { id };
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

  // Admin: сделать продавца доверенным со-админом (или снять)
  setTrusted: adminProcedure
    .input(z.object({ id: z.number(), trusted: z.boolean() }))
    .mutation(async ({ input }) => {
      await setSellerTrusted(input.id, input.trusted);
      return { ok: true };
    }),

  // Admin: reject seller
  rejectSeller: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(1).max(512) }))
    .mutation(async ({ input }) => {
      await rejectSeller(input.id, input.reason);
      // Notify the seller via Telegram (non-blocking)
      getSellerById(input.id)
        .then(seller => {
          if (seller) {
            notifySellerRejected({ name: seller.name, telegram: seller.telegram, reason: input.reason }).catch(
              e => console.error("[Telegram] notifySellerRejected failed:", e)
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
      // Notify Yandex IndexNow when product is approved
      const product = await getProductById(input.id);
      if (product?.slug) {
        indexNowProduct(product.slug).catch(e => console.warn("[IndexNow] approveProduct failed:", e));
        // Also ping Google Indexing API
        const { pingSitemaps } = await import("../sitemap");
        pingSitemaps(`https://kattachegirma.uz/product/${product.slug}`);
      }
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

  // Seller: get own sales statistics
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const seller = await getSellerByUserId(ctx.user.id);
    if (!seller) throw new TRPCError({ code: "NOT_FOUND", message: "Seller not found" });
    const myProducts = await getSellerProducts(seller.id);
    const activeProducts = myProducts.filter(p => p.isActive && p.isApproved);
    const totalViews = activeProducts.reduce((s, p) => s + (p.viewCount ?? 0), 0);
    const totalSales = activeProducts.reduce((s, p) => s + (p.salesCount ?? 0), 0);
    const totalRevenue = activeProducts.reduce((s, p) => s + (p.salesCount ?? 0) * Number(p.price ?? 0), 0);
    const topProducts = [...activeProducts]
      .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
      .slice(0, 5)
      .map(p => ({ id: p.id, name: p.name, salesCount: p.salesCount ?? 0, viewCount: p.viewCount ?? 0, price: p.price }));
    return {
      totalProducts: activeProducts.length,
      totalViews,
      totalSales,
      totalRevenue: Math.round(totalRevenue),
      topProducts,
    };
  }),
});
