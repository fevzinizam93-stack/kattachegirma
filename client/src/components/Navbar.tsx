import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export default function Navbar() {
  const { totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const mainCategories = categories.slice(0, 6);

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground py-1 text-center text-xs">
        🔥 Bozorda yurib bo'lmanglar sarson. Katta Chegirmada bozordan arzon! 🔥
      </div>

      {/* Main navbar */}
      <div className="bg-white border-b border-border">
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
                  className="w-full border border-border rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Cart */}
              <Link href="/cart" className="relative flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                <div className="relative">
                  <ShoppingCart size={22} />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block">Savat</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1 hover:text-primary"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <div className="bg-gray-800 text-white hidden md:block">
        <div className="container">
          <nav className="flex items-center gap-1 overflow-x-auto py-0">
            <Link href="/catalog" className="px-3 py-2 text-sm font-semibold hover:bg-primary transition-colors whitespace-nowrap rounded">
              Barcha tovarlar
            </Link>
            {mainCategories.map(cat => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="px-3 py-2 text-sm hover:bg-primary transition-colors whitespace-nowrap rounded flex items-center gap-1"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
            {categories.length > 6 && (
              <Link href="/catalog" className="px-3 py-2 text-sm hover:bg-primary transition-colors whitespace-nowrap rounded">
                Barchasi →
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-border shadow-lg">
          <div className="container py-3">
            <nav className="flex flex-col gap-1">
              <Link
                href="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-semibold hover:bg-accent rounded"
              >
                Barcha tovarlar
              </Link>
              {categories.map(cat => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
