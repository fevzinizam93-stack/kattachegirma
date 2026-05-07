import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { Store, Calendar, ShieldAlert, ArrowLeft, PackageSearch } from "lucide-react";

export default function SellerStorefront() {
  const params = useParams<{ id: string }>();
  const sellerId = parseInt(params.id ?? "0", 10);

  const { data: seller, isLoading: sellerLoading } = trpc.sellers.getPublicProfile.useQuery(
    { id: sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const { data: products = [], isLoading: productsLoading } = trpc.sellers.getPublicProducts.useQuery(
    { id: sellerId },
    { enabled: !isNaN(sellerId) && sellerId > 0 }
  );

  const isLoading = sellerLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-4 bg-gray-200 rounded w-72" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store size={48} className="mx-auto text-gray-300 mb-3" />
          <h1 className="text-xl font-bold text-gray-700 mb-2">Продавец не найден</h1>
          <p className="text-gray-500 text-sm mb-4">Этот продавец не существует или ещё не одобрен.</p>
          <Link href="/">
            <button className="flex items-center gap-2 mx-auto text-sm text-red-600 hover:text-red-700 font-semibold">
              <ArrowLeft size={16} />
              На главную
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(seller.createdAt).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-6">
        {/* Back button */}
        <Link href="/">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <ArrowLeft size={15} />
            Назад
          </button>
        </Link>

        {/* Seller header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Store size={28} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-900 truncate">{seller.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <Calendar size={12} />
                <span>На сайте с {joinedDate}</span>
              </div>
              {seller.description && (
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{seller.description}</p>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-0.5">Товары стороннего продавца</p>
              <p>
                Katta Chegirma является торговой площадкой и не несёт ответственности за товары данного продавца.
                Качество товара, доставка и гарантия — ответственность продавца <strong>{seller.name}</strong>.
                Наш портал предоставляет доступ всем, кто хочет продавать товары со скидкой, чтобы покупателям было выгодно.
              </p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-black text-gray-900">
            Товары продавца
            {products.length > 0 && (
              <span className="ml-2 text-sm font-semibold text-gray-400">({products.length})</span>
            )}
          </h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <PackageSearch size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">У этого продавца пока нет товаров</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
