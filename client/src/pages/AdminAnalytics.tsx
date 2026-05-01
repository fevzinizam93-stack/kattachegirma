import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { BarChart3, Eye, ShoppingCart, Package, TrendingUp, Users, Lock, Loader2 } from "lucide-react";
import { Link } from "wouter";

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0`} style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-black text-gray-800">{value.toLocaleString("ru-RU")}</p>
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{value.toLocaleString("ru-RU")} ({pct}%)</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { lang } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);

  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading, error } = trpc.analytics.stats.useQuery(
    { days },
    {
      enabled: isAdmin,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const t = {
    title: "Аналитика",
    period: "Период",
    days7: "7 дней",
    days30: "30 дней",
    days90: "90 дней",
    pageViews: "Просмотры страниц",
    productViews: "Просмотры товаров",
    addToCart: "Добавлено в корзину",
    orders: "Заказы",
    funnel: "Воронка конверсий",
    topProducts: "Топ товаров",
    dailyViews: "Ежедневные просмотры",
    noData: "Нет данных",
    loading: "Загрузка...",
    convRate: "Конверсия",
    notAdmin: "Для доступа к этой странице нужны права администратора.",
    goAdmin: "Вернуться в панель администратора",
    errorTitle: "Ошибка загрузки данных",
    errorDesc: "Попробуйте ещё раз или обновите страницу.",
  };

  // 1. Auth is still loading
  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin text-gray-400" />
      </div>
    );
  }

  // 2. Not an admin
  if (!isAdmin) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Lock size={28} className="text-red-500" />
        </div>
        <p className="text-gray-600 text-center max-w-xs">{t.notAdmin}</p>
        <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">
          {t.goAdmin}
        </Link>
      </div>
    );
  }

  // 3. Stats are loading (admin confirmed, query is running)
  if (statsLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-gray-400 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  // 4. Error state
  if (error || !stats) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-3">
        <BarChart3 size={32} className="text-gray-300" />
        <p className="text-gray-700 font-semibold">{t.errorTitle}</p>
        <p className="text-gray-400 text-sm text-center">{t.errorDesc}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Обновить
        </button>
      </div>
    );
  }

  const funnel = stats.funnel ?? { pageViews: 0, productViews: 0, addToCart: 0, orders: 0 };
  const convRate = funnel.pageViews > 0 ? ((funnel.orders / funnel.pageViews) * 100).toFixed(2) : "0.00";
  const maxFunnel = funnel.pageViews || 1;

  // Build simple bar chart from daily views
  const dailyViews = stats.dailyViews ?? [];
  const maxViews = dailyViews.length > 0 ? Math.max(...dailyViews.map(d => Number(d.views))) : 1;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <BarChart3 size={22} style={{ color: "#cc0000" }} />
          {t.title}
        </h1>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? "text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              style={days === d ? { backgroundColor: "#cc0000" } : {}}
            >
              {d === 7 ? t.days7 : d === 30 ? t.days30 : t.days90}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Eye size={20} />} label={t.pageViews} value={funnel.pageViews} color="#1565c0" />
        <StatCard icon={<Package size={20} />} label={t.productViews} value={funnel.productViews} color="#6a1b9a" />
        <StatCard icon={<ShoppingCart size={20} />} label={t.addToCart} value={funnel.addToCart} color="#e65100" />
        <StatCard icon={<TrendingUp size={20} />} label={t.orders} value={funnel.orders} color="#2e7d32" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={16} style={{ color: "#cc0000" }} />
            {t.funnel}
            <span className="ml-auto text-xs font-normal text-gray-400">{t.convRate}: <span className="font-bold text-green-600">{convRate}%</span></span>
          </h2>
          <FunnelBar label={t.pageViews} value={funnel.pageViews} max={maxFunnel} color="#1565c0" />
          <FunnelBar label={t.productViews} value={funnel.productViews} max={maxFunnel} color="#6a1b9a" />
          <FunnelBar label={t.addToCart} value={funnel.addToCart} max={maxFunnel} color="#e65100" />
          <FunnelBar label={t.orders} value={funnel.orders} max={maxFunnel} color="#2e7d32" />
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Package size={16} style={{ color: "#cc0000" }} />
            {t.topProducts}
          </h2>
          {!stats.topProducts?.length ? (
            <p className="text-xs text-gray-400 text-center py-6">{t.noData}</p>
          ) : (
            <ol className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <li key={p.productId ?? i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: i === 0 ? "#f9a825" : i === 1 ? "#90a4ae" : i === 2 ? "#a1887f" : "#e0e0e0", color: i < 3 ? "white" : "#555" }}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-700 flex-1 truncate">{p.productName ?? "—"}</span>
                  <span className="text-xs font-bold text-gray-500 shrink-0">{Number(p.views).toLocaleString("ru-RU")}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Daily views bar chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 size={16} style={{ color: "#cc0000" }} />
          {t.dailyViews}
        </h2>
        {!dailyViews.length ? (
          <p className="text-xs text-gray-400 text-center py-6">{t.noData}</p>
        ) : (
          <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
            {dailyViews.map((d) => {
              const pct = Math.max(4, Math.round((Number(d.views) / maxViews) * 100));
              const dateStr = String(d.date).slice(5); // MM-DD
              return (
                <div key={String(d.date)} className="flex flex-col items-center gap-1 flex-1 min-w-[24px]" title={`${d.date}: ${d.views}`}>
                  <span className="text-[9px] text-gray-500 font-medium">{Number(d.views)}</span>
                  <div className="w-full rounded-t-sm transition-all" style={{ height: `${pct}%`, backgroundColor: "#cc0000", opacity: 0.8 }} />
                  <span className="text-[8px] text-gray-400 rotate-45 origin-left whitespace-nowrap">{dateStr}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
