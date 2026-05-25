import { GoogleAuth } from "google-auth-library";

// Google Search Console (Webmasters) API
const SEARCH_CONSOLE_API = "https://www.googleapis.com/webmasters/v3";

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
    scopes: [
      "https://www.googleapis.com/auth/webmasters",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
  });

  return authClient;
}

export interface SitemapSubmitResult {
  success: boolean;
  siteUrl: string;
  sitemapUrl: string;
  error?: string;
}

export interface SitemapStatusResult {
  success: boolean;
  siteUrl: string;
  sitemapUrl: string;
  isPending?: boolean;
  lastDownloaded?: string;
  lastSubmitted?: string;
  warnings?: number;
  errors?: number;
  urlCount?: number;
  error?: string;
}

/**
 * Submit sitemap.xml to Google Search Console.
 * Requires the service account to be added as an owner/verified user in Search Console.
 */
export async function submitSitemapToSearchConsole(
  siteUrl: string,
  sitemapUrl: string
): Promise<SitemapSubmitResult> {
  try {
    const auth = getAuthClient();
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Encode the siteUrl for use in the API path
    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);

    const url = `${SEARCH_CONSOLE_API}/sites/${encodedSite}/sitemaps/${encodedSitemap}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `HTTP ${response.status}: ${errorBody}`;

      // Parse error for better message
      try {
        const errJson = JSON.parse(errorBody);
        const msg = errJson?.error?.message || errJson?.error?.errors?.[0]?.message;
        if (msg) errorMsg = `HTTP ${response.status}: ${msg}`;
      } catch {
        // keep raw error
      }

      return { success: false, siteUrl, sitemapUrl, error: errorMsg };
    }

    // 204 No Content = success
    return { success: true, siteUrl, sitemapUrl };
  } catch (err) {
    return {
      success: false,
      siteUrl,
      sitemapUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get the status of a submitted sitemap from Google Search Console.
 */
export async function getSitemapStatus(
  siteUrl: string,
  sitemapUrl: string
): Promise<SitemapStatusResult> {
  try {
    const auth = getAuthClient();
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);

    const url = `${SEARCH_CONSOLE_API}/sites/${encodedSite}/sitemaps/${encodedSitemap}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `HTTP ${response.status}: ${errorBody}`;
      try {
        const errJson = JSON.parse(errorBody);
        const msg = errJson?.error?.message || errJson?.error?.errors?.[0]?.message;
        if (msg) errorMsg = `HTTP ${response.status}: ${msg}`;
      } catch {
        // keep raw error
      }
      return { success: false, siteUrl, sitemapUrl, error: errorMsg };
    }

    const data = await response.json() as {
      isPending?: boolean;
      lastDownloaded?: string;
      lastSubmitted?: string;
      warnings?: number;
      errors?: number;
      contents?: Array<{ submitted?: number; indexed?: number }>;
    };

    const urlCount = data.contents?.reduce((sum, c) => sum + (c.submitted ?? 0), 0);

    return {
      success: true,
      siteUrl,
      sitemapUrl,
      isPending: data.isPending,
      lastDownloaded: data.lastDownloaded,
      lastSubmitted: data.lastSubmitted,
      warnings: data.warnings,
      errors: data.errors,
      urlCount,
    };
  } catch (err) {
    return {
      success: false,
      siteUrl,
      sitemapUrl,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * List all sitemaps registered for a site in Search Console.
 */
export async function listSitemaps(siteUrl: string): Promise<{
  success: boolean;
  sitemaps?: Array<{ path: string; lastSubmitted?: string; isPending?: boolean; urlCount?: number }>;
  error?: string;
}> {
  try {
    const auth = getAuthClient();
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const encodedSite = encodeURIComponent(siteUrl);
    const url = `${SEARCH_CONSOLE_API}/sites/${encodedSite}/sitemaps`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMsg = `HTTP ${response.status}: ${errorBody}`;
      try {
        const errJson = JSON.parse(errorBody);
        const msg = errJson?.error?.message;
        if (msg) errorMsg = `HTTP ${response.status}: ${msg}`;
      } catch {
        // keep raw
      }
      return { success: false, error: errorMsg };
    }

    const data = await response.json() as {
      sitemap?: Array<{
        path?: string;
        lastSubmitted?: string;
        isPending?: boolean;
        contents?: Array<{ submitted?: number }>;
      }>;
    };

    const sitemaps = (data.sitemap ?? []).map((s) => ({
      path: s.path ?? "",
      lastSubmitted: s.lastSubmitted,
      isPending: s.isPending,
      urlCount: s.contents?.reduce((sum, c) => sum + (c.submitted ?? 0), 0),
    }));

    return { success: true, sitemaps };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
