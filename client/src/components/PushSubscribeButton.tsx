import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { usePushNotification } from "@/hooks/usePushNotification";

interface Props {
  orderId: number;
}

export default function PushSubscribeButton({ orderId }: Props) {
  const { state, subscribed, subscribe } = usePushNotification(orderId);

  if (state === "unsupported") return null;

  if (subscribed || state === "granted") {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <BellRing size={16} />
        <span>Уведомления включены</span>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <BellOff size={16} />
        <span>Уведомления заблокированы в браузере</span>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      className="flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors"
    >
      <Bell size={16} />
      Уведомить об изменении статуса
    </button>
  );
}
