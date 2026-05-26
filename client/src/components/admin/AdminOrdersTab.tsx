import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

const statusLabels: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  delivered: "Доставлен",
  cancelled: "Отменён",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function AdminOrdersTab() {
  const utils = trpc.useUtils();
  const { data: orders, isLoading: ordersLoading } = trpc.orders.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { toast.success("Статус обновлён!"); utils.orders.list.invalidate(); },
  });

  return (
    <div>
      <h2 className="font-black text-lg mb-4 text-gray-900">Заказы ({orders?.length ?? 0})</h2>
      {ordersLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
      ) : !orders || orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">Заказов нет</div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-black text-gray-900">Заказ #{order.id}</p>
                  <p className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[order.status] ?? ""}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                  <select
                    value={order.status}
                    onChange={e => updateOrderStatus.mutate({ id: order.id, status: e.target.value as any })}
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
                  <p><strong>Тел:</strong> {order.customerPhone}</p>
                  <p><strong>Адрес:</strong> {order.deliveryAddress}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Товары:</p>
                  {(order.items as any[]).map((item, i) => (
                    <p key={i} className="text-xs text-gray-400">{item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}</p>
                  ))}
                  <p className="font-black text-primary mt-1">Итого: {formatPrice(parseFloat(order.totalAmount))}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
