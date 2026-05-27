import { Express } from "express";
import { getDb } from "./db";
import { products, categories } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://kattachegirma.uz";
const CHUNK_SIZE = 500; // Max URLs per sitemap file

// Static pages (exclude private/transactional pages: /cart, /checkout, /profile, /admin)
const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/catalog", priority: "0.9", changefreq: "daily" },
  { loc: "/bestsellers", priority: "0.8", changefreq: "daily" },
  { loc: "/sales", priority: "0.8", changefreq: "daily" },
  { loc: "/videos", priority: "0.7", changefreq: "weekly" },
  { loc: "/sellers", priority: "0.6", changefreq: "weekly" },
  { loc: "/about", priority: "0.5", changefreq: "monthly" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Make a URL absolute — Google requires absolute URLs in image:loc */
function toAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

/**
 * Build a <url> entry with hreflang alternate links and optional image sitemap tag.
 */
function buildUrl(
  ruLoc: string,
  uzLoc: string | null,
  lastmod: string,
  changefreq: string,
  priority: string,
  imageUrl?: string,
  imageName?: string
): string {
  const ruUrl = `${BASE_URL}${ruLoc}`;
  const uzUrl = uzLoc ? `${BASE_URL}${uzLoc}` : ruUrl;
  const imageTag = imageUrl
    ? `
    <image:image>
      <image:loc>${escapeXml(toAbsoluteUrl(imageUrl))}</image:loc>
      <image:title>${escapeXml(imageName || "")}</image:title>
    </image:image>`
    : "";
  return `  <url>
    <loc>${ruUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageTag}
    <xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}"/>
    <xhtml:link rel="alternate" hreflang="uz" href="${uzUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${ruUrl}"/>
  </url>`;
}

/**
 * Build a separate <url> entry for the UZ URL alias (so it also appears in sitemap).
 */
function buildUzUrl(
  ruLoc: string,
  uzLoc: string,
  lastmod: string,
  changefreq: string,
  priority: string,
  imageUrl?: string,
  imageName?: string
): string {
  const ruUrl = `${BASE_URL}${ruLoc}`;
  const uzUrl = `${BASE_URL}${uzLoc}`;
  const imageTag = imageUrl
    ? `
    <image:image>
      <image:loc>${escapeXml(toAbsoluteUrl(imageUrl))}</image:loc>
      <image:title>${escapeXml(imageName || "")}</image:title>
    </image:image>`
    : "";
  return `  <url>
    <loc>${uzUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageTag}
    <xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}"/>
    <xhtml:link rel="alternate" hreflang="uz" href="${uzUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${ruUrl}"/>
  </url>`;
}

/** Build a full urlset XML string from an array of <url> entries */
function buildUrlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries.join("\n")}
</urlset>`;
}

const SITEMAP_URL = "https://kattachegirma.uz/sitemap.xml";
const SITE_URL = "https://kattachegirma.uz";

// Debounce: avoid spamming ping engines on bulk updates
let pingTimer: ReturnType<typeof setTimeout> | null = null;
// Accumulate product URLs to submit to Google Indexing API
let pendingGoogleUrls: Set<string> = new Set();
let pendingGoogleDeleted: Set<string> = new Set();
// Throttle sitemap submission to Google Search Console: max once per hour
let lastSitemapSubmitTime = 0;
const SITEMAP_SUBMIT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Notify search engines that the sitemap has been updated.
 * - Yandex + Bing: IndexNow (sitemap URL)
 * - Google: Indexing API with specific product/page URLs
 * Debounced to 30 seconds so bulk admin operations only fire one ping.
 *
 * @param productUrl  Absolute URL of the updated/created product page (optional)
 * @param deleted     Pass true when the product is being deleted
 */
export function pingSitemaps(productUrl?: string, deleted = false): void {
  // Accumulate URLs for Google Indexing API
  if (productUrl) {
    if (deleted) {
      pendingGoogleDeleted.add(productUrl);
      pendingGoogleUrls.delete(productUrl);
    } else {
      pendingGoogleUrls.add(productUrl);
      pendingGoogleDeleted.delete(productUrl);
    }
  }

  if (pingTimer) clearTimeout(pingTimer);
  pingTimer = setTimeout(async () => {
    pingTimer = null;
    const INDEX_NOW_KEY = process.env.INDEX_NOW_KEY || "c426dc7430f65451d4a4a45d3111fadb";
    const SITE_HOST = "kattachegirma.uz";

    // ── 1. IndexNow (Yandex + Bing) ──────────────────────────────────────────
    const indexNowEngines = [
      "https://yandex.com/indexnow",
      "https://www.bing.com/indexnow",
    ];
    const body = JSON.stringify({
      host: SITE_HOST,
      key: INDEX_NOW_KEY,
      keyLocation: `https://${SITE_HOST}/${INDEX_NOW_KEY}.txt`,
      urlList: [SITEMAP_URL],
    });
    for (const endpoint of indexNowEngines) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        console.log(`[SitemapPing] IndexNow → ${endpoint} HTTP ${res.status}`);
      } catch (err) {
        console.warn(`[SitemapPing] Failed to ping ${endpoint}:`, err);
      }
    }

    // ── 2. Google Indexing API ────────────────────────────────────────────────
    const urlsToUpdate = Array.from(pendingGoogleUrls);
    const urlsToDelete = Array.from(pendingGoogleDeleted);
    pendingGoogleUrls = new Set();
    pendingGoogleDeleted = new Set();

    if (urlsToUpdate.length > 0 || urlsToDelete.length > 0) {
      try {
        const { submitUrlForIndexing } = await import("./googleIndexing");
        for (const url of urlsToUpdate) {
          const result = await submitUrlForIndexing(url, "URL_UPDATED");
          if (result.success) {
            console.log(`[SitemapPing] Google Indexing → URL_UPDATED ${url} ✓`);
          } else {
            console.warn(`[SitemapPing] Google Indexing → URL_UPDATED ${url} ✗ ${result.error}`);
          }
        }
        for (const url of urlsToDelete) {
          const result = await submitUrlForIndexing(url, "URL_DELETED");
          if (result.success) {
            console.log(`[SitemapPing] Google Indexing → URL_DELETED ${url} ✓`);
          } else {
            console.warn(`[SitemapPing] Google Indexing → URL_DELETED ${url} ✗ ${result.error}`);
          }
        }
      } catch (err) {
        console.warn("[SitemapPing] Google Indexing API error:", err);
      }
    }
    // ── 3. Google Search Console Sitemap Submission ────────────────────────
    const now = Date.now();
    if (now - lastSitemapSubmitTime >= SITEMAP_SUBMIT_INTERVAL_MS) {
      try {
        const { submitSitemapToSearchConsole } = await import("./googleSearchConsole");
        const result = await submitSitemapToSearchConsole(SITE_URL, SITEMAP_URL);
        if (result.success) {
          lastSitemapSubmitTime = now;
          console.log(`[SitemapPing] Google Search Console sitemap submitted ✓`);
        } else {
          console.warn(`[SitemapPing] Google Search Console sitemap submission failed: ${result.error}`);
        }
      } catch (err) {
        console.warn("[SitemapPing] Google Search Console sitemap error:", err);
      }
    } else {
      const minutesLeft = Math.ceil((SITEMAP_SUBMIT_INTERVAL_MS - (now - lastSitemapSubmitTime)) / 60000);
      console.log(`[SitemapPing] Google Search Console sitemap skipped (throttled, next in ~${minutesLeft}m)`);
    }
  }, 30_000); // 30-second debounce
}

export function registerSitemapRoute(app: Express) {
  // ── Main sitemap index (/sitemap.xml) ─────────────────────────────────────
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const db = await getDb();
      const today = formatDate(new Date());

      // Count approved active products to determine how many product chunks we need
      let productChunkCount = 1;
      if (db) {
        const allProducts = await db
          .select({ slug: products.slug, slugUz: (products as any).slugUz })
          .from(products)
          .where(and(eq(products.isApproved, true), eq(products.isActive, true)));
        // Each product can produce up to 2 entries (ru + uz), so we chunk by product count
        productChunkCount = Math.max(1, Math.ceil(allProducts.length / CHUNK_SIZE));
      }

      // Build sitemap index entries
      const sitemapEntries: string[] = [
        `  <sitemap>
    <loc>${BASE_URL}/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`,
      ];

      for (let i = 1; i <= productChunkCount; i++) {
        sitemapEntries.push(`  <sitemap>
    <loc>${BASE_URL}/sitemap-products-${i}.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`);
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</sitemapindex>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(xml);
    } catch (err) {
      console.error("[Sitemap] Error generating sitemap index:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // ── Static + category sitemap (/sitemap-main.xml) ─────────────────────────
  app.get("/sitemap-main.xml", async (req, res) => {
    try {
      const db = await getDb();
      const today = formatDate(new Date());

      const staticEntries = STATIC_PAGES.map((page) =>
        buildUrl(page.loc, null, today, page.changefreq, page.priority)
      );

      let categoryEntries: string[] = [];
      if (db) {
        const allCategories = await db
          .select({ slug: categories.slug, slugUz: (categories as any).slugUz, createdAt: categories.createdAt, name: categories.name })
          .from(categories);

        categoryEntries = allCategories.map((c) => {
          const lastmod = formatDate(new Date(c.createdAt));
          const ruLoc = `/category/${escapeXml(c.slug)}`;
          const uzLoc = c.slugUz ? `/kategoriya/${escapeXml(c.slugUz)}` : null;
          // Only include the canonical /category/ URL; /kategoriya/ is an alias with canonical pointing here
          return buildUrl(ruLoc, uzLoc, lastmod, "weekly", "0.8");
        });
      }

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(buildUrlset([...staticEntries, ...categoryEntries]));
    } catch (err) {
      console.error("[Sitemap] Error generating main sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });

  // ── Product chunk sitemaps (/sitemap-products-N.xml) ──────────────────────
  app.get("/sitemap-products-:chunk.xml", async (req, res) => {
    try {
      const chunk = parseInt(req.params.chunk, 10);
      if (isNaN(chunk) || chunk < 1) {
        res.status(404).send("Not found");
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).send("Database unavailable");
        return;
      }

      const allProducts = await db
        .select({
          slug: products.slug,
          slugUz: (products as any).slugUz,
          updatedAt: products.updatedAt,
          imageUrl: products.imageUrl,
          name: products.name,
        })
        .from(products)
        .where(and(eq(products.isApproved, true), eq(products.isActive, true)));

      // Slice products for this chunk (1-based)
      const start = (chunk - 1) * CHUNK_SIZE;
      const end = start + CHUNK_SIZE;
      const chunkProducts = allProducts.slice(start, end);

      if (chunkProducts.length === 0) {
        res.status(404).send("Not found");
        return;
      }

      const productEntries = chunkProducts.map((p) => {
        const lastmod = formatDate(new Date(p.updatedAt));
        const ruLoc = `/product/${escapeXml(p.slug)}`;
        const uzLoc = p.slugUz ? `/mahsulot/${escapeXml(p.slugUz)}` : null;
        const imgUrl = p.imageUrl || undefined;
        const imgName = p.name || undefined;
        // Only include the canonical /product/ URL; /mahsulot/ is an alias with canonical pointing here
        return buildUrl(ruLoc, uzLoc, lastmod, "weekly", "0.7", imgUrl, imgName);
      });

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).send(buildUrlset(productEntries));
    } catch (err) {
      console.error("[Sitemap] Error generating product sitemap chunk:", err);
      res.status(500).send("Error generating sitemap");
    }
  });
}
