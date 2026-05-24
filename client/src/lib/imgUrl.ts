/**
 * Build an optimized image URL that goes through the server's image proxy.
 * The proxy converts images to WebP and resizes them to the requested width.
 *
 * Usage:
 *   imgUrl(product.imageUrl, 400)   → "/api/img?url=...&w=400&q=80"
 *   imgUrl(product.imageUrl, 1200)  → "/api/img?url=...&w=1200&q=85"
 *
 * Falls back to the original URL if the input is empty/null.
 */
export function imgUrl(
  src: string | null | undefined,
  width: number = 800,
  quality: number = 80,
): string {
  if (!src) return "";
  // Already a proxy URL — don't double-wrap
  if (src.startsWith("/api/img")) return src;
  // External URLs (http/https) or storage paths are both proxied
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
