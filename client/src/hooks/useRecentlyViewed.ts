import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "kc_recently_viewed";
const MAX_ITEMS = 10;

export interface RecentlyViewedItem {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  isNew?: boolean | null;
  isHit?: boolean | null;
  isPremium?: boolean | null;
  stock?: number | null;
  categoryId: number;
  viewedAt: number; // timestamp
}

function readStorage(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(() => readStorage());

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setItems(readStorage());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addItem = useCallback((product: Omit<RecentlyViewedItem, "viewedAt">) => {
    setItems((prev) => {
      // Remove existing entry for this product
      const filtered = prev.filter((p) => p.id !== product.id);
      // Add to front
      const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  }, []);

  return { items, addItem, clearHistory };
}
