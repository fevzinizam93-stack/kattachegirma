import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import { bulkRecalcPrices } from "../db";

export const currencyRouter = router({
  // Admin: bulk recalculate all product prices based on new exchange rate
  bulkUpdatePrices: adminProcedure
    .input(z.object({
      newRate: z.number().min(1),
      markupPercent: z.number().min(0).max(500).default(0),
    }))
    .mutation(async ({ input }) => {
      const updated = await bulkRecalcPrices(input.newRate, input.markupPercent);
      return { updated, newRate: input.newRate };
    }),

  // Public: get current USD -> UZS exchange rate (no API key required)
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
});
