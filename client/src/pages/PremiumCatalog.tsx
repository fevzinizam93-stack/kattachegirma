import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, Shield, Award, Gem, ChevronRight, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const BRANDS = ["Bosch", "LG", "Samsung", "Siemens", "Philips", "Electrolux", "Miele", "AEG"];

const PREMIUM_TRANSLATIONS = {
  ru: {
    title: "Оригинал техника",
    subtitle: "100% оригинальные товары от ведущих мировых брендов",
    badge: "Премиум качество",
    guarantee: "Официальная гарантия",
    original: "100% Оригинал",
    certified: "Сертифицировано",
    search: "Поиск по бренду, модели...",
    all_brands: "Все бренды",
    add_to_cart: "Успей по скидке",
    no_products: "Товары скоро появятся",
    no_products_sub: "Следите за обновлениями",
    loading: "Загрузка...",
    price: "Цена",
    discount: "Скидка",
    new: "Новинка",
    hit: "Хит",
    premium_promise: "Мы гарантируем подлинность каждого товара в этом разделе",
  },
  uz: {
    title: "Original texnika",
    subtitle: "Dunyoning yetakchi brendlaridan 100% original mahsulotlar",
    badge: "Premium sifat",
    guarantee: "Rasmiy kafolat",
    original: "100% Original",
    certified: "Sertifikatlangan",
    search: "Brend, model bo'yicha qidirish...",
    all_brands: "Barcha brendlar",
    add_to_cart: "Chegirmaga olish",
    no_products: "Mahsulotlar tez orada qo'shiladi",
    no_products_sub: "Yangilanishlarni kuzating",
    loading: "Yuklanmoqda...",
    price: "Narx",
    discount: "Chegirma",
    new: "Yangi",
    hit: "Hit",
    premium_promise: "Ushbu bo'limdagi har bir mahsulotning haqiqiyligini kafolatlaymiz",
  },
};

function PremiumProductCard({ product, lang }: { product: any; lang: string }) {
  const t = PREMIUM_TRANSLATIONS[lang as keyof typeof PREMIUM_TRANSLATIONS] ?? PREMIUM_TRANSLATIONS.ru;
  const cart = useCart();
  const price = Number(product.price);
  const originalPrice = product.originalPrice ? Number(product.originalPrice) : null;
  const discount = product.discount ?? 0;

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price,
      imageUrl: product.imageUrl ?? "",
      quantity: 1,
      slug: product.slug,
    });
    toast.success(lang === "uz" ? "Savatga qo'shildi" : "Добавлено в корзину", {
      style: { background: "#1a1a2e", color: "#d4af37", border: "1px solid #d4af37" },
    });
  };

  return (
    <div className="group relative bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border border-[#d4af37]/30 rounded-2xl overflow-hidden hover:border-[#d4af37]/70 transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {discount > 0 && (
          <span className="bg-[#d4af37] text-black text-[10px] font-black px-2 py-0.5 rounded-full">
            -{discount}%
          </span>
        )}
        {product.isNew && (
          <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
            {t.new}
          </span>
        )}
        {product.isHit && (
          <span className="bg-[#d4af37]/20 text-[#d4af37] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#d4af37]/40">
            {t.hit}
          </span>
        )}
      </div>

      {/* Premium badge top-right */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/40 rounded-full p-1.5">
          <Gem size={12} className="text-[#d4af37]" />
        </div>
      </div>

      {/* Product image */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative h-48 bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e] flex items-center justify-center overflow-hidden cursor-pointer">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-[#d4af37]/30 text-5xl">◈</div>
          )}
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {product.brand && (
          <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-widest mb-1">{product.brand}</p>
        )}
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-white text-sm font-semibold leading-snug mb-3 hover:text-[#d4af37] transition-colors cursor-pointer line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-end gap-2 mb-3">
            <span className="text-[#d4af37] font-black text-lg">
              {price.toLocaleString()} сум
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-white/30 text-xs line-through">
                {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Original guarantee badges */}
          <div className="flex gap-1.5 mb-3">
            <div className="flex items-center gap-1 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-full px-2 py-0.5">
              <Shield size={9} className="text-[#d4af37]" />
              <span className="text-[#d4af37] text-[9px] font-semibold">{t.original}</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
              <Award size={9} className="text-white/50" />
              <span className="text-white/50 text-[9px] font-semibold">{t.guarantee}</span>
            </div>
          </div>

          {/* CTA Button — golden */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-[#d4af37] to-[#f0d060] text-black font-bold text-sm py-2.5 rounded-xl hover:from-[#e8c84a] hover:to-[#fde272] transition-all duration-200 active:scale-95 shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)]"
          >
            {t.add_to_cart}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PremiumCatalog() {
  const { lang } = useLanguage();
  const t = PREMIUM_TRANSLATIONS[lang as keyof typeof PREMIUM_TRANSLATIONS] ?? PREMIUM_TRANSLATIONS.ru;
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Override page theme to dark premium
  useEffect(() => {
    document.title = lang === "uz"
      ? "Original texnika — Katta Chegirma"
      : "Оригинал техника — Katta Chegirma";
    document.body.classList.add("premium-mode");
    return () => {
      document.body.classList.remove("premium-mode");
    };
  }, [lang]);

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
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* ===== PREMIUM HERO ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0d0d20]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#d4af37]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#d4af37]/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/3 rounded-full blur-3xl" />
        </div>

        <div className="relative container py-12 md:py-16">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/30 text-xs mb-6">
            <Link href="/" className="hover:text-[#d4af37] transition-colors">
              {lang === "uz" ? "Bosh sahifa" : "Главная"}
            </Link>
            <ChevronRight size={12} />
            <span className="text-[#d4af37]">{t.title}</span>
          </div>

          {/* Hero content */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#d4af37] to-[#f0d060] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  <Gem size={20} className="text-black" />
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#d4af37]/50 to-transparent max-w-32" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                {t.title}
              </h1>
              <p className="text-white/50 text-sm md:text-base max-w-lg">
                {t.subtitle}
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, label: t.original },
                { icon: Award, label: t.guarantee },
                { icon: Star, label: t.certified },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl px-3 py-2">
                  <Icon size={14} className="text-[#d4af37]" />
                  <span className="text-[#d4af37] text-xs font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand logos row */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedBrand(null)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedBrand === null
                  ? "bg-[#d4af37] text-black border-[#d4af37]"
                  : "bg-white/5 text-white/60 border-white/10 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
              }`}
            >
              {t.all_brands}
            </button>
            {BRANDS.map(brand => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedBrand === brand
                    ? "bg-[#d4af37] text-black border-[#d4af37]"
                    : "bg-white/5 text-white/60 border-white/10 hover:border-[#d4af37]/40 hover:text-[#d4af37]"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/60" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setOffset(0); }}
              placeholder={t.search}
              className="w-full bg-white/5 border border-[#d4af37]/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#d4af37]/60 transition-colors"
            />
          </div>
        </div>

        {/* Bottom border gradient */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
      </div>

      {/* ===== PRODUCTS GRID ===== */}
      <div className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#d4af37]/60 text-sm">{t.loading}</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center">
              <Gem size={32} className="text-[#d4af37]/40" />
            </div>
            <p className="text-white/60 font-semibold">{t.no_products}</p>
            <p className="text-white/30 text-sm">{t.no_products_sub}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/40 text-sm">
                {total} {lang === "uz" ? "ta mahsulot" : "товаров"}
              </p>
              <div className="h-px flex-1 mx-4 bg-gradient-to-r from-[#d4af37]/20 to-transparent" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(product => (
                <PremiumProductCard key={product.id} product={product} lang={lang} />
              ))}
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex justify-center gap-3 mt-10">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  className="px-6 py-2.5 rounded-xl border border-[#d4af37]/30 text-[#d4af37] text-sm font-semibold disabled:opacity-30 hover:border-[#d4af37] transition-colors"
                >
                  ←
                </button>
                <span className="px-4 py-2.5 text-white/40 text-sm">
                  {Math.floor(offset / LIMIT) + 1} / {Math.ceil(total / LIMIT)}
                </span>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => setOffset(offset + LIMIT)}
                  className="px-6 py-2.5 rounded-xl border border-[#d4af37]/30 text-[#d4af37] text-sm font-semibold disabled:opacity-30 hover:border-[#d4af37] transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== PREMIUM PROMISE FOOTER ===== */}
      <div className="border-t border-[#d4af37]/20 bg-gradient-to-r from-[#0a0a1a] via-[#1a1a2e] to-[#0a0a1a]">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-center text-center">
            <div className="w-8 h-8 bg-[#d4af37]/10 rounded-full flex items-center justify-center">
              <Shield size={16} className="text-[#d4af37]" />
            </div>
            <p className="text-white/40 text-sm max-w-lg">{t.premium_promise}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
