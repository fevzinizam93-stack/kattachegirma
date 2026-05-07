import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ProductCard from "@/components/ProductCard";
import {
  Store, Calendar, ShieldAlert, ArrowLeft, PackageSearch,
  Star, Eye, Package, MessageSquare, Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={`transition-colors ${onChange ? "cursor-pointer" : "cursor-default"}`}
        >
          <Star
            size={onChange ? 24 : 16}
            className={
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-gray-200 text-gray-200"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function SellerStorefront() {
  const params = useParams<{ id: string }>();
  const sellerId = parseInt(params.id ?? "0", 10);
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: seller, isLoading: sellerLoading } = trpc.sellers.getPublicProfile.useQuery(
    { id: sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const { data: products = [], isLoading: productsLoading } = trpc.sellers.getPublicProducts.useQuery(
    { id: sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const { data: stats } = trpc.sellers.getStats.useQuery(
    { id: sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const { data: reviews = [], refetch: refetchReviews } = trpc.sellers.getReviews.useQuery(
    { sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const submitReview = trpc.sellers.submitReview.useMutation({
    onSuccess: () => {
      toast.success("Спасибо за отзыв!");
      setSubmitted(true);
      setRating(0);
      setComment("");
      refetchReviews();
    },
    onError: (e) => toast.error(e.message || "Ошибка при отправке отзыва"),
  });

  const isLoading = sellerLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-4 bg-gray-200 rounded w-72" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Продавец не найден</h1>
          <p className="text-gray-500 text-sm mb-4">Этот продавец не существует или ещё не одобрен.</p>
          <Link href="/">
            <button className="flex items-center gap-2 mx-auto text-sm text-red-600 hover:text-red-700 font-semibold">
              <ArrowLeft size={16} />
              На главную
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(seller.createdAt).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
  });

  const avgRating = stats?.avgRating ?? 0;
  const totalReviews = stats?.totalReviews ?? 0;
  const productCount = stats?.productCount ?? products.length;
  const totalViews = stats?.totalViews ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6">
        {/* Back button */}
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <ArrowLeft size={15} />
            Назад
          </button>
        </Link>

        {/* Seller header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Store size={28} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-900 truncate">{seller.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Calendar size={12} />
                <span>На сайте с {joinedDate}</span>
              </div>
              {seller.description && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{seller.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Package size={14} className="text-gray-400" />
              </div>
              <div className="text-lg font-black text-gray-900">{productCount}</div>
              <div className="text-xs text-gray-500">Товаров</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Eye size={14} className="text-gray-400" />
              </div>
              <div className="text-lg font-black text-gray-900">
                {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews}
              </div>
              <div className="text-xs text-gray-500">Просмотров</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={14} className="text-amber-400 fill-amber-400" />
              </div>
              <div className="text-lg font-black text-gray-900">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-gray-500">{totalReviews > 0 ? `${totalReviews} отзывов` : "Нет отзывов"}</div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-0.5">Товары стороннего продавца</p>
              <p>
                Katta Chegirma является торговой площадкой и не несёт ответственности за товары данного продавца.
                Качество товара, доставка и гарантия — ответственность продавца <strong>{seller.name}</strong>.
                Наш портал предоставляет доступ всем, кто хочет продавать товары со скидкой, чтобы покупателям было выгодно.
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-gray-900">
            Товары продавца
            {products.length > 0 && (
              <span className="ml-2 text-sm font-semibold text-gray-400">({products.length})</span>
            )}
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center mb-6">
            <PackageSearch size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">У этого продавца пока нет товаров</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Reviews section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-gray-500" />
            <h2 className="text-base font-black text-gray-900">
              Отзывы о продавце
              {totalReviews > 0 && (
                <span className="ml-2 text-sm font-semibold text-gray-400">({totalReviews})</span>
              )}
            </h2>
          </div>

          {/* Review form */}
          {user ? (
            submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-5">
                <p className="text-green-700 font-semibold text-sm">✅ Ваш отзыв отправлен!</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-3">Оставить отзыв</p>
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">Оценка</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <Textarea
                  placeholder="Расскажите о вашем опыте с этим продавцом..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-sm resize-none mb-3"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (rating === 0) { toast.error("Выберите оценку"); return; }
                    submitReview.mutate({ sellerId, rating, comment: comment || undefined });
                  }}
                  disabled={submitReview.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitReview.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : (
                    <Send size={14} className="mr-1" />
                  )}
                  Отправить отзыв
                </Button>
              </div>
            )
          ) : (
            <div className="bg-gray-50 rounded-xl p-4 text-center mb-5">
              <p className="text-sm text-gray-500 mb-2">Войдите, чтобы оставить отзыв о продавце</p>
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-red-600 border-red-200">
                  Войти
                </Button>
              </Link>
            </div>
          )}

          {/* Reviews list */}
          {reviews.length === 0 ? (
            <div className="text-center py-6">
              <Star size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Пока нет отзывов. Будьте первым!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(reviews as any[]).map((review) => (
                <div key={review.id} className="border border-gray-100 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{review.authorName}</span>
                      <div className="mt-0.5">
                        <StarRating value={review.rating} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
