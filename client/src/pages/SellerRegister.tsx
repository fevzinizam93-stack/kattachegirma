import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Store, Phone, MessageCircle, FileText, ChevronRight, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useAuthModal } from "@/App";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SellerRegister() {
  const { user, loading } = useAuth();
  const { openLogin } = useAuthModal();
  const [, navigate] = useLocation();
  const { lang, t } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", telegram: "", description: "" });
  const [step, setStep] = useState<"info" | "form" | "pending">("info");

  const sellerQuery = trpc.sellers.me.useQuery(undefined, { enabled: !!user });
  const registerMut = trpc.sellers.register.useMutation({
    onSuccess: () => {
      toast.success(t.seller_submitted);
      setStep("pending");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  // Already a seller — redirect to dashboard
  if (user && sellerQuery.data?.isApproved) {
    navigate("/seller/dashboard");
    return null;
  }

  const benefits = [
    {
      icon: TrendingUp,
      title: lang === "uz" ? "Ko'p xaridor" : "Много покупателей",
      desc: lang === "uz" ? "Har kuni minglab tashrif buyuruvchilar" : "Тысячи посетителей каждый день",
    },
    {
      icon: ShieldCheck,
      title: lang === "uz" ? "Ishonchli platforma" : "Надёжная платформа",
      desc: lang === "uz" ? "Mahsulotlar moderatsiyadan o'tadi" : "Все товары проходят модерацию",
    },
    {
      icon: Users,
      title: lang === "uz" ? "Oson boshqaruv" : "Простое управление",
      desc: lang === "uz" ? "Shaxsiy panel orqali tovarlarni boshqaring" : "Управляйте товарами через личный кабинет",
    },
  ];

  const disclaimerItems = lang === "uz"
    ? [
        "Siz tovar yetkazib berish, kafolat va xaridor pullari uchun to'liq javobgarsiz",
        "Katta Chegirma platforma sifatida uchinchi tomon sotuvchilar uchun javobgarlik olmaydi",
        "Barcha mahsulotlar moderatsiyadan o'tadi — chegirmasiz yoki soxta mahsulotlar rad etiladi",
        "Qoidalarni buzgan sotuvchilar bloklanadi",
      ]
    : [
        "Вы несёте полную ответственность за доставку, гарантию и возврат средств покупателям",
        "Katta Chegirma как платформа не несёт ответственности за действия сторонних продавцов",
        "Все товары проходят модерацию — товары без скидок или поддельные будут отклонены",
        "Продавцы, нарушающие правила, будут заблокированы",
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-red-700 text-white py-16">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Store size={16} /> {t.seller_become}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">{t.seller_register_title}</h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            {t.seller_register_subtitle}
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl shadow-sm p-6 flex gap-4 items-start">
              <div className="bg-primary/10 rounded-xl p-3"><Icon size={22} className="text-primary" /></div>
              <div>
                <p className="font-bold text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Important disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-sm text-amber-800">
          <p className="font-bold mb-1">
            ⚠️ {lang === "uz" ? "Muhim eslatma — sotuvchilar uchun shartlar:" : "Важное уведомление — условия для продавцов:"}
          </p>
          <ul className="list-disc list-inside space-y-1">
            {disclaimerItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        {step === "pending" || (sellerQuery.data && !sellerQuery.data.isApproved) ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">{t.seller_pending_title}</h2>
            <p className="text-gray-500 text-sm">{t.seller_pending_desc}</p>
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
            <Store size={40} className="text-primary mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">{t.seller_login_required}</h2>
            <p className="text-gray-500 text-sm mb-6">{t.seller_login_desc}</p>
            <button
              onClick={() => openLogin()}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              {t.seller_login_btn}
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">{t.seller_register_title}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <Store size={14} className="inline mr-1" /> {t.seller_store_name} *
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
                  <Phone size={14} className="inline mr-1" /> {t.seller_phone} *
                </label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder={t.seller_phone_placeholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <MessageCircle size={14} className="inline mr-1" /> {t.seller_telegram_optional}
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
                  <FileText size={14} className="inline mr-1" /> {t.seller_description_optional}
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
                  if (!form.name.trim() || !form.phone.trim()) {
                    toast.error(t.seller_required_fields);
                    return;
                  }
                  registerMut.mutate(form);
                }}
                disabled={registerMut.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
  );
}
