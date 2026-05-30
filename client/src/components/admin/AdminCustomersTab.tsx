import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Search, ChevronDown, ChevronRight, Download, Users, ShoppingBag, TrendingUp } from "lucide-react";

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " сум";
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждён",
  delivered: "Доставлен",
  cancelled: "Отменён",
  new: "Новый",
  called: "Позвонили",
  done: "Выполнен",
};

export default function AdminCustomersTab() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = trpc.customers.list.useQuery(undefined, {
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.customers;
    return data.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [data, search]);

  function toggleExpand(phone: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  }

  function downloadCSV() {
    if (!data) return;
    const rows = [["Имя", "Телефон", "Заказов", "Сумма (сум)", "Последний заказ"]];
    data.customers.forEach((c) =>
      rows.push([
        c.name,
        c.phone,
        String(c.ordersCount),
        String(Math.round(c.totalSpent)),
        formatDate(c.lastOrderAt),
      ])
    );
    const csv =
      "\uFEFF" +
      rows
        .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(";"))
        .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kattachegirma-clients-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        {error.message === "Доступ только для владельца"
          ? "🔒 Этот раздел доступен только владельцу магазина"
          : "Ошибка загрузки: " + error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Клиентов</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalCustomers ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={16} className="text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Заказов</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalOrders ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-orange-500" />
            <span className="text-xs text-gray-500 font-medium">Оборот</span>
          </div>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            {formatPrice(summary?.totalRevenue ?? 0)}
          </p>
        </div>
      </div>

      {/* Search + CSV */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 bg-white"
          />
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors shrink-0"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Скачать CSV</span>
        </button>
      </div>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Клиентов не найдено</div>
        )}
        {filtered.map((c) => {
          const isOpen = expanded.has(c.phone);
          return (
            <div key={c.phone} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggleExpand(c.phone)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-gray-700">{c.ordersCount} заказ{c.ordersCount === 1 ? "" : c.ordersCount < 5 ? "а" : "ов"}</p>
                  <p className="text-xs text-gray-500">{formatPrice(c.totalSpent)}</p>
                  <p className="text-xs text-gray-400">{formatDate(c.lastOrderAt)}</p>
                </div>
                {isOpen ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
              </button>

              {/* Expanded orders */}
              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {c.orders.map((o) => (
                    <div key={`${o.source}-${o.id}`} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{formatDate(o.date)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            o.source === "quick"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-blue-50 text-blue-600"
                          }`}>
                            {o.source === "quick" ? "В 1 клик" : "Обычный"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {STATUS_LABELS[o.status] ?? o.status}
                          </span>
                        </div>
                        {o.total > 0 && (
                          <span className="text-xs font-bold text-gray-800">{formatPrice(o.total)}</span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {o.items.map((item, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            {item.name}
                            {item.quantity > 1 && <span className="text-gray-400"> × {item.quantity}</span>}
                            {item.price > 0 && <span className="text-gray-400"> — {formatPrice(item.price)}</span>}
                          </p>
                        ))}
                      </div>
                      {o.address && (
                        <p className="text-xs text-gray-400 mt-1">📍 {o.address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
