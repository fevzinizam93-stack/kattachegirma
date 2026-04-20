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
