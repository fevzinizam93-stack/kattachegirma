import { Express } from "express";
import { getDb } from "./db";
import { products, categories } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://kattachegirma.uz";

// Static pages (exclude private/transactional pages: /cart, /checkout, /profile, /admin)
const STATIC_PAGES = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/catalog", priority: "0.9", changefreq: "daily" },
  { loc: "/bestsellers", priority: "0.8", changefreq: "daily" },
  { loc: "/sales", priority: "0.8", changefreq: "daily" },
  { loc: "/premium", priority: "0.7", changefreq: "weekly" },
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

const SITEMAP_URL = "https://kattachegirma.uz/sitemap.xml";

// Debounce: avoid spamming ping engines on bulk updates
let pingTimer: ReturnType<typeof setTimeout> | null = null;
// Accumulate product URLs to submit to Google Indexing API
let pendingGoogleUrls: Set<string> = new Set();
let pendingGoogleDeleted: Set<string> = new Set();

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
    const INDEX_NOW_KEY = "c426dc7430f65451d4a4a45d3111fadb";
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
  }, 30_000); // 30-second debounce
}

export function registerSitemapRoute(app: Express) {
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const db = await getDb();

      let productEntries: string[] = [];
      let categoryEntries: string[] = [];

      if (db) {
        // Fetch all approved products (including slugUz, imageUrl, name for image sitemap)
        const allProducts = await db
          .select({
            slug: products.slug,
            slugUz: (products as any).slugUz,
            updatedAt: products.updatedAt,
            imageUrl: products.imageUrl,
            name: products.name,
          })
          .from(products)
          .where(eq(products.isApproved, true));

        productEntries = allProducts.flatMap((p) => {
          const lastmod = formatDate(new Date(p.updatedAt));
          const ruLoc = `/product/${escapeXml(p.slug)}`;
          const uzLoc = p.slugUz ? `/mahsulot/${escapeXml(p.slugUz)}` : null;
          const imgUrl = p.imageUrl || undefined;
          const imgName = p.name || undefined;
          const entries = [buildUrl(ruLoc, uzLoc, lastmod, "weekly", "0.7", imgUrl, imgName)];
          // Also add a separate entry for the UZ URL so Google indexes it
          if (uzLoc) {
            entries.push(buildUzUrl(ruLoc, uzLoc, lastmod, "weekly", "0.7", imgUrl, imgName));
          }
          return entries;
        });

        // Fetch all categories (including slugUz)
        const allCategories = await db
          .select({ slug: categories.slug, slugUz: (categories as any).slugUz, createdAt: categories.createdAt, name: categories.name })
          .from(categories);

        categoryEntries = allCategories.flatMap((c) => {
          const lastmod = formatDate(new Date(c.createdAt));
          const ruLoc = `/category/${escapeXml(c.slug)}`;
          const uzLoc = c.slugUz ? `/kategoriya/${escapeXml(c.slugUz)}` : null;
          const entries = [buildUrl(ruLoc, uzLoc, lastmod, "weekly", "0.8")];
          // Also add a separate entry for the UZ URL
          if (uzLoc) {
            entries.push(buildUzUrl(ruLoc, uzLoc, lastmod, "weekly", "0.8"));
          }
          return entries;
        });
      }

      const today = formatDate(new Date());
      const staticEntries = STATIC_PAGES.map((page) =>
        buildUrl(page.loc, null, today, page.changefreq, page.priority)
      );

      const allEntries = [...staticEntries, ...categoryEntries, ...productEntries];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allEntries.join("\n")}
</urlset>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1 hour
      res.status(200).send(xml);
    } catch (err) {
      console.error("[Sitemap] Error generating sitemap:", err);
      res.status(500).send("Error generating sitemap");
    }
  });
}
