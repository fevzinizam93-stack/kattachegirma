import { useState, useCallback } from "react";

const STORAGE_KEY = "kc_wishlist";

function loadIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIds(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useWishlist() {
  const [ids, setIds] = useState<number[]>(() => loadIds());

  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveIds(next);
      return next;
    });
  }, []);

  const has = useCallback((id: number) => ids.includes(id), [ids]);

  const clear = useCallback(() => {
    saveIds([]);
    setIds([]);
  }, []);

  return { ids, toggle, has, clear, count: ids.length };
}
