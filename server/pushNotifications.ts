import webpush from "web-push";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Configure VAPID once on module load
webpush.setVapidDetails(
  ENV.vapidEmail,
  ENV.vapidPublicKey,
  ENV.vapidPrivateKey
);

export { ENV as pushEnv };

/** Save a browser push subscription linked to an orderId */
export async function savePushSubscription(
  orderId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pushSubscriptions).values({
    orderId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

/** Send a push notification to all subscriptions for a given orderId */
export async function sendPushToOrder(
  orderId: number,
  payload: { title: string; body: string; url?: string }
) {
  const db = await getDb();
  if (!db) return;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.orderId, orderId));

  const expiredIds: number[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? `/order/${orderId}`,
          })
        );
      } catch (err: any) {
        // 410 Gone = subscription expired, clean up
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredIds.length > 0) {
    for (const id of expiredIds) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    }
  }
}
