import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

interface ScrollToTopProps {
  /** Порог прокрутки в пикселях, после которого кнопка становится видимой (по умолчанию 300) */
  threshold?: number;
}

export function ScrollToTop({ threshold = 300 }: ScrollToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Проверяем начальное состояние (если страница уже прокручена)
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Наверх"
      className={[
        // Позиционирование — над мобильным нижним навбаром (bottom-20) и чуть правее края
        "fixed bottom-20 right-4 z-50",
        // Форма и размер
        "flex items-center justify-center",
        "w-11 h-11 rounded-full",
        // Цвет и тень
        "bg-primary text-primary-foreground shadow-lg",
        // Hover / active
        "hover:bg-primary/90 active:scale-95",
        // Плавное появление/скрытие через opacity + translate
        "transition-all duration-300 ease-in-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
      ].join(" ")}
    >
      <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  );
}
