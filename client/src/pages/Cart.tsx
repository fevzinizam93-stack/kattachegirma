import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Minus, Plus, ShoppingCart, Trash2, LogIn } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";
import { trackInitiateCheckout } from "@/hooks/useFacebookPixel";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalAmount, totalItems } = useCart();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = "Корзина — Выбранные товары | Катта Чегирма";
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-16 px-4">
          <ShoppingCart size={56} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-black mb-2">{t.cart_empty}</h2>
          <p className="text-gray-500 text-sm mb-6">{t.cart_empty_desc}</p>
          <Link href="/catalog">
            <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold active:opacity-80 touch-manipulation">
              {t.cart_go_catalog}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container py-3">
          <h1 className="text-lg font-black flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" />
            {t.cart_title} ({totalItems})
          </h1>
        </div>
      </div>

      <div className="container py-3">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-2">
            {items.map(item => (
              <div key={item.productId} className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
                {/* Image */}
                <Link href={`/product/${item.slug}`}>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.slug}`}>
                    <h3 className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors leading-snug">{item.name}</h3>
                  </Link>
                  <p className="text-primary font-black text-sm mt-0.5">{formatPrice(item.price)}</p>
                  {/* Mobile: quantity controls inline */}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors touch-manipulation active:bg-gray-200"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-2.5 py-1.5 text-sm font-bold min-w-[30px] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="px-2.5 py-1.5 hover:bg-gray-100 transition-colors touch-manipulation active:bg-gray-200"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-1 self-start touch-manipulation"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Order summary — shown on desktop as sidebar, on mobile as bottom section */}
          <div>
            {/* Login banner for unauthenticated users */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                    <LogIn size={18} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 mb-0.5">Войдите для быстрого оформления</p>
                    <p className="text-xs text-gray-500 mb-2.5">Ваши данные заполнятся автоматически</p>
                    <div className="flex gap-2">
                      <Link href="/login?redirect=/checkout">
                        <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                          Войти
                        </button>
                      </Link>
                      <Link href="/login?redirect=/checkout">
                        <button className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                          Регистрация
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-4 lg:sticky lg:top-24">
              <h2 className="font-black text-base mb-3">{t.cart_total}</h2>
              <div className="space-y-1.5 mb-3">
                {items.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-500 line-clamp-1 flex-1 mr-2">{item.name} × {item.quantity}</span>
                    <span className="font-medium shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 mb-4">
                <div className="flex justify-between font-black text-base">
                  <span>{t.cart_total}:</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
              </div>
              <Link href="/checkout">
                <button
                  onClick={() => {
                    trackInitiateCheckout({
                      total: totalAmount,
                      itemCount: totalItems,
                    });
                  }}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors text-center block active:opacity-80 touch-manipulation">
                  {t.cart_checkout}
                </button>
              </Link>
              <Link href="/catalog">
                <button className="w-full mt-2 border border-gray-200 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm text-center block active:bg-gray-100 touch-manipulation">
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
