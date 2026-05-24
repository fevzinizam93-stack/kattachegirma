import { GoogleAuth } from "google-auth-library";

const INDEXING_API_URL =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

let authClient: GoogleAuth | null = null;

function getAuthClient(): GoogleAuth {
  if (authClient) return authClient;

  const keyJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!keyJson) {
    throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON is not set");
  }

  const credentials = JSON.parse(keyJson);
  authClient = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

  return authClient;
}

export type IndexingType = "URL_UPDATED" | "URL_DELETED";

export interface IndexingResult {
  url: string;
  success: boolean;
  error?: string;
  notifyTime?: string;
}

export async function submitUrlForIndexing(
  url: string,
  type: IndexingType = "URL_UPDATED"
): Promise<IndexingResult> {
  try {
    const auth = getAuthClient();
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(INDEXING_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, type }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        url,
        success: false,
        error: `HTTP ${response.status}: ${errorBody}`,
      };
    }

    const data = (await response.json()) as { urlNotificationMetadata?: { latestUpdate?: { notifyTime?: string } } };
    return {
      url,
      success: true,
      notifyTime: data?.urlNotificationMetadata?.latestUpdate?.notifyTime,
    };
  } catch (err) {
    return {
      url,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function submitUrlsBatch(
  urls: string[],
  type: IndexingType = "URL_UPDATED",
  delayMs = 200
): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];

  for (const url of urls) {
    const result = await submitUrlForIndexing(url, type);
    results.push(result);
    // Small delay to avoid rate limiting (200 req/day quota)
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
