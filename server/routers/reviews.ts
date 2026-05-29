import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getApprovedReviewsByProduct,
  insertReview,
  getReviewCountsByProduct,
  getAllReviews,
  setReviewStatus,
  setReviewReply,
  deleteReview,
  getLatestApprovedReviews,
  getProductById,
} from "../db";
import { notifyNewReview } from "../telegram";

export const reviewsRouter = router({
  // Public: get reviews for a product (alias: listByProduct)
  listByProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return getApprovedReviewsByProduct(input.productId);
    }),

  // Alias for listByProduct
  getByProduct: publicProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return getApprovedReviewsByProduct(input.productId);
    }),

  // Public: get rating summary for a product
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
      // Notify admin via Telegram (fire-and-forget)
      const product = await getProductById(input.productId);
      notifyNewReview({
        id: reviewId,
        productName: product?.name ?? `Товар #${input.productId}`,
        authorName: input.authorName,
        rating: input.rating,
        comment: input.comment,
      }).catch(() => {});
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

  // Alias for adminSetStatus (used in some places as setStatus)
  setStatus: adminProcedure
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

  // Admin: ответ магазина на отзыв
  adminReply: adminProcedure
    .input(z.object({ id: z.number(), reply: z.string().max(2000) }))
    .mutation(async ({ input }) => {
      await setReviewReply(input.id, input.reply);
      return { ok: true };
    }),

  // Public: latest approved reviews (for About page)
  listLatest: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(12) }))
    .query(async ({ input }) => {
      return getLatestApprovedReviews(input.limit);
    }),
});
