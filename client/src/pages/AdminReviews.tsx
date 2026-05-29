import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, EyeOff, Trash2, Star, Clock, Eye, Filter } from "lucide-react";

type StatusFilter = "all" | "pending" | "approved" | "hidden";

export default function AdminReviews() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const utils = trpc.useUtils();

  const { data: allReviews = [], isLoading } = trpc.reviews.adminList.useQuery(
    { status: filter === "all" ? undefined : filter },
    { refetchInterval: 30000 }
  );

  const setStatusMutation = trpc.reviews.adminSetStatus.useMutation({
    onSuccess: (_data, variables) => {
      utils.reviews.adminList.invalidate();
      utils.reviews.listByProduct.invalidate();
      utils.reviews.summary.invalidate();
      toast.success("Статус обновлён");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.reviews.adminDelete.useMutation({
    onSuccess: () => {
      utils.reviews.adminList.invalidate();
      utils.reviews.listByProduct.invalidate();
      utils.reviews.summary.invalidate();
      toast.success("Отзыв удалён");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSetStatus = (id: number, status: "pending" | "approved" | "hidden") => {
    setStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number, authorName: string) => {
    if (!confirm(`Удалить отзыв от «${authorName}»? Это действие нельзя отменить.`)) return;
    deleteMutation.mutate({ id });
  };

  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const statusCounts = {
    all: allReviews.length,
    pending: allReviews.filter(r => r.status === "pending").length,
    approved: allReviews.filter(r => r.status === "approved").length,
    hidden: allReviews.filter(r => r.status === "hidden").length,
  };

  const filterTabs: { key: StatusFilter; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "all", label: "Все", icon: <Filter size={14} />, color: "text-gray-600 bg-gray-100" },
    { key: "pending", label: "Ожидают", icon: <Clock size={14} />, color: "text-yellow-700 bg-yellow-100" },
    { key: "approved", label: "Одобрены", icon: <CheckCircle size={14} />, color: "text-green-700 bg-green-100" },
    { key: "hidden", label: "Скрыты", icon: <EyeOff size={14} />, color: "text-gray-500 bg-gray-100" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-black text-gray-900 mb-1">Отзывы покупателей</h1>
        <p className="text-sm text-gray-500">Модерация отзывов — одобряйте, скрывайте или удаляйте</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === tab.key
                ? `${tab.color} border-current shadow-sm`
                : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.key !== "all" && (
              <span className={`ml-0.5 font-black ${filter === tab.key ? "" : "text-gray-400"}`}>
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : allReviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          <Star size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold">Нет отзывов</p>
          <p className="text-sm mt-1">
            {filter === "pending" ? "Нет ожидающих проверки" :
             filter === "approved" ? "Нет одобренных отзывов" :
             filter === "hidden" ? "Нет скрытых отзывов" :
             "Отзывы ещё не поступали"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allReviews.map(review => (
            <div
              key={review.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                review.status === "pending" ? "border-yellow-200 bg-yellow-50/30" :
                review.status === "hidden" ? "border-gray-200 opacity-70" :
                "border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Товар, к которому относится отзыв */}
                  <a
                    href={`/product/${(review as any).productSlug ?? ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 mb-2.5 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-11 h-11 rounded-md bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {(review as any).productImage
                        ? <img src={`/api/img?url=${encodeURIComponent((review as any).productImage)}&w=88&q=75`} alt="" className="w-full h-full object-contain p-0.5" />
                        : <span className="text-lg">📦</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate">{(review as any).productName ?? `Товар #${review.productId}`}</div>
                      <div className="text-[11px] text-primary font-semibold">Открыть товар →</div>
                    </div>
                  </a>
                  {/* Author + date + status */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm text-gray-900">{review.authorName}</span>
                    <span className="text-[11px] text-gray-400">{formatDate(review.createdAt)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      review.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      review.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {review.status === "pending" ? "⏳ Ожидает" :
                       review.status === "approved" ? "✓ Одобрен" :
                       "👁 Скрыт"}
                    </span>
                    <span className="text-[11px] text-gray-400">ID товара: {review.productId}</span>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-1.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={13} className={i <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{review.rating}/5</span>
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

                  {/* Reply from store */}
                  <ReviewReplyBox reviewId={review.id} initialReply={(review as any).reply ?? ""} />
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {review.status !== "approved" && (
                    <button
                      onClick={() => handleSetStatus(review.id, "approved")}
                      disabled={setStatusMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                      title="Одобрить"
                    >
                      <CheckCircle size={13} />
                      Одобрить
                    </button>
                  )}
                  {review.status !== "hidden" && (
                    <button
                      onClick={() => handleSetStatus(review.id, "hidden")}
                      disabled={setStatusMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                      title="Скрыть"
                    >
                      <EyeOff size={13} />
                      Скрыть
                    </button>
                  )}
                  {review.status === "hidden" && (
                    <button
                      onClick={() => handleSetStatus(review.id, "pending")}
                      disabled={setStatusMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                      title="Вернуть на проверку"
                    >
                      <Eye size={13} />
                      Показать
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review.id, review.authorName)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewReplyBox({ reviewId, initialReply }: { reviewId: number; initialReply: string }) {
  const [text, setText] = useState(initialReply);
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const replyMut = trpc.reviews.adminReply.useMutation({
    onSuccess: () => {
      utils.reviews.adminList.invalidate();
      utils.reviews.listByProduct.invalidate();
      toast.success(initialReply ? "Ответ обновлён" : "Ответ опубликован");
      setOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open && !initialReply) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs font-semibold text-primary hover:underline">
        💬 Ответить от магазина
      </button>
    );
  }

  if (!open && initialReply) {
    return (
      <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
        <div className="text-[11px] font-bold text-emerald-700 mb-0.5">Ответ Katta Chegirma:</div>
        <p className="text-xs text-gray-700 leading-relaxed">{initialReply}</p>
        <button onClick={() => setOpen(true)} className="mt-1 text-[11px] font-semibold text-emerald-700 hover:underline">Изменить ответ</button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Ответ от магазина (виден покупателям под отзывом)"
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:border-primary outline-none resize-y"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          onClick={() => replyMut.mutate({ id: reviewId, reply: text })}
          disabled={replyMut.isPending}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {replyMut.isPending ? "Сохранение..." : "Сохранить ответ"}
        </button>
        <button onClick={() => setText("")} className="text-xs text-gray-500 hover:text-gray-700">Очистить</button>
      </div>
    </div>
  );
}
