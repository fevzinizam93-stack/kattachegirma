import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import RecentlyViewed from "@/components/RecentlyViewed";

// Categories that have products (with their slugs for linking)
// We'll fetch products per category dynamically
const CATEGORY_ORDER = [120001, 1, 2, 30001, 9, 150001, 8, 13];

export default function Home() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  // SEO: dynamic meta tags for homepage
  usePageMeta({
    title: "Катта Чегирма — Магазин бытовой техники со скидками",
    description: "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры и другая техника ведущих брендов со скидками до 60%. Быстрая доставка по Ташкенту и всему Узбекистану.",
    canonicalPath: "/",
    imageUrl: "https://kattachegirma.uz/logo-512.png?v=3",
  });

  // Hits — primary content, load first
  const { data: hitsData } = trpc.products.getHits.useQuery(
    { limit: 50 },
    { staleTime: 3 * 60 * 1000 }
  );
  const hitProducts = hitsData ?? [];
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
      // If we've scrolled past the first copy, silently jump back to same position in first copy
      if (el.scrollLeft >= half - 5) {
        el.scrollLeft = el.scrollLeft - half;
      }
      el.scrollBy({ left: 240, behavior: "smooth" });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Secondary content — categories and banners
  const { data: categoriesData } = trpc.categories.list.useQuery(
    undefined,
    { staleTime: 10 * 60 * 1000 }
  );
  const { data: activeBanners } = trpc.banners.listActive.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );
  const banners = activeBanners ?? [];
  const categories = categoriesData ?? [];

  // All products — used for category sections
  const { data: allProductsData } = trpc.products.list.useQuery(
    { limit: 200, offset: 0 },
    { staleTime: 3 * 60 * 1000 }
  );
  const allProducts = allProductsData?.items ?? [];

  // Group products by categoryId
  const productsByCategory: Record<number, typeof allProducts> = {};
  for (const p of allProducts) {
    if (!productsByCategory[p.categoryId]) productsByCategory[p.categoryId] = [];
    productsByCategory[p.categoryId].push(p);
  }

  // Build category sections: only categories that have products, in preferred order
  const catMap: Record<number, (typeof categories)[0]> = {};
  for (const c of categories) catMap[c.id] = c;

  // Ordered list of categories that have products
  const orderedCatIds = [
    ...CATEGORY_ORDER.filter(id => productsByCategory[id]?.length > 0),
    ...Object.keys(productsByCategory)
      .map(Number)
      .filter(id => !CATEGORY_ORDER.includes(id) && productsByCategory[id]?.length > 0),
  ];

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
          <div className="flex gap-2 px-3 py-2.5 w-max">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate(`/category/${cat.slug}`)}
                className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation min-w-[64px]"
              >
                <span className="text-2xl leading-none">{cat.icon}</span>
                <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight line-clamp-2 max-w-[60px]">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bestsellers / Hits widget — horizontal slider */}
      {hitProducts.length > 0 && (
        <section className="py-4" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fff3e0 50%, #fef9f0 100%)", borderTop: "3px solid #ffffff", borderBottom: "3px solid #ffffff" }}>
          <div className="container">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                  <Flame size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base md:text-xl font-black" style={{ color: "#c2410c" }}>
                    {t.nav_bestsellers}
                  </h2>
                  <p className="text-xs font-medium" style={{ color: "#ea580c" }}>Самые горячие скидки</p>
                </div>
                <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{ background: "#f97316", color: "white" }}>ГОРЯЧО</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => scrollSlider("left")} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-500 transition-colors shadow-sm">
                  <ChevronLeft size={16} className="text-orange-600" />
                </button>
                <button onClick={() => scrollSlider("right")} className="hidden md:flex items-center justify-center w-8 h-8 rounded-full border-2 border-orange-300 bg-white hover:bg-orange-50 hover:border-orange-500 transition-colors shadow-sm">
                  <ChevronRight size={16} className="text-orange-600" />
                </button>
                <Link href="/bestsellers" className="text-sm font-bold flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors" style={{ color: "#c2410c", background: "rgba(249,115,22,0.12)" }}>
                  {t.home_view_all} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            {/* Horizontal scroll row */}
            <div className="relative">
              <div
                ref={sliderRef}
                className="flex gap-3 overflow-x-auto pb-2"
                style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
                onMouseEnter={() => { sliderPausedRef.current = true; }}
                onMouseLeave={() => { sliderPausedRef.current = false; }}
                onTouchStart={() => { sliderPausedRef.current = true; }}
                onTouchEnd={() => { setTimeout(() => { sliderPausedRef.current = false; }, 2000); }}
              >
                {[...hitProducts, ...hitProducts].map((p, idx) => (
                  <div key={`${p.id}-${idx}`} className="shrink-0" style={{ width: "220px", scrollSnapAlign: "start" }}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category sections — one section per category that has products */}
      {orderedCatIds.map(catId => {
        const cat = catMap[catId];
        const prods = productsByCategory[catId] ?? [];
        if (!cat || prods.length === 0) return null;
        const shown = prods.slice(0, 5);
        const hasMore = prods.length > 5;
        return (
          <section key={catId} className="container py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {cat.icon && <span className="text-xl leading-none">{cat.icon}</span>}
                <h2 className="text-base md:text-lg font-black text-gray-900">{cat.name}</h2>
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
            {hasMore && (
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

// Need React for useState/useEffect in PromoBanner
import React from "react";
