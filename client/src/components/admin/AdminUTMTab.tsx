import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapPin, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const UTM_LINKS = [
  {
    platform: "Instagram Bio",
    icon: "📸",
    color: "bg-pink-50 border-pink-200 text-pink-800",
    badgeColor: "bg-pink-100 text-pink-700",
    url: "https://kattachegirma.uz/?utm_source=instagram&utm_medium=bio&utm_campaign=katta.chegirma",
    hint: "Вставьте в шапку профиля @katta.chegirma",
  },
  {
    platform: "Instagram Stories",
    icon: "📱",
    color: "bg-pink-50 border-pink-200 text-pink-800",
    badgeColor: "bg-pink-100 text-pink-700",
    url: "https://kattachegirma.uz/?utm_source=instagram&utm_medium=stories&utm_campaign=katta.chegirma",
    hint: "Используйте в Stories со свайпом вверх",
  },
  {
    platform: "TikTok Bio",
    icon: "🎵",
    color: "bg-gray-50 border-gray-200 text-gray-800",
    badgeColor: "bg-gray-200 text-gray-700",
    url: "https://kattachegirma.uz/?utm_source=tiktok&utm_medium=bio&utm_campaign=katta.chegirma",
    hint: "Вставьте в описание профиля @katta.chegirma",
  },
  {
    platform: "Telegram канал",
    icon: "✈️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    badgeColor: "bg-blue-100 text-blue-700",
    url: "https://kattachegirma.uz/?utm_source=telegram&utm_medium=channel&utm_campaign=products",
    hint: "Для постов в @kattachegirmauz",
  },
  {
    platform: "Facebook",
    icon: "👥",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    badgeColor: "bg-blue-100 text-blue-700",
    url: "https://kattachegirma.uz/?utm_source=facebook&utm_medium=post&utm_campaign=katta.chegirma",
    hint: "Для постов на странице Facebook",
  },
  {
    platform: "YouTube",
    icon: "▶️",
    color: "bg-red-50 border-red-200 text-red-800",
    badgeColor: "bg-red-100 text-red-700",
    url: "https://kattachegirma.uz/?utm_source=youtube&utm_medium=description&utm_campaign=katta.chegirma",
    hint: "Вставьте в описание видео на YouTube",
  },
];

export default function AdminUTMTab() {
  const [utmDays, setUtmDays] = useState(30);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { data: utmStats, isLoading: utmLoading } = trpc.utm.getStats.useQuery(
    { days: utmDays },
    { refetchOnWindowFocus: false }
  );

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("Ссылка скопирована!");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  return (
    <div className="space-y-6">
      {/* UTM Links section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-black text-gray-900">UTM-ссылки для соцсетей</h2>
          <p className="text-sm text-gray-500 mt-0.5">Готовые ссылки с UTM-метками для отслеживания трафика из каждой платформы</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {UTM_LINKS.map((link) => (
            <div key={link.platform} className={`border rounded-xl p-4 ${link.color}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-bold text-sm">{link.platform}</span>
                </div>
                <button
                  onClick={() => handleCopy(link.url)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${link.badgeColor} hover:opacity-80`}
                >
                  {copiedUrl === link.url ? <Check size={12} /> : <Copy size={12} />}
                  {copiedUrl === link.url ? "Скопировано" : "Копировать"}
                </button>
              </div>
              <code className="text-[10px] break-all block opacity-70 mb-1">{link.url}</code>
              <p className="text-xs opacity-60">{link.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-gray-900">Статистика переходов</h2>
            <p className="text-sm text-gray-500 mt-0.5">Откуда приходят посетители сайта</p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setUtmDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  utmDays === d ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d} дн.
              </button>
            ))}
          </div>
        </div>

        {utmLoading ? (
          <div className="text-center py-12 text-gray-400">Загрузка статистики...</div>
        ) : !utmStats || utmStats.total === 0 ? (
          <div className="text-center py-12">
            <MapPin size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-semibold">Нет данных за выбранный период</p>
            <p className="text-sm text-gray-400 mt-1">Переходы по UTM-ссылкам появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Всего переходов</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.total}</p>
              </div>
              <div className="bg-pink-50 rounded-xl p-4">
                <p className="text-xs text-pink-600 font-semibold uppercase tracking-wide">Из Instagram</p>
                <p className="text-2xl font-black text-pink-700 mt-1">{utmStats.instagramTotal}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Источников</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.bySource.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Кампаний</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{utmStats.byCampaign.filter(c => c.campaign !== "—").length}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">По источнику</h3>
              <div className="space-y-2">
                {utmStats.bySource.map(({ source, count }) => (
                  <div key={source} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 truncate font-medium">{source}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.round((count / utmStats.total) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-10 text-right">{count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{Math.round((count / utmStats.total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {utmStats.byCampaign.some(c => c.campaign !== "—") && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">По кампании</h3>
                <div className="space-y-2">
                  {utmStats.byCampaign.filter(c => c.campaign !== "—").map(({ campaign, count }) => (
                    <div key={campaign} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-40 truncate font-medium">{campaign}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.round((count / utmStats.total) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-10 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">По дням</h3>
              <div className="flex items-end gap-1 h-24">
                {utmStats.byDay.map(({ date, count }) => {
                  const maxCount = Math.max(...utmStats.byDay.map(d => d.count), 1);
                  const heightPct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-primary/20 rounded-sm group-hover:bg-primary/40 transition-colors"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                      />
                      {count > 0 && (
                        <span className="absolute -top-5 text-xs text-gray-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{utmStats.byDay[0]?.date}</span>
                <span>{utmStats.byDay[utmStats.byDay.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
