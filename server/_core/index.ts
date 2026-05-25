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

  // Redirect www to non-www for canonical SEO (301 permanent)
  // Canonical domain is kattachegirma.uz (without www)
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("www.")) {
      return res.redirect(301, `https://kattachegirma.uz${req.originalUrl}`);
    }
    next();
  });

  // 301 redirect: uppercase or mixed-case category/catalog slugs → lowercase
  // Prevents duplicate content and 404s for old Google-indexed URLs like /catalog/MOROZILKA
  app.use((req, res, next) => {
    const path = req.path;
    // Check if path contains /catalog/ or /category/ or /kategoriya/ segments with uppercase
    const categoryPrefixes = ["/catalog/", "/category/", "/kategoriya/"];
    const hasUppercase = /[A-Z]/.test(path);
    if (hasUppercase && categoryPrefixes.some(prefix => path.startsWith(prefix))) {
      const lowercasePath = path.toLowerCase();
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      return res.redirect(301, lowercasePath + query);
    }
    next();
  });

  // Trust reverse proxy (Cloud Run / Nginx) — needed for rate limiting and real IP detection
  app.set("trust proxy", 1);

  // Security headers (helmet) — protects against XSS, clickjacking, etc.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Rate limiting — protect against spam and brute-force attacks
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
  const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
  app.use("/api/trpc", apiLimiter);
  app.use("/api/upload", uploadLimiter);
  app.use("/api/oauth", authLimiter);

  // Enable gzip compression for all responses (reduces transfer size ~70%)
  app.use(compression({ level: 6, threshold: 1024 }));

  // Configure body parser — 1mb is sufficient for JSON API requests
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));
  registerStorageProxy(app);
  registerImageProxy(app);
  registerOAuthRoutes(app);
  registerUploadRoute(app);
  registerSitemapRoute(app);
  registerFacebookFeedRoute(app);
  registerGoogleMerchantFeedRoute(app);
  registerTelegramWebhook(app);
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
}

startServer().catch(console.error);
