import { useEffect } from "react";
import { Link } from "wouter";

export default function OrderSuccessModal({
  orderNumber,
  customerName,
  onClose,
}: {
  orderNumber: number;
  customerName: string;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in-95 duration-300">

        {/* Animated checkmark */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Спасибо за заказ!
        </h2>
        {customerName && (
          <p className="text-gray-500 text-sm mb-1">{customerName},</p>
        )}
        <p className="text-gray-500 mb-4">
          Ваш заказ <span className="font-semibold text-gray-800">#{orderNumber}</span> принят
        </p>

        {/* Info block */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center gap-2 text-blue-700">
            <span>📞</span>
            <span className="text-sm">Наш менеджер свяжется с вами в ближайшее время</span>
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <span>⚡</span>
            <span className="text-sm">Обычно звоним в течение 30 минут</span>
          </div>
          <div className="flex items-center gap-2 text-blue-700">
            <span>💬</span>
            <span className="text-sm">Также пришлём уведомление в Telegram</span>
          </div>
        </div>

        {/* Order number block */}
        <div className="bg-gray-50 rounded-xl p-3 mb-6">
          <p className="text-xs text-gray-500 mb-1">Номер вашего заказа</p>
          <p className="text-xl font-bold text-gray-900">#{orderNumber}</p>
          <p className="text-xs text-gray-400 mt-1">Сохраните для отслеживания</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Продолжить покупки
          </button>
          <Link
            href={`/order/${orderNumber}`}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Отследить заказ
          </Link>
        </div>
      </div>
    </div>
  );
}
