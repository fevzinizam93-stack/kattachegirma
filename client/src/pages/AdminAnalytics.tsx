import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Eye, ShoppingCart, Package, TrendingUp, Users, Lock, Loader2,
  Search, Heart, Star, MousePointerClick, Clock, Globe, RotateCcw,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString("ru-RU");
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return Math.round((a / b) * 100) + "%";
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-2xl font-black text-gray-800">{typeof value === "number" ? fmt(value) : value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">{children}</h2>
  );
}

function TopTable({
  rows, col2Label,
}: {
  rows: { name: string; value: number }[];
  col1?: string;
  col2?: string;
  col2Label?: string;
}) {
  if (!rows.length) return <p className="text-sm text-gray-400 italic">Нет данных</p>;
  const max = rows[0]?.value ?? 1;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">{r.name || "—"}</span>
              <span className="text-xs font-bold text-gray-800 shrink-0 ml-1">{fmt(r.value)} {col2Label}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round((r.value / max) * 100)}%`, backgroundColor: "#cc0000" }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const p = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-bold">{fmt(value)} ({p}%)</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

const COLORS = ["#cc0000", "#e65100", "#f57c00", "#388e3c", "#1565c0", "#6a1b9a", "#00838f"];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading, error } = trpc.analytics.stats.useQuery(
    { days },
    { enabled: isAdmin, retry: false, refetchOnWindowFocus: false }
  );

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Lock size={48} className="text-gray-300" />
        <p className="text-gray-500 font-medium">Доступ только для администраторов</p>
        <Link href="/" className="text-sm text-blue-600 underline">На главную</Link>
      </div>
    );
  }

  // ── Loading / error ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }
  if (error || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p className="text-red-500 font-medium">Ошибка загрузки аналитики</p>
        <p className="text-xs text-gray-400">{error?.message}</p>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────
  const funnel = (stats.funnel ?? { pageViews: 0, productViews: 0, productClicks: 0, addToCart: 0, addToFavorites: 0, orders: 0 }) as {
    pageViews: number; productViews: number; productClicks: number; addToCart: number; addToFavorites: number; orders: number;
  };
  const maxFunnel = funnel.pageViews || 1;

  // Merge daily views + sessions + orders into one array
  const dailyMap: Record<string, { date: string; views: number; sessions: number; orders: number; revenue: number }> = {};
  for (const d of (stats.dailyViews ?? [])) {
    dailyMap[d.date] = { date: d.date, views: Number(d.views), sessions: 0, orders: 0, revenue: 0 };
  }
  for (const d of ((stats as any).dailySessions ?? [])) {
    if (!dailyMap[d.date]) dailyMap[d.date] = { date: d.date, views: 0, sessions: 0, orders: 0, revenue: 0 };
    dailyMap[d.date].sessions = Number(d.sessions);
  }
  for (const d of ((stats as any).dailyOrders ?? [])) {
    if (!dailyMap[d.date]) dailyMap[d.date] = { date: d.date, views: 0, sessions: 0, orders: 0, revenue: 0 };
    dailyMap[d.date].orders = Number(d.ordersCount ?? 0);
    dailyMap[d.date].revenue = Number(d.revenue ?? 0);
  }
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  // Orders summary
  const ordersStats = (stats as any).ordersStats ?? [];
  const totalOrders = ordersStats.reduce((s: number, r: any) => s + Number(r.total), 0);
  const totalRevenue = ordersStats.reduce((s: number, r: any) => s + Number(r.revenue ?? 0), 0);

  // Ratings pie
  const ratingsDistribution = (stats as any).ratingsDistribution ?? [];
  const ratingsPie = ratingsDistribution
    .map((r: any) => ({ name: `${r.rating}★`, value: Number(r.total) }))
    .sort((a: any, b: any) => b.name.localeCompare(a.name));

  // UTM sources
  const utmStats = (stats as any).utmStats ?? {};
  const utmSources = (utmStats.topSources ?? []).map((s: any) => ({
    name: s.source || "прямой",
    value: Number(s.total),
  }));

  const topClickedProducts = (stats as any).topClickedProducts ?? [];
  const topCartProducts = (stats as any).topCartProducts ?? [];
  const topFavoritedProducts = (stats as any).topFavoritedProducts ?? [];
  const topOrderedProducts = (stats as any).topOrderedProducts ?? [];
  const topRatedProducts = (stats as any).topRatedProducts ?? [];
  const topPages = (stats as any).topPages ?? [];
  const searchQueries = (stats as any).searchQueries ?? [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Админ</Link>
            <h1 className="text-lg font-black text-gray-800">Аналитика</h1>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${days === d ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {d}д
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-8">

        {/* ── 1. KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<Eye size={20} />} label="Просмотры страниц" value={funnel.pageViews} color="#1565c0" />
          <StatCard icon={<Users size={20} />} label="Уникальных сессий" value={(stats as any).uniqueSessions ?? 0} color="#00838f" />
          <StatCard icon={<MousePointerClick size={20} />} label="Клики по товарам" value={funnel.productClicks} color="#6a1b9a" />
          <StatCard icon={<ShoppingCart size={20} />} label="Добавлено в корзину" value={funnel.addToCart} color="#e65100" />
          <StatCard icon={<Heart size={20} />} label="В избранное" value={funnel.addToFavorites} color="#c62828" />
          <StatCard icon={<Package size={20} />} label="Заказов" value={totalOrders} sub={`${fmt(Math.round(totalRevenue))} сум`} color="#2e7d32" />
        </div>

        {/* ── 2. Traffic Chart ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionTitle><TrendingUp size={16} className="text-blue-600" /> Трафик по дням</SectionTitle>
          {dailyData.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Нет данных за выбранный период</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="views" stroke="#1565c0" strokeWidth={2} dot={false} name="Просмотры" />
                <Line type="monotone" dataKey="sessions" stroke="#00838f" strokeWidth={2} dot={false} name="Сессии" />
                <Line type="monotone" dataKey="orders" stroke="#2e7d32" strokeWidth={2} dot={false} name="Заказы" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── 3. Funnel ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionTitle><TrendingUp size={16} className="text-orange-600" /> Воронка конверсии</SectionTitle>
          <FunnelBar label="Просмотры страниц" value={funnel.pageViews} max={maxFunnel} color="#1565c0" />
          <FunnelBar label="Просмотры товаров" value={funnel.productViews} max={maxFunnel} color="#6a1b9a" />
          <FunnelBar label="Клики по товарам" value={funnel.productClicks} max={maxFunnel} color="#f57c00" />
          <FunnelBar label="Добавлено в корзину" value={funnel.addToCart} max={maxFunnel} color="#e65100" />
          <FunnelBar label="Добавлено в избранное" value={funnel.addToFavorites} max={maxFunnel} color="#c62828" />
          <FunnelBar label="Заказов оформлено" value={funnel.orders} max={maxFunnel} color="#2e7d32" />
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-500">Клики → Корзина</p>
              <p className="text-lg font-black text-orange-600">{pct(funnel.addToCart, funnel.productClicks)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Корзина → Заказ</p>
              <p className="text-lg font-black text-green-700">{pct(funnel.orders, funnel.addToCart)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Общая конверсия</p>
              <p className="text-lg font-black text-red-700">{pct(funnel.orders, funnel.pageViews)}</p>
            </div>
          </div>
        </div>

        {/* ── 4. Top Products Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <SectionTitle><Eye size={14} className="text-blue-600" /> Самые просматриваемые</SectionTitle>
            <TopTable
              rows={(stats.topProducts ?? []).map(r => ({ name: r.productName ?? "—", value: Number(r.views) }))}
              col2Label="просм."
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <SectionTitle><MousePointerClick size={14} className="text-purple-600" /> Самые кликабельные</SectionTitle>
            <TopTable
              rows={topClickedProducts.map((r: any) => ({ name: r.productName ?? "—", value: Number(r.clicks) }))}
              col2Label="кликов"
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <SectionTitle><ShoppingCart size={14} className="text-orange-600" /> Чаще в корзину</SectionTitle>
            <TopTable
              rows={topCartProducts.map((r: any) => ({ name: r.productName ?? "—", value: Number(r.cartAdds) }))}
              col2Label="раз"
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <SectionTitle><Heart size={14} className="text-red-600" /> Чаще в избранное</SectionTitle>
            <TopTable
              rows={topFavoritedProducts.map((r: any) => ({ name: r.productName ?? "—", value: Number(r.favs) }))}
              col2Label="раз"
            />
          </div>
        </div>

        {/* ── 5. Orders & Revenue ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Package size={16} className="text-green-700" /> Заказы по статусам</SectionTitle>
            {ordersStats.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Нет заказов за период</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ordersStats.map((r: any) => ({ name: r.status, value: Number(r.total) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="#2e7d32" name="Кол-во" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 text-center border-t border-gray-100 pt-3">
              <div>
                <p className="text-xs text-gray-500">Всего заказов</p>
                <p className="text-xl font-black text-gray-800">{fmt(totalOrders)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Продажи (сум)</p>
                <p className="text-xl font-black text-green-700">{fmt(Math.round(totalRevenue))} сум</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Package size={16} className="text-green-700" /> Топ заказываемые товары</SectionTitle>
            <TopTable
              rows={topOrderedProducts.map((r: any) => ({ name: r.productName ?? "—", value: r.orders }))}
              col2Label="заказов"
            />
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
              <RotateCcw size={12} />
              <span>Повторных покупателей: <strong className="text-gray-800">{fmt((stats as any).repeatOrderUsers ?? 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* ── 6. Search Queries & Traffic Sources ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Search size={16} className="text-indigo-600" /> Поисковые запросы</SectionTitle>
            {searchQueries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Нет поисковых запросов</p>
            ) : (
              <div className="space-y-1.5">
                {searchQueries.slice(0, 15).map((q: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 truncate max-w-[75%]">{q.query}</span>
                    <span className="text-xs font-bold text-indigo-600 shrink-0">{fmt(Number(q.total))} раз</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Globe size={16} className="text-teal-600" /> Источники трафика</SectionTitle>
            {utmSources.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Нет данных об источниках</p>
            ) : (
              <div className="flex flex-col gap-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={utmSources}
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {utmSources.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {utmSources.slice(0, 8).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-700 truncate max-w-[180px]">{s.name}</span>
                      </div>
                      <span className="font-bold text-gray-800">{fmt(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 7. Ratings & Reviews ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Star size={16} className="text-yellow-500" /> Рейтинги товаров</SectionTitle>
            <div className="flex items-center gap-6 mb-4">
              <div className="text-center">
                <p className="text-4xl font-black text-yellow-500">{(stats as any).avgRating ?? "—"}</p>
                <p className="text-xs text-gray-400">Средний рейтинг</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-gray-800">{fmt((stats as any).totalReviews ?? 0)}</p>
                <p className="text-xs text-gray-400">Отзывов</p>
              </div>
            </div>
            {ratingsPie.length > 0 && (
              <div className="space-y-1.5">
                {ratingsPie.map((r: any, i: number) => {
                  const total = ratingsPie.reduce((s: number, x: any) => s + x.value, 0);
                  const p = total > 0 ? Math.round((r.value / total) * 100) : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-yellow-500 w-8 shrink-0">{r.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-yellow-400" style={{ width: `${p}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{p}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <SectionTitle><Star size={16} className="text-yellow-500" /> Топ рейтинговые товары</SectionTitle>
            {topRatedProducts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {topRatedProducts.slice(0, 8).map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">{r.productName ?? `Товар #${r.productId}`}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-yellow-500 text-xs">{'★'.repeat(Math.round(Number(r.avgRating)))}</span>
                      <span className="text-xs font-bold text-gray-800">{Number(r.avgRating).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({fmt(Number(r.reviewCount))})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 8. Top Pages ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <SectionTitle><Eye size={16} className="text-blue-600" /> Самые посещаемые страницы</SectionTitle>
          {topPages.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Нет данных</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {topPages.slice(0, 12).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-700 truncate max-w-[70%]">{p.page || "/"}</span>
                  <span className="text-xs font-bold text-blue-600 shrink-0">{fmt(Number(p.views))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 9. Additional stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Heart size={20} />} label="Добавлено в избранное (всего)" value={(stats as any).favoritesCount ?? 0} color="#c62828" />
          <StatCard icon={<RotateCcw size={20} />} label="Повторных покупателей" value={(stats as any).repeatOrderUsers ?? 0} color="#6a1b9a" />
          <StatCard icon={<Users size={20} />} label="Авторизованных пользователей" value={(stats as any).uniqueUsers ?? 0} color="#1565c0" />
          <StatCard icon={<Clock size={20} />} label="Период анализа" value={`${days} дней`} color="#00838f" />
        </div>

      </div>
    </div>
  );
}
