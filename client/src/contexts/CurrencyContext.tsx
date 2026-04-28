import { createContext, useContext, useState, ReactNode } from "react";

export type Currency = "uzs" | "usd";

const USD_RATE = 12700; // 1 USD ≈ 12 700 UZS

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatPrice: (priceInUzs: string | number) => string;
  currencyLabel: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "uzs",
  setCurrency: () => {},
  formatPrice: (p) => `${Number(p).toLocaleString("ru-RU")} сум`,
  currencyLabel: "сум",
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("kc_currency");
    return saved === "usd" ? "usd" : "uzs";
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("kc_currency", c);
  };

  const formatPrice = (priceInUzs: string | number): string => {
    const num = typeof priceInUzs === "string" ? parseFloat(priceInUzs) : priceInUzs;
    if (isNaN(num)) return String(priceInUzs);
    if (currency === "usd") {
      const usd = Math.round(num / USD_RATE);
      return `$${usd.toLocaleString("en-US")}`;
    }
    return `${num.toLocaleString("ru-RU")} сум`;
  };

  const currencyLabel = currency === "usd" ? "$" : "сум";

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, currencyLabel }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
