import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function ResetPassword() {
  usePageMeta({ title: "Восстановление пароля | Katta Chegirma", description: "Сброс пароля", noindex: true });
  const [, navigate] = useLocation();
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const requestMut = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: () => setSent(true),
  });
  const resetMut = trpc.auth.resetPassword.useMutation({
    onSuccess: () => { setDone(true); toast.success("Пароль изменён"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="px-4 pt-4">
        <button onClick={() => navigate("/login")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft size={16} /> Ко входу
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm">KC</div>
              <span className="text-xl font-black text-gray-900">Katta Chegirma</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {token ? (
              done ? (
                <div className="text-center">
                  <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
                  <h1 className="text-lg font-black text-gray-900 mb-2">Пароль изменён</h1>
                  <p className="text-sm text-gray-500 mb-5">Теперь войдите с новым паролем.</p>
                  <button onClick={() => navigate("/login")} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm">Войти</button>
                </div>
              ) : (
                <div>
                  <h1 className="text-lg font-black text-gray-900 mb-1">Новый пароль</h1>
                  <p className="text-sm text-gray-500 mb-5">Придумайте новый пароль для входа.</p>
                  <div className="relative mb-4">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      minLength={6}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    onClick={() => { if (password.length < 6) { toast.error("Минимум 6 символов"); return; } resetMut.mutate({ token, password }); }}
                    disabled={resetMut.isPending}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
                  >
                    {resetMut.isPending ? "Сохранение..." : "Сохранить пароль"}
                  </button>
                </div>
              )
            ) : sent ? (
              <div className="text-center">
                <Mail size={44} className="text-red-600 mx-auto mb-3" />
                <h1 className="text-lg font-black text-gray-900 mb-2">Проверьте почту</h1>
                <p className="text-sm text-gray-500">Если такой email зарегистрирован, мы отправили на него ссылку для сброса пароля. Ссылка действует 1 час.</p>
              </div>
            ) : (
              <div>
                <h1 className="text-lg font-black text-gray-900 mb-1">Забыли пароль?</h1>
                <p className="text-sm text-gray-500 mb-5">Введите email от аккаунта — пришлём ссылку для сброса.</p>
                <div className="relative mb-4">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 text-sm"
                  />
                </div>
                <button
                  onClick={() => { if (!email.includes("@")) { toast.error("Введите корректный email"); return; } requestMut.mutate({ email }); }}
                  disabled={requestMut.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
                >
                  {requestMut.isPending ? "Отправка..." : "Отправить ссылку"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
