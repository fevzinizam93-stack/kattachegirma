import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Crown, Search, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const { totalItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCurrMenu, setShowCurrMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    <header className="sticky top-0 z-50 bg-red-600 shadow-md" translate="no">
      {/* ── Desktop row ── */}
      <div className="hidden md:block">
        <div className="container py-2.5 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 min-w-fit">
            <div className="flex items-center justify-center w-9 h-9">
              <img src="/manus-storage/kattachegirma-logo-white_0c7831ed.png" alt="KC" className="h-9 w-auto object-contain" />
            </div>
            <div className="leading-tight">
              <div className="font-black text-sm text-white">Katta Chegirma!!!</div>
            </div>
          </Link>

          {/* Premium section button */}
          <Link
            href="/premium"
            className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition-all whitespace-nowrap flex items-center gap-1 ${
              location === "/premium"
                ? "bg-gradient-to-r from-[#d4af37] to-[#f0d060] text-black border-[#d4af37] shadow-[0_0_14px_rgba(212,175,55,0.5)]"
                : "bg-gradient-to-r from-[#d4af37]/90 to-[#f0d060]/90 text-black border-[#d4af37] hover:from-[#d4af37] hover:to-[#f0d060] hover:shadow-[0_0_12px_rgba(212,175,55,0.4)]"
            }`}
          >
            <span>◈</span>
            <span>{t.nav_premium}</span>
          </Link>

          {/* About link */}
          <Link
            href="/about"
            className={`shrink-0 text-sm font-medium px-3 py-2 rounded-full transition-colors whitespace-nowrap ${
              location === "/about" ? "bg-red-700 text-white" : "text-white/90 hover:bg-red-700 hover:text-white"
            }`}
          >
            {t.nav_about}
          </Link>

          {/* Seller button */}
          <Link
            href="/seller/register"
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border-2 border-white text-white hover:bg-white hover:text-red-600 transition-colors whitespace-nowrap"
          >
            {t.nav_become_seller}
          </Link>

          {/* Search bar — red border */}
          <div className="flex-1 relative">
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
                <button type="button" onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="text-gray-400 hover:text-gray-600 px-2 outline-none">
                  <X size={14} />
                </button>
              )}
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-5 self-stretch flex items-center justify-center text-sm font-medium transition-colors shrink-0">
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
            {/* Bestsellers */}
            <Link href="/bestsellers" className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-red-700 transition-colors ${location === "/bestsellers" ? "bg-red-700" : ""}`}>
              <span className="text-lg leading-none">🔥</span>
              <span className="text-[10px] text-white/90 whitespace-nowrap">{t.nav_bestsellers}</span>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors relative">
              <div className="relative">
                <ShoppingCart size={20} className="text-white" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalItems > 9 ? "9+" : totalItems}</span>
                )}
              </div>
              <span className="text-[10px] text-white/90 whitespace-nowrap">{t.nav_cart}</span>
            </Link>

            {/* User / Login */}
            {isAuthenticated ? (
              <Link href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700">{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</div>
                <span className="text-[10px] text-white/90 max-w-[60px] truncate">{user?.name?.split(" ")[0]}</span>
              </Link>
            ) : (
              <button onClick={() => onOpenAuth?.()} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors border border-white/30">
                <User size={18} className="text-white" />
                <span className="text-[10px] text-white/90 whitespace-nowrap">{t.nav_login}</span>
              </button>
            )}

            {/* Admin link */}
            {isAuthenticated && user?.role === "admin" && (
              <Link href="/admin" className="text-red-600 text-xs font-bold px-2 py-1 bg-white rounded-lg hover:bg-red-50 transition-colors">Admin</Link>
            )}

            {/* VIP badge */}
            {isAuthenticated && user?.role === "vip" && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff' }}>
                <Crown size={12} />
                <span>VIP</span>
              </div>
            )}

            {/* Currency switcher */}
            <div className="relative" ref={currMenuRef}>
              <button
                onClick={() => { setShowCurrMenu((v) => !v); }}
                className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg hover:bg-red-700 transition-colors cursor-pointer select-none"
              >
                <span className="text-base leading-none">{currency === "uzs" ? "🇺🇿" : "🇺🇸"}</span>
                <span className="text-[10px] text-white/90 font-medium flex items-center gap-0.5">
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

            {/* Language fixed to Russian — switcher removed */}
          </div>
        </div>
      </div>

      {/* ── Mobile header ── */}
      <div className="md:hidden">
        {/* Top row: logo + name only */}
        <div className="flex items-center px-3 pt-2 pb-1">
          <Link href="/" className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 shrink-0">
              <img src="/manus-storage/kattachegirma-logo-white_0c7831ed.png" alt="KC" className="h-8 w-auto object-contain" />
            </div>
            <span className="font-black text-sm leading-tight truncate text-white">Katta Chegirma!!!</span>
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
