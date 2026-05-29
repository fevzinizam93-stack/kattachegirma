import sharp from "sharp";
import { invokeLLM } from "./_core/llm";
import { optimizeImage } from "./_core/imageOptimizer";
import { storagePut } from "./storage";
import { createProduct, updateProduct, getSlugExists, getSlugUzExists, getAllCategories } from "./db";
import { pingSitemaps } from "./sitemap";

export interface RecognizedProduct {
  model: string;
  brand: string;
  priceUsd: number;
  colorRu: string;
  specs: Record<string, string>;
  photoUrl?: string;
  thumbUrl?: string;
  photoError?: string;
}

interface RawProduct {
  model?: string;
  brand?: string;
  priceUsd?: number;
  colorRu?: string;
  specs?: Array<{ key: string; value: string }>;
  photoBox?: { x: number; y: number; w: number; h: number };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export async function recognizePriceSheet(
  sheetBase64: string,
  mimeType: string,
  onProgress?: (p: { stage: string; done: number; total: number }) => void,
): Promise<RecognizedProduct[]> {
  const sheetBuffer = Buffer.from(sheetBase64, "base64");
  const ts = Date.now();

  // Передаём картинку модели НАПРЯМУЮ как data URL (шлюз не скачивает внешние ссылки)
  const dataUrl = `data:${mimeType};base64,${sheetBase64}`;
  onProgress?.({ stage: "Распознаю текст и характеристики", done: 0, total: 0 });

  const systemPrompt =
    "Ты — ассистент по распознаванию прайс-листов бытовой техники. " +
    "На изображении сетка товаров: код модели, цена в долларах (число в тёмном бейдже), " +
    "характеристики (часто на узбекском) и фото. Извлеки КАЖДЫЙ товар. " +
    "Читай только то, что напечатано — ничего не выдумывай. " +
    "Характеристики верни списком пар key/value на русском (key — название характеристики, value — значение). " +
    "Для каждого товара укажи photoBox — прямоугольник ФОТО товара в долях от 0 до 1 " +
    "(x,y — левый верхний угол, w,h — ширина и высота относительно всего изображения). " +
    "Если не уверен в границах — возьми область чуть шире, чтобы фото попало целиком.";

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Распознай все товары с этого прайс-листа." },
          { type: "image_url", image_url: { url: dataUrl, detail: "auto" } },
        ],
      },
    ],
    maxTokens: 8000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "price_sheet",
        strict: false,
        schema: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  model: { type: "string" },
                  brand: { type: "string" },
                  priceUsd: { type: "number" },
                  colorRu: { type: "string" },
                  specs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { key: { type: "string" }, value: { type: "string" } },
                      required: ["key", "value"],
                    },
                  },
                  photoBox: {
                    type: "object",
                    properties: {
                      x: { type: "number" }, y: { type: "number" },
                      w: { type: "number" }, h: { type: "number" },
                    },
                    required: ["x", "y", "w", "h"],
                  },
                },
                required: ["model", "priceUsd"],
              },
            },
          },
          required: ["products"],
        },
      },
    },
  });

  const content = response.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(
    typeof content === "string" ? content : JSON.stringify(content),
  ) as { products?: RawProduct[] };
  const raw = parsed.products ?? [];
  if (raw.length === 0) {
    throw new Error(
      "Модель не вернула товары. Сырой ответ: " +
        (typeof content === "string" ? content : JSON.stringify(content)).slice(0, 300),
    );
  }

  const meta = await sharp(sheetBuffer).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;

  const results: RecognizedProduct[] = [];
  let completed = 0;
  onProgress?.({ stage: "Обрабатываю фото", done: 0, total: raw.length });

  for (const p of raw) {
    const out: RecognizedProduct = {
      model: (p.model ?? "").trim(),
      brand: (p.brand ?? "").trim(),
      priceUsd: typeof p.priceUsd === "number" ? p.priceUsd : 0,
      colorRu: (p.colorRu ?? "").trim(),
      specs: Array.isArray(p.specs)
        ? Object.fromEntries(p.specs.filter((s) => s && s.key).map((s) => [s.key, s.value ?? ""]))
        : {},
    };

    try {
      if (p.photoBox && W > 0 && H > 0) {
        const left = Math.round(clamp01(p.photoBox.x) * W);
        const top = Math.round(clamp01(p.photoBox.y) * H);
        let width = Math.round(clamp01(p.photoBox.w) * W);
        let height = Math.round(clamp01(p.photoBox.h) * H);
        width = Math.min(width, W - left);
        height = Math.min(height, H - top);

        if (width > 20 && height > 20) {
          // Вырезаем + улучшаем качество: апскейл до 800px, резкость, нормализация
          const cropped = await sharp(sheetBuffer)
            .extract({ left, top, width, height })
            .resize({ width: Math.max(800, width), withoutEnlargement: false })
            .sharpen()
            .normalize()
            .webp({ quality: 90 })
            .toBuffer();

          const safeModel = (out.model || `product-${ts}`).replace(/[^a-zA-Z0-9-]/g, "_");
          const optimized = await optimizeImage(cropped, `${safeModel}.webp`);
          const baseKey = `products/import/${ts}-${safeModel}`;
          const [{ url }, { url: thumbUrl }] = await Promise.all([
            storagePut(`${baseKey}.webp`, optimized.fullBuffer, optimized.fullMimeType),
            storagePut(`${baseKey}-thumb.webp`, optimized.thumbBuffer, optimized.thumbMimeType),
          ]);
          out.photoUrl = url;
          out.thumbUrl = thumbUrl;
        } else {
          out.photoError = "Слишком маленькая область фото";
        }
      } else {
        out.photoError = "Нет координат фото";
      }
    } catch (err) {
      out.photoError = err instanceof Error ? err.message : String(err);
    }

    completed++;
    onProgress?.({ stage: "Обрабатываю фото", done: completed, total: raw.length });
    results.push(out);
  }

  return results;
}

// ---- Фоновые задания распознавания (in-memory) ----
type RecognitionJob =
  | { status: "processing"; stage: string; done: number; total: number }
  | { status: "done"; products: RecognizedProduct[] }
  | { status: "error"; error: string };

const recognitionJobs = new Map<string, RecognitionJob>();

export function startRecognitionJob(sheetBase64: string, mimeType: string): string {
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  recognitionJobs.set(jobId, { status: "processing", stage: "Запуск...", done: 0, total: 0 });
  void (async () => {
    try {
      const products = await recognizePriceSheet(sheetBase64, mimeType, (p) => {
        recognitionJobs.set(jobId, { status: "processing", stage: p.stage, done: p.done, total: p.total });
      });
      recognitionJobs.set(jobId, { status: "done", products });
    } catch (err) {
      recognitionJobs.set(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
    setTimeout(() => recognitionJobs.delete(jobId), 60 * 60 * 1000);
  })();
  return jobId;
}

export function getRecognitionJob(jobId: string): RecognitionJob | undefined {
  return recognitionJobs.get(jobId);
}

// ---- Улучшение качества (без ИИ) + сохранение ----
export async function enhanceAndStore(
  buffer: Buffer,
  baseName: string,
): Promise<{ url: string; thumbUrl: string }> {
  const enhanced = await sharp(buffer)
    .resize({ width: 1600, fit: "inside", withoutEnlargement: false, kernel: "lanczos3" })
    .sharpen()
    .normalize()
    .toBuffer();
  const safe = (baseName || `img-${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, "_");
  const optimized = await optimizeImage(enhanced, `${safe}.webp`);
  const ts = Date.now();
  const baseKey = `products/import/${ts}-${safe}`;
  const [{ url }, { url: thumbUrl }] = await Promise.all([
    storagePut(`${baseKey}.webp`, optimized.fullBuffer, optimized.fullMimeType),
    storagePut(`${baseKey}-thumb.webp`, optimized.thumbBuffer, optimized.thumbMimeType),
  ]);
  return { url, thumbUrl };
}

export async function makeThumbFromUrl(imageUrl: string): Promise<string> {
  const origin = "https://kattachegirma.uz";
  const absUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  const resp = await fetch(absUrl);
  if (!resp.ok) throw new Error(`thumb fetch ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  const optimized = await optimizeImage(buf, `thumb-${Date.now()}`);
  const ts = Date.now();
  const { url: thumbUrl } = await storagePut(
    `products/thumb/${ts}-thumb.webp`,
    optimized.thumbBuffer,
    optimized.thumbMimeType,
  );
  return thumbUrl;
}

// ---- Ручная загрузка фото (с улучшением) ----
export async function uploadEnhancedImage(
  base64: string,
  filename: string,
): Promise<{ url: string; thumbUrl: string }> {
  const buffer = Buffer.from(base64, "base64");
  const baseName = filename.replace(/\.[^.]+$/, "");
  return enhanceAndStore(buffer, baseName);
}

// ---- Белый фон через remove.bg (matting, товар не меняется) ----
export async function whitenBackground(
  imageUrl: string,
): Promise<{ url: string; thumbUrl: string }> {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) {
    throw new Error("Ключ remove.bg не задан. Добавьте переменную окружения REMOVE_BG_API_KEY.");
  }
  // Адрес из хранилища относительный (/manus-storage/...) — делаем абсолютным и скачиваем байты
  const origin = "https://kattachegirma.uz";
  const absUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  const imgResp = await fetch(absUrl);
  if (!imgResp.ok) {
    throw new Error(`Не удалось загрузить фото для обработки (${imgResp.status})`);
  }
  const imgBuf = Buffer.from(await imgResp.arrayBuffer());

  const form = new FormData();
  form.append("image_file", new Blob([imgBuf]), "image.webp");
  form.append("size", "auto");
  form.append("bg_color", "ffffff");
  const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": key },
    body: form,
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => resp.statusText);
    throw new Error(`remove.bg ${resp.status}: ${t.slice(0, 200)}`);
  }
  const out = Buffer.from(await resp.arrayBuffer());
  return enhanceAndStore(out, `white-${Date.now()}`);
}

// ---- Bulk create: slug helpers ----
const CYR: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
function translitSlug(s: string): string {
  return s.toLowerCase().split("").map((c) => CYR[c] ?? c).join("");
}
async function makeUniqueSlug(base: string): Promise<string> {
  const raw = translitSlug(base).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const baseSlug = raw || `product-${Date.now()}`;
  let safe = baseSlug;
  let suffix = 2;
  while (await getSlugExists(safe)) {
    safe = `${baseSlug}-${suffix++}`;
    if (suffix > 100) { safe = `${baseSlug}-${Date.now()}`; break; }
  }
  return safe;
}

async function uniqueUzSlug(base: string): Promise<string> {
  const b = (base || "").trim() || `mahsulot-${Date.now()}`;
  let safe = b;
  let suffix = 2;
  while (await getSlugUzExists(safe)) {
    safe = `${b}-${suffix++}`;
    if (suffix > 100) { safe = `${b}-${Date.now()}`; break; }
  }
  return safe;
}

function cleanUzSlug(raw: string): string {
  return (raw || "").toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function generateUzSlug(name: string): Promise<string> {
  let raw = "";
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a URL slug generator. Given a product name (Russian or Uzbek), generate a short SEO-friendly URL slug in Uzbek Latin script. Use hyphens between words, only lowercase a-z, 0-9 and hyphens, max 80 chars. Output ONLY the slug, nothing else." },
        { role: "user", content: name },
      ],
    });
    raw = (response.choices?.[0]?.message?.content ?? "").toString();
  } catch { raw = ""; }
  let base = cleanUzSlug(raw);
  if (!base) base = cleanUzSlug(translitSlug(name).replace(/\s+/g, "-"));
  return uniqueUzSlug(base);
}

async function generateUzSlugsBatch(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const list = names.map((n, i) => `${i + 1}. ${n}`).join("\n");
  let arr: string[] = [];
  try {
    const resp = await invokeLLM({
      messages: [
        { role: "system", content: "Ты генерируешь SEO-слаги для URL на узбекской латинице. Для КАЖДОГО названия верни короткий слаг (только строчные a-z, 0-9 и дефисы, до 80 символов). Верни JSON { items: [ \"slug1\", ... ] } строго в том же порядке и количестве, что и список." },
        { role: "user", content: `Названия:\n${list}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "uz_slugs",
          strict: false,
          schema: { type: "object", properties: { items: { type: "array", items: { type: "string" } } }, required: ["items"] },
        },
      },
    });
    const content = resp.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as { items?: string[] };
    arr = parsed.items ?? [];
  } catch { arr = []; }
  return names.map((n, i) => {
    let base = cleanUzSlug(arr[i] ?? "");
    if (!base) base = cleanUzSlug(translitSlug(n).replace(/\s+/g, "-"));
    return base || `mahsulot-${Date.now()}-${i}`;
  });
}

async function generateDescriptions(name: string, specsText: string): Promise<{ ru: string; uz: string }> {
  const resp = await invokeLLM({
    messages: [
      { role: "system", content: "Ты — копирайтер интернет-магазина бытовой техники. Напиши УНИКАЛЬНОЕ продающее описание товара своими словами (не копируй сухие ТТХ построчно), 2–4 предложения, по-человечески, с пользой для покупателя. Никаких выдуманных фактов — опирайся только на переданные данные. Верни JSON: ru (русский) и uz (узбекская латиница)." },
      { role: "user", content: `Товар: ${name}\nХарактеристики: ${specsText}\n\nОпиши на русском (ru) и узбекском (uz).` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "product_description",
        strict: true,
        schema: {
          type: "object",
          properties: { ru: { type: "string" }, uz: { type: "string" } },
          required: ["ru", "uz"],
          additionalProperties: false,
        },
      },
    },
  });
  const content = resp.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as { ru?: string; uz?: string };
  return { ru: parsed.ru ?? "", uz: parsed.uz ?? "" };
}

async function generateDescriptionsBatch(
  items: { name: string; specsText: string }[],
): Promise<{ ru: string; uz: string }[]> {
  if (items.length === 0) return [];
  const list = items.map((it, idx) => `${idx + 1}. ${it.name} — ${it.specsText}`).join("\n");
  const resp = await invokeLLM({
    messages: [
      { role: "system", content: "Ты — копирайтер интернет-магазина бытовой техники. Для КАЖДОГО товара из списка напиши уникальное продающее описание своими словами (2–4 предложения), без выдуманных фактов, только по переданным данным. Верни JSON { items: [ { ru, uz } ] } строго в том же порядке и количестве, что и список. uz — узбекская латиница." },
      { role: "user", content: `Товары:\n${list}\n\nВерни JSON с массивом items: по одному объекту {ru, uz} на каждый товар, в том же порядке.` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "descriptions_batch",
        strict: false,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: { ru: { type: "string" }, uz: { type: "string" } },
                required: ["ru", "uz"],
              },
            },
          },
          required: ["items"],
        },
      },
    },
  });
  const content = resp.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as { items?: { ru?: string; uz?: string }[] };
  return (parsed.items ?? []).map((d) => ({ ru: d.ru ?? "", uz: d.uz ?? "" }));
}

export interface ImportProductInput {
  model: string;
  brand?: string;
  priceUsd: number;
  colorRu?: string;
  specs?: Record<string, string>;
  photoUrl?: string;
  thumbUrl?: string;
}

type BulkJob =
  | { status: "processing"; stage: string; total: number; done: number; failed: number }
  | { status: "finished"; total: number; done: number; failed: number; errors: string[] };

const bulkJobs = new Map<string, BulkJob>();

export function startBulkCreateJob(items: ImportProductInput[], categoryId: number, exchangeRate: number, contact: { sellerName?: string; sellerPhone?: string; sellerTelegram?: string; sellerId?: number; stock?: number }): string {
  const jobId = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  bulkJobs.set(jobId, { status: "processing", stage: "Подготовка...", total: items.length, done: 0, failed: 0 });
  void (async () => {
    let done = 0;
    let failed = 0;
    const errors: string[] = [];
    const rate = exchangeRate > 0 ? exchangeRate : 12700;

    let catName = "";
    let catSlugUz = "";
    try {
      const cats = await getAllCategories();
      const cat = cats.find((c: any) => c.id === categoryId);
      catName = ((cat as any)?.name ?? "").trim();
      catSlugUz = (((cat as any)?.slugUz || (cat as any)?.slug || "")).toString().trim();
    } catch { catName = ""; catSlugUz = ""; }

    const prepared = items.map((it) => {
      const model = (it.model || "").trim();
      const brand = (it.brand || "").trim();
      const name = [catName, brand, model].filter(Boolean).join(" ").trim() || model || "Товар";
      const specs = it.specs ?? {};
      const specsText = Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join("; ");
      return { it, model, brand, name, specs, specsText };
    });

    // СНАЧАЛА быстро создаём товары (без ожидания ИИ); описания добавим фоном
    bulkJobs.set(jobId, { status: "processing", stage: "Создаю товары", total: items.length, done: 0, failed: 0 });
    const created: { id: number; name: string; specsText: string }[] = [];
    for (let i = 0; i < prepared.length; i++) {
      const p = prepared[i];
      try {
        const slug = await makeUniqueSlug(p.model || p.name);
        const uzBase = cleanUzSlug(`${catSlugUz} ${p.model}`.trim().replace(/\s+/g, "-")) || cleanUzSlug(translitSlug(p.name).replace(/\s+/g, "-"));
        const slugUz = await uniqueUzSlug(uzBase);
        const priceUsd = Number(p.it.priceUsd) || 0;
        const priceSum = Math.round(priceUsd * rate);

        const newId = await createProduct({
          name: p.name,
          slug,
          slugUz,
          brand: p.brand || undefined,
          categoryId,
          price: String(priceSum),
          priceUsd: priceUsd > 0 ? String(priceUsd) : undefined,
          imageUrl: p.it.photoUrl || undefined,
          thumbUrl: p.it.thumbUrl || undefined,
          images: p.it.photoUrl ? [p.it.photoUrl] : [],
          specs: p.specs,
          sellerName: contact.sellerName || undefined,
          sellerPhone: contact.sellerPhone || undefined,
          contactPhone: contact.sellerPhone || undefined,
          sellerTelegram: contact.sellerTelegram || undefined,
          sellerId: contact.sellerId || undefined,
          stock: contact.stock ?? 10,
          stockCount: contact.stock ?? 10,
          isActive: true,
          isApproved: true,
        });
        if (typeof newId === "number") created.push({ id: newId, name: p.name, specsText: p.specsText });

        pingSitemaps(`https://kattachegirma.uz/product/${slug}`);
        done++;
      } catch (err) {
        failed++;
        errors.push(`${p.model}: ${err instanceof Error ? err.message : String(err)}`);
      }
      bulkJobs.set(jobId, { status: "processing", stage: "Создаю товары", total: items.length, done, failed });
    }
    // Товары готовы — сразу завершаем задание, чтобы пользователь не ждал
    bulkJobs.set(jobId, { status: "finished", total: items.length, done, failed, errors });
    setTimeout(() => bulkJobs.delete(jobId), 60 * 60 * 1000);

    // Описания генерируем ФОНОМ после завершения и дописываем в товары
    try {
      const descriptions = await generateDescriptionsBatch(created.map((c) => ({ name: c.name, specsText: c.specsText })));
      for (let i = 0; i < created.length; i++) {
        const d = descriptions[i];
        if (d && (d.ru || d.uz)) {
          try {
            await updateProduct(created[i].id, {
              description: d.ru || undefined,
              descriptionUz: d.uz || undefined,
            } as any);
          } catch { /* пропускаем */ }
        }
      }
    } catch { /* описания не критичны */ }
  })();
  return jobId;
}

export function getBulkCreateJob(jobId: string): BulkJob | undefined {
  return bulkJobs.get(jobId);
}
