import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";

const router = Router();

// Use memory storage - files go to buffer, then S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB per file, max 10 files
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

async function getSession(req: import("express").Request) {
  const cookies = req.headers.cookie ?? "";
  const cookieMap = new Map(
    cookies.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), v.join("=")];
    })
  );
  return sdk.verifySession(cookieMap.get(COOKIE_NAME));
}

// Single image upload (backward compat)
router.post("/api/upload/image", upload.single("image"), async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

    if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }

    const ext = req.file.originalname.split(".").pop() ?? "jpg";
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

// Multiple images upload
router.post("/api/upload/images", upload.array("images", 10), async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) { res.status(401).json({ error: "Unauthorized" }); return; }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) { res.status(400).json({ error: "No files provided" }); return; }

    const urls: string[] = [];
    for (const file of files) {
      const ext = file.originalname.split(".").pop() ?? "jpg";
      const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, file.buffer, file.mimetype);
      urls.push(url);
    }
    res.json({ urls });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

export function registerUploadRoute(app: import("express").Express) {
  app.use(router);
}
