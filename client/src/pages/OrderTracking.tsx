import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Package, CheckCircle2, Truck, XCircle, Clock, Search } from "lucide-react";
import { Link } from "wouter";
import PushSubscribeButton from "@/components/PushSubscribeButton";

const STATUS_STEPS = [
  { key: "pending", label: "Принят", labelUz: "Qabul qilindi", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50", border: "border-yellow-200" },
  { key: "confirmed", label: "Подтверждён", labelUz: "Tasdiqlandi", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "delivered", label: "Доставлен", labelUz: "Yetkazildi", icon: Truck, color: "text-green-500", bg: "bg-green-50", border: "border-green-200" },
];

const STATUS_CANCELLED = { key: "cancelled", label: "Отменён", labelUz: "Bekor qilindi", icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" };

function formatPrice(amount: string | number) {
  return new Intl.NumberFormat("ru-RU").format(Number(amount)) + " сум";
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function OrderStatusTracker({ orderId }: { orderId: number }) {
  const { data: order, isLoading, error } = trpc.orders.getById.useQuery({ id: orderId });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="w-10 h-10 border-3 border-red-200 border-t-red-600 rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Загружаем информацию о заказе...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <XCircle size={40} className="text-red-400" />
        <p className="text-gray-700 font-semibold">Заказ не найден</p>
        <p className="text-gray-500 text-sm">Проверьте номер заказа и попробуйте снова</p>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const currentStepIndex = isCancelled ? -1 : STATUS_STEPS.findIndex(s => s.key === order.status);
  const currentStatus = isCancelled ? STATUS_CANCELLED : (STATUS_STEPS[currentStepIndex] ?? STATUS_STEPS[0]);

  return (
    <div className="space-y-6">
      {/* Order header */}
      <div className={`rounded-2xl border p-5 ${currentStatus.bg} ${currentStatus.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm`}>
            <currentStatus.icon size={24} className={currentStatus.color} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Заказ #{order.id}</p>
            <p className={`text-lg font-bold ${currentStatus.color}`}>{currentStatus.label}</p>
            <p className="text-xs text-gray-400">{formatDate(order.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Progress steps */}
      {!isCancelled && (
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-red-500 z-0 transition-all duration-500"
            style={{ width: currentStepIndex >= 0 ? `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` : "0%" }}
          />
          <div className="relative z-10 flex justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-red-600 border-red-600 text-white"
                      : "bg-white border-gray-200 text-gray-300"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <p className={`text-xs font-medium text-center leading-tight ${isCompleted ? "text-gray-800" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order items */}
      <div className="rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Товары в заказе</p>
        </div>
        <div className="divide-y divide-gray-50">
          {(order.items ?? []).map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 px-4 py-3">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-14 h-14 object-contain rounded-lg bg-gray-50 border border-gray-100 shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.quantity} шт. × {formatPrice(item.price)}</p>
              </div>
              <p className="text-sm font-bold text-gray-800 shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-700">Итого</p>
          <p className="text-base font-bold text-red-600">{formatPrice(order.totalAmount)}</p>
        </div>
      </div>

      {/* Push notifications */}
      {order.status !== "delivered" && order.status !== "cancelled" && (
        <div className="flex justify-center">
          <PushSubscribeButton orderId={order.id} />
        </div>
      )}

      {/* Created at */}
      <p className="text-xs text-gray-400 text-center">Заказ создан: {formatDate(order.createdAt)}</p>
    </div>
  );
}

export default function OrderTracking({ orderId: initialOrderId }: { orderId?: number } = {}) {
  const [inputId, setInputId] = useState(initialOrderId ? String(initialOrderId) : "");
  const [orderId, setOrderId] = useState<number | null>(initialOrderId ?? null);

  const handleSearch = () => {
    const id = parseInt(inputId.trim());
    if (isNaN(id) || id <= 0) return;
    setOrderId(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-3">
            <Package size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Отслеживание заказа</h1>
          <p className="text-gray-500 text-sm">Введите номер заказа чтобы узнать его статус</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <label className="block text-sm font-semibold text-gray-700">Номер заказа</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={inputId}
              onChange={e => setInputId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Например: 1234"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              min={1}
            />
            <button
              onClick={handleSearch}
              disabled={!inputId.trim()}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Search size={16} />
              Найти
            </button>
          </div>
          <p className="text-xs text-gray-400">Номер заказа указан в SMS или письме подтверждения</p>
        </div>

        {/* Order info */}
        {orderId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <OrderStatusTracker orderId={orderId} />
          </div>
        )}

        {/* Back to home */}
        <div className="text-center">
          <Link href="/" className="text-sm text-red-600 hover:underline font-medium">
            ← Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
}
