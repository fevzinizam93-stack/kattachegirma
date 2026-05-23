import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { seoPrerender } from "../seoPrerender";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req: Request, res: Response, next: NextFunction) => {
    // SEO prerender: serve pre-built HTML to search engine bots
    const prerenderResult = await seoPrerender(req);
    if (prerenderResult) {
      res.setHeader("X-Prerender", "true");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(prerenderResult);
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Cache hashed assets for 1 year (safe because filenames contain content hash)
  app.use("/assets", express.static(path.join(distPath, "assets"), {
    maxAge: "1y",
    immutable: true,
    etag: false,
    lastModified: false,
  }));

  // Cache other static files (favicon, robots.txt) for 1 day
  app.use(express.static(distPath, {
    maxAge: "1d",
    etag: true,
  }));

  // SPA fallback: serve index.html for all non-file routes
  // Known 404 paths return proper 404 HTTP status
  const KNOWN_404_PATHS = ["/404"];
  app.use("*", async (req: Request, res: Response) => {
    // SEO prerender for production bots
    const prerenderResult = await seoPrerender(req);
    if (prerenderResult) {
      res.setHeader("X-Prerender", "true");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(prerenderResult);
    }

    const status = KNOWN_404_PATHS.includes(req.path) ? 404 : 200;
    res.status(status).sendFile(path.resolve(distPath, "index.html"));
  });
}
