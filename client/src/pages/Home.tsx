import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Percent, Shield, Truck, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: featuredData, isLoading: featuredLoading } = trpc.products.list.useQuery({
    featured: true,
    limit: 8,
    offset: 0,
  });

  const { data: newData, isLoading: newLoading } = trpc.products.list.useQuery({
    limit: 8,
    offset: 0,
  });

  const { data: categoriesData } = trpc.categories.list.useQuery();

  const featuredProducts = featuredData?.items ?? [];
  const newProducts = newData?.items ?? [];
  const categories = categoriesData ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner - белый фон */}
      <section className="bg-white border-b border-gray-100 py-8 md:py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Logo */}
            <div className="shrink-0">
              <img
                src="/manus-storage/kattachegirma-logo_b5417617.png"
                alt="Katta Chegirma - Texnomagister"
                className="h-28 md:h-36 w-auto object-contain"
              />
            </div>
            {/* Text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
                <Zap size={14} />
                Katta chegirmalar!
              </div>
              <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight text-gray-900">
                Uy texnikasi<br />
                <span className="text-primary">eng arzon narxda</span>
              </h1>
              <p className="text-gray-500 text-lg mb-6">
                Elektr supurgidan tortib to televizorgacha — barchasi bir joyda, eng qulay narxlarda.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Link href="/catalog">
                  <button className="bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
                    Xarid qilish <ArrowRight size={18} />
                  </button>
                </Link>
                <Link href="/catalog">
                  <button className="border-2 border-primary text-primary font-bold px-6 py-3 rounded-xl hover:bg-primary/5 transition-colors">
                    Katalog
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-b border-border">
        <div className="container py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <Truck size={20} className="text-primary" />, title: "Tez yetkazib berish", desc: "Butun O'zbekiston bo'ylab" },
              { icon: <Shield size={20} className="text-primary" />, title: "Kafolat", desc: "Barcha mahsulotlarga" },
              { icon: <Percent size={20} className="text-primary" />, title: "Katta chegirmalar", desc: "Har kuni yangi aksiyalar" },
              { icon: <Zap size={20} className="text-primary" />, title: "Original mahsulotlar", desc: "100% sifat kafolati" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="shrink-0 bg-primary/10 p-2 rounded-lg">{f.icon}</div>
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl md:text-2xl font-black">Kategoriyalar</h2>
          <Link href="/catalog" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {categories.map(cat => (
            <Link key={cat.id} href={`/category/${cat.slug}`}>
              <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer text-center">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium leading-tight">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container pb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-black">🔥 Katta chegirmalar</h2>
          </div>
          <Link href="/catalog?featured=true" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>
        {featuredLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featuredProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Promo Banner - kırmızı */}
      <section className="container pb-8">
        <div className="bg-primary rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black mb-2">Yangi mahsulotlar keldi!</h3>
            <p className="text-white/80">Eng so'nggi texnologiyalar eng qulay narxlarda</p>
          </div>
          <Link href="/catalog">
            <button className="bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-2">
              Ko'rish <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </section>

      {/* New Products */}
      <section className="container pb-12">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-black">✨ Barcha mahsulotlar</h2>
          </div>
          <Link href="/catalog" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
            Barchasi <ArrowRight size={14} />
          </Link>
        </div>
        {newLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {newProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
