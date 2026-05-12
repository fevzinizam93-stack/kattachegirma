import { useState, useMemo } from "react";
import { X, Search, ShoppingCart, ArrowLeftRight, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { Link } from "wouter";

interface Product {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  specs?: Record<string, string> | null;
  stock?: number | null;
  categoryId: number;
  isNew?: boolean | null;
  isHit?: boolean | null;
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  currentProduct: Product;
}

function ProductColumn({
  product,
  label,
  allSpecs,
  onAddToCart,
}: {
  product: Product;
  label: string;
  allSpecs: string[];
  onAddToCart: (p: Product) => void;
}) {
  const { formatPrice } = useCurrency();
  const price = parseFloat(product.price);
  const origPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const hasDiscount = origPrice !== null && origPrice > price;
  const discountPct = hasDiscount && origPrice ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
  const inStock = !product.stock || product.stock > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Label badge */}
      <div className={`text-center text-[10px] font-bold py-1 rounded-t-xl mb-2 ${label === "Текущий" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
        {label === "Текущий" ? "👁 Вы смотрите" : "🔍 Для сравнения"}
      </div>

      {/* Image */}
      <div className="relative bg-gray-50 rounded-xl overflow-hidden mb-3" style={{ paddingBottom: "70%" }}>
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="text-5xl text-gray-200">📦</div>
          )}
        </div>
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </div>
        )}
      </div>

      {/* Name */}
      <Link href={`/product/${product.slug}`} className="text-sm font-bold text-gray-900 hover:text-red-600 transition-colors line-clamp-2 mb-1 leading-snug">
        {product.name}
      </Link>
      {product.brand && <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">{product.brand}</p>}

      {/* Price */}
      <div className="mb-3">
        {hasDiscount && origPrice ? (
          <>
            <span className="text-[11px] text-gray-400 line-through block">{formatPrice(product.originalPrice!)}</span>
            <span className="text-lg font-black text-red-600 leading-tight">{formatPrice(product.price)}</span>
          </>
        ) : (
          <span className="text-lg font-black text-red-600 leading-tight">{formatPrice(product.price)}</span>
        )}
      </div>

      {/* Add to cart */}
      <button
        onClick={() => onAddToCart(product)}
        disabled={!inStock}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold mb-4 transition-all ${
          inStock
            ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 active:scale-95"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ShoppingCart size={13} />
        {inStock ? "В корзину" : "Нет в наличии"}
      </button>

      {/* Specs comparison rows */}
      <div className="flex-1 space-y-0">
        {allSpecs.map((key) => {
          const val = product.specs?.[key];
          return (
            <div key={key} className="py-1.5 border-b border-gray-100 last:border-0">
              <span className={`text-xs ${val ? "text-gray-800 font-medium" : "text-gray-300"}`}>
                {val ?? "—"}
              </span>
            </div>
          );
        })}
        {/* Description */}
        {product.description && (
          <div className="pt-2">
            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-4">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CompareModal({ open, onClose, currentProduct }: CompareModalProps) {
  const [search, setSearch] = useState("");
  const [compareProduct, setCompareProduct] = useState<Product | null>(null);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  const { data: listData } = trpc.products.list.useQuery(
    {
      categoryId: currentProduct.categoryId,
      sortBy: "price_asc",
      limit: 100,
      search: search || undefined,
    },
    { enabled: open }
  );

  const candidates = useMemo(() => {
    const items = (listData?.items ?? []) as Product[];
    return items.filter((p) => p.id !== currentProduct.id);
  }, [listData, currentProduct.id]);

  // Collect all spec keys from both products
  const allSpecs = useMemo(() => {
    const keys = new Set<string>();
    if (currentProduct.specs) Object.keys(currentProduct.specs).forEach((k) => keys.add(k));
    if (compareProduct?.specs) Object.keys(compareProduct.specs).forEach((k) => keys.add(k));
    return Array.from(keys);
  }, [currentProduct.specs, compareProduct?.specs]);

  const handleAddToCart = (p: Product) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: parseFloat(p.price),
      quantity: 1,
      imageUrl: p.imageUrl ?? undefined,
      slug: p.slug,
    });
    toast.success("Добавлено в корзину", { description: p.name, duration: 2000 });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white w-full sm:max-w-5xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-red-500" />
            <h2 className="font-black text-base text-gray-900">Сравнение товаров</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Current product + specs */}
          <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-4">
            <ProductColumn
              product={currentProduct}
              label="Текущий"
              allSpecs={allSpecs}
              onAddToCart={handleAddToCart}
            />
          </div>

          {/* RIGHT: Comparison panel */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            {compareProduct ? (
              /* Showing selected compare product */
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  onClick={() => setCompareProduct(null)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-3 font-semibold"
                >
                  ← Выбрать другой
                </button>
                <ProductColumn
                  product={compareProduct}
                  label="Сравниваемый"
                  allSpecs={allSpecs}
                  onAddToCart={handleAddToCart}
                />
              </div>
            ) : (
              /* Product picker */
              <div className="flex flex-col h-full overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Выберите товар для сравнения:</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="text-sm text-gray-500 font-medium">
                        {search ? "Ничего не найдено" : "Нет других товаров в этой категории"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {candidates.map((p) => {
                        const price = parseFloat(p.price);
                        const origPrice = p.originalPrice ? parseFloat(p.originalPrice) : null;
                        const hasDiscount = origPrice !== null && origPrice > price;
                        const discountPct = hasDiscount && origPrice ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
                        return (
                          <button
                            key={p.id}
                            onClick={() => setCompareProduct(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                          >
                            {/* Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span className="text-xl text-gray-200">📦</span>
                              )}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-700">{p.name}</p>
                              {p.brand && <p className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">{p.brand}</p>}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs font-black text-red-600">{formatPrice(p.price)}</span>
                                {hasDiscount && (
                                  <span className="text-[9px] font-bold text-white bg-green-600 px-1 py-0.5 rounded">-{discountPct}%</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Specs labels column — shown only when both products are selected */}
        {compareProduct && allSpecs.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 shrink-0 bg-gray-50">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
              Сравниваются {allSpecs.length} характеристик(и)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
