import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getFavoritesByUserId,
  addFavorite,
  removeFavorite,
  isFavorite,
  getProductById as getProductByIdDb,
  getDb,
} from "../db";

export const favoritesRouter = router({
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
      // +5 очков к hitScore при добавлении в избранное (non-blocking)
      getDb().then(async (db) => {
        if (!db) return;
        await db.execute(
          sql`UPDATE products
              SET hitScore = COALESCE(hitScore, 0) + 5
              WHERE id = ${input.productId} AND isHitManual = FALSE`
        );
      }).catch(() => {});
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
});
