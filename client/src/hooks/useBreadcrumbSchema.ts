import { useEffect } from "react";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Injects a BreadcrumbList Schema.org JSON-LD script into the document <head>.
 * Cleans up on unmount to avoid stale breadcrumbs on navigation.
 *
 * Usage:
 *   useBreadcrumbSchema([
 *     { name: "Главная", url: "https://kattachegirma.uz/" },
 *     { name: "Каталог", url: "https://kattachegirma.uz/catalog" },
 *     { name: "Пылесосы", url: "https://kattachegirma.uz/category/pylesos" },
 *   ]);
 */
export function useBreadcrumbSchema(items: BreadcrumbItem[]) {
  useEffect(() => {
    if (!items || items.length === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url,
      })),
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "breadcrumb-schema";
    script.textContent = JSON.stringify(schema);

    // Remove any existing breadcrumb schema
    const existing = document.getElementById("breadcrumb-schema");
    if (existing) existing.remove();

    document.head.appendChild(script);

    return () => {
      const el = document.getElementById("breadcrumb-schema");
      if (el) el.remove();
    };
  }, [JSON.stringify(items)]);
}
