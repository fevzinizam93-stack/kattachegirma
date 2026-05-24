/**
 * Image optimizer — converts uploaded images to WebP at upload time.
 *
 * Used in uploadImage / sellerUploadImage procedures so that images are stored
 * as compressed WebP from the start, rather than large PNG/JPEG originals.
 *
 * Produces two variants:
 *  - thumbnail: 400px wide, quality 75 (for product cards)
 *  - full:      1200px wide, quality 85 (for product detail page)
 *
 * Falls back to original buffer if Sharp fails (e.g. unsupported format).
 */

import sharp from "sharp";

export interface OptimizedImages {
  /** Full-size WebP (1200px max width) — use for product detail page */
  fullBuffer: Buffer;
  fullMimeType: string;
  fullFilename: string;
  /** Thumbnail WebP (400px max width) — use for product cards */
  thumbBuffer: Buffer;
  thumbMimeType: string;
  thumbFilename: string;
}

/**
 * Optimizes an uploaded image buffer.
 * @param inputBuffer  Raw image bytes (PNG, JPEG, WEBP, etc.)
 * @param originalFilename  Original filename (used to derive output filename)
 * @returns OptimizedImages with full and thumbnail WebP variants
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  originalFilename: string,
): Promise<OptimizedImages> {
  const baseName = originalFilename.replace(/\.[^.]+$/, "");

  try {
    const [fullBuffer, thumbBuffer] = await Promise.all([
      sharp(inputBuffer)
        .resize(1200, undefined, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 85 })
        .toBuffer(),
      sharp(inputBuffer)
        .resize(400, undefined, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);

    return {
      fullBuffer,
      fullMimeType: "image/webp",
      fullFilename: `${baseName}.webp`,
      thumbBuffer,
      thumbMimeType: "image/webp",
      thumbFilename: `${baseName}-thumb.webp`,
    };
  } catch (err) {
    console.error("[imageOptimizer] Sharp failed, using original:", err);
    // Fallback: return original as both variants
    return {
      fullBuffer: inputBuffer,
      fullMimeType: "image/jpeg",
      fullFilename: originalFilename,
      thumbBuffer: inputBuffer,
      thumbMimeType: "image/jpeg",
      thumbFilename: originalFilename,
    };
  }
}
