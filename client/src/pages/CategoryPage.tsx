import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";

const LIMIT = 12;

interface CategoryPageProps {
  slug: string;
}

export default function CategoryPage({ slug }: CategoryPageProps) {
  const [page, setPage] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];
  const category = categories.find(c => c.slug === slug);

  const { data, isLoading } = trpc.products.list.useQuery({
    categoryId: category?.id,
    limit: LIMIT,
    offset: page * LIMIT,
  });

  const allProducts = data?.items ?? [];
  const total = data?.total ?? 0;

  // Client-side price/brand filter
  const filtered = allProducts.filter(p => {
    const price = parseFloat(p.price);
    if (minPrice && price < parseFloat(minPrice)) return false;
    if (maxPrice && price > parseFloat(maxPrice)) return false;
    if (brandFilter && !p.brand?.toLowerCase().includes(brandFilter.toLowerCase())) return false;
    return true;
  });

  const brands = Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean))) as string[];
  const totalPages = Math.ceil(total / LIMIT);

  // SEO: dynamic meta tags for category page
  const categoryTitle = category
    ? `${category.name} — купить в Ташкенте | Катта Чегирма`
    : `Категория — Катта Чегирма`;
  const categoryDesc = category
    ? `Купите ${category.name} по выгодной цене в интернет-магазине Катта Чегирма. ${total > 0 ? `${total} товаров в наличии.` : ""} Быстрая доставка по Ташкенту и всему Узбекистану. Гарантия качества.`
    : `Каталог бытовой техники в интернет-магазине Катта Чегирма. Выгодные цены, быстрая доставка по Узбекистану.`;

  usePageMeta({
    title: categoryTitle,
    description: categoryDesc,
    canonicalPath: `/category/${slug}`,
  });

  if (!category && categoriesData) {
    return (
      <div className="container py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold">Категория не найдена</h2>
        <Link href="/catalog" className="text-primary hover:underline mt-2 inline-block">Вернуться в каталог</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Главная</Link>
            <ChevronRight size={14} />
            <Link href="/catalog" className="hover:text-primary">Katalog</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{category?.name ?? slug}</span>
          </div>
          <h1 className="text-xl font-black mt-2 flex items-center gap-2">
            <span>{category?.icon}</span>
            <span>{category?.name ?? slug}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{total} товаров</p>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <aside className="w-56 shrink-0 hidden md:block">
            <div className="bg-white rounded-xl border border-border p-4 sticky top-24 space-y-5">
              {/* Price filter */}
              <div>
                <h4 className="font-bold text-sm mb-3">Цена (сум)</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="От"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Brand filter */}
              {brands.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Бренд</h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => setBrandFilter("")}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${!brandFilter ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                    >
                      Все
                    </button>
                    {brands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => setBrandFilter(brand)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${brandFilter === brand ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              {(minPrice || maxPrice || brandFilter) && (
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); setBrandFilter(""); }}
                  className="w-full border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold mb-2">Товары не найдены</h3>
                <p className="text-muted-foreground text-sm">Измените фильтры</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filtered.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      ← Назад
                    </button>
                    <span className="px-4 py-2 text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Вперёд →
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
