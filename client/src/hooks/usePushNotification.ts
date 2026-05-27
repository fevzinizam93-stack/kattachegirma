import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

/** Convert a base64 URL string to a Uint8Array (for VAPID key) */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export type PushState = "unsupported" | "denied" | "granted" | "default" | "loading";

export function usePushNotification(orderId: number | null) {
  const [state, setState] = useState<PushState>("loading");
  const [subscribed, setSubscribed] = useState(false);

  const { data: vapidData } = trpc.orders.vapidPublicKey.useQuery(undefined, {
    staleTime: Infinity,
  });

  const subscribeMutation = trpc.orders.subscribePush.useMutation();

  // Check current permission state
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as PushState);
  }, []);

  const subscribe = useCallback(async () => {
    if (!orderId || !vapidData?.publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setState("loading");
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== "granted") return;

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const json = sub.toJSON();
      await subscribeMutation.mutateAsync({
        orderId,
        endpoint: json.endpoint!,
        p256dh: (json.keys as any).p256dh,
        auth: (json.keys as any).auth,
      });

      setSubscribed(true);
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      setState(Notification.permission as PushState);
    }
  }, [orderId, vapidData, subscribeMutation]);

  return { state, subscribed, subscribe };
}
