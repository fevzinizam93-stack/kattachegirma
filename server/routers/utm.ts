import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  recordUtmVisit,
  getUtmStats,
} from "../db";

export const utmRouter = router({
  // Public: track a UTM visit
  track: publicProcedure
    .input(z.object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),
      landingPage: z.string().optional(),
      referrer: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await recordUtmVisit(input);
      return { success: true };
    }),

  // Alias for track (old name)
  trackVisit: publicProcedure
    .input(z.object({
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),
      utmTerm: z.string().optional(),
      utmContent: z.string().optional(),
      landingPage: z.string().optional(),
      referrer: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await recordUtmVisit(input);
      return { success: true };
    }),

  // Alias for stats (old name: getStats)
  getStats: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      return getUtmStats(input.days);
    }),

  // Admin: get UTM analytics stats
  stats: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      return getUtmStats(input.days);
    }),
});
