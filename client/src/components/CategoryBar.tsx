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
    <div className="hidden md:block bg-white border-b border-gray-100 shadow-sm">
      <div className="container">
        <div ref={containerRef} className="flex items-stretch gap-0 relative">
          {visibleCats.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              onClick={() => setShowMore(false)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 text-center transition-colors min-w-[80px] max-w-[120px] flex-1 border-b-2 hover:bg-red-50 hover:border-red-500 hover:text-red-700 ${
                isActive(cat)
                  ? "border-red-600 bg-red-50 text-red-700"
                  : "border-transparent text-gray-700"
              }`}
            >
              {cat.icon && (
                <span className="text-lg leading-none">{cat.icon}</span>
              )}
              <span className="text-[11px] font-medium leading-tight line-clamp-2 whitespace-normal text-center">
                {getCatName(cat)}
              </span>
            </Link>
          ))}

          {/* More button */}
          {hasMore && (
            <div ref={moreRef} className="relative shrink-0">
              <button
                onClick={() => setShowMore((v) => !v)}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 h-full transition-colors border-b-2 hover:bg-red-50 hover:border-red-500 hover:text-red-700 min-w-[80px] ${
                  showMore
                    ? "border-red-600 bg-red-50 text-red-700"
                    : "border-transparent text-gray-700"
                }`}
              >
                {showMore ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {lang === "uz" ? "Ko'proq" : "Ещё"} ({hiddenCats.length})
                </span>
              </button>

              {/* Dropdown with hidden categories */}
              {showMore && (
                <div className="absolute top-full right-0 mt-0 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 min-w-[200px] py-1 overflow-hidden">
                  {hiddenCats.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      onClick={() => setShowMore(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 hover:text-red-700 transition-colors text-sm ${
                        isActive(cat)
                          ? "bg-red-50 text-red-700 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {cat.icon && <span className="text-base">{cat.icon}</span>}
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
