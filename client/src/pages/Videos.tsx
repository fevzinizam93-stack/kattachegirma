import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Eye, ThumbsUp, Play, ChevronUp, ChevronDown, Youtube } from "lucide-react";
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
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

type VideoItem = {
  id: string;
  title: string;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
};

export default function Videos() {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadedPageToken, setLoadedPageToken] = useState<string | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const wheelAccum = useRef<number>(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isFetching } = trpc.youtube.getChannelVideos.useQuery(
    { maxResults: 16, pageToken: loadedPageToken },
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

  const goTo = useCallback((idx: number) => {
    if (isTransitioning) return;
    const clamped = Math.max(0, Math.min(idx, allVideos.length - 1));
    if (clamped === currentIndex) return;
    setIsTransitioning(true);
    setPlayingId(null);
    setCurrentIndex(clamped);
    // Load more when near end
    if (clamped >= allVideos.length - 3 && nextPageToken && !isFetching) {
      setLoadedPageToken(nextPageToken);
    }
    setTimeout(() => setIsTransitioning(false), 400);
  }, [isTransitioning, currentIndex, allVideos.length, nextPageToken, isFetching]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  // Wheel handler
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum.current += e.deltaY;
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        if (Math.abs(wheelAccum.current) > 50) {
          if (wheelAccum.current > 0) goNext();
          else goPrev();
        }
        wheelAccum.current = 0;
      }, 80);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goNext, goPrev]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goNext();
      if (e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const currentVideo = allVideos[currentIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 50 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/" className="flex items-center gap-2 text-white">
          <span className="text-lg font-bold">KC</span>
          <span className="text-sm opacity-80">Katta Chegirma</span>
        </Link>
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <span className="text-white text-sm font-semibold">Видеообзоры</span>
        </div>
        <div className="text-white/60 text-xs">
          {allVideos.length > 0 ? `${currentIndex + 1} / ${data?.totalResults ?? allVideos.length}` : ""}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {allVideos.length === 0 && isFetching ? (
          <div className="flex flex-col items-center gap-4 text-white/60">
            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span>Загружаем видеообзоры...</span>
          </div>
        ) : allVideos.length === 0 ? (
          <div className="text-white/60 text-center px-8">
            <Youtube className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Видео не найдены</p>
          </div>
        ) : currentVideo ? (
          <div className="w-full h-full flex items-center justify-center">
            {playingId === currentVideo.id ? (
              <iframe
                key={currentVideo.id}
                src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full"
                style={{ height: "100%", maxHeight: "calc(100vh - 120px)", aspectRatio: "16/9" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentVideo.title}
              />
            ) : (
              <div
                className="relative w-full cursor-pointer group"
                style={{ maxHeight: "calc(100vh - 120px)", aspectRatio: "16/9" }}
                onClick={() => setPlayingId(currentVideo.id)}
              >
                <img
                  src={currentVideo.thumbnail || `https://img.youtube.com/vi/${currentVideo.id}/hqdefault.jpg`}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover"
                  style={{ maxHeight: "calc(100vh - 120px)" }}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Bottom info */}
      {currentVideo && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-16 bg-gradient-to-t from-black/90 to-transparent">
          <h2 className="text-white font-semibold text-sm md:text-base leading-snug mb-2 line-clamp-2">
            {currentVideo.title}
          </h2>
          <div className="flex items-center gap-4 text-white/70 text-xs">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatCount(currentVideo.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {formatCount(currentVideo.likeCount)}
            </span>
            <span>{formatDate(currentVideo.publishedAt)}</span>
          </div>
        </div>
      )}

      {/* Navigation arrows (desktop) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-3">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-all"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex >= allVideos.length - 1}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-white transition-all"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Progress dots */}
      {allVideos.length > 0 && allVideos.length <= 20 && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-1.5">
          {allVideos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-1.5 rounded-full transition-all ${i === currentIndex ? "h-6 bg-white" : "h-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      )}

      {/* Mobile swipe hint */}
      {allVideos.length > 1 && currentIndex === 0 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 md:hidden flex flex-col items-center gap-1 text-white/40 text-xs animate-bounce pointer-events-none">
          <ChevronUp className="w-4 h-4 rotate-180" />
          <span>Свайп вверх</span>
        </div>
      )}
    </div>
  );
}
