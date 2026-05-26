import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapPin } from "lucide-react";

export default function AdminUTMTab() {
  const [utmDays, setUtmDays] = useState(30);
  const { data: utmStats, isLoading: utmLoading } = trpc.utm.getStats.useQuery(
    { days: utmDays },
    { refetchOnWindowFocus: false }
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">Источники трафика</h2>
          <p className="text-sm text-gray-500 mt-0.5">UTM-метки для отслеживания переходов из Instagram и других источников</p>
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

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-bold text-blue-800 mb-1">Ссылка для Instagram Bio</p>
        <code className="text-xs text-blue-700 break-all select-all">
          https://kattachegirma.uz/?utm_source=instagram&utm_medium=bio&utm_campaign=katta.chegirma
        </code>
        <p className="text-xs text-blue-600 mt-1">Вставьте эту ссылку в шапку профиля @katta.chegirma</p>
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
  );
}
