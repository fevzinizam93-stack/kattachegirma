import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type Currency = "uzs" | "usd";

const FALLBACK_USD_RATE = 12700; // fallback if API is unavailable

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (priceInUzs: string | number) => string;
  currencyLabel: string;
  usdRate: number;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "uzs",
  setCurrency: () => {},
  formatPrice: (p) => `${Number(p).toLocaleString("ru-RU")} сум`,
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

  const formatPrice = (priceInUzs: string | number): string => {
    const num = typeof priceInUzs === "string" ? parseFloat(priceInUzs) : priceInUzs;
    if (isNaN(num)) return String(priceInUzs);
    if (currency === "usd") {
      const usd = Math.round(num / usdRate);
      return `$${usd.toLocaleString("en-US")}`;
    }
    return `${num.toLocaleString("ru-RU")} сум`;
  };

  const currencyLabel = currency === "usd" ? "$" : "сум";

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, currencyLabel, usdRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
