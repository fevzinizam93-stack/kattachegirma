import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Home, Grid3X3, Flame, ShoppingCart, Menu, User, Store, Crown, LogIn, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { t, lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const activeClass = "text-red-600";
  const inactiveClass = "text-gray-500";

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="flex items-stretch h-14">
          {/* Главная */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/") ? activeClass : inactiveClass}`}
          >
            <Home size={22} strokeWidth={isActive("/") ? 2.5 : 1.8} />
            <span>{t.nav_home}</span>
          </Link>

          {/* Каталог */}
          <Link
            href="/catalog"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/catalog") || isActive("/category") ? activeClass : inactiveClass}`}
          >
            <Grid3X3 size={22} strokeWidth={isActive("/catalog") || isActive("/category") ? 2.5 : 1.8} />
            <span>{t.nav_catalog}</span>
          </Link>

          {/* Хиты */}
          <Link
            href="/bestsellers"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/bestsellers") ? activeClass : inactiveClass}`}
          >
            <Flame size={22} strokeWidth={isActive("/bestsellers") ? 2.5 : 1.8} />
            <span>{t.nav_bestsellers}</span>
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
            <span>{t.nav_cart}</span>
          </Link>

          {/* Меню */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${menuOpen ? activeClass : inactiveClass}`}
          >
            <Menu size={22} strokeWidth={menuOpen ? 2.5 : 1.8} />
            <span>{lang === "uz" ? "Menyu" : "Меню"}</span>
          </button>
        </div>
      </nav>

      {/* Slide-up menu sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-safe max-h-[85vh] overflow-y-auto">
          <SheetHeader className="px-5 pb-2 border-b border-gray-100">
            <SheetTitle className="text-base font-black text-gray-900">
              {lang === "uz" ? "Menyu" : "Меню"}
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 py-3 space-y-1">

            {/* Profile / Login */}
            {isAuthenticated ? (
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-black text-red-700 shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">{lang === "uz" ? "Profilga o'tish" : "Перейти в профиль"}</div>
                </div>
              </Link>
            ) : (
              <a href={getLoginUrl()} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <LogIn size={18} className="text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.nav_login}</div>
                  <div className="text-xs text-gray-500">{lang === "uz" ? "Kirish yoki ro'yxatdan o'tish" : "Войти или зарегистрироваться"}</div>
                </div>
              </a>
            )}

            <div className="h-px bg-gray-100 my-1" />

            {/* Premium */}
            <Link href="/premium" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-yellow-50 active:bg-yellow-100 transition-colors">
              <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                <Crown size={18} className="text-yellow-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Premium</div>
                <div className="text-xs text-gray-500">{lang === "uz" ? "Original texnika" : "Оригинальная техника"}</div>
              </div>
            </Link>

            {/* Стать продавцом */}
            <Link href="/seller/register" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Store size={18} className="text-red-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">{t.nav_become_seller}</div>
                <div className="text-xs text-gray-500">{lang === "uz" ? "Do'koningizni oching" : "Откройте свой магазин"}</div>
              </div>
            </Link>

            {/* Admin */}
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-red-700" />
                </div>
                <div>
                  <div className="text-sm font-bold text-red-700">Admin</div>
                  <div className="text-xs text-gray-500">{lang === "uz" ? "Boshqaruv paneli" : "Панель управления"}</div>
                </div>
              </Link>
            )}

            <div className="h-px bg-gray-100 my-1" />

            {/* Language selector */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {lang === "uz" ? "Til" : "Язык"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang("ru")}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${lang === "ru" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇷🇺</span> Русский {lang === "ru" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
                <button
                  onClick={() => setLang("uz")}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${lang === "uz" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇺🇿</span> O'zbek {lang === "uz" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
              </div>
            </div>

            {/* Currency selector */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                {lang === "uz" ? "Valyuta" : "Валюта"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrency("uzs")}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${currency === "uzs" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇺🇿</span> Сум {currency === "uzs" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
                <button
                  onClick={() => setCurrency("usd")}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${currency === "usd" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇺🇸</span> Доллар ($) {currency === "usd" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
              </div>
            </div>

          </div>

          {/* Safe area spacer */}
          <div className="h-4" />
        </SheetContent>
      </Sheet>
    </>
  );
}
