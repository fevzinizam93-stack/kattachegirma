import { useCart } from "@/contexts/CartContext";
import { useLanguage, getLocalizedPath } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Bell, ChevronDown, ChevronRight, Heart, LayoutGrid, Search, ShoppingCart, User, X, Youtube } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavbarProps {
  onOpenAuth?: (redirectPath?: string) => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCurrMenu, setShowCurrMenu] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const catalogModalRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: sellerProfile } = trpc.sellers.me.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 });
  const { data: notifData, refetch: refetchNotifs } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000, // poll every 60s (was 30s) — reduce server load
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
  const { data: catalogCategories = [] } = trpc.categories.list.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  const { data: searchResults, isLoading: isSearching } = trpc.products.list.useQuery(
    { search: debouncedQuery, limit: 6 },
    { enabled: debouncedQuery.trim().length >= 1 }
  );
  const results = searchResults?.items ?? [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        currMenuRef.current && !currMenuRef.current.contains(e.target as Node)
      ) {
        setShowCurrMenu(false);
      }
      if (
        notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifDropdown(false);
      }
      if (
        langMenuRef.current && !langMenuRef.current.contains(e.target as Node)
      ) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close catalog modal on outside click or Escape
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catalogModalRef.current && !catalogModalRef.current.contains(e.target as Node)) {
        setShowCatalogModal(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowCatalogModal(false);
    };
    if (showCatalogModal) {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", keyHandler);
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [showCatalogModal]);

  // Handle language switch with URL navigation
  const handleLangSwitch = (newLang: "ru" | "uz") => {
    if (newLang === lang) return;
    const cats = (categoriesData ?? []) as Array<{ slug: string; slugUz?: string | null }>;
    // For product pages, we need to get the product's slugUz from the current page data
    // We'll extract slug from URL and find it in the page context
    const prodRuMatch = location.match(/^\/product\/([^/]+)/);
    const prodUzMatch = location.match(/^\/mahsulot\/([^/]+)/);
    let productSlugMap: { slug: string; slugUz?: string | null } | null = null;
    if (prodRuMatch || prodUzMatch) {
      // Product slug mapping will be handled by reading data attribute from DOM
      const el = document.querySelector('[data-product-slug-map]');
      if (el) {
        try {
          productSlugMap = JSON.parse(el.getAttribute('data-product-slug-map') || 'null');
        } catch { /* ignore */ }
      }
    }
    const newPath = getLocalizedPath(location, newLang, cats, productSlugMap);
    setLang(newLang);
    if (newPath !== location) {
      navigate(newPath);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowDropdown(false);
      setSearchQuery("");
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    const total = results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(total, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + Math.max(total, 1)) % Math.max(total, 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        navigate(`/product/${results[selectedIndex].slug}`);
        setShowDropdown(false);
        setSearchQuery("");
      }
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    if (currency === "usd") return `$${Math.round(num / 12700).toLocaleString("en-US")}`;
    return num.toLocaleString("ru-RU") + " " + t.common_sum;
  };

  const getProductName = (product: { name: string; nameUz?: string | null }) => {
    // Language fixed to Russian
    return product.name;
  };

  const hasQuery = debouncedQuery.trim().length >= 1;

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200" translate="no">
      {/* ── Desktop row ── */}
      <div className="hidden md:block">
        <div className="container flex items-center gap-4" style={{ height: "60px" }}>
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 min-w-fit">
            <img src="/manus-storage/kc_logo_d6421d0d.png" alt="Katta Chegirma" className="object-contain shrink-0" style={{ height: "40px", width: "auto" }} width={120} height={40} fetchPriority="high" decoding="sync" />
            <div className="font-black text-gray-900 tracking-tight whitespace-nowrap" style={{ fontSize: "15px" }}>Katta Chegirma!!!</div>
          </Link>


          {/* Videos link */}
          <Link
            href="/videos"
            style={{ fontSize: "10px" }}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
              location === "/videos" ? "bg-red-50 text-red-600" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Youtube size={12} className="text-red-500 shrink-0" />
            <span>Видеообзоры</span>
          </Link>

          {/* About link */}
          <Link
            href="/about"
            style={{ fontSize: "10px" }}
            className={`shrink-0 font-medium px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap ${
              location === "/about" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {t.nav_about}
          </Link>

          {/* Catalog button with dropdown modal */}
          <div className="relative" ref={catalogModalRef}>
            <button
              onClick={() => setShowCatalogModal((v) => !v)}
              style={{ fontSize: "10px" }}
              className={`shrink-0 font-medium px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap flex items-center gap-1 ${
                showCatalogModal ? "bg-red-600 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <LayoutGrid size={12} />
              Каталог
              <ChevronDown size={11} className={`transition-transform duration-200 ${showCatalogModal ? "rotate-180" : ""}`} />
            </button>

            {/* Catalog categories dropdown */}
            {showCatalogModal && (
              <>
                {/* Затемнение фона */}
                <div
                  className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
                  onClick={() => setShowCatalogModal(false)}
                />

                {/* Мегаменю */}
                <div
                  className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100"
                  style={{ width: "480px", animation: "catalogSlideDown 0.2s ease-out" }}
                >
                  {/* Шапка */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} className="text-red-600" />
                      <p className="text-sm font-black text-gray-800">Все категории</p>
                      <span className="text-xs text-gray-400 font-normal">({catalogCategories.length})</span>
                    </div>
                    <button
                      onClick={() => setShowCatalogModal(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Список категорий — чистый стиль */}
                  <div className="grid grid-cols-2 gap-1 p-3">
                    {catalogCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/category/${cat.slug}`}
                        onClick={() => setShowCatalogModal(false)}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group cursor-pointer ${
                          location === `/category/${cat.slug}`
                            ? "bg-red-600 text-white"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <span className={`text-sm font-medium ${
                          location === `/category/${cat.slug}` ? "text-white" : "text-gray-700 group-hover:text-gray-900"
                        }`}>
                          {lang === "uz" && (cat as any).nameUz ? (cat as any).nameUz : cat.name}
                        </span>
                        <ChevronRight
                          size={14}
                          className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                            location === `/category/${cat.slug}` ? "text-white/70" : "text-gray-300 group-hover:text-gray-500"
                          }`}
                        />
                      </Link>
                    ))}
                  </div>

                  {/* Футер */}
                  <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Нажмите на категорию для просмотра товаров</p>
                    <Link
                      href="/catalog"
                      onClick={() => setShowCatalogModal(false)}
                      className="flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                    >
                      Весь каталог →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Seller button */}
          {sellerProfile ? (
            <Link
              href="/seller/dashboard"
              style={{ fontSize: "10px" }}
              className="shrink-0 font-bold px-3 py-1.5 rounded-full border-2 border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-colors whitespace-nowrap"
            >
              + Добавить товар
            </Link>
          ) : (
            <Link
              href="/seller/register"
              style={{ fontSize: "10px" }}
              className="shrink-0 font-bold px-3 py-1.5 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
            >
              {t.nav_become_seller}
            </Link>
          )}

          {/* Search bar — red border */}
          <div className="relative" style={{ width: "390px", flexShrink: 0 }}>
            <form onSubmit={handleSearch} className="flex items-center border-2 border-red-500 rounded-full bg-white focus-within:border-red-600 transition-colors overflow-hidden h-10">
              <Search size={16} className="ml-4 text-gray-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                onKeyDown={handleKeyDown}
                placeholder={t.nav_search_placeholder}
                className="flex-1 px-3 py-2 text-sm text-gray-900 bg-transparent outline-none min-w-0"
                autoComplete="off"
              />
              {searchQuery && (
              <button type="button" aria-label="Очистить поиск" onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="text-gray-400 hover:text-gray-600 px-2 outline-none">
                <X size={14} />
              </button>
              )}
              <button type="submit" aria-label="Найти" className="bg-red-600 hover:bg-red-700 text-white px-5 self-stretch flex items-center justify-center text-sm font-medium transition-colors shrink-0">
                <Search size={15} />
              </button>
            </form>
            {/* Desktop dropdown */}
            {showDropdown && hasQuery && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    {t.common_searching}
                  </div>
                )}
                {!isSearching && results.length > 0 && (
                  <div>
                    {results.map((product, idx) => (
                      <button key={product.id} type="button"
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedIndex === idx ? "bg-red-50" : ""}`}
                        onMouseDown={(e) => { e.preventDefault(); navigate(`/product/${product.slug}`); setShowDropdown(false); setSearchQuery(""); }}>
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-1" loading="lazy" /> : <span className="text-xl">📦</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{getProductName(product)}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                            <span className="text-xs font-semibold text-red-600">{formatPrice(product.price)}</span>
                          </div>
                        </div>
                        <span className="text-gray-300 text-xs">→</span>
                      </button>
                    ))}
                    <button type="button" className="w-full px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors text-center border-b border-gray-100"
                      onMouseDown={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowDropdown(false); }}>
                      {t.nav_show_all_results} «{searchQuery}» →
                    </button>
                  </div>
                )}
                {!isSearching && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <div className="text-gray-400 text-3xl mb-2">🔍</div>
                    <p className="text-sm text-gray-500">«{searchQuery}» {t.common_not_found_query}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Notification Bell — only for authenticated users */}
            {isAuthenticated && (
              <div className="relative" ref={notifDropdownRef}>
                <button
                  onClick={() => setShowNotifDropdown((v) => !v)}
                  aria-label="Уведомления"
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors relative"
                >
                  <div className="relative">
                    <Bell size={20} className="text-gray-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">Уведомления</span>
                </button>

                {/* Notification dropdown */}
                {showNotifDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden" style={{ width: "340px" }}>
                    <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">Уведомления</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          Прочитать все
                        </button>
                      )}
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifList.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Нет уведомлений</p>
                        </div>
                      ) : (
                        notifList.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              if (!notif.isRead) markReadMutation.mutate({ id: notif.id });
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                              notif.isRead ? "opacity-70" : "bg-red-50/40"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {!notif.isRead && (
                                <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {new Date(notif.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                                {(notif as any).type === "message" && (
                                  <Link
                                    href="/seller/messages"
                                    onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); }}
                                    className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 transition-colors"
                                  >
                                    ✉️ Открыть сообщение
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wishlist */}
            <Link href="/favorites" aria-label="Избранное" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors relative">
              <div className="relative">
                <Heart size={20} className="text-gray-700" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{wishlistCount > 9 ? "9+" : wishlistCount}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 whitespace-nowrap">Избранное</span>
            </Link>
            {/* Cart */}
            <Link href="/cart" aria-label="Корзина" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors relative">
              <div className="relative">
                <ShoppingCart size={20} className="text-gray-700" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalItems > 9 ? "9+" : totalItems}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-600 whitespace-nowrap">{t.nav_cart}</span>
            </Link>

            {/* User / Login */}
            {isAuthenticated ? (
              <Link href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</div>
                <span className="text-[10px] text-gray-600 max-w-[60px] truncate">{user?.name?.split(" ")[0]}</span>
              </Link>
            ) : (
              <button onClick={() => onOpenAuth?.(location)} aria-label="Войти" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                <User size={18} className="text-gray-700" />
                <span className="text-[10px] text-gray-600 whitespace-nowrap">{t.nav_login}</span>
              </button>
            )}

            {/* Admin link */}
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="text-red-600 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Admin</Link>
            )}


            {/* Currency switcher */}
            <div className="relative" ref={currMenuRef}>
              <button
                onClick={() => { setShowCurrMenu((v) => !v); }}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer select-none"
              >
                <span className="text-base leading-none">{currency === "uzs" ? "🇺🇿" : "🇺🇸"}</span>
                <span className="text-[10px] text-gray-600 font-medium flex items-center gap-0.5">
                  {currency === "uzs" ? "сум" : "USD"}
                  <ChevronDown size={9} className={`transition-transform ${showCurrMenu ? "rotate-180" : ""}`} />
                </span>
              </button>
              {showCurrMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[130px]">
                  <button onClick={() => { setCurrency("uzs"); setShowCurrMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${currency === "uzs" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇺🇿</span><span>Сум (UZS)</span>{currency === "uzs" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                  <button onClick={() => { setCurrency("usd"); setShowCurrMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${currency === "usd" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇺🇸</span><span>Доллар ($)</span>{currency === "usd" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Language switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu((v) => !v)}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer select-none"
              >
                <span className="text-base leading-none">{lang === "ru" ? "🇷🇺" : "🇺🇿"}</span>
                <span className="text-[10px] text-gray-600 font-medium flex items-center gap-0.5">
                  {lang === "ru" ? "RU" : "UZ"}
                  <ChevronDown size={9} className={`transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
                </span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[130px]">
                  <button onClick={() => { handleLangSwitch("ru"); setShowLangMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${lang === "ru" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇷🇺</span><span>Русский</span>{lang === "ru" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                  <button onClick={() => { handleLangSwitch("uz"); setShowLangMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${lang === "uz" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇺🇿</span><span>O‘zbek</span>{lang === "uz" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile header ── */}
      <div className="md:hidden">
        {/* Top row: logo + name only */}
        <div className="flex items-center px-3 pt-2 pb-1">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <img src="/manus-storage/kc_logo_d6421d0d.png" alt="Katta Chegirma" className="h-10 w-auto object-contain shrink-0" width={120} height={40} fetchPriority="high" decoding="sync" />
            <div className="font-black text-base text-gray-900 tracking-tight">Katta Chegirma!!!</div>
          </Link>
        </div>

        {/* Search row */}
        <div className="px-3 pb-2 relative">
          <form onSubmit={handleSearch} className="flex items-center border-2 border-red-500 rounded-full bg-white focus-within:border-red-600 transition-colors overflow-hidden h-9">
            <Search size={14} className="ml-3 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
              onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
              onKeyDown={handleKeyDown}
              placeholder={t.nav_search_placeholder}
              className="flex-1 px-2 py-2 text-sm text-gray-900 bg-transparent outline-none min-w-0"
              autoComplete="off"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="text-gray-400 px-2 outline-none">
                <X size={14} />
              </button>
            )}
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-3 self-stretch flex items-center justify-center shrink-0 transition-colors">
              <Search size={15} />
            </button>
          </form>
          {/* Mobile search dropdown */}
          {showDropdown && hasQuery && (
            <div ref={dropdownRef} className="absolute top-full left-3 right-3 mt-0.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[60vh] overflow-y-auto">
              {isSearching && (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  {t.common_searching}
                </div>
              )}
              {!isSearching && results.length > 0 && (
                <div>
                  {results.map((product, idx) => (
                    <button key={product.id} type="button"
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${selectedIndex === idx ? "bg-red-50" : ""}`}
                      onMouseDown={(e) => { e.preventDefault(); navigate(`/product/${product.slug}`); setShowDropdown(false); setSearchQuery(""); inputRef.current?.blur(); }}>
                      <div className="w-9 h-9 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {product.imageUrl ? <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" /> : <span className="text-lg">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{getProductName(product)}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                          <span className="text-xs font-semibold text-red-600">{formatPrice(product.price)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button type="button" className="w-full px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors text-center"
                    onMouseDown={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowDropdown(false); inputRef.current?.blur(); }}>
                    {t.nav_show_all_results} «{searchQuery}» →
                  </button>
                </div>
              )}
              {!isSearching && results.length === 0 && (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-gray-500">«{searchQuery}» {t.common_not_found_query}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
