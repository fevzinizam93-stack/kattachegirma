import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Store, Search, ArrowLeft, Calendar, ChevronRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SellersList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._sellersSearchTimer);
    (window as any)._sellersSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data: sellers = [], isLoading } = trpc.sellers.listPublic.useQuery(
    { search: debouncedSearch || undefined },
    {}
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6">
        {/* Back */}
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <ArrowLeft size={15} />
            На главную
          </button>
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Users size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Продавцы</h1>
            <p className="text-xs text-gray-500">Все одобренные продавцы на платформе</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Поиск по имени продавца..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 bg-white border-gray-200"
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && sellers.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <Store size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">
              {debouncedSearch ? `Продавцы по запросу «${debouncedSearch}» не найдены` : "Продавцов пока нет"}
            </p>
          </div>
        )}

        {/* Sellers grid */}
        {!isLoading && sellers.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mb-3">{sellers.length} продавцов</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(sellers as any[]).map((seller) => (
                <Link key={seller.id} href={`/seller/${seller.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                        <Store size={20} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate text-sm">{seller.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Calendar size={11} />
                          <span>
                            {new Date(seller.createdAt).toLocaleDateString("ru-RU", {
                              year: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        {seller.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{seller.description}</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-amber-500 transition-colors shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
