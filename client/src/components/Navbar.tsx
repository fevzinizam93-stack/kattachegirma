import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ChevronDown, MapPin, Search, ShoppingCart, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: settingsRaw } = trpc.storeSettings.getAll.useQuery();

  const categories = categoriesData ?? [];
  const settings: Record<string, string> = {};
  if (Array.isArray(settingsRaw)) {
    (settingsRaw as { key: string; value: string }[]).forEach((s) => {
      settings[s.key] = s.value;
    });
  }

  const topCategories = categories.slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* ===== MAIN HEADER - RED ===== */}
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

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 flex max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="flex-1 px-4 py-2 text-sm text-gray-900 bg-white rounded-l-md outline-none border-0 min-w-0"
            />
            <button
              type="submit"
              className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-r-md transition-colors shrink-0"
            >
              <Search size={16} />
            </button>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-4 shrink-0">
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

            {/* Sellers */}
            <Link
              href="/seller"
              className="hidden md:flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-medium"
            >
              <User size={16} />
              Продавцы
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
                onClick={() => { setAuthTab("login"); setAuthOpen(true); }}
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

      {/* ===== CATEGORY NAV BAR - DARKER RED ===== */}
      <nav style={{ backgroundColor: "#a80000" }} className="text-white border-t border-red-900">
        <div className="container flex items-center overflow-x-auto scrollbar-hide">
          <Link
            href="/"
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-red-900 transition-colors ${location === "/" ? "bg-red-900" : ""}`}
          >
            Главная
          </Link>
          <Link
            href="/catalog"
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-red-900 transition-colors ${location === "/catalog" ? "bg-red-900" : ""}`}
          >
            Каталог
          </Link>
          {topCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-red-900 transition-colors ${location === `/category/${cat.slug}` ? "bg-red-900" : ""}`}
            >
              {cat.name}
            </Link>
          ))}
          {settings.address && (
            <Link
              href="/about"
              className="px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-red-900 transition-colors flex items-center gap-1"
            >
              <MapPin size={13} />
              Адреса
            </Link>
          )}
          <Link
            href="/about"
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap hover:bg-red-900 transition-colors ${location === "/about" ? "bg-red-900" : ""}`}
          >
            О нас
          </Link>
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </header>
  );
}
