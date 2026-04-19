import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ChevronDown, Search, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const { totalItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

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
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
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
    return num.toLocaleString("ru-RU") + " " + t.common_sum;
  };

  const getProductName = (product: { name: string; nameUz?: string | null }) => {
    if (lang === "uz" && product.nameUz) return product.nameUz;
    return product.name;
  };

  const hasQuery = debouncedQuery.trim().length >= 1;

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div style={{ backgroundColor: "#cc0000" }} className="text-white">
        <div className="container py-2 flex items-center gap-3">
          <Link href="/" className="shrink-0 flex items-center gap-2 min-w-fit">
            <div className="bg-white rounded p-1 flex items-center justify-center w-10 h-10">
              <img src="/manus-storage/kattachegirma-logo_b5417617.png" alt="KC" className="h-8 w-auto object-contain" />
            </div>
            <div className="hidden sm:block">
              <div className="font-black text-sm leading-tight">Katta Chegirma<span className="text-yellow-300">!!!</span></div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Link href="/" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/" ? "bg-white/20" : ""}`}>{t.nav_home}</Link>
            <Link href="/catalog" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/catalog" ? "bg-white/20" : ""}`}>{t.nav_catalog}</Link>
            <Link href="/about" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/about" ? "bg-white/20" : ""}`}>{t.nav_about}</Link>
          </div>

          <div className="flex-1 relative">
            <form onSubmit={handleSearch} className="flex">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                onKeyDown={handleKeyDown}
                placeholder={t.nav_search_placeholder}
                className="flex-1 px-4 py-2 text-sm text-gray-900 bg-white rounded-l-md outline-none border-0 min-w-0"
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="bg-white text-gray-400 hover:text-gray-600 px-2 py-2 border-0 outline-none">
                  <X size={14} />
                </button>
              )}
              <button type="submit" className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-r-md transition-colors shrink-0">
                <Search size={16} />
              </button>
            </form>

            {showDropdown && hasQuery && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden z-50" style={{ maxHeight: "480px", overflowY: "auto" }}>
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    {t.nav_search_loading}
                  </div>
                )}
                {!isSearching && results.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">{t.nav_search_on_site}</div>
                    {results.map((product, idx) => (
                      <button key={product.id} type="button" className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50 transition-colors border-b border-gray-50 ${selectedIndex === idx ? "bg-red-50" : ""}`}
                        onClick={() => { navigate(`/product/${product.slug}`); setShowDropdown(false); setSearchQuery(""); }}>
                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>}
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
                      onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowDropdown(false); }}>
                      {t.nav_show_all_results} «{searchQuery}» →
                    </button>
                  </div>
                )}
                {!isSearching && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <div className="text-gray-400 text-3xl mb-2">🔍</div>
                    <p className="text-sm text-gray-500">{t.nav_not_found_on_site} «<strong>{searchQuery}</strong>»</p>
                    <p className="text-xs text-gray-400 mt-1">{lang === "uz" ? "Boshqa so'z bilan qidirib ko'ring" : "Попробуйте другое слово или модель"}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/cart" className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors">
              <div className="relative">
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{totalItems > 9 ? "9+" : totalItems}</span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium">{t.nav_cart}</span>
            </Link>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <Link href="/profile" className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase() ?? "U"}</div>
                  <span className="text-white/90 max-w-[100px] truncate">{user?.name?.split(" ")[0]}</span>
                </Link>
                {user?.role === "admin" && <Link href="/admin" className="text-yellow-300 text-xs hover:underline">{t.nav_admin}</Link>}
              </div>
            ) : (
              <button onClick={() => onOpenAuth?.()} className="hidden md:flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm">
                <User size={16} />
                <span>{t.nav_login}</span>
              </button>
            )}

            <div className="relative" ref={langMenuRef}>
              <button onClick={() => setShowLangMenu((v) => !v)} className="flex items-center gap-1 text-sm text-white/90 hover:text-white cursor-pointer select-none px-2 py-1 rounded hover:bg-white/10 transition-colors">
                <span>{lang === "ru" ? "🇷🇺" : "🇺🇿"}</span>
                <span className="font-medium">{lang === "ru" ? "RU" : "UZ"}</span>
                <ChevronDown size={12} className={`transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[130px]">
                  <button onClick={() => { setLang("ru"); setShowLangMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${lang === "ru" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇷🇺</span><span>Русский</span>{lang === "ru" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                  <button onClick={() => { setLang("uz"); setShowLangMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${lang === "uz" ? "bg-red-50 text-red-700 font-semibold" : "text-gray-700"}`}>
                    <span>🇺🇿</span><span>O'zbek</span>{lang === "uz" && <span className="ml-auto text-red-500">✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
