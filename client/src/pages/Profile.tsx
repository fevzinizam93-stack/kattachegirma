import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Heart, User, LogOut, Package, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Kutilmoqda / В ожидании", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Tasdiqlangan / Подтверждён", color: "bg-blue-100 text-blue-800" },
  delivered: { label: "Yetkazildi / Доставлен", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Bekor qilindi / Отменён", color: "bg-red-100 text-red-800" },
};

export default function Profile() {
  const [tab, setTab] = useState<"orders" | "favorites">("orders");
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: orders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery();
  const { data: favorites, isLoading: favsLoading } = trpc.favorites.list.useQuery();
  const removeFav = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.list.invalidate();
      toast.success("Sevimlilardan o'chirildi");
    },
  });
  const utils = trpc.useUtils();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Profilni ko'rish uchun kiring / Войдите для просмотра профиля</p>
          <Link href="/" className="bg-[#cc0000] text-white px-6 py-2 rounded-lg hover:bg-[#aa0000] transition-colors">
            Bosh sahifaga / На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#cc0000] mb-6 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">Bosh sahifaga / На главную</span>
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#cc0000] flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.role === "admin" && (
                <span className="inline-block mt-1 bg-[#cc0000] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  Admin
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="flex items-center gap-2 bg-[#cc0000] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#aa0000] transition-colors"
              >
                Admin panel
                <ChevronRight size={16} />
              </Link>
            )}
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <LogOut size={16} />
              Chiqish / Выйти
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-6">
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "orders" ? "bg-[#cc0000] text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Package size={16} />
            Buyurtmalar / Заказы ({orders?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "favorites" ? "bg-[#cc0000] text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Heart size={16} />
            Sevimlilar / Избранное ({favorites?.length ?? 0})
          </button>
        </div>

        {/* Orders */}
        {tab === "orders" && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
            ) : !orders?.length ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Buyurtmalar yo'q / Заказов нет</p>
                <Link href="/catalog" className="bg-[#cc0000] text-white px-6 py-2 rounded-lg hover:bg-[#aa0000] transition-colors text-sm">
                  Xarid qilish / Купить
                </Link>
              </div>
            ) : (
              orders.map((order: any) => {
                const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-semibold text-gray-900">Buyurtma #{order.id}</span>
                        <span className="ml-3 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {(order.items as any[]).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain rounded border border-gray-100" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} x {Number(item.price).toLocaleString("ru-RU")} so'm</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">{order.deliveryAddress}</span>
                      <span className="font-bold text-[#cc0000]">{Number(order.totalAmount).toLocaleString("ru-RU")} so'm</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Favorites */}
        {tab === "favorites" && (
          <div>
            {favsLoading ? (
              <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
            ) : !favorites?.length ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Sevimli mahsulotlar yo'q / Нет избранных товаров</p>
                <Link href="/catalog" className="bg-[#cc0000] text-white px-6 py-2 rounded-lg hover:bg-[#aa0000] transition-colors text-sm">
                  Katalogga o'tish / Перейти в каталог
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {favorites.map((product: any) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden group">
                    <Link href={`/product/${product.slug}`}>
                      <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="text-4xl">📦</div>
                        )}
                      </div>
                    </Link>
                    <div className="p-3">
                      <Link href={`/product/${product.slug}`}>
                        <p className="text-xs text-gray-800 font-medium line-clamp-2 hover:text-[#cc0000] transition-colors mb-1">{product.name}</p>
                      </Link>
                      <p className="text-sm font-bold text-[#cc0000]">{Number(product.price).toLocaleString("ru-RU")} so'm</p>
                      <button
                        onClick={() => removeFav.mutate({ productId: product.id })}
                        className="mt-2 w-full text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 py-1 rounded transition-colors"
                      >
                        O'chirish / Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
