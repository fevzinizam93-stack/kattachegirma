/**
 * Image Proxy with WebP conversion and resizing via Sharp.
 *
 * Route: GET /api/img?url=<storage-url>&w=<width>&q=<quality>
 *
 * - url: the /manus-storage/<key> path (or full https:// URL)
 * - w:   target width in pixels (default 800, max 2048)
 * - q:   WebP quality 1-100 (default 80)
 *
 * The proxy:
 *  1. Resolves the storage key → presigned S3 URL (using same cache as storageProxy)
 *  2. Downloads the original image
 *  3. Resizes to requested width (preserving aspect ratio) via Sharp
 *  4. Converts to WebP
 *  5. Returns with aggressive browser cache headers (1 year for immutable assets)
 *
 * In-memory LRU-style cache keeps up to MAX_CACHE_ENTRIES processed WebP buffers
 * so repeated requests for the same (key, width) pair don't re-process.
 */

import type { Express } from "express";
import sharp from "sharp";
import { ENV } from "./env";

// ── Presigned URL cache (shared logic with storageProxy) ──────────────────────
const presignCache = new Map<string, { url: string; expiresAt: number }>();
const PRESIGN_TTL = 50 * 60 * 1000; // 50 min

async function getPresignedUrl(key: string): Promise<string> {
  const cached = presignCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const forgeUrl = new URL(
    "v1/storage/presign/get",
    ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
  );
  forgeUrl.searchParams.set("path", key);
  const resp = await fetch(forgeUrl, {
    headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
  });
  if (!resp.ok) throw new Error(`Presign failed: ${resp.status}`);
  const { url } = (await resp.json()) as { url: string };
  presignCache.set(key, { url, expiresAt: Date.now() + PRESIGN_TTL });
  return url;
}

// ── Processed image cache ─────────────────────────────────────────────────────
interface CacheEntry {
  buffer: Buffer;
  createdAt: number;
}
const MAX_CACHE_ENTRIES = 500;
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const imageCache = new Map<string, CacheEntry>();

function getCacheKey(storageKey: string, width: number, quality: number) {
  return `${storageKey}:${width}:${quality}`;
}

function pruneCache() {
  if (imageCache.size < MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  // Remove expired entries first
  for (const [k, v] of Array.from(imageCache)) {
    if (now - v.createdAt > CACHE_MAX_AGE_MS) imageCache.delete(k);
  }
  // If still too large, remove oldest 20%
  if (imageCache.size >= MAX_CACHE_ENTRIES) {
    const entries = Array.from(imageCache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toDelete; i++) imageCache.delete(entries[i][0]);
  }
}

// ── Route registration ────────────────────────────────────────────────────────
export function registerImageProxy(app: Express) {
  app.get("/api/img", async (req: any, res) => {
    try {
      const rawUrl = (req.query.url as string) ?? "";
      const width = Math.min(parseInt((req.query.w as string) ?? "800", 10) || 800, 2048);
      const quality = Math.min(Math.max(parseInt((req.query.q as string) ?? "80", 10) || 80, 1), 100);

      if (!rawUrl) {
        res.status(400).send("Missing url param");
        return;
      }

      // Extract storage key from /manus-storage/<key> or full URL
      let storageKey: string;
      if (rawUrl.startsWith("/manus-storage/")) {
        storageKey = rawUrl.slice("/manus-storage/".length);
      } else if (rawUrl.includes("/manus-storage/")) {
        storageKey = rawUrl.split("/manus-storage/")[1];
      } else {
        // External URL — proxy directly without presigning
        storageKey = "";
      }

      const cacheKey = getCacheKey(storageKey || rawUrl, width, quality);

      // Check in-memory cache
      const cached = imageCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < CACHE_MAX_AGE_MS) {
        res.set("Content-Type", "image/webp");
        res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.set("X-Image-Cache", "HIT");
        res.send(cached.buffer);
        return;
      }

      // Resolve the actual image URL
      let imageUrl: string;
      if (storageKey) {
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
          res.status(500).send("Storage not configured");
          return;
        }
        imageUrl = await getPresignedUrl(storageKey);
      } else {
        imageUrl = rawUrl;
      }

      // Download original image
      const imgResp = await fetch(imageUrl, {
        headers: { "User-Agent": "KattaChegirma-ImageProxy/1.0" },
      });
      if (!imgResp.ok) {
        res.status(502).send("Failed to fetch source image");
        return;
      }
      const arrayBuffer = await imgResp.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);

      // Process with Sharp: resize + convert to WebP
      const webpBuffer = await sharp(inputBuffer)
        .resize(width, undefined, {
          withoutEnlargement: true,   // never upscale
          fit: "inside",
        })
        .webp({ quality })
        .toBuffer();

      // Store in cache
      pruneCache();
      imageCache.set(cacheKey, { buffer: webpBuffer, createdAt: Date.now() });

      // Respond
      res.set("Content-Type", "image/webp");
      res.set("Cache-Control", "public, max-age=31536000, immutable");
      res.set("X-Image-Cache", "MISS");
      res.send(webpBuffer);
    } catch (err: any) {
      console.error("[ImageProxy] error:", err?.message ?? err);
      res.status(500).send("Image processing error");
    }
  });
}
