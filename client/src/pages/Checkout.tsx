import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CheckCircle, LogIn, MapPin, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { isAuthenticated, user } = useAuth();
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: (data) => {
      setOrderId(data.id);
      setSuccess(true);
      clearCart();
    },
    onError: (err) => {
      toast.error(t.common_error + ": " + err.message);
    },
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim() || form.customerName.trim().length < 2)
      errs.customerName = "Имя должно содержать минимум 2 символа";
    if (!form.customerPhone.trim() || form.customerPhone.trim().length < 7)
      errs.customerPhone = "Неверный номер телефона";
    if (!form.deliveryAddress.trim() || form.deliveryAddress.trim().length < 5)
      errs.deliveryAddress = "Адрес должен содержать минимум 5 символов";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    createOrder.mutate({
      ...form,
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl,
      })),
      totalAmount: totalAmount.toString(),
    });
  };

  if (items.length === 0 && !success) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-4">{t.cart_empty}</h2>
        <Link href="/catalog">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold">{t.cart_go_catalog}</button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-border p-10 text-center max-w-md w-full mx-4">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-black mb-2">{t.checkout_success}</h2>
          <p className="text-muted-foreground mb-2">{t.profile_order_number}<strong>#{orderId}</strong></p>
          <p className="text-sm text-muted-foreground mb-6">{t.checkout_success_desc}</p>
          <Link href="/">
            <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              {t.checkout_back_home}
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
          <h1 className="text-xl font-black">{t.checkout_title}</h1>
        </div>
      </div>

      <div className="container py-3">
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Form */}
          <div className="lg:col-span-2">
            {/* Login banner for unauthenticated users */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4 mb-3 flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <LogIn size={18} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 mb-0.5">Войдите для быстрого оформления</p>
                  <p className="text-xs text-gray-500 mb-2.5">Ваши данные заполнятся автоматически. Можно продолжить без входа.</p>
                  <div className="flex gap-2">
                    <Link href="/login?redirect=/checkout">
                      <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                        Войти
                      </button>
                    </Link>
                    <Link href="/login?redirect=/checkout">
                      <button className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                        Зарегистрироваться
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
              <h2 className="font-black text-lg">{t.checkout_address}</h2>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  <User size={14} className="inline mr-1" />
                  {t.checkout_name} *
                </label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  placeholder="Например: Иван Иванов"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.customerName ? 'border-red-400' : 'border-border'}`}
                />
                {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  <Phone size={14} className="inline mr-1" />
                  {t.checkout_phone} *
                </label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  placeholder="+998 90 123 45 67"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${errors.customerPhone ? 'border-red-400' : 'border-border'}`}
                />
                {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  <MapPin size={14} className="inline mr-1" />
                  {t.checkout_address} *
                </label>
                <textarea
                  value={form.deliveryAddress}
                  onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))}
                  placeholder="Город, район, улица, номер дома..."
                  rows={3}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none ${errors.deliveryAddress ? 'border-red-400' : 'border-border'}`}
                />
                {errors.deliveryAddress && <p className="text-red-500 text-xs mt-1">{errors.deliveryAddress}</p>}
              </div>

              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                ℹ️ Оплата при доставке. Сейчас никакой оплаты не требуется.
              </div>

              <button
                type="submit"
                disabled={createOrder.isPending}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrder.isPending ? t.common_loading : t.checkout_submit}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:sticky lg:top-24">
              <h2 className="font-black text-lg mb-4">{t.cart_checkout} ({items.length})</h2>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-black text-lg">
                  <span>{t.cart_total}:</span>
                  <span className="text-primary">{formatPrice(totalAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Стоимость доставки уточняется отдельно
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
