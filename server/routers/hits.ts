import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  trackProductClick,
  recalcAllHitScores,
  getHitSettings,
  saveHitSettings,
} from "../db";

export const hitsRouter = router({
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
});
