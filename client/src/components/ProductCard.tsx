import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Crown, ShoppingCart, ArrowLeftRight, Heart, Youtube } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import CompareModal from "@/components/CompareModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

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

function VideoReviewButton({ productName }: { productName: string }) {
  const { data, isLoading } = trpc.youtube.findVideoForProduct.useQuery(
    { productName },
    { staleTime: 60 * 60 * 1000, retry: false, refetchOnWindowFocus: false }
  );

  if (isLoading || !data?.videoId) return null;

  return (
    <a
      href={`https://www.youtube.com/watch?v=${data.videoId}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors"
    >
      <Youtube size={12} className="shrink-0" />
      <span className="truncate">Смотреть видеообзор</span>
    </a>
  );
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [compareOpen, setCompareOpen] = useState(false);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlist();
  const isWishlisted = inWishlist(product.id);

  // Track product click for auto-hit scoring (fire-and-forget, using fetch)
  const trackClick = { mutate: (data: { productId: number }) => {
    fetch('/api/trpc/hits.trackClick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json: data }),
    }).catch(() => {});
  }};
  const isVip = user?.role === "vip" || user?.role === "admin";
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

  // costPrice is stored in USD, convert to UZS for display (1 USD = 12700 UZS)
  const USD_RATE = 12700;
  const costPriceUsd = product.costPrice ? parseFloat(product.costPrice) : null;
  const costPrice = costPriceUsd ? costPriceUsd * USD_RATE : null; // in UZS for formatPrice
  const hasVipPrice = isVip && costPrice && costPrice > 0;
  const vipDiscount = hasVipPrice && costPrice && currPrice > costPrice
    ? Math.round(((currPrice - costPrice) / currPrice) * 100)
    : 0;

  return (
    <>
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
    <Link href={`/product/${product.slug}`} onClick={() => trackClick.mutate({ productId: product.id })} className="flex flex-col flex-1 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation">
      <div className="flex flex-col flex-1">
        <div className="relative bg-gray-50" style={{ paddingBottom: "70%" }}>
          <div className="absolute inset-0">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={displayName} className="w-full h-full object-contain p-1.5" loading="lazy" decoding="async" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">📦</div>
            )}
          </div>
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
            {hasDiscount && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none" style={{ backgroundColor: "#2e7d32" }}>-{discountPercent}%</span>
            )}
            {product.isNew && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none" style={{ backgroundColor: "#388e3c" }}>{t.card_new}</span>
            )}
            {product.isHit && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center gap-0.5" style={{ backgroundColor: "#e65100" }}>🔥 {t.card_hit}</span>
            )}
          </div>
          {/* Wishlist button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
            title={isWishlisted ? "Убрать из избранного" : "В избранное"}
            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${isWishlisted ? "bg-red-500 text-white border-red-500" : "bg-white/90 border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-red-50"}`}
          >
            <Heart size={11} className={isWishlisted ? "fill-white" : ""} />
          </button>
          {product.isPremium && (
            <div className="absolute top-8 right-1.5">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center gap-0.5" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', color: '#d4af37', border: '1px solid #d4af37' }}>◈ {t.card_original}</span>
            </div>
          )}
          {/* VIP badge */}
          {hasVipPrice && (
            <div className="absolute bottom-1.5 right-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center gap-0.5" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }}>
                <Crown size={8} /> VIP -{vipDiscount}%
              </span>
            </div>
          )}
          {/* Compare button — always visible, bottom-left */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCompareOpen(true); }}
                  className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm z-10"
                >
                  <ArrowLeftRight size={10} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4} className="text-xs font-medium">
                Сравнить товар
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="p-2 flex flex-col flex-1">
          {product.brand && <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5 truncate">{product.brand}</p>}
          {(product.reviewCount ?? 0) > 0 && (
            <div className="flex items-center gap-0.5 mb-0.5">
              <span className="text-[10px] text-yellow-500">{'★'.repeat(Math.round(product.avgRating ?? 0))}{'☆'.repeat(5 - Math.round(product.avgRating ?? 0))}</span>
              <span className="text-[9px] text-gray-400">({product.reviewCount})</span>
            </div>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 mb-1.5 leading-snug">{displayName}</h3>
          <div className="mb-1.5">
            {hasVipPrice ? (
              /* VIP pricing block */
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-400 line-through leading-tight">{formatPrice(product.price)}</span>
                  <span className="text-[9px] font-bold text-white px-1 py-0.5 rounded shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>VIP</span>
                </div>
                <div className="text-sm font-black leading-tight" style={{ color: "#7c3aed" }}>{formatPrice(String(costPrice))}</div>
                <div className="text-[9px] text-purple-500 font-semibold">Цена для вас</div>
              </div>
            ) : hasDiscount && product.originalPrice ? (
              <>
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[10px] text-gray-400 line-through leading-tight">{formatPrice(product.originalPrice!)}</span>
                  <span className="text-[9px] font-bold text-white px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: "#2e7d32" }}>-{discountPercent}%</span>
                </div>
                <div className="text-sm font-black leading-tight" style={{ color: "#cc0000" }}>{formatPrice(product.price)}</div>
              </>
            ) : (
              <div className="text-sm font-black leading-tight" style={{ color: "#cc0000" }}>{formatPrice(product.price)}</div>
            )}
          </div>
          <button onClick={handleAddToCart} disabled={!inStock} className="w-full flex items-center justify-center gap-1 text-white py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 touch-manipulation" style={{ backgroundColor: inStock ? (hasVipPrice ? "#7c3aed" : "#cc0000") : "#aaa" }}>
            <ShoppingCart size={12} />
            <span className="truncate">{inStock ? t.card_add_to_cart : t.detail_out_of_stock}</span>
          </button>
          {/* Video review button */}
          <VideoReviewButton productName={product.name} />
          {/* Seller name is shown only on the product detail page, not here */}
        </div>
      </div>
    </Link>

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
