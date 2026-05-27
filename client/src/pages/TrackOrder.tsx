import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ArrowLeft, Package, Search, CheckCircle2, Clock, Truck, XCircle, MapPin, ShoppingBag } from "lucide-react";

const STATUS_STEPS = [
  { key: "pending",   label: "Принят",      icon: Clock,         color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
  { key: "confirmed", label: "Подтверждён", icon: CheckCircle2,  color: "text-blue-500",   bg: "bg-blue-50 border-blue-200" },
  { key: "delivered", label: "Доставлен",   icon: Truck,         color: "text-green-500",  bg: "bg-green-50 border-green-200" },
];

const STATUS_CANCELLED = { key: "cancelled", label: "Отменён", icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-200" };

function getStepIndex(status: string) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function TrackOrder() {
  const [inputId, setInputId] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const { formatPrice } = useCurrency();

  const { data: order, isLoading, error } = trpc.orders.getById.useQuery(
    { id: orderId! },
    { enabled: orderId !== null, retry: false }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(inputId.trim(), 10);
    if (!isNaN(num) && num > 0) {
      setOrderId(num);
    }
  };

  const isCancelled = order?.status === "cancelled";
  const currentStep = order ? getStepIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors text-sm">
          <ArrowLeft size={16} />
          На главную
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Package size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Отслеживание заказа</h1>
          <p className="text-gray-500 text-sm">Введите номер заказа для проверки статуса</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="number"
            value={inputId}
            onChange={e => setInputId(e.target.value)}
            placeholder="Номер заказа (например: 42)"
            min={1}
            className="flex-1 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          />
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Search size={16} />
            Найти
          </button>
        </form>

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Ищем заказ...</p>
          </div>
        )}

        {/* Not found */}
        {error && !isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-red-100">
            <XCircle size={40} className="mx-auto text-red-400 mb-3" />
            <p className="font-semibold text-gray-800 mb-1">Заказ не найден</p>
            <p className="text-gray-500 text-sm">Проверьте номер заказа и попробуйте снова</p>
          </div>
        )}

        {/* Order found */}
        {order && !isLoading && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Заказ</p>
                  <p className="text-2xl font-black text-gray-900">#{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Дата оформления</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Progress stepper */}
              {!isCancelled ? (
                <div className="relative">
                  {/* Connector line */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" style={{ zIndex: 0 }} />
                  <div
                    className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500"
                    style={{
                      width: currentStep <= 0 ? "0%" : currentStep === 1 ? "50%" : "100%",
                      zIndex: 0,
                    }}
                  />
                  <div className="relative flex justify-between" style={{ zIndex: 1 }}>
                    {STATUS_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const done = idx <= currentStep;
                      const active = idx === currentStep;
                      return (
                        <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                            done
                              ? "bg-primary border-primary text-white"
                              : "bg-white border-gray-200 text-gray-300"
                          }`}>
                            <Icon size={18} />
                          </div>
                          <span className={`text-xs font-medium text-center ${active ? "text-primary" : done ? "text-gray-700" : "text-gray-400"}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                  <XCircle size={24} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-700">Заказ отменён</p>
                    <p className="text-xs text-red-500 mt-0.5">Свяжитесь с нами для уточнения деталей</p>
                  </div>
                </div>
              )}
            </div>

            {/* Delivery info */}
            {order.deliveryAddress && (
              <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-3">
                <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Адрес доставки</p>
                  <p className="text-sm text-gray-800">{order.deliveryAddress}</p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingBag size={16} className="text-primary" />
                Состав заказа
              </h3>
              <div className="space-y-3">
                {(order.items as any[]).map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-gray-50 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.quantity} шт. × {formatPrice(Number(item.price))}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-700 flex-shrink-0">
                      {formatPrice(Number(item.price) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-500">Итого</span>
                <span className="text-lg font-black text-primary">{formatPrice(Number(order.totalAmount))}</span>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 mb-3">Есть вопросы по заказу?</p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Продолжить покупки
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
