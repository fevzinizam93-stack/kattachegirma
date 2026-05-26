import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Trash2, Send } from "lucide-react";
import { toast } from "sonner";

export default function AdminNotificationsTab() {
  const utils = trpc.useUtils();
  const { data: telegramRecipientsData, isLoading: telegramLoading } = trpc.telegram.listRecipients.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const telegramRecipients = telegramRecipientsData ?? [];
  const [newRecipientChatId, setNewRecipientChatId] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");

  const addRecipientMut = trpc.telegram.addRecipient.useMutation({
    onSuccess: () => { utils.telegram.listRecipients.invalidate(); setNewRecipientChatId(""); setNewRecipientName(""); toast.success("Получатель добавлен"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleRecipientMut = trpc.telegram.toggleRecipient.useMutation({
    onSuccess: () => utils.telegram.listRecipients.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const deleteRecipientMut = trpc.telegram.deleteRecipient.useMutation({
    onSuccess: () => { utils.telegram.listRecipients.invalidate(); toast.success("Получатель удалён"); },
    onError: (e) => toast.error(e.message),
  });
  const { data: webhookInfo } = trpc.telegram.getWebhookInfo.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const registerWebhookMut = trpc.telegram.registerWebhook.useMutation({
    onSuccess: (data) => toast.success(`Webhook зарегистрирован: ${data.webhookUrl}`),
    onError: (e) => toast.error(e.message),
  });
  const testTelegramMut = trpc.indexing.testTelegram.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`✅ Тест отправлен! Chat ID: ${data.chatId}`);
      } else {
        toast.error(`❌ Ошибка: ${data.error}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <h2 className="font-black text-lg mb-2 text-gray-900">Telegram уведомления</h2>
      <p className="text-sm text-gray-500 mb-5">При новом заказе уведомление поступит всем активным получателям в списке ниже.</p>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
        <div>
          <p className="font-bold text-green-800 text-sm">🧪 Тест Telegram уведомлений</p>
          <p className="text-green-700 text-xs mt-0.5">Отправить тестовое сообщение всем активным получателям</p>
        </div>
        <button
          onClick={() => testTelegramMut.mutate()}
          disabled={testTelegramMut.isPending}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          <Send size={14} />
          {testTelegramMut.isPending ? "Отправка..." : "Отправить тест"}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-sm text-blue-800">
        <p className="font-bold mb-1">ℹ️ Как узнать свой Chat ID?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Откройте Telegram и найдите бот <b>@userinfobot</b></li>
          <li>Напишите ему любое сообщение</li>
          <li>Бот ответит вашим <b>id</b> (например: 123456789)</li>
          <li>Скопируйте этот ID и вставьте в поле ниже</li>
          <li>Подчинённый должен отправить боту любое сообщение (например /start)</li>
        </ol>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h3 className="font-bold text-sm text-gray-700 mb-3">Добавить получателя</h3>
        <div className="flex gap-3 mb-3">
          <input
            value={newRecipientName}
            onChange={e => setNewRecipientName(e.target.value)}
            placeholder="Имя (например: Ахмад менеджер)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={newRecipientChatId}
            onChange={e => setNewRecipientChatId(e.target.value)}
            placeholder="Chat ID (123456789)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button
          onClick={() => {
            if (!newRecipientName.trim() || !newRecipientChatId.trim()) {
              toast.error("Заполните имя и Chat ID");
              return;
            }
            addRecipientMut.mutate({ chatId: newRecipientChatId.trim(), name: newRecipientName.trim() });
          }}
          disabled={addRecipientMut.isPending}
          className="w-full bg-primary text-white py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {addRecipientMut.isPending ? "Добавление..." : "Добавить получателя"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-sm text-gray-700 mb-3">Список получателей</h3>
        {telegramLoading ? (
          <p className="text-sm text-gray-400">Загрузка...</p>
        ) : telegramRecipients.length === 0 ? (
          <p className="text-sm text-gray-400">Пока нет дополнительных получателей. Уведомления идут только вам.</p>
        ) : (
          <div className="space-y-2">
            {telegramRecipients.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">Chat ID: {r.chatId}</p>
                </div>
                <button
                  onClick={() => toggleRecipientMut.mutate({ id: r.id, isActive: !r.isActive })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    r.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {r.isActive ? "Активен" : "Отключён"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Удалить получателя "${r.name}"?`)) {
                      deleteRecipientMut.mutate({ id: r.id });
                    }
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 mt-5">
        <h3 className="font-bold text-sm text-gray-700 mb-1">Inline-кнопки «Одобрить / Отклонить»</h3>
        <p className="text-xs text-gray-500 mb-3">
          Чтобы кнопки в Telegram работали, нужно зарегистрировать webhook. Нажмите кнопку один раз после публикации сайта.
        </p>
        {(webhookInfo as any)?.result?.url && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-xs text-green-800">
            <p className="font-bold mb-0.5">Webhook активен</p>
            <p className="break-all">{(webhookInfo as any).result.url}</p>
            {(webhookInfo as any).result.last_error_message && (
              <p className="text-red-600 mt-1">Ошибка: {(webhookInfo as any).result.last_error_message}</p>
            )}
          </div>
        )}
        <button
          onClick={() => registerWebhookMut.mutate({ siteUrl: window.location.origin })}
          disabled={registerWebhookMut.isPending}
          className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {registerWebhookMut.isPending ? "Регистрация..." : "Зарегистрировать Webhook"}
        </button>
      </div>
    </div>
  );
}
