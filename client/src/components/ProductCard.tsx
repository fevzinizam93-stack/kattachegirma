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
  return new Intl.NumberFormat("uz-UZ").format(num) + " so'm";
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
    toast.success("Savatga qo'shildi!", {
      description: product.name,
      duration: 2000,
    });
  };

  const discountPercent = product.discount ?? 0;
  const hasDiscount = discountPercent > 0 && product.originalPrice;

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="product-card bg-white rounded-xl border border-border overflow-hidden cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-100">
              🏠
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && (
              <span className="discount-badge">-{discountPercent}%</span>
            )}
            {product.isNew && (
              <span className="new-badge">YANGI</span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col flex-1">
          {product.brand && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 flex-1 mb-2">
            {product.name}
          </h3>

          {/* Price */}
          <div className="mb-3">
            <div className="text-base font-black text-primary">
              {formatPrice(product.price)}
            </div>
            {hasDiscount && product.originalPrice && (
              <div className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </div>
            )}
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            disabled={!product.stock || product.stock <= 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={16} />
            {product.stock && product.stock > 0 ? "Savatga" : "Tugagan"}
          </button>
        </div>
      </div>
    </Link>
  );
}
