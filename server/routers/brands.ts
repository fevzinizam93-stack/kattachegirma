import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getBrands,
  createBrand,
  deleteBrand,
} from "../db";

export const brandsRouter = router({
  // Public: list all brands
  list: publicProcedure.query(async () => {
    return getBrands();
  }),

  // Admin: create a brand
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slug: z.string().min(1).max(128).optional(), // accepted but ignored (schema has no slug)
      logoUrl: z.string().optional(),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const brand = await createBrand({ name: input.name });
      return brand;
    }),

  // Admin: delete a brand
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBrand(input.id);
      return { success: true };
    }),
});
