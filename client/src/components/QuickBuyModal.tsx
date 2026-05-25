import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Zap, Phone, User, CheckCircle2, Loader2 } from "lucide-react";

interface QuickBuyModalProps {
  open: boolean;
  onClose: () => void;
  productId?: number;
  productName: string;
  productPrice?: string;
}

// Uzbekistan phone: +998 (operator) XXXXXXX
// Valid operators: 33,50,55,77,88,90,91,93,94,95,97,98,99
const UZ_PHONE_RE = /^\+998(33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/;

function formatUzPhone(raw: string): string {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  if (digits.startsWith("8") || digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  if (!digits) return "+998";
  let out = "+998";
  if (digits.length > 0) out += " " + digits.slice(0, 2);
  if (digits.length > 2) out += " " + digits.slice(2, 5);
  if (digits.length > 5) out += "-" + digits.slice(5, 7);
  if (digits.length > 7) out += "-" + digits.slice(7, 9);
  return out;
}

export default function QuickBuyModal({
  open,
  onClose,
  productId,
  productName,
  productPrice,
}: QuickBuyModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const createOrder = trpc.quickOrders.create.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error("Ошибка при отправке заявки. Попробуйте ещё раз.");
      console.error("[QuickBuy] error:", err);
    },
  });

  function handlePhoneChange(raw: string) {
    const formatted = formatUzPhone(raw);
    setPhone(formatted);
    const stripped = formatted.replace(/[\s\-]/g, "");
    if (stripped.length > 4 && !UZ_PHONE_RE.test(stripped)) {
      setPhoneError("Введите корректный номер: +998 XX XXX-XX-XX");
    } else {
      setPhoneError("");
    }
  }

  const phoneStripped = phone.replace(/[\s\-]/g, "");
  const phoneValid = UZ_PHONE_RE.test(phoneStripped);
  const phoneHasInput = phoneStripped.length > 4;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Введите ваше имя");
      return;
    }
    if (!phoneValid) {
      setPhoneError("Введите корректный номер Узбекистана: +998 XX XXX-XX-XX");
      toast.error("Некорректный номер телефона");
      return;
    }
    createOrder.mutate({
      productId: productId ?? 0,
      productName,
      productPrice: productPrice ?? "0",
      customerName: name.trim(),
      customerPhone: phoneStripped,
    });
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setPhoneError("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        {!submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap size={16} className="text-primary" />
                </span>
                Купить в 1 клик
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                Оставьте имя и телефон — наш менеджер перезвонит в течение 15 минут и оформит заказ.
              </DialogDescription>
            </DialogHeader>

            {/* Product info */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 text-sm">
              <p className="text-gray-500 text-xs mb-0.5">Товар</p>
              <p className="font-semibold text-gray-900 line-clamp-2">{productName}</p>
              {productPrice && (
                <p className="text-primary font-bold mt-1">{productPrice} сум</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-1">
              {/* Name field */}
              <div className="space-y-1.5">
                <Label htmlFor="qb-name" className="text-sm font-medium">
                  Ваше имя *
                </Label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="qb-name"
                    placeholder="Например: Алишер"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    maxLength={128}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Phone field with UZ mask */}
              <div className="space-y-1.5">
                <Label htmlFor="qb-phone" className="text-sm font-medium">
                  Номер телефона *
                </Label>
                <div className="relative">
                  <Phone
                    size={15}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                      phoneError ? "text-red-400" : phoneValid ? "text-green-500" : "text-gray-400"
                    }`}
                  />
                  <input
                    id="qb-phone"
                    placeholder="+998 90 123-45-67"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onFocus={() => { if (!phone) setPhone("+998 "); }}
                    inputMode="tel"
                    maxLength={17}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                      phoneError
                        ? "border-red-400 focus:ring-red-300 bg-red-50"
                        : phoneValid
                          ? "border-green-400 focus:ring-green-300 bg-green-50"
                          : "border-gray-200 focus:ring-primary/30"
                    }`}
                  />
                </div>

                {/* Error message */}
                {phoneError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span>⚠</span> {phoneError}
                  </p>
                )}

                {/* Success message */}
                {phoneValid && !phoneError && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span> Номер корректный
                  </p>
                )}

                {/* Format hint */}
                {!phoneHasInput && !phoneError && (
                  <p className="text-xs text-gray-400">Формат: +998 90 123-45-67</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-bold bg-primary hover:bg-primary/90"
                disabled={createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Отправляем...
                  </>
                ) : (
                  <>
                    <Zap size={16} className="mr-2" />
                    Отправить заявку
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                Нажимая кнопку, вы соглашаетесь на обработку персональных данных
              </p>
            </form>
          </>
        ) : (
          /* Success state */
          <div className="flex flex-col items-center py-6 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Заявка принята!</h3>
              <p className="text-gray-500 text-sm">
                Спасибо, <span className="font-semibold text-gray-700">{name}</span>!<br />
                Наш менеджер перезвонит вам на номер<br />
                <span className="font-semibold text-gray-700">{phone}</span> в течение 15 минут.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-2 px-8">
              Закрыть
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
