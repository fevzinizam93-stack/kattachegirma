import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Filter, SlidersHorizontal } from "lucide-react";
import PriceRangeSlider from "@/components/PriceRangeSlider";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";
import RecentlyViewed from "@/components/RecentlyViewed";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAnalytics } from "@/hooks/useAnalytics";

const LIMIT = 12;

type SortBy = 'newest' | 'price_asc' | 'price_desc' | 'discount' | 'rating' | 'reviews' | 'popularity';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Новинки' },
  { value: 'popularity', label: 'Популярные' },
  { value: 'price_asc', label: 'Дешевле' },
  { value: 'price_desc', label: 'Дороже' },
  { value: 'discount', label: 'По скидке' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'reviews', label: 'По отзывам' },
];

export default function Catalog() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();

  usePageMeta({
    title: "Каталог техники со скидками в Ташкенте | Катта Чегирма",
    description: "Каталог техники в Ташкенте со скидкой. Телефоны, холодильники, пылесосы, кондиционеры, стиральные машины, телевизоры. Рассрочка, быстрая доставка по Узбекистану.",
    canonicalPath: "/catalog",
  });

  useBreadcrumbSchema([
    { name: "Главная", url: "https://kattachegirma.uz/" },
    { name: "Каталог", url: "https://kattachegirma.uz/catalog" },
  ]);

  // Parse initial state from URL params
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const catId = params.get('category');
    const minP = params.get('minPrice');
    const maxP = params.get('maxPrice');
    const brandsParam = params.get('brands');
    const sort = params.get('sortBy') as SortBy | null;
    const q = params.get('q') ?? '';
    return {
      selectedCategory: catId ? parseInt(catId, 10) : undefined,
      search: q,
      searchInput: q,
      minPrice: minP ? parseInt(minP, 10) : undefined,
      maxPrice: maxP ? parseInt(maxP, 10) : undefined,
      minPriceInput: minP ?? '',
      maxPriceInput: maxP ?? '',
      sortBy: (sort && ['newest','price_asc','price_desc','discount','rating','reviews','popularity'].includes(sort) ? sort : 'newest') as SortBy,
      selectedBrands: brandsParam ? brandsParam.split(',').filter(Boolean) : [],
      minRating: params.get('minRating') ? parseInt(params.get('minRating')!, 10) : undefined,
    };
  };

  const init = getInitialState();
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(init.selectedCategory);
  const [search, setSearch] = useState(init.search);
  const [searchInput, setSearchInput] = useState(init.searchInput);
  const [page, setPage] = useState(0);
  const [allProducts, setAllProducts] = useState<typeof products>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState(init.minPriceInput);
  const [maxPriceInput, setMaxPriceInput] = useState(init.maxPriceInput);
  const [minPrice, setMinPrice] = useState<number | undefined>(init.minPrice);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(init.maxPrice);
  const [sortBy, setSortBy] = useState<SortBy>(init.sortBy);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(init.selectedBrands);
  const [minRating, setMinRating] = useState<number | undefined>(init.minRating);

  // Price range from backend
  const { data: priceRangeData } = trpc.products.priceRange.useQuery(
    { categoryId: selectedCategory, search: search || undefined },
    { staleTime: 5 * 60 * 1000 }
  );
  const priceRangeMin = priceRangeData?.min ?? 0;
  const priceRangeMax = priceRangeData?.max ?? 50000000;
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Sync filters to URL
  const syncToUrl = useCallback((opts: {
    category?: number;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: SortBy;
    brands?: string[];
    minRating?: number;
  }) => {
    const params = new URLSearchParams();
    if (opts.category) params.set('category', String(opts.category));
    if (opts.q) params.set('q', opts.q);
    if (opts.minPrice) params.set('minPrice', String(opts.minPrice));
    if (opts.maxPrice) params.set('maxPrice', String(opts.maxPrice));
    if (opts.sortBy && opts.sortBy !== 'newest') params.set('sortBy', opts.sortBy);
    if (opts.brands && opts.brands.length > 0) params.set('brands', opts.brands.join(','));
    const qs = params.toString();
    setLocation('/catalog' + (qs ? '?' + qs : ''), { replace: true });
  }, [setLocation]);

  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const categories = categoriesData ?? [];

  // Load brands filtered by selected category
  const { data: brandsData } = trpc.products.getBrands.useQuery(
    { categoryId: selectedCategory }
  );
  const availableBrands = brandsData ?? [];

  const { data, isLoading } = trpc.products.list.useQuery({
    categoryId: selectedCategory,
    search: search || undefined,
    limit: LIMIT,
    offset: page * LIMIT,
    minPrice: minPrice,
    maxPrice: maxPrice,
    sortBy: sortBy as 'newest' | 'price_asc' | 'price_desc' | 'discount' | 'rating' | 'reviews' | 'popularity',
    brands: selectedBrands.length > 0 ? selectedBrands : undefined,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const hasMore = page < totalPages - 1;

  // Accumulate products for infinite scroll
  useEffect(() => {
    if (isLoading) return;
    if (page === 0) {
      // Filter reset — replace all
      setAllProducts(products);
    } else {
      // Next page — append (deduplicate by id)
      setAllProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = products.filter(p => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
    }
    setIsFetchingMore(false);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isFetchingMore) {
          setIsFetchingMore(true);
          setPage(p => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isFetchingMore]);

  // Reset brands when category changes (brands may no longer be valid)
  useEffect(() => {
    setSelectedBrands([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy, brands: [] });
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!showSortDropdown) return;
    const handler = () => setShowSortDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showSortDropdown]);

  const { track } = useAnalytics();
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: searchInput, minPrice, maxPrice, sortBy, brands: selectedBrands });
    if (searchInput.trim()) track("search", { meta: { query: searchInput.trim() } });
  };
  const handleCategoryChange = (id: number | undefined) => {
    setSelectedCategory(id);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: id, q: search, minPrice, maxPrice, sortBy, brands: [] });
  };
  const handlePriceFilter = () => {
    const rawMin = minPriceInput.replace(/[^\d]/g, '');
    const rawMax = maxPriceInput.replace(/[^\d]/g, '');
    const newMin = rawMin ? parseInt(rawMin, 10) : undefined;
    const newMax = rawMax ? parseInt(rawMax, 10) : undefined;
    setMinPrice(newMin);
    setMaxPrice(newMax);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: search, minPrice: newMin, maxPrice: newMax, sortBy, brands: selectedBrands });
  };
  const handlePriceReset = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: search, sortBy, brands: selectedBrands });
  };
  const toggleBrand = (brand: string) => {
    const newBrands = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(newBrands);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy, brands: newBrands });
  };
  const handleBrandsReset = () => {
    setSelectedBrands([]);
    setAllProducts([]);
    setPage(0);
    syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy, brands: [] });
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Новинки';
  const activeFiltersCount = (selectedBrands.length > 0 ? 1 : 0) + (minPrice !== undefined || maxPrice !== undefined ? 1 : 0);

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
              {activeFiltersCount > 0 && (
                <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* Search + Sort row */}
          <div className="mt-3 flex gap-2 items-center">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
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
                  onClick={() => { setSearch(""); setSearchInput(""); setAllProducts([]); setPage(0); }}
                  className="border border-border px-3 py-2 rounded-lg text-sm hover:bg-accent"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Sort dropdown */}
            <div className="relative shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setShowSortDropdown(v => !v); }}
                className="flex items-center gap-1.5 border border-border bg-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline text-muted-foreground text-xs">Сортировка:</span>
                <span className="font-semibold">{currentSortLabel}</span>
                <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-20 min-w-[160px] py-1">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={e => { e.stopPropagation(); setSortBy(opt.value); setAllProducts([]); setPage(0); setShowSortDropdown(false); syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy: opt.value, brands: selectedBrands }); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-accent ${sortBy === opt.value ? 'font-semibold text-primary' : ''}`}
                    >
                      {sortBy === opt.value && <span className="mr-1">✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
          {/* Sidebar filters */}
          <aside className={`w-56 shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="bg-white rounded-xl border border-border p-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Filter size={16} />
                {t.nav_catalog}
              </h3>

              {/* Categories */}
              <ul className="space-y-0.5">
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

              {/* Brand filter */}
              {availableBrands.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Бренд</h4>
                    {selectedBrands.length > 0 && (
                      <button
                        onClick={handleBrandsReset}
                        className="text-xs text-primary hover:underline"
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-primary accent-primary cursor-pointer"
                        />
                        <span className={`text-sm leading-tight group-hover:text-primary transition-colors ${selectedBrands.includes(brand) ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                          {brand}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Price filter — dual-handle slider */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-3">Цена (сум)</h4>
                <PriceRangeSlider
                  min={priceRangeMin}
                  max={priceRangeMax}
                  value={[minPrice ?? priceRangeMin, maxPrice ?? priceRangeMax]}
                  onChange={([newMin, newMax]) => {
                    const isFullRange = newMin <= priceRangeMin && newMax >= priceRangeMax;
                    setMinPrice(isFullRange ? undefined : newMin);
                    setMaxPrice(isFullRange ? undefined : newMax);
                    setMinPriceInput(isFullRange ? '' : String(newMin));
                    setMaxPriceInput(isFullRange ? '' : String(newMax));
                    setAllProducts([]);
                    setPage(0);
                    syncToUrl({
                      category: selectedCategory,
                      q: search,
                      minPrice: isFullRange ? undefined : newMin,
                      maxPrice: isFullRange ? undefined : newMax,
                      sortBy,
                      brands: selectedBrands,
                    });
                  }}
                />
                {(minPrice !== undefined || maxPrice !== undefined) && (
                  <button
                    onClick={handlePriceReset}
                    className="mt-2 w-full border border-border px-3 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
                  >
                    Сбросить цену
                  </button>
                )}
              </div>
            </div>
              {/* Rating filter */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Рейтинг</h4>
                <div className="space-y-1">
                  {[4, 3, 2].map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        const next = minRating === r ? undefined : r;
                        setMinRating(next);
                        setPage(0);
                        setAllProducts([]);
                        syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy, brands: selectedBrands, minRating: next });
                      }}
                      className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${minRating === r ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                    >
                      <span className="text-amber-400">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                      <span>и выше</span>
                    </button>
                  ))}
                  {minRating !== undefined && (
                    <button
                      onClick={() => { setMinRating(undefined); setPage(0); setAllProducts([]); syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy, brands: selectedBrands }); }}
                      className="w-full border border-border px-3 py-1.5 rounded-lg text-sm hover:bg-accent transition-colors"
                    >
                      Сбросить рейтинг
                    </button>
                  )}
                </div>
              </div>
          </aside>

          {/* Products grid */}
          <div className="flex-1 min-w-0">
            {/* Active filters summary */}
            {(selectedBrands.length > 0 || minPrice !== undefined || maxPrice !== undefined || sortBy !== 'newest') && (
              <div className="flex flex-wrap gap-2 mb-3">
                {sortBy !== 'newest' && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                    {currentSortLabel}
                    <button onClick={() => { setSortBy('newest'); setAllProducts([]); setPage(0); syncToUrl({ category: selectedCategory, q: search, minPrice, maxPrice, sortBy: 'newest', brands: selectedBrands }); }} className="ml-0.5 hover:text-primary/70">✕</button>
                  </span>
                )}
                {selectedBrands.map(b => (
                  <span key={b} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {b}
                    <button onClick={() => toggleBrand(b)} className="ml-0.5 hover:text-blue-500">✕</button>
                  </span>
                ))}
                {(minPrice !== undefined || maxPrice !== undefined) && (
                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                    {minPrice !== undefined ? `от ${minPrice.toLocaleString()}` : ''}{minPrice !== undefined && maxPrice !== undefined ? ' — ' : ''}{maxPrice !== undefined ? `до ${maxPrice.toLocaleString()}` : ''} сум
                    <button onClick={handlePriceReset} className="ml-0.5 hover:text-green-500">✕</button>
                  </span>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col animate-pulse">
                    {/* Image area */}
                    <div className="relative bg-gray-100" style={{ aspectRatio: '1' }}>
                      {/* Discount badge */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                        <div className="h-4 w-8 bg-gray-200 rounded-md" />
                      </div>
                      {/* Compare icon placeholder */}
                      <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-gray-200" />
                    </div>
                    {/* Content area */}
                    <div className="p-2 flex flex-col flex-1 gap-1.5">
                      {/* Brand */}
                      <div className="h-2.5 bg-gray-200 rounded w-12" />
                      {/* Product name — 2 lines */}
                      <div className="space-y-1 flex-1">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-4/5" />
                      </div>
                      {/* Price block */}
                      <div className="space-y-1 mt-0.5">
                        <div className="flex items-center gap-1">
                          <div className="h-2.5 bg-gray-200 rounded w-16" />
                          <div className="h-3.5 bg-gray-200 rounded w-8" />
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-24" />
                      </div>
                      {/* Cart button */}
                      <div className="h-7 bg-gray-200 rounded-lg w-full mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-bold mb-2">{t.catalog_no_products}</h3>
                {(selectedBrands.length > 0 || minPrice !== undefined || maxPrice !== undefined) && (
                  <button
                    onClick={() => { handleBrandsReset(); handlePriceReset(); }}
                    className="mt-2 text-sm text-primary hover:underline"
                  >
                    Сбросить все фильтры
                  </button>
                )}
              </div>
            ) : (
               <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {allProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} priority={i < 4} />
                  ))}
                </div>
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-1" />
                {/* Loading more indicator */}
                {isFetchingMore && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col animate-pulse">
                        <div className="relative bg-gray-100" style={{ aspectRatio: '1' }} />
                        <div className="p-2 flex flex-col gap-1.5">
                          <div className="h-2.5 bg-gray-200 rounded w-12" />
                          <div className="h-3 bg-gray-200 rounded w-full" />
                          <div className="h-3 bg-gray-200 rounded w-4/5" />
                          <div className="h-4 bg-gray-200 rounded w-24" />
                          <div className="h-7 bg-gray-200 rounded-lg w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* End of list */}
                {!hasMore && allProducts.length > 0 && !isLoading && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Все {total} товаров загружены
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Recently viewed */}
      <RecentlyViewed />
      {/* Floating scroll-to-top button */}
      <ScrollToTop />
    </div>
  );
}
