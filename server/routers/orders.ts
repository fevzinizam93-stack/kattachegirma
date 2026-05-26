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
  getDb,
} from "../db";
import { eq } from "drizzle-orm";
import { notifyNewOrder } from "../telegram";

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
    .mutation(async ({ input }) => {
      const id = await createOrder(input);
      // Send Telegram notification (non-blocking)
      notifyNewOrder({
        id,
        phone: input.customerPhone,
        customerName: input.customerName,
        address: input.deliveryAddress,
        items: input.items.map(item => ({
          productName: item.name,
          quantity: item.quantity,
          price: String(item.price),
        })),
        total: input.totalAmount,
      })
        .then(() => console.log(`[Orders] ✅ Telegram уведомление о заказе #${id} отправлено`))
        .catch(e => console.error(`[Orders] ❌ Telegram уведомление НЕ отправлено:`, e));
      return { id };
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
      if (order?.userId) {
        const statusMessages: Record<string, { title: string; message: string } | undefined> = {
          confirmed: {
            title: "Заказ подтверждён ✅",
            message: `Ваш заказ #${input.id} подтверждён и передан в обработку.`,
          },
          delivered: {
            title: "Заказ доставлен 🎉",
            message: `Ваш заказ #${input.id} успешно доставлен. Спасибо за покупку!`,
          },
          cancelled: {
            title: "Заказ отменён ❌",
            message: `Ваш заказ #${input.id} был отменён. Свяжитесь с нами для уточнения деталей.`,
          },
        };
        const notif = statusMessages[input.status];
        if (notif) {
          await createNotification({
            userId: order.userId,
            title: notif.title,
            message: notif.message,
            orderId: input.id,
          }).catch((e) => console.error("[Notification] Failed:", e));
        }
      }
      return { success: true };
    }),
});
