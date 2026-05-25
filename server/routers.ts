import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { registerUser, loginUser, updateUserPhone } from "./db";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

// ── Sub-routers ──────────────────────────────────────────────────────────────
import { categoriesRouter } from "./routers/categories";
import { productsRouter } from "./routers/products";
import { hitsRouter } from "./routers/hits";
import { ordersRouter } from "./routers/orders";
import { notificationsRouter } from "./routers/notifications";
import { favoritesRouter } from "./routers/favorites";
import { storeSettingsRouter } from "./routers/storeSettings";
import { sellersRouter } from "./routers/sellers";
import { reviewsRouter } from "./routers/reviews";
import { bannersRouter } from "./routers/banners";
import { telegramRouter } from "./routers/telegram";
import { utmRouter } from "./routers/utm";
import { currencyRouter } from "./routers/currency";
import { messagingRouter } from "./routers/messaging";
import { sellerContactsRouter } from "./routers/sellerContacts";
import { brandsRouter } from "./routers/brands";
import { aiRouter } from "./routers/ai";
import { youtubeRouter } from "./routers/youtube";
import { indexingRouter } from "./routers/indexing";
import { quickOrdersRouter } from "./routers/quickOrders";
import { analyticsRouter } from "./routers/analytics";

// Re-export cache invalidation helper (used by sellers router for product approval)
export { invalidateProductCache } from "./routers/_shared";

export const appRouter = router({
  system: systemRouter,

  // ── Auth (inline — tightly coupled to cookie/JWT) ─────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Email/password registration
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await registerUser(input);
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({
            openId: user.openId ?? `local_${user.email}`,
            appId: ENV.appId,
            name: user.name ?? user.email,
            role: user.role,
            userId: user.id,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "EMAIL_EXISTS") {
            throw new TRPCError({ code: "CONFLICT", message: "Этот email уже зарегистрирован" });
          }
          throw e;
        }
      }),

    // Email/password login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          const user = await loginUser(input.email, input.password);
          const secret = new TextEncoder().encode(ENV.cookieSecret);
          const token = await new SignJWT({
            openId: user.openId ?? `local_${user.email}`,
            appId: ENV.appId,
            name: user.name ?? user.email,
            role: user.role,
            userId: user.id,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("30d")
            .sign(secret);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
          return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        } catch (e: any) {
          if (e.message === "INVALID_CREDENTIALS") {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Неверный email или пароль" });
          }
          throw e;
        }
      }),

    // Update phone number
    updatePhone: protectedProcedure
      .input(z.object({ phone: z.string().min(7).max(20) }))
      .mutation(async ({ input, ctx }) => {
        await updateUserPhone(ctx.user.id, input.phone);
        return { success: true };
      }),
  }),

  // ── Feature routers ───────────────────────────────────────────────────────
  categories: categoriesRouter,
  products: productsRouter,
  hits: hitsRouter,
  orders: ordersRouter,
  notifications: notificationsRouter,
  favorites: favoritesRouter,
  storeSettings: storeSettingsRouter,
  sellers: sellersRouter,
  reviews: reviewsRouter,
  banners: bannersRouter,
  telegram: telegramRouter,
  utm: utmRouter,
  currency: currencyRouter,
  messaging: messagingRouter,
  sellerContacts: sellerContactsRouter,
  brands: brandsRouter,
  ai: aiRouter,
  youtube: youtubeRouter,
  indexing: indexingRouter,
  quickOrders: quickOrdersRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
