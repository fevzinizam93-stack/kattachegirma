/**
 * IndexNow API helper
 * Notifies Yandex (and other IndexNow-compatible engines) about new/updated URLs.
 * Docs: https://yandex.com/indexnow
 */

const INDEX_NOW_KEY = "c426dc7430f65451d4a4a45d3111fadb";
const SITE_HOST = "kattachegirma.uz";
const YANDEX_ENDPOINT = "https://yandex.com/indexnow";

/**
 * Submit one or more URLs to IndexNow (Yandex).
 * Silently logs errors — never throws, so it never breaks the calling procedure.
 */
export async function indexNowSubmit(urls: string[]): Promise<void> {
  if (!urls.length) return;

  // Normalise: ensure absolute URLs
  const absoluteUrls = urls.map((u) =>
    u.startsWith("http") ? u : `https://${SITE_HOST}${u}`
  );

  try {
    if (absoluteUrls.length === 1) {
      // Single-URL GET request (simpler, no body)
      const url = new URL(YANDEX_ENDPOINT);
      url.searchParams.set("url", absoluteUrls[0]);
      url.searchParams.set("key", INDEX_NOW_KEY);
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok && res.status !== 202) {
        console.warn(`[IndexNow] Single submit failed: ${res.status} ${res.statusText}`);
      } else {
        console.log(`[IndexNow] Submitted: ${absoluteUrls[0]}`);
      }
    } else {
      // Batch POST request (up to 10 000 URLs)
      const body = {
        host: SITE_HOST,
        key: INDEX_NOW_KEY,
        keyLocation: `https://${SITE_HOST}/${INDEX_NOW_KEY}.txt`,
        urlList: absoluteUrls,
      };
      const res = await fetch(YANDEX_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 202) {
        console.warn(`[IndexNow] Batch submit failed: ${res.status} ${res.statusText}`);
      } else {
        console.log(`[IndexNow] Batch submitted ${absoluteUrls.length} URLs`);
      }
    }
  } catch (err) {
    console.warn("[IndexNow] Network error:", err);
  }
}

/**
 * Convenience: submit a single product page.
 */
export async function indexNowProduct(slug: string): Promise<void> {
  await indexNowSubmit([`https://${SITE_HOST}/product/${slug}`]);
}
