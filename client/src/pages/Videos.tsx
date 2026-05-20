import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Eye, ThumbsUp, Play, Youtube, X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "wouter";

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

function VideoModal({ video, onClose, onPrev, onNext, hasPrev, hasNext }: {
  video: VideoItem;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Youtube size={18} className="text-red-500" />
            <span className="font-semibold text-gray-800 text-sm line-clamp-1">{video.title}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Video player */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            key={video.id}
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
          {/* Prev/Next arrows */}
          {hasPrev && (
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Video info */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <h2 className="font-bold text-gray-900 text-base mb-2">{video.title}</h2>
          <div className="flex items-center gap-4 text-gray-500 text-xs mb-3">
            <span className="flex items-center gap-1">
              <Eye size={13} />
              {formatCount(video.viewCount)} просмотров
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp size={13} />
              {formatCount(video.likeCount)}
            </span>
            <span>{formatDate(video.publishedAt)}</span>
          </div>
          {video.description && (
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line line-clamp-4">
              {video.description}
            </p>
          )}
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs text-red-600 hover:underline"
          >
            <Youtube size={13} />
            Открыть на YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Videos() {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loadedPageToken, setLoadedPageToken] = useState<string | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isFetching } = trpc.youtube.getChannelVideos.useQuery(
    { maxResults: 24, pageToken: loadedPageToken },
    { staleTime: 10 * 60 * 1000 }
  );

  useEffect(() => {
    if (data?.videos && data.videos.length > 0) {
      setAllVideos(prev => {
        const existingIds = new Set(prev.map(v => v.id));
        const newOnes = data.videos.filter(v => !existingIds.has(v.id));
        return [...prev, ...newOnes];
      });
      setNextPageToken(data.nextPageToken ?? undefined);
    }
  }, [data]);

  const filtered = searchQuery.trim()
    ? allVideos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allVideos;

  const openVideo = (idx: number) => setSelectedIndex(idx);
  const closeVideo = () => setSelectedIndex(null);
  const goPrev = () => selectedIndex !== null && selectedIndex > 0 && setSelectedIndex(selectedIndex - 1);
  const goNext = () => selectedIndex !== null && selectedIndex < filtered.length - 1 && setSelectedIndex(selectedIndex + 1);

  const loadMore = () => {
    if (nextPageToken && !isFetching) setLoadedPageToken(nextPageToken);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="container py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                <Youtube size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-900">Видеообзоры</h1>
                <p className="text-xs text-gray-400">
                  {data?.totalResults ? `${data.totalResults} видео на канале` : "Обзоры товаров Katta Chegirma"}
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
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-90 group-hover:scale-100 duration-200">
                        <Play size={20} className="text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    {/* View count badge */}
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

            {/* Load more */}
            {nextPageToken && !searchQuery && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={isFetching}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-red-300 text-gray-700 hover:text-red-600 font-medium px-6 py-2.5 rounded-full transition-all text-sm disabled:opacity-50"
                >
                  {isFetching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Youtube size={15} />
                      Загрузить ещё видео
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Channel link */}
            <div className="text-center mt-6">
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

      {/* Video modal */}
      {selectedIndex !== null && filtered[selectedIndex] && (
        <VideoModal
          video={filtered[selectedIndex]}
          onClose={closeVideo}
          onPrev={goPrev}
          onNext={goNext}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < filtered.length - 1}
        />
      )}
    </div>
  );
}
