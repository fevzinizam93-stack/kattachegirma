import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Minus, Plus, ShoppingCart, Star, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ProductDetailProps {
  slug: string;
}

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("uz-UZ").format(num) + " so'm";
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();

  const { data: product, isLoading } = trpc.products.bySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gray-100 rounded animate-pulse w-1/2" />
            <div className="h-12 bg-gray-100 rounded animate-pulse w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold">Mahsulot topilmadi</h2>
        <Link href="/catalog" className="text-primary hover:underline mt-2 inline-block">Katalogga qaytish</Link>
      </div>
    );
  }

  const hasDiscount = (product.discount ?? 0) > 0 && product.originalPrice;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      price: parseFloat(product.price),
      quantity,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
    });
    toast.success(`${quantity} ta mahsulot savatga qo'shildi!`, {
      description: product.name,
    });
  };

  const specs = (product.specs as Record<string, string> | null) ?? {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary">Bosh sahifa</Link>
            <ChevronRight size={14} />
            <Link href="/catalog" className="hover:text-primary">Katalog</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid md:grid-cols-2 gap-8 bg-white rounded-2xl border border-border p-6">
          {/* Image */}
          <div className="space-y-3">
            <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 border border-border relative">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl bg-gray-100">🏠</div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3">
                  <span className="discount-badge text-sm">-{product.discount}%</span>
                </div>
              )}
              {product.isNew && (
                <div className="absolute top-3 right-3">
                  <span className="new-badge text-sm">YANGI</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {product.brand && (
              <p className="text-sm text-primary font-bold uppercase tracking-wide mb-1">{product.brand}</p>
            )}
            <h1 className="text-2xl font-black mb-3">{product.name}</h1>

            {/* Rating placeholder */}
            <div className="flex items-center gap-1 mb-4">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={16} className={i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
              ))}
              <span className="text-sm text-muted-foreground ml-1">(4.0)</span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="text-3xl font-black text-primary">
                {formatPrice(product.price)}
              </div>
              {hasDiscount && product.originalPrice && (
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded">
                    {formatPrice(parseFloat(product.originalPrice) - parseFloat(product.price))} tejaysiz
                  </span>
                </div>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full ${(product.stock ?? 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {(product.stock ?? 0) > 0 ? `Mavjud (${product.stock} ta)` : "Tugagan"}
              </span>
            </div>

            {/* Quantity + Add to cart */}
            {(product.stock ?? 0) > 0 && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-4 py-2 font-bold text-sm min-w-[40px] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock ?? 99, q + 1))}
                    className="px-3 py-2 hover:bg-accent transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 px-6 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                >
                  <ShoppingCart size={20} />
                  Savatga qo'shish
                </button>
              </div>
            )}

            {/* Delivery info */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
              <Truck size={20} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">Tez yetkazib berish</p>
                <p className="text-xs text-muted-foreground">Butun O'zbekiston bo'ylab</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description + Specs */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {product.description && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-black mb-3">Tavsif</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {Object.keys(specs).length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-black mb-3">Texnik xususiyatlar</h2>
              <div className="space-y-2">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{key}</span>
                    <span className="text-sm font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
