import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link } from "wouter";
import { Clock, X } from "lucide-react";

export default function RecentlyViewed() {
  const { items, clearHistory } = useRecentlyViewed();
  const { formatPrice } = useCurrency();

  if (items.length === 0) return null;

  return (
    <section className="py-4">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            <h2 className="text-base font-black text-gray-900">Вы недавно смотрели</h2>
          </div>
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={12} />
            Очистить
          </button>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {items.map((product) => {
            const origPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
            const currPrice = parseFloat(product.price);
            const hasDiscount = origPrice !== null && origPrice > currPrice;
            const discountPct = hasDiscount && origPrice
              ? Math.round(((origPrice - currPrice) / origPrice) * 100)
              : (product.discount ?? 0);
            const inStock = !product.stock || product.stock > 0;

            return (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="flex-shrink-0 w-[130px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all group"
              >
                {/* Image */}
                <div className="relative bg-gray-50" style={{ paddingBottom: "70%" }}>
                  <div className="absolute inset-0 flex items-center justify-center p-1.5">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl text-gray-200">📦</span>
                    )}
                  </div>
                  {hasDiscount && (
                    <div className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                      -{discountPct}%
                    </div>
                  )}
                  {!inStock && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">Нет в наличии</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-1.5">
                  {product.brand && (
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide truncate mb-0.5">
                      {product.brand}
                    </p>
                  )}
                  <p className="text-[10px] font-medium text-gray-800 line-clamp-2 leading-snug mb-1 group-hover:text-red-600 transition-colors">
                    {product.name}
                  </p>
                  <div>
                    {hasDiscount && product.originalPrice ? (
                      <>
                        <span className="text-[9px] text-gray-400 line-through block leading-tight">
                          {formatPrice(product.originalPrice)}
                        </span>
                        <span className="text-xs font-black leading-tight" style={{ color: "#cc0000" }}>
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-black leading-tight" style={{ color: "#cc0000" }}>
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
