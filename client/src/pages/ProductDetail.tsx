import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ChevronRight, MessageCircle, Minus, Phone, Plus, ShoppingCart, Star, Tag, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ProductDetailProps {
  slug: string;
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const { addItem } = useCart();
  const { lang, t } = useLanguage();
  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("ru-RU").format(num) + " " + t.common_sum;
  };

  const { data: product, isLoading } = trpc.products.bySlug.useQuery({ slug });
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];
  const category = categories.find(c => c.id === product?.categoryId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-8">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-64 mb-6" />
            <div className="bg-white rounded-2xl p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="aspect-square bg-gray-200 rounded-xl" />
                <div className="space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-3/4" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                  <div className="h-16 bg-gray-200 rounded" />
                  <div className="h-12 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t.detail_not_found}</h2>
          <p className="text-gray-500 mb-6">{t.detail_not_found_desc}</p>
          <Link href="/catalog" className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
            {t.nav_catalog}
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = (product.discount ?? 0) > 0 && product.originalPrice;
  const specs = (product.specs as Record<string, string> | null) ?? {};
  const telegramUsername = product.sellerTelegram?.replace("@", "").replace("https://t.me/", "");

  const handleAddToCart = () => {
    const displayName = (lang === "uz" && (product as any).nameUz) ? (product as any).nameUz : product.name;
    addItem({
      productId: product.id,
      name: displayName,
      price: parseFloat(product.price),
      quantity,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
    });
    toast.success(lang === "uz" ? `${quantity} ta mahsulot savatga qo'shildi!` : `${quantity} шт. добавлено в корзину!`, {
      description: product.name,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-3">
          <div className="flex items-center gap-1 text-sm text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">{t.nav_home}</Link>
            <ChevronRight size={14} />
            <Link href="/catalog" className="hover:text-primary transition-colors">{t.nav_catalog}</Link>
            {category && (
              <>
                <ChevronRight size={14} />
                <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight size={14} />
            <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Main product card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="grid md:grid-cols-2 gap-0">

            {/* LEFT: Фотография */}
            {(() => {
              const allImages: string[] = (product as any).images?.length
                ? (product as any).images
                : product.imageUrl ? [product.imageUrl] : [];
              const activeUrl = allImages[activeImageIdx] ?? product.imageUrl;
              return (
                <div className="border-r border-gray-100">
                  {/* Main image */}
                  <div className="relative bg-gray-50 flex items-center justify-center p-8 min-h-[320px] md:min-h-[400px]">
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      {hasDiscount && (
                        <span className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-full shadow">
                          -{product.discount}%
                        </span>
                      )}
                      {product.isNew && (
                        <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow">
                          YANGI
                        </span>
                      )}
                    </div>
                    {activeUrl ? (
                      <img
                        src={activeUrl}
                        alt={product.name}
                        className="max-w-full max-h-[360px] object-contain rounded-xl drop-shadow-sm transition-all duration-200"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                        <span className="text-gray-400 text-8xl">📦</span>
                      </div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {allImages.length > 1 && (
                    <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100 overflow-x-auto">
                      {allImages.map((url, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIdx(idx)}
                          className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === activeImageIdx ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 hover:border-primary/50'
                          }`}
                        >
                          <img src={url} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* RIGHT: Описание и кнопки */}
            <div className="p-6 md:p-8 flex flex-col">
              {/* Brand & Category badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {product.brand && (
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {product.brand}
                  </span>
                )}
                {category && (
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                    {category.name}
                  </span>
                )}
              </div>

              {/* Product name */}
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-3 leading-tight">
                {(lang === "uz" && (product as any).nameUz) ? (product as any).nameUz : product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={15} className={i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                ))}
                <span className="text-xs text-gray-400 ml-1">(4.0)</span>
              </div>

              {/* Price block */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                {hasDiscount && product.originalPrice ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag size={13} className="text-gray-400" />
                      <span className="text-gray-400 text-xs">{t.detail_old_price}</span>
                    </div>
                    <div className="text-gray-400 line-through text-base mb-2">
                      {formatPrice(product.originalPrice)}
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag size={13} className="text-primary" />
                      <span className="text-primary text-xs font-bold">{t.detail_new_price}</span>
                    </div>
                    <div className="text-3xl font-black text-primary">
                      {formatPrice(product.price)}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full">
                      {t.detail_saving}: {formatPrice(parseFloat(product.originalPrice) - parseFloat(product.price))}
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-black text-gray-900">
                    {formatPrice(product.price)}
                  </div>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2 mb-5">
                <div className={`w-2.5 h-2.5 rounded-full ${(product.stock ?? 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-semibold ${(product.stock ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(product.stock ?? 0) > 0 ? `${t.detail_in_stock} (${product.stock})` : t.detail_out_of_stock}
                </span>
              </div>

              {/* Quantity selector */}
              {(product.stock ?? 0) > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4 py-2 font-bold text-sm min-w-[44px] text-center border-x border-gray-200">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock ?? 99, q + 1))}
                      className="px-3 py-2 hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">{t.detail_pcs}</span>
                </div>
              )}

              {/* "Uspey po skidke" button */}
              <button
                onClick={handleAddToCart}
                disabled={(product.stock ?? 0) === 0}
                className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all mb-4 ${
                  (product.stock ?? 0) === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-lg shadow-primary/25"
                }`}
              >
                <ShoppingCart size={22} />
                {(product.stock ?? 0) === 0 ? t.detail_out_of_stock : t.card_add_to_cart}
              </button>

              {/* Seller contact */}
              {(product.sellerPhone || product.sellerTelegram) && (
                <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    {product.sellerName ? `${t.detail_seller}: ${product.sellerName}` : t.detail_contact_seller}
                  </p>
                  <div className="flex flex-col gap-2">
                    {product.sellerPhone && (
                      <a
                        href={`tel:${product.sellerPhone}`}
                        className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg hover:bg-green-100 transition-colors text-sm font-semibold"
                      >
                        <Phone size={16} />
                        <span>{product.sellerPhone}</span>
                      </a>
                    )}
                    {product.sellerTelegram && (
                      <a
                        href={`https://t.me/${telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
                      >
                        <MessageCircle size={16} />
                        <span>Telegram: {product.sellerTelegram}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery info */}
              <div className="flex items-center gap-2.5 text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                <Truck size={18} className="text-primary shrink-0" />
                <div>
                  <span className="font-semibold text-gray-700">{t.detail_delivery}</span>
                  <span className="text-gray-400"> — {t.detail_delivery_desc}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description + Specs */}
        <div className="grid md:grid-cols-2 gap-6">
          {product.description && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full inline-block" />
                {t.detail_about}
              </h2>
              <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">
                {(lang === "uz" && (product as any).descriptionUz) ? (product as any).descriptionUz : product.description}
              </p>
            </div>
          )}

          {Object.keys(specs).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-primary rounded-full inline-block" />
                {t.detail_specs}
              </h2>
              <div className="space-y-1">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 text-sm">{key}</span>
                    <span className="text-gray-900 text-sm font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
