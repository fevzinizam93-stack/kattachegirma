import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Footer() {
  const { data: categoriesData } = trpc.categories.list.useQuery();
  const categories = categoriesData ?? [];

  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-primary text-primary-foreground font-black text-lg px-2 py-1 rounded">KC</div>
              <div>
                <div className="font-black text-white text-base">Katta Chegirma!!!</div>
                <div className="text-xs text-gray-400">Arzon narxlar</div>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Uy texnikasi bo'yicha eng yaxshi narxlar. Sifatli mahsulotlar, tez yetkazib berish.
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-300">Kategoriyalar</h4>
            <ul className="space-y-1">
              {categories.slice(0, 6).map(cat => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {cat.icon} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-300">Ma'lumot</h4>
            <ul className="space-y-1">
              <li><Link href="/catalog" className="text-sm text-gray-400 hover:text-white transition-colors">Barcha mahsulotlar</Link></li>
              <li><Link href="/cart" className="text-sm text-gray-400 hover:text-white transition-colors">Savat</Link></li>
              <li><span className="text-sm text-gray-400">Telefon: Tez orada</span></li>
              <li><span className="text-sm text-gray-400">Manzil: Tez orada</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Katta Chegirma. Barcha huquqlar himoyalangan.
        </div>
      </div>
    </footer>
  );
}
