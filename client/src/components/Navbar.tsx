import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { MapPin, Menu, Phone, Search, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const { totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const { data: settings } = trpc.storeSettings.getAll.useQuery();
  const categories = categoriesData ?? [];

  const s = (settings as Record<string, string>) ?? {};
  const storePhone = s.phone || "";
  const storeAddress = s.address || "";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const mainCategories = categories.slice(0, 7);

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Top bar - kırmızı */}
      <div className="bg-primary text-primary-foreground py-1.5">
        <div className="container">
          <div className="flex items-center justify-between text-xs">
            <span className="hidden sm:block">🔥 Katta chegirmalar har kuni! 🔥</span>
            <div className="flex items-center gap-4 ml-auto">
              {storePhone && (
                <a href={`tel:${storePhone}`} className="flex items-center gap-1 hover:text-white/80 transition-colors">
                  <Phone size={12} />
                  <span>{storePhone}</span>
                </a>
              )}
              {storeAddress && (
                <span className="hidden md:flex items-center gap-1">
                  <MapPin size={12} />
                  <span className="truncate max-w-[200px]">{storeAddress}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main navbar - beyaz */}
      <div className="bg-white border-b border-gray-200">
        <div className="container">
          <div className="flex items-center gap-4 py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <img
                src="/manus-storage/kattachegirma-logo_b5417617.png"
                alt="Katta Chegirma - Texnomagister"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-xl">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Mahsulot qidiring..."
                  className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-gray-50"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Cart */}
              <Link href="/cart" className="relative flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary transition-colors">
                <div className="relative">
                  <ShoppingCart size={22} />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block">Savat</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1 text-gray-600 hover:text-primary"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category nav - koyu gri */}
      <div className="bg-gray-800 text-white hidden md:block">
        <div className="container">
          <nav className="flex items-center gap-0.5 overflow-x-auto py-0">
            <Link href="/catalog" className="px-3 py-2.5 text-sm font-semibold hover:bg-primary transition-colors whitespace-nowrap">
              Barcha tovarlar
            </Link>
            {mainCategories.map(cat => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="px-3 py-2.5 text-sm hover:bg-primary transition-colors whitespace-nowrap flex items-center gap-1"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
            {categories.length > 7 && (
              <Link href="/catalog" className="px-3 py-2.5 text-sm hover:bg-primary transition-colors whitespace-nowrap">
                Barchasi →
              </Link>
            )}
            <div className="flex-1" />
            <Link href="/about" className="px-3 py-2.5 text-sm hover:bg-primary transition-colors whitespace-nowrap">
              О нас
            </Link>
            <Link href="/seller" className="px-3 py-2.5 text-sm hover:bg-primary transition-colors whitespace-nowrap text-yellow-300">
              Sotuvchi bo'lish
            </Link>
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="container py-3">
            <nav className="flex flex-col gap-0.5">
              <Link
                href="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-sm font-semibold hover:bg-gray-100 rounded text-gray-800"
              >
                Barcha tovarlar
              </Link>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-sm hover:bg-gray-100 rounded flex items-center gap-2 text-gray-700"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
              <hr className="my-1 border-gray-200" />
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-sm hover:bg-gray-100 rounded text-gray-700"
              >
                О нас
              </Link>
              <Link
                href="/seller"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-sm hover:bg-gray-100 rounded text-primary font-medium"
              >
                Sotuvchi bo'lish
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
