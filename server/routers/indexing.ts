import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import { submitUrlsBatch } from "../googleIndexing";
import { submitSitemapToSearchConsole, getSitemapStatus, listSitemaps } from "../googleSearchConsole";
import { indexNowSubmit } from "../indexNow";
import { getAllCategories, getDb, getIndexingLogs, saveIndexingLog } from "../db";
import { and, eq } from "drizzle-orm";
import { products as productsTable } from "../../drizzle/schema";

export const indexingRouter = router({
  // Google Indexing API: submit a single URL
  submitUrl: adminProcedure
    .input(z.object({ url: z.string().url(), type: z.enum(["URL_UPDATED", "URL_DELETED"]).default("URL_UPDATED") }))
    .mutation(async ({ input }) => {
      const results = await submitUrlsBatch([input.url], input.type, 300);
      await saveIndexingLog({
        engine: "google",
        type: "single_url",
        urlCount: 1,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        status: results[0]?.success ? "success" : "error",
        note: input.url,
      });
      return results[0] ?? { success: false };
    }),

  // Google Indexing API: submit all active approved product URLs
  submitAllProducts: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(10000).default(200) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, succeeded: 0, failed: 0, results: [] };
      const allProducts = await db
        .select({ slug: productsTable.slug })
        .from(productsTable)
        .where(and(eq(productsTable.isActive, true), eq(productsTable.isApproved, true)))
        .limit(input.limit);
      const urls = allProducts.map(
        (p: { slug: string }) => `https://kattachegirma.uz/product/${p.slug}`
      );
      const results = await submitUrlsBatch(urls, "URL_UPDATED", 300);
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      await saveIndexingLog({
        engine: "google",
        type: "products",
        urlCount: urls.length,
        succeeded,
        failed,
        status: failed === 0 ? "success" : succeeded > 0 ? "partial" : "error",
      });
      return { total: urls.length, succeeded, failed, results };
    }),

  // Yandex IndexNow: submit a single URL
  submitUrlYandex: adminProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      await indexNowSubmit([input.url]);
      await saveIndexingLog({
        engine: "yandex",
        type: "single_url",
        urlCount: 1,
        succeeded: 1,
        failed: 0,
        status: "success",
        note: input.url,
      });
      return { success: true, url: input.url };
    }),

  // Yandex IndexNow: submit all product URLs in bulk (no quota limit)
  submitAllProductsYandex: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(10000).default(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, success: false };
      const allProducts = await db
        .select({ slug: productsTable.slug })
        .from(productsTable)
        .where(and(eq(productsTable.isActive, true), eq(productsTable.isApproved, true)))
        .limit(input.limit);
      const urls = allProducts.map((p: { slug: string }) => `https://kattachegirma.uz/product/${p.slug}`);
      await indexNowSubmit(urls);
      await saveIndexingLog({
        engine: "yandex",
        type: "products",
        urlCount: urls.length,
        succeeded: urls.length,
        failed: 0,
        status: "success",
      });
      return { total: urls.length, success: true };
    }),

  // Yandex IndexNow: submit all category + static URLs
  submitAllCategoriesYandex: adminProcedure.mutation(async () => {
    const cats = await getAllCategories();
    const urls = [
      "https://kattachegirma.uz/",
      "https://kattachegirma.uz/catalog",
      ...cats.map((c) => `https://kattachegirma.uz/catalog/${c.slug}`),
    ];
    await indexNowSubmit(urls);
    await saveIndexingLog({
      engine: "yandex",
      type: "categories",
      urlCount: urls.length,
      succeeded: urls.length,
      failed: 0,
      status: "success",
    });
    return { total: urls.length, success: true };
  }),

  // Submit all category URLs to Google
  submitAllCategories: adminProcedure.mutation(async () => {
    const cats = await getAllCategories();
    const urls = cats.map(
      (c) => `https://kattachegirma.uz/catalog/${c.slug}`
    );
    urls.push("https://kattachegirma.uz/");
    urls.push("https://kattachegirma.uz/catalog");
    const results = await submitUrlsBatch(urls, "URL_UPDATED", 300);
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    await saveIndexingLog({
      engine: "google",
      type: "categories",
      urlCount: urls.length,
      succeeded,
      failed,
      status: failed === 0 ? "success" : succeeded > 0 ? "partial" : "error",
    });
    return { total: urls.length, succeeded, failed, results };
  }),

  // Google Search Console: Sitemap submission
  submitSitemap: adminProcedure
    .input(z.object({
      siteUrl: z.string().url().default("https://kattachegirma.uz/"),
      sitemapUrl: z.string().url().default("https://kattachegirma.uz/sitemap.xml"),
    }).optional())
    .mutation(async ({ input }) => {
      const siteUrl = input?.siteUrl ?? "https://kattachegirma.uz/";
      const sitemapUrl = input?.sitemapUrl ?? "https://kattachegirma.uz/sitemap.xml";
      const result = await submitSitemapToSearchConsole(siteUrl, sitemapUrl);
      await saveIndexingLog({
        engine: "google",
        type: "sitemap",
        urlCount: 1,
        succeeded: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        status: result.success ? "success" : "error",
        note: sitemapUrl,
      });
      return result;
    }),

  // Get sitemap status from Google Search Console
  getSitemapStatus: adminProcedure
    .input(z.object({
      siteUrl: z.string().url().default("https://kattachegirma.uz/"),
      sitemapUrl: z.string().url().default("https://kattachegirma.uz/sitemap.xml"),
    }).optional())
    .query(async ({ input }) => {
      const siteUrl = input?.siteUrl ?? "https://kattachegirma.uz/";
      const sitemapUrl = input?.sitemapUrl ?? "https://kattachegirma.uz/sitemap.xml";
      return await getSitemapStatus(siteUrl, sitemapUrl);
    }),

  // List all sitemaps in Google Search Console
  listSitemaps: adminProcedure
    .input(z.object({
      siteUrl: z.string().url().default("https://kattachegirma.uz/"),
    }).optional())
    .query(async ({ input }) => {
      const siteUrl = input?.siteUrl ?? "https://kattachegirma.uz/";
      return await listSitemaps(siteUrl);
    }),

  // Get indexing logs
  getLogs: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return getIndexingLogs(input.limit);
    }),

  // Test Telegram notification
  testTelegram: adminProcedure.mutation(async () => {
    const { broadcastTelegramMessage } = await import("../telegram");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (!token) return { success: false, error: "TELEGRAM_BOT_TOKEN not set" };
    if (!chatId) return { success: false, error: "TELEGRAM_ADMIN_CHAT_ID not set" };
    try {
      await broadcastTelegramMessage(
        `🧪 <b>Telegram test</b>\n\nkattachegirma.uz saytidan test xabari\n⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`
      );
      return { success: true, chatId, tokenPrefix: token.slice(0, 10) };
    } catch (e: unknown) {
      return { success: false, error: String(e) };
    }
  }),
});
