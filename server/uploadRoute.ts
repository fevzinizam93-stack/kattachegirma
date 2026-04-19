import { Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";

const router = Router();

// Use memory storage - files go to buffer, then S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

router.post("/api/upload/image", upload.single("image"), async (req, res) => {
  try {
    // Authenticate admin
    const cookies = req.headers.cookie ?? "";
    const cookieMap = new Map(
      cookies.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k.trim(), v.join("=")];
      })
    );
    const sessionCookie = cookieMap.get(COOKIE_NAME);
    const session = await sdk.verifySession(sessionCookie);
    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const ext = req.file.originalname.split(".").pop() ?? "jpg";
    const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);

    res.json({ url });
  } catch (err: any) {
    console.error("[Upload] Error:", err);
    res.status(500).json({ error: err.message ?? "Upload failed" });
  }
});

export function registerUploadRoute(app: import("express").Express) {
  app.use(router);
}
