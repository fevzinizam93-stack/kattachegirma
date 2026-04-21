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

export function useAnalytics() {
  const trackMutation = trpc.analytics.track.useMutation();
  const sessionId = useRef(getSessionId());

  const track = useCallback(
    (
      eventType: "page_view" | "product_view" | "add_to_cart" | "order_placed" | "search",
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
