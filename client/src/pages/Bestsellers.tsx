import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { Flame } from "lucide-react";
import { useEffect } from "react";

export default function Bestsellers() {
  useEffect(() => {
    document.title = "Хиты продаж — Популярная техника";
  }, []);
  const { data: hits, isLoading } = trpc.products.getHits.useQuery({});
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-12">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Flame size={36} className="text-yellow-300" />
            <h1 className="text-3xl md:text-4xl font-black">Хиты продаж</h1>
            <Flame size={36} className="text-yellow-300" />
          </div>
          <p className="text-white/85 text-lg">Самые популярные товары, которые выбирают наши покупатели</p>
        </div>
      </div>
      <div className="container py-10">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-2xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : !hits || hits.length === 0 ? (
          <div className="text-center py-20">
            <Flame size={64} className="text-gray-200 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-400 mb-2">Пока нет хитов продаж</p>
            <p className="text-gray-400">Скоро здесь появятся самые популярные товары</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {hits.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
