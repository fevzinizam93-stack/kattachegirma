import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  isNew?: boolean | null;
  isFeatured?: boolean | null;
  stock?: number | null;
}

interface ProductCardProps {
  product: Product;
}

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
    });
    toast.success("Добавлено в корзину!", {
      description: product.name,
      duration: 2000,
    });
  };

  const discountPercent = product.discount ?? 0;
  const hasDiscount = discountPercent > 0 && product.originalPrice;
  const inStock = !product.stock || product.stock > 0;

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer h-full flex flex-col hover:shadow-md transition-shadow">
        {/* Image area */}
        <div className="relative bg-gray-50" style={{ paddingBottom: "75%" }}>
          <div className="absolute inset-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-2"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
                📦
              </div>
            )}
          </div>

          {/* Discount badge - top left, green */}
          {hasDiscount && (
            <div
              className="absolute top-2 left-2 text-white text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "#2e7d32" }}
            >
              -{discountPercent}%
            </div>
          )}

          {/* НОВИНКА badge - top left below discount, green */}
          {product.isNew && (
            <div
              className="absolute text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: "#388e3c",
                top: hasDiscount ? "30px" : "8px",
                left: "8px",
              }}
            >
              НОВИНКА
            </div>
          )}

          {/* Wishlist icon - top right */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
          >
            ♡
          </button>
        </div>

        {/* Content */}
        <div className="p-2.5 flex flex-col flex-1">
          {/* Brand */}
          {product.brand && (
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
              {product.brand}
            </p>
          )}

          {/* Name */}
          <h3 className="text-xs font-medium text-gray-800 line-clamp-2 flex-1 mb-2 leading-snug">
            {product.name}
          </h3>

          {/* Price */}
          <div className="mb-2">
            <div className="text-sm font-black" style={{ color: "#cc0000" }}>
              {formatPrice(product.price)}
            </div>
            {hasDiscount && product.originalPrice && (
              <div className="text-xs text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </div>
            )}
          </div>

          {/* В корзину button */}
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className="w-full flex items-center justify-center gap-1.5 text-white py-1.5 px-2 rounded text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: inStock ? "#cc0000" : "#aaa" }}
          >
            <ShoppingCart size={13} />
            {inStock ? "В корзину" : "Нет в наличии"}
          </button>
        </div>
      </div>
    </Link>
  );
}
