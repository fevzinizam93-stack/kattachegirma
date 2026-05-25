/**
 * SEO Prerender Module
 * 
 * Detects search engine bots and serves pre-rendered HTML with:
 * - Full product/category content (name, price, description, specs)
 * - Schema.org JSON-LD (Product, BreadcrumbList, Organization)
 * - Dynamic meta tags (title, description, canonical, OG)
 * - hreflang alternates
 * 
 * Regular users continue to get the SPA as before.
 */
import { Express, Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { products, categories, reviews } from "../drizzle/schema";
import { eq, and, desc as descOrder } from "drizzle-orm";

const BASE_URL = "https://kattachegirma.uz";
const SITE_NAME = "Katta Chegirma";
const LOGO_URL = `${BASE_URL}/logo-512.png?v=4`;

// In-memory cache for prerendered pages (TTL: 30 minutes) - build v2
const prerenderCache = new Map<string, { html: string; expires: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCached(key: string): string | null {
  const entry = prerenderCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    prerenderCache.delete(key);
    return null;
  }
  return entry.html;
}

function setCache(key: string, html: string): void {
  // Limit cache size to 500 entries
  if (prerenderCache.size >= 500) {
    const firstKey = prerenderCache.keys().next().value;
    if (firstKey) prerenderCache.delete(firstKey);
  }
  prerenderCache.set(key, { html, expires: Date.now() + CACHE_TTL_MS });
}

// Bot User-Agent patterns
const BOT_PATTERNS = [
  /googlebot/i,
  /google-inspectiontool/i,
  /google.*inspection/i,    // Google Inspection Tool variants
  /bingbot/i,
  /slurp/i,           // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /yandex\.com\/bots/i,
  /facebot/i,         // Facebook
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /sogou/i,
  /ia_archiver/i,
  /archive\.org_bot/i,
  /chrome-lighthouse/i,  // Lighthouse
  /headlesschrome/i,     // Headless Chrome crawlers
];

// Prerender only for bots — regular users get the React SPA directly (faster)
function shouldPrerender(userAgent: string, _path: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return Math.round(num).toLocaleString("ru-RU").replace(/\s/g, " ");
}

function buildHtmlPage(options: {
  title: string;
  description: string;
  keywords?: string;
  canonical: string;
  ogImage?: string;
  hreflangRu?: string;
  hreflangUz?: string;
  jsonLd: object[];
  bodyContent: string;
}): string {
  const { title, description, keywords, canonical, ogImage, hreflangRu, hreflangUz, jsonLd, bodyContent } = options;
  const ogImg = ogImage || LOGO_URL;
  const hrefRu = hreflangRu || canonical;
  const hrefUz = hreflangUz || canonical;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : ''}
  <link rel="canonical" href="${canonical}" />
  <link rel="alternate" hreflang="ru" href="${hrefRu}" />
  <link rel="alternate" hreflang="uz" href="${hrefUz}" />
  <link rel="alternate" hreflang="x-default" href="${hrefRu}" />
  <meta property="og:type" content="product" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImg}" />
  <meta property="og:locale" content="ru_RU" />
  <meta property="og:locale:alternate" content="uz_UZ" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImg}" />
  <meta name="robots" content="index, follow" />
  ${jsonLd.map(ld => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`).join("\n  ")}
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

/** Prerender product page for bots */
async function prerenderProduct(slug: string, isUz: boolean): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const field = isUz ? (products as any).slugUz : products.slug;
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(field, slug), eq(products.isApproved, true), eq(products.isActive, true)))
    .limit(1);

  if (!product) return null;

  // Get category
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .limit(1);

  // Get approved reviews for AggregateRating
  const approvedReviews = await db.select().from(reviews)
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, "approved")))
    .orderBy(descOrder(reviews.createdAt))
    .limit(10);
  const reviewCount = approvedReviews.length;
  const avgRating = reviewCount > 0
    ? Math.round((approvedReviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  const name = product.name;
  const nameUz = (product as any).nameUz || name;
  const displayName = isUz ? nameUz : name;
  const price = formatPrice(product.price);
  const originalPrice = product.originalPrice ? formatPrice(product.originalPrice) : null;
  const brand = product.brand || "";
  const desc = (isUz ? (product as any).descriptionUz : product.description) || "";
  const catName = category?.name || "";
  const catSlug = category?.slug || "";
  const catSlugUz = (category as any)?.slugUz || "";
  // Always use absolute URL — Google requires absolute URLs in og:image and Schema.org
  const rawImageUrl = product.imageUrl || LOGO_URL;
  const imageUrl = rawImageUrl.startsWith("http") ? rawImageUrl : `${BASE_URL}${rawImageUrl}`;
  const discount = product.discount || 0;

  // Extract model number from product name (e.g. "TN-22TC", "FRCTBC-1170", "RS210", "NF326BF")
  const modelMatch = name.match(/[A-Z0-9][A-Z0-9\-]{2,}[A-Z0-9]/g);
  const modelNumbers = modelMatch ? Array.from(new Set(modelMatch)).join(" ") : "";

  // Build title: avoid duplicating brand if it's already in product name
  const nameHasBrand = brand && name.toLowerCase().includes(brand.toLowerCase());
  const titleBrand = (brand && !nameHasBrand) ? ` ${brand}` : "";
  const title = `${displayName}${titleBrand} — купить в Ташкенте${discount ? ` со скидкой ${discount}%` : ""} | ${SITE_NAME} (kattachegirma)`;

  const description = `${displayName}${brand && !nameHasBrand ? ` ${brand}` : ""}. Цена: ${price} сум${originalPrice ? ` (было ${originalPrice} сум)` : ""}. ${catName}. Купить в Ташкенте с доставкой по Узбекистану.${desc ? " " + desc.slice(0, 100) : ""}`;

  // Keywords: exact model + product name + brand + category — helps rank for model number searches
  const keywords = [
    name,
    modelNumbers ? `${modelNumbers} купить` : "",
    modelNumbers ? `${modelNumbers} цена` : "",
    modelNumbers ? `${modelNumbers} Ташкент` : "",
    modelNumbers ? `${modelNumbers} Узбекистан` : "",
    brand ? `${brand} ${catName}` : "",
    `${catName} купить Ташкент`,
    `${catName} купить Узбекистан`,
    `katta chegirma`,
    `arzon ${catName.toLowerCase()}`,
  ].filter(Boolean).join(", ");

  const ruSlug = product.slug;
  const uzSlug = (product as any).slugUz;
  const canonical = `${BASE_URL}/product/${ruSlug}`;
  const hreflangRu = `${BASE_URL}/product/${ruSlug}`;
  const hreflangUz = uzSlug ? `${BASE_URL}/mahsulot/${uzSlug}` : hreflangRu;

  // Schema.org Product — all required fields for Google rich results
  const priceNum = Math.round(parseFloat(product.price as string));
  const productSchema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": desc || `${name} — купить в Ташкенте со скидкой`,
    "image": [
      {
        "@type": "ImageObject",
        "url": imageUrl,
        "width": 800,
        "height": 800
      }
    ],
    "brand": brand ? { "@type": "Brand", "name": brand } : undefined,
    "sku": `KC-${product.id}`,
    "mpn": modelNumbers || `KC-${product.id}`,
    "itemCondition": "https://schema.org/NewCondition",
    "offers": {
      "@type": "Offer",
      "url": canonical,
      "priceCurrency": "UZS",
      "price": priceNum,
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      "availability": (product.stock === null || (product.stock as number) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "UZ",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 14
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "UZS" },
        "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "UZ" },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
          "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" }
        }
      },
      "seller": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": BASE_URL
      }
    }
  };
  if (!productSchema.brand) delete productSchema.brand;

  // AggregateRating + individual Reviews
  if (reviewCount > 0) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "reviewCount": reviewCount,
      "bestRating": 5,
      "worstRating": 1
    };
    productSchema.review = approvedReviews.slice(0, 5).map(r => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": r.authorName },
      "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5 },
      "reviewBody": r.comment,
      "datePublished": r.createdAt ? new Date(r.createdAt).toISOString().split("T")[0] : undefined
    }));
  }

  // BreadcrumbList
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": BASE_URL },
      ...(catName ? [{ "@type": "ListItem", "position": 2, "name": catName, "item": `${BASE_URL}/category/${catSlug}` }] : []),
      { "@type": "ListItem", "position": catName ? 3 : 2, "name": displayName, "item": canonical }
    ]
  };

  // Specs HTML
  const specs = product.specs as Record<string, string> | null;
  let specsHtml = "";
  if (specs && Object.keys(specs).length > 0) {
    specsHtml = `<section><h2>Характеристики</h2><table>${Object.entries(specs).map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}</table></section>`;
  }

  const bodyContent = `
  <header>
    <nav><a href="${BASE_URL}">Главная</a> › ${catName ? `<a href="${BASE_URL}/category/${catSlug}">${escapeHtml(catName)}</a> › ` : ""}${escapeHtml(displayName)}</nav>
  </header>
  <main>
    <article>
      <h1>${escapeHtml(displayName)}${brand ? ` <span>${escapeHtml(brand)}</span>` : ""}</h1>
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(displayName)}" width="800" height="800" />
      <div class="price">
        <p><strong>${price} сум</strong></p>
        ${originalPrice ? `<p><del>${originalPrice} сум</del></p>` : ""}
        ${discount ? `<p>Скидка: ${discount}%</p>` : ""}
      </div>
      ${desc ? `<section><h2>Описание</h2><p>${escapeHtml(desc)}</p></section>` : ""}
      ${specsHtml}
      ${reviewCount > 0 ? `<section><h2>Рейтинг и отзывы</h2><p>Средний рейтинг: ${avgRating} из 5 (${reviewCount} отзывов)</p>${approvedReviews.slice(0, 5).map(r => `<div><strong>${escapeHtml(r.authorName)}</strong> — ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} <p>${escapeHtml(r.comment)}</p></div>`).join('')}</section>` : ''}
      <p>Бренд: ${escapeHtml(brand || "—")}</p>
      <p>Категория: <a href="${BASE_URL}/category/${catSlug}">${escapeHtml(catName)}</a></p>
      <p>Доставка по Ташкенту и всему Узбекистану</p>
    </article>
  </main>
  <footer>
    <p>© ${new Date().getFullYear()} ${SITE_NAME} — Купить бытовую технику со скидкой в Ташкенте</p>
    <nav>
      <a href="${BASE_URL}/catalog">Каталог</a>
      <a href="${BASE_URL}/sales">Акции</a>
      <a href="${BASE_URL}/premium">Premium</a>
      <a href="${BASE_URL}/videos">Видеообзоры</a>
      <a href="${BASE_URL}/about">О нас</a>
    </nav>
  </footer>`;

  return buildHtmlPage({
    title,
    description,
    keywords,
    canonical,
    ogImage: imageUrl,
    hreflangRu,
    hreflangUz,
    jsonLd: [productSchema, breadcrumb],
    bodyContent,
  });
}

/** Prerender category page for bots */
async function prerenderCategory(slug: string, isUz: boolean): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const field = isUz ? (categories as any).slugUz : categories.slug;
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(field, slug))
    .limit(1);

  if (!category) return null;

  // Get products in this category (first 50 for SEO)
  const categoryProducts = await db
    .select({
      name: products.name,
      slug: products.slug,
      slugUz: (products as any).slugUz,
      price: products.price,
      brand: products.brand,
      imageUrl: products.imageUrl,
      discount: products.discount,
    })
    .from(products)
    .where(and(eq(products.categoryId, category.id), eq(products.isApproved, true), eq(products.isActive, true)))
    .limit(50);

  const catName = category.name;
  const catSlug = category.slug;
  const catSlugUz = (category as any).slugUz;

  const title = `${catName} — купить в Ташкенте со скидкой | ${SITE_NAME} (kattachegirma)`;
  const description = `${catName}: ${categoryProducts.length}+ товаров со скидкой. ${categoryProducts.slice(0, 5).map(p => p.name).join(", ")}. Доставка по Узбекистану, рассрочка.`;

  const canonical = `${BASE_URL}/category/${catSlug}`;
  const hreflangRu = canonical;
  const hreflangUz = catSlugUz ? `${BASE_URL}/kategoriya/${catSlugUz}` : canonical;

  // BreadcrumbList
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": BASE_URL },
      { "@type": "ListItem", "position": 2, "name": catName, "item": canonical }
    ]
  };

  // ItemList for category
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": catName,
    "numberOfItems": categoryProducts.length,
    "itemListElement": categoryProducts.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${BASE_URL}/product/${p.slug}`,
      "name": p.name,
    }))
  };

  const productsHtml = categoryProducts.map(p => `
    <li>
      <a href="${BASE_URL}/product/${p.slug}">
        <img src="${escapeHtml(p.imageUrl || LOGO_URL)}" alt="${escapeHtml(p.name)}" width="200" height="200" loading="lazy" />
        <h3>${escapeHtml(p.name)}</h3>
        <p>${formatPrice(p.price)} сум${p.discount ? ` (-${p.discount}%)` : ""}</p>
        ${p.brand ? `<p>${escapeHtml(p.brand)}</p>` : ""}
      </a>
    </li>`).join("");

  // Get all categories for internal linking
  const allCats = await db.select({ name: categories.name, slug: categories.slug }).from(categories);
  const otherCatsHtml = allCats
    .filter(c => c.slug !== catSlug)
    .slice(0, 12)
    .map(c => `<li><a href="${BASE_URL}/category/${c.slug}">${escapeHtml(c.name)}</a></li>`)
    .join("");

  const bodyContent = `
  <header>
    <nav><a href="${BASE_URL}">Главная</a> › ${escapeHtml(catName)}</nav>
  </header>
  <main>
    <h1>${escapeHtml(catName)} — купить в Ташкенте</h1>
    <p>В категории "${escapeHtml(catName)}" ${categoryProducts.length} товаров со скидкой. Быстрая доставка по Ташкенту и всему Узбекистану. Рассрочка без переплат.</p>
    <ul>${productsHtml}</ul>
    <section>
      <h2>Другие категории</h2>
      <ul>${otherCatsHtml}</ul>
    </section>
  </main>
  <footer>
    <p>© ${new Date().getFullYear()} ${SITE_NAME} — Купить бытовую технику со скидкой в Ташкенте</p>
    <nav>
      <a href="${BASE_URL}/catalog">Каталог</a>
      <a href="${BASE_URL}/sales">Акции</a>
      <a href="${BASE_URL}/premium">Premium</a>
      <a href="${BASE_URL}/videos">Видеообзоры</a>
      <a href="${BASE_URL}/bestsellers">Хиты продаж</a>
      <a href="${BASE_URL}/about">О нас</a>
    </nav>
  </footer>`;

  return buildHtmlPage({
    title,
    description,
    canonical,
    hreflangRu,
    hreflangUz,
    jsonLd: [breadcrumb, itemList],
    bodyContent,
  });
}

/** Prerender static SEO pages (home, sales, premium, etc.) */
async function prerenderStaticPage(path: string): Promise<string | null> {
  const db = await getDb();

  const pages: Record<string, { title: string; description: string; h1: string; content: string }> = {
    "/": {
      title: "Катта Чегирма — Купить бытовую технику со скидкой в Ташкенте | Katta Chegirma",
      description: "Купить бытовую технику со скидкой в Ташкенте. Телефоны, холодильники, пылесосы, кондиционеры, стиральные машины. Рассрочка, быстрая доставка по Узбекистану.",
      h1: "Katta Chegirma — Магазин бытовой техники со скидкой в Ташкенте",
      content: "Интернет-магазин бытовой техники Katta Chegirma предлагает широкий ассортимент товаров со скидками до 50%. Пылесосы, холодильники, кондиционеры, стиральные машины, телевизоры от ведущих брендов: Bosch, Samsung, LG, Philips, Hisense. Доставка по Ташкенту и всему Узбекистану. Рассрочка без переплат.",
    },
    "/sales": {
      title: "Акции и скидки на бытовую технику — Katta Chegirma",
      description: "Горячие скидки на бытовую технику в Ташкенте. Акции на пылесосы, холодильники, кондиционеры, стиральные машины. Успейте купить по выгодной цене!",
      h1: "Акции и скидки — Горячие предложения",
      content: "Самые выгодные предложения на бытовую технику. Скидки до 50% на пылесосы, холодильники, кондиционеры, стиральные машины, телевизоры. Ограниченное время — успейте купить по лучшей цене в Ташкенте.",
    },
    "/premium": {
      title: "Premium техника — оригинальная бытовая техника Bosch, Samsung, LG | Katta Chegirma",
      description: "100% оригинальная бытовая техника премиум-класса. Bosch, Samsung, LG, Philips. Гарантия, доставка по Ташкенту.",
      h1: "Premium каталог — Оригинальная техника",
      content: "Премиальная бытовая техника от мировых брендов. Только 100% оригинальные товары с официальной гарантией. Bosch, Samsung, LG, Philips, Dyson. Доставка и установка по Ташкенту.",
    },
    "/videos": {
      title: "Видеообзоры бытовой техники — Katta Chegirma",
      description: "Видеообзоры пылесосов, холодильников, кондиционеров, стиральных машин. Смотрите перед покупкой!",
      h1: "Видеообзоры техники",
      content: "Подробные видеообзоры бытовой техники от нашего канала. Пылесосы, холодильники, кондиционеры, стиральные машины — смотрите обзоры перед покупкой.",
    },
    "/sellers": {
      title: "Продавцы бытовой техники в Ташкенте — Katta Chegirma",
      description: "Проверенные продавцы бытовой техники на Katta Chegirma. Станьте продавцом и продавайте технику со скидкой.",
      h1: "Продавцы на Katta Chegirma",
      content: "Проверенные продавцы бытовой техники. Все товары проходят модерацию. Станьте продавцом на нашей площадке.",
    },
    "/bestsellers": {
      title: "Хиты продаж — самая популярная техника | Katta Chegirma",
      description: "Самые популярные товары: пылесосы, холодильники, кондиционеры. Хиты продаж по лучшим ценам в Ташкенте.",
      h1: "Хиты продаж",
      content: "Самые популярные товары нашего магазина. Бестселлеры среди пылесосов, холодильников, кондиционеров и стиральных машин. Проверено покупателями.",
    },
    "/catalog": {
      title: "Каталог бытовой техники — все категории | Katta Chegirma",
      description: "Полный каталог бытовой техники: пылесосы, холодильники, кондиционеры, стиральные машины, телевизоры. Купить со скидкой в Ташкенте.",
      h1: "Каталог бытовой техники",
      content: "Полный каталог бытовой техники со скидками. Пылесосы, холодильники, кондиционеры, стиральные машины, телевизоры, кулеры для воды и многое другое.",
    },
    "/about": {
      title: "О нас — Katta Chegirma | Магазин бытовой техники в Ташкенте",
      description: "Katta Chegirma — интернет-магазин бытовой техники в Ташкенте. Доставка, рассрочка, гарантия.",
      h1: "О нас",
      content: "Katta Chegirma — интернет-магазин бытовой техники в Ташкенте. Мы предлагаем широкий ассортимент техники со скидками, быструю доставку и рассрочку.",
    },
  };

  const page = pages[path];
  if (!page) return null;

  const canonical = `${BASE_URL}${path === "/" ? "" : path}`;

  // Get categories for navigation
  let categoriesHtml = "";
  if (db) {
    const allCats = await db.select({ name: categories.name, slug: categories.slug }).from(categories);
    categoriesHtml = `<nav><h2>Категории</h2><ul>${allCats.map(c => `<li><a href="${BASE_URL}/category/${c.slug}">${escapeHtml(c.name)}</a></li>`).join("")}</ul></nav>`;
  }

  // Get some products for the page (for link juice)
  let productsLinksHtml = "";
  if (db && ["/", "/sales", "/bestsellers", "/premium"].includes(path)) {
    const someProducts = await db
      .select({ name: products.name, slug: products.slug, price: products.price, brand: products.brand })
      .from(products)
      .where(and(eq(products.isApproved, true), eq(products.isActive, true)))
      .limit(30);
    productsLinksHtml = `<section><h2>Товары</h2><ul>${someProducts.map(p => `<li><a href="${BASE_URL}/product/${p.slug}">${escapeHtml(p.name)}${p.brand ? ` (${escapeHtml(p.brand)})` : ""} — ${formatPrice(p.price)} сум</a></li>`).join("")}</ul></section>`;
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": BASE_URL },
      ...(path !== "/" ? [{ "@type": "ListItem", "position": 2, "name": page.h1, "item": canonical }] : []),
    ]
  };

  const bodyContent = `
  <header>
    <nav><a href="${BASE_URL}">Katta Chegirma</a></nav>
  </header>
  <main>
    <h1>${escapeHtml(page.h1)}</h1>
    <p>${escapeHtml(page.content)}</p>
    ${categoriesHtml}
    ${productsLinksHtml}
  </main>
  <footer>
    <p>© ${new Date().getFullYear()} ${SITE_NAME} — Купить бытовую технику со скидкой в Ташкенте</p>
    <nav>
      <a href="${BASE_URL}/catalog">Каталог</a>
      <a href="${BASE_URL}/sales">Акции</a>
      <a href="${BASE_URL}/premium">Premium</a>
      <a href="${BASE_URL}/bestsellers">Хиты продаж</a>
      <a href="${BASE_URL}/videos">Видеообзоры</a>
      <a href="${BASE_URL}/about">О нас</a>
    </nav>
  </footer>`;

  // Organization schema — helps Google show logo in search results
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": SITE_NAME,
    "url": BASE_URL,
    "logo": {
      "@type": "ImageObject",
      "url": LOGO_URL,
      "width": 512,
      "height": 512
    },
    "sameAs": [
      "https://t.me/kattachegirma",
      "https://www.instagram.com/kattachegirma"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["Russian", "Uzbek"],
      "areaServed": "UZ"
    }
  };

  // WebSite schema with SearchAction — enables Google Sitelinks Searchbox
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": SITE_NAME,
    "url": BASE_URL,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/catalog?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const jsonLdSchemas: object[] = [breadcrumb];
  if (path === "/") {
    jsonLdSchemas.push(organizationSchema, websiteSchema);
  }

  return buildHtmlPage({
    title: page.title,
    description: page.description,
    canonical,
    jsonLd: jsonLdSchemas,
    bodyContent,
  });
}

/**
 * Direct prerender function - returns HTML string or null.
 * Called from vite.ts catch-all and serveStatic catch-all.
 */
export async function seoPrerender(req: Request): Promise<string | null> {
  const ua = req.headers["user-agent"] || "";

  // Only intercept for bots
  if (!shouldPrerender(ua, req.path)) return null;

  // Use originalUrl (req.path is '/' in wildcard routes like app.use('*', ...))
  const reqPath = (req.originalUrl || req.url || req.path).split("?")[0];
  if (reqPath.startsWith("/api/") || reqPath.startsWith("/assets/") || reqPath.startsWith("/manus-storage/") ||
      reqPath === "/sitemap.xml" || reqPath === "/robots.txt" || reqPath === "/favicon.ico" ||
      reqPath.endsWith(".js") || reqPath.endsWith(".css") || reqPath.endsWith(".png") || reqPath.endsWith(".jpg") ||
      reqPath.endsWith(".svg") || reqPath.endsWith(".webp") || reqPath.endsWith(".ico") || reqPath.endsWith(".woff2")) {
    return null;
  }

  // Check cache first
  const cached = getCached(reqPath);
  if (cached) return cached;

  try {
    let html: string | null = null;

    // Product pages: /product/:slug or /mahsulot/:slugUz
    const productMatch = reqPath.match(/^\/product\/([^/]+)$/);
    const mahsulotMatch = reqPath.match(/^\/mahsulot\/([^/]+)$/);
    if (productMatch) {
      html = await prerenderProduct(decodeURIComponent(productMatch[1]), false);
    } else if (mahsulotMatch) {
      html = await prerenderProduct(decodeURIComponent(mahsulotMatch[1]), true);
    }

    // Category pages: /category/:slug or /kategoriya/:slugUz
    const categoryMatch = reqPath.match(/^\/category\/([^/]+)$/);
    const kategoriyaMatch = reqPath.match(/^\/kategoriya\/([^/]+)$/);
    if (!html && categoryMatch) {
      html = await prerenderCategory(decodeURIComponent(categoryMatch[1]), false);
    } else if (!html && kategoriyaMatch) {
      html = await prerenderCategory(decodeURIComponent(kategoriyaMatch[1]), true);
    }

    // Static SEO pages
    const staticPaths = ["/", "/sales", "/premium", "/videos", "/sellers", "/bestsellers", "/catalog", "/about"];
    if (!html && staticPaths.includes(reqPath)) {
      html = await prerenderStaticPage(reqPath);
    }

    // Store in cache for next bot request
    if (html) setCache(reqPath, html);
    return html;
  } catch (err) {
    console.error("[SEO Prerender] Error:", err);
    return null;
  }
}

/**
 * Register SEO prerender as Express middleware (legacy, kept for compatibility).
 */
export function registerSeoPrerender(app: Express) {
  // No-op: prerender is now integrated directly into vite.ts catch-all
}
