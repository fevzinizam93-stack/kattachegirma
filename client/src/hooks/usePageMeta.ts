import { useEffect } from "react";

const SITE_NAME = "Катта Чегирма";
const BASE_URL = "https://kattachegirma.uz";

// Default Uzbek keywords for all pages — helps Google/Yandex index UZ queries
const DEFAULT_KEYWORDS_UZ =
  "katta chegirma, arzon texnika, maishiy texnika, Toshkent, O'zbekiston, " +
  "kir yuvish mashina, muzlatgich, changyutgich, konditsioner, televizor, " +
  "telefon, uy texnikasi, chegirma, sotib olish, bo'lib to'lash";

const DEFAULT_KEYWORDS_RU =
  "Катта Чегирма, бытовая техника, Ташкент, Узбекистан, " +
  "стиральная машина, холодильник, пылесос, кондиционер, телевизор, " +
  "телефон, купить технику, скидки, рассрочка, дешевая техника";

interface PageMetaOptions {
  title: string;
  description: string;
  imageUrl?: string;
  canonicalPath?: string;
  /** UZ URL path for hreflang alternate (e.g. /kategoriya/kir-yuvish-mashinalar) */
  hreflangUzPath?: string;
  noindex?: boolean;
  type?: "website" | "product";
  /** Extra UZ keywords to prepend to defaults (e.g. product/category name in UZ) */
  keywordsUz?: string;
}

/**
 * Dynamically sets <title>, meta description, og:title, og:description,
 * og:image, og:url, canonical link, keywords, and hreflang alternate links for each page.
 * Restores defaults on unmount.
 */
export function usePageMeta({
  title,
  description,
  imageUrl,
  canonicalPath,
  hreflangUzPath,
  noindex = false,
  type = "website",
  keywordsUz,
}: PageMetaOptions) {
  useEffect(() => {
    const DEFAULT_TITLE = `${SITE_NAME} — Магазин бытовой техники со скидками`;
    const DEFAULT_DESC =
      "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры и многое другое.";
    const DEFAULT_IMAGE = `${BASE_URL}/logo-512.png?v=4`;

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

    // Helper: upsert a <link> tag by rel (and optional hreflang)
    function setLink(rel: string, href: string, hreflang?: string) {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      let el = document.querySelector<HTMLLinkElement>(selector);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        if (hreflang) el.setAttribute("hreflang", hreflang);
        document.head.appendChild(el);
      }
      el.href = href;
    }

    function removeLink(rel: string, hreflang?: string) {
      const selector = hreflang
        ? `link[rel="${rel}"][hreflang="${hreflang}"]`
        : `link[rel="${rel}"]:not([hreflang])`;
      document.querySelector(selector)?.remove();
    }

    // --- Title ---
    // Google supports up to 600px (~70 chars). We allow up to 120 to avoid
    // truncating long product names. Google rewrites titles anyway if needed.
    const fullTitle = title.length > 120
      ? title.slice(0, 120).replace(/\s+\S*$/, "") + "…"
      : title;
    document.title = fullTitle;

    // --- Meta description ---
    // Strip raw spec lines (lines that look like specs: short label + value pairs)
    // and keep only the first meaningful sentence for the description.
    const cleanDesc = description
      .split(/\n+/)
      .filter(line => line.trim().length > 20) // remove very short spec lines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const desc =
      cleanDesc.length > 200
        ? cleanDesc.slice(0, 200).replace(/\s+\S*$/, "") + "…"
        : cleanDesc;
    setMeta('meta[name="description"]', "content", desc);

    // --- Keywords (RU + UZ combined — helps Uzbek search queries) ---
    const uzPart = keywordsUz
      ? `${keywordsUz}, ${DEFAULT_KEYWORDS_UZ}`
      : DEFAULT_KEYWORDS_UZ;
    const keywords = `${uzPart}, ${DEFAULT_KEYWORDS_RU}`;
    setMeta('meta[name="keywords"]', "content", keywords);

    // --- Open Graph ---
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="og:locale"]', "content", "ru_RU");
    setMeta('meta[property="og:locale:alternate"]', "content", "uz_UZ");
    if (imageUrl) {
      setMeta('meta[property="og:image"]', "content", imageUrl);
    }
    if (canonicalPath) {
      const url = `${BASE_URL}${canonicalPath}`;
      setMeta('meta[property="og:url"]', "content", url);
      setLink("canonical", url);
      // hreflang: RU version = canonical, x-default = canonical
      setLink("alternate", url, "ru");
      setLink("alternate", url, "x-default");
    }

    // hreflang: UZ version (if slugUz is available)
    if (hreflangUzPath) {
      setLink("alternate", `${BASE_URL}${hreflangUzPath}`, "uz");
    } else if (canonicalPath) {
      // Fallback: point UZ hreflang to same canonical
      setLink("alternate", `${BASE_URL}${canonicalPath}`, "uz");
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
      setMeta('meta[name="keywords"]', "content", `${DEFAULT_KEYWORDS_UZ}, ${DEFAULT_KEYWORDS_RU}`);
      setMeta('meta[property="og:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[property="og:description"]', "content", DEFAULT_DESC);
      setMeta('meta[property="og:type"]', "content", "website");
      setMeta('meta[property="og:image"]', "content", DEFAULT_IMAGE);
      setMeta('meta[property="og:url"]', "content", BASE_URL + "/");
      setMeta('meta[property="og:locale"]', "content", "ru_RU");
      setMeta('meta[property="og:locale:alternate"]', "content", "uz_UZ");
      setMeta('meta[name="twitter:title"]', "content", DEFAULT_TITLE);
      setMeta('meta[name="twitter:description"]', "content", DEFAULT_DESC);
      setMeta('meta[name="twitter:image"]', "content", DEFAULT_IMAGE);
      setMeta('meta[name="robots"]', "content", "index, follow");
      setLink("canonical", BASE_URL + "/");
      // Remove hreflang alternates on unmount
      removeLink("alternate", "ru");
      removeLink("alternate", "uz");
      removeLink("alternate", "x-default");
    };
  }, [title, description, imageUrl, canonicalPath, hreflangUzPath, noindex, type, keywordsUz]);
}
