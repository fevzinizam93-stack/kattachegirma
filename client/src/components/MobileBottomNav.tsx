import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Grid3X3, Search, ShoppingCart, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuthModal } from "@/App";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { lang } = useLanguage();
  const { openLogin } = useAuthModal();
  const { isAuthenticated } = useAuth();

  const labels = {
    home: lang === "uz" ? "Asosiy" : "Главная",
    catalog: lang === "uz" ? "Katalog" : "Каталог",
    search: lang === "uz" ? "Qidiruv" : "Поиск",
    cart: lang === "uz" ? "Savat" : "Корзина",
    profile: lang === "uz" ? "Profil" : "Профиль",
  };

  const isActive = (path: string) => {
    if (path === "/" ) return location === "/";
    return location.startsWith(path);
  };

  const activeClass = "text-red-600";
  const inactiveClass = "text-gray-500";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden safe-area-bottom">
      <div className="flex items-stretch h-14">
        {/* Home */}
        <Link href="/" className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/") ? activeClass : inactiveClass}`}>
          <Home size={20} strokeWidth={isActive("/") ? 2.5 : 1.8} />
          <span>{labels.home}</span>
        </Link>

        {/* Catalog */}
        <Link href="/catalog" className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/catalog") || isActive("/category") ? activeClass : inactiveClass}`}>
          <Grid3X3 size={20} strokeWidth={isActive("/catalog") || isActive("/category") ? 2.5 : 1.8} />
          <span>{labels.catalog}</span>
        </Link>

        {/* Search */}
        <Link href="/search" className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/search") ? activeClass : inactiveClass}`}>
          <Search size={20} strokeWidth={isActive("/search") ? 2.5 : 1.8} />
          <span>{labels.search}</span>
        </Link>

        {/* Cart */}
        <Link href="/cart" className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/cart") || isActive("/checkout") ? activeClass : inactiveClass}`}>
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={isActive("/cart") || isActive("/checkout") ? 2.5 : 1.8} />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            )}
          </div>
          <span>{labels.cart}</span>
        </Link>

        {/* Profile */}
        {isAuthenticated ? (
          <Link href="/profile" className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/profile") ? activeClass : inactiveClass}`}>
            <User size={20} strokeWidth={isActive("/profile") ? 2.5 : 1.8} />
            <span>{labels.profile}</span>
          </Link>
        ) : (
          <button onClick={openLogin} className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${inactiveClass}`}>
            <User size={20} strokeWidth={1.8} />
            <span>{labels.profile}</span>
          </button>
        )}
      </div>
    </nav>
  );
}
