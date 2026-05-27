import { useEffect } from "react";
import { Link } from "wouter";

const GOOGLE_MERCHANT_ID = 5766550284;

/** Inject Google Customer Reviews opt-in survey after order placement */
function injectGoogleCustomerReviews(orderId: number, email: string | null) {
  // Add platform.js script if not already present
  if (!document.querySelector('script[src*="apis.google.com/js/platform.js"]')) {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  // Estimated delivery: 7 days from now (UZ standard)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 7);
  const estimatedDelivery = deliveryDate.toISOString().split("T")[0];

  (window as any).renderOptIn = function () {
    (window as any).gapi?.load("surveyoptin", function () {
      (window as any).gapi.surveyoptin.render({
        merchant_id: GOOGLE_MERCHANT_ID,
        order_id: String(orderId),
        ...(email ? { email } : {}),
        delivery_country: "UZ",
        estimated_delivery_date: estimatedDelivery,
      });
    });
  };

  // If gapi already loaded, call directly
  if ((window as any).gapi) {
    (window as any).renderOptIn();
  }
}

export default function OrderSuccessModal({
  orderNumber,
  customerName,
  customerEmail,
  orderItems,
  onClose,
}: {
  orderNumber: number;
  customerName: string;
  customerEmail?: string | null;
  orderItems?: Array<{ productId: number; name: string; price: number; quantity: number; imageUrl?: string }>;
  onClose: () => void;
}) {
  // Inject Google Customer Reviews opt-in
  useEffect(() => {
    injectGoogleCustomerReviews(orderNumber, customerEmail ?? null);
  }, [orderNumber, customerEmail]);

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
