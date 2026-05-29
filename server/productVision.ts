import sharp from "sharp";
import { invokeLLM } from "./_core/llm";
import { optimizeImage } from "./_core/imageOptimizer";
import { storagePut } from "./storage";

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
): Promise<RecognizedProduct[]> {
  const sheetBuffer = Buffer.from(sheetBase64, "base64");
  const ts = Date.now();

  // Передаём картинку модели НАПРЯМУЮ как data URL (шлюз не скачивает внешние ссылки)
  const dataUrl = `data:${mimeType};base64,${sheetBase64}`;

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
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
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

    results.push(out);
  }

  return results;
}

// ---- Фоновые задания распознавания (in-memory) ----
type RecognitionJob =
  | { status: "processing" }
  | { status: "done"; products: RecognizedProduct[] }
  | { status: "error"; error: string };

const recognitionJobs = new Map<string, RecognitionJob>();

export function startRecognitionJob(sheetBase64: string, mimeType: string): string {
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  recognitionJobs.set(jobId, { status: "processing" });
  void (async () => {
    try {
      const products = await recognizePriceSheet(sheetBase64, mimeType);
      recognitionJobs.set(jobId, { status: "done", products });
    } catch (err) {
      recognitionJobs.set(jobId, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
    setTimeout(() => recognitionJobs.delete(jobId), 10 * 60 * 1000);
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
    .resize({ width: 1200, fit: "inside", withoutEnlargement: false, kernel: "lanczos3" })
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
  const form = new FormData();
  form.append("image_url", imageUrl);
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
