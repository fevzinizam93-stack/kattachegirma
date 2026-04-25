import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Grid3X3, Flame, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { lang } = useLanguage();

  const labels = {
    home: lang === "uz" ? "Asosiy" : "Главная",
    catalog: lang === "uz" ? "Katalog" : "Каталог",
    hits: lang === "uz" ? "Hitlar" : "Хиты",
    cart: lang === "uz" ? "Savat" : "Корзина",
  };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const activeClass = "text-red-600";
  const inactiveClass = "text-gray-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-stretch h-14">
        {/* Главная */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/") ? activeClass : inactiveClass}`}
        >
          <Home size={22} strokeWidth={isActive("/") ? 2.5 : 1.8} />
          <span>{labels.home}</span>
        </Link>

        {/* Каталог */}
        <Link
          href="/catalog"
          className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/catalog") || isActive("/category") ? activeClass : inactiveClass}`}
        >
          <Grid3X3 size={22} strokeWidth={isActive("/catalog") || isActive("/category") ? 2.5 : 1.8} />
          <span>{labels.catalog}</span>
        </Link>

        {/* Хиты */}
        <Link
          href="/bestsellers"
          className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/bestsellers") ? activeClass : inactiveClass}`}
        >
          <Flame size={22} strokeWidth={isActive("/bestsellers") ? 2.5 : 1.8} />
          <span>{labels.hits}</span>
        </Link>

        {/* Корзина */}
        <Link
          href="/cart"
          className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/cart") || isActive("/checkout") ? activeClass : inactiveClass}`}
        >
          <div className="relative">
            <ShoppingCart size={22} strokeWidth={isActive("/cart") || isActive("/checkout") ? 2.5 : 1.8} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </div>
          <span>{labels.cart}</span>
        </Link>
      </div>
    </nav>
  );
}
