import ProductCard from "@/components/ProductCard";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  const { data, isLoading } = trpc.products.list.useQuery({
    search: query,
    limit: 24,
    offset: 0,
  });

  const products = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-primary" />
            <h1 className="text-xl font-black">
              "{query}" bo'yicha qidiruv
            </h1>
          </div>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-1">{total} ta natija topildi</p>
          )}
        </div>
      </div>

      <div className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-bold mb-2">Hech narsa topilmadi</h3>
            <p className="text-muted-foreground text-sm">"{query}" bo'yicha mahsulot topilmadi. Boshqa so'z bilan qidirib ko'ring.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
