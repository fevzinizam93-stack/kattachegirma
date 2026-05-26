import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Tag, Clock, Flame, ShoppingCart, ChevronRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

// Countdown timer hook
function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const now = Date.now();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// Single product countdown component
function ProductCountdown({ endsAt }: { endsAt: Date }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(endsAt);
  if (expired) return <span className="text-xs text-gray-400">Акция завершена</span>;
  return (
    <div className="flex items-center gap-1 text-xs">
      <Clock size={11} className="text-red-500 shrink-0" />
      <span className="text-gray-600">Осталось:</span>
      {days > 0 && <span className="font-bold text-red-600">{days}д</span>}
      <span className="font-bold text-red-600">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
    </div>
  );
}

// Hero countdown — nearest deadline
function HeroCountdown({ products }: { products: any[] }) {
  const nearest = products
    .filter(p => p.discountEndsAt)
    .map(p => new Date(p.discountEndsAt))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const { days, hours, minutes, seconds, expired } = useCountdown(nearest);

  if (!nearest || expired) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-3">
      <span className="text-white/80 text-sm">До конца акции:</span>
      <div className="flex gap-1.5">
        {days > 0 && (
          <div className="bg-white/20 backdrop-blur rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
            <div className="text-xl font-black text-white leading-none">{days}</div>
            <div className="text-white/70 text-[10px] mt-0.5">дней</div>
          </div>
        )}
        <div className="bg-white/20 backdrop-blur rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
          <div className="text-xl font-black text-white leading-none">{String(hours).padStart(2, '0')}</div>
          <div className="text-white/70 text-[10px] mt-0.5">часов</div>
        </div>
        <div className="text-white text-xl font-black self-center mb-1">:</div>
        <div className="bg-white/20 backdrop-blur rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
          <div className="text-xl font-black text-white leading-none">{String(minutes).padStart(2, '0')}</div>
          <div className="text-white/70 text-[10px] mt-0.5">минут</div>
        </div>
        <div className="text-white text-xl font-black self-center mb-1">:</div>
        <div className="bg-white/20 backdrop-blur rounded-lg px-2.5 py-1.5 text-center min-w-[44px]">
          <div className="text-xl font-black text-white leading-none">{String(seconds).padStart(2, '0')}</div>
          <div className="text-white/70 text-[10px] mt-0.5">секунд</div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();

  usePageMeta({
    title: "Акции и скидки на бытовую технику | Катта Чегирма",
    description: "Горячие акции и скидки на стиральные машины, холодильники, пылесосы и кондиционеры в Узбекистане. Бесплатная доставка по Ташкенту.",
    canonicalPath: "/sales",
    keywordsUz: "chegirma maishiy texnika, aksiya kir yuvish mashinalar, aksiya muzlatgichlar, chegirma Toshkent",
  });

  const { data: products, isLoading } = trpc.products.getSales.useQuery({});
  const [minDiscount, setMinDiscount] = useState(0);
  const [sortBy, setSortBy] = useState("discount");

  const handleAddToCart = useCallback((product: any) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
      quantity: 1,
    });
    toast.success("Добавлено в корзину!");
  }, [addItem]);

  const getDiscount = (product: any) => {
    if (!product.originalPrice) return 0;
    const orig = Number(product.originalPrice);
    const curr = Number(product.price);
    if (orig <= curr) return 0;
    return Math.round(((orig - curr) / orig) * 100);
  };

  const filteredProducts = products?.filter((p: any) => getDiscount(p) >= minDiscount) ?? [];
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    if (sortBy === "discount") return getDiscount(b) - getDiscount(a);
    if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
    if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
    if (sortBy === "ending") {
      const aEnd = a.discountEndsAt ? new Date(a.discountEndsAt).getTime() : Infinity;
      const bEnd = b.discountEndsAt ? new Date(b.discountEndsAt).getTime() : Infinity;
      return aEnd - bEnd;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white">
        <div className="container py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame size={28} className="text-yellow-300" />
            <h1 className="text-2xl sm:text-3xl font-black">Горячие акции</h1>
            <Flame size={28} className="text-yellow-300" />
          </div>
          <p className="text-white/80 text-sm sm:text-base">
            Лучшие скидки на технику — только ограниченное время!
          </p>
          {products && products.length > 0 && (
            <HeroCountdown products={products} />
          )}
        </div>
      </div>

      {/* Stats bar */}
      {products && products.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="container py-3 flex items-center gap-4 text-sm overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <Tag size={15} className="text-red-500" />
              <span className="font-semibold text-gray-700">{products.length} товаров со скидкой</span>
            </div>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-gray-500">Скидка до</span>
              <span className="font-black text-red-600 text-base">
                -{Math.max(...products.map(getDiscount))}%
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <Link href="/catalog">
              <span className="text-red-600 font-medium hover:underline flex items-center gap-1 shrink-0">
                Весь каталог <ChevronRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Фильтр по размеру скидки */}
      {products && products.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="container py-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { label: "Все", min: 0 },
              { label: "От 10%", min: 10 },
              { label: "От 20%", min: 20 },
              { label: "От 30%", min: 30 },
              { label: "От 50%", min: 50 },
            ].map(filter => (
              <button
                key={filter.min}
                onClick={() => setMinDiscount(filter.min)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  minDiscount === filter.min
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Сортировка */}
      {products && products.length > 0 && (
        <div className="container pt-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">{sortedProducts.length} товаров</p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary bg-white"
          >
            <option value="discount">По скидке</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
            <option value="ending">Заканчиваются скоро</option>
          </select>
        </div>
      )}

      {/* Products grid */}
      <div className="container py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                <div className="h-3 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedProducts.map((product: any) => {
              const discount = getDiscount(product);
              const endsAt = product.discountEndsAt ? new Date(product.discountEndsAt) : null;
              return (
                <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                  {/* Image */}
                  <Link href={`/product/${product.slug}`}>
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                      {/* Discount badge */}
                      {discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded-md">
                          -{discount}%
                        </div>
                      )}
                      {/* Timer badge */}
                      {endsAt && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <ProductCountdown endsAt={endsAt} />
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-2.5">
                    {product.brand && (
                      <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide mb-0.5">{product.brand}</p>
                    )}
                    <Link href={`/product/${product.slug}`}>
                      <h3 className="text-xs font-semibold line-clamp-2 hover:text-primary transition-colors leading-snug mb-1.5">
                        {product.name}
                      </h3>
                    </Link>

                    {/* Prices */}
                    <div className="mb-2">
                      {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                        <p className="text-[10px] text-gray-400 line-through leading-none mb-0.5">
                          {formatPrice(Number(product.originalPrice))}
                        </p>
                      )}
                      <p className="text-sm font-black text-red-600 leading-none">
                        {formatPrice(Number(product.price))}
                      </p>
                    </div>

                    {/* Add to cart */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 active:opacity-80 touch-manipulation"
                    >
                      <ShoppingCart size={12} />
                      Успей по скидке
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Tag size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-black text-gray-700 mb-2">Акций пока нет</h2>
            <p className="text-gray-500 text-sm mb-6">Следите за обновлениями — скидки появятся скоро!</p>
            <Link href="/catalog">
              <button className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                Смотреть все товары
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* SEO text block */}
      <section className="container py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-600 leading-relaxed space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Акции и скидки на бытовую технику в Узбекистане</h2>
          <p>
            Интернет-магазин <strong>Katta Chegirma</strong> предлагает выгодные акции и скидки на стиральные машины, холодильники, пылесосы, кондиционеры и другую крупную бытовую технику.
            Мы сотрудничаем с официальными дилерами и проверенными продавцами, чтобы обеспечить лучшие цены и гарантию качества.
          </p>
          <p>
            Следите за ограниченными предложениями — каждая акция действует ограниченное время.
            Доставка по Ташкенту бесплатная, отправка по всему Узбекистану.
          </p>
          <p className="text-xs text-gray-400">
            Maishiy texnika uchun chegirmalar: kir yuvish mashinalari, muzlatgichlar, changyutkichlar, konditsionerlar. Toshkentda bepul yetkazib berish.
          </p>
        </div>
      </section>
    </div>
  );
}
