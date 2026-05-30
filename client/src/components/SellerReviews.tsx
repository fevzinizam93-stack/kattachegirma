import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MessageSquare, Star, Send } from "lucide-react";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= value ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
      ))}
    </span>
  );
}

function ReviewItem({ r, onReply, busy }: { r: any; onReply: (id: number, reply: string) => void; busy: boolean; }) {
  const [text, setText] = useState<string>(r.reply ?? "");
  return (
    <div className="border border-gray-100 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm text-gray-800">{r.authorName}</span>
        <Stars value={r.rating} />
      </div>
      <p className="text-[11px] text-gray-400 mt-0.5">{r.productName}</p>
      <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{r.comment}</p>
      <div className="mt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Ответьте покупателю: расскажите о товаре, цене, доставке..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[11px] text-gray-400">{r.reply ? "Ваш ответ сохранён" : "Ответ увидят покупатели"}</span>
          <button
            onClick={() => onReply(r.id, text)}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <Send size={12} />
            {r.reply ? "Обновить ответ" : "Ответить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerReviews() {
  const utils = trpc.useUtils();
  const { data: reviews, isLoading } = trpc.reviews.sellerReviews.useQuery(undefined, { refetchOnWindowFocus: false });
  const replyMut = trpc.reviews.sellerReply.useMutation({
    onSuccess: () => { toast.success("Ответ опубликован"); utils.reviews.sellerReviews.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return null;
  const list = reviews ?? [];
  if (list.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2">
        <MessageSquare size={18} /> Отзывы на мои товары ({list.length})
      </h3>
      <div className="space-y-3">
        {list.map((r: any) => (
          <ReviewItem key={r.id} r={r} busy={replyMut.isPending} onReply={(id, reply) => replyMut.mutate({ id, reply })} />
        ))}
      </div>
    </div>
  );
}
