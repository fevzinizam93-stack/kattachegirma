import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { MapPin, Phone, Clock, Instagram, Send, TrendingDown, Truck, BarChart2, Scissors, ShieldCheck, Star } from "lucide-react";
import { Link } from "wouter";

const content = {
  ru: {
    hero_title: "О проекте Katta Chegirma",
    hero_sub: "Почему у нас всегда дешевле?",
    intro: "Добро пожаловать на kattachegirma.uz — площадку, где цена всегда на вашей стороне. Наша миссия проста: мы хотим, чтобы в каждом доме Узбекистана стояла современная бытовая техника, и для этого мы ведем ежедневную «войну» за снижение стоимости.",
    philosophy_title: "Наша философия — агрессивный демпинг",
    philosophy_desc: "Мы знаем, что цена — это решающий фактор. Пока другие удерживают высокие наценки, мы сознательно демпингуем. Мы не просто предлагаем скидки — мы создаем условия, при которых брендовая техника становится доступной каждому.",
    how_title: "Как нам удается держать самые низкие цены в Узбекистане?",
    direct: "Прямые поставки",
    direct_desc: "Мы работаем без длинной цепочки посредников. Меньше посредников — ниже цена в вашем чеке.",
    margin: "Минимальная маржа",
    margin_desc: "Мы зарабатываем на объемах продаж, а не на высокой наценке на каждый товар. Нам выгоднее продать 100 единиц техники дешево, чем одну — дорого.",
    optimize: "Оптимизация расходов",
    optimize_desc: "Мы не тратим огромные бюджеты на пафосные офисы и дорогую рекламу. Все сэкономленные средства превращаются в скидку для наших покупателей.",
    trust_title: "Доверие и оригинальное качество",
    trust_sub: "Низкая цена на kattachegirma.uz никогда не означает низкое качество.",
    brands: "Мировые бренды",
    brands_desc: "Мы предлагаем как узнаваемых гигантов рынка, так и надежные новые марки (Samsung, LG, Franco, Avangard, Ferro и другие).",
    transparency: "Полная прозрачность",
    transparency_desc: "Вся техника — новая, в заводской упаковке и с гарантией. Мы демпингуем цены за счет стратегии, а не за счет качества товара.",
    cta_title: "Мы — ваш союзник в борьбе за выгоду",
    cta_desc: "Если вы ищете, где купить дешевле всего — вы уже в правильном месте. Мы постоянно мониторим рынок и снижаем планку, чтобы звание «Katta Chegirma» (Большая Скидка) подтверждалось каждой позицией в нашем каталоге.",
    cta_btn: "Смотреть каталог",
    contacts: "Контакты",
    phone_label: "Телефон",
    address_label: "Адрес",
    hours_label: "Режим работы",
    social_label: "Социальные сети",
    shop_label: "Наш магазин",
  },
  uz: {
    hero_title: "Katta Chegirma haqida",
    hero_sub: "Nima uchun bizda har doim arzonroq?",
    intro: "kattachegirma.uz — narx har doim sizning tomoningizda bo'lgan maydonchaga xush kelibsiz. Bizning missiyamiz oddiy: O'zbekistondagi har bir uyda zamonaviy maishiy texnika bo'lishini xohlaymiz va buning uchun biz har kuni narxlarni pasaytirish uchun «kurash» olib boramiz.",
    philosophy_title: "Bizning falsafamiz — agressiv narx pasaytirish",
    philosophy_desc: "Biz narx hal qiluvchi omil ekanligini bilamiz. Boshqalar yuqori ustama narxlarni ushlab turganda, biz ataylab narxlarni pasaytiramiz. Biz shunchaki chegirmalar taklif etmaymiz — biz brend texnikasi hamma uchun mavjud bo'ladigan sharoitlar yaratamiz.",
    how_title: "O'zbekistondagi eng past narxlarni qanday ushlab turamiz?",
    direct: "To'g'ridan-to'g'ri yetkazib berish",
    direct_desc: "Biz uzoq vositachilar zanjirisisz ishlaymiz. Kamroq vositachi — sizning hisobingizdagi past narx.",
    margin: "Minimal marja",
    margin_desc: "Biz har bir tovar uchun yuqori ustama emas, balki savdo hajmidan daromad olamiz. Bizga bitta qimmat sotishdan ko'ra 100 ta texnikani arzon sotish foydali.",
    optimize: "Xarajatlarni optimallashtirish",
    optimize_desc: "Biz hashamatli ofislar va qimmat reklamaga katta byudjet sarflamaymiz. Tejagan barcha mablag'lar xaridorlarimiz uchun chegirmaga aylanadi.",
    trust_title: "Ishonch va original sifat",
    trust_sub: "kattachegirma.uz saytidagi past narx hech qachon past sifat degani emas.",
    brands: "Jahon brendlari",
    brands_desc: "Biz bozorning taniqli gigantlarini ham, ishonchli yangi brendlarni ham taklif etamiz (Samsung, LG, Franco, Avangard, Ferro va boshqalar).",
    transparency: "To'liq shaffoflik",
    transparency_desc: "Barcha texnika yangi, zavod qadoqida va kafolat bilan. Biz narxlarni strategiya hisobiga pasaytiramiz, tovar sifati hisobiga emas.",
    cta_title: "Biz — foyda uchun kurashda sizning ittifoqchingiz",
    cta_desc: "Agar siz eng arzon joyni qidirsangiz — siz allaqachon to'g'ri joydasiz. Biz doimiy ravishda bozorni kuzatamiz va «Katta Chegirma» unvoni katalogdagi har bir pozitsiya bilan tasdiqlanishi uchun chegarani pasaytiramiz.",
    cta_btn: "Katalogni ko'rish",
    contacts: "Aloqa",
    phone_label: "Telefon",
    address_label: "Manzil",
    hours_label: "Ish vaqti",
    social_label: "Ijtimoiy tarmoqlar",
    shop_label: "Bizning do'konimiz",
  },
};

export default function About() {
  const { lang } = useLanguage();
  const c = content[lang];
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const s = (settings as Record<string, string>) ?? {};

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-12">
        <div className="container text-center">
          <h1 className="text-3xl font-black mb-2">{c.hero_title}</h1>
          <p className="text-white/80 text-lg">{c.hero_sub}</p>
        </div>
      </div>

      <div className="container py-12 space-y-12">

        {/* Intro */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-gray-700 leading-relaxed">
            {c.intro.split("kattachegirma.uz").map((part, i, arr) =>
              i < arr.length - 1 ? <span key={i}>{part}<strong className="text-primary">kattachegirma.uz</strong></span> : <span key={i}>{part}</span>
            )}
          </p>
        </div>

        {/* Philosophy */}
        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown size={28} className="text-primary" />
            <h2 className="text-2xl font-black text-gray-900">{c.philosophy_title}</h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">{c.philosophy_desc}</p>
        </div>

        {/* How we keep prices low */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{c.how_title}</h2>
          <div className="space-y-4">
            {[
              { icon: Truck, title: c.direct, desc: c.direct_desc },
              { icon: BarChart2, title: c.margin, desc: c.margin_desc },
              { icon: Scissors, title: c.optimize, desc: c.optimize_desc },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-gray-50 rounded-2xl p-5">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Icon size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust & Quality */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{c.trust_title}</h2>
          <p className="text-gray-600 text-center mb-6 text-lg">{c.trust_sub}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: Star, title: c.brands, desc: c.brands_desc, color: "bg-green-100", iconColor: "text-green-600" },
              { icon: ShieldCheck, title: c.transparency, desc: c.transparency_desc, color: "bg-green-100", iconColor: "text-green-600" },
            ].map(({ icon: Icon, title, desc, color, iconColor }) => (
              <div key={title} className="flex gap-4 bg-gray-50 rounded-2xl p-5">
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

        {/* CTA Banner */}
        <div className="bg-primary rounded-3xl p-8 text-white text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-3">{c.cta_title}</h2>
          <p className="text-white/90 leading-relaxed mb-6">{c.cta_desc}</p>
          <Link href="/catalog" className="inline-block bg-white text-primary px-8 py-3 rounded-xl font-black text-lg hover:bg-gray-100 transition-colors">
            {c.cta_btn}
          </Link>
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
                  {s.phone && <a href={`tel:${s.phone}`} className="block text-lg font-semibold text-primary hover:underline mb-1">{s.phone}</a>}
                  {s.phone2 && <a href={`tel:${s.phone2}`} className="block text-lg font-semibold text-primary hover:underline">{s.phone2}</a>}
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
                  <div className="flex gap-3">
                    {s.telegram && (
                      <a href={`https://t.me/${s.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors">
                        <Send size={15} /> Telegram
                      </a>
                    )}
                    {s.instagram && (
                      <a href={`https://instagram.com/${s.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                        <Instagram size={15} /> Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {(s.photo1 || s.photo2) && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{c.shop_label}</h2>
            <div className="grid grid-cols-2 gap-4">
              {s.photo1 && <img src={s.photo1} alt={c.shop_label} className="rounded-2xl w-full object-cover aspect-video" />}
              {s.photo2 && <img src={s.photo2} alt={c.shop_label} className="rounded-2xl w-full object-cover aspect-video" />}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
