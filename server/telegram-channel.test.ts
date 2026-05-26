import { describe, it, expect } from "vitest";

describe("Telegram Channel Connection", () => {
  it("should have TELEGRAM_CHANNEL_ID set", () => {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    expect(channelId).toBeTruthy();
    expect(channelId!.length).toBeGreaterThan(0);
  });

  it("should be able to send a test message to the channel", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!token || !channelId) {
      console.warn("Skipping: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set");
      return;
    }

    // Support both @username and numeric ID formats
    // If numeric without @, try with -100 prefix (supergroup/channel format)
    let chatId: string = channelId!;
    if (/^\d+$/.test(chatId)) {
      chatId = `-100${chatId}`;
    } else if (/^-\d+$/.test(chatId) && !chatId.startsWith("-100")) {
      chatId = chatId; // already has minus
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ *Katta Chegirma* — Telegram kanal muvaffaqiyatli ulandi!",
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json() as any;
    if (!data.ok) {
      console.error("Telegram API error:", data.description);
    }
    expect(data.ok).toBe(true);
  }, 15000);
});
