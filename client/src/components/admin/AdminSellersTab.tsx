import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Store, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminSellersTab() {
  const utils = trpc.useUtils();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: sellers, isLoading: sellersLoading } = trpc.sellers.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const approveSeller = trpc.sellers.approve.useMutation({
    onSuccess: () => { toast.success("Продавец одобрен!"); utils.sellers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectSeller = trpc.sellers.rejectSeller.useMutation({
    onSuccess: () => { toast.success("Заявка отклонена, продавец уведомлён"); utils.sellers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const blockSeller = trpc.sellers.blockSeller.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(vars.blocked ? "Продавец заблокирован" : "Продавец разблокирован");
      utils.sellers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReject = () => {
    if (!rejectReason.trim()) return toast.error("Укажите причину отклонения");
    if (!rejectingId) return;
    rejectSeller.mutate({ id: rejectingId, reason: rejectReason.trim() });
    setRejectingId(null);
    setRejectReason("");
  };

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
                    {/* Show rejection reason if exists */}
                    {!seller.isApproved && (seller as any).rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">
                        Причина: {(seller as any).rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {!seller.isApproved && (
                    <>
                      <button
                        onClick={() => approveSeller.mutate({ id: seller.id })}
                        className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Одобрить
                      </button>
                      <button
                        onClick={() => { setRejectingId(seller.id); setRejectReason(""); }}
                        className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                      >
                        <XCircle size={12} />
                        Отклонить
                      </button>
                    </>
                  )}
                  {seller.isApproved && (
                    <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full">✓ Одобрен</span>
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

      {/* Rejection reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-black text-lg mb-1 text-gray-900">Причина отклонения</h3>
            <p className="text-sm text-gray-500 mb-4">Продавец получит это сообщение в Telegram</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Например: неполная информация о товарах, неподходящая категория..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={rejectSeller.isPending}
                className="flex-1 h-11 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {rejectSeller.isPending ? "Отправка..." : "Отклонить и уведомить"}
              </button>
              <button
                onClick={() => setRejectingId(null)}
                className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
