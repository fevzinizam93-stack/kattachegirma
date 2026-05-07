/**
 * Telegram Webhook handler
 * Receives callback_query events from Telegram inline buttons
 * and performs seller approve/reject actions.
 */

import { Router } from "express";
import { approveSeller, setSellerBlocked, getSellerById, getProductById, updateProduct, setReviewStatus, getAllReviews, getAllOrders, getAllSellers, getPendingProducts } from "./db";
import { answerCallbackQuery, editMessageText, sendTelegramMessageToChat } from "./telegram";

const router = Router();

// Secret token to validate incoming Telegram webhook requests
function getWebhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

router.post("/api/telegram/webhook", async (req, res) => {
  // Validate secret token header (set when registering webhook)
  const secret = getWebhookSecret();
  if (secret) {
    const headerToken = req.headers["x-telegram-bot-api-secret-token"];
    if (headerToken !== secret) {
      console.warn("[TG Webhook] Invalid secret token");
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const update = req.body;

  // Handle callback_query (inline button press)
  if (update?.callback_query) {
    const cbq = update.callback_query;
    const callbackQueryId: string = cbq.id;
    const data: string = cbq.data ?? "";
    const chatId: string = String(cbq.message?.chat?.id ?? "");
    const messageId: number = cbq.message?.message_id;
    const adminName: string = cbq.from?.first_name ?? "Админ";

    try {
      if (data.startsWith("seller_approve:")) {
        const sellerId = parseInt(data.split(":")[1], 10);
        if (isNaN(sellerId)) throw new Error("Invalid seller id");

        const seller = await getSellerById(sellerId);
        if (!seller) {
          await answerCallbackQuery(callbackQueryId, "❌ Продавец не найден");
          res.json({ ok: true });
          return;
        }
        if (seller.isApproved) {
          await answerCallbackQuery(callbackQueryId, "✅ Уже одобрен");
          res.json({ ok: true });
          return;
        }

        await approveSeller(sellerId);
        await answerCallbackQuery(callbackQueryId, `✅ Продавец ${seller.name} одобрен!`);

        // Update the original message to show result
        const updatedText = [
          `🏪 <b>Заявка продавца — ОДОБРЕНА ✅</b>`,
          ``,
          `👤 <b>Имя:</b> ${seller.name}`,
          `📞 <b>Телефон:</b> ${seller.phone ?? "—"}`,
          seller.telegram ? `✈️ <b>Telegram:</b> ${seller.telegram}` : ``,
          seller.description ? `📝 <b>О себе:</b> ${seller.description}` : ``,
          ``,
          `👮 <b>Одобрил:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, updatedText);
        }

      } else if (data.startsWith("seller_reject:")) {
        const sellerId = parseInt(data.split(":")[1], 10);
        if (isNaN(sellerId)) throw new Error("Invalid seller id");

        const seller = await getSellerById(sellerId);
        if (!seller) {
          await answerCallbackQuery(callbackQueryId, "❌ Продавец не найден");
          res.json({ ok: true });
          return;
        }

        // Block the seller (reject = block)
        await setSellerBlocked(sellerId, true);
        await answerCallbackQuery(callbackQueryId, `❌ Заявка ${seller.name} отклонена`);

        const updatedText = [
          `🏪 <b>Заявка продавца — ОТКЛОНЕНА ❌</b>`,
          ``,
          `👤 <b>Имя:</b> ${seller.name}`,
          `📞 <b>Телефон:</b> ${seller.phone ?? "—"}`,
          seller.telegram ? `✈️ <b>Telegram:</b> ${seller.telegram}` : ``,
          ``,
          `👮 <b>Отклонил:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, updatedText);
        }

      } else if (data.startsWith("product_approve:")) {
        const productId = parseInt(data.split(":")[1], 10);
        if (isNaN(productId)) throw new Error("Invalid product id");

        const product = await getProductById(productId);
        if (!product) {
          await answerCallbackQuery(callbackQueryId, "❌ Товар не найден");
          res.json({ ok: true });
          return;
        }
        if ((product as any).isApproved) {
          await answerCallbackQuery(callbackQueryId, "✅ Уже одобрен");
          res.json({ ok: true });
          return;
        }

        await updateProduct(productId, { isApproved: true, moderationStatus: "approved" as const });
        await answerCallbackQuery(callbackQueryId, `✅ Товар «${product.name}» одобрен!`);

        const approvedText = [
          `📦 <b>Товар — ОДОБРЕН ✅</b>`,
          ``,
          `🏷 <b>Название:</b> ${product.name}`,
          `💰 <b>Цена:</b> ${Number(product.price).toLocaleString("ru-RU")} сум`,
          product.sellerName ? `🏪 <b>Продавец:</b> ${product.sellerName}` : ``,
          ``,
          `👮 <b>Одобрил:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, approvedText);
        }

      } else if (data.startsWith("product_reject:")) {
        const productId = parseInt(data.split(":")[1], 10);
        if (isNaN(productId)) throw new Error("Invalid product id");

        const product = await getProductById(productId);
        if (!product) {
          await answerCallbackQuery(callbackQueryId, "❌ Товар не найден");
          res.json({ ok: true });
          return;
        }

        await updateProduct(productId, { isApproved: false, moderationStatus: "rejected" as const, isActive: false });
        await answerCallbackQuery(callbackQueryId, `❌ Товар «${product.name}» отклонён`);

        const rejectedText = [
          `📦 <b>Товар — ОТКЛОНЁН ❌</b>`,
          ``,
          `🏷 <b>Название:</b> ${product.name}`,
          `💰 <b>Цена:</b> ${Number(product.price).toLocaleString("ru-RU")} сум`,
          product.sellerName ? `🏪 <b>Продавец:</b> ${product.sellerName}` : ``,
          ``,
          `👮 <b>Отклонил:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, rejectedText);
        }

      } else if (data.startsWith("review_approve:")) {
        const reviewId = parseInt(data.split(":")[1], 10);
        if (isNaN(reviewId)) throw new Error("Invalid review id");

        const allReviews = await getAllReviews();
        const review = allReviews.find(r => r.id === reviewId);
        if (!review) {
          await answerCallbackQuery(callbackQueryId, "❌ Отзыв не найден");
          res.json({ ok: true });
          return;
        }
        if (review.status === "approved") {
          await answerCallbackQuery(callbackQueryId, "✅ Уже одобрен");
          res.json({ ok: true });
          return;
        }

        await setReviewStatus(reviewId, "approved");
        await answerCallbackQuery(callbackQueryId, `✅ Отзыв от ${review.authorName} одобрен!`);

        const approvedReviewText = [
          `💬 <b>Отзыв — ОДОБРЕН ✅</b>`,
          ``,
          `👤 <b>Автор:</b> ${review.authorName}`,
          `⭐ <b>Оценка:</b> ${review.rating}/5`,
          `📝 ${review.comment}`,
          ``,
          `👮 <b>Одобрил:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, approvedReviewText);
        }

      } else if (data.startsWith("review_hide:")) {
        const reviewId = parseInt(data.split(":")[1], 10);
        if (isNaN(reviewId)) throw new Error("Invalid review id");

        const allReviews = await getAllReviews();
        const review = allReviews.find(r => r.id === reviewId);
        if (!review) {
          await answerCallbackQuery(callbackQueryId, "❌ Отзыв не найден");
          res.json({ ok: true });
          return;
        }

        await setReviewStatus(reviewId, "hidden");
        await answerCallbackQuery(callbackQueryId, `🙈 Отзыв от ${review.authorName} скрыт`);

        const hiddenReviewText = [
          `💬 <b>Отзыв — СКРЫТ 🙈</b>`,
          ``,
          `👤 <b>Автор:</b> ${review.authorName}`,
          `⭐ <b>Оценка:</b> ${review.rating}/5`,
          `📝 ${review.comment}`,
          ``,
          `👮 <b>Скрыл:</b> ${adminName}`,
          `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ].filter(Boolean).join("\n");

        if (chatId && messageId) {
          await editMessageText(chatId, messageId, hiddenReviewText);
        }

      } else {
        // Unknown callback — just acknowledge
        await answerCallbackQuery(callbackQueryId);
      }
    } catch (e) {
      console.error("[TG Webhook] Error handling callback_query:", e);
      await answerCallbackQuery(callbackQueryId, "⚠️ Ошибка сервера");
    }
  }

  // Handle /stats command
  if (update?.message?.text === "/stats") {
    const chatId = String(update.message.chat?.id ?? "");
    if (!chatId) {
      res.json({ ok: true });
      return;
    }
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const [allOrders, allSellers, pendingProducts, pendingReviews] = await Promise.all([
        getAllOrders(),
        getAllSellers(),
        getPendingProducts(),
        getAllReviews("pending"),
      ]);

      // Orders today
      const ordersToday = allOrders.filter(o => new Date(o.createdAt) >= startOfDay).length;
      const totalOrders = allOrders.length;

      // New sellers today
      const sellersToday = allSellers.filter(s => new Date((s as any).createdAt ?? 0) >= startOfDay).length;
      const totalSellers = allSellers.length;
      const pendingSellers = allSellers.filter(s => !s.isApproved && !(s as any).isBlocked).length;

      const statsText = [
        `📊 <b>Статистика Katta Chegirma</b>`,
        `📅 ${now.toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
        ``,
        `🛒 <b>Заказы:</b>`,
        `  • Сегодня: <b>${ordersToday}</b>`,
        `  • Всего: <b>${totalOrders}</b>`,
        ``,
        `🏪 <b>Продавцы:</b>`,
        `  • Всего: <b>${totalSellers}</b>`,
        `  • Новых сегодня: <b>${sellersToday}</b>`,
        `  • Ожидают одобрения: <b>${pendingSellers}</b>`,
        ``,
        `📦 <b>Товары на модерации:</b> <b>${pendingProducts.length}</b>`,
        `💬 <b>Отзывы на модерации:</b> <b>${pendingReviews.length}</b>`,
        ``,
        `⏰ ${now.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
      ].join("\n");

      await sendTelegramMessageToChat(chatId, statsText);
    } catch (e) {
      console.error("[TG Webhook] Error handling /stats:", e);
      await sendTelegramMessageToChat(chatId, "⚠️ Ошибка при получении статистики");
    }
  }

  // Always respond 200 to Telegram
  res.json({ ok: true });
});

export function registerTelegramWebhook(app: import("express").Express) {
  app.use(router);
}
