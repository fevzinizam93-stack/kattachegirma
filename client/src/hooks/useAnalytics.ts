import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";

// Generate or retrieve a persistent session ID
function getSessionId(): string {
  const key = "kc_session_id";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export type AnalyticsEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "order_placed"
  | "search"
  | "add_to_favorites"
  | "remove_from_favorites"
  | "product_click"
  | "time_on_site";

export function useAnalytics() {
  const trackMutation = trpc.analytics.track.useMutation();
  const sessionId = useRef(getSessionId());

  const track = useCallback(
    (
      eventType: AnalyticsEventType,
      extra?: {
        productId?: number;
        productName?: string;
        page?: string;
        meta?: Record<string, string | number>;
      }
    ) => {
      // Fire-and-forget: don't await, don't show errors to user
      trackMutation.mutate({
        eventType,
        sessionId: sessionId.current,
        page: extra?.page ?? window.location.pathname,
        productId: extra?.productId,
        productName: extra?.productName,
        meta: extra?.meta,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { track };
}

// Convenience hook for automatic page_view tracking on mount
export function usePageView(page?: string) {
  const { track } = useAnalytics();
  useEffect(() => {
    track("page_view", { page: page ?? window.location.pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
}

// Hook to track time spent on a page (fires on unmount)
export function useTimeOnPage(page?: string) {
  const { track } = useAnalytics();
  const startTime = useRef(Date.now());
  useEffect(() => {
    startTime.current = Date.now();
    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds >= 5) {
        track("time_on_site", {
          page: page ?? window.location.pathname,
          meta: { seconds },
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
}
