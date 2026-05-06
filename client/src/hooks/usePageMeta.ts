import { useEffect } from "react";

const SITE_NAME = "Катта Чегирма";
const BASE_URL = "https://kattachegirma.uz";

interface PageMetaOptions {
  title: string;
  description: string;
  imageUrl?: string;
  canonicalPath?: string;
  noindex?: boolean;
  type?: "website" | "product";
}

/**
 * Dynamically sets <title>, meta description, og:title, og:description,
 * og:image, og:url, canonical link for each page.
 * Restores defaults on unmount.
 */
export function usePageMeta({
  title,
  description,
  imageUrl,
  canonicalPath,
  noindex = false,
  type = "website",
}: PageMetaOptions) {
  useEffect(() => {
    const DEFAULT_TITLE = `${SITE_NAME} — Магазин бытовой техники со скидками`;
    const DEFAULT_DESC =
      "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры и многое другое.";
    const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

    // Helper: upsert a <meta> tag
    function setMeta(selector: string, attr: string, value: string) {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [attrName, attrValue] = selector
          .replace("meta[", "")
          .replace("]", "")
          .replace(/"/g, "")
          .split("=");
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    }

    // Helper: upsert a <link> tag
    function setLink(rel: string, href: string) {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = href;
    }

    // --- Title ---
    const fullTitle =
      title.length > 60
        ? title.slice(0, 60).replace(/\s+\S*$/, "") + "…"
        : title;
    document.title = fullTitle;

    // --- Meta description ---
    const desc =
      description.length > 160
        ? description.slice(0, 160).replace(/\s+\S*$/, "") + "…"
        : description;
    setMeta('meta[name="description"]', "content", desc);

    // --- Open Graph ---
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", type);
    if (imageUrl) {
      setMeta('meta[property="og:image"]', "content", imageUrl);
    }
    if (canonicalPath) {
      const url = `${BASE_URL}${canonicalPath}`;
      setMeta('meta[property="og:url"]', "content", url);
      setLink("canonical", url);
    }

    // --- Twitter Card ---
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", desc);
    if (imageUrl) {
      setMeta('meta[name="twitter:image"]', "content", imageUrl);
    }

    // --- Robots ---
    setMeta('meta[name="robots"]', "content", noindex ? "noindex, nofollow" : "index, follow");

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('meta[name="description"]', "content", DEFAULT_DESC);
      setMeta('meta[property="og:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', "content", DEFAULT_DESC);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[property="og:image"]', "content", DEFAULT_IMAGE);
      setMeta('meta[property="og:url"]', "content", BASE_URL + "/");
      setMeta('meta[name="twitter:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', "content", DEFAULT_DESC);
      setMeta('meta[name="twitter:image"]', "content", DEFAULT_IMAGE);
      setMeta('meta[name="robots"]', "content", "index, follow");
      setLink("canonical", BASE_URL + "/");
    };
  }, [title, description, imageUrl, canonicalPath, noindex, type]);
}
