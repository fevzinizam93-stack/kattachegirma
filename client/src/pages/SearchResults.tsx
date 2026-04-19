import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Search } from "lucide-react";

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { data, isLoading } = trpc.products.list.useQuery({
    search: query,
    limit: 24,
    offset: 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-red-600" />
            <h1 className="text-xl font-black">
              Результаты поиска: «{query}»
            </h1>
          </div>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-1">
              {total > 0 ? `Найдено ${total} товаров` : "Ничего не найдено на сайте"}
            </p>
          )}
        </div>
      </div>

      <div className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold mb-2">На сайте ничего не найдено</h3>
            <p className="text-muted-foreground text-sm mb-8">
              По запросу «{query}» товары на сайте не найдены. Попробуйте поискать в интернете:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(query + " kattachegirma.uz")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-gray-700">Найти в Google</span>
                <ExternalLink size={14} className="text-gray-400" />
              </a>
              <a
                href={`https://yandex.ru/search/?text=${encodeURIComponent(query + " kattachegirma.uz")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#FC3F1D" d="M2.04 12c0-5.52 4.44-9.96 9.96-9.96S21.96 6.48 21.96 12 17.52 21.96 12 21.96 2.04 17.52 2.04 12z"/>
                  <path fill="#fff" d="M13.32 7.2h-.78c-1.44 0-2.22.72-2.22 1.86 0 1.26.54 1.86 1.68 2.64l.96.66-2.7 4.02H8.82l2.52-3.72c-1.44-.96-2.22-1.98-2.22-3.54 0-1.98 1.38-3.3 3.66-3.3h2.82v10.56h-2.28V7.2z"/>
                </svg>
                <span className="font-medium text-gray-700">Найти в Яндексе</span>
                <ExternalLink size={14} className="text-gray-400" />
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {/* External search links below results */}
            <div className="mt-8 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-3">Не нашли нужный товар? Поищите в интернете:</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(query + " kattachegirma.uz")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700">Google</span>
                  <ExternalLink size={12} className="text-gray-400" />
                </a>
                <a
                  href={`https://yandex.ru/search/?text=${encodeURIComponent(query + " kattachegirma.uz")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#FC3F1D" d="M2.04 12c0-5.52 4.44-9.96 9.96-9.96S21.96 6.48 21.96 12 17.52 21.96 12 21.96 2.04 17.52 2.04 12z"/>
                    <path fill="#fff" d="M13.32 7.2h-.78c-1.44 0-2.22.72-2.22 1.86 0 1.26.54 1.86 1.68 2.64l.96.66-2.7 4.02H8.82l2.52-3.72c-1.44-.96-2.22-1.98-2.22-3.54 0-1.98 1.38-3.3 3.66-3.3h2.82v10.56h-2.28V7.2z"/>
                  </svg>
                  <span className="text-gray-700">Яндекс</span>
                  <ExternalLink size={12} className="text-gray-400" />
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
