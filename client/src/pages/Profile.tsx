import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useCart } from "@/contexts/CartContext";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Heart, User, LogOut, Package, ChevronRight, ArrowLeft, RotateCcw, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [tab, setTab] = useState<"orders" | "favorites">("orders");
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const { user, logout } = useAuth();
  const { lang, t } = useLanguage();
  const { formatPrice } = useCurrency();
  const { addItem } = useCart();
  const [, navigate] = useLocation();

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: t.status_pending, color: "bg-yellow-100 text-yellow-800" },
    confirmed: { label: t.status_processing, color: "bg-blue-100 text-blue-800" },
    delivered: { label: t.status_delivered, color: "bg-green-100 text-green-800" },
    cancelled: { label: t.status_cancelled, color: "bg-red-100 text-red-800" },
  };

  const { data: orders, isLoading: ordersLoading } = trpc.orders.myOrders.useQuery();
  const { data: favorites, isLoading: favsLoading } = trpc.favorites.list.useQuery();
  const utils = trpc.useUtils();
  const removeFav = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.list.invalidate();
      toast.success("Удалено из избранного");
    },
  });

  const reorderMutation = trpc.orders.reorder.useMutation({
    onSuccess: (data) => {
      // Add all items from the past order to cart
        data.items.forEach((item: { productId: number; name: string; price: number; quantity: number; imageUrl?: string }) => {
        for (let i = 0; i < item.quantity; i++) {
          addItem({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: 1,
            imageUrl: item.imageUrl ?? "",
            slug: "",
          });
        }
      });
      toast.success(`${data.items.length} товар(ов) добавлено в корзину`);
      navigate("/cart");
    },
    onError: () => {
      toast.error("Не удалось повторить заказ");
    },
    onSettled: () => {
      setReorderingId(null);
    },
  });

  const handleReorder = (orderId: number) => {
    setReorderingId(orderId);
    reorderMutation.mutate({ orderId });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Войдите для просмотра профиля</p>
          <Link href="/login" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">{t.nav_home}</span>
        </Link>

        {/* Profile header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
              {user.role === "admin" && (
                <span className="inline-block mt-1 bg-primary text-white text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Link href="/admin" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                Admin panel <ChevronRight size={16} />
              </Link>
            )}
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <LogOut size={16} />
              {t.auth_logout}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-6">
          <button
            onClick={() => setTab("orders")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "orders" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Package size={16} />
            {t.profile_orders} ({orders?.length ?? 0})
          </button>
          <button
            onClick={() => setTab("favorites")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === "favorites" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <Heart size={16} />
            {t.profile_favorites} ({favorites?.length ?? 0})
          </button>
        </div>

        {/* Orders */}
        {tab === "orders" && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="text-center py-8 text-gray-500">{t.common_loading}</div>
            ) : !orders?.length ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">{t.profile_no_orders}</p>
                <Link href="/catalog" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
                  {t.nav_catalog}
                </Link>
              </div>
            ) : (
              orders.map((order: any) => {
                const statusInfo = statusLabels[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
                const isReordering = reorderingId === order.id;
                return (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm p-5">
                    {/* Order header */}
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{t.profile_order_number}{order.id}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Order items */}
                    <div className="space-y-2 mb-3">
                      {(order.items as any[]).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-contain rounded border border-gray-100 bg-gray-50 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 truncate font-medium">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} шт. × {formatPrice(Number(item.price))}</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 flex-shrink-0">
                            {formatPrice(Number(item.price) * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Order footer */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-4 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <MapPin size={14} className="flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{order.deliveryAddress}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Phone size={14} className="flex-shrink-0" />
                          <span>{order.customerPhone}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold text-primary text-lg">{formatPrice(Number(order.totalAmount))}</span>
                        <button
                          onClick={() => handleReorder(order.id)}
                          disabled={isReordering}
                          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <RotateCcw size={15} className={isReordering ? "animate-spin" : ""} />
                          {isReordering ? "Добавляем..." : "Повторить заказ"}
                        </button>
                      </div>
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
              <div className="text-center py-8 text-gray-500">{t.common_loading}</div>
            ) : !favorites?.length ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Heart size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">{t.profile_no_favorites}</p>
                <Link href="/catalog" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
                  {t.nav_catalog}
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
                        <p className="text-xs text-gray-800 font-medium line-clamp-2 hover:text-primary transition-colors mb-1">
                          {product.name}
                        </p>
                      </Link>
                      <p className="text-sm font-bold text-primary">{formatPrice(Number(product.price))}</p>
                      <button
                        onClick={() => removeFav.mutate({ productId: product.id })}
                        className="mt-2 w-full text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 py-1 rounded transition-colors"
                      >
                        {t.common_delete}
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
