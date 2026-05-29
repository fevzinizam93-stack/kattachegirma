/**
 * Scheduled handler: daily Google Indexing API bulk submit.
 * Called by Manus Heartbeat cron at 00:05 UTC every day.
 * Path: POST /api/scheduled/reindex
 */
import { Request, Response } from "express";
import { getDb } from "./db";
import { products as productsTable } from "../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import { submitUrlsBatch } from "./googleIndexing";
import { saveIndexingLog } from "./db";

const BASE_URL = "https://kattachegirma.uz";
const FRESH_WINDOW_HOURS = 48; // только товары, изменённые за последние 48 часов
const SUBMIT_CAP = 50;         // максимум 50 URL/день — оставляем запас квоты Google (лимит 200/сутки)

export async function scheduledReindexHandler(req: Request, res: Response) {
  const taskUid = req.headers["x-manus-cron-task-uid"] as string | undefined;

  // Only allow cron callers (platform sets this header)
  if (!taskUid) {
    return res.status(403).json({ error: "cron-only endpoint" });
  }

  // Extra protection: if CRON_TASK_UID is set, only allow exact match.
  // If env var is not set — works as before (cron not broken).
  const expectedUid = process.env.CRON_TASK_UID;
  if (expectedUid && taskUid !== expectedUid) {
    return res.status(403).json({ error: "invalid cron task uid" });
  }
  if (!expectedUid) {
    console.log(`[ScheduledReindex] cron task uid = ${taskUid} — set CRON_TASK_UID env var to this value to lock down the endpoint`);
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    // Только НОВЫЕ/ИЗМЕНЁННЫЕ товары за последние FRESH_WINDOW_HOURS часов.
    // Старые, уже проиндексированные товары повторно НЕ отправляем — именно это выжигало квоту 200/сутки.
    const since = new Date(Date.now() - FRESH_WINDOW_HOURS * 60 * 60 * 1000);
    const allProducts = await db
      .select({ slug: productsTable.slug })
      .from(productsTable)
      .where(and(
        eq(productsTable.isActive, true),
        eq(productsTable.isApproved, true),
        gte(productsTable.updatedAt, since),
      ))
      .limit(SUBMIT_CAP);

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
