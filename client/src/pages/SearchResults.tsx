import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAnalytics, useTimeOnPage } from "@/hooks/useAnalytics";
import { useEffect } from "react";

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { lang, t } = useLanguage();
  const { track } = useAnalytics();
  useTimeOnPage(`/search?q=${encodeURIComponent(query)}`);
  useEffect(() => {
    if (query.trim()) track("search", { meta: { query: query.trim() } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  usePageMeta({
    title: query ? `Поиск: ${query} — Катта Чегирма` : "Поиск товаров — Катта Чегирма",
    description: query
      ? `Результаты поиска «${query}» в интернет-магазине Катта Чегирма. Бытовая техника с выгодными ценами. Быстрая доставка по Узбекистану.`
      : "Поиск бытовой техники в интернет-магазине Катта Чегирма. Выгодные цены, быстрая доставка.",
    noindex: true, // Search result pages should not be indexed
  });

  const { data, isLoading } = trpc.products.list.useQuery({
    search: query,
    limit: 48,
    offset: 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  const tips = [
    "Введите полное название модели (например: WW70T4542TE)",
    "Введите название бренда (SAMSUNG, LG, BOSCH...)",
    "Введите цену цифрами (например: 500000)",
    "Регистр букв не важен — можно писать заглавными или строчными",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-primary" />
            <h1 className="text-xl font-black">
              {t.search_title}: «{query}»
            </h1>
          </div>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">
              {total > 0
                ? `${t.search_found} ${total} ${t.catalog_products_found}`
                : t.common_not_found}
            </p>
          )}
        </div>
      </div>

      <div className="container py-3 pb-24 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-56 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-black text-gray-900 mb-3">{t.catalog_no_products}</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {t.search_not_found_desc.replace("По запросу", `«${query}»`)}
            </p>

            {/* Search tips */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3">
                "Советы по поиску:"
              </p>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              {t.cart_go_catalog}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
