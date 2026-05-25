import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getAllStoreSettings,
  setStoreSetting,
} from "../db";

export const storeSettingsRouter = router({
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
});
