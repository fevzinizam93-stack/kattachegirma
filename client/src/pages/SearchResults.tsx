import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { Link } from "wouter";

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { lang } = useLanguage();

  const { data, isLoading } = trpc.products.list.useQuery({
    search: query,
    limit: 48,
    offset: 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  const text = {
    title: lang === "uz" ? `Qidiruv natijalari: «${query}»` : `Результаты поиска: «${query}»`,
    found: lang === "uz" ? `${total} ta mahsulot topildi` : `Найдено ${total} товаров`,
    notFound: lang === "uz" ? "Hech narsa topilmadi" : "Ничего не найдено",
    emptyTitle: lang === "uz" ? "Mahsulot topilmadi" : "Товары не найдены",
    emptyDesc: lang === "uz"
      ? `«${query}» so'rovi bo'yicha hech narsa topilmadi. Boshqa so'z yoki model nomi bilan qidirib ko'ring.`
      : `По запросу «${query}» ничего не найдено. Попробуйте другое слово, модель или бренд.`,
    backToCatalog: lang === "uz" ? "Katalogga qaytish" : "Вернуться в каталог",
    tips_title: lang === "uz" ? "Qidiruv bo'yicha maslahatlar:" : "Советы по поиску:",
    tips: lang === "uz"
      ? ["Model nomini to'liq kiriting (masalan: WW70T4542TE)", "Brend nomini kiriting (SAMSUNG, LG, BOSCH...)", "Narxni raqamda kiriting (masalan: 500000)", "Katta yoki kichik harflar muhim emas"]
      : ["Введите полное название модели (например: WW70T4542TE)", "Введите название бренда (SAMSUNG, LG, BOSCH...)", "Введите цену цифрами (например: 500000)", "Регистр букв не важен — можно писать заглавными или строчными"],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-primary" />
            <h1 className="text-xl font-black">{text.title}</h1>
          </div>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">
              {total > 0 ? text.found : text.notFound}
            </p>
          )}
        </div>
      </div>

      <div className="container py-3 pb-24 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-56 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="max-w-lg mx-auto text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-black text-gray-900 mb-3">{text.emptyTitle}</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">{text.emptyDesc}</p>

            {/* Search tips */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6 shadow-sm">
              <p className="text-sm font-bold text-gray-700 mb-3">{text.tips_title}</p>
              <ul className="space-y-2">
                {text.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-primary font-bold mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
              {text.backToCatalog}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
