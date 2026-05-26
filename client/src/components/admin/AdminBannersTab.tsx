import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Edit, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface BannerForm {
  title: string;
  titleUz: string;
  description: string;
  descriptionUz: string;
  bgColor: string;
  textColor: string;
  link: string;
  linkText: string;
  linkTextUz: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyBannerForm: BannerForm = {
  title: "", titleUz: "", description: "", descriptionUz: "",
  bgColor: "#dc2626", textColor: "#ffffff",
  link: "", linkText: "", linkTextUz: "",
  endsAt: "", isActive: true, sortOrder: 0,
};

export default function AdminBannersTab() {
  const utils = trpc.useUtils();
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBannerForm);
  const [bannerEditId, setBannerEditId] = useState<number | null>(null);

  const { data: bannersData, isLoading: bannersLoading } = trpc.banners.listAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const allBanners = bannersData ?? [];

  const createBannerMut = trpc.banners.create.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); setShowBannerForm(false); setBannerForm(emptyBannerForm); setBannerEditId(null); toast.success("Баннер создан"); },
    onError: (e) => toast.error(e.message),
  });
  const updateBannerMut = trpc.banners.update.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); setShowBannerForm(false); setBannerForm(emptyBannerForm); setBannerEditId(null); toast.success("Баннер обновлён"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteBannerMut = trpc.banners.delete.useMutation({
    onSuccess: () => { utils.banners.listAll.invalidate(); toast.success("Баннер удалён"); },
    onError: (e) => toast.error(e.message),
  });

  function handleBannerSubmit() {
    const endsAt = bannerForm.endsAt ? new Date(bannerForm.endsAt) : undefined;
    if (bannerEditId) {
      updateBannerMut.mutate({ id: bannerEditId, ...bannerForm, endsAt });
    } else {
      createBannerMut.mutate({ ...bannerForm, endsAt });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg text-gray-900">Акционные баннеры ({allBanners.length})</h2>
        <button
          onClick={() => { setShowBannerForm(true); setBannerForm(emptyBannerForm); setBannerEditId(null); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Добавить баннер
        </button>
      </div>

      {/* Banner Form Modal */}
      {showBannerForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-lg">{bannerEditId ? "Редактировать баннер" : "Новый баннер"}</h3>
              <button onClick={() => setShowBannerForm(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Заголовок (RU) *</label>
                <input value={bannerForm.title} onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Большие скидки до 50%!" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Заголовок (узбекский, необязательно)</label>
                <input value={bannerForm.titleUz} onChange={e => setBannerForm(f => ({ ...f, titleUz: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Заголовок на узбекском (необязательно)" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Описание (RU)</label>
                <textarea value={bannerForm.description} onChange={e => setBannerForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Только до конца недели" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Описание (узбекский, необязательно)</label>
                <textarea value={bannerForm.descriptionUz} onChange={e => setBannerForm(f => ({ ...f, descriptionUz: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Только до конца недели" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Цвет фона</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                    <input value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Цвет текста</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                    <input value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ссылка (URL)</label>
                <input value={bannerForm.link} onChange={e => setBannerForm(f => ({ ...f, link: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="/catalog или /bestsellers" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Текст кнопки (RU)</label>
                  <input value={bannerForm.linkText} onChange={e => setBannerForm(f => ({ ...f, linkText: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Смотреть все" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Текст кнопки (узбекский)</label>
                  <input value={bannerForm.linkTextUz} onChange={e => setBannerForm(f => ({ ...f, linkTextUz: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Текст кнопки на узбекском" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Дата окончания акции</label>
                <input type="datetime-local" value={bannerForm.endsAt} onChange={e => setBannerForm(f => ({ ...f, endsAt: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <p className="text-xs text-gray-400 mt-1">Оставьте пустым если акция бессрочная</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Порядок сортировки</label>
                  <input type="number" value={bannerForm.sortOrder} onChange={e => setBannerForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={bannerForm.isActive} onChange={e => setBannerForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-semibold text-gray-700">Активен</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Предпросмотр</label>
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: bannerForm.bgColor, color: bannerForm.textColor }}>
                  <div className="font-bold text-sm">{bannerForm.title || "Заголовок баннера"}</div>
                  {bannerForm.description && <div className="text-xs mt-0.5 opacity-90">{bannerForm.description}</div>}
                  {bannerForm.linkText && <div className="mt-2 inline-block text-xs border border-current rounded-full px-3 py-1 font-semibold">{bannerForm.linkText} →</div>}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBannerForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 font-semibold text-sm text-gray-700 hover:bg-gray-50">Отмена</button>
              <button
                onClick={handleBannerSubmit}
                disabled={createBannerMut.isPending || updateBannerMut.isPending || !bannerForm.title}
                className="flex-1 bg-primary text-white rounded-xl py-2.5 font-bold text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {(createBannerMut.isPending || updateBannerMut.isPending) ? "Сохранение..." : bannerEditId ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bannersLoading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : allBanners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <ImagePlus size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">Баннеров пока нет</p>
          <p className="text-xs text-gray-400 mt-1">Создайте первый акционный баннер</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allBanners.map(banner => {
            const isExpired = banner.endsAt && new Date(banner.endsAt) < new Date();
            return (
              <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: banner.bgColor }}>
                  <span className="text-lg">🎯</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 truncate">{banner.title}</span>
                    {!banner.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Выкл</span>}
                    {isExpired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Истёк</span>}
                    {banner.isActive && !isExpired && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Активен</span>}
                  </div>
                  {banner.description && <p className="text-xs text-gray-500 truncate mt-0.5">{banner.description}</p>}
                  {banner.endsAt && <p className="text-xs text-gray-400 mt-0.5">До: {new Date(banner.endsAt).toLocaleString("ru-RU")}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setBannerEditId(banner.id);
                      setBannerForm({
                        title: banner.title,
                        titleUz: banner.titleUz ?? "",
                        description: banner.description ?? "",
                        descriptionUz: banner.descriptionUz ?? "",
                        bgColor: banner.bgColor,
                        textColor: banner.textColor,
                        link: banner.link ?? "",
                        linkText: banner.linkText ?? "",
                        linkTextUz: banner.linkTextUz ?? "",
                        endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : "",
                        isActive: banner.isActive,
                        sortOrder: banner.sortOrder,
                      });
                      setShowBannerForm(true);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => { if (confirm("Удалить баннер?")) deleteBannerMut.mutate({ id: banner.id }); }}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
