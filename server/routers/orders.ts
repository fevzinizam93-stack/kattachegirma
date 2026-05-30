import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  createOrder,
  getAllOrders,
  getOrdersByUserId,
  updateOrderStatus,
  createNotification,
  getProductById,
  getDb,
} from "../db";
import { eq, sql } from "drizzle-orm";
import { notifyNewOrder, notifyBuyerOrderStatus } from "../telegram";
import { sendPushToOrder, savePushSubscription } from "../pushNotifications";

export const ordersRouter = router({
  create: publicProcedure
    .input(z.object({
      customerName: z.string().min(2),
      customerPhone: z.string().min(7),
      deliveryAddress: z.string().min(5),
      items: z.array(z.object({
        productId: z.number(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
        imageUrl: z.string().optional(),
      })),
      totalAmount: z.string(),
      userId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Security: always use authenticated user's id from ctx, ignore input.userId
      const secureInput = { ...input, userId: ctx.user?.id ?? input.userId };
      const id = await createOrder(secureInput);

      // Мгновенное уведомление покупателю (колокольчик): заказ принят в обработку
      const buyerUserId = ctx.user?.id ?? input.userId;
      if (buyerUserId) {
        createNotification({
          userId: buyerUserId,
          title: "Заказ оформлен ⏳",
          message: `Ваш заказ #${id} принят и передан продавцу. Ожидайте — продавец свяжется с вами для подтверждения.`,
          orderId: id,
          type: "order",
        }).catch((e) => console.error("[Notification] order placed failed:", e));
      }

      // Обновить salesCount и hitScore для каждого купленного товара (non-blocking)
      getDb().then(async (db) => {
        if (!db) return;
        const { products: productsTable } = await import("../../drizzle/schema");
        for (const item of input.items) {
          await db.execute(
            sql`UPDATE products
                SET salesCount = COALESCE(salesCount, 0) + ${item.quantity},
                    hitScore = FLOOR(
                      COALESCE(viewCount, 0) * 1 +
                      COALESCE(clickCount, 0) * 3 +
                      (COALESCE(salesCount, 0) + ${item.quantity}) * 10
                    )
                WHERE id = ${item.productId} AND isHitManual = FALSE`
          );
        }
      }).catch(e => console.error("[HitScore] Failed to update salesCount:", e));

      // Telegram уведомление с фото товара и ценой в $ и сум (non-blocking)
      void (async () => {
        try {
          const enriched = await Promise.all(input.items.map(async (item) => {
            let priceUsd: number | undefined;
            let imageUrl = item.imageUrl;
            try {
              const p = await getProductById(item.productId);
              if (p) {
                if (p.priceUsd != null) priceUsd = Number(p.priceUsd);
                if (!imageUrl && p.imageUrl) imageUrl = p.imageUrl;
              }
            } catch { /* ignore */ }
            return { productName: item.name, quantity: item.quantity, price: String(item.price), priceUsd, imageUrl };
          }));
          const totalUsd = enriched.reduce((s, it) => s + (it.priceUsd ? it.priceUsd * it.quantity : 0), 0);
          await notifyNewOrder({
            id,
            phone: input.customerPhone,
            customerName: input.customerName,
            address: input.deliveryAddress,
            items: enriched,
            total: input.totalAmount,
            totalUsd: totalUsd > 0 ? totalUsd : undefined,
          });
          console.log(`[Orders] ✅ Telegram уведомление о заказе #${id} отправлено`);
        } catch (e) {
          console.error(`[Orders] ❌ Telegram уведомление НЕ отправлено:`, e);
        }
      })();
      // Return user email for Google Customer Reviews opt-in
      let userEmail: string | null = null;
      if (ctx.user?.id) {
        try {
          const db = await getDb();
          if (db) {
            const { users: usersTable } = await import("../../drizzle/schema");
            const userRows = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, ctx.user.id)).limit(1);
            userEmail = userRows[0]?.email ?? null;
          }
        } catch (e) { /* non-critical */ }
      }
      return { id, email: userEmail };
    }),

  list: adminProcedure.query(async () => {
    return getAllOrders();
  }),

  // User: get own orders
  myOrders: protectedProcedure.query(async ({ ctx }) => {
    return getOrdersByUserId(ctx.user.id);
  }),
  // User: reorder — returns items from a past order to re-add to cart
  reorder: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userOrders = await getOrdersByUserId(ctx.user.id);
      const order = userOrders.find((o) => o.id === input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      return { items: order.items };
    }),

  // Public: get order by ID (for tracking page)
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { orders } = await import("../../drizzle/schema");
      const rows = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const o = rows[0];
      return {
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        items: o.items,
        customerName: o.customerName,
        deliveryAddress: o.deliveryAddress,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      await updateOrderStatus(input.id, input.status);
      // Notify the user if status changed to confirmed, delivered or cancelled
      const allOrders = await getAllOrders();
      const order = allOrders.find((o) => o.id === input.id);
      // Find user to notify: by userId on order, or by phone if guest order
      let notifyUserId: number | null = order?.userId ?? null;
      if (!notifyUserId && order?.customerPhone) {
        const db = await getDb();
        if (db) {
          const { users: usersTable } = await import("../../drizzle/schema");
          const phoneDigits = order.customerPhone.replace(/\D/g, "").slice(-9);
          if (phoneDigits.length === 9) {
            const matched = await db
              .select()
              .from(usersTable)
              .where(sql`RIGHT(REGEXP_REPLACE(COALESCE(${usersTable.phone}, ''), '[^0-9]', ''), 9) = ${phoneDigits}`)
              .limit(1);
            if (matched[0]) notifyUserId = matched[0].id;
          }
        }
      }

      if (order && notifyUserId) {
        const statusMessages: Record<string, { title: string; message: string } | undefined> = {
          confirmed: {
            title: "Заказ подтверждён ✅",
            message: `Ваш заказ #${input.id} подтверждён и передан в обработку.`,
          },
          delivered: {
            title: "Заказ доставлен 🎉",
            message: `Ваш заказ #${input.id} успешно доставлен. Спасибо за покупку! ⭐ Пожалуйста, оцените купленные товары — откройте заказ и поставьте оценку. Это помогает другим покупателям выбирать.`,
          },
          cancelled: {
            title: "Заказ отменён ❌",
            message: `Ваш заказ #${input.id} был отменён. Свяжитесь с нами для уточнения деталей.`,
          },
        };
        const notif = statusMessages[input.status];
        if (notif) {
          await createNotification({
            userId: notifyUserId,
            title: notif.title,
            message: notif.message,
            orderId: input.id,
            type: input.status === "delivered" ? "review_request" : "order",
          }).catch((e) => console.error("[Notification] Failed:", e));
        }

        // Telegram notification to buyer if they have telegramId
        if (input.status !== "pending") {
          const db = await getDb();
          if (db) {
            const { users: usersTable } = await import("../../drizzle/schema");
            const userRows = await db.select().from(usersTable).where(eq(usersTable.id, notifyUserId)).limit(1);
            const buyer = userRows[0];
            if (buyer?.telegramId) {
              notifyBuyerOrderStatus({
                telegramId: buyer.telegramId,
                orderId: input.id,
                status: input.status as "confirmed" | "delivered" | "cancelled",
                customerName: order.customerName,
                totalAmount: order.totalAmount,
              }).catch((e) => console.error("[Telegram] Buyer notification failed:", e));
            }
          }
        }
      }
      // Browser push notification to buyer
      if (input.status !== "pending") {
        const pushMessages: Record<string, { title: string; body: string } | undefined> = {
          confirmed: { title: "✅ Заказ подтверждён", body: `Заказ #${input.id} принят в обработку` },
          delivered: { title: "🎉 Заказ доставлен!", body: `Заказ #${input.id} успешно доставлен. Спасибо!` },
          cancelled: { title: "❌ Заказ отменён", body: `Заказ #${input.id} был отменён` },
        };
        const pushMsg = pushMessages[input.status];
        if (pushMsg) {
          sendPushToOrder(input.id, { ...pushMsg, url: `/order/${input.id}` })
            .catch((e) => console.error("[Push] Failed:", e));
        }
      }
      return { success: true };
    }),

  // Save browser push subscription for an order (public — no auth needed)
  subscribePush: publicProcedure
    .input(z.object({
      orderId: z.number(),
      endpoint: z.string(),
      p256dh: z.string(),
      auth: z.string(),
    }))
    .mutation(async ({ input }) => {
      await savePushSubscription(input.orderId, {
        endpoint: input.endpoint,
        keys: { p256dh: input.p256dh, auth: input.auth },
      });
      return { success: true };
    }),

  // Return VAPID public key for frontend subscription
  vapidPublicKey: publicProcedure.query(() => {
    const { ENV } = require("../_core/env");
    return { publicKey: ENV.vapidPublicKey as string };
  }),
});
