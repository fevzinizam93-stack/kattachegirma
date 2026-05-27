import { useCallback, useEffect, useRef, useState } from "react";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " млн";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + " тыс";
  return String(n);
}

export default function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 100_000,
}: PriceRangeSliderProps) {
  const [dragging, setDragging] = useState<"min" | "max" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Clamp and snap to step
  const snap = useCallback(
    (v: number) => Math.round(Math.max(min, Math.min(max, v)) / step) * step,
    [min, max, step]
  );

  const getPercent = (v: number) =>
    max === min ? 0 : ((v - min) / (max - min)) * 100;

  const getValueFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return snap(min + ratio * (max - min));
    },
    [min, max, snap]
  );

  // Mouse/touch move handler
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      const clientX =
        "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const newVal = getValueFromX(clientX);
      if (dragging === "min") {
        onChange([Math.min(newVal, value[1] - step), value[1]]);
      } else {
        onChange([value[0], Math.max(newVal, value[0] + step)]);
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, getValueFromX, onChange, value, step]);

  const minPct = getPercent(value[0]);
  const maxPct = getPercent(value[1]);

  return (
    <div className="px-1 pb-1 select-none">
      {/* Price labels */}
      <div className="flex justify-between text-xs text-muted-foreground mb-3">
        <span className="font-medium text-foreground">{formatPrice(value[0])}</span>
        <span className="font-medium text-foreground">{formatPrice(value[1])}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-1.5 rounded-full bg-border cursor-pointer"
        onClick={(e) => {
          // Click on track — move nearest handle
          const clicked = getValueFromX(e.clientX);
          const distMin = Math.abs(clicked - value[0]);
          const distMax = Math.abs(clicked - value[1]);
          if (distMin <= distMax) {
            onChange([Math.min(clicked, value[1] - step), value[1]]);
          } else {
            onChange([value[0], Math.max(clicked, value[0] + step)]);
          }
        }}
      >
        {/* Active range fill */}
        <div
          className="absolute top-0 h-full rounded-full bg-primary"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />

        {/* Min handle */}
        <button
          type="button"
          aria-label="Минимальная цена"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/40 z-10"
          style={{ left: `${minPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); setDragging("min"); }}
          onTouchStart={(e) => { e.stopPropagation(); setDragging("min"); }}
        />

        {/* Max handle */}
        <button
          type="button"
          aria-label="Максимальная цена"
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-primary shadow cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary/40 z-10"
          style={{ left: `${maxPct}%` }}
          onMouseDown={(e) => { e.preventDefault(); setDragging("max"); }}
          onTouchStart={(e) => { e.stopPropagation(); setDragging("max"); }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>
    </div>
  );
}
