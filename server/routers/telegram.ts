import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { adminProcedure } from "./_shared";
import {
  getTelegramRecipients,
  addTelegramRecipient,
  deleteTelegramRecipient,
  toggleTelegramRecipient,
} from "../db";

export const telegramRouter = router({
  // Admin: list all recipients
  listRecipients: adminProcedure.query(async () => {
    return getTelegramRecipients();
  }),

  // Admin: add a new recipient
  addRecipient: adminProcedure
    .input(z.object({
      chatId: z.string().min(1).max(64),
      name: z.string().min(1).max(128),
    }))
    .mutation(async ({ input }) => {
      const id = await addTelegramRecipient(input.chatId, input.name);
      return { ok: true, id };
    }),

  // Admin: toggle active/inactive
  toggleRecipient: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleTelegramRecipient(input.id, input.isActive);
      return { ok: true };
    }),

  // Admin: delete a recipient
  deleteRecipient: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTelegramRecipient(input.id);
      return { ok: true };
    }),

  // Alias for deleteRecipient (old name)
  removeRecipient: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTelegramRecipient(input.id);
      return { ok: true };
    }),

  // Admin: register Telegram webhook
  registerWebhook: adminProcedure
    .input(z.object({ siteUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "TELEGRAM_BOT_TOKEN not set" });
      const webhookUrl = `${input.siteUrl}/api/telegram/webhook`;
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["callback_query"],
          secret_token: secret || undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; description?: string };
      if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.description ?? "setWebhook failed" });
      return { ok: true, webhookUrl };
    }),

  // Admin: get current webhook info
  getWebhookInfo: adminProcedure.query(async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "TELEGRAM_BOT_TOKEN not set" });
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    return res.json();
  }),
});
