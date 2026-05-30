import {
  MapPin, Phone, Clock, Instagram, Send, ShieldCheck, Star, Users,
  Tag, Package, HeartHandshake, X, ChevronLeft, ChevronRight,
  CheckCircle2, TrendingUp, Award, Zap, ThumbsUp, BadgeCheck,
  Youtube, Facebook
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useBreadcrumbSchema } from "@/hooks/useBreadcrumbSchema";
import { trpc } from "@/lib/trpc";

const SHOP_PHOTOS = [
  "/manus-storage/IMG_6615_332365ec.JPG",
  "/manus-storage/IMG_6616_2d8f24d5.JPG",
  "/manus-storage/IMG_6617_c1076530.JPG",
  "/manus-storage/IMG_6618_dc6d36cf.JPG",
  "/manus-storage/IMG_6619_444cf82a.JPG",
  "/manus-storage/IMG_6620_83902f6e.JPG",
  "/manus-storage/IMG_6621_e1bcac77.JPG",
  "/manus-storage/IMG_6622_48077593.JPG",
  "/manus-storage/IMG_6623_6e4a38c0.JPG",
  "/manus-storage/IMG_6624_a7002add.JPG",
];

const STATS = [
  { value: "1 000 000+", label: "подписчиков в Instagram", icon: Instagram, color: "from-purple-500 to-pink-500" },
  { value: "200 000+", label: "подписчиков в Telegram", icon: Send, color: "from-blue-400 to-blue-600" },
  { value: "400 000+", label: "зрителей на YouTube", icon: Youtube, color: "from-red-500 to-red-600" },
  { value: "5 000+", label: "довольных покупателей", icon: ThumbsUp, color: "from-green-400 to-green-600" },
];

const TRUST_ITEMS = [
  {
    icon: Tag,
    title: "Честные скидки",
    desc: "Мы не завышаем «старую цену». Наши акции — это реальное снижение стоимости, которое вы можете проверить сами.",
    color: "bg-white border-gray-200",
    iconBg: "bg-gray-900",
    check: "Цены проверяются ежедневно",
  },
  {
    icon: ShieldCheck,
    title: "Прозрачность и гарантия",
    desc: "Вся техника — новая, в заводской упаковке, с официальной гарантией. Мы дорожим репутацией.",
    color: "bg-white border-gray-200",
    iconBg: "bg-gray-900",
    check: "Официальная гарантия на каждый товар",
  },
  {
    icon: Star,
    title: "Только проверенные бренды",
    desc: "Samsung, LG, Franco, Avangard, Ferro и другие. Каждый товар проходит отбор перед публикацией.",
    color: "bg-white border-gray-200",
    iconBg: "bg-gray-900",
    check: "Модерация каждого товара",
  },
];

const BENEFITS = [
  { icon: TrendingUp, title: "Лучшая цена на рынке", desc: "Мы допускаем к публикации только товары с самой низкой ценой в Узбекистане — покупатель видит реальную выгоду и покупает сразу.", color: "bg-gray-900" },
  { icon: Package, title: "Широкий ассортимент", desc: "Холодильники, стиральные машины, телевизоры, кухонная техника — всё в одном месте с доставкой по всему Узбекистану.", color: "bg-gray-900" },
  { icon: HeartHandshake, title: "Поддержка 24/7", desc: "Наши менеджеры всегда на связи. Помогаем с выбором, оформлением и любыми вопросами после покупки.", color: "bg-gray-900" },
  { icon: Zap, title: "Быстрый заказ", desc: "Купить в 1 клик или через Telegram — без лишних шагов. Менеджер перезвонит в течение 15 минут.", color: "bg-gray-900" },
];

const BRANDS = ["Samsung", "LG", "Franco", "Avangard", "Ferro", "Artel", "Beko", "Bosch", "Haier", "Midea"];


// ── Static fallback reviews (shown when DB has < 3 approved reviews) ──
const STATIC_REVIEWS = [
  { id: 1, authorName: "Нодира Т.", rating: 5, comment: "Заказала стиральную машину Avangard — доставили на следующий день, цена реально ниже чем в других магазинах. Очень довольна!", productName: "Стиральная машина Avangard", city: "Ташкент" },
  { id: 2, authorName: "Бахром К.", rating: 5, comment: "Купил телевизор Samsung 65 дюймов. Менеджер помог выбрать, объяснил все характеристики. Цена лучшая в городе — проверял!", productName: "Телевизор Samsung 65\"", city: "Самарканд" },
  { id: 3, authorName: "Малика Ю.", rating: 5, comment: "Холодильник LG привезли быстро, упаковка целая, гарантийный талон есть. Буду рекомендовать всем друзьям!", productName: "Холодильник LG", city: "Фергана" },
  { id: 4, authorName: "Санжар Р.", rating: 5, comment: "Заказал через Telegram — ответили за 5 минут. Кондиционер установили в тот же день. Профессионалы!", productName: "Кондиционер Franco", city: "Ташкент" },
  { id: 5, authorName: "Зулфия М.", rating: 5, comment: "Уже третья покупка на Katta Chegirma. Каждый раз цена лучше чем в других магазинах. Доверяю этому сайту!", productName: "Пылесос Bosch", city: "Наманган" },
  { id: 6, authorName: "Отабек Ш.", rating: 4, comment: "Хорошая платформа, большой выбор техники. Нашёл кулер по цене на 15% ниже чем в торговом центре.", productName: "Кулер TechOn", city: "Бухара" },
];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </div>
  );
}

function ReviewsSection() {
  const { data: dbReviews } = trpc.reviews.listLatest.useQuery({ limit: 12 });
  const [activeIdx, setActiveIdx] = useState(0);
  const reviews = (dbReviews && dbReviews.length >= 3 ? dbReviews : STATIC_REVIEWS) as Array<{
    id: number; authorName: string; rating: number; comment: string; productName?: string | null; city?: string;
  }>;
  const avgRating = useMemo(() => {
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Auto-slide every 5s
  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % reviews.length), 5000);
    return () => clearInterval(t);
  }, [reviews.length]);

  const visible = [
    reviews[activeIdx],
    reviews[(activeIdx + 1) % reviews.length],
    reviews[(activeIdx + 2) % reviews.length],
  ];

  return (
    <section className="bg-white py-10">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-block text-gray-400 font-semibold text-xs mb-3 uppercase tracking-widest">
            ⭐ Отзывы покупателей
          </span>
          <h2 className="text-2xl md:text-2xl font-black text-gray-900 mb-3">
            Нам доверяют тысячи людей
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Реальные отзывы покупателей, которые уже сделали выгодные покупки на Katta Chegirma
          </p>
          {/* Overall rating badge */}
          <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-3 mt-5">
            <span className="text-4xl font-black text-amber-500">{avgRating}</span>
            <div className="text-left">
              <StarRating rating={5} size={18} />
              <p className="text-xs text-gray-500 mt-0.5">{reviews.length}+ отзывов</p>
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {visible.map((review, idx) => (
            <div
              key={`${review.id}-${idx}`}
              className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative"
            >
              {/* Quote icon */}
              <div className="absolute top-4 right-5 text-5xl text-gray-100 font-serif leading-none select-none">&ldquo;</div>
              {/* Stars */}
              <StarRating rating={review.rating} />
              {/* Comment */}
              <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4 line-clamp-4">
                {review.comment}
              </p>
              {/* Author */}
              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-gray-50">
                <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {review.authorName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{review.authorName}</p>
                  {(review.city || review.productName) && (
                    <p className="text-xs text-gray-400">
                      {review.city ? review.city : ""}{review.city && review.productName ? " · " : ""}{review.productName ?? ""}
                    </p>
                  )}
                </div>
                <BadgeCheck size={16} className="ml-auto text-green-500 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`h-2 rounded-full transition-all ${i === activeIdx ? "bg-primary w-5" : "bg-gray-300 w-2"}`}
              aria-label={`Отзыв ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Video reviews section ──
const VIDEO_REVIEWS = [
  {
    id: "Wnv1y5OJEsk",
    title: "Бытовая техника Katta Chegirma — обзор товаров",
    author: "@KattaChegirma",
    views: "775",
  },
  {
    id: "SB9YAiV2Q4o",
    title: "Самый мощный пылесос — обзор Ferre 2000W",
    author: "@KattaChegirma",
    views: "65",
  },
  {
    id: "quNzhLYkid0",
    title: "Самый большой холодильник — обзор и цена",
    author: "@KattaChegirma",
    views: "61",
  },
];

function VideoCard({ video, liveViews }: { video: typeof VIDEO_REVIEWS[0]; liveViews?: string }) {
  const [playing, setPlaying] = useState(false);
  const displayViews = liveViews ?? video.views;
  const formattedViews = Number(displayViews) >= 1000
    ? (Number(displayViews) / 1000).toFixed(1).replace(/\.0$/, "") + "K"
    : displayViews;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      {playing ? (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={video.title}
          />
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full aspect-video bg-gray-900 group overflow-hidden"
          aria-label={`Смотреть: ${video.title}`}
        >
          <img
            src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-70 transition-opacity"
          />
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <div className="w-0 h-0 border-y-[10px] border-y-transparent border-l-[18px] border-l-white ml-1" />
            </div>
          </div>
          {/* YouTube badge */}
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1.5">
            <Youtube size={12} className="text-red-500" />
            {formattedViews} просмотров
          </div>
        </button>
      )}
      <div className="p-4">
        <p className="font-semibold text-gray-900 text-sm leading-snug mb-1">{video.title}</p>
        <p className="text-xs text-gray-400">{video.author}</p>
      </div>
    </div>
  );
}

function VideoReviewsSection() {
  const videoIds = VIDEO_REVIEWS.map(v => v.id);
  const { data: statsData } = trpc.youtube.getVideoStats.useQuery(
    { ids: videoIds },
    { staleTime: 5 * 60 * 1000, retry: false }
  );
  return (
    <section className="bg-gray-50 py-10">
      <div className="container">
        <div className="text-center mb-6">
          <span className="inline-block bg-red-50 text-red-600 font-semibold text-sm px-4 py-1.5 rounded-full mb-3 border border-red-200">
            ▶ Видеообзоры
          </span>
          <h2 className="text-2xl md:text-2xl font-black text-gray-900 mb-3">
            Смотрите обзоры наших товаров
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Реальные видеообзоры товаров — распаковки, характеристики и впечатления
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {VIDEO_REVIEWS.map(v => (
            <VideoCard
              key={v.id + v.title}
              video={v}
              liveViews={statsData?.stats?.[v.id]?.viewCount}
            />
          ))}
        </div>
        <div className="text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
          >
            <Youtube size={18} />
            Смотреть все видеообзоры
          </Link>
          <a
            href="https://www.youtube.com/@kattachegirma"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <Youtube size={18} />
            Канал на YouTube
          </a>
        </div>
      </div>
    </section>
  );
}

export default function About() {
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const s = (settings as Record<string, string>) ?? {};

  usePageMeta({
    title: "О нас — Катта Чегирма | Интернет-магазин бытовой техники",
    description: "Катта Чегирма — интернет-магазин бытовой техники в Ташкенте. Качественная техника Samsung, LG, Franco, Avangard с гарантией и доставкой по всему Узбекистану.",
    canonicalPath: "/about",
  });

  useBreadcrumbSchema([
    { name: "Главная", url: "https://kattachegirma.uz/" },
    { name: "О нас", url: "https://kattachegirma.uz/about" },
  ]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => i !== null ? (i - 1 + SHOP_PHOTOS.length) % SHOP_PHOTOS.length : null);
  const nextPhoto = () => setLightboxIndex((i) => i !== null ? (i + 1) % SHOP_PHOTOS.length : null);

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/15 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="container relative py-8 md:py-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <BadgeCheck size={15} className="text-primary" />
              <span>Платформа №1 для бытовой техники в Узбекистане</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
              О проекте <span className="text-primary">Katta Chegirma</span>
            </h1>
            <p className="text-white/80 text-base md:text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
              Качественная бытовая техника — доступна каждой семье. Без переплат, без обмана, с настоящей заботой о покупателе.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                <Package size={16} />
                Смотреть каталог
              </Link>
              <a
                href="#contacts"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                <Phone size={16} />
                Связаться с нами
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <div className="text-xl font-black text-gray-900 leading-none">{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="container py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-3xl p-5 md:p-7">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
              <Award size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-3">Наша история</h2>
              <p className="text-gray-700 leading-relaxed text-base">
                <strong>Katta Chegirma</strong> — это не просто интернет-магазин. Это проект, рождённый из желания сделать качественную бытовую технику доступной для каждой семьи в Узбекистане. Мы верим: хорошая техника не должна быть привилегией избранных — она должна быть в каждом доме.
              </p>
              <p className="text-gray-600 leading-relaxed text-sm mt-3">
                Сегодня нам доверяют более 5 000 покупателей, а наши каналы в Instagram, Telegram и YouTube охватывают более 1,6 миллиона подписчиков. Мы — самый динамичный проект бытовой техники в Узбекистане.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY TRUST US ── */}
      <section className="bg-gray-50 py-10">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <span className="inline-block text-gray-400 text-xs font-semibold mb-3 uppercase tracking-widest">Доверие</span>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Почему нам доверяют тысячи покупателей?</h2>
              <p className="text-gray-500">Мы строим отношения с покупателями на трёх принципах</p>
            </div>
            <div className="space-y-4">
              {TRUST_ITEMS.map(({ icon: Icon, title, desc, color, iconBg, check }) => (
                <div key={title} className={`flex gap-5 border rounded-2xl p-6 ${color} hover:shadow-md transition-all duration-200`}>
                  <div className={`flex-shrink-0 w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-900 mb-1.5 text-base">{title}</h3>
                    <p className="text-gray-600 leading-relaxed text-sm mb-2">{desc}</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 size={13} className="text-green-500" />
                      {check}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS GRID ── */}
      <section className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-block text-gray-400 text-xs font-semibold mb-3 uppercase tracking-widest">Преимущества</span>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Что вы получаете?</h2>
            <p className="text-gray-500">Покупайте выгодно, быстро и с уверенностью</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {BENEFITS.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-200 group">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BRANDS ── */}
      <section className="bg-gray-50 py-8">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-2">Бренды, которым мы доверяем</h2>
            <p className="text-gray-500 text-sm mb-8">Только официальные дилеры и проверенные поставщики</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {BRANDS.map((brand) => (
                <span key={brand} className="bg-white border border-gray-200 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm hover:border-primary hover:text-primary transition-colors cursor-default">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="container py-10">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-6 md:p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6">
                <Users size={26} className="text-white" />
              </div>
              <h2 className="text-2xl md:text-2xl font-black mb-4">Наша миссия</h2>
              <p className="text-white/85 leading-relaxed text-lg">
                Сделать так, чтобы каждая семья в Узбекистане могла позволить себе современную, надёжную бытовую технику — <strong className="text-white">без переплат, без обмана</strong>, с настоящей заботой о покупателе.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t border-white/15">
                {[
                  { v: "100%", l: "честность" },
                  { v: "0 сум", l: "скрытых комиссий" },
                  { v: "24/7", l: "поддержка" },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <div className="text-2xl font-black text-primary">{v}</div>
                    <div className="text-white/60 text-xs mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PHOTO GALLERY ── */}
      <section className="bg-gray-50 py-10">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-6">
              <span className="inline-block text-gray-400 text-xs font-semibold mb-3 uppercase tracking-widest">Наш магазин</span>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Загляните к нам</h2>
              <p className="text-gray-500">Мы всегда рады гостям — приходите и убедитесь лично!</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {SHOP_PHOTOS.map((src, i) => (
                <button
                  key={i}
                  onClick={() => openLightbox(i)}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-200 hover:shadow-xl transition-all duration-200 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={src}
                    alt={`Магазин Katta Chegirma фото ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-400"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-200 rounded-2xl" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-2">
                      <ChevronRight size={16} className="text-gray-700" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CUSTOMER REVIEWS ── */}
      <ReviewsSection />

      {/* ── VIDEO REVIEWS ── */}
      <VideoReviewsSection />

      {/* ── CTA BANNER ── */}
      <section className="container py-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-900 rounded-3xl p-8 md:p-12 text-white text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl md:text-2xl font-black mb-3">Присоединяйтесь к нашей семье!</h2>
            <p className="text-white/90 leading-relaxed mb-8 text-lg max-w-xl mx-auto">
              Тысячи довольных покупателей уже выбрали Katta Chegirma. Убедитесь сами — выгодные покупки возможны!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 bg-white text-primary px-7 py-3 rounded-xl font-black text-base hover:bg-gray-100 transition-colors shadow-lg"
              >
                <Package size={16} />
                Смотреть каталог
              </Link>
              <Link
                href="/seller-register"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white px-7 py-3 rounded-xl font-black text-base transition-colors"
              >
                <TrendingUp size={16} />
                Стать продавцом
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTACTS ── */}
      {(s.phone || s.address || s.telegram || s.instagram || s.workingHours) && (
        <section id="contacts" className="bg-gray-50 py-10">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-6">
                <span className="inline-block text-gray-400 text-xs font-semibold mb-3 uppercase tracking-widest">Контакты</span>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Свяжитесь с нами</h2>
                <p className="text-gray-500">Мы всегда на связи и готовы помочь</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {(s.phone || s.phone2) && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Phone size={18} className="text-primary" />
                      </div>
                      <span className="font-black text-gray-900">Телефон</span>
                    </div>
                    {s.phone && (
                      <a href={`tel:${s.phone}`} className="block text-lg font-bold text-primary hover:underline mb-1">
                        {s.phone}
                      </a>
                    )}
                    {s.phone2 && (
                      <a href={`tel:${s.phone2}`} className="block text-lg font-bold text-primary hover:underline">
                        {s.phone2}
                      </a>
                    )}
                  </div>
                )}
                {(s.address || s.address2) && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <MapPin size={18} className="text-orange-500" />
                      </div>
                      <span className="font-black text-gray-900">Адрес</span>
                    </div>
                    {s.address && <p className="text-gray-700 mb-1">{s.address}</p>}
                    {s.address2 && <p className="text-gray-700">{s.address2}</p>}
                  </div>
                )}
                {s.workingHours && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <Clock size={18} className="text-green-600" />
                      </div>
                      <span className="font-black text-gray-900">Режим работы</span>
                    </div>
                    <p className="text-gray-700 font-medium">{s.workingHours}</p>
                  </div>
                )}
                {(s.telegram || s.instagram) && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Instagram size={18} className="text-purple-600" />
                      </div>
                      <span className="font-black text-gray-900">Социальные сети</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {s.telegram && (
                        <a
                          href={`https://t.me/${s.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                        >
                          <Send size={14} /> Telegram
                        </a>
                      )}
                      {s.instagram && (
                        <a
                          href={`https://instagram.com/${s.instagram.replace("@", "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-opacity"
                        >
                          <Instagram size={14} /> Instagram
                        </a>
                      )}
                      {s.youtube && (
                        <a
                          href={s.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                        >
                          <Youtube size={14} /> YouTube
                        </a>
                      )}
                      {s.facebook && (
                        <a
                          href={s.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                        >
                          <Facebook size={14} /> Facebook
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white bg-white/15 hover:bg-white/30 rounded-full p-2.5 transition-colors z-10"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/15 hover:bg-white/30 rounded-full p-3 transition-colors z-10"
            aria-label="Предыдущее"
          >
            <ChevronLeft size={26} />
          </button>
          <img
            src={SHOP_PHOTOS[lightboxIndex]}
            alt={`Магазин фото ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/15 hover:bg-white/30 rounded-full p-3 transition-colors z-10"
            aria-label="Следующее"
          >
            <ChevronRight size={26} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">
            {lightboxIndex + 1} / {SHOP_PHOTOS.length}
          </div>
        </div>
      )}

    </div>
  );
}
