import { trpc } from "@/lib/trpc";
import { MapPin, Phone, Clock, Instagram, Send, TrendingDown, Truck, BarChart2, Scissors, ShieldCheck, Star } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const s = (settings as Record<string, string>) ?? {};

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-primary text-white py-12">
        <div className="container text-center">
          <h1 className="text-3xl font-black mb-2">О проекте Katta Chegirma</h1>
          <p className="text-white/80 text-lg">Почему у нас всегда дешевле?</p>
        </div>
      </div>

      <div className="container py-12 space-y-12">

        {/* Intro */}
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg text-gray-700 leading-relaxed">
            Добро пожаловать на <strong className="text-primary">kattachegirma.uz</strong> — площадку, где цена всегда на вашей стороне.
            Наша миссия проста: мы хотим, чтобы в каждом доме Узбекистана стояла современная бытовая техника,
            и для этого мы ведем ежедневную «войну» за снижение стоимости.
          </p>
        </div>

        {/* Philosophy */}
        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown size={28} className="text-primary" />
            <h2 className="text-2xl font-black text-gray-900">Наша философия — агрессивный демпинг</h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg">
            Мы знаем, что цена — это решающий фактор. Пока другие удерживают высокие наценки, мы сознательно демпингуем.
            Мы не просто предлагаем скидки — мы создаем условия, при которых брендовая техника становится доступной каждому.
          </p>
        </div>

        {/* How we keep prices low */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">
            Как нам удается держать самые низкие цены в Узбекистане?
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4 bg-gray-50 rounded-2xl p-5">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Truck size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Прямые поставки</h3>
                <p className="text-gray-600 leading-relaxed">
                  Мы работаем без длинной цепочки посредников. Меньше посредников — ниже цена в вашем чеке.
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-gray-50 rounded-2xl p-5">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <BarChart2 size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Минимальная маржа</h3>
                <p className="text-gray-600 leading-relaxed">
                  Мы зарабатываем на объемах продаж, а не на высокой наценке на каждый товар.
                  Нам выгоднее продать 100 единиц техники дешево, чем одну — дорого.
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-gray-50 rounded-2xl p-5">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Scissors size={22} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Оптимизация расходов</h3>
                <p className="text-gray-600 leading-relaxed">
                  Мы не тратим огромные бюджеты на пафосные офисы и дорогую рекламу.
                  Все сэкономленные средства превращаются в скидку для наших покупателей.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Quality */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">
            Доверие и оригинальное качество
          </h2>
          <p className="text-gray-600 text-center mb-6 text-lg">
            Низкая цена на kattachegirma.uz никогда не означает низкое качество.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex gap-4 bg-gray-50 rounded-2xl p-5">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Star size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Мировые бренды</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Мы предлагаем как узнаваемых гигантов рынка, так и надежные новые марки
                  (Samsung, LG, Franco, Avangard, Ferro и другие).
                </p>
              </div>
            </div>

            <div className="flex gap-4 bg-gray-50 rounded-2xl p-5">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Полная прозрачность</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  Вся техника — новая, в заводской упаковке и с гарантией.
                  Мы демпингуем цены за счет стратегии, а не за счет качества товара.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-primary rounded-3xl p-8 text-white text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-3">Мы — ваш союзник в борьбе за выгоду</h2>
          <p className="text-white/90 leading-relaxed mb-6">
            Если вы ищете, где купить дешевле всего — вы уже в правильном месте.
            Мы постоянно мониторим рынок и снижаем планку, чтобы звание{" "}
            <strong>«Katta Chegirma» (Большая Скидка)</strong> подтверждалось каждой позицией в нашем каталоге.
          </p>
          <Link href="/catalog" className="inline-block bg-white text-primary px-8 py-3 rounded-xl font-black text-lg hover:bg-gray-100 transition-colors">
            Смотреть каталог
          </Link>
        </div>

        {/* Contact info */}
        {(s.phone || s.address || s.telegram || s.instagram || s.workingHours) && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Контакты</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {(s.phone || s.phone2) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone size={18} className="text-primary" />
                    <span className="font-bold text-gray-900">Телефон</span>
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
                    <span className="font-bold text-gray-900">Адрес</span>
                  </div>
                  {s.address && <p className="text-gray-700 mb-1">{s.address}</p>}
                  {s.address2 && <p className="text-gray-700">{s.address2}</p>}
                </div>
              )}

              {s.workingHours && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-primary" />
                    <span className="font-bold text-gray-900">Режим работы</span>
                  </div>
                  <p className="text-gray-700">{s.workingHours}</p>
                </div>
              )}

              {(s.telegram || s.instagram) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="font-bold text-gray-900 mb-3">Социальные сети</p>
                  <div className="flex gap-3">
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

        {/* Photo gallery placeholder */}
        {(s.photo1 || s.photo2) && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Наш магазин</h2>
            <div className="grid grid-cols-2 gap-4">
              {s.photo1 && <img src={s.photo1} alt="Магазин" className="rounded-2xl w-full object-cover aspect-video" />}
              {s.photo2 && <img src={s.photo2} alt="Магазин" className="rounded-2xl w-full object-cover aspect-video" />}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
