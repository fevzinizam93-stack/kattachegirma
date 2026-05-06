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
  { loc: "/premium", priority: "0.7", changefreq: "weekly" },
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

export function registerSitemapRoute(app: Express) {
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const db = await getDb();

      let productEntries: string[] = [];
      let categoryEntries: string[] = [];

      if (db) {
        // Fetch all approved products
        const allProducts = await db
          .select({ slug: products.slug, updatedAt: products.updatedAt })
          .from(products)
          .where(eq(products.isApproved, true));

        productEntries = allProducts.map((p) => {
          const lastmod = formatDate(new Date(p.updatedAt));
          return `  <url>
    <loc>${BASE_URL}/product/${escapeXml(p.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        });

        // Fetch all categories
        const allCategories = await db
          .select({ slug: categories.slug, createdAt: categories.createdAt })
          .from(categories);

        categoryEntries = allCategories.map((c) => {
          const lastmod = formatDate(new Date(c.createdAt));
          return `  <url>
    <loc>${BASE_URL}/category/${escapeXml(c.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        });
      }

      const staticEntries = STATIC_PAGES.map((page) => {
        const today = formatDate(new Date());
        return `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
      });

      const allEntries = [...staticEntries, ...categoryEntries, ...productEntries];

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
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
