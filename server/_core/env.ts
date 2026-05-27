export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "BCQcqNxlkDVqIGNBcH9j0HtHqP3uqoc3tkVnHE2-Q5F13kQUbR5sX-iVQJws2MDvKfsNRG0enqZuqhCuTo0t0Ws",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "U-pfX4pYfK9rR5-w_3T7ScyiHs9LFkec3Rmdt_D1XtQ",
  vapidEmail: process.env.VAPID_EMAIL ?? "mailto:admin@kattachegirma.uz",
};
