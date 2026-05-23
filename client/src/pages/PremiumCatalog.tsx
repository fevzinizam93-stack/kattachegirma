import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, Shield, Award, Gem, ChevronRight, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";

const BRANDS = ["Bosch", "LG", "Samsung", "Siemens", "Philips", "Electrolux", "Miele", "AEG"];

function PremiumProductCard({ product }: { product: any }) {
  const cart = useCart();
  const { lang, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const price = Number(product.price);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const discount = product.discount ?? 0;
  const displayName = product.name;

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: displayName,
      price,
      imageUrl: product.imageUrl ?? "",
      quantity: 1,
      slug: product.slug,
    });
    toast.success(t.card_added_to_cart);
  };

  return (
    <div className="group relative bg-white border border-[#d4af37]/40 rounded-2xl overflow-hidden hover:border-[#d4af37] hover:shadow-[0_4px_24px_rgba(212,175,55,0.18)] transition-all duration-300 flex flex-col">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {discount > 0 && (
          <span className="bg-[#d4af37] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {product.isNew && (
          <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
            {t.card_new}
          </span>
        )}
        {product.isHit && (
          <span className="bg-[#d4af37]/15 text-[#b8860b] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#d4af37]/40">
            {t.card_hit}
          </span>
        )}
      </div>

      {/* Premium badge top-right */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/50 rounded-full p-1.5">
          <Gem size={12} className="text-[#d4af37]" />
        </div>
      </div>

      {/* Product image */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative h-48 bg-gradient-to-b from-gray-50 to-white flex items-center justify-center overflow-hidden cursor-pointer">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={displayName}
              className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-[#d4af37]/40 text-5xl">◈</div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {product.brand && (
          <p className="text-[#b8860b] text-[10px] font-bold uppercase tracking-widest mb-1">{product.brand}</p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-gray-800 text-sm font-semibold leading-snug mb-3 hover:text-[#b8860b] transition-colors cursor-pointer line-clamp-2">
            {displayName}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[#b8860b] font-black text-lg">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-gray-400 text-xs line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>

          {/* Original guarantee badges */}
          <div className="flex gap-1.5 mb-3">
            <div className="flex items-center gap-1 bg-[#d4af37]/10 border border-[#d4af37]/40 rounded-full px-2 py-0.5">
              <Shield size={9} className="text-[#b8860b]" />
              <span className="text-[#b8860b] text-[9px] font-semibold">{t.card_original}</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
              <Award size={9} className="text-gray-500" />
              <span className="text-gray-500 text-[9px] font-semibold">{t.premium_badge}</span>
            </div>
          </div>

          {/* CTA Button — golden */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-[#d4af37] to-[#f0d060] text-black font-bold text-sm py-2.5 rounded-xl hover:from-[#e8c84a] hover:to-[#fde272] transition-all duration-200 active:scale-95 shadow-[0_4px_12px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_20px_rgba(212,175,55,0.5)]"
          >
            {t.card_add_to_cart}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PremiumCatalog() {
  const { lang, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  usePageMeta({
    title: "Премиум техника Bosch, LG, Samsung | Катта Чегирма",
    description: "Премиум бытовая техника оригинальных брендов: Bosch, LG, Samsung, Siemens, Philips. Гарантия качества, официальная упаковка. Купите премиум технику с выгодной ценой в Ташкенте. Быстрая доставка по Узбекистану.",
    canonicalPath: "/premium",
  });

  useBreadcrumbSchema([
    { name: "Главная", url: "https://kattachegirma.uz/" },
    { name: "Премиум", url: "https://kattachegirma.uz/premium" },
  ]);

  const { data, isLoading } = trpc.products.list.useQuery({
    isPremium: true,
    search: search || undefined,
    limit: LIMIT,
    offset,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  // Filter by brand client-side for instant feedback
  const filtered = selectedBrand
    ? products.filter(p => p.brand?.toLowerCase() === selectedBrand.toLowerCase())
    : products;

  return (
    <div className="min-h-screen bg-white">
      {/* ===== PREMIUM HERO — white with gold accents ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-[#fffdf5] to-[#fef9e7] border-b border-[#d4af37]/20">
        {/* Subtle gold glow decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#d4af37]/6 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#d4af37]/8 rounded-full blur-3xl" />
        </div>

        <div className="relative container py-10 md:py-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-6">
            <Link href="/" className="hover:text-[#b8860b] transition-colors">
              {t.nav_home}
            </Link>
            <ChevronRight size={12} />
            <span className="text-[#b8860b] font-semibold">{t.nav_premium}</span>
          </div>

          {/* Hero content */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#d4af37] to-[#f0d060] rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(212,175,55,0.35)]">
                  <Gem size={20} className="text-black" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/50 to-transparent max-w-32" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
                {t.premium_title}
              </h1>
              <p className="text-gray-500 text-sm md:text-base max-w-lg">
                {t.premium_subtitle}
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, label: t.card_original },
                { icon: Award, label: t.premium_badge },
                { icon: Star, label: t.card_original },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/40 rounded-xl px-3 py-2">
                  <Icon size={14} className="text-[#b8860b]" />
                  <span className="text-[#b8860b] text-xs font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand filter row */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedBrand(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedBrand === null
                  ? "bg-[#d4af37] text-black border-[#d4af37] shadow-[0_2px_10px_rgba(212,175,55,0.3)]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#d4af37]/60 hover:text-[#b8860b]"
              }`}
            >
              {t.catalog_all_categories}
            </button>
            {BRANDS.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedBrand === brand
                    ? "bg-[#d4af37] text-black border-[#d4af37] shadow-[0_2px_10px_rgba(212,175,55,0.3)]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#d4af37]/60 hover:text-[#b8860b]"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/70" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setOffset(0); }}
              placeholder={t.catalog_search_placeholder}
              className="w-full bg-white border border-[#d4af37]/30 rounded-xl pl-10 pr-4 py-3 text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-[#d4af37] transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Bottom border gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
      </div>

      {/* ===== PRODUCTS GRID ===== */}
      <div className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#b8860b]/60 text-sm">{t.common_loading}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center">
              <Gem size={32} className="text-[#d4af37]/50" />
            </div>
            <p className="text-gray-600 font-semibold">{t.premium_no_products}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400 text-sm">
                {total} {t.catalog_products_found}
              </p>
              <div className="h-px flex-1 mx-4 bg-gradient-to-r from-[#d4af37]/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(product => (
                <PremiumProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex justify-center gap-3 mt-10">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-6 py-2.5 rounded-xl border border-[#d4af37]/40 text-[#b8860b] text-sm font-semibold disabled:opacity-30 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-colors"
                >
                  ←
                </button>
                <span className="px-4 py-2.5 text-gray-400 text-sm">
                  {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
                </span>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-6 py-2.5 rounded-xl border border-[#d4af37]/40 text-[#b8860b] text-sm font-semibold disabled:opacity-30 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== PREMIUM PROMISE FOOTER ===== */}
      <div className="border-t border-[#d4af37]/20 bg-gradient-to-r from-white via-[#fffdf5] to-white">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center text-center">
            <div className="w-8 h-8 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full flex items-center justify-center">
              <Shield size={16} className="text-[#b8860b]" />
            </div>
            <p className="text-gray-500 text-sm max-w-lg">{t.premium_subtitle}</p>
          </div>
        </div>
      </div>

      {/* SEO text block */}
      <section className="container py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-600 leading-relaxed space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Премиум бытовая техника в Узбекистане</h2>
          <p>
            Раздел <strong>Premium</strong> на Katta Chegirma — это техника премиум-класса от ведущих мировых брендов: Bosch, LG, Samsung, Siemens, Miele, Electrolux.
            Официальная гарантия, бесплатная доставка по Ташкенту и выгодные цены.
          </p>
          <p>
            Выбирайте технику, которая прослужит долгие годы — премиум-качество по лучшим ценам в Узбекистане.
          </p>
          <p className="text-xs text-gray-400">
            Premium maishiy texnika: Bosch, LG, Samsung, Siemens, Miele. Rasmiy kafolat, Toshkentda bepul yetkazib berish.
          </p>
        </div>
      </section>
    </div>
  );
}
