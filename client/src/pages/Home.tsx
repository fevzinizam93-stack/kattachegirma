import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();

  // SEO: dynamic document.title (30-60 chars)
  useEffect(() => {
    document.title = lang === "uz"
      ? "Katta Chegirma — Chegirmali uy texnikasi do'koni"
      : "Катта Чегирма — Магазин бытовой техники со скидками";
  }, [lang]);

  const { data: featuredData, isLoading: featuredLoading } = trpc.products.list.useQuery({ featured: true, limit: 10, offset: 0 });
  const { data: newData, isLoading: newLoading } = trpc.products.list.useQuery({ limit: 10, offset: 0 });
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: hitsData } = trpc.products.getHits.useQuery({ limit: 8 });
  const hitProducts = hitsData ?? [];
  const { data: activeBanners } = trpc.banners.listActive.useQuery();
  const banners = activeBanners ?? [];

  const featuredProducts = featuredData?.items ?? [];
  const newProducts = newData?.items ?? [];
  const categories = categoriesData ?? [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* SEO: visually hidden H1 for search engines */}
      <h1 className="sr-only">
        {lang === "uz"
          ? "Katta Chegirma — Oʻzbekistonda eng arzon uy texnikasi"
          : "Катта Чегирма — Дешевая бытовая техника в Узбекистане"}
      </h1>
      {/* SEO: guaranteed H2 always visible to crawlers */}
      <h2 className="sr-only">
        {lang === "uz"
          ? "Chegirmali mahsulotlar — televizor, kir yuvish mashinasi, muzlatgich"
          : "Товары со скидкой — телевизоры, стиральные машины, холодильники"}
      </h2>
      {/* Promo Banners from admin */}
      {banners.length > 0 && (
        <section className="container pt-3">
          <div className="flex flex-col gap-2">
            {banners.map(banner => (
              <PromoBanner key={banner.id} banner={banner} lang={lang} />
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

      {/* Bestsellers / Hits widget */}
      {hitProducts.length > 0 && (
        <section className="container py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={20} className="text-orange-500" />
              <h2 className="text-base md:text-lg font-black text-gray-900">
                {t.nav_bestsellers}
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

function PromoBanner({ banner, lang }: { banner: BannerData; lang: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!banner.endsAt) return;
    const update = () => {
      const diff = new Date(banner.endsAt!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(lang === "uz" ? `${d} kun ${h} soat` : `${d} д ${h} ч`);
      else setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [banner.endsAt, lang]);

  const title = lang === "uz" && banner.titleUz ? banner.titleUz : banner.title;
  const desc = lang === "uz" && banner.descriptionUz ? banner.descriptionUz : banner.description;
  const btnText = lang === "uz" && banner.linkTextUz ? banner.linkTextUz : (banner.linkText || (lang === "uz" ? "Ko'rish" : "Смотреть"));

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
            <span>{lang === "uz" ? "Tugashiga:" : "Осталось:"} {timeLeft}</span>
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
