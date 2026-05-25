import { useEffect } from "react";
import { useLocation } from "wouter";

// Declare gtag on window for TypeScript
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Tracks GA4 page_view events on every route change.
 * Must be called inside a component that is rendered inside wouter's Router.
 */
export function useGA4() {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: location,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);
}
