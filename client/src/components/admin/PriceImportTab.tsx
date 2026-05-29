import { useState, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Loader2, ImageOff } from "lucide-react";

interface RecognizedProduct {
  model: string;
  brand: string;
  priceUsd: number;
  colorRu: string;
  specs: Record<string, string>;
  photoUrl?: string;
  thumbUrl?: string;
  photoError?: string;
}

interface Props {
  categories: Array<{ id: number; name: string }>;
}

export default function PriceImportTab({ categories }: Props) {
  const [rows, setRows] = useState<RecognizedProduct[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [fileName, setFileName] = useState("");

  const recognizeMut = trpc.products.recognizePriceSheet.useMutation({
    onSuccess: (data) => {
      setRows(data.products as RecognizedProduct[]);
      toast.success(`Распознано товаров: ${data.count}`);
    },
    onError: (e) => toast.error("Ошибка распознавания: " + e.message),
  });

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      recognizeMut.mutate({ base64, mimeType: file.type || "image/png" });
    };
    reader.readAsDataURL(file);
  }

  function updateRow(i: number, patch: Partial<RecognizedProduct>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-black text-gray-900 mb-1">Импорт из прайса</h2>
        <p className="text-sm text-gray-500 mb-4">
          Загрузите фото прайс-листа — система распознает модели, цены и характеристики и вырежет фото каждого товара. Перед сохранением всё можно проверить и поправить.
        </p>
        <label className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer transition-colors">
          <Upload size={16} />
          Загрузить фото-прайс
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={recognizeMut.isPending} />
        </label>
        {fileName && <p className="text-xs text-gray-400 mt-2">{fileName}</p>}
        {recognizeMut.isPending && (
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            Распознаю прайс — это может занять 20–60 секунд...
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-bold text-gray-900">Найдено товаров: {rows.length}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">Категория</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Выберите...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-3 items-start border border-gray-100 rounded-2xl p-3">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100">
                  {r.thumbUrl || r.photoUrl ? (
                    <img src={r.thumbUrl || r.photoUrl} alt={r.model} className="w-full h-full object-contain" />
                  ) : (
                    <ImageOff size={20} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Модель</label>
                      <input
                        value={r.model}
                        onChange={(e) => updateRow(i, { model: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Цена, $</label>
                      <input
                        type="number"
                        value={r.priceUsd}
                        onChange={(e) => updateRow(i, { priceUsd: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {Object.entries(r.specs).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Характеристики не распознаны"}
                  </div>
                  {r.photoError && <p className="text-xs text-amber-600">Фото: {r.photoError}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => toast.info("Массовое создание появится на следующем этапе (Этап 3)")}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Создать все товары
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
