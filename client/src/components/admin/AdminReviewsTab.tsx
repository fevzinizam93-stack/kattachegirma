import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Star, Trash2, Eye, EyeOff, CheckCircle, Clock, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

type StatusFilter = "all" | "pending" | "approved" | "hidden";

function StarDisplay({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= value ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </span>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "На проверке", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "Одобрен", color: "bg-green-50 text-green-700 border-green-200" },
  hidden: { label: "Скрыт", color: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function AdminReviewsTab() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const utils = trpc.useUtils();

  const { data: reviews = [], isLoading } = trpc.reviews.adminList.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter },
    { refetchOnWindowFocus: false }
  );

  const setStatusMut = trpc.reviews.adminSetStatus.useMutation({
    onSuccess: (_, vars) => {
      utils.reviews.adminList.invalidate();
      const label = vars.status === "approved" ? "одобрен" : vars.status === "hidden" ? "скрыт" : "обновлён";
      toast.success(`Отзыв ${label}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.reviews.adminDelete.useMutation({
    onSuccess: () => {
      utils.reviews.adminList.invalidate();
      toast.success("Отзыв удалён");
    },
    onError: (e) => toast.error(e.message),
  });

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const filterTabs: { key: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { key: "pending", label: "На проверке", icon: <Clock size={14} /> },
    { key: "approved", label: "Одобренные", icon: <CheckCircle size={14} /> },
    { key: "hidden", label: "Скрытые", icon: <EyeOff size={14} /> },
    { key: "all", label: "Все", icon: <MessageSquare size={14} /> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-lg text-gray-900">
          Отзывы покупателей
        </h2>
        <span className="text-sm text-gray-400">{reviews.length} отзывов</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              statusFilter === key
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-primary/40"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Загрузка...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Отзывов нет</p>
          <p className="text-xs text-gray-300 mt-1">
            {statusFilter === "pending" ? "Новых отзывов для проверки нет" : "Нет отзывов с этим статусом"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r: any) => {
            const statusInfo = STATUS_LABELS[r.status] ?? STATUS_LABELS.pending;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Left: review info */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-bold text-sm text-gray-900">{r.authorName}</span>
                      <StarDisplay value={r.rating} />
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-auto">{formatDate(r.createdAt)}</span>
                    </div>

                    {/* Product link */}
                    {r.productSlug && (
                      <Link
                        href={`/product/${r.productSlug}`}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"
                      >
                        <ExternalLink size={11} />
                        {r.productName ?? `Товар #${r.productId}`}
                      </Link>
                    )}
                    {!r.productSlug && r.productId && (
                      <p className="text-xs text-gray-400 mb-2">Товар #{r.productId}: {r.productName ?? "—"}</p>
                    )}

                    {/* Comment */}
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      {r.comment}
                    </p>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    {r.status !== "approved" && (
                      <button
                        onClick={() => setStatusMut.mutate({ id: r.id, status: "approved" })}
                        disabled={setStatusMut.isPending}
                        title="Одобрить"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                      >
                        <CheckCircle size={13} />
                        Одобрить
                      </button>
                    )}
                    {r.status !== "hidden" && (
                      <button
                        onClick={() => setStatusMut.mutate({ id: r.id, status: "hidden" })}
                        disabled={setStatusMut.isPending}
                        title="Скрыть"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                      >
                        <EyeOff size={13} />
                        Скрыть
                      </button>
                    )}
                    {r.status === "hidden" && (
                      <button
                        onClick={() => setStatusMut.mutate({ id: r.id, status: "pending" })}
                        disabled={setStatusMut.isPending}
                        title="Вернуть на проверку"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                      >
                        <Eye size={13} />
                        Восстановить
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Удалить отзыв? Это действие нельзя отменить.")) {
                          deleteMut.mutate({ id: r.id });
                        }
                      }}
                      disabled={deleteMut.isPending}
                      title="Удалить"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
