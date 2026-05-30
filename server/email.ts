// Бесплатная отправка писем через Resend (HTTPS API).
// Ключ берётся из настроек сервера: RESEND_API_KEY.
// Пока ключа нет — письма не отправляются, но сайт работает без ошибок.

const BASE_URL = "https://kattachegirma.uz";
const FROM = process.env.EMAIL_FROM || "Katta Chegirma <no-reply@kattachegirma.uz>";

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY не задан — письмо не отправлено:", subject, "→", to);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend ошибка:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] сбой отправки:", e);
    return false;
  }
}

function layout(title: string, body: string, btnText: string, btnUrl: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
    <h2 style="color:#cc0000;margin:0 0 16px">Katta Chegirma</h2>
    <p style="font-size:16px;font-weight:bold;margin:0 0 8px">${title}</p>
    <p style="font-size:14px;color:#555;line-height:1.5;margin:0 0 20px">${body}</p>
    <a href="${btnUrl}" style="display:inline-block;background:#cc0000;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:bold">${btnText}</a>
    <p style="font-size:12px;color:#999;margin:24px 0 0">Если вы не запрашивали это письмо — просто проигнорируйте его.</p>
  </div>`;
}

export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  return sendEmail(
    to,
    "Подтвердите вашу почту — Katta Chegirma",
    layout("Подтвердите вашу почту", "Нажмите кнопку ниже, чтобы подтвердить адрес почты. Это нужно для восстановления доступа к аккаунту.", "Подтвердить почту", url),
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  return sendEmail(
    to,
    "Сброс пароля — Katta Chegirma",
    layout("Сброс пароля", "Вы запросили сброс пароля. Нажмите кнопку ниже, чтобы задать новый пароль. Ссылка действует 1 час.", "Сбросить пароль", url),
  );
}
