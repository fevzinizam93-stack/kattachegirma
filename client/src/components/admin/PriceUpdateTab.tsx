import { useState, useRef, useEffect, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, TrendingDown, Check, RefreshCw } from "lucide-react";

interface MatchRow {
  model: string;
  brand: string;
  newPriceUsd: number;
  newPriceSum: number;
  matched: boolean;
  productId?: number;
  productName?: string;
  productSlug?: string;
  currentPriceSum?: number;
  currentPriceUsd?: number;
  cheaper: boolean;
}

export default function PriceUpdateTab() {
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [recogInfo, setRecogInfo] = useState<{ stage: string; done: number; total: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const recognizeMut = trpc.products.recognizePriceSheet.useMutation();
  const matchMut = trpc.products.priceUpdateMatch.useMutation();
  const applyMut = trpc.products.priceUpdateApply.useMutation();
  const rateQuery = trpc.currency.getRate.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const exchangeRate = rateQuery.data?.usdToUzs ?? 12700;

  function stopPoll() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }
  useEffect(() => () => stopPoll(), []);

  async function downscaleToJpegBase64(file: File, maxSide = 1500, quality = 0.85): Promise<string> {
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
    let width = img.width, height = img.height;
    if (Math.max(width, height) > maxSide) {
      const k = maxSide / Math.max(width, height);
      width = Math.round(width * k); height = Math.round(height * k);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl.split(",")[1] ?? "";
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
  }

  async function runMatch(items: { model: string; brand?: string; priceUsd: number }[]) {
    if (!items.length) { toast.error("В прайсе не найдено позиций"); setBusy(false); return; }
    try {
      const result = (await matchMut.mutateAsync({ items, rate: exchangeRate })) as MatchRow[];
      setRows(result);
      const sel: Record<number, boolean> = {};
      result.forEach((r, i) => { if (r.matched) sel[i] = true; });
      setSelected(sel);
      const matched = result.filter((r) => r.matched).length;
      toast.success(`Сопоставлено ${matched} из ${result.length}`);
    } catch (err) {
      toast.error("Ошибка сопоставления: " + (err instanceof Error ? err.message : String(err)));
    } finally { setBusy(false); }
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setFileName(file.name); setRows([]); setSelected({}); setBusy(true); setRecogInfo(null); stopPoll();
    try {
      const base64 = await downscaleToJpegBase64(file, 1500, 0.85);
      const { jobId } = await recognizeMut.mutateAsync({ base64, mimeType: "image/jpeg" });
      pollRef.current = setInterval(async () => {
        try {
          const job = (await utils.products.recognitionStatus.fetch({ jobId })) as {
            status: string; stage?: string; done?: number; total?: number; products?: any[]; error?: string;
          };
          if (job.status === "processing") {
            setRecogInfo({ stage: job.stage ?? "Обработка...", done: job.done ?? 0, total: job.total ?? 0 });
          } else if (job.status === "done") {
            stopPoll(); setRecogInfo(null);
            const items = (job.products ?? []).map((p: any) => ({ model: p.model, brand: p.brand, priceUsd: p.priceUsd }));
            await runMatch(items);
          } else if (job.status === "error") {
            stopPoll(); setRecogInfo(null); setBusy(false);
            toast.error("Ошибка распознавания: " + (job.error ?? ""));
          }
        } catch {
          stopPoll(); setRecogInfo(null); setBusy(false); toast.error("Ошибка опроса статуса");
        }
      }, 3000);
    } catch (err) {
      setBusy(false); toast.error("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function onExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    setFileName(file.name); setRows([]); setSelected({}); setBusy(true); setRecogInfo(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 }) as any[][];
      const items: { model: string; priceUsd: number }[] = [];
      for (const row of data) {
        if (!row || !row.length) continue;
        const model = String(row[0] ?? "").trim();
        if (!model) continue;
        let price = 0;
        for (let i = 1; i < row.length; i++) {
          const n = Number(String(row[i] ?? "").replace(/[^\d.]/g, ""));
          if (n > 0) { price = n; break; }
        }
        if (price > 0) items.push({ model, priceUsd: price });
      }
      await runMatch(items);
    } catch (err) {
      setBusy(false); toast.error("Ошибка чтения Excel: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  const fmt = (n?: number) => (n ?? 0).toLocaleString("ru-RU") + " сум";
  const selectedCount = rows.filter((r, i) => r.matched && selected[i]).length;

  async function applyUpdates() {
    const updates = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => r.matched && selected[i])
      .map(({ r }) => ({ productId: r.productId!, newPriceSum: r.newPriceSum, newPriceUsd: r.newPriceUsd, makeOldPrice: r.cheaper }));
    if (!updates.length) { toast.error("Отметьте товары для обновления"); return; }
    setApplying(true);
    try {
      const res = (await applyMut.mutateAsync({ updates })) as { updated: number; failed: number };
      toast.success(`Обновлено: ${res.updated}${res.failed ? `, ошибок: ${res.failed}` : ""}`);
      setRows([]); setSelected({});
    } catch (err) {
      toast.error("Ошибка обновления: " + (err instanceof Error ? err.message : String(err)));
    } finally { setApplying(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Обновление цен из прайса</h2>
        <p className="text-sm text-gray-500 mt-0.5">Загрузи прайс (фото или Excel) — система найдёт товары по модели и сравнит цены. Где новый прайс дешевле, старая цена и «Выгода» проставятся автоматически.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer hover:bg-primary/90 transition-colors">
          <Upload size={16} /> Загрузить фото
          <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={busy} />
        </label>
        <label className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-700 transition-colors">
          <FileSpreadsheet size={16} /> Загрузить Excel
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onExcel} disabled={busy} />
        </label>
        {fileName && <span className="self-center text-xs text-gray-500">{fileName}</span>}
      </div>
      <p className="text-xs text-gray-400">Excel: 1-я колонка — модель, 2-я (или ближайшая с числом) — цена в $.</p>

      {busy && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 size={16} className="animate-spin" />
          {recogInfo ? `${recogInfo.stage} ${recogInfo.done}/${recogInfo.total}` : "Обработка..."}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left">Модель</th>
                  <th className="p-2 text-left">Товар на сайте</th>
                  <th className="p-2 text-right">Текущая</th>
                  <th className="p-2 text-right">Новая</th>
                  <th className="p-2 text-left">Статус</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${!r.matched ? "opacity-50" : ""}`}>
                    <td className="p-2 text-center">
                      <input type="checkbox" disabled={!r.matched}
                        checked={!!selected[i]}
                        onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))} />
                    </td>
                    <td className="p-2 font-semibold text-gray-800">{r.model} {r.brand && <span className="text-gray-400 font-normal">{r.brand}</span>}</td>
                    <td className="p-2 text-gray-600">{r.matched ? r.productName : "—"}</td>
                    <td className="p-2 text-right text-gray-500 whitespace-nowrap">{r.matched ? fmt(r.currentPriceSum) : "—"}</td>
                    <td className="p-2 text-right font-bold text-gray-900 whitespace-nowrap">{fmt(r.newPriceSum)}</td>
                    <td className="p-2 whitespace-nowrap">
                      {!r.matched ? (
                        <span className="text-xs font-semibold text-red-500">Не найден</span>
                      ) : r.cheaper ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><TrendingDown size={11} /> Дешевле</span>
                      ) : r.newPriceSum === r.currentPriceSum ? (
                        <span className="text-xs text-gray-400">Без изменений</span>
                      ) : (
                        <span className="text-xs font-semibold text-orange-500">Дороже</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={applyUpdates} disabled={applying || selectedCount === 0}
            className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {applying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Обновить цены ({selectedCount})
          </button>
        </>
      )}
    </div>
  );
}

// Re-export RefreshCw so Admin.tsx can import it from here if needed
export { RefreshCw };
