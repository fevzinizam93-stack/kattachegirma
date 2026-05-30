import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, Phone, ShoppingBag, Users, Zap } from "lucide-react";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

// ---- Regular order types ----
const regularStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  delivered: "Доставлен",
  cancelled: "Отменён",
};
const regularStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ---- Quick order types ----
const quickStatusLabels: Record<string, string> = {
  new: "Новая",
  called: "Позвонили",
  done: "Готово",
  cancelled: "Отменена",
};
const quickStatusColors: Record<string, string> = {
  new: "bg-red-100 text-red-700",
  called: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

type FilterType = "all" | "regular" | "quick";

export default function AdminOrdersTab() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<FilterType>("all");

  // Regular orders
  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Статус обновлён!"); utils.orders.list.invalidate(); },
  });

  // Quick orders
  const { data: quickOrdersList, isLoading: quickOrdersLoading, refetch: refetchQuickOrders } = trpc.quickOrders.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateQuickOrderStatus = trpc.quickOrders.updateStatus.useMutation({
    onSuccess: () => { refetchQuickOrders(); toast.success("Статус обновлён"); },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = ordersLoading || quickOrdersLoading;

  // Merge and sort by createdAt descending
  type RegularRow = { kind: "regular"; data: NonNullable<typeof orders>[number] };
  type QuickRow   = { kind: "quick";   data: NonNullable<typeof quickOrdersList>[number] };
  type Row = RegularRow | QuickRow;

  const merged: Row[] = [
    ...(orders ?? []).map((o): RegularRow => ({ kind: "regular", data: o })),
    ...(quickOrdersList ?? []).map((q): QuickRow => ({ kind: "quick", data: q })),
  ].sort((a, b) => +new Date(b.data.createdAt) - +new Date(a.data.createdAt));

  const filtered = filter === "all" ? merged
    : filter === "regular" ? merged.filter(r => r.kind === "regular")
    : merged.filter(r => r.kind === "quick");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-gray-900">
          Всего заказов: {merged.length}
        </h2>
        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "regular", "quick"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? `Все (${merged.length})`
                : f === "regular" ? `Обычные (${(orders ?? []).length})`
                : `⚡ Быстрые (${(quickOrdersList ?? []).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">Заказов нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(row => (
            row.kind === "regular"
              ? <RegularOrderCard key={`r-${row.data.id}`} order={row.data} onStatusChange={(id, status) => updateOrderStatus.mutate({ id, status: status as any })} />
              : <QuickOrderCard key={`q-${row.data.id}`} order={row.data} onStatusChange={(id, status) => updateQuickOrderStatus.mutate({ id, status: status as any })} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Regular Order Card ----
function RegularOrderCard({
  order,
  onStatusChange,
}: {
  order: { id: number; createdAt: Date | string; status: string; customerName: string; customerPhone: string; deliveryAddress: string; items: unknown; totalAmount: string };
  onStatusChange: (id: number, status: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {/* Type badge */}
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            <ShoppingBag size={10} /> Обычный
          </span>
          <div>
            <p className="font-black text-gray-900">Заказ #{order.id}</p>
            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${regularStatusColors[order.status] ?? ""}`}>
            {regularStatusLabels[order.status] ?? order.status}
          </span>
          <select
            value={order.status}
            onChange={e => onStatusChange(order.id, e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          >
            <option value="pending">Ожидает</option>
            <option value="confirmed">Подтвердить</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменить</option>
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p><strong>Клиент:</strong> {order.customerName}</p>
          <p><strong>Тел:</strong> <a href={`tel:${order.customerPhone}`} className="text-primary hover:underline">{order.customerPhone}</a></p>
          <p><strong>Адрес:</strong> {order.deliveryAddress}</p>
        </div>
        <div>
          <p className="font-semibold mb-1">Товары:</p>
          {(order.items as { name: string; quantity: number; price: number }[]).map((item, i) => (
            <p key={i} className="text-xs text-gray-400">{item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}</p>
          ))}
          <p className="font-black text-primary mt-1">Итого: {formatPrice(parseFloat(order.totalAmount))}</p>
        </div>
      </div>
    </div>
  );
}

// ---- Quick Order Card ----
function QuickOrderCard({
  order,
  onStatusChange,
}: {
  order: { id: number; createdAt: Date | string; status: string; customerName: string; customerPhone: string; productName: string; productPrice?: string | null };
  onStatusChange: (id: number, status: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Type badge */}
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
            <Zap size={10} /> Быстрый
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${quickStatusColors[order.status] ?? "bg-gray-100 text-gray-500"}`}>
            {quickStatusLabels[order.status] ?? order.status}
          </span>
          <span className="text-xs text-gray-400">№{order.id}</span>
          <span className="text-xs text-gray-400 ml-auto">{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
        </div>
        <p className="font-semibold text-gray-900 truncate">{order.productName}</p>
        {order.productPrice && <p className="text-primary font-bold text-sm">{order.productPrice} сум</p>}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1"><Users size={13} />{order.customerName}</span>
          <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-primary hover:underline">
            <Phone size={13} />{order.customerPhone}
          </a>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {order.status === "new" && (
          <button
            onClick={() => onStatusChange(order.id, "called")}
            className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold hover:bg-yellow-200 transition-colors"
          >
            Позвонил
          </button>
        )}
        {(order.status === "new" || order.status === "called") && (
          <button
            onClick={() => onStatusChange(order.id, "done")}
            className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
          >
            <CheckCircle2 size={12} /> Готово
          </button>
        )}
        {order.status !== "cancelled" && order.status !== "done" && (
          <button
            onClick={() => onStatusChange(order.id, "cancelled")}
            className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
