import { useRef, useState, type PointerEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X } from "lucide-react";

interface Props {
  imageUrl: string;
  onClose: () => void;
  onCropped: (res: { url: string; thumbUrl: string }) => void;
}

export default function CropModal({ imageUrl, onClose, onCropped }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [sel, setSel] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ startX: number; startY: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const uploadMut = trpc.products.importUploadImage.useMutation();

  function rel(e: PointerEvent) {
    const r = imgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(r.width, e.clientX - r.left)),
      y: Math.max(0, Math.min(r.height, e.clientY - r.top)),
    };
  }
  function onDown(e: PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { x, y } = rel(e);
    setDrag({ startX: x, startY: y });
    setSel({ x, y, w: 0, h: 0 });
  }
  function onMove(e: PointerEvent) {
    if (!drag) return;
    const { x, y } = rel(e);
    setSel({
      x: Math.min(drag.startX, x),
      y: Math.min(drag.startY, y),
      w: Math.abs(x - drag.startX),
      h: Math.abs(y - drag.startY),
    });
  }
  function onUp() { setDrag(null); }

  async function handleCrop() {
    const img = imgRef.current;
    if (!img || !sel || sel.w < 5 || sel.h < 5) {
      toast.error("Выделите область обрезки");
      return;
    }
    setSaving(true);
    try {
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sel.w * scaleX);
      canvas.height = Math.round(sel.h * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas context unavailable");
      ctx.drawImage(
        img,
        sel.x * scaleX, sel.y * scaleY,
        sel.w * scaleX, sel.h * scaleY,
        0, 0, canvas.width, canvas.height,
      );
      const base64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1] ?? "";
      const res = await uploadMut.mutateAsync({ base64, filename: "crop.jpg" });
      onCropped(res);
      onClose();
      toast.success("Фото обрезано");
    } catch (err) {
      toast.error("Ошибка обрезки: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-4 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Обрезать фото</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">Зажмите мышь и выделите область товара.</p>
        <div className="relative inline-block select-none" style={{ touchAction: "none" }}>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="crop"
            className="max-h-[60vh] w-auto block"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            draggable={false}
          />
          {sel && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
              style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
            />
          )}
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleCrop}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Обрезаю..." : "Обрезать и сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
