import { trpc } from "@/lib/trpc";
import { CheckCircle2, Phone, Users, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AdminQuickOrdersTab() {
  const { data: quickOrdersList, isLoading: quickOrdersLoading, refetch: refetchQuickOrders } = trpc.quickOrders.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateQuickOrderStatusMut = trpc.quickOrders.updateStatus.useMutation({
    onSuccess: () => { refetchQuickOrders(); toast.success("Статус обновлён"); },
    onError: (e) => toast.error(e.message),
  });

  const qStatusColors: Record<string, string> = {
    new: "bg-red-100 text-red-700",
    called: "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const qStatusLabels: Record<string, string> = {
    new: "Новая",
    called: "Позвонили",
    done: "Готово",
    cancelled: "Отменена",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Быстрые заявки «Купить в 1 клик»</h2>
        <span className="text-sm text-gray-500">{(quickOrdersList ?? []).length} заявок</span>
      </div>
      {quickOrdersLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (quickOrdersList ?? []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Zap size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">Заявок пока нет</p>
          <p className="text-gray-400 text-sm mt-1">Когда покупатель нажмёт «Купить в 1 клик», заявка появится здесь</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(quickOrdersList ?? []).map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${qStatusColors[order.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {qStatusLabels[order.status] ?? order.status}
                  </span>
                  <span className="text-xs text-gray-400">№{order.id}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
                </div>
                <p className="font-semibold text-gray-900 truncate">{order.productName}</p>
                {order.productPrice && <p className="text-primary font-bold text-sm">{order.productPrice} сум</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><Users size={13} />{order.customerName}</span>
                  <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1 text-primary hover:underline"><Phone size={13} />{order.customerPhone}</a>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {order.status === 'new' && (
                  <button
                    onClick={() => updateQuickOrderStatusMut.mutate({ id: order.id, status: 'called' })}
                    className="px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-xs font-bold hover:bg-yellow-200 transition-colors"
                  >
                    Позвонил
                  </button>
                )}
                {(order.status === 'new' || order.status === 'called') && (
                  <button
                    onClick={() => updateQuickOrderStatusMut.mutate({ id: order.id, status: 'done' })}
                    className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Готово
                  </button>
                )}
                {order.status !== 'cancelled' && order.status !== 'done' && (
                  <button
                    onClick={() => updateQuickOrderStatusMut.mutate({ id: order.id, status: 'cancelled' })}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors"
                  >
                    Отмена
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
