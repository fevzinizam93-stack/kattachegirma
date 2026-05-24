import type { Express } from "express";
import { getDb } from "./db";
import { products, categories } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const BASE_URL = "https://kattachegirma.uz";

// Google Product Category IDs for home appliances
// https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt
const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  "Пылесосы": "604",           // Electronics > Home Appliances > Vacuum Cleaners
  "Стиральные машины": "613",  // Electronics > Home Appliances > Washing Machines
  "Холодильники": "609",       // Electronics > Home Appliances > Refrigerators
  "Морозилки": "609",
  "Морозилка": "609",
  "Кондиционеры": "608",       // Electronics > Home Appliances > Air Conditioners
  "Кондиционер": "608",
  "Телевизоры": "403",         // Electronics > Video > Televisions
  "Телевизор": "403",
  "Микроволновки": "611",      // Electronics > Home Appliances > Microwave Ovens
  "Микроволновая печь": "611",
  "Микроволновка": "611",
  "Духовки": "610",            // Electronics > Home Appliances > Ovens
  "Духовка": "610",
  "Газовые плиты": "610",
  "Газовая плита": "610",
  "Варочные поверхности": "610",
  "Варочная поверхность": "610",
  "Посудомоечные машины": "606", // Electronics > Home Appliances > Dishwashers
  "Посудомоечная машина": "606",
  "Вытяжки": "607",
  "Вытяжка": "607",
  "Кулеры": "612",
  "Куллер": "612",
  "Водонагреватели": "612",
  "Водонагреватель": "612",
  "Мелкая бытовая": "604",
  "Очиститель воздуха": "608",
  "Одежда": "1604",            // Apparel & Accessories
  "Стиральные машины ": "613",
};

function getGoogleCategory(categoryName: string): string {
  return GOOGLE_CATEGORY_MAP[categoryName] || "604"; // default: home appliances
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeAbsoluteUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function registerGoogleMerchantFeedRoute(app: Express) {
  // Google Merchant Center XML feed
  app.get("/feed/google.xml", async (req, res) => {
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
        .limit(5000);

      const allCategories = await db
        .select({ id: categories.id, name: categories.name, slug: categories.slug })
        .from(categories);

      const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

      const today = new Date();
      const priceValidUntil = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())
        .toISOString()
        .split("T")[0];

      const items = allProducts.map((p) => {
        const price = parseFloat(p.price as string) || 0;
        const originalPrice = p.originalPrice ? parseFloat(p.originalPrice as string) : null;
        const stockQty = p.stockCount ?? p.stock ?? 0;
        const availability = stockQty > 0 ? "in stock" : "out of stock";

        const imageList = (p.images as string[]) || [];
        const mainImageRaw = imageList[0] || p.imageUrl || "";
        const mainImage = makeAbsoluteUrl(mainImageRaw);

        const additionalImages = imageList
          .slice(1, 10)
          .map((img) => makeAbsoluteUrl(img))
          .filter(Boolean);

        const category = categoryMap.get(p.categoryId);
        const categoryName = category?.name || "Техника";
        const googleCategoryId = getGoogleCategory(categoryName);

        const productUrl = `${BASE_URL}/product/${p.slug}`;
        const description = escapeXml(
          (p.description || p.name || "").substring(0, 5000)
        );

        // Use numeric ID for Google Merchant Center (max 50 chars limit)
        const itemId = String(p.id);

        // Display price (original if discounted, else current)
        const displayPrice = originalPrice && originalPrice > price ? originalPrice : price;
        const salePrice = originalPrice && originalPrice > price ? price : null;

        const additionalImageTags = additionalImages
          .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
          .join("\n");

        const salePriceTag = salePrice
          ? `      <g:sale_price>${Math.round(salePrice)} UZS</g:sale_price>
      <g:sale_price_effective_date>${today.toISOString().split("T")[0]}/${priceValidUntil}</g:sale_price_effective_date>`
          : "";

        return `  <entry>
    <g:id>${escapeXml(itemId)}</g:id>
    <g:title>${escapeXml(p.name)}</g:title>
    <g:description>${description}</g:description>
    <g:link>${escapeXml(productUrl)}</g:link>
    <g:image_link>${escapeXml(mainImage)}</g:image_link>
${additionalImageTags ? additionalImageTags + "\n" : ""}    <g:availability>${availability}</g:availability>
    <g:price>${Math.round(displayPrice)} UZS</g:price>
${salePriceTag ? salePriceTag + "\n" : ""}    <g:brand>${escapeXml(p.brand || "Katta Chegirma")}</g:brand>
    <g:condition>new</g:condition>
    <g:google_product_category>${googleCategoryId}</g:google_product_category>
    <g:product_type>${escapeXml(categoryName)}</g:product_type>
    <g:identifier_exists>no</g:identifier_exists>
    <g:shipping>
      <g:country>UZ</g:country>
      <g:service>Доставка по Ташкенту</g:service>
      <g:price>0 UZS</g:price>
    </g:shipping>
    <g:shipping_weight>5 kg</g:shipping_weight>
  </entry>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:g="http://base.google.com/ns/1.0">
  <title>Katta Chegirma — Магазин бытовой техники</title>
  <link rel="self" href="${BASE_URL}/feed/google.xml"/>
  <updated>${new Date().toISOString()}</updated>
  <id>${BASE_URL}/feed/google.xml</id>
${items.join("\n")}
</feed>`;

      res.setHeader("Content-Type", "application/atom+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1 hour
      res.status(200).send(xml);
    } catch (err) {
      console.error("[GoogleMerchantFeed] Error generating feed:", err);
      res.status(500).send("Error generating Google Merchant Center feed");
    }
  });
}
