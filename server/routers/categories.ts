import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure, getCached, setCached } from "./_shared";
import {
  getAllCategories,
  upsertCategory,
  deleteCategory,
  getDb,
} from "../db";
import { eq } from "drizzle-orm";
import { categories } from "../../drizzle/schema";
import { pingSitemaps } from "../sitemap";
import { invokeLLM } from "../_core/llm";

export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const cached = getCached<Awaited<ReturnType<typeof getAllCategories>>>('categories:list');
    if (cached) return cached;
    const result = await getAllCategories();
    setCached('categories:list', result, 10 * 60 * 1000); // 10 min cache
    return result;
  }),
  upsert: adminProcedure
    .input(z.object({ id: z.number().optional(), name: z.string(), slug: z.string(), icon: z.string().optional() }))
    .mutation(async ({ input }) => {
      const result = await upsertCategory(input);
      // Pass specific category URL so Google gets a targeted signal
      const categoryUrl = `https://kattachegirma.uz/category/${input.slug}`;
      pingSitemaps(categoryUrl);
      return result;
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCategory(input.id);
      // Category deleted — ping sitemap root so Google re-crawls the structure
      pingSitemaps();
      return { success: true };
    }),
  // Admin: generate UZ slugs for all categories via LLM
  generateUzSlugs: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const allCats = await getAllCategories();
      const needsSlug = allCats.filter(c => !(c as any).slugUz);
      let updated = 0;
      for (const cat of needsSlug) {
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: "You are a URL slug generator. Given a Russian product category name, generate a short SEO-friendly Uzbek slug in Latin script (as used in Uzbekistan). Use hyphens between words, only lowercase a-z and hyphens. Output ONLY the slug. Examples: 'Стиральные машины' -> 'kir-yuvish-mashinalar', 'Холодильники' -> 'muzlatgichlar', 'Пылесосы' -> 'changyutkichlar', 'Кондиционеры' -> 'konditsionerlar'" },
              { role: "user", content: cat.name },
            ],
          });
          const raw = (response.choices?.[0]?.message?.content ?? "").toString().trim().toLowerCase();
          const slugUz = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
          if (slugUz) {
            await db.update(categories).set({ slugUz } as any).where(eq(categories.id, cat.id));
            updated++;
          }
        } catch { /* skip on error */ }
      }
      return { total: needsSlug.length, updated };
    }),
  // Admin: set slugUz for a single category
  setUzSlug: adminProcedure
    .input(z.object({ id: z.number(), slugUz: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      await db.update(categories).set({ slugUz: input.slugUz } as any).where(eq(categories.id, input.id));
      return { success: true };
    }),
});
