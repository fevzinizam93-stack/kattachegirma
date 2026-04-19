import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount, totalItems } = useCart();
  const { t } = useLanguage();
  const formatPrice = (price: number) => new Intl.NumberFormat("ru-RU").format(price) + " " + t.common_sum;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-20">
          <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-black mb-2">{t.cart_empty}</h2>
          <p className="text-muted-foreground text-sm mb-6">{t.cart_empty_desc}</p>
          <Link href="/catalog">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              {t.cart_go_catalog}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <h1 className="text-xl font-black flex items-center gap-2">
            <ShoppingCart size={22} className="text-primary" />
            {t.cart_title} ({totalItems})
          </h1>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.productId} className="bg-white rounded-xl border border-border p-4 flex gap-4">
                {/* Image */}
                <Link href={`/product/${item.slug}`}>
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50 border border-border shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🏠</div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-primary font-black mt-1">{formatPrice(item.price)}</p>
                </div>

                {/* Quantity + Remove */}
                <div className="flex flex-col items-end justify-between shrink-0">
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="px-2 py-1.5 hover:bg-accent transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-bold min-w-[32px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-2 py-1.5 hover:bg-accent transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-xl border border-border p-5 sticky top-24">
              <h2 className="font-black text-lg mb-4">{t.cart_total}</h2>
              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground line-clamp-1 flex-1 mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 mb-5">
                <div className="flex justify-between font-black text-lg">
                  <span>{t.cart_total}:</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
              </div>
              <Link href="/checkout">
                <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors text-center block">
                  {t.cart_checkout}
                </button>
              </Link>
              <Link href="/catalog">
                <button className="w-full mt-2 border border-border py-3 rounded-xl font-medium hover:bg-accent transition-colors text-sm text-center block">
                  {t.cart_continue}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
