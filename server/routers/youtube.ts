import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import { ENV } from "../_core/env";
import {
  getYoutubeCache,
  setYoutubeCache,
} from "../db";

const CHANNEL_ID = "UCo0v66OjZ8Z3LujfipwuQUA";
const UPLOADS_PLAYLIST = "UUo0v66OjZ8Z3LujfipwuQUA";

type YTVideoItem = { id: string; title: string; description: string; thumbnail: string; viewCount: string; likeCount: string; publishedAt: string };
type YTChannelStats = { viewCount: string; subscriberCount: string; videoCount: string };

// In-memory caches
const youtubeChanCache: Record<string, { ts: number; data: any }> = {};
let _youtubeStatsCache: { ts: number; data: YTChannelStats } | null = null;
const youtubeVideoStatsCache: Record<string, { ts: number; data: Record<string, { viewCount: string; likeCount: string }> }> = {};

export const youtubeRouter = router({
  // Public: get video stats (view/like counts) for given video IDs
  getVideoStats: publicProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(50) }))
    .query(async ({ input }) => {
      const apiKey = ENV.youtubeApiKey;
      if (!apiKey) return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
      const cacheKey = [...input.ids].sort().join(",");
      const now = Date.now();
      if (youtubeVideoStatsCache[cacheKey] && now - youtubeVideoStatsCache[cacheKey].ts < 5 * 60 * 1000) {
        return { stats: youtubeVideoStatsCache[cacheKey].data };
      }
      try {
        const idsParam = input.ids.join(",");
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsParam}&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
        const json = await res.json() as { items?: Array<{ id: string; statistics: { viewCount?: string; likeCount?: string } }> };
        const stats: Record<string, { viewCount: string; likeCount: string }> = {};
        for (const item of json.items ?? []) {
          stats[item.id] = {
            viewCount: item.statistics.viewCount ?? "0",
            likeCount: item.statistics.likeCount ?? "0",
          };
        }
        youtubeVideoStatsCache[cacheKey] = { ts: now, data: stats };
        return { stats };
      } catch {
        return { stats: {} as Record<string, { viewCount: string; likeCount: string }> };
      }
    }),

  // Public: get channel statistics (subscriber count, view count, video count)
  getChannelStats: publicProcedure.query(async () => {
    const apiKey = ENV.youtubeApiKey;
    const DB_CACHE_KEY = "channel_stats";
    const now = Date.now();
    // 1. In-memory cache (30 min)
    if (_youtubeStatsCache && now - _youtubeStatsCache.ts < 30 * 60 * 1000) {
      return _youtubeStatsCache.data;
    }
    // 2. Try YouTube API
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=katta.chegirma&key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json() as { items?: Array<{ statistics: { viewCount?: string; subscriberCount?: string; videoCount?: string } }> };
          const s = json.items?.[0]?.statistics ?? {};
          if (json.items && json.items.length > 0) {
            const result: YTChannelStats = {
              viewCount: s.viewCount ?? "0",
              subscriberCount: s.subscriberCount ?? "0",
              videoCount: s.videoCount ?? "0",
            };
            _youtubeStatsCache = { ts: now, data: result };
            await setYoutubeCache(DB_CACHE_KEY, JSON.stringify(result));
            return result;
          }
        }
      } catch { /* fall through to DB cache */ }
    }
    // 3. Fallback: DB persistent cache
    const cached = await getYoutubeCache(DB_CACHE_KEY);
    if (cached) {
      try {
        const result = JSON.parse(cached) as YTChannelStats;
        _youtubeStatsCache = { ts: now - 25 * 60 * 1000, data: result };
        return result;
      } catch { /* ignore parse error */ }
    }
    return { viewCount: "0", subscriberCount: "0", videoCount: "0" };
  }),

  // Public: get channel videos (paginated)
  getChannelVideos: publicProcedure
    .input(z.object({ pageToken: z.string().optional(), maxResults: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const apiKey = ENV.youtubeApiKey;
      const cacheKey = `channel_${input.pageToken ?? "first"}_${input.maxResults}`;
      const DB_CACHE_KEY = `videos_${cacheKey}`;
      const now = Date.now();
      // 1. In-memory cache (10 min)
      if (youtubeChanCache[cacheKey] && now - youtubeChanCache[cacheKey].ts < 10 * 60 * 1000) {
        return youtubeChanCache[cacheKey].data;
      }
      // 2. Try YouTube API
      if (apiKey) {
        try {
          const pageParam = input.pageToken ? `&pageToken=${input.pageToken}` : "";
          const plUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${UPLOADS_PLAYLIST}&maxResults=${input.maxResults}${pageParam}&key=${apiKey}`;
          const plRes = await fetch(plUrl);
          if (plRes.ok) {
            const plJson = await plRes.json() as {
              nextPageToken?: string;
              pageInfo: { totalResults: number };
              items?: Array<{
                snippet: {
                  resourceId: { videoId: string };
                  title: string;
                  description: string;
                  thumbnails: { high?: { url: string }; medium?: { url: string } };
                  publishedAt: string;
                };
              }>;
            };
            const items = plJson.items ?? [];
            const videoIds = items.map(i => i.snippet.resourceId.videoId).filter(Boolean);
            if (videoIds.length > 0) {
              const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.join(",")}&key=${apiKey}`;
              const statsRes = await fetch(statsUrl);
              const statsJson = statsRes.ok ? await statsRes.json() as { items?: Array<{ id: string; statistics: { viewCount?: string; likeCount?: string } }> } : { items: [] };
              const statsMap: Record<string, { viewCount: string; likeCount: string }> = {};
              for (const s of statsJson.items ?? []) {
                statsMap[s.id] = { viewCount: s.statistics.viewCount ?? "0", likeCount: s.statistics.likeCount ?? "0" };
              }
              const videos: YTVideoItem[] = items.map(i => ({
                id: i.snippet.resourceId.videoId,
                title: i.snippet.title,
                description: (i.snippet.description ?? "").split("\n")[0].slice(0, 200),
                thumbnail: i.snippet.thumbnails.high?.url ?? i.snippet.thumbnails.medium?.url ?? "",
                viewCount: statsMap[i.snippet.resourceId.videoId]?.viewCount ?? "0",
                likeCount: statsMap[i.snippet.resourceId.videoId]?.likeCount ?? "0",
                publishedAt: i.snippet.publishedAt,
              }));
              const result = { videos, nextPageToken: plJson.nextPageToken ?? null, totalResults: plJson.pageInfo.totalResults };
              youtubeChanCache[cacheKey] = { ts: now, data: result };
              await setYoutubeCache(DB_CACHE_KEY, JSON.stringify(result));
              return result;
            }
          }
        } catch { /* fall through to DB cache */ }
      }
      // 3. Fallback: DB persistent cache
      const cached = await getYoutubeCache(DB_CACHE_KEY);
      if (cached) {
        try {
          const result = JSON.parse(cached) as { videos: YTVideoItem[]; nextPageToken: string | null; totalResults: number };
          youtubeChanCache[cacheKey] = { ts: now - 8 * 60 * 1000, data: result };
          return result;
        } catch { /* ignore */ }
      }
      return { videos: [] as YTVideoItem[], nextPageToken: null as string | null, totalResults: 0 };
    }),

  // Public: search videos on channel
  searchVideos: publicProcedure
    .input(z.object({ query: z.string().min(1).max(200), maxResults: z.number().min(1).max(8).default(6) }))
    .query(async ({ input }) => {
      const apiKey = ENV.youtubeApiKey;
      if (!apiKey) return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
      const cacheKey = `search_${input.query.toLowerCase().replace(/\s+/g, "_").slice(0, 80)}_${input.maxResults}`;
      const now = Date.now();
      if (youtubeChanCache[cacheKey] && now - youtubeChanCache[cacheKey].ts < 30 * 60 * 1000) {
        return youtubeChanCache[cacheKey].data;
      }
      try {
        const q = encodeURIComponent(input.query.slice(0, 100));
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${q}&type=video&maxResults=${input.maxResults}&order=relevance&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
        const json = await res.json() as {
          items?: Array<{
            id: { videoId: string };
            snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
          }>;
        };
        const videos = (json.items ?? []).map(i => ({
          videoId: i.id.videoId,
          title: i.snippet.title,
          thumbnail: i.snippet.thumbnails.medium?.url ?? i.snippet.thumbnails.default?.url ?? "",
        }));
        const result = { videos };
        youtubeChanCache[cacheKey] = { ts: now, data: result };
        return result;
      } catch {
        return { videos: [] as Array<{ videoId: string; title: string; thumbnail: string }> };
      }
    }),

  // Public: find a video for a specific product (by product name)
  findVideoForProduct: publicProcedure
    .input(z.object({ productName: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const apiKey = ENV.youtubeApiKey;
      if (!apiKey) return { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
      const name = input.productName.trim();
      const cacheKey = `product_video_${name.toLowerCase().replace(/\s+/g, "_").slice(0, 80)}`;
      const now = Date.now();
      if (youtubeChanCache[cacheKey] && now - youtubeChanCache[cacheKey].ts < 60 * 60 * 1000) {
        return youtubeChanCache[cacheKey].data;
      }
      try {
        const query = encodeURIComponent(name.slice(0, 100));
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${query}&type=video&maxResults=1&order=relevance&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) return { videoId: null, title: null, thumbnail: null };
        const json = await res.json() as {
          items?: Array<{
            id: { videoId: string };
            snippet: { title: string; thumbnails: { medium?: { url: string }; default?: { url: string } } };
          }>;
        };
        const item = json.items?.[0];
        if (!item) {
          const result = { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
          youtubeChanCache[cacheKey] = { ts: now, data: result };
          return result;
        }
        const result = {
          videoId: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? null,
        };
        youtubeChanCache[cacheKey] = { ts: now, data: result };
        return result;
      } catch {
        return { videoId: null as string | null, title: null as string | null, thumbnail: null as string | null };
      }
    }),

  // Admin: clear YouTube cache
  clearCache: adminProcedure.mutation(async () => {
    Object.keys(youtubeChanCache).forEach(k => delete youtubeChanCache[k]);
    _youtubeStatsCache = null;
    return { success: true };
  }),
});
