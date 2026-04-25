import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import ProductCard from "@/components/ProductCard";
import { Flame } from "lucide-react";
import { useEffect } from "react";

const content = {
  ru: {
    title: "Хиты продаж",
    subtitle: "Самые популярные товары, которые выбирают наши покупатели",
    empty: "Пока нет хитов продаж",
    empty_sub: "Скоро здесь появятся самые популярные товары",
  },
  uz: {
    title: "Sotuvdagi hitlar",
    subtitle: "Xaridorlarimiz tanlagan eng mashhur mahsulotlar",
    empty: "Hozircha sotuvdagi hitlar yo'q",
    empty_sub: "Tez orada bu yerda eng mashhur mahsulotlar paydo bo'ladi",
  },
};

export default function Bestsellers() {
  const { lang } = useLanguage();
  const c = content[lang];

  useEffect(() => {
    document.title = lang === "uz"
      ? "Sotuvdagi hitlar — Eng mashhur mahsulotlar"
      : "Хиты продаж — Популярная техника";
  }, [lang]);
  const { data: hits, isLoading } = trpc.products.getHits.useQuery({});

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-12">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Flame size={36} className="text-yellow-300" />
            <h1 className="text-3xl md:text-4xl font-black">{c.title}</h1>
            <Flame size={36} className="text-yellow-300" />
          </div>
          <p className="text-white/85 text-lg">{c.subtitle}</p>
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
            <p className="text-xl font-bold text-gray-400 mb-2">{c.empty}</p>
            <p className="text-gray-400">{c.empty_sub}</p>
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
