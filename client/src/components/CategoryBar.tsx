import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CategoryBar() {
  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const { lang } = useLanguage();
  const [location] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(8);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Calculate how many categories fit in one row
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      // Each item is roughly 110px wide (icon + text + padding + gap)
      const itemWidth = 110;
      // Reserve 110px for the "More" button
      const available = containerWidth - 110;
      const count = Math.max(3, Math.floor(available / itemWidth));
      setVisibleCount(count);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [categories]);

  if (categories.length === 0) return null;

  const getCatName = (cat: { name: string; nameUz?: string | null }) => {
    if (lang === "uz" && cat.nameUz) return cat.nameUz;
    return cat.name;
  };

  const isActive = (cat: { slug: string }) => location === `/category/${cat.slug}`;

  const visibleCats = categories.slice(0, visibleCount);
  const hiddenCats = categories.slice(visibleCount);
  const hasMore = hiddenCats.length > 0;

  return (
    <div className="hidden md:block bg-gray-50 border-b border-gray-200">
      <div className="container">
        <div ref={containerRef} className="flex items-center gap-1.5 py-2 relative">
          {visibleCats.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              onClick={() => setShowMore(false)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
                isActive(cat)
                  ? "bg-red-600 text-white border-red-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
              }`}
            >
              {cat.icon && <span className="text-xs leading-none">{cat.icon}</span>}
              <span>{getCatName(cat)}</span>
            </Link>
          ))}

          {/* More button */}
          {hasMore && (
            <div ref={moreRef} className="relative shrink-0">
              <button
                onClick={() => setShowMore((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
                  showMore
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
                }`}
              >
                <span>{lang === "uz" ? "Ko'proq" : "Ещё"} ({hiddenCats.length})</span>
                {showMore ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>

              {/* Dropdown with hidden categories */}
              {showMore && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 min-w-[180px] py-1 overflow-hidden">
                  {hiddenCats.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-2.5 px-4 py-2 hover:bg-red-50 hover:text-red-700 transition-colors text-[12px] ${
                        isActive(cat)
                          ? "bg-red-50 text-red-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {cat.icon && <span className="text-sm">{cat.icon}</span>}
                      <span>{getCatName(cat)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
