import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, Link } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function VerifyEmail() {
  usePageMeta({ title: "Подтверждение почты | Katta Chegirma", description: "Подтверждение email", noindex: true });
  const [, navigate] = useLocation();
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");
  const verifyMut = trpc.auth.verifyEmail.useMutation();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) { setStatus("fail"); return; }
    verifyMut.mutate({ token }, { onSuccess: () => setStatus("ok"), onError: () => setStatus("fail") });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-sm">KC</div>
          <span className="text-xl font-black text-gray-900">Katta Chegirma</span>
        </Link>
        {status === "loading" && (
          <div>
            <Loader2 size={40} className="text-red-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Подтверждаем почту…</p>
          </div>
        )}
        {status === "ok" && (
          <div>
            <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
            <h1 className="text-lg font-black text-gray-900 mb-2">Почта подтверждена!</h1>
            <p className="text-sm text-gray-500 mb-5">Спасибо. Теперь восстановление доступа доступно.</p>
            <button onClick={() => navigate("/")} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm">На главную</button>
          </div>
        )}
        {status === "fail" && (
          <div>
            <XCircle size={44} className="text-gray-400 mx-auto mb-3" />
            <h1 className="text-lg font-black text-gray-900 mb-2">Ссылка недействительна</h1>
            <p className="text-sm text-gray-500 mb-5">Возможно, она устарела или уже использована.</p>
            <button onClick={() => navigate("/")} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm">На главную</button>
          </div>
        )}
      </div>
    </div>
  );
}
