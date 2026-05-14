import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { data: categoriesData } = trpc.categories.list.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 min — categories rarely change
  });
  const categories = categoriesData ?? [];
  const { t } = useLanguage();

  return (
    <footer className="text-white mt-8" style={{ backgroundColor: '#cc0000' }}>
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/manus-storage/kc_logo_d6421d0d.png" alt="Katta Chegirma" className="h-14 w-auto object-contain" style={{ filter: 'invert(1)' }} />
            </div>
            <p className="text-sm text-red-100">{t.footer_tagline}</p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-white">{t.nav_catalog}</h4>
            <ul className="space-y-1">
              {categories.slice(0, 6).map(cat => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.slug}`} className="text-sm text-red-100 hover:text-white transition-colors">
                    {cat.icon} {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-white">{t.footer_contacts}</h4>
            <ul className="space-y-1">
              <li><Link href="/catalog" className="text-sm text-red-100 hover:text-white transition-colors">{t.home_all_products}</Link></li>
              <li><Link href="/cart" className="text-sm text-red-100 hover:text-white transition-colors">{t.nav_cart}</Link></li>
              <li><Link href="/about" className="text-sm text-red-100 hover:text-white transition-colors">{t.nav_about}</Link></li>
              <li><Link href="/seller" className="text-sm text-red-100 hover:text-white transition-colors">{t.footer_seller}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-red-700 mt-8 pt-6 text-center text-xs text-red-200">
          © {new Date().getFullYear()} Katta Chegirma. {t.footer_rights}.
        </div>
      </div>
    </footer>
  );
}
