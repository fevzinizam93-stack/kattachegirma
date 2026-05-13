import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Store,
  ChevronRight,
  Sparkles,
  Phone,
  ShieldCheck,
} from "lucide-react";

interface SellerSuccessModalProps {
  open: boolean;
  onClose: () => void;
  storeName?: string;
}

const steps = [
  {
    icon: ShieldCheck,
    color: "bg-blue-50 text-blue-600",
    title: "Модерация заявки",
    desc: "Наша команда проверит вашу заявку и убедится, что всё в порядке. Это занимает до 24 часов.",
    badge: "1–24 часа",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    icon: Phone,
    color: "bg-orange-50 text-orange-600",
    title: "Мы свяжемся с вами",
    desc: "Наш менеджер позвонит на указанный номер телефона для подтверждения и краткого инструктажа.",
    badge: "Звонок",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    icon: Store,
    color: "bg-green-50 text-green-600",
    title: "Активация магазина",
    desc: "После одобрения вы получите доступ к личному кабинету продавца и сможете добавлять товары.",
    badge: "Готово!",
    badgeColor: "bg-green-100 text-green-700",
  },
];

export function SellerSuccessModal({ open, onClose, storeName }: SellerSuccessModalProps) {
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2500);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-900 via-red-950 to-primary text-white px-8 pt-10 pb-8 text-center overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

          {/* animated check icon */}
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
            <div className={`absolute inset-0 rounded-full bg-green-400/20 ${confetti ? "animate-ping" : ""}`} />
            <div className="relative w-20 h-20 rounded-full bg-green-400/20 flex items-center justify-center">
              <CheckCircle2 size={44} className="text-green-400" />
            </div>
          </div>

          {confetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${8 + i * 7.5}%`,
                    top: `${20 + (i % 3) * 15}%`,
                    backgroundColor: ["#fbbf24", "#34d399", "#60a5fa", "#f87171", "#a78bfa"][i % 5],
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: "0.8s",
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={16} className="text-yellow-400" />
            <span className="text-yellow-400 text-sm font-bold uppercase tracking-wider">Заявка отправлена!</span>
            <Sparkles size={16} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black mb-2">
            Добро пожаловать{storeName ? `,\n${storeName}` : ""}!
          </h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Спасибо, что выбрали <strong className="text-white">Katta Chegirma</strong>!<br />
            Ваша заявка успешно принята и уже на рассмотрении.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-6 bg-white">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Что происходит дальше?</p>
          <div className="space-y-3">
            {steps.map(({ icon: Icon, color, title, desc, badge, badgeColor }, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-gray-900 text-sm">{title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>{badge}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Telegram tip */}
          <div className="mt-5 bg-blue-50 rounded-xl p-4 flex gap-3 items-start border border-blue-100">
            <MessageCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-blue-900 mb-0.5">Подпишитесь на наш Telegram</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Следите за обновлениями платформы, советами для продавцов и новостями в нашем Telegram-канале{" "}
                <a
                  href="https://t.me/kattachegirmauz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline underline-offset-2 hover:text-blue-900"
                >
                  @kattachegirmauz
                </a>
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={onClose}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Понятно, жду звонка <ChevronRight size={16} />
            </button>
            <a
              href="https://t.me/kattachegirmauz"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full border border-blue-200 text-blue-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={15} /> Перейти в Telegram
            </a>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Есть вопросы? Напишите нам в{" "}
            <a href="https://t.me/kattachegirmauz" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold">
              Telegram
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
