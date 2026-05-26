import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

interface SettingsForm {
  storeName: string;
  description: string;
  phone: string;
  phone2: string;
  address: string;
  address2: string;
  telegram: string;
  instagram: string;
  workingHours: string;
}

export default function AdminSettingsTab() {
  const utils = trpc.useUtils();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    storeName: "", description: "", phone: "", phone2: "",
    address: "", address2: "", telegram: "", instagram: "", workingHours: "",
  });
  const [exchangeRate, setExchangeRate] = useState(12700);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [bulkUpdateResult, setBulkUpdateResult] = useState<{ updated: number; newRate: number } | null>(null);
  const [hitThreshold, setHitThreshold] = useState<number>(50);
  const [hitAutoEnabled, setHitAutoEnabled] = useState<boolean>(true);

  const { data: storeSettingsRaw } = trpc.storeSettings.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const { data: rateQuery } = trpc.currency.getRate.useQuery(undefined, {
    staleTime: 60 * 1000,
  });
  const hitSettingsQuery = trpc.hits.getHitSettings.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (storeSettingsRaw && !settingsLoaded) {
      const raw = storeSettingsRaw as Record<string, string>;
      setSettingsForm({
        storeName: raw.storeName ?? "",
        description: raw.description ?? "",
        phone: raw.phone ?? "",
        phone2: raw.phone2 ?? "",
        address: raw.address ?? "",
        address2: raw.address2 ?? "",
        telegram: raw.telegram ?? "",
        instagram: raw.instagram ?? "",
        workingHours: raw.workingHours ?? "",
      });
      setSettingsLoaded(true);
    }
  }, [storeSettingsRaw, settingsLoaded]);

  useEffect(() => {
    if (hitSettingsQuery.data) {
      setHitThreshold(hitSettingsQuery.data.threshold);
      setHitAutoEnabled(hitSettingsQuery.data.autoEnabled);
    }
  }, [hitSettingsQuery.data]);

  useEffect(() => {
    if (rateQuery?.usdToUzs) {
      setExchangeRate(rateQuery.usdToUzs);
    }
  }, [rateQuery]);

  const saveSettings = trpc.storeSettings.setMany.useMutation({
    onSuccess: () => { toast.success("Настройки сохранены!"); utils.storeSettings.getAll.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  const bulkUpdatePricesMut = trpc.currency.bulkUpdatePrices.useMutation({
    onSuccess: (data) => { setBulkUpdateResult(data); toast.success(`Обновлено ${data.updated} товаров!`); utils.products.adminList.invalidate(); utils.currency.getRate.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  const saveHitSettingsMut = trpc.hits.saveHitSettings.useMutation({
    onSuccess: () => { toast.success("Настройки авто-хитов сохранены!"); hitSettingsQuery.refetch(); utils.products.getHits.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  const recalcHitsMut = trpc.hits.recalcHits.useMutation({
    onSuccess: () => { toast.success("Хиты пересчитаны!"); utils.products.getHits.invalidate(); utils.products.list.invalidate(); },
    onError: (e) => toast.error("Ошибка: " + e.message),
  });

  return (
    <div className="max-w-2xl">
      <h2 className="font-black text-lg mb-5 text-gray-900">Настройки магазина</h2>

      {/* Bulk price recalculation */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 mb-5">
        <h3 className="font-bold text-base text-amber-900 mb-1 flex items-center gap-2">💱 Массовый пересчёт цен по курсу доллара</h3>
        <p className="text-xs text-amber-700 mb-4">Пересчитывает цены всех товаров у которых указана себестоимость (USD). Формула: <span className="font-mono font-bold">Цена = Себестоимость × Курс × (1 + Наценка%)</span></p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">Курс USD → UZS</label>
            <input
              type="number"
              value={exchangeRate}
              onChange={e => setExchangeRate(Number(e.target.value) || 12700)}
              className="w-32 border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              min={1}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-800 mb-1">Наценка (%)</label>
            <input
              type="number"
              value={markupPercent}
              onChange={e => setMarkupPercent(Number(e.target.value) || 0)}
              className="w-24 border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              min={0}
              max={500}
              placeholder="0"
            />
          </div>
          <button
            onClick={() => {
              if (!confirm(`Пересчитать все цены по курсу ${exchangeRate.toLocaleString("ru")} сум/USD с наценкой ${markupPercent}%?\n\nЭто изменит цены всех товаров с себестоимостью!`)) return;
              bulkUpdatePricesMut.mutate({ newRate: exchangeRate, markupPercent });
            }}
            disabled={bulkUpdatePricesMut.isPending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {bulkUpdatePricesMut.isPending ? <><span className="animate-spin">⏳</span> Пересчёт...</> : <>🔄 Пересчитать все цены</>}
          </button>
        </div>
        {bulkUpdateResult && (
          <div className="mt-3 bg-green-100 border border-green-300 rounded-lg px-4 py-2 text-sm text-green-800 font-semibold">
            ✅ Обновлено {bulkUpdateResult.updated} товаров по курсу {bulkUpdateResult.newRate.toLocaleString("ru")} сум/USD
          </div>
        )}
        {bulkUpdatePricesMut.isError && (
          <div className="mt-3 bg-red-100 border border-red-300 rounded-lg px-4 py-2 text-sm text-red-800">
            ❌ Ошибка: {bulkUpdatePricesMut.error?.message}
          </div>
        )}
        {rateQuery && (
          <p className="text-xs text-amber-600 mt-2">
            Автокурс ЦБ: {rateQuery.usdToUzs.toLocaleString("ru")} сум/USD (обновлён {rateQuery.updatedAt ? new Date(rateQuery.updatedAt).toLocaleString("ru", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"})
          </p>
        )}
      </div>

      {/* Store settings form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Название магазина</label>
          <input
            value={settingsForm.storeName}
            onChange={e => setSettingsForm(f => ({ ...f, storeName: e.target.value }))}
            placeholder="Katta Chegirma"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Описание</label>
          <textarea
            value={settingsForm.description}
            onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Краткое описание магазина..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Телефон 1</label>
            <input
              value={settingsForm.phone}
              onChange={e => setSettingsForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+998 90 123 45 67"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Телефон 2</label>
            <input
              value={settingsForm.phone2}
              onChange={e => setSettingsForm(f => ({ ...f, phone2: e.target.value }))}
              placeholder="+998 91 234 56 78"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-primary" /> Адрес 1
          </label>
          <input
            value={settingsForm.address}
            onChange={e => setSettingsForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Ташкент, Чиланзарский район, ..."
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <MapPin size={14} className="text-primary" /> Адрес 2 (необязательно)
          </label>
          <input
            value={settingsForm.address2}
            onChange={e => setSettingsForm(f => ({ ...f, address2: e.target.value }))}
            placeholder="Второй адрес (необязательно)"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Telegram</label>
            <input
              value={settingsForm.telegram}
              onChange={e => setSettingsForm(f => ({ ...f, telegram: e.target.value }))}
              placeholder="@kattachegirma"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Instagram</label>
            <input
              value={settingsForm.instagram}
              onChange={e => setSettingsForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@kattachegirma"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5">Часы работы</label>
          <input
            value={settingsForm.workingHours}
            onChange={e => setSettingsForm(f => ({ ...f, workingHours: e.target.value }))}
            placeholder="Пн - Сб: 9:00 - 20:00"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => saveSettings.mutate(settingsForm as unknown as Record<string, string>)}
          disabled={saveSettings.isPending}
          className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saveSettings.isPending ? "Сохраняем..." : "Сохранить"}
        </button>
      </div>

      {/* Auto-hits settings */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-5 mt-5">
        <h3 className="font-bold text-base text-orange-900 mb-1 flex items-center gap-2">🔥 Авто-хиты</h3>
        <p className="text-xs text-orange-700 mb-4">Товары автоматически получают метку «Хит» когда набирают достаточно кликов, просмотров и продаж. Формула: <span className="font-mono font-bold">Балл = Просмотры×1 + Клики×3 + Продажи×10</span></p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-orange-800 mb-1">Порог баллов для хита</label>
            <input
              type="number"
              value={hitThreshold}
              onChange={e => setHitThreshold(Number(e.target.value) || 50)}
              className="w-32 border border-orange-300 rounded-lg px-3 py-2 text-sm font-bold text-orange-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              min={1}
              max={100000}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="hitAutoEnabled"
              checked={hitAutoEnabled}
              onChange={e => setHitAutoEnabled(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="hitAutoEnabled" className="text-sm font-semibold text-orange-800">Авто-продвижение включено</label>
          </div>
          <button
            onClick={() => saveHitSettingsMut.mutate({ threshold: hitThreshold, autoEnabled: hitAutoEnabled })}
            disabled={saveHitSettingsMut.isPending}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saveHitSettingsMut.isPending ? "Сохраняем..." : "Сохранить"}
          </button>
          <button
            onClick={() => { if (confirm("Пересчитать баллы всех товаров и обновить хиты?")) recalcHitsMut.mutate(); }}
            disabled={recalcHitsMut.isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {recalcHitsMut.isPending ? <><span className="animate-spin">⏳</span> Пересчёт...</> : <>🔄 Пересчитать хиты</>}
          </button>
        </div>
        <p className="text-xs text-orange-600">Можно вручную убрать товар из хитов через редактирование товара (сняв галочку «Хит»).</p>
      </div>
    </div>
  );
}
