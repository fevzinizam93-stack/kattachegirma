import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Flame, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();

  const { data: featuredData, isLoading: featuredLoading } = trpc.products.list.useQuery({ featured: true, limit: 10, offset: 0 });
  const { data: newData, isLoading: newLoading } = trpc.products.list.useQuery({ limit: 10, offset: 0 });
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: hitsData } = trpc.products.getHits.useQuery({ limit: 8 });
  const hitProducts = hitsData ?? [];

  const featuredProducts = featuredData?.items ?? [];
  const newProducts = newData?.items ?? [];
  const categories = categoriesData ?? [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Banner + Hits strip combined on white background */}
      <section className="bg-white border-b border-gray-200">
        {/* Top row: БОЛЬШИЕ СКИДКИ + lowest prices + view all */}
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-black text-base md:text-2xl px-4 py-2 md:px-5 md:py-2.5 rounded-full" style={{ backgroundColor: "#cc0000" }}>
              <Tag size={18} />
              {t.home_big_discounts}
            </div>
            <div className="hidden md:block text-gray-600 text-sm font-medium flex-1 text-center px-6">
              {t.home_lowest_prices}
            </div>
            <Link href="/catalog?featured=true" className="flex items-center gap-1 text-sm font-semibold hover:underline whitespace-nowrap" style={{ color: "#cc0000" }}>
              {t.home_view_all} <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* 🔥 Hits strip — orange row on white background */}
        {hitProducts.length > 0 && (
          <Link href="/bestsellers">
            <div className="relative overflow-hidden cursor-pointer border-t border-orange-100" style={{ background: "linear-gradient(90deg, #fff3e0 0%, #ffe0b2 40%, #ffcc80 70%, #ffb74d 100%)" }}>
              {/* Subtle fire particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-[8%] text-2xl opacity-20 animate-bounce" style={{ animationDelay: "0s", animationDuration: "2s" }}>🔥</div>
                <div className="absolute top-0 left-[30%] text-xl opacity-15 animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}>🔥</div>
                <div className="absolute top-0 right-[20%] text-2xl opacity-20 animate-bounce" style={{ animationDelay: "1s", animationDuration: "1.8s" }}>🔥</div>
                <div className="absolute top-0 right-[40%] text-lg opacity-15 animate-bounce" style={{ animationDelay: "0.7s", animationDuration: "2.2s" }}>🔥</div>
              </div>
              <div className="container relative z-10">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">🔥</span>
                    <div>
                      <span className="font-black text-base md:text-lg leading-tight" style={{ color: "#bf360c" }}>
                        {lang === "uz" ? "Sotuvdagi HITLAR!" : "ХИТЫ ПРОДАЖ!"}
                      </span>
                      <span className="hidden md:inline text-sm font-medium ml-3" style={{ color: "#e65100" }}>
                        {lang === "uz" ? "Eng ko'p sotilgan mahsulotlar" : "Самые популярные товары по лучшим ценам"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-full border shrink-0" style={{ color: "#bf360c", borderColor: "#e65100", backgroundColor: "rgba(255,255,255,0.6)" }}>
                    {lang === "uz" ? "Ko'rish" : "Смотреть"} <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}
      </section>

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

      {/* Bestsellers / Hits widget */}
      {hitProducts.length > 0 && (
        <section className="container py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-500" />
              <h2 className="text-base md:text-lg font-black text-gray-900">
                {lang === "uz" ? "Sotuvdagi hitlar" : "Хиты продаж"}
              </h2>
            </div>
            <Link href="/bestsellers" className="text-sm font-semibold hover:underline flex items-center gap-1" style={{ color: "#cc0000" }}>
              {t.home_view_all} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {hitProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="container py-3">
        {featuredLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="bg-white rounded-lg border border-gray-200 h-56 animate-pulse" />)}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {newProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* All products */}
      {featuredProducts.length > 0 && (
        <section className="container pb-20 md:pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-black text-gray-900">{t.home_all_products}</h2>
            <Link href="/catalog" className="text-sm font-semibold hover:underline" style={{ color: "#cc0000" }}>
              {t.home_view_all} <ArrowRight size={14} className="inline" />
            </Link>
          </div>
          {newLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="bg-white rounded-lg border border-gray-200 h-56 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
              {newProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
