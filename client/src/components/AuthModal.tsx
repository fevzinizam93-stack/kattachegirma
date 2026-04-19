import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { useLocation } from "wouter";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const handleLoginSuccess = (role: string) => {
    utils.auth.me.invalidate();
    onClose();
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/profile");
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      toast.success("Успешный вход!");
      handleLoginSuccess(data.user.role);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      toast.success("Регистрация успешна!");
      handleLoginSuccess(data.user.role);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") {
      loginMutation.mutate({ email: form.email, password: form.password });
    } else {
      registerMutation.mutate({ name: form.name, email: form.email, password: form.password });
    }
  };

  if (!isOpen) return null;

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#cc0000] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">
            {tab === "login" ? "Kirish / Войти" : "Ro'yxatdan o'tish / Регистрация"}
          </h2>
          <button onClick={onClose} className="text-white hover:text-red-200 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "login"
                ? "text-[#cc0000] border-b-2 border-[#cc0000]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("login")}
          >
            Kirish / Войти
          </button>
          <button
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === "register"
                ? "text-[#cc0000] border-b-2 border-[#cc0000]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab("register")}
          >
            Ro'yxatdan o'tish / Регистрация
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ism / Имя
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent text-sm"
                  placeholder="Ismingiz / Ваше имя"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent text-sm"
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parol / Пароль
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cc0000] focus:border-transparent text-sm"
                placeholder={tab === "login" ? "Parolingiz / Ваш пароль" : "Kamida 6 ta belgi / Минимум 6 символов"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[#cc0000] hover:bg-[#aa0000] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Yuklanmoqda... / Загрузка..."
              : tab === "login"
              ? "Kirish / Войти"
              : "Ro'yxatdan o'tish / Зарегистрироваться"}
          </button>

          <p className="text-center text-sm text-gray-500">
            {tab === "login" ? (
              <>
                Hisob yo'qmi?{" "}
                <button
                  type="button"
                  onClick={() => setTab("register")}
                  className="text-[#cc0000] font-medium hover:underline"
                >
                  Ro'yxatdan o'ting
                </button>
              </>
            ) : (
              <>
                Allaqachon hisob bormi?{" "}
                <button
                  type="button"
                  onClick={() => setTab("login")}
                  className="text-[#cc0000] font-medium hover:underline"
                >
                  Kiring
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
