import { useState, useMemo } from "react";
import { X, Search, ShoppingCart, ArrowLeftRight, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { Link } from "wouter";

interface Product {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  specs?: Record<string, string> | null;
  stock?: number | null;
  categoryId: number;
  isNew?: boolean | null;
  isHit?: boolean | null;
}

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
  currentProduct: Product;
}

// ---- Comparison logic ----

type SpecResult = "better" | "worse" | "equal" | "only_left" | "only_right" | "different";

/**
 * Try to parse a numeric value from a spec string.
 * Handles "2000 Вт", "65 дюймов", "12.5 кг", etc.
 */
function parseNumeric(val: string): number | null {
  const match = val.match(/[\d]+([.,]\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(",", "."));
}

/**
 * Determine which side is "better" for a given spec key.
 * Returns: "left_better" | "right_better" | "equal" | "different"
 */
function compareSpecValues(
  leftVal: string | undefined,
  rightVal: string | undefined
): "left_better" | "right_better" | "equal" | "different" | "only_left" | "only_right" {
  if (!leftVal && !rightVal) return "equal";
  if (leftVal && !rightVal) return "only_left";
  if (!leftVal && rightVal) return "only_right";

  const l = leftVal!.trim().toLowerCase();
  const r = rightVal!.trim().toLowerCase();

  if (l === r) return "equal";

  const lNum = parseNumeric(l);
  const rNum = parseNumeric(r);

  if (lNum !== null && rNum !== null) {
    // For price-like keys, lower is better; for most specs, higher is better
    // We always treat higher numeric as "better" for specs
    if (lNum > rNum) return "left_better";
    if (rNum > lNum) return "right_better";
    return "equal";
  }

  return "different";
}

// For price comparison: lower price is better
function comparePrices(leftPrice: number, rightPrice: number): "left_better" | "right_better" | "equal" {
  if (leftPrice < rightPrice) return "left_better";
  if (rightPrice < leftPrice) return "right_better";
  return "equal";
}

// ---- Spec row component ----
function SpecRow({
  label,
  leftVal,
  rightVal,
  hasRight,
}: {
  label: string;
  leftVal: string | undefined;
  rightVal: string | undefined;
  hasRight: boolean;
}) {
  const result = hasRight ? compareSpecValues(leftVal, rightVal) : "equal";

  const getStyle = (side: "left" | "right"): string => {
    if (!hasRight) return "text-gray-800 font-medium";
    const val = side === "left" ? leftVal : rightVal;
    if (!val) return "text-gray-300 italic";

    switch (result) {
      case "left_better":
        return side === "left"
          ? "text-green-700 font-bold bg-green-50 rounded px-1"
          : "text-red-600 font-medium bg-red-50 rounded px-1";
      case "right_better":
        return side === "right"
          ? "text-green-700 font-bold bg-green-50 rounded px-1"
          : "text-red-600 font-medium bg-red-50 rounded px-1";
      case "only_left":
        return side === "left" ? "text-green-700 font-bold bg-green-50 rounded px-1" : "text-gray-300";
      case "only_right":
        return side === "right" ? "text-green-700 font-bold bg-green-50 rounded px-1" : "text-gray-300";
      case "equal":
        return "text-gray-700 font-medium";
      case "different":
        return "text-amber-700 font-medium bg-amber-50 rounded px-1";
      default:
        return "text-gray-700";
    }
  };

  const getIcon = (side: "left" | "right") => {
    if (!hasRight || result === "equal" || result === "different") return null;
    const isBetter =
      (side === "left" && result === "left_better") ||
      (side === "right" && result === "right_better") ||
      (side === "left" && result === "only_left") ||
      (side === "right" && result === "only_right");
    if (isBetter) return <TrendingUp size={10} className="inline ml-0.5 text-green-600" />;
    const isWorse =
      (side === "left" && result === "right_better") ||
      (side === "right" && result === "left_better") ||
      (side === "left" && result === "only_right") ||
      (side === "right" && result === "only_left");
    if (isWorse) return <TrendingDown size={10} className="inline ml-0.5 text-red-500" />;
    return null;
  };

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-1 py-1.5 border-b border-gray-100 last:border-0 items-start">
      {/* Left value */}
      <div className="text-right">
        <span className={`text-xs ${getStyle("left")}`}>
          {leftVal ?? "—"}
          {getIcon("left")}
        </span>
      </div>
      {/* Label in center */}
      <div className="px-1.5 text-center">
        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide whitespace-nowrap leading-none">
          {label}
        </span>
      </div>
      {/* Right value */}
      <div className="text-left">
        <span className={`text-xs ${getStyle("right")}`}>
          {rightVal ?? "—"}
          {getIcon("right")}
        </span>
      </div>
    </div>
  );
}

// ---- Price row ----
function PriceRow({
  leftPrice,
  rightPrice,
  formatPrice,
  hasRight,
}: {
  leftPrice: number;
  rightPrice: number | null;
  formatPrice: (v: string) => string;
  hasRight: boolean;
}) {
  const result = hasRight && rightPrice !== null ? comparePrices(leftPrice, rightPrice) : "equal";

  const getStyle = (side: "left" | "right"): string => {
    if (!hasRight) return "text-lg font-black text-red-600";
    switch (result) {
      case "left_better":
        return side === "left"
          ? "text-lg font-black text-green-700"
          : "text-lg font-black text-red-600";
      case "right_better":
        return side === "right"
          ? "text-lg font-black text-green-700"
          : "text-lg font-black text-red-600";
      default:
        return "text-lg font-black text-gray-700";
    }
  };

  const getBadge = (side: "left" | "right") => {
    if (!hasRight || result === "equal") return null;
    const isBetter =
      (side === "left" && result === "left_better") ||
      (side === "right" && result === "right_better");
    if (isBetter)
      return (
        <span className="ml-1 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
          Лучшая цена
        </span>
      );
    return null;
  };

  return (
    <div className="mb-3">
      <div className={getStyle("left")}>
        {formatPrice(String(leftPrice))}
        {getBadge("left")}
      </div>
      {hasRight && rightPrice !== null && (
        <div className={getStyle("right")}>
          {formatPrice(String(rightPrice))}
          {getBadge("right")}
        </div>
      )}
    </div>
  );
}

// ---- Single product column ----
function ProductColumn({
  product,
  label,
  allSpecs,
  otherProduct,
  onAddToCart,
  showDiffsOnly,
}: {
  product: Product;
  label: string;
  allSpecs: string[];
  otherProduct: Product | null;
  onAddToCart: (p: Product) => void;
  showDiffsOnly: boolean;
}) {
  const { formatPrice } = useCurrency();
  const price = parseFloat(product.price);
  const origPrice = product.originalPrice ? parseFloat(product.originalPrice) : null;
  const hasDiscount = origPrice !== null && origPrice > price;
  const discountPct = hasDiscount && origPrice ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
  const inStock = !product.stock || product.stock > 0;
  const hasRight = otherProduct !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Label badge */}
      <div
        className={`text-center text-[10px] font-bold py-1 rounded-t-xl mb-2 ${
          label === "Текущий" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        }`}
      >
        {label === "Текущий" ? "👁 Этот товар" : "👇 Выберите, с чем сравнить"}
      </div>

      {/* Image */}
      <div
        className="relative bg-gray-50 rounded-xl overflow-hidden mb-3"
        style={{ paddingBottom: "70%" }}
      >
        <div className="absolute inset-0 flex items-center justify-center p-2">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
          ) : (
            <div className="text-5xl text-gray-200">📦</div>
          )}
        </div>
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPct}%
          </div>
        )}
      </div>

      {/* Name */}
      <Link
        href={`/product/${product.slug}`}
        className="text-sm font-bold text-gray-900 hover:text-red-600 transition-colors line-clamp-2 mb-1 leading-snug"
      >
        {product.name}
      </Link>
      {product.brand && (
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
          {product.brand}
        </p>
      )}

      {/* Price with comparison */}
      <div className="mb-3">
        {hasDiscount && origPrice && (
          <span className="text-[11px] text-gray-400 line-through block">
            {formatPrice(product.originalPrice!)}
          </span>
        )}
        <div
          className={`text-lg font-black leading-tight ${
            hasRight
              ? comparePrices(
                  price,
                  otherProduct ? parseFloat(otherProduct.price) : price
                ) === "left_better" && label === "Текущий"
                ? "text-green-700"
                : comparePrices(
                    price,
                    otherProduct ? parseFloat(otherProduct.price) : price
                  ) === "right_better" && label !== "Текущий"
                ? "text-green-700"
                : comparePrices(
                    price,
                    otherProduct ? parseFloat(otherProduct.price) : price
                  ) === "equal"
                ? "text-gray-700"
                : "text-red-600"
              : "text-red-600"
          }`}
        >
          {formatPrice(product.price)}
          {hasRight &&
            (() => {
              const otherPrice = otherProduct ? parseFloat(otherProduct.price) : price;
              const res = comparePrices(price, otherPrice);
              const isBetter =
                (label === "Текущий" && res === "left_better") ||
                (label !== "Текущий" && res === "right_better");
              const isWorse =
                (label === "Текущий" && res === "right_better") ||
                (label !== "Текущий" && res === "left_better");
              if (isBetter)
                return (
                  <span className="ml-1.5 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full align-middle">
                    ✓ Дешевле
                  </span>
                );
              if (isWorse)
                return (
                  <span className="ml-1.5 text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full align-middle">
                    Дороже
                  </span>
                );
              return null;
            })()}
        </div>
      </div>

      {/* Add to cart */}
      <button
        onClick={() => onAddToCart(product)}
        disabled={!inStock}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold mb-4 transition-all ${
          inStock
            ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 active:scale-95"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <ShoppingCart size={13} />
        {inStock ? "В корзину" : "Нет в наличии"}
      </button>

      {/* Specs */}
      {allSpecs.length > 0 && (
        <div className="flex-1 space-y-0">
          {(() => {
            const hiddenCount = showDiffsOnly && hasRight
              ? allSpecs.filter((key) => {
                  const r = compareSpecValues(product.specs?.[key], otherProduct?.specs?.[key]);
                  return r === "equal";
                }).length
              : 0;
            return hiddenCount > 0 ? (
              <div className="text-[10px] text-gray-400 italic px-1 py-1 mb-1">
                Скрыто {hiddenCount} совпадени{hiddenCount === 1 ? "е" : hiddenCount < 5 ? "я" : "й"}
              </div>
            ) : null;
          })()}
          {allSpecs.map((key) => {
            const val = product.specs?.[key];
            const otherVal = otherProduct?.specs?.[key];
            const result = hasRight ? compareSpecValues(val, otherVal) : "equal";

            // Hide equal specs when showDiffsOnly is active
            if (showDiffsOnly && hasRight && result === "equal") return null;

            const isBetter =
              (label === "Текущий" && (result === "left_better" || result === "only_left")) ||
              (label !== "Текущий" && (result === "right_better" || result === "only_right"));
            const isWorse =
              (label === "Текущий" && (result === "right_better" || result === "only_right")) ||
              (label !== "Текущий" && (result === "left_better" || result === "only_left"));
            const isDifferent = result === "different";

            return (
              <div
                key={key}
                className={`py-1.5 border-b border-gray-100 last:border-0 px-1 rounded ${
                  hasRight
                    ? isBetter
                      ? "bg-green-50"
                      : isWorse
                      ? "bg-red-50"
                      : isDifferent
                      ? "bg-amber-50"
                      : ""
                    : ""
                }`}
              >
                <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold mb-0.5">
                  {key}
                </p>
                <span
                  className={`text-xs font-medium flex items-center gap-1 ${
                    !val
                      ? "text-gray-300 italic"
                      : hasRight
                      ? isBetter
                        ? "text-green-700 font-bold"
                        : isWorse
                        ? "text-red-600"
                        : isDifferent
                        ? "text-amber-700"
                        : "text-gray-700"
                      : "text-gray-800"
                  }`}
                >
                  {val ?? "—"}
                  {hasRight && isBetter && <TrendingUp size={10} className="text-green-600 shrink-0" />}
                  {hasRight && isWorse && <TrendingDown size={10} className="text-red-500 shrink-0" />}
                  {hasRight && isDifferent && <Minus size={10} className="text-amber-500 shrink-0" />}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div className="pt-2">
          <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-4">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Main modal ----
export default function CompareModal({ open, onClose, currentProduct }: CompareModalProps) {
  const [search, setSearch] = useState("");
  const [compareProduct, setCompareProduct] = useState<Product | null>(null);
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();

  const { data: listData } = trpc.products.list.useQuery(
    {
      categoryId: currentProduct.categoryId,
      sortBy: "price_asc",
      limit: 100,
      search: search || undefined,
    },
    { enabled: open }
  );

  const candidates = useMemo(() => {
    const items = (listData?.items ?? []) as Product[];
    return items.filter((p) => p.id !== currentProduct.id);
  }, [listData, currentProduct.id]);

  // Collect all spec keys from both products
  const allSpecs = useMemo(() => {
    const keys = new Set<string>();
    if (currentProduct.specs) Object.keys(currentProduct.specs).forEach((k) => keys.add(k));
    if (compareProduct?.specs) Object.keys(compareProduct.specs).forEach((k) => keys.add(k));
    return Array.from(keys);
  }, [currentProduct.specs, compareProduct?.specs]);

  // Count better/worse/equal for summary
  const summary = useMemo(() => {
    if (!compareProduct) return null;
    let leftBetter = 0;
    let rightBetter = 0;
    let equal = 0;
    allSpecs.forEach((key) => {
      const r = compareSpecValues(currentProduct.specs?.[key], compareProduct.specs?.[key]);
      if (r === "left_better" || r === "only_left") leftBetter++;
      else if (r === "right_better" || r === "only_right") rightBetter++;
      else equal++;
    });
    // Price
    const priceRes = comparePrices(
      parseFloat(currentProduct.price),
      parseFloat(compareProduct.price)
    );
    if (priceRes === "left_better") leftBetter++;
    else if (priceRes === "right_better") rightBetter++;
    else equal++;
    return { leftBetter, rightBetter, equal };
  }, [compareProduct, allSpecs, currentProduct]);

  const verdict = useMemo(() => {
    if (!compareProduct) return null;
    const lp = parseFloat(currentProduct.price) || 0;
    const rp = parseFloat(compareProduct.price) || 0;
    const lOrig = currentProduct.originalPrice ? parseFloat(currentProduct.originalPrice) : 0;
    const rOrig = compareProduct.originalPrice ? parseFloat(compareProduct.originalPrice) : 0;
    const lDisc = lOrig > lp ? Math.round((1 - lp / lOrig) * 100) : 0;
    const rDisc = rOrig > rp ? Math.round((1 - rp / rOrig) * 100) : 0;
    const lStock = !currentProduct.stock || currentProduct.stock > 0;
    const rStock = !compareProduct.stock || compareProduct.stock > 0;

    let winner: "left" | "right" | null = null;
    if (lp && rp && lp !== rp) winner = lp < rp ? "left" : "right";
    else if (lDisc !== rDisc) winner = lDisc > rDisc ? "left" : "right";
    else if (lStock !== rStock) winner = lStock ? "left" : "right";

    if (!winner) return { winner: null as "left" | "right" | null, name: "", reasons: [] as string[] };

    const isLeft = winner === "left";
    const reasons: string[] = [];
    const priceDiff = Math.abs(lp - rp);
    if (priceDiff > 0) reasons.push(`дешевле на ${formatPrice(String(priceDiff))}`);
    const wDisc = isLeft ? lDisc : rDisc;
    const oDisc = isLeft ? rDisc : lDisc;
    if (wDisc > oDisc) reasons.push(`скидка больше — ${wDisc}% против ${oDisc}%`);
    if (isLeft ? lStock : rStock) reasons.push("в наличии");
    return { winner, name: isLeft ? currentProduct.name : compareProduct.name, reasons };
  }, [compareProduct, currentProduct, formatPrice]);

  const handleAddToCart = (p: Product) => {
    addItem({
      productId: p.id,
      name: p.name,
      price: parseFloat(p.price),
      quantity: 1,
      imageUrl: p.imageUrl ?? undefined,
      slug: p.slug,
    });
    toast.success("Добавлено в корзину", { description: p.name, duration: 2000 });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white w-full sm:max-w-5xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-red-500" />
            <h2 className="font-black text-base text-gray-900">Сравнение товаров</h2>
            {compareProduct && (
              <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                — подсветка: <span className="text-green-600 font-bold">зелёный</span> = лучше,{" "}
                <span className="text-red-500 font-bold">красный</span> = хуже
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {compareProduct && (
              <button
                onClick={() => setShowDiffsOnly((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  showDiffsOnly
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600"
                }`}
                title="Показывать только отличающиеся характеристики"
              >
                <span className="hidden sm:inline">{showDiffsOnly ? "✓ Только отличия" : "Только отличия"}</span>
                <span className="sm:hidden">{showDiffsOnly ? "✓" : "≠"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Verdict — plain-language recommendation */}
        {compareProduct && verdict && verdict.winner && (
          <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 shrink-0">
            <div className="flex items-start gap-2 max-w-3xl mx-auto">
              <span className="text-lg leading-none mt-0.5">💡</span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-emerald-900">Выгоднее: {verdict.name}</div>
                {verdict.reasons.length > 0 && (
                  <div className="text-xs text-emerald-700 mt-0.5">{verdict.reasons.join(" · ")}</div>
                )}
                <div className="text-[11px] text-emerald-600/70 mt-1">Подсказка по цене и скидке. Характеристики сравните в таблице ниже.</div>
              </div>
            </div>
          </div>
        )}
        {compareProduct && verdict && !verdict.winner && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0 text-center text-xs text-gray-500">
            Товары близки по цене — выбирайте по характеристикам ниже.
          </div>
        )}

        {/* Key facts — aligned comparison strip */}
        {compareProduct && (() => {
          const lp = parseFloat(currentProduct.price) || 0;
          const rp = parseFloat(compareProduct.price) || 0;
          const lOrig = currentProduct.originalPrice ? parseFloat(currentProduct.originalPrice) : 0;
          const rOrig = compareProduct.originalPrice ? parseFloat(compareProduct.originalPrice) : 0;
          const lDisc = lOrig > lp ? Math.round((1 - lp / lOrig) * 100) : 0;
          const rDisc = rOrig > rp ? Math.round((1 - rp / rOrig) * 100) : 0;
          const lStock = !currentProduct.stock || currentProduct.stock > 0;
          const rStock = !compareProduct.stock || compareProduct.stock > 0;
          const baseRows = [
            { label: "Цена", l: formatPrice(currentProduct.price), r: formatPrice(compareProduct.price), lBetter: lp > 0 && rp > 0 && lp < rp, rBetter: lp > 0 && rp > 0 && rp < lp },
            { label: "Скидка", l: lDisc ? `${lDisc}%` : "—", r: rDisc ? `${rDisc}%` : "—", lBetter: lDisc > rDisc, rBetter: rDisc > lDisc },
            { label: "Наличие", l: lStock ? "В наличии" : "Нет", r: rStock ? "В наличии" : "Нет", lBetter: lStock && !rStock, rBetter: rStock && !lStock },
            { label: "Бренд", l: currentProduct.brand || "—", r: compareProduct.brand || "—", lBetter: false, rBetter: false },
          ];
          const specRows = allSpecs
            .filter((k) => !!currentProduct.specs?.[k] && !!compareProduct.specs?.[k])
            .map((k) => {
              const res = compareSpecValues(currentProduct.specs![k], compareProduct.specs![k]);
              return {
                label: k,
                l: currentProduct.specs![k]!,
                r: compareProduct.specs![k]!,
                lBetter: res === "left_better",
                rBetter: res === "right_better",
                eq: res === "equal",
              };
            })
            .sort((a, b) => Number(a.eq) - Number(b.eq))
            .slice(0, 4)
            .map(({ eq, ...row }) => row);
          const rows = [...baseRows, ...specRows];
          return (
            <div className="shrink-0 border-b border-gray-100 bg-white">
              <div className="px-4 pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Главное</div>
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[76px_1fr_1fr] sm:grid-cols-[120px_1fr_1fr] gap-2 px-4 py-1.5 border-b border-gray-50 items-center">
                  <div className="text-[11px] text-gray-400 font-semibold">{row.label}</div>
                  <div className={`text-sm ${row.lBetter ? "font-bold text-emerald-700" : "text-gray-700"}`}>{row.l}{row.lBetter && <span className="ml-1 text-emerald-600">✓</span>}</div>
                  <div className={`text-sm ${row.rBetter ? "font-bold text-emerald-700" : "text-gray-700"}`}>{row.r}{row.rBetter && <span className="ml-1 text-emerald-600">✓</span>}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ===== MOBILE: horizontal scroll-snap ===== */}
          {compareProduct ? (
            <div className="sm:hidden flex flex-1 min-h-0 overflow-hidden">
              {/* Swipe container */}
              <div
                className="flex flex-1 overflow-x-auto snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: "none" }}
              >
                {/* Slide 1: current product */}
                <div className="snap-center shrink-0 w-full overflow-y-auto p-4">
                  <ProductColumn
                    product={currentProduct}
                    label="Текущий"
                    allSpecs={allSpecs}
                    otherProduct={compareProduct}
                    onAddToCart={handleAddToCart}
                    showDiffsOnly={showDiffsOnly}
                  />
                </div>
                {/* Slide 2: compare product */}
                <div className="snap-center shrink-0 w-full overflow-y-auto p-4">
                  <button
                    onClick={() => setCompareProduct(null)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-3 font-semibold"
                  >
                    ← Выбрать другой
                  </button>
                  <ProductColumn
                    product={compareProduct}
                    label="Сравниваемый"
                    allSpecs={allSpecs}
                    otherProduct={currentProduct}
                    onAddToCart={handleAddToCart}
                    showDiffsOnly={showDiffsOnly}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Mobile: product picker (full width) */
            <div className="sm:hidden flex flex-col flex-1 overflow-hidden">
              <div className="p-3 border-b border-gray-100 shrink-0">
                <p className="text-xs text-gray-500 mb-2 font-medium">Выберите товар для сравнения:</p>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {/* Current product mini-preview */}
                <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  {currentProduct.imageUrl && (
                    <img src={currentProduct.imageUrl} alt={currentProduct.name} className="w-8 h-8 object-contain rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-red-700 line-clamp-1">{currentProduct.name}</p>
                    <p className="text-[10px] text-red-500">{formatPrice(currentProduct.price)}</p>
                  </div>
                  <span className="text-[9px] text-red-400 font-semibold">vs</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {candidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-sm text-gray-500 font-medium">{search ? "Ничего не найдено" : "Нет других товаров в этой категории"}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {candidates.map((p) => {
                      const price = parseFloat(p.price);
                      const priceRes = comparePrices(parseFloat(currentProduct.price), price);
                      return (
                        <button key={p.id} onClick={() => setCompareProduct(p)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left group">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain p-0.5" /> : <span className="text-lg text-gray-200">📦</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-blue-700">{p.name}</p>
                            <span className={`text-xs font-black ${ priceRes === "right_better" ? "text-green-700" : priceRes === "left_better" ? "text-red-600" : "text-gray-700" }`}>{formatPrice(p.price)}</span>
                            {priceRes === "right_better" && <span className="ml-1 text-[9px] font-bold text-white bg-green-600 px-1 py-0.5 rounded">Дешевле</span>}
                            {priceRes === "left_better" && <span className="ml-1 text-[9px] font-bold text-white bg-red-500 px-1 py-0.5 rounded">Дороже</span>}
                          </div>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== DESKTOP: two columns side by side ===== */}
          {/* LEFT: Current product */}
          <div className="hidden sm:block w-1/2 border-r border-gray-100 overflow-y-auto p-4">
            <ProductColumn
              product={currentProduct}
              label="Текущий"
              allSpecs={allSpecs}
              otherProduct={compareProduct}
              onAddToCart={handleAddToCart}
              showDiffsOnly={showDiffsOnly}
            />
          </div>

          {/* RIGHT: Comparison panel */}
          <div className="hidden sm:flex w-1/2 flex-col overflow-hidden">
            {compareProduct ? (
              <div className="flex-1 overflow-y-auto p-4">
                <button
                  onClick={() => setCompareProduct(null)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-3 font-semibold"
                >
                  ← Выбрать другой
                </button>
                <ProductColumn
                  product={compareProduct}
                  label="Сравниваемый"
                  allSpecs={allSpecs}
                  otherProduct={currentProduct}
                  onAddToCart={handleAddToCart}
                  showDiffsOnly={showDiffsOnly}
                />
              </div>
            ) : (
              /* Product picker */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    Выберите товар для сравнения:
                  </p>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {candidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="text-sm text-gray-500 font-medium">
                        {search
                          ? "Ничего не найдено"
                          : "Нет других товаров в этой категории"}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {candidates.map((p) => {
                        const price = parseFloat(p.price);
                        const origPrice = p.originalPrice
                          ? parseFloat(p.originalPrice)
                          : null;
                        const hasDiscount = origPrice !== null && origPrice > price;
                        const discountPct =
                          hasDiscount && origPrice
                            ? Math.round(((origPrice - price) / origPrice) * 100)
                            : 0;
                        const priceRes = comparePrices(
                          parseFloat(currentProduct.price),
                          price
                        );
                        return (
                          <button
                            key={p.id}
                            onClick={() => setCompareProduct(p)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left group"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                <span className="text-xl text-gray-200">📦</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-700">
                                {p.name}
                              </p>
                              {p.brand && (
                                <p className="text-[10px] text-gray-400 uppercase font-semibold mt-0.5">
                                  {p.brand}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className={`text-xs font-black ${
                                    priceRes === "right_better"
                                      ? "text-green-700"
                                      : priceRes === "left_better"
                                      ? "text-red-600"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {formatPrice(p.price)}
                                </span>
                                {priceRes === "right_better" && (
                                  <span className="text-[9px] font-bold text-white bg-green-600 px-1 py-0.5 rounded">
                                    Дешевле
                                  </span>
                                )}
                                {priceRes === "left_better" && (
                                  <span className="text-[9px] font-bold text-white bg-red-500 px-1 py-0.5 rounded">
                                    Дороже
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className="text-[9px] font-bold text-white bg-green-600 px-1 py-0.5 rounded">
                                    -{discountPct}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight
                              size={14}
                              className="text-gray-300 group-hover:text-blue-400 shrink-0"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile swipe indicator */}
        {compareProduct && (
          <div className="sm:hidden flex items-center justify-center gap-2 py-2 border-t border-gray-100 bg-white shrink-0">
            <span className="text-[10px] text-gray-400 font-medium">Свайпайте чтобы сравнить →</span>
            <div className="flex gap-1">
              <span className="w-4 h-1.5 rounded-full bg-red-500" />
              <span className="w-4 h-1.5 rounded-full bg-gray-200" />
            </div>
          </div>
        )}

        {/* Footer: specs count */}
        {compareProduct && allSpecs.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 shrink-0 bg-gray-50 flex items-center gap-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
            <span>Сравниваются {allSpecs.length} характеристик(и)</span>
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Лучше
            </span>
            <span className="flex items-center gap-1 text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Хуже
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              Отличается
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
