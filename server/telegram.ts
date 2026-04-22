/**
 * Telegram Bot notification helper
 * Sends order notifications to the admin's Telegram chat
 */

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set");
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
      console.error("[Telegram] sendMessage failed:", err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[Telegram] sendMessage error:", e);
    return false;
  }
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

  await sendTelegramMessage(message);
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

  await sendTelegramMessage(message);
}
