import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Crown, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

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
  costPrice?: string | null;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { lang, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();

  const isVip = user?.role === "vip" || user?.role === "admin";
  const displayName = (lang === "uz" && product.nameUz) ? product.nameUz : product.name;

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

  const costPrice = product.costPrice ? parseFloat(product.costPrice) : null;
  const hasVipPrice = isVip && costPrice && costPrice > 0;
  const vipDiscount = hasVipPrice && costPrice
    ? Math.round(((currPrice - costPrice) / currPrice) * 100)
    : 0;

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer h-full flex flex-col active:scale-[0.98] transition-transform touch-manipulation">
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
            {product.sellerId && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none bg-amber-500">3rd</span>
            )}
            {product.isNew && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none" style={{ backgroundColor: "#388e3c" }}>{t.card_new}</span>
            )}
            {product.isHit && (
              <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-none flex items-center gap-0.5" style={{ backgroundColor: "#e65100" }}>🔥 {t.card_hit}</span>
            )}
          </div>
          {product.isPremium && (
            <div className="absolute top-1.5 right-1.5">
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
        </div>

        <div className="p-2 flex flex-col flex-1">
          {product.brand && <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5 truncate">{product.brand}</p>}
          <h3 className="text-[11px] font-medium text-gray-800 line-clamp-2 flex-1 mb-1.5 leading-snug">{displayName}</h3>
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
        </div>
      </div>
    </Link>
  );
}
