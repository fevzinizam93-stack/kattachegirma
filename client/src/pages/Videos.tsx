import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Eye, ThumbsUp, Play, Youtube, X, Search, Users } from "lucide-react";
import { ReelsPlayer } from "@/components/ReelsPlayer";
import { usePageMeta } from "@/hooks/usePageMeta";

function formatCount(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

type VideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
};

// VideoModal replaced by ReelsPlayer

export default function Videos() {
  usePageMeta({
    title: "Видеообзоры бытовой техники | Катта Чегирма",
    description: "Смотрите видеообзоры стиральных машин, холодильников, пылесосов и кондиционеров. Подробные обзоры от продавцов и экспертов.",
    keywordsUz: "video obzor kir yuvish mashinasi, muzlatgich obzor, changyutkich video, konditsioner obzor, maishiy texnika video",
  });

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [pageTokenQueue, setPageTokenQueue] = useState<(string | undefined)[]>([undefined]);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const currentToken = pageTokenQueue[currentTokenIndex];

  const { data: channelStats } = trpc.youtube.getChannelStats.useQuery(undefined, {
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const { data, isFetching } = trpc.youtube.getChannelVideos.useQuery(
    { maxResults: 50, pageToken: currentToken },
    { staleTime: 10 * 60 * 1000, enabled: currentTokenIndex < pageTokenQueue.length }
  );

  useEffect(() => {
    if (data?.videos && data.videos.length > 0) {
      setAllVideos(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const newOnes = data.videos.filter(v => !existingIds.has(v.id));
        return [...prev, ...newOnes];
      });
      setNextPageToken(data.nextPageToken ?? undefined);
      setIsLoadingMore(false);
    }
  }, [data]);

  const loadMore = useCallback(() => {
    if (nextPageToken && !isFetching && !isLoadingMore) {
      setIsLoadingMore(true);
      setPageTokenQueue(prev => [...prev, nextPageToken]);
      setCurrentTokenIndex(prev => prev + 1);
    }
  }, [nextPageToken, isFetching, isLoadingMore]);

  // Infinite scroll — auto load when sentinel is visible
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const filtered = searchQuery.trim()
    ? allVideos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVideos;

  const openVideo = (idx: number) => setSelectedIndex(idx);
  const closeVideo = () => setSelectedIndex(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                <Youtube size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">Видеообзоры</h1>
                <p className="text-xs text-gray-400">
                  {allVideos.length > 0
                    ? `Загружено ${allVideos.length}${data?.totalResults ? ` из ${data.totalResults}` : ""} видео`
                    : "Обзоры товаров Katta Chegirma"}
                </p>
              </div>
            </div>
            {/* Search */}
            <div className="relative sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск по видео..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:border-red-400 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Channel stats banner */}
        {channelStats && (
          <div className="border-t border-gray-100 bg-gradient-to-r from-red-50 to-white">
            <div className="container py-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <a
                  href="https://www.youtube.com/@katta.chegirma"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <Youtube size={14} className="shrink-0" />
                  @katta.chegirma
                </a>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Eye size={13} className="text-red-400 shrink-0" />
                  <span className="font-bold text-gray-800">{formatCount(channelStats.viewCount)}</span>
                  <span>просмотров</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Users size={13} className="text-red-400 shrink-0" />
                  <span className="font-bold text-gray-800">{formatCount(channelStats.subscriberCount)}</span>
                  <span>подписчиков</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Play size={13} className="text-red-400 shrink-0" />
                  <span className="font-bold text-gray-800">{channelStats.videoCount}</span>
                  <span>видео</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video grid */}
      <div className="container py-6">
        {allVideos.length === 0 && isFetching ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <div className="w-10 h-10 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
            <span className="text-sm">Загружаем видеообзоры...</span>
          </div>
        ) : filtered.length === 0 && searchQuery ? (
          <div className="text-center py-20 text-gray-400">
            <Youtube size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">По запросу «{searchQuery}» ничего не найдено</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filtered.map((video, idx) => (
                <button
                  key={video.id}
                  onClick={() => openVideo(idx)}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all text-left group border border-gray-100 hover:border-red-200"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-90 group-hover:scale-100 duration-200">
                        <Play size={20} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <Eye size={10} />
                      {formatCount(video.viewCount)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-red-600 transition-colors">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-2">
                        {video.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{formatDate(video.publishedAt)}</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={10} />
                        {formatCount(video.likeCount)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {!searchQuery && (
              <div ref={loaderRef} className="flex justify-center mt-8 py-4">
                {(isFetching || isLoadingMore) && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                    Загружаем ещё видео...
                  </div>
                )}
                {!isFetching && !isLoadingMore && !nextPageToken && allVideos.length > 0 && (
                  <p className="text-xs text-gray-400">Все {allVideos.length} видео загружены</p>
                )}
              </div>
            )}

            {/* Channel link */}
            <div className="text-center mt-4">
              <a
                href="https://www.youtube.com/@kattachegirma"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-600 transition-colors"
              >
                <Youtube size={14} />
                Смотреть канал на YouTube →
              </a>
            </div>
          </>
        )}
      </div>

      {/* Reels fullscreen player */}
      {selectedIndex !== null && (
        <ReelsPlayer
          videos={filtered}
          initialIndex={selectedIndex}
          onClose={closeVideo}
          onNeedMore={loadMore}
        />
      )}

      {/* SEO text block */}
      <section className="container py-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-gray-600 leading-relaxed space-y-3">
          <h2 className="text-lg font-bold text-gray-800">Видеообзоры бытовой техники в Узбекистане</h2>
          <p>
            На нашем канале вы найдёте подробные видеообзоры стиральных машин, холодильников, пылесосов и кондиционеров.
            Каждое видео поможет вам сделать правильный выбор перед покупкой — мы показываем реальные тесты, сравнения и отзывы.
          </p>
          <p>
            <strong>Katta Chegirma</strong> — единственный магазин в Узбекистане, где каждый товар сопровождается видеообзором от продавца.
            Смотрите, сравнивайте и покупайте с уверенностью!
          </p>
          <p className="text-xs text-gray-400">
            Maishiy texnika video obzorlari: kir yuvish mashinasi, muzlatgich, changyutkich, konditsioner. Sotib olishdan oldin ko‘ring!
          </p>
        </div>
      </section>
    </div>
  );
}
