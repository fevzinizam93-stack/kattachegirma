import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type Currency = "uzs" | "usd";

const FALLBACK_USD_RATE = 12700; // fallback if API is unavailable

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (priceInUzs: string | number) => string;
  /** Use this for products — shows stored USD directly, never recalculates from UZS */
  formatProductPrice: (priceInUzs: string | number, storedUsd?: string | number | null) => string;
  currencyLabel: string;
  usdRate: number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "uzs",
  setCurrency: () => {},
  formatPrice: (p) => `${Number(p).toLocaleString("ru-RU")} сум`,
  formatProductPrice: (p) => `${Number(p).toLocaleString("ru-RU")} сум`,
  currencyLabel: "сум",
  usdRate: FALLBACK_USD_RATE,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("kc_currency");
    return saved === "usd" ? "usd" : "uzs";
  });

  // Use the same live rate from the server that the admin panel uses
  const [usdRate, setUsdRate] = useState<number>(FALLBACK_USD_RATE);
  const rateQuery = trpc.currency.getRate.useQuery(undefined, {
    staleTime: 60 * 60 * 1000, // cache 1 hour
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (rateQuery.data?.usdToUzs) {
      setUsdRate(rateQuery.data.usdToUzs);
    }
  }, [rateQuery.data]);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("kc_currency", c);
  };

  /** Legacy: converts UZS to USD by dividing by current rate. Avoid for products. */
  const formatPrice = (priceInUzs: string | number): string => {
    const num = typeof priceInUzs === "string" ? parseFloat(priceInUzs) : priceInUzs;
    if (isNaN(num)) return String(priceInUzs);
    if (currency === "usd") {
      const usd = Math.round(num / usdRate);
      return `$${usd.toLocaleString("en-US")}`;
    }
    return `${num.toLocaleString("ru-RU")} сум`;
  };

  /**
   * Use for product prices. In USD mode: shows the stored USD value directly (never recalculates).
   * Falls back to dividing UZS by current rate only for old products without stored USD.
   */
  const formatProductPrice = (
    priceInUzs: string | number,
    storedUsd?: string | number | null
  ): string => {
    if (currency === "usd") {
      // If we have a stored USD value — use it directly, no recalculation
      if (storedUsd != null && storedUsd !== "" && Number(storedUsd) > 0) {
        return `$${Math.round(Number(storedUsd)).toLocaleString("en-US")}`;
      }
      // Fallback for old products without stored USD
      const num = typeof priceInUzs === "string" ? parseFloat(priceInUzs) : priceInUzs;
      if (isNaN(num)) return String(priceInUzs);
      return `$${Math.round(num / usdRate).toLocaleString("en-US")}`;
    }
    // UZS mode: show sum as-is
    const num = typeof priceInUzs === "string" ? parseFloat(priceInUzs) : priceInUzs;
    if (isNaN(num)) return String(priceInUzs);
    return `${num.toLocaleString("ru-RU")} сум`;
  };

  const currencyLabel = currency === "usd" ? "$" : "сум";

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, formatProductPrice, currencyLabel, usdRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
