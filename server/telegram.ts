/**
 * Telegram Bot notification helper
 * Sends order notifications to the admin's Telegram chat AND all active recipients from DB
 */

import { getActiveTelegramRecipients } from "./db";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessageToChat(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set");
    return false;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[Telegram] sendMessage to ${chatId} failed:`, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[Telegram] sendMessage to ${chatId} error:`, e);
    return false;
  }
}

/**
 * Broadcast a message to:
 * 1. The main admin chat (TELEGRAM_ADMIN_CHAT_ID env var)
 * 2. All active recipients stored in the telegram_recipients DB table
 */
export async function broadcastTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — skipping broadcast");
    return;
  }

  const sentTo = new Set<string>();

  // 1. Always send to the main admin chat_id from env
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    await sendTelegramMessageToChat(adminChatId, text);
    sentTo.add(adminChatId);
  }

  // 2. Send to all active recipients from DB (skip duplicates)
  try {
    const recipients = await getActiveTelegramRecipients();
    for (const r of recipients) {
      if (!sentTo.has(r.chatId)) {
        await sendTelegramMessageToChat(r.chatId, text);
        sentTo.add(r.chatId);
      }
    }
  } catch (e) {
    console.error("[Telegram] Failed to load recipients from DB:", e);
  }
}

// Keep backward-compatible alias
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!chatId) return false;
  return sendTelegramMessageToChat(chatId, text);
}

export async function notifyNewReview(review: {
  productName: string;
  authorName: string;
  rating: number;
  comment: string;
  adminUrl?: string;
}): Promise<void> {
  const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);
  const message = [
    `💬 <b>Новый отзыв на сайте!</b>`,
    ``,
    `📦 <b>Товар:</b> ${review.productName}`,
    `👤 <b>Покупатель:</b> ${review.authorName}`,
    `${stars} <b>Оценка:</b> ${review.rating}/5`,
    ``,
    `📝 <b>Отзыв:</b>`,
    review.comment,
    ``,
    `⚠️ <i>Отзыв ожидает модерации. Одобрите или скройте в админ-панели.</i>`,
    review.adminUrl ? `🔗 <a href="${review.adminUrl}">Открыть панель отзывов</a>` : ``,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  await broadcastTelegramMessage(message);
}

export async function notifyNewSeller(seller: {
  name: string;
  phone: string;
  telegram?: string;
  description?: string;
  userId: number;
}): Promise<void> {
  const message = [
    `🏪 <b>Новая заявка продавца!</b>`,
    ``,
    `👤 <b>Имя:</b> ${seller.name}`,
    `📞 <b>Телефон:</b> ${seller.phone}`,
    seller.telegram ? `✈️ <b>Telegram:</b> ${seller.telegram}` : ``,
    seller.description ? `📝 <b>О себе:</b> ${seller.description}` : ``,
    ``,
    `⚠️ <i>Заявка ожидает одобрения. Проверьте в панели администратора.</i>`,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  await broadcastTelegramMessage(message);
}

export async function notifyNewOrder(order: {
  id: number;
  phone: string;
  address: string;
  items: Array<{ productName: string; quantity: number; price: string }>;
  total: string;
}): Promise<void> {
  const itemLines = order.items
    .map((item, i) => `  ${i + 1}. <b>${item.productName}</b> × ${item.quantity} — ${Number(item.price).toLocaleString("ru-RU")} so'm`)
    .join("\n");

  const message = [
    `🛒 <b>Yangi buyurtma #${order.id}!</b>`,
    ``,
    `📞 <b>Telefon:</b> ${order.phone}`,
    `📍 <b>Manzil:</b> ${order.address}`,
    ``,
    `📦 <b>Mahsulotlar:</b>`,
    itemLines,
    ``,
    `💰 <b>Jami:</b> ${Number(order.total).toLocaleString("ru-RU")} so'm`,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].join("\n");

  await broadcastTelegramMessage(message);
}
