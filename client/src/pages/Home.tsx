import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import RecentlyViewed from "@/components/RecentlyViewed";

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Categories that have products (with their slugs for linking)
const CATEGORY_ORDER = [120001, 1, 2, 30001, 9, 150001, 8, 13];

// How many products to load per page
const PAGE_SIZE = 40;
// Initial load — slightly more for first paint
const INITIAL_SIZE = 60;

// ---- Skeleton card — точно повторяет размер ProductCard ----
function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col animate-pulse">
      {/* image area — same paddingBottom as real card */}
      <div className="relative bg-gray-100" style={{ paddingBottom: "70%" }}>
        <div className="absolute inset-0 bg-gray-200" />
      </div>
      <div className="p-2 flex flex-col flex-1 gap-1.5">
        {/* brand */}
        <div className="h-2.5 w-12 bg-gray-200 rounded" />
        {/* name — 2 lines */}
        <div className="flex-1 space-y-1">
          <div className="h-3.5 bg-gray-200 rounded w-full" />
          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        </div>
        {/* price */}
        <div className="h-4 w-20 bg-gray-200 rounded mt-1" />
        {/* button */}
        <div className="h-7 bg-gray-200 rounded-lg mt-0.5" />
      </div>
    </div>
  );
}

// ---- Skeleton для горизонтального слайдера хитов ----
function HitsSliderSkeleton() {
  return (
    <section className="py-4" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fff3e0 50%, #fef9f0 100%)", borderTop: "3px solid #ffffff", borderBottom: "3px solid #ffffff" }}>
      <div className="container">
        {/* header skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-orange-200 animate-pulse" />
            <div className="space-y-1">
              <div className="h-5 w-32 bg-orange-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-orange-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-7 w-20 bg-orange-100 rounded-full animate-pulse" />
        </div>
        {/* cards row */}
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0" style={{ width: "220px" }}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Skeleton для одной секции категории ----
function CategorySectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="container py-3">
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
      {/* grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();

  // SEO: dynamic meta tags for homepage
  usePageMeta({
    title: "Катта Чегирма — Магазин бытовой техники со скидками",
    description: "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры и другая техника ведущих брендов со скидками до 60%. Быстрая доставка по Ташкенту и всему Узбекистану.",
    canonicalPath: "/",
    imageUrl: "https://kattachegirma.uz/logo-512.png?v=4",
    keywordsUz: "arzon maishiy texnika, kir yuvish mashina sotib olish, muzlatgich arzon, changyutgich Toshkent, konditsioner narxi, televizor chegirma, Katta Chegirma",
  });

  // Hits — primary content, load first (limit 20 for fast initial render)
  const { data: hitsData, isLoading: hitsLoading } = trpc.products.getHits.useQuery(
    { limit: 20 },
    { staleTime: 5 * 60 * 1000 }
  );
  // Shuffle hits on each page load so different products appear first
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hitProducts = useMemo(() => shuffleArray(hitsData ?? []), [hitsData]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderPausedRef = useRef(false);
  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };
  // Auto-scroll: every 3s move one card; seamless infinite loop via doubled array
  useEffect(() => {
    const interval = setInterval(() => {
      if (sliderPausedRef.current || !sliderRef.current) return;
      const el = sliderRef.current;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half - 5) {
        el.scrollLeft = el.scrollLeft - half;
      }
      el.scrollBy({ left: 240, behavior: "smooth" });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Secondary content — categories and banners
  const { data: categoriesData, isLoading: categoriesLoading } = trpc.categories.list.useQuery(
    undefined,
    { staleTime: 10 * 60 * 1000 }
  );
  const { data: activeBanners } = trpc.banners.listActive.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );
  const banners = activeBanners ?? [];
  const categories = categoriesData ?? [];

  // ── Infinite scroll state ──────────────────────────────────────────────────
  // We accumulate all loaded products in a stable array across pages.
  // Each page fetch uses offset = loadedCount, limit = PAGE_SIZE.
  const [loadedProducts, setLoadedProducts] = useState<NonNullable<ReturnType<typeof trpc.products.list.useQuery>["data"]>["items"]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const totalRef = useRef<number | null>(null);

  // Initial page — always fetched
  const { data: initialData, isLoading: productsLoading } = trpc.products.list.useQuery(
    { limit: INITIAL_SIZE, offset: 0 },
    { staleTime: 3 * 60 * 1000 }
  );

  // When initial data arrives, seed loadedProducts
  useEffect(() => {
    if (!initialData) return;
    totalRef.current = initialData.total;
    setLoadedProducts(initialData.items);
    setCurrentOffset(initialData.items.length);
    setHasMore(initialData.items.length < initialData.total);
  }, [initialData]);

  // tRPC utils for manual fetching of next pages
  const utils = trpc.useUtils();

  const fetchNextPage = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const result = await utils.products.list.fetch(
        { limit: PAGE_SIZE, offset: currentOffset },
        { staleTime: 3 * 60 * 1000 }
      );
      if (result.items.length === 0) {
        setHasMore(false);
      } else {
        setLoadedProducts(prev => [...prev, ...result.items]);
        setCurrentOffset(prev => prev + result.items.length);
        setHasMore(currentOffset + result.items.length < result.total);
      }
    } catch {
      // silently ignore — user can scroll again to retry
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, currentOffset, utils]);

  // IntersectionObserver sentinel at the bottom of the page
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" } // start loading 300px before the bottom
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, fetchNextPage]);

  // Shuffle products once per page load — each visitor sees a different order
  // We keep a stable shuffle seed per session so re-renders don't re-shuffle
  const shuffledProducts = useMemo(() => shuffleArray(loadedProducts), [loadedProducts]);

  // Group shuffled products by categoryId
  const productsByCategory: Record<number, typeof shuffledProducts> = {};
  for (const p of shuffledProducts) {
    if (!productsByCategory[p.categoryId]) productsByCategory[p.categoryId] = [];
    productsByCategory[p.categoryId].push(p);
  }

  // Build category sections: only categories that have products, in preferred order
  const catMap: Record<number, (typeof categories)[0]> = {};
  for (const c of categories) catMap[c.id] = c;

  const orderedCatIds = [
    ...CATEGORY_ORDER.filter(id => productsByCategory[id]?.length > 0),
    ...Object.keys(productsByCategory)
      .map(Number)
      .filter(id => !CATEGORY_ORDER.includes(id) && productsByCategory[id]?.length > 0),
  ];

  // Are we still loading the main content?
  const isMainLoading = hitsLoading || productsLoading || categoriesLoading;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* SEO: visually hidden H1 for search engines */}
      <h1 className="sr-only">Катта Чегирма — Дешевая бытовая техника в Узбекистане</h1>
      <h2 className="sr-only">Товары со скидкой — телевизоры, стиральные машины, холодильники</h2>

      {/* Promo Banners from admin */}
      {banners.length > 0 && (
        <section className="container pt-3">
          <div className="flex flex-col gap-2">
            {banners.map(banner => (
              <PromoBanner key={banner.id} banner={banner} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile horizontal category scroll */}
      {categories.length > 0 && (
        <div className="md:hidden bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-3 py-2 w-max">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.slug}`)}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors min-w-[56px]"
              >
                {cat.icon && <span className="text-xl leading-none">{cat.icon}</span>}
                <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight line-clamp-2 max-w-[52px]">
                  {lang === "uz" && (cat as any).nameUz ? (cat as any).nameUz : cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop horizontal category scroll */}
      {categories.length > 0 && (
        <div className="hidden md:block bg-white border-b border-gray-100 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-4 py-2 w-max mx-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.slug}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors whitespace-nowrap"
              >
                {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                <span className="text-xs font-semibold text-gray-700">
                  {lang === "uz" && (cat as any).nameUz ? (cat as any).nameUz : cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hits slider */}
      {hitsLoading && <HitsSliderSkeleton />}
      {!hitsLoading && hitProducts.length > 0 && (
        <section
          className="py-4"
          style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fff3e0 50%, #fef9f0 100%)", borderTop: "3px solid #ffffff", borderBottom: "3px solid #ffffff" }}
        >
          <div className="container">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md">
                  <Flame size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black text-gray-900 leading-tight">{t.home_hits_title}</h2>
                  <p className="text-xs text-orange-600 font-medium">{t.home_hits_subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => scrollSlider("left")} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-500 transition-colors shadow-sm">
                  <ChevronLeft size={16} className="text-orange-500" />
                </button>
                <button onClick={() => scrollSlider("right")} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-500 transition-colors shadow-sm">
                  <ChevronRight size={16} className="text-orange-500" />
                </button>
                <Link href="/bestsellers" className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-sm">
                  {t.home_view_all}
                </Link>
              </div>
            </div>

            {/* Horizontal scroll row */}
            <div
              ref={sliderRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-1"
              style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
              onMouseEnter={() => { sliderPausedRef.current = true; }}
              onMouseLeave={() => { sliderPausedRef.current = false; }}
            >
              {/* Double the array for seamless infinite loop */}
              {[...hitProducts, ...hitProducts].map((p, idx) => (
                <div key={`${p.id}-${idx}`} className="shrink-0" style={{ width: "220px", scrollSnapAlign: "start" }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Loading skeletons for category sections */}
      {isMainLoading && (
        <>
          <CategorySectionSkeleton count={5} />
          <CategorySectionSkeleton count={5} />
          <CategorySectionSkeleton count={4} />
        </>
      )}

      {/* Category sections — one section per category that has products */}
      {!isMainLoading && orderedCatIds.map(catId => {
        const cat = catMap[catId];
        const prods = productsByCategory[catId] ?? [];
        if (!cat || prods.length === 0) return null;
        const shown = prods.slice(0, 5);
        const hasMoreInCat = prods.length > 5;
        return (
          <section key={catId} className="container py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {cat.icon && <span className="text-xl leading-none">{cat.icon}</span>}
                <h2 className="text-base md:text-lg font-black text-gray-900">{lang === "uz" && (cat as any).nameUz ? (cat as any).nameUz : cat.name}</h2>
              </div>
              <Link
                href={`/category/${cat.slug}`}
                className="text-sm font-semibold hover:underline flex items-center gap-1"
                style={{ color: "#cc0000" }}
              >
                {t.home_view_all} <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {shown.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {hasMoreInCat && (
              <div className="mt-3 text-center">
                <Link
                  href={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  style={{ color: "#cc0000" }}
                >
                  Ещё {prods.length - 5} товаров <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
        );
      })}

      {/* ── Infinite scroll sentinel & loading indicator ─────────────────── */}
      {/* Sentinel: IntersectionObserver watches this div to trigger next page load */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {/* Loading spinner while fetching next page */}
      {isFetchingMore && (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
          <Loader2 size={20} className="animate-spin" style={{ color: "#cc0000" }} />
          <span className="text-sm font-medium">Загружаем ещё товары...</span>
        </div>
      )}

      {/* End of catalog message */}
      {!hasMore && loadedProducts.length > 0 && !isMainLoading && (
        <div className="text-center py-6 text-sm text-gray-400 font-medium">
          Показано все {loadedProducts.length} товаров
        </div>
      )}

      {/* Recently viewed */}
      <RecentlyViewed />

      {/* Bottom padding for mobile nav */}
      <div className="pb-20 md:pb-8" />
    </div>
  );
}

// ---- PromoBanner component ----
interface BannerData {
  id: number;
  title: string;
  titleUz?: string | null;
  description?: string | null;
  descriptionUz?: string | null;
  bgColor: string;
  textColor: string;
  link?: string | null;
  linkText?: string | null;
  linkTextUz?: string | null;
  endsAt?: Date | null;
}

function PromoBanner({ banner }: { banner: BannerData }) {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    if (!banner.endsAt) return;
    const update = () => {
      const diff = new Date(banner.endsAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d} д ${h} ч`);
      else setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [banner.endsAt]);

  const title = banner.title;
  const desc = banner.description;
  const btnText = banner.linkText || "Смотреть";

  const inner = (
    <div
      className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm"
      style={{ backgroundColor: banner.bgColor, color: banner.textColor }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-black text-base md:text-lg leading-tight">{title}</div>
        {desc && <div className="text-sm opacity-90 mt-0.5 truncate">{desc}</div>}
        {timeLeft && (
          <div className="mt-1 flex items-center gap-1.5 text-xs font-bold opacity-80">
            <span>⏰</span>
            <span>Осталось: {timeLeft}</span>
          </div>
        )}
      </div>
      {banner.link && (
        <div
          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border border-current whitespace-nowrap"
          style={{ color: banner.textColor }}
        >
          {btnText} →
        </div>
      )}
    </div>
  );

  if (banner.link) {
    return <Link href={banner.link}>{inner}</Link>;
  }
  return inner;
}


