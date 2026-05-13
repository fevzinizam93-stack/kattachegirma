import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Phone, User, CheckCircle2, Loader2 } from "lucide-react";

interface QuickBuyModalProps {
  open: boolean;
  onClose: () => void;
  productId?: number;
  productName: string;
  productPrice?: string;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Пожалуйста, заполните все поля");
      return;
    }
    createOrder.mutate({
      productId,
      productName,
      productPrice,
      customerName: name.trim(),
      customerPhone: phone.trim(),
    });
  };

  const handleClose = () => {
    // Reset state on close
    setName("");
    setPhone("");
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
              <div className="space-y-1.5">
                <Label htmlFor="qb-name" className="text-sm font-medium">
                  Ваше имя
                </Label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="qb-name"
                    placeholder="Например: Алишер"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    maxLength={128}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qb-phone" className="text-sm font-medium">
                  Номер телефона
                </Label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="qb-phone"
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9"
                    type="tel"
                    maxLength={64}
                    required
                  />
                </div>
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
