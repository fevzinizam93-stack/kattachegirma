import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronUp, ChevronDown, Youtube, Eye, ThumbsUp, ExternalLink } from "lucide-react";

type VideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  viewCount: string;
  likeCount: string;
  publishedAt: string;
};

function formatCount(n: string | number): string {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
}

interface ReelsPlayerProps {
  videos: VideoItem[];
  initialIndex: number;
  onClose: () => void;
  onNeedMore?: () => void; // called when near end of list
}

export function ReelsPlayer({ videos, initialIndex, onClose, onNeedMore }: ReelsPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const wheelAccum = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const video = videos[currentIndex];

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= videos.length || isTransitioning) return;
    setIsTransitioning(true);
    setShowInfo(false);
    setCurrentIndex(idx);
    setTimeout(() => setIsTransitioning(false), 400);
    // Preload next
    if (idx >= videos.length - 3 && onNeedMore) onNeedMore();
  }, [videos.length, isTransitioning, onNeedMore]);

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);
  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  // Mouse wheel navigation
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

  // Touch swipe navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
      if (dy > 0) goNext();
      else goPrev();
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!video) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < videos.length - 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe-top py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
            <Youtube size={14} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold opacity-80">Видеообзоры</span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Video iframe — full screen */}
      <div className="flex-1 relative">
        <iframe
          key={video.id}
          src={`https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={video.title}
          style={{ border: "none" }}
        />

        {/* Transition overlay */}
        {isTransitioning && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-safe-bottom pb-6 pt-16">
        {/* Counter */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/50 text-xs">
            {currentIndex + 1} / {videos.length}
          </span>
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-white/60 text-xs hover:text-white transition-colors"
          >
            <ExternalLink size={11} />
            YouTube
          </a>
        </div>

        {/* Title — tap to expand */}
        <button
          onClick={() => setShowInfo(v => !v)}
          className="text-left w-full"
        >
          <h3 className={`text-white font-semibold text-sm leading-snug ${showInfo ? "" : "line-clamp-2"}`}>
            {video.title}
          </h3>
        </button>

        {/* Expanded info */}
        {showInfo && video.description && (
          <p className="text-white/60 text-xs mt-2 leading-relaxed line-clamp-4">
            {video.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-2">
          <span className="flex items-center gap-1 text-white/60 text-xs">
            <Eye size={11} />
            {formatCount(video.viewCount)}
          </span>
          <span className="flex items-center gap-1 text-white/60 text-xs">
            <ThumbsUp size={11} />
            {formatCount(video.likeCount)}
          </span>
        </div>
      </div>

      {/* Side navigation buttons */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        <button
          onClick={goPrev}
          disabled={!hasPrev}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            hasPrev
              ? "bg-white/20 hover:bg-white/40 text-white"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          }`}
        >
          <ChevronUp size={20} />
        </button>
        <button
          onClick={goNext}
          disabled={!hasNext}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            hasNext
              ? "bg-white/20 hover:bg-white/40 text-white"
              : "bg-white/5 text-white/20 cursor-not-allowed"
          }`}
        >
          <ChevronDown size={20} />
        </button>
      </div>

      {/* Vertical progress dots */}
      {videos.length <= 30 && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 max-h-[60vh] overflow-hidden">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? "w-1.5 h-5 bg-white"
                  : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
