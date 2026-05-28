/**
 * Scheduled handler: daily Google Indexing API bulk submit.
 * Called by Manus Heartbeat cron at 00:05 UTC every day.
 * Path: POST /api/scheduled/reindex
 */
import { Request, Response } from "express";
import { getDb } from "./db";
import { products as productsTable } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { submitUrlsBatch } from "./googleIndexing";
import { saveIndexingLog } from "./db";

const BASE_URL = "https://kattachegirma.uz";
const DAILY_LIMIT = 200; // Google Indexing API: 200 requests/day

export async function scheduledReindexHandler(req: Request, res: Response) {
  const taskUid = req.headers["x-manus-cron-task-uid"] as string | undefined;

  // Only allow cron callers (platform sets this header)
  if (!taskUid) {
    return res.status(403).json({ error: "cron-only endpoint" });
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Fetch all active+approved products (up to daily limit)
    const allProducts = await db
      .select({ slug: productsTable.slug })
      .from(productsTable)
      .where(and(eq(productsTable.isActive, true), eq(productsTable.isApproved, true)))
      .limit(DAILY_LIMIT);

    const urls = allProducts
      .filter((p) => p.slug)
      .map((p) => `${BASE_URL}/product/${p.slug}`);

    if (urls.length === 0) {
      console.log("[ScheduledReindex] No approved products to index");
      return res.json({ ok: true, total: 0, succeeded: 0, failed: 0 });
    }

    console.log(`[ScheduledReindex] Submitting ${urls.length} URLs to Google Indexing API...`);
    const results = await submitUrlsBatch(urls, "URL_UPDATED", 400);
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Log to DB
    await saveIndexingLog({
      engine: "google",
      type: "products",
      urlCount: urls.length,
      succeeded,
      failed,
      status: failed === 0 ? "success" : succeeded > 0 ? "partial" : "error",
      note: `heartbeat cron taskUid=${taskUid}`,
    });

    console.log(`[ScheduledReindex] Done: ${succeeded} OK, ${failed} failed`);
    return res.json({ ok: true, total: urls.length, succeeded, failed });
  } catch (err) {
    console.error("[ScheduledReindex] Error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: message,
      context: { taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
