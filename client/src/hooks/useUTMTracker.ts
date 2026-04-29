import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

const SESSION_KEY = "utm_tracked";

/**
 * Reads UTM params from the current URL on first mount.
 * If any UTM param is present AND this session hasn't been tracked yet,
 * fires a single trackVisit mutation and marks the session as done.
 */
export function useUTMTracker() {
  const trackVisit = trpc.utm.trackVisit.useMutation();

  useEffect(() => {
    // Only track once per browser session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source") ?? undefined;
    const utmMedium = params.get("utm_medium") ?? undefined;
    const utmCampaign = params.get("utm_campaign") ?? undefined;
    const utmContent = params.get("utm_content") ?? undefined;
    const utmTerm = params.get("utm_term") ?? undefined;

    // Only track if at least one UTM param is present
    if (!utmSource && !utmMedium && !utmCampaign && !utmContent && !utmTerm) return;

    const landingPage = window.location.pathname + window.location.search;
    const referrer = document.referrer || undefined;

    sessionStorage.setItem(SESSION_KEY, "1");

    trackVisit.mutate({
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      landingPage,
      referrer,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
