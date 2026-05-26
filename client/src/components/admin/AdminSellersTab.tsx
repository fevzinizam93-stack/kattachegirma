import { trpc } from "@/lib/trpc";
import { Store, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminSellersTab() {
  const utils = trpc.useUtils();
  const { data: sellers, isLoading: sellersLoading } = trpc.sellers.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const approveSeller = trpc.sellers.approve.useMutation({
    onSuccess: () => { toast.success("Продавец одобрен!"); utils.sellers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const blockSeller = trpc.sellers.blockSeller.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(vars.blocked ? "Продавец заблокирован" : "Продавец разблокирован");
      utils.sellers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <h2 className="font-black text-lg mb-4 text-gray-900">Продавцы ({sellers?.length ?? 0})</h2>
      {sellersLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
      ) : !sellers || sellers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p>Продавцов пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map(seller => (
            <div key={seller.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Store size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{seller.name}</p>
                    <p className="text-sm text-gray-500">{seller.phone}</p>
                    {seller.telegram && <p className="text-xs text-blue-600">{seller.telegram}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!seller.isApproved && (
                    <button
                      onClick={() => approveSeller.mutate({ id: seller.id })}
                      className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Одобрить
                    </button>
                  )}
                  {seller.isApproved && (
                    <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Одобрен</span>
                  )}
                  {(seller as any).isBlocked ? (
                    <button
                      onClick={() => blockSeller.mutate({ id: seller.id, blocked: false })}
                      className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Разблокировать
                    </button>
                  ) : (
                    <button
                      onClick={() => { if (confirm("Заблокировать продавца?")) blockSeller.mutate({ id: seller.id, blocked: true }); }}
                      className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Заблокировать
                    </button>
                  )}
                </div>
              </div>
              {seller.description && (
                <p className="text-sm text-gray-500 mt-2 ml-13">{seller.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
