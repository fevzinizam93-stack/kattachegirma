import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Tag } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: featuredData, isLoading: featuredLoading } = trpc.products.list.useQuery({
    featured: true,
    limit: 10,
    offset: 0,
  });

  const { data: newData, isLoading: newLoading } = trpc.products.list.useQuery({
    limit: 10,
    offset: 0,
  });

  const featuredProducts = featuredData?.items ?? [];
  const newProducts = newData?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ===== БОЛЬШИЕ СКИДКИ BANNER ===== */}
      <section className="bg-white border-b border-gray-200">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            {/* Left: badge */}
            <div
              className="flex items-center gap-2 text-white font-black text-xl md:text-2xl px-5 py-2.5 rounded-full"
              style={{ backgroundColor: "#cc0000" }}
            >
              <Tag size={20} />
              БОЛЬШИЕ СКИДКИ!
            </div>

            {/* Center: slogan */}
            <div className="hidden md:block text-gray-600 text-sm font-medium flex-1 text-center px-6">
              Самые низкие цены — только у нас
            </div>

            {/* Right: link */}
            <Link
              href="/catalog?featured=true"
              className="flex items-center gap-1 text-sm font-semibold hover:underline whitespace-nowrap"
              style={{ color: "#cc0000" }}
            >
              Смотреть все <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FEATURED PRODUCTS GRID ===== */}
      <section className="container py-4">
        {featuredLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 h-72 animate-pulse" />
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          /* Fallback: show all products if no featured */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {newProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* ===== ALL PRODUCTS ===== */}
      {featuredProducts.length > 0 && (
        <section className="container pb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-gray-900">Все товары</h2>
            <Link href="/catalog" className="text-sm font-semibold hover:underline" style={{ color: "#cc0000" }}>
              Смотреть все <ArrowRight size={14} className="inline" />
            </Link>
          </div>
          {newLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 h-72 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {newProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
