import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

const LIMIT = 12;

export default function Catalog() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const { data, isLoading } = trpc.products.list.useQuery({
    categoryId: selectedCategory,
    search: search || undefined,
    limit: LIMIT,
    offset: page * LIMIT,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const handleCategoryChange = (id: number | undefined) => {
    setSelectedCategory(id);
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black">{t.catalog_title}</h1>
              <p className="text-sm text-muted-foreground">{total} {t.catalog_products_found}</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent"
            >
              <SlidersHorizontal size={16} />
              {t.catalog_filter_apply}
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-3 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t.catalog_search_placeholder}
              className="flex-1 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Filter size={16} />
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(0); }}
                className="border border-border px-3 py-2 rounded-lg text-sm hover:bg-accent"
              >
                ✕
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Mobile category chips */}
      <div className="md:hidden bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-2 px-3 py-2 w-max">
          <button
            onClick={() => handleCategoryChange(undefined)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${!selectedCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {t.catalog_all_categories}
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="container py-3">
        <div className="flex gap-4">
          {/* Sidebar filters - desktop only */}
          <aside className={`w-52 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="bg-white rounded-xl border border-border p-4 sticky top-24">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Filter size={16} />
                {t.nav_catalog}
              </h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => handleCategoryChange(undefined)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                  >
                    {t.catalog_all_categories}
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border h-64 animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold mb-2">{t.catalog_no_products}</h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {products.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ←
                    </button>
                    <span className="px-4 py-2 text-sm text-muted-foreground">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
