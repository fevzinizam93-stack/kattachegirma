import { GoogleAuth } from "google-auth-library";

const INDEXING_API_URL =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

let auth: GoogleAuth | null = null;

// Cache the access token to avoid requesting a new one for every URL
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function getAuth(): GoogleAuth {
  if (auth) return auth;

  const keyJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!keyJson) {
    throw new Error(
      "GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON not set — required for Google Indexing API"
    );
  }

  const credentials = JSON.parse(keyJson);
  auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

  return auth;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Reuse cached token if it's still valid (with 60s buffer)
  if (cachedToken && tokenExpiresAt - now > 60_000) {
    return cachedToken;
  }

  const client = await getAuth().getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error("Failed to obtain access token from Google service account");
  }

  cachedToken = tokenResponse.token;
  // Google access tokens expire in 1 hour; cache for 55 minutes
  tokenExpiresAt = now + 55 * 60 * 1000;
  return cachedToken;
}

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

export interface IndexingResult {
  url: string;
  success: boolean;
  error?: string;
  notifyTime?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function submitUrlForIndexing(
  url: string,
  type: IndexingType = "URL_UPDATED",
  maxRetries = 3
): Promise<IndexingResult> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await getAccessToken();

      const response = await fetch(INDEXING_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, type }),
      });

      if (response.status === 429) {
        // Rate limited — wait longer before retry (exponential backoff)
        const waitMs = attempt * 5000; // 5s, 10s, 15s
        console.warn(`[Indexing] 429 rate limit for ${url}, waiting ${waitMs}ms before retry ${attempt}/${maxRetries}`);
        cachedToken = null;
        tokenExpiresAt = 0;
        await sleep(waitMs);
        lastError = `HTTP 429 (attempt ${attempt})`;
        continue;
      }

      if (response.status === 401) {
        // Token expired — force refresh
        cachedToken = null;
        tokenExpiresAt = 0;
        if (attempt < maxRetries) {
          await sleep(1000);
          continue;
        }
      }

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          url,
          success: false,
          error: `HTTP ${response.status}: ${errorBody}`,
        };
      }

      const data = (await response.json()) as {
        urlNotificationMetadata?: { latestUpdate?: { notifyTime?: string } };
      };
      return {
        url,
        success: true,
        notifyTime: data?.urlNotificationMetadata?.latestUpdate?.notifyTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxRetries) {
        await sleep(attempt * 2000);
      }
    }
  }

  return { url, success: false, error: lastError };
}

export async function submitUrlsBatch(
  urls: string[],
  type: IndexingType = "URL_UPDATED",
  delayMs = 1000
): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  for (const url of urls) {
    const result = await submitUrlForIndexing(url, type);
    results.push(result);
    // Delay between requests to respect Google's rate limit
    // Google Indexing API: 200 requests/day, ~1 req/sec burst limit
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}
