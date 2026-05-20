import { Express } from "express";
import { getDb } from "./db";
import { products, categories } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://kattachegirma.uz";

// Ensure image URL is absolute (Facebook requires full https:// URLs)
function absoluteImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // relative path like /manus-storage/... → prepend BASE_URL
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Map category names to Facebook product_type
function getFacebookCategory(categoryName: string): string {
  const map: Record<string, string> = {
    "Холодильники": "Electronics > Appliances > Refrigerators",
    "Телевизоры": "Electronics > Video > Televisions",
    "Стиральные машины": "Electronics > Appliances > Washing Machines",
    "Пылесосы": "Electronics > Appliances > Vacuums",
    "Кулеры": "Electronics > Appliances > Water Dispensers",
    "Кондиционеры": "Electronics > Appliances > Air Conditioners",
    "Микроволновки": "Electronics > Appliances > Microwaves",
    "Плиты": "Electronics > Appliances > Ranges & Ovens",
    "Посудомойки": "Electronics > Appliances > Dishwashers",
  };
  return map[categoryName] || "Electronics > Appliances";
}

export function registerFacebookFeedRoute(app: Express) {
  // Facebook/Instagram Product Catalog Feed (XML RSS format)
  app.get("/api/feed/facebook.xml", async (req, res) => {
    try {
      const db = await getDb();

      if (!db) {
        res.status(503).send("Database unavailable");
        return;
      }

      // Fetch all active, approved products with category info
      const allProducts = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          brand: products.brand,
          price: products.price,
          originalPrice: products.originalPrice,
          discount: products.discount,
          imageUrl: products.imageUrl,
          images: products.images,
          stock: products.stock,
          stockCount: products.stockCount,
          isActive: products.isActive,
          isApproved: products.isApproved,
          categoryId: products.categoryId,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .where(
          and(
            eq(products.isActive, true),
            eq(products.isApproved, true)
          )
        )
        .limit(2000);

      // Fetch categories for mapping
      const allCategories = await db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories);

      const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

      const items = allProducts.map((p) => {
        const category = categoryMap.get(p.categoryId);
        const categoryName = category?.name || "Техника";
        const categorySlug = category?.slug || "";
        const productUrl = `${BASE_URL}/product/${escapeXml(p.slug)}`;
        const price = parseFloat(p.price as string) || 0;
        const originalPrice = p.originalPrice ? parseFloat(p.originalPrice as string) : null;

        // Use first image or imageUrl
        const imageList = (p.images as string[]) || [];
        const mainImage = absoluteImageUrl(imageList[0] || p.imageUrl || "");
        const additionalImages = imageList.slice(1, 10).map(absoluteImageUrl); // up to 9 additional

        // Availability
        const stockQty = p.stockCount ?? p.stock ?? 0;
        const availability = stockQty > 0 ? "in stock" : "out of stock";

        // Build description
        const description = escapeXml(
          p.description || `${p.brand || ""} ${p.name} — купить в Katta Chegirma`.trim()
        );

        // Additional image tags
        const additionalImageTags = additionalImages
          .filter(Boolean)
          .map((img) => `        <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
          .join("\n");

        // Sale price
        const salePriceTag = originalPrice && originalPrice > price
          ? `        <g:sale_price>${Math.round(price)} UZS</g:sale_price>`
          : "";

        return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${description}</g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additionalImageTags ? additionalImageTags + "\n" : ""}      <g:availability>${availability}</g:availability>
      <g:price>${Math.round(originalPrice && originalPrice > price ? originalPrice : price)} UZS</g:price>
${salePriceTag ? salePriceTag + "\n" : ""}      <g:brand>${escapeXml(p.brand || "Katta Chegirma")}</g:brand>
      <g:condition>new</g:condition>
      <g:product_type>${escapeXml(getFacebookCategory(categoryName))}</g:product_type>
      <g:google_product_category>222</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
      <g:shipping>
        <g:country>UZ</g:country>
        <g:service>Доставка по Ташкенту</g:service>
        <g:price>0 UZS</g:price>
      </g:shipping>
    </item>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Katta Chegirma — Магазин бытовой техники</title>
    <link>${BASE_URL}</link>
    <description>Бытовая техника со скидками до 60% в Узбекистане</description>
${items.join("\n")}
  </channel>
</rss>`;

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1 hour
      res.setHeader("Access-Control-Allow-Origin", "*"); // allow Facebook crawlers
      res.status(200).send(xml);
    } catch (err) {
      console.error("[FacebookFeed] Error generating feed:", err);
      res.status(500).send("Error generating product feed");
    }
  });

  // Also serve as CSV for alternative import
  app.get("/api/feed/facebook.csv", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).send("Database unavailable");
        return;
      }

      const allProducts = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          brand: products.brand,
          price: products.price,
          originalPrice: products.originalPrice,
          imageUrl: products.imageUrl,
          images: products.images,
          stockCount: products.stockCount,
          stock: products.stock,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(and(eq(products.isActive, true), eq(products.isApproved, true)))
        .limit(2000);

      const allCategories = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories);
      const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

      const csvEscape = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;

      const header = "id,title,description,availability,condition,price,link,image_link,brand,product_type,sale_price";

      const rows = allProducts.map((p) => {
        const price = parseFloat(p.price as string) || 0;
        const originalPrice = p.originalPrice ? parseFloat(p.originalPrice as string) : null;
        const stockQty = p.stockCount ?? p.stock ?? 0;
        const availability = stockQty > 0 ? "in stock" : "out of stock";
        const imageList = (p.images as string[]) || [];
        const mainImage = imageList[0] || p.imageUrl || "";
        const categoryName = categoryMap.get(p.categoryId) || "Техника";
        const displayPrice = originalPrice && originalPrice > price ? originalPrice : price;
        const salePrice = originalPrice && originalPrice > price ? `${Math.round(price)} UZS` : "";

        return [
          p.id,
          csvEscape(p.name),
          csvEscape(p.description || p.name),
          availability,
          "new",
          `${Math.round(displayPrice)} UZS`,
          `${BASE_URL}/product/${p.slug}`,
          csvEscape(mainImage),
          csvEscape(p.brand || "Katta Chegirma"),
          csvEscape(getFacebookCategory(categoryName)),
          csvEscape(salePrice),
        ].join(",");
      });

      const csv = [header, ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="facebook_feed.csv"');
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(200).send(csv);
    } catch (err) {
      console.error("[FacebookFeed CSV] Error:", err);
      res.status(500).send("Error generating CSV feed");
    }
  });
}
