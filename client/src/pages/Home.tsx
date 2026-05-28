import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import RecentlyViewed from "@/components/RecentlyViewed";
import SocialProofBlock from "@/components/SocialProofBlock";

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// How many products to show per category section on home page
const PER_CATEGORY = 5;
// How many products to load per infinite scroll page
const PAGE_SIZE = 40;

// ---- Skeleton card ----
function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col animate-pulse" style={{ border: '1px solid #f0f0f0' }}>
      {/* Match fixed 220px photo height */}
      <div className="bg-gray-100" style={{ height: '220px', width: '100%', flexShrink: 0 }} />
      {/* Match fixed 130px text block height */}
      <div className="p-3 flex flex-col gap-1.5" style={{ height: '130px', overflow: 'hidden' }}>
        <div className="h-2.5 w-14 bg-gray-200 rounded" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-full" />
          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        </div>
        <div className="h-5 w-24 bg-gray-200 rounded mt-auto" />
      </div>
      <div className="px-3 pb-3">
        <div className="h-9 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function HitsSliderSkeleton() {
  return (
    <section className="py-4" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fff3e0 50%, #fef9f0 100%)", borderTop: "3px solid #ffffff", borderBottom: "3px solid #ffffff", minHeight: '280px' }}>
      <div className="container">
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

function CategorySectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="container py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
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

  usePageMeta({
    title: "Катта Чегирма — Магазин бытовой техники со скидками",
    description: "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры и другая техника ведущих брендов со скидками до 60%. Быстрая доставка по Ташкенту и всему Узбекистану.",
    canonicalPath: "/",
    imageUrl: "https://kattachegirma.uz/logo-512.png?v=4",
    keywordsUz: "arzon maishiy texnika, kir yuvish mashina sotib olish, muzlatgich arzon, changyutgich Toshkent, konditsioner narxi, televizor chegirma, Katta Chegirma",
  });

  // Optimized: single request for all home page data
  const { data: homePageData, isLoading: homePageLoading } = trpc.products.getHomePage.useQuery(
    undefined,
    { staleTime: 3 * 60 * 1000 }
  );
  const hitsData = homePageData?.hits;
  const hitsLoading = homePageLoading;
  const categoriesData = homePageData?.categories;
  const categoriesLoading = homePageLoading;
  const banners = homePageData?.banners ?? [];
  const categories = categoriesData ?? [];

  const hitProducts = useMemo(() => shuffleArray(hitsData ?? []), [hitsData]);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderPausedRef = useRef(false);
  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return;
    sliderRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };
  useEffect(() => {
    const interval = setInterval(() => {
      if (sliderPausedRef.current || !sliderRef.current) return;
      const el = sliderRef.current;
      const half = el.scrollWidth / 2;
      if (el.scrollLeft >= half - 5) el.scrollLeft = el.scrollLeft - half;
      el.scrollBy({ left: 240, behavior: "smooth" });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Build stable list of category IDs once categories are loaded
  const categoryIds = useMemo(
    () => categories.map(c => c.id),
    [categories]
  );

  // Load products per category — guaranteed N items per section
  const { data: productsByCatRaw, isLoading: productsByCatLoading } = trpc.products.listByCategories.useQuery(
    { categoryIds, perCategory: PER_CATEGORY },
    {
      enabled: categoryIds.length > 0,
      staleTime: 3 * 60 * 1000,
    }
  );

  // productsByCat: Record<number, Product[]>
  const productsByCat = (productsByCatRaw ?? {}) as Record<number, any[]>;

  // Build ordered category list — only categories with products
  const catMap: Record<number, (typeof categories)[0]> = {};
  for (const c of categories) catMap[c.id] = c;

  // Preferred order: popular categories first
  const PREFERRED_ORDER = [210001, 2, 210002, 1, 150001, 30001, 270001, 180001, 300001, 8, 330001, 6, 240001, 90001, 13];
  const orderedCatIds = useMemo(() => {
    const withProducts = Object.keys(productsByCat).map(Number).filter(id => productsByCat[id]?.length > 0);
    return [
      ...PREFERRED_ORDER.filter(id => withProducts.includes(id)),
      ...withProducts.filter(id => !PREFERRED_ORDER.includes(id)),
    ];
  }, [productsByCat]);

  // ── Infinite scroll for "all products" section at the bottom ──────────────
  const [moreProducts, setMoreProducts] = useState<any[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
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
        setMoreProducts(prev => [...prev, ...result.items]);
        const newOffset = currentOffset + result.items.length;
        setCurrentOffset(newOffset);
        setHasMore(newOffset < result.total);
      }
    } catch {
      // silently ignore
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, currentOffset, utils]);

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
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, fetchNextPage]);

  // Group extra products by category for display
  const moreProductsByCat: Record<number, any[]> = {};
  for (const p of moreProducts) {
    if (!moreProductsByCat[p.categoryId]) moreProductsByCat[p.categoryId] = [];
    moreProductsByCat[p.categoryId].push(p);
  }

  const isMainLoading = hitsLoading || categoriesLoading || productsByCatLoading;

  return (
    <div className="min-h-screen bg-gray-100">
      <h1 className="sr-only">Катта Чегирма — Дешевая бытовая техника в Узбекистане</h1>
      <h2 className="sr-only">Товары со скидкой — телевизоры, стиральные машины, холодильники</h2>

      {/* Promo Banners */}
      {banners.length > 0 && (
        <section className="container pt-3">
          <div className="flex flex-col gap-2 min-h-[120px]">
            {banners.map(banner => (
              <PromoBanner key={banner.id} banner={banner} />
            ))}
          </div>
        </section>
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
            {/* Desktop: same grid as category sections — identical card size */}
            <div className="hidden md:grid grid-cols-5 gap-2 sm:gap-3">
              {hitProducts.slice(0, 5).map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
            {/* Mobile: 2-column grid, show first 4 items */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              {hitProducts.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Loading skeletons */}
      {isMainLoading && (
        <>
          <CategorySectionSkeleton count={5} />
          <CategorySectionSkeleton count={5} />
          <CategorySectionSkeleton count={4} />
        </>
      )}

      {/* Category sections — guaranteed products per category */}
      {!isMainLoading && orderedCatIds.map(catId => {
        const cat = catMap[catId];
        const prods = productsByCat[catId] ?? [];
        // Also merge any extra products from infinite scroll for this category
        const extraProds = (moreProductsByCat[catId] ?? []).filter(
          p => !prods.some((ep: any) => ep.id === p.id)
        );
        const allProds = [...prods, ...extraProds];
        if (!cat || allProds.length === 0) return null;
        const shown = allProds.slice(0, PER_CATEGORY);
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
              {shown.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
            {/* Link to full category */}
            <div className="mt-3 text-center">
              <Link
                href={`/category/${cat.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                style={{ color: "#cc0000" }}
              >
                Смотреть все товары категории <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />

      {isFetchingMore && (
        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
          <Loader2 size={20} className="animate-spin" style={{ color: "#cc0000" }} />
          <span className="text-sm font-medium">Загружаем ещё товары...</span>
        </div>
      )}

      {!hasMore && moreProducts.length > 0 && !isMainLoading && (
        <div className="text-center py-6 text-sm text-gray-600 font-medium">
          Все товары загружены
        </div>
      )}

      <RecentlyViewed />
      <SocialProofBlock />
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
      style={{ backgroundColor: banner.bgColor, color: banner.textColor, minHeight: '100px' }}
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
