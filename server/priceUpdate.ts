import { getProducts, getProductById, updateProduct } from "./db";
import { pingSitemaps } from "./sitemap";

const BASE_URL = "https://kattachegirma.uz";

/** Нормализуем модель/строку: только латиница+цифры в нижнем регистре (для надёжного сравнения) */
function normModel(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface PriceMatchRow {
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

/** Сопоставляет распознанные позиции прайса с товарами сайта по номеру модели и сравнивает цены. */
export async function matchPriceUpdates(
  items: { model: string; brand?: string; priceUsd: number }[],
  rate: number
): Promise<PriceMatchRow[]> {
  const all = await getProducts({ approvedOnly: true, includeInactive: true, limit: 50000 });
  const index = (all as any[]).map((p) => ({ p, norm: normModel(`${p.slug || ""} ${p.name || ""}`) }));
  const r = rate > 0 ? rate : 12700;

  return items.map((it) => {
    const model = (it.model || "").trim();
    const nm = normModel(model);
    const newPriceUsd = Number(it.priceUsd) || 0;
    const newPriceSum = Math.round(newPriceUsd * r);

    let match: any = null;
    if (nm.length >= 4) match = index.find((x) => x.norm.includes(nm))?.p ?? null;

    if (!match) {
      return { model, brand: it.brand || "", newPriceUsd, newPriceSum, matched: false, cheaper: false };
    }
    const currentPriceSum = Math.round(Number(match.price) || 0);
    const currentPriceUsd = Number(match.priceUsd) || 0;
    return {
      model, brand: it.brand || "", newPriceUsd, newPriceSum,
      matched: true,
      productId: match.id,
      productName: match.name,
      productSlug: match.slug,
      currentPriceSum,
      currentPriceUsd,
      cheaper: newPriceSum > 0 && newPriceSum < currentPriceSum,
    };
  });
}

/** Применяет выбранные обновления цен. Если новая цена ниже — выставляет старую цену и считает скидку. */
export async function applyPriceUpdates(
  updates: { productId: number; newPriceSum: number; newPriceUsd: number; makeOldPrice: boolean }[]
): Promise<{ updated: number; failed: number }> {
  let updated = 0, failed = 0;
  for (const u of updates) {
    try {
      const product = await getProductById(u.productId);
      if (!product) { failed++; continue; }
      const newSum = Math.round(u.newPriceSum);
      const newUsd = Number(u.newPriceUsd) || 0;

      if (u.makeOldPrice) {
        const oldSum = Math.max(Number((product as any).originalPrice) || 0, Number((product as any).price) || 0);
        const oldUsd = Math.max(Number((product as any).originalPriceUsd) || 0, Number((product as any).priceUsd) || 0);
        const discount = oldSum > newSum ? Math.round((1 - newSum / oldSum) * 100) : 0;
        await updateProduct(u.productId, {
          price: String(newSum),
          priceUsd: newUsd > 0 ? String(newUsd) : undefined,
          originalPrice: String(oldSum),
          originalPriceUsd: oldUsd > 0 ? String(oldUsd) : undefined,
          discount,
        } as any);
      } else {
        await updateProduct(u.productId, {
          price: String(newSum),
          priceUsd: newUsd > 0 ? String(newUsd) : undefined,
          originalPrice: null,
          originalPriceUsd: null,
          discount: 0,
        } as any);
      }
      pingSitemaps(`${BASE_URL}/product/${(product as any).slug}`);
      updated++;
    } catch {
      failed++;
    }
  }
  return { updated, failed };
}
