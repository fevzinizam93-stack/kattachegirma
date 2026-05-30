import { useState, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Upload, Loader2, ImageOff, Save, Copy, Search, X, ImagePlus,
  CheckCircle2, XCircle, Clock, RefreshCw,
} from "lucide-react";

interface RecognizedProduct {
  model: string;
  brand: string;
  priceUsd: number;
  colorRu: string;
  specs: Record<string, string>;
  photoUrl?: string;
  thumbUrl?: string;
  photoError?: string;
  images?: string[];
  originalPriceUsd?: number;
}

type FileStatus = "waiting" | "processing" | "done" | "error";

interface FileEntry {
  file: File;
  name: string;
  status: FileStatus;
  found: number;
  error?: string;
  elapsed: number;
}

interface Props {
  categories: Array<{ id: number; name: string }>;
}

const FILE_TIMEOUT_MS = 120_000; // 120 seconds per file
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 2500;
const INTER_FILE_DELAY_MS = 1500;

export default function PriceImportTab({ categories }: Props) {
  const [rows, setRows] = useState<RecognizedProduct[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-file progress state
  const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
  const [currentFileIdx, setCurrentFileIdx] = useState<number>(-1);
  const [currentFileElapsed, setCurrentFileElapsed] = useState(0);
  const [currentStage, setCurrentStage] = useState("");
  const [importDone, setImportDone] = useState(false);
  const fileElapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();
  const recognizeMut = trpc.products.recognizePriceSheet.useMutation();
  const uploadMut = trpc.products.importUploadImage.useMutation();
  const rateQuery = trpc.currency.getRate.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const exchangeRate = rateQuery.data?.usdToUzs ?? 12700;
  const bulkMut = trpc.products.bulkCreateFromImport.useMutation();
  const sellerCreateMut = trpc.sellers.quickCreate.useMutation();
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number; stage?: string } | null>(null);
  const [seller, setSeller] = useState({ name: "", phone: "", telegram: "" });
  const [sellerId, setSellerId] = useState<number | "">("");
  const [stock, setStock] = useState(10);
  const sellersQuery = trpc.sellers.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const createPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }
  function stopCreatePoll() {
    if (createPollRef.current) { clearInterval(createPollRef.current); createPollRef.current = null; }
  }
  function stopFileElapsed() {
    if (fileElapsedRef.current) { clearInterval(fileElapsedRef.current); fileElapsedRef.current = null; }
  }
  useEffect(() => () => { stopPoll(); stopCreatePoll(); stopFileElapsed(); }, []);

  useEffect(() => {
    try {
      localStorage.setItem("kc_price_import_v1", JSON.stringify({ activeJobId, rows, categoryId, seller, sellerId, fileName }));
    } catch {}
  }, [activeJobId, rows, categoryId, seller, sellerId, fileName]);

  useEffect(() => {
    let saved: any = null;
    try { saved = JSON.parse(localStorage.getItem("kc_price_import_v1") || "null"); } catch {}
    if (!saved) return;
    if (saved.categoryId) setCategoryId(saved.categoryId);
    if (saved.seller) setSeller(saved.seller);
    if (saved.sellerId) setSellerId(saved.sellerId);
    if (saved.fileName) setFileName(saved.fileName);
    if (Array.isArray(saved.rows) && saved.rows.length > 0) {
      setRows(saved.rows);
    }
  }, []);

  function clearImport() {
    stopPoll();
    stopFileElapsed();
    setRows([]);
    setActiveJobId(null);
    setFileName("");
    setFileEntries([]);
    setCurrentFileIdx(-1);
    setCurrentFileElapsed(0);
    setCurrentStage("");
    setImportDone(false);
    setBusy(false);
    try { localStorage.removeItem("kc_price_import_v1"); } catch {}
  }

  async function handleCreateAll() {
    if (!categoryId) { toast.error("Сначала выберите категорию"); return; }
    setCreating(true);
    setProgress({ done: 0, total: rows.length, failed: 0 });
    try {
      const payload = rows.map((r) => ({
        model: r.model,
        brand: r.brand || undefined,
        priceUsd: Number(r.priceUsd) || 0,
        originalPriceUsd: r.originalPriceUsd != null && r.originalPriceUsd > 0 ? Number(r.originalPriceUsd) : undefined,
        colorRu: r.colorRu || undefined,
        specs: r.specs ?? {},
        photoUrl: r.photoUrl || (r.images && r.images[0]) || undefined,
        thumbUrl: r.thumbUrl || undefined,
        images: r.images && r.images.length ? r.images : undefined,
      }));
      const { jobId } = await bulkMut.mutateAsync({
        categoryId: Number(categoryId),
        exchangeRate,
        sellerName: seller.name || undefined,
        sellerPhone: seller.phone || undefined,
        sellerTelegram: seller.telegram || undefined,
        sellerId: sellerId || undefined,
        stock,
        products: payload,
      });
      let pollErrors = 0;
      createPollRef.current = setInterval(async () => {
        try {
          const job = (await utils.products.bulkCreateStatus.fetch({ jobId })) as {
            status: string; stage?: string; total: number; done: number; failed: number; errors?: string[];
          };
          pollErrors = 0;
          setProgress({ done: job.done, total: job.total, failed: job.failed, stage: job.stage });
          if (job.status === "finished") {
            stopCreatePoll();
            setCreating(false);
            toast.success(`Создано: ${job.done} из ${job.total}` + (job.failed ? `, ошибок: ${job.failed}` : ""));
            (job.errors ?? []).slice(0, 3).forEach((e) => toast.error(e));
            setRows([]);
            setProgress(null);
            setActiveJobId(null);
            setFileName("");
            setFileEntries([]);
            setImportDone(false);
            try { localStorage.removeItem("kc_price_import_v1"); } catch {}
          }
        } catch {
          pollErrors++;
          if (pollErrors >= 8) {
            stopCreatePoll(); setCreating(false);
            toast.error("Не удалось получить статус. Возможно, товары уже созданы — обновите список товаров.");
          }
        }
      }, 2500);
    } catch (err) {
      setCreating(false);
      toast.error("Ошибка создания: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function downscaleToJpegBase64(file: File, maxSide = 1600, quality = 0.9): Promise<string> {
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

  // Recognizes one file with retry logic and per-file timeout
  async function recognizeOneFileWithRetry(
    file: File,
    fileIdx: number,
    onStage: (stage: string) => void,
  ): Promise<{ products: RecognizedProduct[]; error?: string }> {
    let lastError = "";
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
      if (attempt > 0) {
        onStage(`Повтор ${attempt}/${RETRY_COUNT}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
      try {
        const base64 = await downscaleToJpegBase64(file, 1500, 0.85);
        const { jobId } = await recognizeMut.mutateAsync({ base64, mimeType: "image/jpeg" });
        setActiveJobId(jobId);

        // Poll with timeout
        const products = await new Promise<RecognizedProduct[]>((resolve, reject) => {
          const startedAt = Date.now();
          const poll = setInterval(async () => {
            try {
              const elapsed = Date.now() - startedAt;
              if (elapsed > FILE_TIMEOUT_MS) {
                clearInterval(poll);
                reject(new Error("Превышено время ожидания (120 сек)"));
                return;
              }
              const job = (await utils.products.recognitionStatus.fetch({ jobId })) as {
                status: string; stage?: string; done?: number; total?: number; products?: RecognizedProduct[]; error?: string;
              };
              if (job.status === "processing") {
                onStage(job.stage ?? "Обработка...");
              } else if (job.status === "done") {
                clearInterval(poll);
                resolve(job.products ?? []);
              } else if (job.status === "error") {
                clearInterval(poll);
                reject(new Error(job.error ?? "Ошибка распознавания"));
              }
            } catch (err) {
              clearInterval(poll);
              reject(err);
            }
          }, 3000);
          pollRef.current = poll;
        });

        return { products };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        // continue to next attempt
      }
    }
    return { products: [], error: lastError };
  }

  // Main processing loop for a list of file entries (by index)
  const processFiles = useCallback(async (entries: FileEntry[], indices: number[]) => {
    setBusy(true);
    setImportDone(false);
    stopFileElapsed();

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const entry = entries[idx];

      setCurrentFileIdx(idx);
      setCurrentFileElapsed(0);
      setCurrentStage("Подготовка...");

      // Start per-file elapsed timer
      stopFileElapsed();
      fileElapsedRef.current = setInterval(() => {
        setCurrentFileElapsed((s) => s + 1);
      }, 1000);

      // Mark as processing
      setFileEntries((prev) => prev.map((e, j) => j === idx ? { ...e, status: "processing" } : e));

      const { products, error } = await recognizeOneFileWithRetry(
        entry.file,
        idx,
        (stage) => setCurrentStage(stage),
      );

      stopFileElapsed();

      if (error) {
        setFileEntries((prev) => prev.map((e, j) => j === idx ? { ...e, status: "error", error } : e));
      } else {
        setFileEntries((prev) => prev.map((e, j) => j === idx ? { ...e, status: "done", found: products.length } : e));
        if (products.length > 0) {
          setRows((prev) => [...prev, ...products]);
        }
      }

      // Inter-file delay (except last)
      if (i < indices.length - 1) {
        await new Promise((r) => setTimeout(r, INTER_FILE_DELAY_MS));
      }
    }

    setCurrentFileIdx(-1);
    setCurrentStage("");
    setCurrentFileElapsed(0);
    setBusy(false);
    setImportDone(true);
  }, [recognizeMut, utils]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setFileName(files.length > 1 ? `${files.length} прайс-листов` : files[0].name);
    setRows([]);
    setImportDone(false);
    stopPoll();

    const entries: FileEntry[] = files.map((f) => ({
      file: f,
      name: f.name,
      status: "waiting",
      found: 0,
      elapsed: 0,
    }));
    setFileEntries(entries);

    await processFiles(entries, entries.map((_, i) => i));

    e.target.value = "";
  }

  async function retryFailed() {
    const failedIndices = fileEntries.map((e, i) => e.status === "error" ? i : -1).filter((i) => i >= 0);
    if (!failedIndices.length) return;

    // Reset failed entries to waiting
    setFileEntries((prev) => prev.map((e, i) => failedIndices.includes(i) ? { ...e, status: "waiting", error: undefined, found: 0 } : e));

    await processFiles(fileEntries, failedIndices);
  }

  function updateRow(i: number, patch: Partial<RecognizedProduct>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleAddPhotos(i: number, e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setRowBusy(i);
    try {
      const uploaded: { url: string; thumbUrl?: string }[] = [];
      for (const file of files) {
        const base64 = await downscaleToJpegBase64(file, 1600, 0.92);
        const res = await uploadMut.mutateAsync({ base64, filename: file.name });
        uploaded.push({ url: res.url, thumbUrl: res.thumbUrl });
      }
      setRows((prev) => prev.map((r, idx) => {
        if (idx !== i) return r;
        const merged = [...(r.images ?? []), ...uploaded.map((u) => u.url)];
        return {
          ...r,
          images: merged,
          photoUrl: merged[0],
          thumbUrl: r.images && r.images.length ? r.thumbUrl : uploaded[0]?.thumbUrl,
          photoError: undefined,
        };
      }));
      toast.success(files.length > 1 ? `Добавлено фото: ${files.length}` : "Фото добавлено");
    } catch (err) {
      toast.error("Ошибка загрузки: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRowBusy(null);
      e.target.value = "";
    }
  }

  function removePhoto(i: number, url: string) {
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const imgs = (r.images ?? []).filter((u) => u !== url);
      return { ...r, images: imgs, photoUrl: imgs[0], thumbUrl: imgs.length ? r.thumbUrl : undefined };
    }));
  }

  function copyModel(name: string) {
    navigator.clipboard?.writeText(name)
      .then(() => toast.success("Название скопировано"))
      .catch(() => toast.error("Не удалось скопировать"));
  }

  async function handleSaveSeller() {
    if (!seller.name.trim()) { toast.error("Введите имя продавца"); return; }
    try {
      const { id } = await sellerCreateMut.mutateAsync({
        name: seller.name.trim(),
        phone: seller.phone.trim() || undefined,
        telegram: seller.telegram.trim() || undefined,
      });
      await sellersQuery.refetch();
      setSellerId(id);
      toast.success("Продавец сохранён в базу");
    } catch (err) {
      toast.error("Ошибка: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  const anyBusy = busy || rowBusy !== null || creating;

  // Derived stats
  const totalFiles = fileEntries.length;
  const doneFiles = fileEntries.filter((e) => e.status === "done").length;
  const errorFiles = fileEntries.filter((e) => e.status === "error").length;
  const totalFound = fileEntries.reduce((s, e) => s + e.found, 0);
  const hasFailedFiles = errorFiles > 0 && !busy;

  return (
    <div className="space-y-4">
      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-lg font-black text-gray-900 mb-1">Импорт из прайса</h2>
        <p className="text-sm text-gray-500 mb-4">
          Загрузите фото прайс-листа — система распознает модели, цены и характеристики. Фото к товарам добавьте вручную.
        </p>
        <label className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
          <Upload size={16} />
          Загрузить фото-прайс (можно несколько)
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} disabled={busy} />
        </label>
        {fileName && <p className="text-xs text-gray-400 mt-2">{fileName}</p>}

        {/* Per-file progress panel */}
        {(busy || (importDone && totalFiles > 0)) && fileEntries.length > 0 && (
          <div className="mt-4 space-y-3">
            {/* Big progress bar */}
            {busy && totalFiles > 1 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>Файл {Math.min(currentFileIdx + 1, totalFiles)} из {totalFiles}</span>
                  <span className="text-gray-400 text-xs">{doneFiles + errorFiles}/{totalFiles} обработано</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(((doneFiles + errorFiles) / totalFiles) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Current stage + elapsed */}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 size={15} className="animate-spin shrink-0" />
                <span className="truncate">{currentStage || "Обработка..."}</span>
                <span className="text-gray-400 shrink-0">· {currentFileElapsed} сек</span>
              </div>
            )}

            {/* File list */}
            <div className="space-y-1.5">
              {fileEntries.map((entry, i) => (
                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm ${
                  i === currentFileIdx ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
                }`}>
                  {entry.status === "waiting" && <Clock size={15} className="text-gray-300 shrink-0" />}
                  {entry.status === "processing" && <Loader2 size={15} className="text-blue-500 animate-spin shrink-0" />}
                  {entry.status === "done" && <CheckCircle2 size={15} className="text-green-500 shrink-0" />}
                  {entry.status === "error" && <XCircle size={15} className="text-red-400 shrink-0" />}
                  <span className="flex-1 truncate text-gray-700">{entry.name}</span>
                  {entry.status === "done" && (
                    <span className="text-xs text-green-600 font-medium shrink-0">{entry.found} товаров</span>
                  )}
                  {entry.status === "error" && (
                    <span className="text-xs text-red-400 shrink-0 truncate max-w-[140px]" title={entry.error}>{entry.error}</span>
                  )}
                  {entry.status === "waiting" && (
                    <span className="text-xs text-gray-300 shrink-0">ожидание</span>
                  )}
                </div>
              ))}
            </div>

            {/* Summary after done */}
            {importDone && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-gray-800">
                  Готово: {doneFiles} из {totalFiles} файлов, товаров: {totalFound}
                  {errorFiles > 0 && <span className="text-red-500 ml-2">· не удалось: {errorFiles}</span>}
                </span>
                {hasFailedFiles && (
                  <button
                    onClick={retryFailed}
                    className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <RefreshCw size={13} />
                    Повторить неудавшиеся ({errorFiles})
                  </button>
                )}
              </div>
            )}

            {busy && <p className="text-xs text-gray-400">Не закрывайте вкладку.</p>}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-bold text-gray-900">Найдено товаров: {rows.length}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={clearImport}
                className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Очистить
              </button>
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
              <span className="text-xs uppercase tracking-wide text-gray-400">Остаток</span>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value) || 0)}
                className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Выбрать продавца из базы (или заполнить вручную ниже)</label>
            <select
              value={sellerId}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : "";
                setSellerId(id);
                const s = (sellersQuery.data ?? []).find((x: any) => x.id === id);
                if (s) setSeller({ name: s.name ?? "", phone: s.phone ?? "", telegram: s.telegram ?? "" });
              }}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white"
            >
              <option value="">— Не выбран —</option>
              {(sellersQuery.data ?? []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Имя продавца</label>
              <input value={seller.name} onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))} placeholder="Напр. Katta Chegirma" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Телефон</label>
              <input value={seller.phone} onChange={(e) => setSeller((s) => ({ ...s, phone: e.target.value }))} placeholder="+998 90 123 45 67" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Telegram</label>
              <input value={seller.telegram} onChange={(e) => setSeller((s) => ({ ...s, telegram: e.target.value }))} placeholder="@username" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
            </div>
            <div className="sm:col-span-3">
              <button
                onClick={handleSaveSeller}
                disabled={sellerCreateMut.isPending || !seller.name.trim()}
                className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                Сохранить продавца в базу
              </button>
              <span className="text-[11px] text-gray-400 ml-2">потом выберешь его из списка</span>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r, i) => {
              const gallery = r.images ?? [];
              const mainThumb = r.thumbUrl || r.photoUrl || gallery[0];
              const fullName = `${r.brand ? r.brand + " " : ""}${r.model}`;
              return (
              <div key={i} className="flex gap-3 items-start border border-gray-100 rounded-2xl p-3">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center border border-gray-100 relative">
                  {mainThumb ? (
                    <img src={mainThumb} alt={r.model} className="w-full h-full object-contain" />
                  ) : (
                    <ImageOff size={20} className="text-gray-300" />
                  )}
                  {gallery.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{gallery.length} фото</span>
                  )}
                  {rowBusy === i && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 size={18} className="animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Модель</label>
                    <div className="flex gap-1.5">
                      <input value={r.model} onChange={(e) => updateRow(i, { model: e.target.value })} className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                      <button type="button" onClick={() => copyModel(fullName)} title="Копировать название" className="shrink-0 inline-flex items-center justify-center w-9 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                        <Copy size={14} />
                      </button>
                      <a href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(fullName)}`} target="_blank" rel="noopener noreferrer" title="Найти фото в Google" className="shrink-0 inline-flex items-center justify-center w-9 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
                        <Search size={14} />
                      </a>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Цена, $</label>
                      <input type="number" value={r.priceUsd} onChange={(e) => updateRow(i, { priceUsd: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Старая цена, $</label>
                      <input type="number" value={r.originalPriceUsd ?? ""} placeholder="—" onChange={(e) => updateRow(i, { originalPriceUsd: e.target.value === "" ? undefined : Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                    </div>
                  </div>
                  {r.originalPriceUsd != null && r.originalPriceUsd > r.priceUsd && (
                    <div className="text-[11px] text-green-600 font-medium">Скидка {Math.round((1 - r.priceUsd / r.originalPriceUsd) * 100)}%</div>
                  )}
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {Object.entries(r.specs).map(([k, v]) => `${k}: ${v}`).join(" · ") || "Характеристики не распознаны"}
                  </div>
                  {gallery.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {gallery.map((url) => (
                        <div key={url} className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100 group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removePhoto(i, url)} title="Удалить фото" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <label className={`inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${anyBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
                      <ImagePlus size={13} />
                      Добавить фото (можно несколько)
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddPhotos(i, e)} disabled={anyBusy} />
                    </label>
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleCreateAll}
              disabled={anyBusy || !categoryId}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : null}
              {creating && progress
                ? (progress.stage && progress.done === 0 ? progress.stage : `Создаю ${progress.done}/${progress.total}...`)
                : "Создать все товары"}
            </button>
            {!categoryId && <p className="text-xs text-amber-600 mt-2">Выберите категорию выше, чтобы создать товары.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
