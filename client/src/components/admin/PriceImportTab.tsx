import { useState, useRef, useEffect, type ChangeEvent } from "react";
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
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const recognizeMut = trpc.products.recognizePriceSheet.useMutation();

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }
  useEffect(() => () => stopPoll(), []);

  // Уменьшаем картинку до JPEG, чтобы не упереться в лимит запроса и ускорить распознавание
  async function downscaleToJpegBase64(file: File, maxSide = 1600, quality = 0.85): Promise<string> {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("read failed"));
      r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("image load failed"));
      im.src = dataUrl;
    });
    let width = img.width;
    let height = img.height;
    if (Math.max(width, height) > maxSide) {
      const k = maxSide / Math.max(width, height);
      width = Math.round(width * k);
      height = Math.round(height * k);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl.split(",")[1] ?? "";
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", quality);
    return out.split(",")[1] ?? "";
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRows([]);
    setBusy(true);
    stopPoll();
    try {
      const base64 = await downscaleToJpegBase64(file);
      const { jobId } = await recognizeMut.mutateAsync({ base64, mimeType: "image/jpeg" });
      pollRef.current = setInterval(async () => {
        try {
          const job = (await utils.products.recognitionStatus.fetch({ jobId })) as {
            status: string; products?: RecognizedProduct[]; error?: string;
          };
          if (job.status === "done") {
            stopPoll(); setRows(job.products ?? []); setBusy(false);
            toast.success(`Распознано товаров: ${job.products?.length ?? 0}`);
          } else if (job.status === "error") {
            stopPoll(); setBusy(false);
            toast.error("Ошибка распознавания: " + (job.error ?? ""));
          }
        } catch {
          stopPoll(); setBusy(false);
          toast.error("Ошибка опроса статуса");
        }
      }, 3000);
    } catch (err) {
      setBusy(false);
      toast.error("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      e.target.value = "";
    }
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
        <label className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
          <Upload size={16} />
          Загрузить фото-прайс
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={busy} />
        </label>
        {fileName && <p className="text-xs text-gray-400 mt-2">{fileName}</p>}
        {busy && (
          <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
            <Loader2 size={16} className="animate-spin" />
            Распознаю прайс — это может занять до 1–2 минут...
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
                      <input value={r.model} onChange={(e) => updateRow(i, { model: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Цена, $</label>
                      <input type="number" value={r.priceUsd} onChange={(e) => updateRow(i, { priceUsd: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
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
