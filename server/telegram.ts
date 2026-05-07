/**
 * Telegram Bot notification helper
 * Sends order notifications to the admin's Telegram chat AND all active recipients from DB
 */

import { getActiveTelegramRecipients } from "./db";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessageToChat(
  chatId: string,
  text: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
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
        ...extra,
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
 * Answer a callback_query (removes loading spinner on button)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`${TELEGRAM_API}/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

/**
 * Edit an existing message text (used to update after button press)
 */
export async function editMessageText(
  chatId: string,
  messageId: number,
  text: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("[Telegram] editMessageText error:", e);
  }
}

/**
 * Broadcast a message to:
 * 1. The main admin chat (TELEGRAM_ADMIN_CHAT_ID env var)
 * 2. All active recipients stored in the telegram_recipients DB table
 */
export async function broadcastTelegramMessage(
  text: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — skipping broadcast");
    return;
  }

  const sentTo = new Set<string>();

  // 1. Always send to the main admin chat_id from env
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    await sendTelegramMessageToChat(adminChatId, text, extra);
    sentTo.add(adminChatId);
  }

  // 2. Send to all active recipients from DB (skip duplicates)
  try {
    const recipients = await getActiveTelegramRecipients();
    for (const r of recipients) {
      if (!sentTo.has(r.chatId)) {
        await sendTelegramMessageToChat(r.chatId, text, extra);
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
  id: number;
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
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  // Inline keyboard with Approve / Reject buttons
  const inline_keyboard = [
    [
      { text: "✅ Одобрить", callback_data: `seller_approve:${seller.id}` },
      { text: "❌ Отклонить", callback_data: `seller_reject:${seller.id}` },
    ],
  ];

  await broadcastTelegramMessage(message, {
    reply_markup: { inline_keyboard },
  });
}

/**
 * Notify a seller via Telegram that their application was approved.
 * Sends directly to the seller's Telegram chat (not broadcast).
 */
export async function notifySellerApproved(seller: {
  name: string;
  telegram?: string | null;
}): Promise<void> {
  if (!seller.telegram) return; // Can't notify without Telegram handle

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  // Resolve chat_id: try @username or numeric ID
  const chatId = seller.telegram.trim().replace(/^@/, "");
  if (!chatId) return;

  const message = [
    `🎉 <b>Поздравляем! Ваша заявка продавца одобрена!</b>`,
    ``,
    `Уважаемый <b>${seller.name}</b>,`,
    ``,
    `Ваша заявка на размещение товаров на платформе <b>Katta Chegirma</b> успешно одобрена.`,
    ``,
    `✅ Теперь вы можете добавлять товары через личный кабинет продавца.`,
    `🌐 Сайт: <a href="https://kattachegirma.uz/seller/dashboard">kattachegirma.uz</a>`,
    ``,
    `Спасибо, что выбрали нашу площадку!`,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].join("\n");

  // Send to seller's Telegram username (as @username)
  await sendTelegramMessageToChat(`@${chatId}`, message);
}

/**
 * Notify admins about a new product added by a seller.
 * Includes inline buttons to approve or reject the product.
 */
export async function notifyNewProduct(product: {
  id: number;
  name: string;
  price: string;
  imageUrl?: string | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  categoryName?: string | null;
}): Promise<void> {
  const priceFormatted = Number(product.price).toLocaleString("ru-RU");

  const message = [
    `📦 <b>Новый товар от продавца!</b>`,
    ``,
    `🏷 <b>Название:</b> ${product.name}`,
    product.categoryName ? `📂 <b>Категория:</b> ${product.categoryName}` : ``,
    `💰 <b>Цена:</b> ${priceFormatted} сум`,
    ``,
    product.sellerName ? `🏪 <b>Продавец:</b> ${product.sellerName}` : ``,
    product.sellerPhone ? `📞 <b>Телефон:</b> ${product.sellerPhone}` : ``,
    ``,
    `⚠️ <i>Товар ожидает модерации. Одобрите или отклоните.</i>`,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  const inline_keyboard = [
    [
      { text: "✅ Одобрить товар", callback_data: `product_approve:${product.id}` },
      { text: "❌ Отклонить", callback_data: `product_reject:${product.id}` },
    ],
  ];

  await broadcastTelegramMessage(message, {
    reply_markup: { inline_keyboard },
  });
}

/**
 * Auto-register Telegram webhook URL with Telegram API.
 * Called once at server startup in production.
 */
export async function autoRegisterTelegramWebhook(webhookUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — skipping webhook registration");
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["callback_query", "message"],
        drop_pending_updates: false,
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (data.ok) {
      console.log(`[Telegram] Webhook registered: ${webhookUrl}`);
    } else {
      console.error(`[Telegram] Failed to register webhook: ${data.description}`);
    }
  } catch (e) {
    console.error("[Telegram] autoRegisterTelegramWebhook error:", e);
  }
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
