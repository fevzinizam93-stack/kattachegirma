import { Link } from "wouter";
import { Search } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PopularSearches({
  variant = "section",
  limit = 24,
}: {
  variant?: "section" | "footer";
  limit?: number;
}) {
  const { data } = trpc.analytics.popularQueries.useQuery({ limit });
  const items = data ?? [];
  if (items.length === 0) return null;

  if (variant === "footer") {
    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map((q) => (
          <Link
            key={q.query}
            href={`/search?q=${encodeURIComponent(q.query)}`}
            className="text-sm text-red-100 hover:text-white transition-colors"
          >
            {q.query}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="py-6 bg-white border-t border-gray-100">
      <div className="container">
        <div className="flex items-center gap-2 mb-3">
          <Search size={15} className="text-gray-400" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Часто ищут</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((q) => (
            <Link
              key={q.query}
              href={`/search?q=${encodeURIComponent(q.query)}`}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              {q.query}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
