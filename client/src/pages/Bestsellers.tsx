import ProductCard from "@/components/ProductCard";
import { ScrollToTop } from "@/components/ScrollToTop";
import { trpc } from "@/lib/trpc";
import { Flame } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";

export default function Bestsellers() {
  usePageMeta({
    title: "Eng ko'p sotilgan texnika narxi | Katta Chegirma",
    description: "Самые популярные товары в интернет-магазине Катта Чегирма. Хиты продаж — техника, которую выбирают наши покупатели. Пылесосы, стиральные машины, холодильники, телевизоры с выгодными ценами. Быстрая доставка по Узбекистану.",
    canonicalPath: "/bestsellers",
  });

  useBreadcrumbSchema([
    { name: "Главная", url: "https://kattachegirma.uz/" },
    { name: "Хиты продаж", url: "https://kattachegirma.uz/bestsellers" },
  ]);
  const { data: hits, isLoading } = trpc.products.getHits.useQuery({});
  return (
    <>
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
    <ScrollToTop />
    </>
  );
}
