import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Store, Phone, MessageCircle, FileText, ChevronRight, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { useAuthModal } from "@/App";

export default function SellerRegister() {
  const { user, loading } = useAuth();
  const { openLogin } = useAuthModal();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", phone: "", telegram: "", description: "" });
  const [step, setStep] = useState<"info" | "form" | "pending">("info");

  const sellerQuery = trpc.sellers.me.useQuery(undefined, { enabled: !!user });
  const registerMut = trpc.sellers.register.useMutation({
    onSuccess: (data) => {
      toast.success("Ariza yuborildi! Tez orada ko'rib chiqamiz.");
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-red-700 text-white py-16">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Store size={16} /> Sotuvchi bo'ling
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">Katta Chegirmada soting!</h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            O'z mahsulotlaringizni minglab xaridorlarga yetkazing. Ro'yxatdan o'ting va bugun savdo boshlang.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { icon: TrendingUp, title: "Ko'p xaridor", desc: "Har kuni minglab tashrif buyuruvchilar" },
            { icon: ShieldCheck, title: "Ishonchli platforma", desc: "Mahsulotlar moderatsiyadan o'tadi" },
            { icon: Users, title: "Oson boshqaruv", desc: "Shaxsiy panel orqali tovarlarni boshqaring" },
          ].map(({ icon: Icon, title, desc }) => (
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
          <p className="font-bold mb-1">⚠️ Muhim eslatma — sotuvchilar uchun shartlar:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Siz tovar yetkazib berish, kafolat va xaridor pullari uchun to'liq javobgarsiz</li>
            <li>Katta Chegirma platforma sifatida uchinchi tomon sotuvchilar uchun javobgarlik olmaydi</li>
            <li>Barcha mahsulotlar moderatsiyadan o'tadi — chegirmasiz yoki soxta mahsulotlar rad etiladi</li>
            <li>Qoidalarni buzgan sotuvchilar bloklanadi</li>
          </ul>
        </div>

        {step === "pending" || (sellerQuery.data && !sellerQuery.data.isApproved) ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h2 className="text-xl font-black text-gray-900 mb-2">Ariza ko'rib chiqilmoqda</h2>
            <p className="text-gray-500 text-sm">
              Arizangiz qabul qilindi. 30 daqiqadan 2 kungacha ko'rib chiqiladi.
              Tasdiqlangandan so'ng shaxsiy panelingiz ochiladi.
            </p>
          </div>
        ) : !user ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8 text-center">
            <Store size={40} className="text-primary mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Avval tizimga kiring</h2>
            <p className="text-gray-500 text-sm mb-6">Sotuvchi bo'lish uchun akkaunt kerak</p>
            <button
              onClick={() => openLogin()}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Kirish / Ro'yxatdan o'tish
            </button>
          </div>
        ) : (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">Sotuvchi sifatida ro'yxatdan o'ting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <Store size={14} className="inline mr-1" /> Do'kon nomi *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Masalan: Texno Market"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <Phone size={14} className="inline mr-1" /> Telefon raqami *
                </label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+998 90 123 45 67"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  <MessageCircle size={14} className="inline mr-1" /> Telegram (ixtiyoriy)
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
                  <FileText size={14} className="inline mr-1" /> Do'kon haqida (ixtiyoriy)
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Qanday mahsulotlar sotasiz?"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <button
                onClick={() => {
                  if (!form.name.trim() || !form.phone.trim()) {
                    toast.error("Do'kon nomi va telefon raqami majburiy");
                    return;
                  }
                  registerMut.mutate(form);
                }}
                disabled={registerMut.isPending}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {registerMut.isPending ? "Yuborilmoqda..." : (<><span>Ariza yuborish</span><ChevronRight size={18} /></>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
