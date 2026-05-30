import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { getSellerByUserId } from "../db";

// Admin guard middleware
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// Owner-only guard — проверяет поле isOwner в таблице users (надёжнее чем env-переменные).
// Запасной вариант: если isOwner не в контексте — проверяем по OWNER_OPEN_ID / OWNER_EMAIL.
export const ownerProcedure = adminProcedure.use(({ ctx, next }) => {
  // Основная проверка: поле isOwner в БД
  if ((ctx.user as any).isOwner === true) return next();
  // Запасной вариант: OWNER_OPEN_ID / OWNER_EMAIL
  const ownerOpenId = (process.env.OWNER_OPEN_ID || "").trim();
  const userOpenId = ((ctx.user as any).openId || "").trim();
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  const userEmail = ((ctx.user as any).email || "").toLowerCase().trim();
  const isOwnerEnv =
    (ownerOpenId && userOpenId && ownerOpenId === userOpenId) ||
    (ownerEmail && userEmail && ownerEmail === userEmail);
  if (!isOwnerEnv) throw new TRPCError({ code: "FORBIDDEN", message: "Доступ только для владельца" });
  return next();
});

// Seller guard middleware - checks if user has a seller profile OR is admin
export const sellerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role === "admin") {
    return next({ ctx });
  }
  // Allow any user who has a seller profile registered (role may not be updated yet)
  const sellerProfile = await getSellerByUserId(ctx.user.id);
  if (!sellerProfile) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Seller access required" });
  }
  return next({ ctx });
});

// ============================================================
// Server-side in-memory cache for frequently-accessed public data
// Reduces DB queries and improves TTFB (Time To First Byte)
// ============================================================
export const serverCache = new Map<string, { data: unknown; expiresAt: number }>();
export const SERVER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function getCached<T>(key: string): T | null {
  const entry = serverCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}
export function setCached(key: string, data: unknown, ttl = SERVER_CACHE_TTL) {
  serverCache.set(key, { data, expiresAt: Date.now() + ttl });
  // Prevent unbounded growth
  if (serverCache.size > 500) {
    const now = Date.now();
    Array.from(serverCache.entries()).forEach(([k, v]) => {
      if (v.expiresAt < now) serverCache.delete(k);
    });
  }
}
/** Call from admin mutations to invalidate product caches */
export function invalidateProductCache() {
  Array.from(serverCache.keys()).forEach(k => {
    if (k.startsWith('products:') || k.startsWith('hits:') || k.startsWith('categories:')) {
      serverCache.delete(k);
    }
  });
}
