import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, MessageCircle, Minus, Phone, Plus, ShoppingCart, Star, Tag, Truck, Send, ArrowLeftRight, Zap, Youtube, Share2, Copy, Check, MessageSquare, TrendingDown, ShoppingBag, ShieldCheck, RotateCcw, BadgeCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";
import ProductCard from "@/components/ProductCard";
import CompareModal from "@/components/CompareModal";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import QuickBuyModal from "@/components/QuickBuyModal";
import { trackViewContent, trackAddToCart } from "@/hooks/useFacebookPixel";
import { imgUrl } from "@/lib/imgUrl";
import { getSpecTemplate, extractSpecs } from "@/lib/specTemplates";

function VideoReviewDetailButton({ productName, savedVideoId }: { productName: string; savedVideoId?: string | null }) {
  const [open, setOpen] = useState(false);
  const dynamicQuery = trpc.youtube.findVideoForProduct.useQuery(
    { productName },
    { enabled: !savedVideoId, staleTime: 60 * 60 * 1000, retry: false, refetchOnWindowFocus: false }
  );

  const videoId = savedVideoId || dynamicQuery.data?.videoId;
  const videoTitle = dynamicQuery.data?.title ?? "Видеообзор";

  if (!savedVideoId && (dynamicQuery.isLoading || !videoId)) return null;
  if (!videoId) return null;

  const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

  return (
    <>
      {/* Inline preview card — always visible, click to play */}
      <div
        className="relative w-full rounded-xl overflow-hidden cursor-pointer group border border-red-100 shadow-sm"
        onClick={() => setOpen(true)}
        style={{ aspectRatio: "16/9" }}
      >
        <img
          src={thumbUrl}
          alt={videoTitle}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/45 transition-colors" />
        {/* Play button */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-14 h-14 rounded-full bg-red-600 group-hover:bg-red-700 flex items-center justify-center shadow-xl transition-all group-hover:scale-110">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Видеообзор</span>
        </div>
        {/* YouTube badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5">
          <Youtube size={11} className="text-red-500" />
          <span className="text-white text-[10px] font-semibold">YouTube</span>
        </div>
      </div>

      {/* Modal player */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.80)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
              <div className="flex items-center gap-2 min-w-0">
                <Youtube size={16} className="text-red-500 shrink-0" />
                <span className="text-white text-xs font-semibold truncate">{videoTitle}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-gray-400 hover:text-white transition-colors">YouTube ↗</a>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-white transition-colors">✕</button>
              </div>
            </div>
            <div style={{ paddingBottom: "56.25%", position: "relative" }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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

// Кнопка «Связаться» с выпадающим меню
function ContactButton({ phone, telegram }: { phone: string; telegram: string }) {
  const [open, setOpen] = useState(false);
  const telegramUsername = telegram?.replace("@", "").replace("https://t.me/", "");
  const hasPhone = Boolean(phone);
  const hasTelegram = Boolean(telegram);

  if (!hasPhone && !hasTelegram) return null;

  // Если есть только один вариант — сразу переходим по нему
  if (hasPhone && !hasTelegram) {
    return (
      <a
        href={`tel:${phone}`}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
      >
        <Phone size={15} />
        Связаться
      </a>
    );
  }
  if (!hasPhone && hasTelegram) {
    return (
      <a
        href={`https://t.me/${telegramUsername}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
      >
        <MessageCircle size={15} />
        Связаться в Telegram
      </a>
    );
  }

  // Есть оба — показываем кнопку с выпадающим меню
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
      >
        <Phone size={15} />
        Связаться
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Позвонить</p>
              <p className="text-xs text-gray-500">{phone}</p>
            </div>
          </a>
          <div className="border-t border-gray-100" />
          <a
            href={`https://t.me/${telegramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <MessageCircle size={15} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Telegram</p>
              <p className="text-xs text-gray-500">{telegram}</p>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  // On-demand description translation (RU→UZ)
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const translateDescMut = trpc.products.translateDescription.useMutation({
    onSuccess: (data) => {
      setTranslatedDesc(data.translated);
      setShowTranslated(true);
    },
    onError: () => toast.error("Tarjimada xatolik yuz berdi"),
  });
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [compareOpen, setCompareOpen] = useState(false);
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addItem } = useCart();
  const { addItem: addToRecentlyViewed } = useRecentlyViewed();
  const { t, lang } = useLanguage();
  const { formatProductPrice } = useCurrency();

  // Optimized: single request for all product page data
  const { data: productPageData, isLoading } = trpc.products.getProductPage.useQuery(
    { slug },
    { staleTime: 2 * 60 * 1000 }
  );
  const product = productPageData?.product ?? null;
  const reviewSummary = productPageData?.reviewSummary ?? null;
  const preloadedReviews = productPageData?.reviews ?? null;
  const preloadedSimilar = productPageData?.similar ?? null;
  // Derive category from product (no extra query needed)
  // We keep a minimal category object; slug comes from product's categorySlug if available
  const category = product ? { id: product.categoryId, name: (product as any).categoryName as string ?? '', slug: (product as any).categorySlug as string ?? '' } : null;
  // For SEO helpers that need categories array, build a minimal array
  const categories: Array<{ id: number; name: string; slug: string }> = category ? [category] : [];

  const [liveViewCount, setLiveViewCount] = useState<number | null>(null);
  // Simulated "watching now" — seeded by product id for consistency
  const watchingNow = product ? ((product.id * 7 + 3) % 13) + 3 : 0; // 3..15
  const [countdown, setCountdown] = useState<{ h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    const endsAt = (product as any)?.discountEndsAt;
    if (!endsAt) { setCountdown(null); return; }
    const endTime = new Date(endsAt).getTime();
    const tick = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setCountdown(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [(product as any)?.discountEndsAt]);
  const incrementView = trpc.products.incrementView.useMutation({
    onSuccess: (data) => setLiveViewCount(data.viewCount),
    onError: () => {
      // Fallback: show stored viewCount from product data
      const stored = (product as any)?.viewCount;
      if (stored != null) setLiveViewCount(stored);
    },
  });
  useEffect(() => {
    if (!product?.id) return;
    // Deduplicate: only increment once per browser session per product
    const key = `viewed_${product.id}`;
    if (sessionStorage.getItem(key)) {
      // Already counted this session — just show stored count
      const stored = (product as any)?.viewCount;
      if (stored != null) setLiveViewCount(stored);
      return;
    }
    sessionStorage.setItem(key, "1");
    incrementView.mutate({ productId: product.id });
    // Track Facebook Pixel ViewContent
    trackViewContent({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price || '0'),
      category: product.categoryId ? String(product.categoryId) : undefined,
    });
    // Save to recently viewed history
    addToRecentlyViewed({
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      imageUrl: product.imageUrl,
      isNew: product.isNew,
      isHit: product.isHit,
      isPremium: (product as any).isPremium,
      stock: product.stock,
      categoryId: product.categoryId,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // SEO: dynamic meta tags via usePageMeta
  const productTitle = product
    ? (() => {
        const brand = product.brand || "";
        const nameHasBrand = brand && product.name.toLowerCase().includes(brand.toLowerCase());
        const titleBrand = (brand && !nameHasBrand) ? ` ${brand}` : "";
        const baseName = `${product.name}${titleBrand}`;
        // SEO: add "narxi" keyword (high-intent Uzbek search term) + CTA
        // Google displays ~120 chars; use short suffix for long names to stay within limit
        // Thresholds: name ≤ 77 chars → full suffix (43 chars) → total ≤ 120
        //             name ≤ 97 chars → medium suffix (23 chars) → total ≤ 120
        //             name > 97 chars → short suffix (20 chars) → total ≤ 117
        const FULL_SUFFIX   = " narxi — купить в Ташкенте | Katta Chegirma"; // 43 chars
        const MEDIUM_SUFFIX = " narxi — Toshkent | Katta Chegirma";          // 34 chars
        const SHORT_SUFFIX  = " narxi | Katta Chegirma";                      // 23 chars
        const suffix =
          baseName.length <= 77 ? FULL_SUFFIX :
          baseName.length <= 86 ? MEDIUM_SUFFIX :
          SHORT_SUFFIX;
        return `${baseName}${suffix}`;
      })()
    : "Катта Чегирма — Магазин бытовой техники";

  const productDesc = product
    ? (() => {
        const brand = product.brand ? `${product.brand} ` : "";
        const price = parseFloat(product.price);
        const priceStr = price > 0 ? ` Цена: ${price.toLocaleString("ru-RU")} сум.` : "";
        const inStock = !product.stock || product.stock > 0;
        const stockStr = inStock ? " В наличии." : " Нет в наличии.";
        const desc = (product as any).description;
        if (desc && desc.length > 30) {
          return `${desc.slice(0, 130)}${desc.length > 130 ? "…" : ""}${priceStr}${stockStr}`;
        }
        return `Купите ${brand}${product.name} по выгодной цене в интернет-магазине Катта Чегирма.${priceStr}${stockStr} Быстрая доставка по Ташкенту и Узбекистану.`;
      })()
    : "Катта Чегирма — самая дешёвая бытовая техника в Узбекистане. Пылесосы, стиральные машины, холодильники, телевизоры, кондиционеры.";

  // Keywords: exact model number + product name + brand + category — helps rank for model number searches
  const productKeywordsUz = product
    ? (() => {
        const nameUz = (product as any).nameUz as string | null;
        const brand = product.brand ?? "";
        const catUz = categories.find(c => c.id === product.categoryId)?.name ?? "";
        const uzName = nameUz || product.name;
        // Extract model numbers from product name (e.g. "FRCTBC-1170", "TN-22TC", "RS210")
        const modelMatch = product.name.match(/[A-Z0-9][A-Z0-9\-]{2,}[A-Z0-9]/g);
        const modelNumbers = modelMatch ? Array.from(new Set(modelMatch)).join(" ") : "";
        const modelKeywords = modelNumbers
          ? `${modelNumbers} купить, ${modelNumbers} цена, ${modelNumbers} Ташкент, ${modelNumbers} Узбекистан, `
          : "";
        return `${modelKeywords}${uzName} sotib olish, ${uzName} narxi, ${brand} ${catUz} arzon, ${uzName} Toshkent`
          .replace(/\s+/g, " ").trim();
      })()
    : undefined;
  // og:image must be an absolute URL for Google, Facebook, Twitter
  const absoluteImageUrl = product?.imageUrl
    ? (product.imageUrl.startsWith('http') ? product.imageUrl : `https://kattachegirma.uz${product.imageUrl}`)
    : undefined;
  usePageMeta({
    title: productTitle,
    description: productDesc,
    imageUrl: absoluteImageUrl,
    // Always set canonical from slug immediately — don't wait for product data
    // This prevents Google from seeing canonical = homepage during loading state
    canonicalPath: product ? `/product/${product.slug}` : `/product/${slug}`,
    // If product has a UZ slug, provide hreflang alternate for /mahsulot/:slugUz
    hreflangUzPath: (product as any)?.slugUz ? `/mahsulot/${(product as any).slugUz}` : undefined,
    noindex: (product as any)?.isActive === false,
    type: "product",
    keywordsUz: productKeywordsUz,
  });

  // SEO: BreadcrumbList Schema.org
  const breadcrumbCategory = categories.find(c => c.id === product?.categoryId);
  useBreadcrumbSchema(
    product
      ? [
          { name: "Главная", url: "https://kattachegirma.uz/" },
          { name: "Каталог", url: "https://kattachegirma.uz/catalog" },
          ...(breadcrumbCategory
            ? [{ name: breadcrumbCategory.name, url: `https://kattachegirma.uz/category/${breadcrumbCategory.slug}` }]
            : []),
          { name: product.name, url: `https://kattachegirma.uz/product/${product.slug}` },
        ]
      : []
  );

  // SEO: Schema.org Product JSON-LD (with aggregateRating when reviews exist)
  useEffect(() => {
    if (!product) return;
    const name = product.name;
    const price = parseFloat(product.price);
    const inStock = !product.stock || product.stock > 0;
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": (product as any).description || name,
      "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
      "sku": String(product.id),
      // Google requires absolute URLs in image field
      "image": product.imageUrl
        ? (product.imageUrl.startsWith('http') ? product.imageUrl : `https://kattachegirma.uz${product.imageUrl}`)
        : undefined,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "UZS",
        "price": price,
        "availability": inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "seller": { "@type": "Organization", "name": "Katta Chegirma" },
        "url": `https://kattachegirma.uz/product/${product.slug}`
      }
    };
    // Add aggregateRating only when there are approved reviews
    // Google requires ratingValue and reviewCount to show stars in search results
    if (reviewSummary && reviewSummary.count > 0 && reviewSummary.avgRating > 0) {
      schema["aggregateRating"] = {
        "@type": "AggregateRating",
        "ratingValue": reviewSummary.avgRating,
        "reviewCount": reviewSummary.count,
        "bestRating": 5,
        "worstRating": 1
      };
    }
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-schema";
    script.textContent = JSON.stringify(schema);
    document.getElementById("product-schema")?.remove();
    document.head.appendChild(script);
    return () => { document.getElementById("product-schema")?.remove(); };
  }, [product, reviewSummary]);

  // Auto-translate description when lang=uz and no descriptionUz exists
  useEffect(() => {
    if (
      lang === "uz" &&
      product &&
      product.description &&
      !(product as any).descriptionUz &&
      !translatedDesc &&
      !translateDescMut.isPending
    ) {
      translateDescMut.mutate({ text: product.description });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-1.5">
            <div className="flex items-center gap-2 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-12" />
              <div className="h-3 bg-gray-200 rounded w-2" />
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>

        <div className="container py-2">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 md:items-start animate-pulse">

              {/* LEFT COLUMN skeleton — mirrors real layout */}
              <div className="flex flex-col p-3 md:p-4 gap-3">
                {/* Main image */}
                <div className="relative aspect-square w-full rounded-xl bg-gray-200" />
                {/* Thumbnail strip */}
                <div className="flex gap-2">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
                  ))}
                </div>
                {/* Price row */}
                <div className="flex items-center gap-3 mt-1">
                  <div className="h-8 bg-gray-200 rounded w-36" />
                  <div className="h-5 bg-gray-200 rounded w-20" />
                  <div className="h-5 bg-gray-200 rounded-full w-16" />
                </div>
                {/* Stock badge */}
                <div className="h-4 bg-gray-200 rounded-full w-20" />
                {/* Quantity + cart button */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="w-8 h-6 bg-gray-200 rounded" />
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                  </div>
                  <div className="h-10 bg-gray-200 rounded-full flex-1" />
                </div>
                {/* Compare button */}
                <div className="h-9 bg-gray-200 rounded-full w-40" />
                {/* Delivery chip */}
                <div className="h-7 bg-gray-200 rounded-full w-56" />
                {/* WhatsApp / Telegram */}
                <div className="flex gap-2">
                  <div className="h-9 bg-gray-200 rounded-full w-32" />
                  <div className="h-9 bg-gray-200 rounded-full w-28" />
                </div>
              </div>

              {/* RIGHT COLUMN skeleton */}
              <div className="flex flex-col p-3 md:p-4 gap-4">
                {/* Brand + badges */}
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-5 bg-gray-200 rounded-full w-14" />
                  <div className="h-5 bg-gray-200 rounded-full w-12" />
                </div>
                {/* Product name */}
                <div className="space-y-2">
                  <div className="h-7 bg-gray-200 rounded w-full" />
                  <div className="h-7 bg-gray-200 rounded w-3/4" />
                </div>
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2,3,4].map(i => <div key={i} className="w-4 h-4 rounded bg-gray-200" />)}
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                {/* Divider */}
                <div className="h-px bg-gray-100" />
                {/* Specs */}
                <div className="space-y-3">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-4 bg-gray-200 rounded w-36" />
                    </div>
                  ))}
                </div>
                {/* Divider */}
                <div className="h-px bg-gray-100" />
                {/* Description heading */}
                <div className="h-5 bg-gray-200 rounded w-32" />
                {/* Description lines */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
                {/* Seller info */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="space-y-1.5">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                    <div className="h-3 bg-gray-200 rounded w-20" />
                  </div>
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

  // Product is inactive (out of stock / disabled by admin)
  if ((product as any).isActive === false) {
    // Add noindex so Google doesn't index this page
    const existingMeta = document.querySelector('meta[name="robots"]');
    if (existingMeta) existingMeta.setAttribute('content', 'noindex, nofollow');
    else {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Товар закончился
          </h2>
          <p className="text-gray-500 mb-6">
            Посмотрите другие наши товары
          </p>
          <Link href="/catalog" className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
            {t.nav_catalog}
          </Link>
        </div>
      </div>
    );
  }

  const _origPriceNum = product.originalPrice ? Number(product.originalPrice) : 0;
  const _priceNum = Number(product.price);
  const hasDiscount = _origPriceNum > _priceNum && _priceNum > 0;
  const effectiveDiscount = hasDiscount
    ? ((product.discount ?? 0) > 0 ? (product.discount as number) : Math.round((1 - _priceNum / _origPriceNum) * 100))
    : 0;
  const specs = (product.specs as Record<string, string> | null) ?? {};
  const _specTpl = getSpecTemplate(product.name);
  const _autoSpecs = _specTpl ? extractSpecs(_specTpl, product.description, specs) : [];
  const displaySpecs: Array<[string, string]> = _autoSpecs.length >= 2
    ? _autoSpecs.map((s) => [s.label, s.value] as [string, string])
    : Object.entries(specs);
  const telegramUsername = product.sellerTelegram?.replace("@", "").replace("https://t.me/", "");
  const displayName = lang === "uz" && (product as any).nameUz ? (product as any).nameUz : product.name;
  const descriptionText = lang === "uz" && (product as any).descriptionUz
    ? (product as any).descriptionUz
    : lang === "uz" && translatedDesc
      ? translatedDesc
      : product.description;
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
    // Track Facebook Pixel AddToCart
    trackAddToCart({
      id: product.id,
      name: displayName,
      price: parseFloat(product.price),
      quantity,
    });
    toast.success(`${quantity} ${t.detail_added_qty}`, {
      description: displayName,
    });
  };

  return (
    <>
    {/* Hidden element for language switcher to read product slug mapping */}
    <div data-product-slug-map={JSON.stringify({ slug: product.slug, slugUz: (product as any)?.slugUz || null })} className="hidden" />
    <div className="min-h-screen bg-gray-50 pb-32 md:pb-0">
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
                <Link href={category.slug ? `/category/${category.slug}` : '/catalog'} className="hover:text-primary transition-colors">{category.name}</Link>
              </>
            )}
            <ChevronRight size={10} />
            <span className="text-gray-700 truncate max-w-[160px]">{displayName}</span>
          </div>
        </div>
      </div>

      <div className="container py-2">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 md:items-start">

            {/* ===== LEFT COLUMN ===== */}
            <div className="flex flex-col p-3 md:p-4 gap-3 md:sticky md:top-[72px] md:self-start">

              {/* ── Photo block ── */}
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden cursor-zoom-in"
                style={{aspectRatio: "1 / 1", maxHeight: "420px"}}
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
                }}
              >
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                  {hasDiscount && (
                    <span className="bg-primary text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg shadow-primary/30">
                      -{effectiveDiscount}%
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      YANGI
                    </span>
                  )}
                  {(product as any).isHit && (
                    <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      🔥 Hit
                    </span>
                  )}
                </div>
                {/* View count + watching now — top right */}
                <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                  {liveViewCount !== null && (
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                      <span>👁</span>
                      <span>{liveViewCount.toLocaleString("ru-RU")} просмотров</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 bg-orange-500/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Сейчас смотрят: {watchingNow}
                  </div>
                </div>
                {activeUrl ? (
                  <img
                    src={imgUrl(activeUrl, 1600, 90)}
                    alt={displayName}
                    className="w-full h-full object-contain p-4 transition-transform duration-300 ease-out"
                    style={{
                      transform: zoomed ? `scale(2.2)` : "scale(1)",
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    }}
                    loading="eager"
                    decoding="sync"
                    // @ts-expect-error fetchpriority is valid HTML5 attribute
                    fetchpriority="high"
                    width="600"
                    height="600"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-300 text-8xl">📦</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                  {allImages.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        idx === activeImageIdx
                          ? 'border-primary shadow-md shadow-primary/20'
                          : 'border-transparent hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      <img src={imgUrl(url, 120, 70)} alt={`Фото ${idx + 1}`} className="w-full h-full object-contain p-1" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

            </div>

            {/* ===== RIGHT COLUMN: блок покупки ===== */}
            <div className="flex flex-col gap-3 p-3 md:p-4">

              {/* ── Product name ── */}
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{displayName}</h1>
              {product.brand && (
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide -mt-1">{product.brand}</p>
              )}
              {/* ── Rating summary near title ── */}
              {(reviewSummary?.count ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 -mt-0.5">
                  <span className="text-yellow-500 text-sm">{'★'.repeat(Math.round(reviewSummary!.avgRating))}{'☆'.repeat(5 - Math.round(reviewSummary!.avgRating))}</span>
                  <span className="text-sm font-bold text-gray-700">{reviewSummary!.avgRating}</span>
                  <span className="text-xs text-gray-400">({reviewSummary!.count} отзывов)</span>
                </div>
              )}

              {/* ── Price + Stock ── */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-end gap-4 flex-wrap">
                    {hasDiscount && product.originalPrice && (
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Было</span>
                        <span className="text-gray-400 line-through text-xl font-semibold leading-none">{formatProductPrice(product.originalPrice, (product as any).originalPriceUsd)}</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      {hasDiscount && product.originalPrice && (
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Стало</span>
                      )}
                      <p className="text-3xl font-black text-primary leading-none">{formatProductPrice(product.price, (product as any).priceUsd)}</p>
                    </div>
                  </div>
                  {hasDiscount && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                        <Tag size={10} /> Скидка {effectiveDiscount}%
                      </span>
                      {product.originalPrice && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          <TrendingDown size={11} /> Выгода {formatProductPrice(
                            Math.max(0, Number(product.originalPrice) - Number(product.price)),
                            (Number((product as any).originalPriceUsd) > 0 && Number((product as any).priceUsd) > 0)
                              ? Number((product as any).originalPriceUsd) - Number((product as any).priceUsd)
                              : undefined
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  (product.stock ?? 0) > 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${ (product.stock ?? 0) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {(product.stock ?? 0) > 0 ? t.detail_in_stock : t.detail_out_of_stock}
                </div>
              </div>

              {/* Countdown timer */}
              {countdown && hasDiscount && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <span className="text-red-600 text-xs font-bold shrink-0">⏰ Скидка истекает:</span>
                  <div className="flex items-center gap-1 ml-auto">
                    {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                      <>
                        <span key={i} className="bg-red-600 text-white text-sm font-black px-2 py-1 rounded-lg min-w-[32px] text-center tabular-nums">{String(v).padStart(2,'0')}</span>
                        {i < 2 && <span className="text-red-500 font-black">:</span>}
                      </>
                    ))}
                  </div>
                </div>
              )}
              {/* Stock warning — enhanced */}
              {(() => {
                const sc = (product as any)?.stockCount;
                if (sc == null || sc <= 0) return null;
                if (sc <= 3) {
                  return (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 animate-pulse">
                      <span className="text-red-500 text-base">🚨</span>
                      <div>
                        <p className="text-red-700 text-sm font-black">Последние {sc} шт.!</p>
                        <p className="text-red-500 text-xs">Товар заканчивается — не упустите</p>
                      </div>
                    </div>
                  );
                }
                if (sc <= 10) {
                  return (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                      <span className="text-orange-500 animate-pulse">🔥</span>
                      <span className="text-orange-700 text-sm font-bold">
                        Осталось всего <span className="font-black">{sc} шт.</span> — успейте купить!
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Соцдоказательство — покупки + просмотры */}
              {(((product as any).salesCount ?? 0) > 0 || (watchingNow ?? 0) > 0) && (
                <div className="flex items-center gap-4 px-0.5">
                  {((product as any).salesCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                      <ShoppingBag size={13} className="text-primary" /> Уже купили {(product as any).salesCount}
                    </span>
                  )}
                  {(watchingNow ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Смотрят сейчас: {watchingNow}
                    </span>
                  )}
                </div>
              )}

              {/* ── Action block ── */}
              <div className="space-y-2">
                {/* Строка 1: Счётчик + Главная кнопка */}
                <div className="flex items-center gap-2">
                  {(product.stock ?? 0) > 0 && (
                    <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-gray-800">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => Math.min(product.stock ?? 99, q + 1))}
                        className="w-9 h-9 flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                  {/* Главная кнопка — полная ширина */}
                  <button
                    onClick={handleAddToCart}
                    disabled={(product.stock ?? 0) === 0}
                    className={`flex-1 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                      (product.stock ?? 0) === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98] shadow-md shadow-primary/30"
                    }`}
                  >
                    <ShoppingCart size={16} />
                    {(product.stock ?? 0) === 0 ? t.detail_out_of_stock : hasDiscount ? "Успей по скидке!" : t.card_add_to_cart}
                  </button>
                </div>

                {/* Действия в один ряд — компактные кнопки одинакового размера */}
                <div className="flex items-stretch gap-2">
                  {/* Купить в 1 клик */}
                  <button
                    onClick={() => setQuickBuyOpen(true)}
                    disabled={(product.stock ?? 0) === 0}
                    className="flex-1 flex flex-col items-center justify-center gap-1 h-[58px] rounded-2xl border border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.96] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Zap size={18} className="text-primary" />
                    <span className="text-[11px] font-semibold leading-none">В 1 клик</span>
                  </button>
                  {/* Связаться с продавцом */}
                  {(() => {
                    const phone = (product as any).contactPhone || product.sellerPhone || "";
                    const tg = product.sellerTelegram || "";
                    const tgUser = tg.replace("@", "").replace("https://t.me/", "");
                    if (!phone && !tgUser) return null;
                    return (
                      <div className="relative flex-1">
                        <button
                          onClick={() => setContactOpen(v => !v)}
                          className="w-full flex flex-col items-center justify-center gap-1 h-[58px] rounded-2xl border border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.96] transition-all"
                        >
                          <MessageSquare size={18} className="text-emerald-600" />
                          <span className="text-[11px] font-semibold leading-none">Связаться</span>
                        </button>
                        {contactOpen && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30" style={{minWidth: '190px'}}>
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                onClick={() => setContactOpen(false)}
                              >
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                  <Phone size={14} className="text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Позвонить</p>
                                  <p className="text-xs text-gray-500">{phone}</p>
                                </div>
                              </a>
                            )}
                            {phone && <div className="border-t border-gray-100" />}
                            {phone && (
                              <a
                                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                onClick={() => setContactOpen(false)}
                              >
                                <div className="w-8 h-8 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
                                  <p className="text-xs text-gray-500">{phone}</p>
                                </div>
                              </a>
                            )}
                            {tgUser && <div className="border-t border-gray-100" />}
                            {tgUser && (
                              <a
                                href={`https://t.me/${tgUser}`}
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                onClick={() => setContactOpen(false)}
                              >
                                <div className="w-8 h-8 rounded-full bg-[#2AABEE]/15 flex items-center justify-center shrink-0">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2AABEE"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">Telegram</p>
                                  <p className="text-xs text-gray-500">@{tgUser}</p>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Сравнить */}
                  <button
                    onClick={() => setCompareOpen(true)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 h-[58px] rounded-2xl border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/60 active:scale-[0.96] transition-all"
                  >
                    <ArrowLeftRight size={18} />
                    <span className="text-[11px] font-semibold leading-none">Сравнить</span>
                  </button>
                  {/* Поделиться — выпадающее меню */}
                  <div className="relative flex-1">
                    <button
                      onClick={() => setShareOpen(v => !v)}
                      className="w-full flex flex-col items-center justify-center gap-1 h-[58px] rounded-2xl border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.96] transition-all"
                    >
                      <Share2 size={18} />
                      <span className="text-[11px] font-semibold leading-none">Поделиться</span>
                    </button>
                    {shareOpen && (
                      <div className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30 min-w-[200px]">
                        {/* Telegram */}
                        <a
                          href={`https://t.me/share/url?url=${encodeURIComponent(`https://kattachegirma.uz/product/${product.slug}?utm_source=share&utm_medium=user`)}&text=${encodeURIComponent(product.name || '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          onClick={() => setShareOpen(false)}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#2AABEE]/15 flex items-center justify-center shrink-0 text-base">✈️</div>
                          <span className="text-sm font-medium text-gray-800">Telegram</span>
                        </a>
                        <div className="border-t border-gray-100" />
                        {/* WhatsApp */}
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent((product.name || '') + '\n' + `https://kattachegirma.uz/product/${product.slug}?utm_source=share&utm_medium=user`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          onClick={() => setShareOpen(false)}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0 text-base">💬</div>
                          <span className="text-sm font-medium text-gray-800">WhatsApp</span>
                        </a>
                        <div className="border-t border-gray-100" />
                        {/* Instagram Stories — copy link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://kattachegirma.uz/product/${product.slug}?utm_source=share&utm_medium=user`).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                            setShareOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-pink-50 flex items-center justify-center shrink-0 text-base">📸</div>
                          <span className="text-sm font-medium text-gray-800">Instagram Stories</span>
                        </button>
                        <div className="border-t border-gray-100" />
                        {/* Copy link */}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://kattachegirma.uz/product/${product.slug}?utm_source=share&utm_medium=user`).then(() => {
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            });
                            setShareOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-500" />}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{copied ? "Скопировано!" : "Копировать ссылку"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video review inline preview */}
                <VideoReviewDetailButton productName={displayName} savedVideoId={(product as any).videoId} />

                {/* Row 3: Seller info — name + disclaimer only */}
                {product.sellerName && product.sellerId && (
                  <div className="flex items-center gap-2 px-1">
                    <Link
                      href={`/seller/${product.sellerId}`}
                      className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-primary transition-colors"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">🏦</span>
                      <span>{product.sellerName}</span>
                      <span className="text-[10px] text-gray-400 font-normal">Все товары →</span>
                    </Link>
                    <span className="ml-auto text-[9px] text-gray-400">⚠️ Катта Чегирма не несёт ответственности</span>
                  </div>
                )}

                {/* Доверие — гарантия / возврат / оригинал */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                    <ShieldCheck size={13} className="text-emerald-600" /> Гарантия 1 год
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                    <RotateCcw size={13} className="text-blue-600" /> Возврат 14 дней
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-[11px] font-semibold text-gray-600">
                    <BadgeCheck size={13} className="text-primary" /> Оригинал
                  </span>
                </div>

                                {/* Row 4: Delivery chip */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
                    <Truck size={13} className="text-primary shrink-0" />
                    <span className="font-semibold text-gray-700">{t.detail_delivery}</span>
                    <span className="text-gray-400">— {t.detail_delivery_desc}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== FULL WIDTH BELOW: Description + Specs ===== */}
          <div className="flex flex-col gap-3 p-3 md:p-4 border-t border-gray-100">

              <AccordionSection title={t.detail_about} defaultOpen={true}>
                {descriptionText ? (
                  <div className="flex flex-col gap-2">
                    {/* Manual translate button — only show when lang=ru */}
                    {lang === "ru" && (
                      <div className="flex items-center gap-2">
                        {!showTranslated ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (translatedDesc) {
                                setShowTranslated(true);
                              } else {
                                translateDescMut.mutate({ text: product.description || "" });
                              }
                            }}
                            disabled={translateDescMut.isPending}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-60"
                          >
                            {translateDescMut.isPending ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                O'zbek tiliga tarjima qilinmoqda...
                              </>
                            ) : (
                              <>
                                <span className="text-sm leading-none">🌐</span>
                                O'zbek tiliga tarjima qilish
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowTranslated(false)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <span className="text-sm leading-none">🇷🇺</span>
                            Русский тилда кўрсатиш
                          </button>
                        )}
                      </div>
                    )}
                    {/* Auto-translate loading indicator when lang=uz and no descriptionUz yet */}
                    {lang === "uz" && !(product as any).descriptionUz && translateDescMut.isPending && (
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                        Tarjima qilinmoqda...
                      </div>
                    )}
                    {/* Description text */}
                    <p className="text-gray-700 leading-normal text-sm whitespace-pre-line">
                      {((lang === "ru" && showTranslated && translatedDesc ? translatedDesc : descriptionText) || "").replace(/\n{2,}/g, "\n").trim()}
                    </p>
                    {lang === "ru" && showTranslated && (
                      <p className="text-[11px] text-gray-400 italic">AI yordamida tarjima qilindi</p>
                    )}
                    {lang === "uz" && !(product as any).descriptionUz && translatedDesc && (
                      <p className="text-[11px] text-gray-400 italic">AI yordamida tarjima qilindi</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8 text-gray-400">
                    <span className="text-4xl mb-2">📋</span>
                    <p className="text-sm">{t.detail_no_description}</p>
                  </div>
                )}
              </AccordionSection>

              {displaySpecs.length > 0 && (
                <AccordionSection title={t.detail_specs} defaultOpen={true}>
                  <div className="space-y-0">
                    {displaySpecs.map(([key, value]) => (
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

        {/* ===== REVIEWS SECTION ===== */}
        <ReviewsSection productId={product.id} preloadedReviews={preloadedReviews} preloadedSummary={reviewSummary} />

        {/* ===== THIRD-PARTY SELLER NOTICE ===== */}
        {product.sellerId && (
          <div className="container pb-8">
            <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-sm font-bold">i</div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm mb-1">
                    {t.detail_third_party}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {t.detail_third_party_desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      {/* Similar products */}
      <SimilarProducts categoryId={product.categoryId} excludeId={product.id} preloadedItems={preloadedSimilar} />

      </div>
    </div>

    {/* Compare Modal */}
    <CompareModal
      open={compareOpen}
      onClose={() => setCompareOpen(false)}
      currentProduct={product as any}
    />
    {/* Quick Buy Modal */}
    <QuickBuyModal
      open={quickBuyOpen}
      onClose={() => setQuickBuyOpen(false)}
      productId={product.id}
      productName={displayName}
      productPrice={product.price ? String(Number(product.price).toLocaleString('ru-RU')) : undefined}
    />
    {/* Закреплённые кнопки покупки — только мобильный */}
    {(product.stock ?? 0) > 0 && (
      <div className="md:hidden fixed left-0 right-0 z-[60] bg-white border-t border-gray-200 px-4 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]" style={{ bottom: '56px', paddingBottom: '12px' }}>
        <div className="flex gap-3 items-center">
          <div className="shrink-0">
            <p className="text-lg font-black text-primary leading-none">{formatProductPrice(product.price, (product as any).priceUsd)}</p>
            {hasDiscount && product.originalPrice && (
              <p className="text-xs text-gray-400 line-through leading-none mt-0.5">{formatProductPrice(product.originalPrice, (product as any).originalPriceUsd)}</p>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 h-12 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <ShoppingCart size={18} />
            {hasDiscount ? "Успей по скидке!" : "В корзину"}
          </button>
          <button
            onClick={() => setQuickBuyOpen(true)}
            className="h-12 px-4 rounded-2xl border-2 border-primary text-primary font-black text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
          >
            <Zap size={16} />
            1 клик
          </button>
        </div>
      </div>
    )}
    </>
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

function ReviewsSection({ productId, preloadedReviews, preloadedSummary }: { productId: number; preloadedReviews?: any[] | null; preloadedSummary?: any | null }) {
  const { t } = useLanguage();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Use preloaded data if available, otherwise fetch separately
  const { data: reviewsList = preloadedReviews ?? [] } = trpc.reviews.listByProduct.useQuery({ productId }, {
    staleTime: 5 * 60 * 1000,
    enabled: preloadedReviews === null || preloadedReviews === undefined,
    initialData: preloadedReviews ?? undefined,
  });
  const { data: summary } = trpc.reviews.summary.useQuery({ productId }, {
    staleTime: 5 * 60 * 1000,
    enabled: preloadedSummary === null || preloadedSummary === undefined,
    initialData: preloadedSummary ?? undefined,
  });
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
    new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl shadow-sm mt-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-black text-gray-900">
            {t.detail_reviews}
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
              <p className="text-sm">{t.detail_no_reviews}</p>
              <p className="text-xs mt-1">{t.detail_be_first}</p>
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
                  {(r as any).reply && (
                    <div className="mt-2 ml-3 pl-3 border-l-2 border-emerald-200 bg-emerald-50/60 rounded-r-lg py-2 pr-2">
                      <div className="text-[11px] font-bold text-emerald-700 mb-0.5">Ответ Katta Chegirma:</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{(r as any).reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: submit form */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-gray-800 mb-3">
            {t.detail_reviews}
          </h3>
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Star size={24} className="text-green-500 fill-green-500" />
              </div>
              <p className="font-bold text-gray-800 text-sm">
                {t.detail_reviews}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Отзыв появится после проверки модератором.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-3 text-xs text-primary underline"
              >
                Оставить ещё один отзыв
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {t.auth_name}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder={t.auth_name}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Оценка
                </label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Комментарий
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Напишите ваш отзыв..."
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
                  ? t.common_searching
                  : "Отправить отзыв"}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Отзывы проходят модерацию
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SimilarProducts({ categoryId, excludeId, preloadedItems }: { categoryId: number; excludeId: number; preloadedItems?: any[] | null }) {
  const { data: items } = trpc.products.similar.useQuery({ categoryId, excludeId, limit: 8 }, {
    staleTime: 5 * 60 * 1000,
    enabled: preloadedItems === null || preloadedItems === undefined,
    initialData: preloadedItems ?? undefined,
  });
  if (!items || items.length === 0) return null;
  return (
    <div className="py-6 bg-gray-50 border-t border-gray-100">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900">🔄 Похожие товары</h2>
          <Link href={`/catalog?category=${categoryId}`} className="text-sm text-primary font-medium hover:underline">
            Смотреть все →
          </Link>
        </div>
        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible">
          {items.map((p: any) => (
            <div key={p.id} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-auto">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
