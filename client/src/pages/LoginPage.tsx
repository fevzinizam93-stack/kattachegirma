import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [location] = useLocation();

  // Read ?redirect= param from URL
  const searchStr = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(searchStr);
  const redirectPath = params.get("redirect") || "/";

  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const utils = trpc.useUtils();

  const handleSuccess = (role: string) => {
    utils.auth.me.invalidate();
    toast.success(tab === "login" ? "Успешный вход!" : "Регистрация успешна!");
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate(redirectPath);
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => handleSuccess(data.user.role),
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => handleSuccess(data.user.role),
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") {
      loginMutation.mutate({ email: form.email, password: form.password });
    } else {
      registerMutation.mutate({ name: form.name, email: form.email, password: form.password });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Back button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => navigate(redirectPath === "/" ? "/" : redirectPath)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Назад
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm">KC</div>
              <span className="text-xl font-black text-gray-900">Katta Chegirma</span>
            </Link>
            <p className="text-sm text-gray-500 mt-1">Войдите, чтобы продолжить</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab === "login" ? "text-red-600 border-b-2 border-red-600 bg-red-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                Войти
              </button>
              <button
                onClick={() => setTab("register")}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab === "register" ? "text-red-600 border-b-2 border-red-600 bg-red-50/50" : "text-gray-500 hover:text-gray-700"}`}
              >
                Регистрация
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {tab === "register" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                      placeholder="Ваше имя"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                    placeholder={tab === "login" ? "Ваш пароль" : "Минимум 6 символов"}
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
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {isPending ? "Загрузка..." : tab === "login" ? "Войти" : "Зарегистрироваться"}
              </button>

              <p className="text-center text-sm text-gray-500">
                {tab === "login" ? (
                  <>
                    Нет аккаунта?{" "}
                    <button type="button" onClick={() => setTab("register")} className="text-red-600 font-medium hover:underline">
                      Зарегистрироваться
                    </button>
                  </>
                ) : (
                  <>
                    Уже есть аккаунт?{" "}
                    <button type="button" onClick={() => setTab("login")} className="text-red-600 font-medium hover:underline">
                      Войти
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
