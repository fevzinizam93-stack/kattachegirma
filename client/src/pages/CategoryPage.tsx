import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

const LIMIT = 12;

interface CategoryPageProps {
  slug: string;
}

export default function CategoryPage({ slug }: CategoryPageProps) {
  const { lang } = useLanguage();
  const [page, setPage] = useState(0);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const categories = categoriesData ?? [];
  const category = categories.find(c => c.slug === slug || (c as any).slugUz === slug);

  const { data, isLoading } = trpc.products.list.useQuery({
    categoryId: category?.id,
    limit: LIMIT,
    offset: page * LIMIT,
  });

  const allProducts = data?.items ?? [];
  const total = data?.total ?? 0;

  // Client-side price/brand filter
  const filtered = allProducts.filter(p => {
    const price = parseFloat(p.price);
    if (minPrice && price < parseFloat(minPrice)) return false;
    if (maxPrice && price > parseFloat(maxPrice)) return false;
    if (brandFilter && !p.brand?.toLowerCase().includes(brandFilter.toLowerCase())) return false;
    return true;
  });

  const brands = Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean))) as string[];
  const totalPages = Math.ceil(total / LIMIT);

  // SEO: dynamic meta tags for category page
  const categoryTitle = category
    ? `${category.name} — купить в Ташкенте со скидкой | Катта Чегирма`
    : `Категория — Катта Чегирма`;
  const categoryDesc = category
    ? `Купить ${category.name} со скидкой в Ташкенте. ${total > 0 ? `${total} товаров в наличии.` : ""} Выгодные цены, рассрочка, быстрая доставка по Ташкенту и всему Узбекистану. Гарантия качества.`
    : `Каталог техники в Ташкенте. Телефоны, холодильники, пылесосы, кондиционеры. Рассрочка, быстрая доставка по Узбекистану.`;

  // UZ keywords: category name used as UZ search term (category names are already in Russian,
  // but Google also indexes them when combined with UZ keywords)
  const categoryKeywordsUz = category
    ? `${category.name} sotib olish, ${category.name} arzon, ${category.name} Toshkent, ${category.name} narxi O'zbekiston`
    : undefined;
  usePageMeta({
    title: categoryTitle,
    description: categoryDesc,
    canonicalPath: `/category/${slug}`,
    // If category has a UZ slug, provide hreflang alternate for /kategoriya/:slugUz
    hreflangUzPath: (category as any)?.slugUz ? `/kategoriya/${(category as any).slugUz}` : undefined,
    keywordsUz: categoryKeywordsUz,
  });

  // SEO: FAQ Schema.org — inject FAQPage structured data for this category
  useEffect(() => {
    if (!category) return;
    const faqs = getCategoryFAQs(category.name, total);
    if (!faqs.length) return;
    const schemaId = `faq-schema-${category.id}`;
    let el = document.getElementById(schemaId);
    if (!el) {
      el = document.createElement("script");
      el.id = schemaId;
      (el as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a }
      }))
    });
    return () => { el?.remove(); };
  }, [category, total]);

  // SEO: BreadcrumbList Schema.org
  useBreadcrumbSchema(
    category
      ? [
          { name: "Главная", url: "https://kattachegirma.uz/" },
          { name: "Каталог", url: "https://kattachegirma.uz/catalog" },
          { name: category.name, url: `https://kattachegirma.uz/category/${slug}` },
        ]
      : [{ name: "Главная", url: "https://kattachegirma.uz/" }, { name: "Каталог", url: "https://kattachegirma.uz/catalog" }]
  );

  if (!category && categoriesData) {
    return (
      <div className="container py-20 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold">Категория не найдена</h2>
        <Link href="/catalog" className="text-primary hover:underline mt-2 inline-block">Вернуться в каталог</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="container py-3">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Главная</Link>
            <ChevronRight size={14} />
            <Link href="/catalog" className="hover:text-primary">Katalog</Link>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{lang === "uz" && (category as any)?.nameUz ? (category as any).nameUz : (category?.name ?? slug)}</span>
          </div>
          <h1 className="text-xl font-black mt-2 flex items-center gap-2">
            <span>{category?.icon}</span>
            <span>{lang === "uz" && (category as any)?.nameUz ? (category as any).nameUz : (category?.name ?? slug)}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{total} товаров</p>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <aside className="w-56 shrink-0 hidden md:block">
            <div className="bg-white rounded-xl border border-border p-4 sticky top-24 space-y-5">
              {/* Price filter */}
              <div>
                <h4 className="font-bold text-sm mb-3">Цена (сум)</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="От"
                    value={minPrice}
                    onChange={e => setMinPrice(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    value={maxPrice}
                    onChange={e => setMaxPrice(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Brand filter */}
              {brands.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Бренд</h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => setBrandFilter("")}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${!brandFilter ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                    >
                      Все
                    </button>
                    {brands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => setBrandFilter(brand)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${brandFilter === brand ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-accent'}`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              {(minPrice || maxPrice || brandFilter) && (
                <button
                  onClick={() => { setMinPrice(""); setMaxPrice(""); setBrandFilter(""); }}
                  className="w-full border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📦</div>
                <h3 className="text-lg font-bold mb-2">Товары не найдены</h3>
                <p className="text-muted-foreground text-sm">Измените фильтры</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filtered.map(p => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      ← Назад
                    </button>
                    <span className="px-4 py-2 text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Вперёд →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* FAQ Section — helps Google show rich snippets and improves E-E-A-T */}
      {category && (() => {
        const faqs = getCategoryFAQs(category.name, total);
        if (!faqs.length) return null;
        return (
          <div className="container py-8">
            <div className="bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold mb-4 text-foreground">Часто задаваемые вопросы</h2>
              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <FAQItem key={i} question={faq.q} answer={faq.a} />
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-accent/50 transition-colors"
      >
        <span>{question}</span>
        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-muted-foreground">{answer}</div>
      )}
    </div>
  );
}

function getCategoryFAQs(categoryName: string, total: number): { q: string; a: string }[] {
  const n = categoryName;
  const count = total > 0 ? `${total} моделей` : "широкий ассортимент";
  const base: { q: string; a: string }[] = [
    {
      q: `Сколько моделей ${n} доступно на Катта Чегирма?`,
      a: `На нашем сайте представлено ${count} ${n}. Ассортимент регулярно обновляется — новые товары добавляются каждую неделю.`,
    },
    {
      q: `Есть ли доставка ${n} по Ташкенту?`,
      a: `Да, мы осуществляем доставку ${n} по всему Ташкенту и Узбекистану. Доставка по Ташкенту в течение 1-2 дней.`,
    },
    {
      q: `Можно ли купить ${n} в рассрочку?`,
      a: `Да, большинство товаров категории «${n}» доступны в рассрочку. Свяжитесь с продавцом для уточнения условий рассрочки.`,
    },
    {
      q: `Как выбрать ${n} на Катта Чегирма?`,
      a: `Используйте фильтры на странице категории: цена, бренд. Сравните несколько моделей и читайте описания товаров. Если нужна помощь — напишите продавцу напрямую через кнопку «Связаться».`,
    },
    {
      q: `Есть ли гарантия на ${n}?`,
      a: `Все ${n} на Катта Чегирма продаются с официальной гарантией производителя. Срок гарантии указан в описании каждого товара.`,
    },
  ];
  // Add category-specific FAQs
  if (n.toLowerCase().includes("пылесос")) {
    base.push({ q: "Какой пылесос лучше выбрать — с мешком или без?", a: "Пылесосы без мешка (циклонные) удобнее в обслуживании — не нужно покупать расходники. Пылесосы с мешком лучше удерживают мелкую пыль и аллергены. Для аллергиков рекомендуем модели с HEPA-фильтром." });
  }
  if (n.toLowerCase().includes("холодильник") || n.toLowerCase().includes("морозил")) {
    base.push({ q: "Какой объём холодильника выбрать для семьи?", a: "Для семьи из 2-3 человек оптимальный объём 200-300 литров. Для семьи из 4-5 человек — 300-400 литров. Двухкамерные модели с No Frost удобнее в уходе." });
  }
  if (n.toLowerCase().includes("кондиционер") || n.toLowerCase().includes("куллер")) {
    base.push({ q: "Какой кондиционер подходит для комнаты 20 кв.м?", a: "Для комнаты 20 кв.м рекомендуется кондиционер мощностью 7000-9000 BTU (2-2.5 кВт). Инверторные модели экономичнее на 30-40% по сравнению с обычными." });
  }
  if (n.toLowerCase().includes("стирал")) {
    base.push({ q: "Стиральная машина с фронтальной или вертикальной загрузкой?", a: "Фронтальные машины экономичнее по воде и электричеству, вертикальные занимают меньше места. Для небольших квартир вертикальная загрузка удобнее." });
  }
  return base;
}
