import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  createQuickOrder,
  getAllQuickOrders,
  updateQuickOrderStatus,
  getProductById,
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
      // Notify via Telegram with photo + USD/UZS price (non-blocking)
      void (async () => {
        try {
          const p = await getProductById(input.productId);
          const priceNum = p?.price != null ? Number(p.price) : Number(input.productPrice);
          const priceStr = Number.isFinite(priceNum) ? String(priceNum) : "0";
          const priceUsd = p?.priceUsd != null ? Number(p.priceUsd) : undefined;
          await notifyNewOrder({
            id,
            phone: input.customerPhone,
            customerName: input.customerName,
            address: "",
            items: [{ productName: input.productName, quantity: 1, price: priceStr, priceUsd, imageUrl: p?.imageUrl ?? undefined }],
            total: priceStr,
            totalUsd: priceUsd,
          });
        } catch (e) {
          console.error("[Telegram] notifyQuickOrder failed:", e);
        }
      })();
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
      void (async () => {
        try {
          const p = await getProductById(input.productId);
          const priceNum = p?.price != null ? Number(p.price) : Number(input.productPrice);
          const priceStr = Number.isFinite(priceNum) ? String(priceNum) : "0";
          const priceUsd = p?.priceUsd != null ? Number(p.priceUsd) : undefined;
          await notifyNewOrder({
            id,
            phone: input.customerPhone,
            customerName: input.customerName ?? "Покупатель",
            address: "",
            items: [{ productName: input.productName, quantity: 1, price: priceStr, priceUsd, imageUrl: p?.imageUrl ?? undefined }],
            total: priceStr,
            totalUsd: priceUsd,
          });
        } catch (e) {
          console.error("[Telegram] notifyQuickOrder failed:", e);
        }
      })();
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
