import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  trackEvent,
  getAnalyticsStats,
  getPopularSearchQueries,
} from "../db";

export const analyticsRouter = router({
  // Public: track an analytics event
  track: publicProcedure
    .input(z.object({
      eventType: z.string(),
      page: z.string().optional(),
      productId: z.number().optional(),
      productName: z.string().optional(),
      sessionId: z.string().optional(),
      userId: z.number().optional(),
      meta: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    }))
    .mutation(async ({ input }) => {
      await trackEvent({
        eventType: input.eventType,
        page: input.page,
        productId: input.productId,
        productName: input.productName,
        sessionId: input.sessionId,
        userId: input.userId,
        meta: input.meta,
      });
      return { success: true };
    }),

  // Public: popular search queries (for "Часто ищут" block)
  popularQueries: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
    .query(async ({ input }) => {
      return getPopularSearchQueries(input?.limit ?? 30, 90);
    }),

  // Admin: get analytics stats
  stats: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      return getAnalyticsStats(input.days);
    }),
});
