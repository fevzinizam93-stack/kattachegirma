import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { MapPin, Phone, Clock, Instagram, Send, ShieldCheck, Star, Users, Tag, Package, HeartHandshake, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

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

const content = {
  ru: {
    hero_title: "О проекте Katta Chegirma",
    hero_sub: "Качественная техника доступна каждому!",
    intro: "Katta Chegirma — это не просто интернет-магазин. Это проект, рождённый из желания сделать качественную бытовую технику доступной для каждой семьи в Узбекистане. Мы верим: хорошая техника не должна быть привилегией избранных — она должна быть в каждом доме.",
    trust_title: "Почему нам доверяют тысячи покупателей?",
    trust_sub: "Мы строим отношения с покупателями на трёх принципах:",
    principle1_title: "Честные скидки",
    principle1_desc: "Мы не завышаем «старую цену», чтобы потом сделать «скидку». Наши акции — это реальное снижение стоимости, которое вы можете проверить сами.",
    principle2_title: "Прозрачность и репутация",
    principle2_desc: "Вся техника — новая, в заводской упаковке, с официальной гарантией. Мы дорожим своей репутацией и никогда не пойдём на компромисс с качеством.",
    principle3_title: "Только проверенное качество",
    principle3_desc: "В нашем каталоге — только проверенные бренды: Samsung, LG, Franco, Avangard, Ferro и другие. Каждый товар проходит отбор перед тем, как попасть к вам.",
    benefits_title: "Что вы получаете?",
    benefit1_title: "Постоянные акции",
    benefit1_desc: "Каждую неделю — новые скидки на популярные товары. Подписывайтесь на наш Telegram-канал, чтобы не пропустить лучшие предложения.",
    benefit2_title: "Широкий ассортимент",
    benefit2_desc: "Холодильники, стиральные машины, телевизоры, кухонная техника и многое другое — всё в одном месте, с удобной доставкой по всему Узбекистану.",
    benefit3_title: "Поддержка и забота",
    benefit3_desc: "Наши менеджеры всегда на связи. Мы поможем с выбором, оформлением заказа и решением любых вопросов после покупки.",
    mission_title: "Наша миссия",
    mission_desc: "Сделать так, чтобы каждая семья в Узбекистане могла позволить себе современную, надёжную бытовую технику — без переплат, без обмана, с настоящей заботой о покупателе.",
    cta_title: "Присоединяйтесь к нашей семье!",
    cta_desc: "Тысячи довольных покупателей уже выбрали Katta Chegirma. Присоединяйтесь и вы — убедитесь сами, что выгодные покупки возможны!",
    cta_btn: "Смотреть каталог",
    gallery_title: "Наш магазин",
    gallery_sub: "Загляните к нам — мы всегда рады гостям!",
    contacts: "Контакты",
    phone_label: "Телефон",
    address_label: "Адрес",
    hours_label: "Режим работы",
    social_label: "Социальные сети",
  },
  uz: {
    hero_title: "Katta Chegirma haqida",
    hero_sub: "Sifatli texnika — hamma uchun mavjud!",
    intro: "Katta Chegirma — bu shunchaki internet-do'kon emas. Bu O'zbekistondagi har bir oila uchun sifatli maishiy texnikani arzonlashtirish istagidan tug'ilgan loyiha. Biz ishonамиз: yaxshi texnika faqat tanlanganlar uchun imtiyoz bo'lmasligi kerak — u har bir uyda bo'lishi kerak.",
    trust_title: "Nima uchun minglab xaridorlar bizga ishonadi?",
    trust_sub: "Biz xaridorlar bilan munosabatlarni uch tamoyil asosida quramiz:",
    principle1_title: "Halol chegirmalar",
    principle1_desc: "Biz «eski narx»ni oshirib, keyin «chegirma» qilmaymiz. Bizning aksiyalarimiz — siz o'zingiz tekshira oladigan haqiqiy narx pasayishi.",
    principle2_title: "Shaffoflik va obro'",
    principle2_desc: "Barcha texnika yangi, zavod qadoqida, rasmiy kafolat bilan. Biz obro'imizni qadrlaymiz va sifat bilan hech qachon murosaga bormaymiz.",
    principle3_title: "Faqat tekshirilgan sifat",
    principle3_desc: "Bizning katalogimizda — faqat tekshirilgan brendlar: Samsung, LG, Franco, Avangard, Ferro va boshqalar. Har bir tovar sizga yetib kelishidan oldin tanlov o'tadi.",
    benefits_title: "Siz nima olasiz?",
    benefit1_title: "Doimiy aksiyalar",
    benefit1_desc: "Har hafta — mashhur tovarlarga yangi chegirmalar. Eng yaxshi takliflarni o'tkazib yubormaslik uchun Telegram kanalimizga obuna bo'ling.",
    benefit2_title: "Keng assortiment",
    benefit2_desc: "Muzlatgichlar, kir yuvish mashinalari, televizorlar, oshxona texnikasi va boshqa ko'p narsa — hammasi bir joyda, O'zbekiston bo'ylab qulay yetkazib berish bilan.",
    benefit3_title: "Qo'llab-quvvatlash va g'amxo'rlik",
    benefit3_desc: "Menejerlarimiz doimo aloqada. Biz tanlashda, buyurtma rasmiylashtirish va xariddan keyin har qanday savollarni hal qilishda yordam beramiz.",
    mission_title: "Bizning missiyamiz",
    mission_desc: "O'zbekistondagi har bir oila zamonaviy, ishonchli maishiy texnikani ortiqcha to'lovsiz, aldovsiz, xaridorga haqiqiy g'amxo'rlik bilan sotib olishi uchun sharoit yaratish.",
    cta_title: "Oilamizga qo'shiling!",
    cta_desc: "Minglab mamnun xaridorlar allaqachon Katta Chegirmani tanladilar. Siz ham qo'shiling — foydali xaridlar mumkinligiga o'zingiz ishonch hosil qiling!",
    cta_btn: "Katalogni ko'rish",
    gallery_title: "Bizning do'konimiz",
    gallery_sub: "Bizga tashrif buyuring — biz doim mehmonlarga xursandmiz!",
    contacts: "Aloqa",
    phone_label: "Telefon",
    address_label: "Manzil",
    hours_label: "Ish vaqti",
    social_label: "Ijtimoiy tarmoqlar",
  },
};

export default function About() {
  const { lang } = useLanguage();
  const c = content[lang];
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const s = (settings as Record<string, string>) ?? {};

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () =>
    setLightboxIndex((i) =>
      i !== null ? (i - 1 + SHOP_PHOTOS.length) % SHOP_PHOTOS.length : null
    );
  const nextPhoto = () =>
    setLightboxIndex((i) =>
      i !== null ? (i + 1) % SHOP_PHOTOS.length : null
    );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-14">
        <div className="container text-center">
          <h1 className="text-3xl md:text-4xl font-black mb-3">{c.hero_title}</h1>
          <p className="text-white/85 text-lg md:text-xl">{c.hero_sub}</p>
        </div>
      </div>

      <div className="container py-12 space-y-14">

        {/* Intro */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-gray-700 leading-relaxed">{c.intro}</p>
        </div>

        {/* Why trust us */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">{c.trust_title}</h2>
          <p className="text-gray-500 text-center mb-8">{c.trust_sub}</p>
          <div className="space-y-4">
            {[
              { icon: Tag, title: c.principle1_title, desc: c.principle1_desc, color: "bg-orange-100", iconColor: "text-orange-500" },
              { icon: ShieldCheck, title: c.principle2_title, desc: c.principle2_desc, color: "bg-blue-100", iconColor: "text-blue-600" },
              { icon: Star, title: c.principle3_title, desc: c.principle3_desc, color: "bg-green-100", iconColor: "text-green-600" },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className="flex gap-4 bg-gray-50 rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className={`flex-shrink-0 w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                  <Icon size={22} className={iconColor} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">{c.benefits_title}</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Tag, title: c.benefit1_title, desc: c.benefit1_desc, color: "bg-orange-500" },
              { icon: Package, title: c.benefit2_title, desc: c.benefit2_desc, color: "bg-blue-600" },
              { icon: HeartHandshake, title: c.benefit3_title, desc: c.benefit3_desc, color: "bg-green-600" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={26} className="text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="bg-primary/5 border border-primary/15 rounded-3xl p-8 max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={26} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-3">{c.mission_title}</h2>
          <p className="text-gray-700 leading-relaxed">{c.mission_desc}</p>
        </div>

        {/* CTA Banner */}
        <div className="bg-primary rounded-3xl p-8 md:p-12 text-white text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black mb-3">{c.cta_title}</h2>
          <p className="text-white/90 leading-relaxed mb-6 text-lg">{c.cta_desc}</p>
          <Link
            href="/catalog"
            className="inline-block bg-white text-primary px-8 py-3 rounded-xl font-black text-lg hover:bg-gray-100 transition-colors"
          >
            {c.cta_btn}
          </Link>
        </div>

        {/* Photo Gallery */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">{c.gallery_title}</h2>
          <p className="text-gray-500 text-center mb-8">{c.gallery_sub}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SHOP_PHOTOS.map((src, i) => (
              <button
                key={i}
                onClick={() => openLightbox(i)}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={src}
                  alt={`${c.gallery_title} ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-2xl" />
              </button>
            ))}
          </div>
        </div>

        {/* Contact info */}
        {(s.phone || s.address || s.telegram || s.instagram || s.workingHours) && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{c.contacts}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(s.phone || s.phone2) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone size={18} className="text-primary" />
                    <span className="font-bold text-gray-900">{c.phone_label}</span>
                  </div>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="block text-lg font-semibold text-primary hover:underline mb-1">
                      {s.phone}
                    </a>
                  )}
                  {s.phone2 && (
                    <a href={`tel:${s.phone2}`} className="block text-lg font-semibold text-primary hover:underline">
                      {s.phone2}
                    </a>
                  )}
                </div>
              )}
              {(s.address || s.address2) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={18} className="text-primary" />
                    <span className="font-bold text-gray-900">{c.address_label}</span>
                  </div>
                  {s.address && <p className="text-gray-700 mb-1">{s.address}</p>}
                  {s.address2 && <p className="text-gray-700">{s.address2}</p>}
                </div>
              )}
              {s.workingHours && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-primary" />
                    <span className="font-bold text-gray-900">{c.hours_label}</span>
                  </div>
                  <p className="text-gray-700">{s.workingHours}</p>
                </div>
              )}
              {(s.telegram || s.instagram) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="font-bold text-gray-900 mb-3">{c.social_label}</p>
                  <div className="flex gap-3 flex-wrap">
                    {s.telegram && (
                      <a
                        href={`https://t.me/${s.telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors"
                      >
                        <Send size={15} /> Telegram
                      </a>
                    )}
                    {s.instagram && (
                      <a
                        href={`https://instagram.com/${s.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                      >
                        <Instagram size={15} /> Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors z-10"
            aria-label="Close"
          >
            <X size={24} />
          </button>

          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors z-10"
            aria-label="Previous"
          >
            <ChevronLeft size={28} />
          </button>

          {/* Image */}
          <img
            src={SHOP_PHOTOS[lightboxIndex]}
            alt={`Shop photo ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors z-10"
            aria-label="Next"
          >
            <ChevronRight size={28} />
          </button>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {SHOP_PHOTOS.length}
          </div>
        </div>
      )}
    </div>
  );
}
