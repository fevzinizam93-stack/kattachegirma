import { trpc } from "@/lib/trpc";
import { Package } from "lucide-react";
import { toast } from "sonner";

function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("ru-RU").format(num) + " сум";
}

export default function AdminModerationTab() {
  const utils = trpc.useUtils();
  const { data: pendingProductsData, isLoading: pendingLoading } = trpc.sellers.pendingProducts.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const pendingProducts = pendingProductsData ?? [];

  const approveProductMut = trpc.sellers.approveProduct.useMutation({
    onSuccess: () => { utils.sellers.pendingProducts.invalidate(); toast.success("Товар одобрен!"); },
    onError: (e) => toast.error(e.message),
  });
  const rejectProductMut = trpc.sellers.rejectProduct.useMutation({
    onSuccess: () => { utils.sellers.pendingProducts.invalidate(); toast.success("Товар отклонён"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <h2 className="font-black text-lg mb-4 text-gray-900">
        Модерация — товары на проверке ({pendingProducts.length})
      </h2>
      {pendingLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">Загрузка...</div>
      ) : pendingProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p>Товаров для проверки нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingProducts.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex gap-4">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.brand && `${p.brand} · `}{formatPrice(p.price)}</p>
                  {p.sellerName && (
                    <p className="text-xs text-blue-600 mt-0.5">Продавец: {p.sellerName} {p.sellerPhone && `(${p.sellerPhone})`}</p>
                  )}
                  {p.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                  )}
                  {p.discount && p.discount > 0 ? (
                    <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full mt-1">-{p.discount}% скидка</span>
                  ) : (
                    <span className="inline-block bg-gray-50 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full mt-1">Без скидки</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => approveProductMut.mutate({ id: p.id })}
                    disabled={approveProductMut.isPending}
                    className="bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    Одобрить
                  </button>
                  <button
                    onClick={() => { if (confirm(`Отклонить товар "${p.name}"?`)) rejectProductMut.mutate({ id: p.id }); }}
                    disabled={rejectProductMut.isPending}
                    className="bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
