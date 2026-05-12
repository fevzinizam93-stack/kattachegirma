import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Link } from "wouter";
import { ArrowLeft, Star, Package, Eye, Phone, MessageCircle, Store } from "lucide-react";
import ProductCard from "@/components/ProductCard";

function StarRating({ rating, total }: { rating: number; total: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {stars.map((s) => (
          <Star
            key={s}
            size={16}
            fill={s <= Math.round(rating) ? "#f59e0b" : "none"}
            stroke={s <= Math.round(rating) ? "#f59e0b" : "#d1d5db"}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-700">{rating > 0 ? rating.toFixed(1) : "—"}</span>
      {total > 0 && <span className="text-xs text-gray-400">({total} отзывов)</span>}
    </div>
  );
}

export default function SellerProfile() {
  const [, params] = useRoute("/seller/:id");
  const [, setLocation] = useLocation();
  const sellerId = params?.id ? parseInt(params.id, 10) : null;

  const { data, isLoading, isError } = trpc.sellers.getFullPublicProfile.useQuery(
    { id: sellerId! },
    { enabled: !!sellerId && !isNaN(sellerId) }
  );

  if (!sellerId || isNaN(sellerId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">Неверный идентификатор продавца</p>
          <Link href="/catalog" className="text-red-600 hover:underline font-semibold">← Вернуться в каталог</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header skeleton */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-48" />
                <div className="h-4 bg-gray-200 rounded w-72" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            </div>
          </div>
          {/* Products skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-semibold mb-2">Продавец не найден</p>
          <p className="text-gray-400 text-sm mb-6">Возможно, профиль продавца был удалён или ещё не одобрен</p>
          <Link href="/catalog" className="inline-flex items-center gap-2 text-red-600 hover:underline font-semibold">
            <ArrowLeft size={16} /> Вернуться в каталог
          </Link>
        </div>
      </div>
    );
  }

  const { seller, products, stats, rating } = data;
  const memberSince = new Date(seller.createdAt).toLocaleDateString("ru", { year: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => setLocation("/catalog")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-5 transition-colors"
        >
          <ArrowLeft size={16} />
          Вернуться в каталог
        </button>

        {/* Seller header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-white text-2xl font-black shrink-0">
              {seller.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-900 mb-1">{seller.name}</h1>
              {seller.description && (
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{seller.description}</p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Package size={15} className="text-gray-400" />
                  <span className="font-semibold">{stats.productCount}</span>
                  <span className="text-gray-400">товаров</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Eye size={15} className="text-gray-400" />
                  <span className="font-semibold">{stats.totalViews.toLocaleString("ru")}</span>
                  <span className="text-gray-400">просмотров</span>
                </div>
                <StarRating rating={rating.avgRating} total={rating.totalReviews} />
              </div>

              <p className="text-xs text-gray-400">На платформе с {memberSince}</p>
            </div>

            {/* Contact buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  <Phone size={15} />
                  Позвонить
                </a>
              )}
              {seller.telegram && (
                <a
                  href={`https://t.me/${seller.telegram.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  <MessageCircle size={15} />
                  Telegram
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Products section */}
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-red-500" />
            Товары продавца
            {products.length > 0 && (
              <span className="ml-1 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{products.length}</span>
            )}
          </h2>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Package size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">У этого продавца пока нет товаров</p>
              <p className="text-gray-400 text-sm mt-1">Загляните позже</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
