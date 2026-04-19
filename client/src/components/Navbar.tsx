import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ExternalLink, Search, ShoppingCart, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

interface NavbarProps {
  onOpenAuth?: () => void;
}

export default function Navbar({ onOpenAuth }: NavbarProps) {
  const { totalItems } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: settingsRaw } = trpc.storeSettings.getAll.useQuery();
  const settings: Record<string, string> = {};
  if (Array.isArray(settingsRaw)) {
    (settingsRaw as { key: string; value: string }[]).forEach((s) => {
      settings[s.key] = s.value;
    });
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Instant search query
  const { data: searchResults, isLoading: isSearching } = trpc.products.list.useQuery(
    { search: debouncedQuery, limit: 6 },
    { enabled: debouncedQuery.trim().length >= 1 }
  );

  const results = searchResults?.items ?? [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
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
    const total = results.length + 2; // products + Google + Yandex
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        navigate(`/product/${results[selectedIndex].slug}`);
        setShowDropdown(false);
        setSearchQuery("");
      } else if (selectedIndex === results.length) {
        e.preventDefault();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery + " kattachegirma")}`, "_blank");
      } else if (selectedIndex === results.length + 1) {
        e.preventDefault();
        window.open(`https://yandex.ru/search/?text=${encodeURIComponent(searchQuery + " kattachegirma")}`, "_blank");
      }
    }
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return num.toLocaleString("ru-RU") + " сум";
  };

  const hasQuery = debouncedQuery.trim().length >= 1;

  return (
    <header className="sticky top-0 z-50 shadow-md">
      <div style={{ backgroundColor: "#cc0000" }} className="text-white">
        <div className="container py-2 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-2 min-w-fit">
            <div className="bg-white rounded p-1 flex items-center justify-center w-10 h-10">
              <img
                src="/manus-storage/kattachegirma-logo_b5417617.png"
                alt="KC"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <div className="font-black text-sm leading-tight">
                Katta Chegirma<span className="text-yellow-300">!!!</span>
              </div>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Link href="/" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/" ? "bg-white/20" : ""}`}>
              Главная
            </Link>
            <Link href="/catalog" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/catalog" ? "bg-white/20" : ""}`}>
              Каталог
            </Link>
            <Link href="/about" className={`px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors whitespace-nowrap ${location === "/about" ? "bg-white/20" : ""}`}>
              О нас
            </Link>
          </div>

          {/* Search bar with instant dropdown */}
          <div className="flex-1 relative">
            <form onSubmit={handleSearch} className="flex">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
                onKeyDown={handleKeyDown}
                placeholder="Поиск по названию, модели, цене, бренду..."
                className="flex-1 px-4 py-2 text-sm text-gray-900 bg-white rounded-l-md outline-none border-0 min-w-0"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setShowDropdown(false); }}
                  className="bg-white text-gray-400 hover:text-gray-600 px-2 py-2 border-0 outline-none"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="submit"
                className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-r-md transition-colors shrink-0"
              >
                <Search size={16} />
              </button>
            </form>

            {/* Dropdown */}
            {showDropdown && hasQuery && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-100 overflow-hidden z-50"
                style={{ maxHeight: "480px", overflowY: "auto" }}
              >
                {/* Loading */}
                {isSearching && (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    Поиск...
                  </div>
                )}

                {/* Product results */}
                {!isSearching && results.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      Товары на сайте
                    </div>
                    {results.map((product, idx) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-50 transition-colors border-b border-gray-50 ${selectedIndex === idx ? "bg-red-50" : ""}`}
                        onClick={() => {
                          navigate(`/product/${product.slug}`);
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                      >
                        {/* Product image */}
                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📦</div>
                          )}
                        </div>
                        {/* Product info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.brand && <span className="text-xs text-gray-400">{product.brand}</span>}
                            <span className="text-xs font-semibold text-red-600">{formatPrice(product.price)}</span>
                          </div>
                        </div>
                        {/* Arrow */}
                        <span className="text-gray-300 text-xs">→</span>
                      </button>
                    ))}
                    {/* See all results */}
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-sm text-red-600 font-medium hover:bg-red-50 transition-colors text-center border-b border-gray-100"
                      onClick={() => {
                        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        setShowDropdown(false);
                      }}
                    >
                      Показать все результаты для «{searchQuery}» →
                    </button>
                  </div>
                )}

                {/* No results on site */}
                {!isSearching && results.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-100">
                    На сайте ничего не найдено по «{searchQuery}»
                  </div>
                )}

                {/* External search: Google and Yandex */}
                <div className="bg-gray-50">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Поиск в интернете
                  </div>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery + " kattachegirma.uz")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors ${selectedIndex === results.length ? "bg-gray-100" : ""}`}
                    onClick={() => setShowDropdown(false)}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">Найти «<strong>{searchQuery}</strong>» в Google</span>
                    </div>
                    <ExternalLink size={12} className="text-gray-400" />
                  </a>
                  <a
                    href={`https://yandex.ru/search/?text=${encodeURIComponent(searchQuery + " kattachegirma.uz")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors ${selectedIndex === results.length + 1 ? "bg-gray-100" : ""}`}
                    onClick={() => setShowDropdown(false)}
                  >
                    <div className="w-6 h-6 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-5 h-5">
                        <path fill="#FC3F1D" d="M2.04 12c0-5.52 4.44-9.96 9.96-9.96S21.96 6.48 21.96 12 17.52 21.96 12 21.96 2.04 17.52 2.04 12z"/>
                        <path fill="#fff" d="M13.32 7.2h-.78c-1.44 0-2.22.72-2.22 1.86 0 1.26.54 1.86 1.68 2.64l.96.66-2.7 4.02H8.82l2.52-3.72c-1.44-.96-2.22-1.98-2.22-3.54 0-1.98 1.38-3.3 3.66-3.3h2.82v10.56h-2.28V7.2z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">Найти «<strong>{searchQuery}</strong>» в Яндексе</span>
                    </div>
                    <ExternalLink size={12} className="text-gray-400" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cart */}
            <Link href="/cart" className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors">
              <div className="relative">
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium">Корзина</span>
            </Link>

            {/* User */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 text-sm relative group">
                <Link href="/profile" className="flex items-center gap-1.5 hover:text-yellow-300 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  <span className="text-white/90 max-w-[100px] truncate">{user?.name?.split(" ")[0]}</span>
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" className="text-yellow-300 text-xs hover:underline">
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth?.()}
                className="hidden md:flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm"
              >
                <User size={16} />
                <span>Войти</span>
              </button>
            )}

            {/* Language */}
            <div className="hidden lg:flex items-center gap-1 text-sm text-white/80 cursor-pointer hover:text-white select-none">
              <span>🇷🇺</span>
              <span>RU</span>
              <ChevronDown size={12} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
