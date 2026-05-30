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

export async function editMessageCaption(
  chatId: string,
  messageId: number,
  caption: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/editMessageCaption`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, caption, parse_mode: "HTML", ...(extra ?? {}) }),
    });
  } catch (e) {
    console.error("[Telegram] editMessageCaption error:", e);
  }
}

export async function editMessageReplyMarkup(
  chatId: string,
  messageId: number,
  replyMarkup: Record<string, unknown>
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: replyMarkup }),
    });
  } catch (e) {
    console.error("[Telegram] editMessageReplyMarkup error:", e);
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
    console.error("[Telegram] ❌ TELEGRAM_BOT_TOKEN не задан!");
    return;
  }

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  console.log(`[Telegram] Отправляю сообщение. Chat ID: ${adminChatId}, Token: ${token.slice(0, 10)}...`);

  const sentTo = new Set<string>();

  // 1. Always send to the main admin chat_id from env
  if (adminChatId) {
    const result = await sendTelegramMessageToChat(adminChatId, text, extra);
    console.log(`[Telegram] Результат отправки в ${adminChatId}: ${result}`);
    sentTo.add(adminChatId);
  } else {
    console.error("[Telegram] ❌ TELEGRAM_ADMIN_CHAT_ID не задан!");
  }

  // 2. Send to all active recipients from DB (skip duplicates)
  try {
    const recipients = await getActiveTelegramRecipients();
    for (const r of recipients) {
      if (!sentTo.has(r.chatId)) {
        const result = await sendTelegramMessageToChat(r.chatId, text, extra);
        console.log(`[Telegram] Результат отправки в ${r.chatId}: ${result}`);
        sentTo.add(r.chatId);
      }
    }
  } catch (e) {
    console.error("[Telegram] Failed to load recipients from DB:", e);
  }
}

export async function sendTelegramPhotoToChat(
  chatId: string,
  photoUrl: string,
  caption: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML", ...(extra ?? {}) }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Telegram] sendPhoto to ${chatId} failed:`, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[Telegram] sendPhoto to ${chatId} error:`, e);
    return false;
  }
}

export async function broadcastTelegramPhoto(
  photoUrl: string,
  caption: string,
  extra?: Record<string, unknown>
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.error("[Telegram] \u274c TELEGRAM_BOT_TOKEN \u043d\u0435 \u0437\u0430\u0434\u0430\u043d!"); return; }
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const sentTo = new Set<string>();
  if (adminChatId) {
    const ok = await sendTelegramPhotoToChat(adminChatId, photoUrl, caption, extra);
    if (!ok) await sendTelegramMessageToChat(adminChatId, caption, extra);
    sentTo.add(adminChatId);
  }
  try {
    const recipients = await getActiveTelegramRecipients();
    for (const r of recipients) {
      if (!sentTo.has(r.chatId)) {
        const ok = await sendTelegramPhotoToChat(r.chatId, photoUrl, caption, extra);
        if (!ok) await sendTelegramMessageToChat(r.chatId, caption, extra);
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
  id: number;
  productName: string;
  authorName: string;
  rating: number;
  comment: string;
  adminUrl?: string;
  productImage?: string | null;
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
    (review.comment.length > 500 ? review.comment.slice(0, 500) + "…" : review.comment).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    ``,
    `↩️ <i>Чтобы ответить покупателю — ответьте (Reply) на это сообщение, и ваш текст появится под отзывом как «Ответ Katta Chegirma».</i>`,
    `⚠️ <i>Отзыв ожидает модерации. Одобрите или скройте.</i>`,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
    `🆔 #otziv${review.id}`,
  ].filter(Boolean).join("\n");

  const inline_keyboard = [
    [
      { text: "✅ Одобрить отзыв", callback_data: `review_approve:${review.id}` },
      { text: "🙈 Скрыть", callback_data: `review_hide:${review.id}` },
    ],
    [
      { text: "✍️ Ответить покупателю", callback_data: `review_reply:${review.id}` },
    ],
  ];

  // Абсолютный https URL фото (Telegram требует абсолютную ссылку)
  let photoUrl: string | null = null;
  if (review.productImage) {
    if (review.productImage.startsWith("http://") || review.productImage.startsWith("https://")) photoUrl = review.productImage;
    else if (review.productImage.startsWith("/")) photoUrl = `https://kattachegirma.uz${review.productImage}`;
    else photoUrl = `https://kattachegirma.uz/${review.productImage}`;
  }

  if (photoUrl) {
    await broadcastTelegramPhoto(photoUrl, message, { reply_markup: { inline_keyboard } });
  } else {
    await broadcastTelegramMessage(message, { reply_markup: { inline_keyboard } });
  }
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
 * Notify seller that their application was rejected with a reason.
 */
export async function notifySellerRejected(seller: {
  name: string;
  telegram?: string | null;
  reason: string;
}): Promise<void> {
  if (!seller.telegram) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const chatId = seller.telegram.trim().replace(/^@/, "");
  if (!chatId) return;
  const message = [
    `❌ <b>Katta Chegirma — Ariza rad etildi</b>`,
    ``,
    `Assalomu alaykum, <b>${seller.name}</b>!`,
    ``,
    `Afsuski, sizning so'rovingiz rad etildi.`,
    ``,
    `📋 <b>Sabab:</b> ${seller.reason}`,
    ``,
    `Agar savollaringiz bo'lsa, admin bilan bog'laning yoki qayta ariza bering:`,
    `🌐 <a href="https://kattachegirma.uz/seller">kattachegirma.uz/seller</a>`,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].join("\n");
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
  items: Array<{ productName: string; quantity: number; price: string; priceUsd?: number; imageUrl?: string }>;
  total: string;
  totalUsd?: number;
  customerName?: string;
}): Promise<void> {
  const fmtUsd = (n: number) => `$${Math.round(n).toLocaleString("ru-RU")}`;
  const itemLines = order.items
    .map((item, i) => {
      const sum = `${Number(item.price).toLocaleString("ru-RU")} so'm`;
      const usd = item.priceUsd ? ` / ${fmtUsd(item.priceUsd)}` : "";
      return `  ${i + 1}. <b>${item.productName}</b> × ${item.quantity} — ${sum}${usd}`;
    })
    .join("\n");

  const totalLine = order.totalUsd
    ? `💰 <b>Jami:</b> ${Number(order.total).toLocaleString("ru-RU")} so'm / ${fmtUsd(order.totalUsd)}`
    : `💰 <b>Jami:</b> ${Number(order.total).toLocaleString("ru-RU")} so'm`;

  const message = [
    `🛒 <b>YANGI BUYURTMA #${order.id}</b>`,
    ``,
    order.customerName ? `👤 <b>Mijoz:</b> ${order.customerName}` : null,
    `📞 <b>Telefon:</b> ${order.phone}`,
    `📍 <b>Manzil:</b> ${order.address}`,
    ``,
    `📦 <b>Mahsulotlar:</b>`,
    itemLines,
    ``,
    totalLine,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  // Inline keyboard for managers
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ Buyurtmani olaman", callback_data: `take_order:${order.id}` },
      ],
      [
        { text: "📞 Qo'ng'iroq qilish", callback_data: `call_customer:${order.id}` },
        { text: "❌ Rad etish", callback_data: `reject_order:${order.id}` },
      ],
    ],
  };

  // Фото первого товара как обложка (нужен абсолютный https-URL). Если фото нет
  // или подпись слишком длинная для фото-сообщения — отправляем текстом.
  const rawImg = order.items.find((it) => it.imageUrl)?.imageUrl;
  let cover: string | undefined;
  if (rawImg) {
    cover = rawImg.startsWith("http")
      ? rawImg
      : `https://kattachegirma.uz${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;
  }

  if (cover && message.length <= 1000) {
    await broadcastTelegramPhoto(cover, message, { reply_markup: keyboard });
  } else {
    await broadcastTelegramMessage(message, { reply_markup: keyboard });
  }
}

/**
 * Notify customer in Telegram when a manager takes their order
 */
export async function notifyCustomer(
  phone: string,
  orderId: number,
  managerName: string
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  // Lazy import to avoid circular deps
  const { getUserByPhone } = await import("./db");
  const user = await getUserByPhone(phone);
  if (!(user as any)?.telegramId) return;

  const message = [
    `🎉 <b>Buyurtmangiz qabul qilindi!</b>`,
    ``,
    `📦 <b>#${orderId}</b> raqamli buyurtmangizni menejerimiz qabul qildi.`,
    ``,
    `👨‍💼 <b>${managerName}</b> tez orada siz bilan bog'lanadi.`,
    ``,
    `⏰ 30 daqiqa ichida qo'ng'iroqni kuting.`,
    ``,
    `<b>Katta Chegirma</b>ga ishonganingiz uchun rahmat! 🛒`,
  ].join("\n");

  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: (user as any).telegramId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("[Telegram] notifyCustomer error:", e);
  }
}

/**
 * Notify buyer via Telegram when admin changes order status.
 * Sends to buyer's telegramId if they have one linked.
 */
export async function notifyBuyerOrderStatus(params: {
  telegramId: string;
  orderId: number;
  status: "confirmed" | "delivered" | "cancelled";
  customerName?: string;
  totalAmount?: string;
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const statusMessages = {
    confirmed: {
      emoji: "✅",
      title: "Buyurtmangiz tasdiqlandi!",
      body: `<b>#${params.orderId}</b> raqamli buyurtmangiz tasdiqlandi va ishlov berishga topshirildi.\n\n⏰ Tez orada menejerimiz siz bilan bog'lanadi.`,
    },
    delivered: {
      emoji: "🎉",
      title: "Buyurtmangiz yetkazib berildi!",
      body: `<b>#${params.orderId}</b> raqamli buyurtmangiz muvaffaqiyatli yetkazib berildi.\n\nXarid uchun rahmat! Yana ko'ring 👇\n🌐 <a href="https://kattachegirma.uz">kattachegirma.uz</a>`,
    },
    cancelled: {
      emoji: "❌",
      title: "Buyurtmangiz bekor qilindi",
      body: `<b>#${params.orderId}</b> raqamli buyurtmangiz bekor qilindi.\n\nSavollar bo'lsa, biz bilan bog'laning:\n🌐 <a href="https://kattachegirma.uz">kattachegirma.uz</a>`,
    },
  };

  const s = statusMessages[params.status];
  const greeting = params.customerName ? `Assalomu alaykum, <b>${params.customerName}</b>!\n\n` : "";
  const message = [
    `${s.emoji} <b>Katta Chegirma — ${s.title}</b>`,
    ``,
    `${greeting}${s.body}`,
    params.totalAmount ? `\n💰 <b>Jami:</b> ${Number(params.totalAmount).toLocaleString("ru-RU")} so'm` : null,
    ``,
    `⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}`,
  ].filter(Boolean).join("\n");

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: params.telegramId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Telegram] notifyBuyerOrderStatus failed:`, err);
    }
  } catch (e) {
    console.error("[Telegram] notifyBuyerOrderStatus error:", e);
  }
}

// ─── Publish product to Telegram channel ───────────────────────────────────
export async function publishProductToChannel(product: {
  id: number;
  name: string;
  slug: string;
  price: string;
  originalPrice?: string | null;
  discount?: number | null;
  imageUrl?: string | null;
  brand?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let channelId = process.env.TELEGRAM_CHANNEL_ID; // e.g. @kattachegirmauz or 1976989683

  if (!token || !channelId) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set" };
  }

  // Normalize: if pure digits, add -100 prefix for channel/supergroup
  if (/^\d+$/.test(channelId)) {
    channelId = `-100${channelId}`;
  }

  // HTML escape helper — safe for Telegram HTML parse_mode
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Fetch real USD rate (same source as frontend CurrencyContext)
  let uzsPerUsd = 12700; // fallback
  try {
    const rateRes = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(5000) });
    if (rateRes.ok) {
      const rateData = await rateRes.json() as { rates: Record<string, number> };
      if (rateData.rates["UZS"]) uzsPerUsd = Math.round(rateData.rates["UZS"]);
    }
  } catch { /* use fallback */ }

  const price = Math.round(Number(product.price)).toLocaleString("ru-RU");
  const usdPrice = Math.round(Number(product.price) / uzsPerUsd);
  const hasDiscount = product.discount && product.discount > 0;

  // Original price: prefer explicit originalPrice field, fallback to back-calculating from discount
  let originalPriceNum: number | null = null;
  if (product.originalPrice && Number(product.originalPrice) > 0) {
    originalPriceNum = Math.round(Number(product.originalPrice));
  } else if (hasDiscount && product.discount && product.discount > 0) {
    // Back-calculate: currentPrice = originalPrice * (1 - discount/100)
    originalPriceNum = Math.round(Number(product.price) / (1 - product.discount / 100));
  }
  const originalPriceStr = originalPriceNum ? originalPriceNum.toLocaleString("ru-RU") : null;
  const originalUsdPrice = originalPriceNum ? Math.round(originalPriceNum / uzsPerUsd) : null;

  const url = `https://kattachegirma.uz/product/${product.slug}?utm_source=telegram&utm_medium=channel&utm_campaign=products`;

  // Normalize imageUrl — Telegram requires absolute https:// URL
  let photoUrl: string | null = null;
  if (product.imageUrl) {
    if (product.imageUrl.startsWith("http://") || product.imageUrl.startsWith("https://")) {
      photoUrl = product.imageUrl;
    } else if (product.imageUrl.startsWith("/")) {
      photoUrl = `https://kattachegirma.uz${product.imageUrl}`;
    } else {
      photoUrl = `https://kattachegirma.uz/${product.imageUrl}`;
    }
  }

  // Build caption in the requested format
  const caption = [
    `🏷️ <b>Katta Chegirmada!</b>`,
    `🛍 YANGI MAHSULOT`,
    `📦 ${esc(product.name)}`,
    product.brand ? `🏷 Brand: ${esc(product.brand)}` : null,
    hasDiscount && originalPriceStr && originalUsdPrice
      ? `❌ <s>${esc(originalPriceStr)} so'm ($${originalUsdPrice})</s>`
      : null,
    `✅ <b>${esc(price)} so'm ($${usdPrice})</b>`,
    `✅ Mavjud — Chegirmada olish uchun!`,
    `👇 <b>Onlayn buyurtma quyidagi tugma orqali:</b>`,
  ].filter(Boolean).join("\n");

  const inlineKeyboard = {
    inline_keyboard: [[
      { text: "🛒 Buyurtma berish", url },
      { text: "📋 Katalog", url: "https://kattachegirma.uz/catalog?utm_source=telegram&utm_medium=channel" },
    ]],
  };

  try {
    if (photoUrl) {
      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: channelId,
          photo: photoUrl,
          caption: caption,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard,
        }),
      });
      if (res.ok) return { success: true };
      const err = await res.text();
      // Log for debugging
      console.error("[Telegram] sendPhoto failed:", err);
      return { success: false, error: err };
    }

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });
    if (res.ok) return { success: true };
    const err = await res.text();
    console.error("[Telegram] sendMessage failed:", err);
    return { success: false, error: err };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Unknown error" };
  }
}
