import { useWishlist } from "@/hooks/useWishlist";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Heart, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Favorites() {
  usePageMeta({
    title: "Избранное | Катта Чегирма",
    description: "Ваши избранные товары",
    noindex: true,
  });
  const { ids, clear, count } = useWishlist();

  // Загружаем товары по id из wishlist
  const { data, isLoading } = trpc.products.getByIds.useQuery(
    { ids },
    { enabled: ids.length > 0, staleTime: 2 * 60 * 1000 }
  );

  return (
    <>
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary text-white py-10">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Heart className="w-7 h-7 fill-white" />
            <h1 className="text-2xl font-black tracking-tight">Избранное</h1>
          </div>
          <p className="text-white/80 text-sm">
            {count > 0 ? `${count} ${count === 1 ? "товар" : count < 5 ? "товара" : "товаров"} сохранено` : "Список пуст"}
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* Empty state */}
        {ids.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700 mb-1">Список избранного пуст</p>
              <p className="text-sm text-gray-400">Нажмите ♡ на карточке товара, чтобы добавить его сюда</p>
            </div>
            <Link href="/catalog">
              <Button className="rounded-full px-6">Перейти в каталог</Button>
            </Link>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && ids.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {ids.map((id) => (
              <div key={id} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        )}

        {/* Products grid */}
        {!isLoading && data && data.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">{data.length} товаров</p>
              <button
                onClick={clear}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
                Очистить всё
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}

        {/* Products loaded but some may be deleted */}
        {!isLoading && ids.length > 0 && data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-gray-500">Товары не найдены (возможно, были удалены)</p>
            <button onClick={clear} className="text-sm text-red-500 hover:underline">
              Очистить список
            </button>
          </div>
        )}
      </div>
    </div>
    <ScrollToTop />
    </>
  );
}
