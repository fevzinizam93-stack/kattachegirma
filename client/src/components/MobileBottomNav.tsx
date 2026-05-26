import { useCart } from "@/contexts/CartContext";
import { useLanguage, getLocalizedPath } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Home, Grid3X3, Flame, Heart, ShoppingCart, Menu, Store, LogIn, ShieldCheck, Users, ChevronRight, LayoutGrid, Bell, Youtube, X } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";

export default function MobileBottomNav() {
  const [location] = useLocation();
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();
  const [, navigate] = useLocation();
  const { currency, setCurrency } = useCurrency();
  const { user, isAuthenticated } = useAuth();
  const { data: sellerProfile } = trpc.sellers.me.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 });
  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
  const { data: notifData, refetch: refetchNotifs } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000, // poll every 60s (was 30s)
    staleTime: 30000,
  });
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const markReadMutation = trpc.notifications.markRead.useMutation({ onSuccess: () => refetchNotifs() });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({ onSuccess: () => refetchNotifs() });
  const notifList = notifData ?? [];
  const unreadCount = unreadData?.count ?? 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const { count: wishlistCount } = useWishlist();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

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
            aria-label="Главная"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/") ? activeClass : inactiveClass}`}
          >
            <Home size={22} strokeWidth={isActive("/") ? 2.5 : 1.8} />
            <span>{t.nav_home}</span>
          </Link>

          {/* Каталог — открывает модалку категорий */}
          <button
            onClick={() => setCatalogOpen(true)}
            aria-label="Каталог"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[11px] font-semibold transition-colors ${isActive("/catalog") || isActive("/category") ? activeClass : inactiveClass}`}
          >
            <Grid3X3 size={22} strokeWidth={isActive("/catalog") || isActive("/category") ? 2.5 : 1.8} />
            <span>{t.nav_catalog}</span>
          </button>

          {/* Видео */}
          <Link
            href="/videos"
            aria-label="Видеообзоры"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/videos") ? activeClass : inactiveClass}`}
          >
            <Youtube size={22} strokeWidth={isActive("/videos") ? 2.5 : 1.8} />
            <span>Видео</span>
          </Link>

          {/* Избранное */}
          <Link
            href="/favorites"
            aria-label="Избранное"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${isActive("/favorites") ? activeClass : inactiveClass}`}
          >
            <div className="relative">
              <Heart size={22} strokeWidth={isActive("/favorites") ? 2.5 : 1.8} className={isActive("/favorites") ? "fill-current" : ""} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </div>
            <span>Избранное</span>
          </Link>
          {/* Корзина */}
          <Link
            href="/cart"
            aria-label="Корзина"
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
            aria-label="Меню"
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors ${menuOpen ? activeClass : inactiveClass}`}
          >
            <div className="relative">
              <Menu size={22} strokeWidth={menuOpen ? 2.5 : 1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <span>Меню</span>
          </button>
        </div>
      </nav>

      {/* Slide-up menu sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-safe max-h-[85vh] overflow-y-auto">
          <SheetHeader className="px-5 pb-2 border-b border-gray-100">
            <SheetTitle className="text-base font-black text-gray-900">
              Меню
            </SheetTitle>
          </SheetHeader>

          <div className="px-4 py-3 space-y-1">

            {/* Notifications section — only for authenticated users */}
            {isAuthenticated && (
              <>
                <button
                  onClick={() => setNotifOpen((v) => !v)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0 relative">
                    <Bell size={18} className="text-red-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-gray-900">Уведомления</div>
                    <div className="text-xs text-gray-500">
                      {unreadCount > 0 ? `${unreadCount} новых` : "Нет новых"}
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform duration-200 ${notifOpen ? "rotate-90" : ""}`} />
                </button>

                {notifOpen && (
                  <div className="ml-4 pl-3 border-l-2 border-red-100 space-y-0.5">
                    {notifList.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-400">Нет уведомлений</div>
                    ) : (
                      <>
                        {unreadCount > 0 && (
                          <button
                            onClick={() => markAllReadMutation.mutate()}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
                          >
                            Прочитать все
                          </button>
                        )}
                        {notifList.slice(0, 5).map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                              notif.isRead ? "text-gray-500 hover:bg-gray-50" : "bg-red-50/60 text-gray-800 hover:bg-red-50"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold leading-tight">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                                {(notif as any).type === "message" && (
                                  <Link
                                    href="/seller/messages"
                                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setNotifOpen(false); }}
                                    className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition-colors"
                                  >
                                    ✉️ Открыть сообщение
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className="h-px bg-gray-100 my-1" />
              </>
            )}

            {/* Profile / Login */}
            {isAuthenticated ? (
              <Link href="/profile" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-black text-red-700 shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">Перейти в профиль</div>
                </div>
              </Link>
            ) : (
              <Link href={`/login${location !== '/' ? `?redirect=${encodeURIComponent(location)}` : ''}`} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <LogIn size={18} className="text-gray-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.nav_login}</div>
                  <div className="text-xs text-gray-500">Войти или зарегистрироваться</div>
                </div>
              </Link>
            )}

            <div className="h-px bg-gray-100 my-1" />

            {/* Каталог — простая ссылка на страницу каталога */}
            <Link
              href="/catalog"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <LayoutGrid size={18} className="text-red-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Каталог</div>
                <div className="text-xs text-gray-500">Все категории товаров</div>
              </div>
              <ChevronRight size={16} className="text-gray-400 ml-auto" />
            </Link>

            {/* Видеообзоры */}
            <Link href="/videos" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Youtube size={18} className="text-red-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Видеообзоры</div>
                <div className="text-xs text-gray-500">502 видео канала @katta.chegirma</div>
              </div>
            </Link>


            {/* Продавцы */}
            <Link href="/sellers" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Users size={18} className="text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900">Продавцы</div>
                <div className="text-xs text-gray-500">Список всех продавцов</div>
              </div>
            </Link>

            {/* Стать продавцом / Добавить товар */}
            {sellerProfile ? (
              <Link href="/seller/dashboard" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-green-50 active:bg-green-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <Store size={18} className="text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">+ Добавить товар</div>
                  <div className="text-xs text-gray-500">Панель продавца</div>
                </div>
              </Link>
            ) : (
              <Link href="/seller/register" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <Store size={18} className="text-red-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{t.nav_become_seller}</div>
                  <div className="text-xs text-gray-500">Откройте свой магазин</div>
                </div>
              </Link>
            )}

            {/* Admin */}
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-red-700" />
                </div>
                <div>
                  <div className="text-sm font-bold text-red-700">Admin</div>
                  <div className="text-xs text-gray-500">Панель управления</div>
                </div>
              </Link>
            )}


            <div className="h-px bg-gray-100 my-1" />

            {/* Language selector */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Язык / Til</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (lang !== "ru") {
                      const cats = (categories ?? []) as Array<{ slug: string; slugUz?: string | null }>;
                      let productSlugMap: { slug: string; slugUz?: string | null } | null = null;
                      const el = document.querySelector('[data-product-slug-map]');
                      if (el) { try { productSlugMap = JSON.parse(el.getAttribute('data-product-slug-map') || 'null'); } catch {} }
                      const newPath = getLocalizedPath(location, "ru", cats, productSlugMap);
                      setLang("ru");
                      if (newPath !== location) navigate(newPath);
                      setMenuOpen(false);
                    }
                  }}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${lang === "ru" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇷🇺</span> Русский {lang === "ru" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
                <button
                  onClick={() => {
                    if (lang !== "uz") {
                      const cats = (categories ?? []) as Array<{ slug: string; slugUz?: string | null }>;
                      let productSlugMap: { slug: string; slugUz?: string | null } | null = null;
                      const el = document.querySelector('[data-product-slug-map]');
                      if (el) { try { productSlugMap = JSON.parse(el.getAttribute('data-product-slug-map') || 'null'); } catch {} }
                      const newPath = getLocalizedPath(location, "uz", cats, productSlugMap);
                      setLang("uz");
                      if (newPath !== location) navigate(newPath);
                      setMenuOpen(false);
                    }
                  }}
                  className={`flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${lang === "uz" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  <span>🇺🇿</span> O'zbek {lang === "uz" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
              </div>
            </div>

            {/* Currency selector */}
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Валюта</p>
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

      {/* Модальное окно каталога — мобильный */}
      {catalogOpen && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Затемнение */}
          <div
            className="flex-1 bg-black/50"
            onClick={() => setCatalogOpen(false)}
          />

          {/* Само окно — выезжает снизу */}
          <div
            className="bg-white rounded-t-3xl overflow-hidden"
            style={{
              maxHeight: "85vh",
              animation: "slideUp 0.25s ease-out"
            }}
          >
            {/* Ручка */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Шапка */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Grid3X3 size={18} className="text-red-600" />
                <h2 className="text-base font-black text-gray-900">Каталог</h2>
                <span className="text-xs text-gray-400">({categories.length} категорий)</span>
              </div>
              <button
                onClick={() => setCatalogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Сетка категорий — скроллится */}
            <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 140px)" }}>
              <div className="grid grid-cols-3 gap-2 p-4">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onClick={() => setCatalogOpen(false)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 ${
                      location === `/category/${cat.slug}`
                        ? "bg-red-50 border-2 border-red-200"
                        : "bg-gray-50 border-2 border-transparent"
                    }`}
                  >
                    {/* Иконка в кружке */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                      location === `/category/${cat.slug}` ? "bg-red-100" : "bg-white"
                    }`}>
                      {cat.icon ? cat.icon : "📦"}
                    </div>
                    <span className={`text-[11px] font-semibold text-center leading-tight line-clamp-2 ${
                      location === `/category/${cat.slug}` ? "text-red-700" : "text-gray-700"
                    }`}>
                      {lang === "uz" && (cat as any).nameUz ? (cat as any).nameUz : cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Футер — кнопка весь каталог */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white">
              <Link
                href="/catalog"
                onClick={() => setCatalogOpen(false)}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-red-600 text-white font-bold text-sm"
              >
                Весь каталог →
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
