import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, MessageCircle, Minus, Phone, Plus, ShoppingCart, Star, Tag, Truck, Send } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

interface ProductDetailProps {
  slug: string;
}

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 font-black text-gray-900 text-base">
          <span className="w-1 h-5 bg-primary rounded-full inline-block" />
          {title}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      <div
        className={`transition-all duration-200 overflow-hidden ${open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
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
  const displayName = (lang === "uz" && (product as any).nameUz) ? (product as any).nameUz : product.name;
  const descriptionText = (lang === "uz" && (product as any).descriptionUz)
    ? (product as any).descriptionUz
    : (product.description || (product as any).descriptionUz);
  const allImages: string[] = (product as any).images?.length
    ? (product as any).images
    : product.imageUrl ? [product.imageUrl] : [];
  const activeUrl = allImages[activeImageIdx] ?? product.imageUrl;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: displayName,
      price: parseFloat(product.price),
      quantity,
      imageUrl: product.imageUrl ?? undefined,
      slug: product.slug,
    });
    toast.success(lang === "uz" ? `${quantity} ta mahsulot savatga qo'shildi!` : `${quantity} шт. добавлено в корзину!`, {
      description: displayName,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-1.5">
          <div className="flex items-center gap-1 text-[11px] text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">{t.nav_home}</Link>
            <ChevronRight size={10} />
            <Link href="/catalog" className="hover:text-primary transition-colors">{t.nav_catalog}</Link>
            {category && (
              <>
                <ChevronRight size={10} />
                <Link href={`/category/${category.slug}`} className="hover:text-primary transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight size={10} />
            <span className="text-gray-700 truncate max-w-[160px]">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container py-2">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* ===== LEFT COLUMN ===== */}
            <div className="flex flex-col p-2 md:p-3">

              {/* Badges + Name — very compact */}
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                {product.brand && (
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    {product.brand}
                  </span>
                )}
                {category && (
                  <span className="bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    {category.name}
                  </span>
                )}
              </div>

              {/* Product name — small */}
              <h1 className="text-sm font-semibold text-gray-800 mb-1 leading-snug line-clamp-2">
                {displayName}
              </h1>

              {/* Rating — tiny */}
              <div className="flex items-center gap-0.5 mb-1.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={10} className={i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
                ))}
                <span className="text-[10px] text-gray-400 ml-1">(4.0)</span>
              </div>

              {/* Photo — takes up most of the space */}
              <div
                className="relative bg-gray-50 flex items-center justify-center rounded-xl overflow-hidden mb-1.5 flex-1 cursor-zoom-in"
                style={{minHeight: "300px"}}
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setZoomPos({ x, y });
                }}
              >
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {hasDiscount && (
                    <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      -{product.discount}%
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      YANGI
                    </span>
                  )}
                  {(product as any).isHit && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow">
                      🔥 Hit
                    </span>
                  )}
                </div>
                {activeUrl ? (
                  <img
                    src={activeUrl}
                    alt={product.name}
                    className="w-full h-full object-contain rounded-xl drop-shadow-sm transition-transform duration-300 ease-out"
                    style={{
                      maxHeight: "380px",
                      transform: zoomed ? `scale(2)` : "scale(1)",
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center">
                    <span className="text-gray-400 text-6xl">📦</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-1 mb-1.5 overflow-x-auto">
                  {allImages.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === activeImageIdx ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200 hover:border-primary/50'
                      }`}
                    >
                      <img src={url} alt={`Фото ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Price row — very compact */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 mb-1.5 border border-gray-100">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasDiscount && product.originalPrice && (
                    <span className="text-gray-400 line-through text-[11px]">{formatPrice(product.originalPrice)}</span>
                  )}
                  <span className="text-base font-black text-primary">{formatPrice(product.price)}</span>
                  {hasDiscount && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Tag size={8} />-{product.discount}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${(product.stock ?? 0) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-[10px] font-semibold ${(product.stock ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(product.stock ?? 0) > 0 ? t.detail_in_stock : t.detail_out_of_stock}
                  </span>
                </div>
              </div>

              {/* Quantity + Button — same row, compact */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {(product.stock ?? 0) > 0 && (
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-2 py-1 hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="px-2 py-1 font-bold text-xs min-w-[28px] text-center border-x border-gray-200">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => Math.min(product.stock ?? 99, q + 1))}
                      className="px-2 py-1 hover:bg-gray-100 transition-colors text-gray-600"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleAddToCart}
                  disabled={(product.stock ?? 0) === 0}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    (product.stock ?? 0) === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-md shadow-primary/25"
                  }`}
                >
                  <ShoppingCart size={13} />
                  {(product.stock ?? 0) === 0 ? t.detail_out_of_stock : t.card_add_to_cart}
                </button>
              </div>

              {/* Seller contacts — compact */}
              {(product.sellerPhone || product.sellerTelegram) && (
                <div className="border border-gray-200 rounded-xl p-2 mb-1.5 bg-gray-50">
                  {product.sellerName && (
                    <p className="text-[10px] font-bold text-gray-500 mb-1">
                      {t.detail_seller}: {product.sellerName}
                    </p>
                  )}
                  <div className="flex flex-col gap-1">
                    {product.sellerPhone && (
                      <a
                        href={`tel:${product.sellerPhone}`}
                        className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors text-xs font-semibold"
                      >
                        <Phone size={12} />
                        <span>{product.sellerPhone}</span>
                      </a>
                    )}
                    {product.sellerTelegram && (
                      <a
                        href={`https://t.me/${telegramUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors text-xs font-semibold"
                      >
                        <MessageCircle size={12} />
                        <span>Telegram: {product.sellerTelegram}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery info — minimal */}
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                <Truck size={12} className="text-primary shrink-0" />
                <span>
                  <span className="font-semibold text-gray-600">{t.detail_delivery}</span>
                  <span className="text-gray-400"> — {t.detail_delivery_desc}</span>
                </span>
              </div>
            </div>

            {/* ===== RIGHT COLUMN: Description + Specs (accordion) ===== */}
            <div className="flex flex-col gap-3 p-3 md:p-4">

              {descriptionText ? (
                <AccordionSection title={t.detail_about} defaultOpen={true}>
                  <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">
                    {descriptionText}
                  </p>
                </AccordionSection>
              ) : (
                <AccordionSection title={t.detail_about} defaultOpen={true}>
                  <div className="flex flex-col items-center justify-center text-center py-8 text-gray-400">
                    <span className="text-4xl mb-2">📋</span>
                    <p className="text-sm">{lang === "uz" ? "Tavsif hali qo'shilmagan" : "Описание пока не добавлено"}</p>
                  </div>
                </AccordionSection>
              )}

              {Object.keys(specs).length > 0 && (
                <AccordionSection title={t.detail_specs} defaultOpen={true}>
                  <div className="space-y-0">
                    {Object.entries(specs).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-500 text-sm">{key}</span>
                        <span className="text-gray-900 text-sm font-semibold text-right ml-4">{value}</span>
                      </div>
                    ))}
                  </div>
                </AccordionSection>
              )}

            </div>

          </div>
        </div>

        {/* ===== REVIEWS SECTION ===== */}
        <ReviewsSection productId={product.id} lang={lang} />

      </div>
    </div>
  );
}

// ---- Reviews Section Component ----
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            size={onChange ? 22 : 14}
            className={i <= (hover || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ productId, lang }: { productId: number; lang: string }) {
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: reviewsList = [] } = trpc.reviews.listByProduct.useQuery({ productId });
  const { data: summary } = trpc.reviews.summary.useQuery({ productId });
  const submitMutation = trpc.reviews.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setAuthorName("");
      setRating(5);
      setComment("");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;
    submitMutation.mutate({ productId, authorName: authorName.trim(), rating, comment: comment.trim() });
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(lang === "uz" ? "uz-UZ" : "ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-black text-gray-900">
            {lang === "uz" ? "Xaridorlar sharhlari" : "Отзывы покупателей"}
          </h2>
          {(summary?.count ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
              <Star size={13} className="text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-bold text-yellow-700">{summary!.avgRating}</span>
              <span className="text-xs text-yellow-600">({summary!.count})</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Left: review list */}
        <div className="p-4">
          {reviewsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Star size={36} className="mb-2 text-gray-200" />
              <p className="text-sm">{lang === "uz" ? "Hali sharhlar yo'q" : "Отзывов пока нет"}</p>
              <p className="text-xs mt-1">{lang === "uz" ? "Birinchi bo'lib sharh qoldiring!" : "Будьте первым!"}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {reviewsList.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-800">{r.authorName}</span>
                    <span className="text-[11px] text-gray-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <StarRating value={r.rating} />
                  <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: submit form */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">
            {lang === "uz" ? "Sharh qoldiring" : "Оставить отзыв"}
          </h3>
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Star size={24} className="text-green-500 fill-green-500" />
              </div>
              <p className="font-bold text-gray-800 text-sm">
                {lang === "uz" ? "Rahmat!" : "Спасибо за отзыв!"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {lang === "uz" ? "Sharh moderatsiyadan o'tgach e'lon qilinadi." : "Отзыв появится после проверки модератором."}
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-3 text-xs text-primary underline"
              >
                {lang === "uz" ? "Yana sharh qoldirish" : "Оставить ещё один отзыв"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === "uz" ? "Ismingiz" : "Ваше имя"}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder={lang === "uz" ? "Ismingizni kiriting" : "Введите ваше имя"}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === "uz" ? "Baho" : "Оценка"}
                </label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {lang === "uz" ? "Sharh" : "Комментарий"}
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={lang === "uz" ? "Fikringizni yozing..." : "Напишите ваш отзыв..."}
                  required
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-60"
              >
                <Send size={14} />
                {submitMutation.isPending
                  ? (lang === "uz" ? "Yuborilmoqda..." : "Отправка...")
                  : (lang === "uz" ? "Sharh yuborish" : "Отправить отзыв")}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                {lang === "uz" ? "Sharhlar moderatsiyadan o'tadi" : "Отзывы проходят модерацию перед публикацией"}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
