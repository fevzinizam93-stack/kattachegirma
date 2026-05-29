// Расшифровка технических ошибок индексации в понятные причины + что делать.
export interface IndexNoteHelp { friendly: string; fix?: string; raw?: string; }

export function explainIndexNote(note?: string | null, status?: string | null): IndexNoteHelp | null {
  if (!note) {
    if (status === "error") return { friendly: "Причина не сохранена. Повторите отправку или проверьте логи сервера." };
    return null;
  }
  const n = note.toLowerCase();

  if (n.includes("quota") || n.includes("лимит") || n.includes("200 url") || n.includes("rate_limit")) {
    return {
      friendly: "Это НЕ ошибка сайта. Исчерпан дневной лимит Google Indexing API — 200 URL в сутки. URL сверх лимита не приняты.",
      fix: "Повторите завтра, либо нажмите «Отправить sitemap.xml» — он работает без лимита 200/день.",
      raw: note,
    };
  }
  if (n.includes("http 401") || n.includes("unauthorized") || n.includes("invalid_grant") || n.includes("invalid credentials")) {
    return {
      friendly: "Google отклонил запрос из-за авторизации: ключ сервисного аккаунта недействителен или истёк.",
      fix: "Проверьте JSON-ключ сервисного аккаунта в настройках сервера и срок его действия.",
      raw: note,
    };
  }
  if (n.includes("http 403") || n.includes("permission") || n.includes("forbidden")) {
    return {
      friendly: "Нет прав: сервисный аккаунт не добавлен владельцем в Google Search Console, либо не включён Indexing API.",
      fix: "В Search Console добавьте e-mail сервисного аккаунта как владельца ресурса и включите Indexing API в Google Cloud.",
      raw: note,
    };
  }
  if (n.includes("http 429") || n.includes("too many")) {
    return {
      friendly: "Слишком много запросов за короткое время — Google временно ограничил отправку.",
      fix: "Подождите несколько минут и повторите.",
      raw: note,
    };
  }
  if (n.includes("http 400") || n.includes("bad request")) {
    return {
      friendly: "Google не принял запрос: неверный формат URL или тела запроса.",
      fix: "Проверьте, что URL корректный (https://kattachegirma.uz/...) и страница доступна.",
      raw: note,
    };
  }
  if (n.includes("enotfound") || n.includes("etimedout") || n.includes("fetch failed") || n.includes("econnreset") || n.includes("network")) {
    return {
      friendly: "Сетевая ошибка: сервер не смог соединиться с Google.",
      fix: "Повторите позже; если повторяется — проверьте интернет/файрвол на сервере.",
      raw: note,
    };
  }
  if (status === "error" || status === "partial") {
    return { friendly: "Google вернул ошибку при отправке части или всех URL.", raw: note };
  }
  return null;
}
