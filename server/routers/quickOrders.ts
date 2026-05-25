import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  createQuickOrder,
  getAllQuickOrders,
  updateQuickOrderStatus,
} from "../db";
import { notifyNewOrder } from "../telegram";

export const quickOrdersRouter = router({
  // Public: submit a quick order (one-click buy)
  submit: publicProcedure
    .input(z.object({
      productId: z.number(),
      productName: z.string(),
      productPrice: z.string(),
      customerPhone: z.string().min(7),
      customerName: z.string().default("Покупатель"),
    }))
    .mutation(async ({ input }) => {
      const id = await createQuickOrder(input);
      // Notify via Telegram (non-blocking)
      notifyNewOrder({
        id,
        phone: input.customerPhone,
        address: "",
        items: [{ productName: input.productName, quantity: 1, price: input.productPrice }],
        total: input.productPrice,
      }).catch((e: unknown) => console.error("[Telegram] notifyQuickOrder failed:", e));
      return { id };
    }),

  // Alias for submit (old name: create)
  create: publicProcedure
    .input(z.object({
      productId: z.number(),
      productName: z.string(),
      productPrice: z.string(),
      customerPhone: z.string().min(7),
      customerName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createQuickOrder({ ...input, customerName: input.customerName ?? "Покупатель" });
      notifyNewOrder({
        id,
        phone: input.customerPhone,
        address: "",
        items: [{ productName: input.productName, quantity: 1, price: input.productPrice }],
        total: input.productPrice,
      }).catch((e: unknown) => console.error("[Telegram] notifyQuickOrder failed:", e));
      return { id };
    }),

  // Admin: list all quick orders
  list: adminProcedure.query(async () => {
    return getAllQuickOrders();
  }),

  // Admin: update quick order status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
    }))
    .mutation(async ({ input }) => {
      await updateQuickOrderStatus(input.id, input.status);
      return { success: true };
    }),
});
