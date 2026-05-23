import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Store, Phone, MessageCircle, FileText, ChevronRight,
  ShieldCheck, TrendingUp, Users, Instagram, Youtube,
  BadgeCheck, Zap, BarChart3, Star, ArrowRight, CheckCircle2
} from "lucide-react";
import { useAuthModal } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { SellerSuccessModal } from "@/components/SellerSuccessModal";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function SellerRegister() {
  usePageMeta({
    title: "Регистрация продавца | Катта Чегирма",
    description: "Станьте продавцом на Катта Чегирма",
    noindex: true,
  });
  const { user, loading } = useAuth();
  const { openLogin } = useAuthModal();
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", telegram: "", description: "" });
  const [step, setStep] = useState<"info" | "form" | "pending">("info");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Uzbekistan phone validation: +998 XX XXX-XX-XX
  // Valid operators: 90,91,93,94,95,97,98,99,33,50,55,77,88
  const UZ_PHONE_RE = /^\+998(33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/;

  function formatUzPhone(raw: string): string {
    // Strip everything except digits and leading +
    let digits = raw.replace(/[^\d]/g, "");
    if (digits.startsWith("998")) digits = digits.slice(3);
    if (digits.startsWith("8") || digits.startsWith("0")) digits = digits.slice(1);
    digits = digits.slice(0, 9);
    if (!digits) return "+998";
    let out = "+998";
    if (digits.length > 0) out += " " + digits.slice(0, 2);
    if (digits.length > 2) out += " " + digits.slice(2, 5);
    if (digits.length > 5) out += "-" + digits.slice(5, 7);
    if (digits.length > 7) out += "-" + digits.slice(7, 9);
    return out;
  }

  function handlePhoneChange(raw: string) {
    const formatted = formatUzPhone(raw);
    setForm(f => ({ ...f, phone: formatted }));
    const stripped = formatted.replace(/[\s\-]/g, "");
    if (stripped.length > 4 && !UZ_PHONE_RE.test(stripped)) {
      setPhoneError("Введите корректный номер Узбекистана: +998 XX XXX-XX-XX");
    } else {
      setPhoneError("");
    }
  }

  const sellerQuery = trpc.sellers.me.useQuery(undefined, { enabled: !!user });
  const registerMut = trpc.sellers.register.useMutation({
    onSuccess: () => {
      setShowSuccessModal(true);
      setStep("pending");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (user && sellerQuery.data?.isApproved) {
    navigate("/seller/dashboard");
    return null;
  }

  const stats = [
    { value: "1 000 000+", label: "подписчиков в Instagram", icon: Instagram, color: "from-pink-500 to-purple-600" },
    { value: "200 000+", label: "подписчиков в Telegram", icon: MessageCircle, color: "from-blue-400 to-blue-600" },
    { value: "400 000+", label: "зрителей YouTube & Facebook", icon: Youtube, color: "from-red-500 to-red-700" },
    { value: "0 сум", label: "комиссии за регистрацию", icon: BadgeCheck, color: "from-green-500 to-emerald-600" },
  ];

  const benefits = [
    {
      icon: TrendingUp,
      title: "Колоссальный охват аудитории",
      desc: "Ваши товары увидят более 1 000 000 подписчиков в Instagram, 200 000 в Telegram и около 400 000 зрителей на YouTube и Facebook. Мы — эксперты в привлечении внимания!",
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: ShieldCheck,
      title: "Доверие покупателей",
      desc: "Название нашего бренда говорит само за себя. Люди приходят к нам за реальными выгодами. Ваше присутствие здесь — это знак качества и доступности.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Zap,
      title: "Лёгкий старт",
      desc: "Регистрация на сайте максимально проста. Выкладывайте свои товары, управляйте ценами и начинайте зарабатывать уже сегодня.",
      color: "bg-yellow-50 text-yellow-600",
    },
    {
      icon: BarChart3,
      title: "Современная экосистема",
      desc: "Мы создали современную и доступную экосистему, где каждый продавец может стать лидером рынка. Личный кабинет, аналитика, управление заказами — всё в одном месте.",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Users,
      title: "Высокая оборачиваемость",
      desc: "Покупатель заходит на сайт, видит самую низкую цену и покупает моментально, не раздумывая. Это гарантирует вам быстрые продажи без долгих ожиданий.",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: Star,
      title: "Репутация и доверие",
      desc: "Мы проверяем каждый товар, чтобы наши пользователи знали: на Katta Chegirma — только честная выгода. Это делает ваш магазин в глазах клиента надёжным поставщиком.",
      color: "bg-red-50 text-red-600",
    },
  ];

  const howItWorks = [
    { step: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт продавца за 2 минуты — нужны только имя магазина и телефон." },
    { step: "02", title: "Загрузите товары", desc: "Добавьте свои лучшие предложения с максимально возможной скидкой." },
    { step: "03", title: "Пройдите модерацию", desc: "Мы подтвердим, что ваша цена — лучшая на рынке. Это занимает до 24 часов." },
    { step: "04", title: "Получайте заказы", desc: "Зарабатывайте вместе с самым динамичным проектом Узбекистана!" },
  ];

  const disclaimerItems = [
    "Вы несёте полную ответственность за доставку, гарантию и возврат средств покупателям",
    "Katta Chegirma как платформа не несёт ответственности за действия сторонних продавцов",
    "Все товары проходят модерацию — товары без скидок или поддельные будут отклонены",
    "Продавцы, нарушающие правила, будут заблокированы",
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ===== HERO ===== */}
      <div className="relative bg-gradient-to-br from-gray-900 via-red-950 to-primary overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
        <div className="container relative py-20 text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-semibold mb-6 border border-white/20">
            <Store size={15} /> Партнёрская программа
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-tight">
            Станьте партнёром<br />
            <span className="text-yellow-400">Katta Chegirma</span>
          </h1>
          <p className="text-white/80 text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Продавайте больше, продавайте быстрее!
          </p>
          <p className="text-white/60 text-base max-w-xl mx-auto mb-10">
            Вы ищете способ мгновенно увеличить свои продажи и получить доступ к миллионной аудитории?
            Добро пожаловать на <strong className="text-white">Katta Chegirma</strong> — главную платформу
            Узбекистана для реализации бытовой техники с горящими скидками!
          </p>
          <a
            href="#register-form"
            className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-8 py-4 rounded-2xl font-black text-lg hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/30"
          >
            Начать продавать <ArrowRight size={20} />
          </a>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="bg-white border-b border-gray-100">
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${color} text-white mb-3 mx-auto`}>
                  <Icon size={22} />
                </div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== WHY US ===== */}
      <div className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900 mb-3">Почему продавцы выбирают нас?</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Продавать через нас — это круто. Вот 6 причин, почему лучшие продавцы Узбекистана уже с нами.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-50">
              <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${color} mb-4`}>
                <Icon size={20} />
              </div>
              <h3 className="font-black text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ===== HONEST DISCOUNTS BLOCK ===== */}
      <div className="bg-gradient-to-r from-primary/5 to-red-50 border-y border-red-100">
        <div className="container py-14">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-lg">🔍</div>
              <h2 className="text-2xl font-black text-gray-900">Наша логика: только честные скидки!</h2>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6">
              Название <strong className="text-primary">Katta Chegirma</strong> обязывает нас к особому подходу.
              В эпоху интернета покупатель может за секунду сравнить цены на любую технику.
              Если цена на нашем сайте будет обычной, мы потеряем доверие.
            </p>
            <p className="text-gray-700 font-semibold mb-4">Поэтому мы ввели систему обязательной верификации товаров:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 border border-red-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Проверка цен</p>
                    <p className="text-sm text-gray-500">Мы допускаем к публикации только те товары, цена на которые действительно является самой низкой на рынке.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-red-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Мгновенные продажи</p>
                    <p className="text-sm text-gray-500">Покупатель видит лучшую цену и покупает моментально, не раздумывая. Это гарантирует вам высокую оборачиваемость товара.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <p className="text-primary font-bold text-sm">
                💡 Итог: ваш магазин получает репутацию надёжного поставщика, а покупатели возвращаются снова и снова — потому что знают, что здесь честная цена.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HOW IT WORKS ===== */}
      <div className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-gray-900 mb-3">Как начать?</h2>
          <p className="text-gray-500">Всего 4 простых шага до первых продаж</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {howItWorks.map(({ step, title, desc }) => (
            <div key={step} className="relative bg-white rounded-2xl shadow-sm p-6 border border-gray-50">
              <div className="text-5xl font-black text-primary/10 mb-3 leading-none">{step}</div>
              <h3 className="font-black text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* ===== DISCLAIMER ===== */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-10 text-sm text-amber-800 max-w-3xl mx-auto">
          <p className="font-bold mb-2">⚠️ Важное уведомление — условия для продавцов:</p>
          <ul className="space-y-1.5">
            {disclaimerItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ===== REGISTER FORM ===== */}
        <div id="register-form" className="max-w-lg mx-auto scroll-mt-8">
          {step === "pending" || (sellerQuery.data && !sellerQuery.data.isApproved) ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
              <div className="text-5xl mb-4">⏳</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{t.seller_pending_title}</h2>
              <p className="text-gray-500 text-sm">{t.seller_pending_desc}</p>
            </div>
          ) : !user ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store size={32} className="text-primary" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">{t.seller_login_required}</h2>
              <p className="text-gray-500 text-sm mb-6">{t.seller_login_desc}</p>
              <button
                onClick={() => openLogin()}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors w-full"
              >
                {t.seller_login_btn}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Store size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">Регистрация продавца</h2>
                  <p className="text-xs text-gray-400">Заполните форму — мы свяжемся с вами</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <Store size={13} className="inline mr-1" /> {t.seller_store_name} *
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t.seller_store_placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <Phone size={13} className="inline mr-1" /> {t.seller_phone} *
                  </label>
                  <input
                    value={form.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    onFocus={() => { if (!form.phone) setForm(f => ({ ...f, phone: "+998 " })); }}
                    placeholder="+998 90 123-45-67"
                    inputMode="tel"
                    maxLength={17}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      phoneError
                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                        : form.phone && !phoneError
                          ? "border-green-400 focus:ring-green-300 bg-green-50"
                          : "border-gray-200 focus:ring-primary/30"
                    }`}
                  />
                  {phoneError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <span>⚠</span> {phoneError}
                    </p>
                  )}
                  {form.phone && !phoneError && form.phone.replace(/[\s\-]/g, "").length >= 13 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <span>✓</span> Номер корректный
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Формат: +998 90 123-45-67</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <MessageCircle size={13} className="inline mr-1" /> {t.seller_telegram_optional}
                  </label>
                  <input
                    value={form.telegram}
                    onChange={e => setForm(f => ({ ...f, telegram: e.target.value }))}
                    placeholder="@username"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    <FileText size={13} className="inline mr-1" /> {t.seller_description_optional}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder={t.seller_desc_placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!form.name.trim()) {
                      toast.error("Введите название магазина");
                      return;
                    }
                    const stripped = form.phone.replace(/[\s\-]/g, "");
                    if (!UZ_PHONE_RE.test(stripped)) {
                      setPhoneError("Введите корректный номер Узбекистана: +998 XX XXX-XX-XX");
                      toast.error("Некорректный номер телефона");
                      return;
                    }
                    registerMut.mutate({ ...form, phone: stripped });
                  }}
                  disabled={registerMut.isPending}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                >
                  {registerMut.isPending
                    ? t.seller_submitting
                    : (<><span>{t.seller_submit}</span><ChevronRight size={18} /></>)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== BOTTOM CTA ===== */}
      <div className="bg-gradient-to-r from-gray-900 to-primary text-white">
        <div className="container py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Katta Chegirma — здесь продают те,<br className="hidden md:block" /> кто готов предложить лучшее!
          </h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto">
            Присоединяйтесь к самому динамичному проекту Узбекистана и начните зарабатывать уже сегодня.
          </p>
          <a
            href="#register-form"
            className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 px-8 py-4 rounded-2xl font-black text-lg hover:bg-yellow-300 transition-colors"
          >
            Стать продавцом <ArrowRight size={20} />
          </a>
        </div>
      </div>

      <ScrollToTop />
      <SellerSuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        storeName={form.name}
      />
    </div>
  );
}
