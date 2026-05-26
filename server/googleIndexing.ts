import { OAuth2Client } from "google-auth-library";

const INDEXING_API_URL =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

let oauth2Client: OAuth2Client | null = null;

function getAuthClient(): OAuth2Client {
  if (oauth2Client) return oauth2Client;

  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials not set. Required: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN"
    );
  }

  oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return oauth2Client;
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
    const client = getAuthClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      return { url, success: false, error: "Failed to obtain access token" };
    }

    const response = await fetch(INDEXING_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    const data = (await response.json()) as {
      urlNotificationMetadata?: { latestUpdate?: { notifyTime?: string } };
    };
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
