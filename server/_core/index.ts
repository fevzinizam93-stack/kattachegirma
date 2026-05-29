import "dotenv/config";
import compression from "compression";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerImageProxy } from "./imageProxy";
import { appRouter } from "../routers";
import { registerUploadRoute } from "../uploadRoute";
import { registerSitemapRoute } from "../sitemap";
import { registerFacebookFeedRoute } from "../facebookFeed";
import { registerGoogleMerchantFeedRoute } from "../googleMerchantFeed";
import { registerTelegramWebhook } from "../webhookRoute";
import { scheduledReindexHandler } from "../scheduledReindex";
import { autoRegisterTelegramWebhook } from "../telegram";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Debug endpoint to verify which server version is running
  app.get("/__version", (req, res) => {
    res.json({ version: "v2-seoprerender", nodeEnv: process.env.NODE_ENV, ts: new Date().toISOString() });
  });

  // 301 redirect: HTTP → HTTPS (check x-forwarded-proto from Cloud Run proxy)
  app.use((req, res, next) => {
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://kattachegirma.uz${req.originalUrl}`);
    }
    next();
  });

  // Redirect www to non-www for canonical SEO (301 permanent)
  // Canonical domain is kattachegirma.uz (without www)
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      return res.redirect(301, `https://kattachegirma.uz${req.originalUrl}`);
    }
    next();
  });

  // 301 redirect: old /catalog/:slug → /category/:slug (fixes 37 Google 404s)
  // Note: bare /catalog (no slug) is a valid page — only redirect /catalog/SOMETHING
  app.use((req, res, next) => {
    const match = req.path.match(/^\/catalog\/(.+)$/);
    if (match && match[1]) {
      const slug = match[1];
      const query = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
      return res.redirect(301, `/category/${slug}${query}`);
    }
    next();
  });

  // 301 redirect: uppercase or mixed-case category/catalog slugs → lowercase
  // Prevents duplicate content and 404s for old Google-indexed URLs like /catalog/MOROZILKA
  app.use((req, res, next) => {
    const path = req.path;
    // Check if path contains /catalog/ or /category/ or /kategoriya/ segments with uppercase
    const categoryPrefixes = ["/catalog/", "/category/", "/kategoriya/", "/product/", "/mahsulot/"];
    const hasUppercase = /[A-Z]/.test(path);
    if (hasUppercase && categoryPrefixes.some(prefix => path.startsWith(prefix))) {
      const lowercasePath = path.toLowerCase();
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      return res.redirect(301, lowercasePath + query);
    }
    next();
  });

  // 301 redirect: broken product slugs with leading/trailing/double dashes → clean slug
  // Fixes Google-indexed URLs like /product/-franco-cfr252-g, /product/--4--1--series
  app.use((req, res, next) => {
    const match = req.path.match(/^\/product\/(.+)$/);
    if (match && match[1]) {
      const rawSlug = match[1];
      // If slug has leading dashes, trailing dashes, or consecutive dashes — it's broken
      if (/--|^-|-$/.test(rawSlug)) {
        const clean = rawSlug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
        if (clean && clean !== rawSlug) {
          const query = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
          return res.redirect(301, `/product/${clean}${query}`);
        }
      }
    }
    next();
  });

  // Trust reverse proxy (Cloud Run / Nginx) — needed for rate limiting and real IP detection
  app.set("trust proxy", 1);

  // Security headers (helmet) — protects against XSS, clickjacking, etc.
  // referrerPolicy: strict-origin-when-cross-origin is required for YouTube embeds (Error 153)
  app.use(helmet({
    contentSecurityPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // Rate limiting — protect against spam and brute-force attacks
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
  const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  app.use("/api/trpc", apiLimiter);
  app.use("/api/upload", uploadLimiter);
  app.use("/api/oauth", authLimiter);

  // Enable gzip compression for all responses (reduces transfer size ~70%)
  app.use(compression({ level: 6, threshold: 1024 }));

  // Configure body parser — 8mb to support price-sheet image uploads (base64 JPEG)
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "8mb", extended: true }));
  registerStorageProxy(app);
  registerImageProxy(app);
  registerOAuthRoutes(app);
  registerUploadRoute(app);
  registerSitemapRoute(app);
  registerFacebookFeedRoute(app);
  registerGoogleMerchantFeedRoute(app);
  registerTelegramWebhook(app);

  // Scheduled cron endpoints (Manus Heartbeat)
  app.post("/api/scheduled/reindex", scheduledReindexHandler);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // Allow POST for query procedures so httpBatchStreamLink can use POST
      // when URL would exceed limits (prevents HTTP 414 on long batch requests)
      allowMethodOverride: true,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Auto-register Telegram webhook in production so inline buttons work
    if (process.env.NODE_ENV !== "development") {
      const webhookUrl = "https://kattachegirma.uz/api/telegram/webhook";
      autoRegisterTelegramWebhook(webhookUrl).catch(console.error);
    }
  });

  // Автоматически отправлять новые товары в Google раз при каждом запуске сервера (только в production)
  if (process.env.NODE_ENV !== "development") {
    setTimeout(async () => {
      try {
        const { submitUrlsBatch } = await import("../googleIndexing");
        const { getDb } = await import("../db");
        const { products: productsTable } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const db = await getDb();
        if (!db) return;

        const allProducts = await db
          .select({ slug: productsTable.slug })
          .from(productsTable)
          .where(and(eq(productsTable.isActive, true), eq(productsTable.isApproved, true)))
          .limit(200); // лимит Google API: 200 в день

        const urls = allProducts
          .filter((p) => p.slug)
          .map((p) => `https://kattachegirma.uz/product/${p.slug}`);

        if (urls.length === 0) {
          console.log("[AutoIndex] No approved products to index");
          return;
        }

        console.log(`[AutoIndex] Sending ${urls.length} URLs to Google...`);
        await submitUrlsBatch(urls, "URL_UPDATED", 500);
        console.log(`[AutoIndex] Done`);
      } catch (err) {
        console.error("[AutoIndex] Error:", err);
      }
    }, 2 * 60 * 1000); // запустить через 2 минуты после старта сервера

    // Пересчёт хитов каждые 6 часов
    setInterval(async () => {
      try {
        const { recalcAllHitScores } = await import("../db");
        await recalcAllHitScores();
        console.log("[AutoHits] ✅ Hit scores recalculated");
      } catch (e) {
        console.error("[AutoHits] Error:", e);
      }
    }, 6 * 60 * 60 * 1000);
  }
}

startServer().catch(console.error);
