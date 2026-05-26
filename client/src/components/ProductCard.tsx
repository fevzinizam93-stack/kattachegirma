import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ShoppingCart, Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import CompareModal from "@/components/CompareModal";
import { trpc } from "@/lib/trpc";
import { imgUrl } from "@/lib/imgUrl";
import { useAnalytics } from "@/hooks/useAnalytics";

interface Product {
  id: number;
  name: string;
  nameUz?: string | null;
  slug: string;
  brand?: string | null;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  thumbUrl?: string | null;
  isNew?: boolean | null;
  isFeatured?: boolean | null;
  isHit?: boolean | null;
  isPremium?: boolean | null;
  stock?: number | null;
  sellerId?: number | null;
  sellerName?: string | null;
  costPrice?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const [compareOpen, setCompareOpen] = useState(false);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const isWishlisted = inWishlist(product.id);
  const { track } = useAnalytics();

  // Track product click for auto-hit scoring (fire-and-forget, using fetch)
  const trackClick = { mutate: (data: { productId: number }) => {
    fetch('/api/trpc/hits.trackClick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: data }),
    }).catch(() => {});
  }};
  const displayName = lang === "uz" && product.nameUz ? product.nameUz : product.name;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: displayName,
      price: parseFloat(product.price),
      quantity: 1,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
    });
    track("add_to_cart", { productId: product.id, productName: displayName });
    toast.success(t.card_added_to_cart, {
      description: displayName,
      duration: 2000,
    });
  };

  const origPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const currPrice = parseFloat(product.price);
  const hasDiscount = origPrice !== null && origPrice > currPrice;
  const discountPercent = hasDiscount && origPrice
    ? Math.round(((origPrice - currPrice) / origPrice) * 100)
    : (product.discount ?? 0);
  const inStock = !product.stock || product.stock > 0;

  return (
    <>
    <div className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow duration-200" style={{ border: '1px solid #f0f0f0' }}>
      <Link
        href={`/product/${product.slug}`}
        onClick={() => {
          trackClick.mutate({ productId: product.id });
          track("product_click", { productId: product.id, productName: displayName });
        }}
        className="flex flex-col flex-1 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
      >
        {/* Square photo — Uzum style */}
        <div className="relative bg-gray-50" style={{ aspectRatio: '1 / 1', width: '100%' }}>
          {product.imageUrl ? (
            <img
              src={product.thumbUrl ? imgUrl(product.thumbUrl) : imgUrl(product.imageUrl, 400, 80)}
              alt={displayName}
              className="w-full h-full object-contain p-2"
              loading="lazy"
              decoding="async"
              width="300"
              height="300"
              sizes="(max-width: 640px) 48vw, (max-width: 768px) 32vw, (max-width: 1024px) 24vw, 260px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">📦</div>
          )}

          {/* Badges top-left */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && discountPercent > 0 && (
              <span className="text-white text-xs font-bold px-2 py-0.5 rounded-lg leading-none shadow-sm" style={{ backgroundColor: "#cc0000" }}>-{discountPercent}%</span>
            )}
            {product.isNew && (
              <span className="text-white text-xs font-bold px-2 py-0.5 rounded-lg leading-none" style={{ backgroundColor: "#388e3c" }}>{t.card_new}</span>
            )}
            {product.isHit && (
              <span className="text-white text-xs font-bold px-2 py-0.5 rounded-lg leading-none flex items-center gap-0.5" style={{ backgroundColor: "#e65100" }}>🔥 {t.card_hit}</span>
            )}
          </div>

          {/* Premium badge */}
          {product.isPremium && (
            <div className="absolute top-2 right-10">
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-lg leading-none flex items-center gap-0.5" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#d4af37', border: '1px solid #d4af37' }}>◈ {t.card_original}</span>
            </div>
          )}

          {/* Wishlist button — top right */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const wasWishlisted = isWishlisted;
              toggleWishlist(product.id);
              track(wasWishlisted ? "remove_from_favorites" : "add_to_favorites", { productId: product.id, productName: displayName });
            }}
            title={isWishlisted ? "Убрать из избранного" : "В избранное"}
            aria-label={isWishlisted ? `Убрать ${displayName} из избранного` : `Добавить ${displayName} в избранное`}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${isWishlisted ? "bg-red-500 text-white" : "bg-white/90 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300"}`}
          >
            <Heart size={14} className={isWishlisted ? "fill-white" : ""} />
          </button>
        </div>

        {/* Card body — fixed height so all cards in a row align */}
        <div className="p-3 flex flex-col gap-1.5" style={{ minHeight: '120px' }}>
          {/* Brand */}
          {product.brand && (
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{product.brand}</p>
          )}

          {/* Rating */}
          {(product.reviewCount ?? 0) > 0 && (
            <div className="flex items-center gap-0.5">
              <span className="text-xs text-yellow-500">{'★'.repeat(Math.round(product.avgRating ?? 0))}{'☆'.repeat(5 - Math.round(product.avgRating ?? 0))}</span>
              <span className="text-xs text-gray-500">({product.reviewCount})</span>
            </div>
          )}

          {/* Product name */}
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 flex-1 leading-snug">{displayName}</h3>

          {/* Price block */}
          <div className="mt-auto pt-1">
            {hasDiscount && product.originalPrice ? (
              <>
                <div className="text-xs text-gray-400 line-through leading-tight mb-0.5">{formatPrice(product.originalPrice!)}</div>
                <div className="text-lg font-black leading-tight" style={{ color: "#cc0000" }}>{formatPrice(product.price)}</div>
              </>
            ) : (
              <div className="text-lg font-black leading-tight" style={{ color: "#cc0000" }}>{formatPrice(product.price)}</div>
            )}
          </div>
        </div>
      </Link>

      {/* CTA button — full width, outside Link to avoid nested anchor */}
      <div className="px-3 pb-3">
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          aria-label={`Добавить ${displayName} в корзину`}
          className="w-full flex items-center justify-center gap-2 text-white py-2.5 px-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] touch-manipulation shadow-sm"
          style={{ backgroundColor: inStock ? "#cc0000" : "#aaa" }}
        >
          <ShoppingCart size={15} />
          <span>{inStock ? t.card_add_to_cart : t.detail_out_of_stock}</span>
        </button>
      </div>
    </div>

    {/* Compare Modal — rendered outside Link to avoid nested anchor */}
    <CompareModal
      open={compareOpen}
      onClose={() => setCompareOpen(false)}
      currentProduct={product as any}
    />
    </>
  );
}
