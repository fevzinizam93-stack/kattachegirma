import type { Express } from "express";
import { ENV } from "./env";

// In-memory cache for presigned URLs (key -> { url, expiresAt })
// Presigned URLs are valid for 1 hour; we cache for 50 minutes to be safe
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: any, res) => {
    const key = (req.params as any)[0] as string | undefined;
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    // Check in-memory cache first to avoid repeated presign API calls
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      // Cache hit — redirect with browser cache headers so images are cached client-side
      res.set("Cache-Control", "public, max-age=3000, stale-while-revalidate=600");
      res.set("Vary", "Accept");
      res.redirect(302, cached.url);
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Store in cache
      urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });

      // Clean up expired entries periodically (keep cache under 2000 entries)
      if (urlCache.size > 2000) {
        const now = Date.now();
        Array.from(urlCache.entries()).forEach(([k, v]) => {
          if (v.expiresAt < now) urlCache.delete(k);
        });
      }

      // Tell browsers to cache the redirect response
      res.set("Cache-Control", "public, max-age=3000, stale-while-revalidate=600");
      res.set("Vary", "Accept");
      res.redirect(302, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
