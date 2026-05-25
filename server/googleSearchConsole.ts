/**
 * Google Search Console Sitemap Submission
 *
 * Uses the Google Search Console Webmasters API to submit and check sitemaps.
 * The service account is verified as site owner via Site Verification API (META method).
 * The verification meta tag is already present in client/index.html.
 */

import { GoogleAuth } from "google-auth-library";

export interface SitemapSubmitResult {
  success: boolean;
  siteUrl: string;
  sitemapUrl: string;
  error?: string;
  method?: string;
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

function getGoogleAuth(scopes: string[]) {
  const keyJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON not set");
  const credentials = JSON.parse(keyJson);
  return new GoogleAuth({ credentials, scopes });
}

/**
 * Verify the site ownership using Site Verification API (META method).
 * The meta tag must already be present in index.html.
 */
async function verifySite(siteUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = getGoogleAuth(["https://www.googleapis.com/auth/siteverification"]);
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const resp = await fetch("https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=FILE", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site: { type: "SITE", identifier: siteUrl },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok) {
      return { success: true };
    }
    const data = await resp.json() as { error?: { message?: string } };
    return { success: false, error: data.error?.message ?? `HTTP ${resp.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Submit sitemap.xml to Google Search Console via Webmasters API.
 * Automatically attempts site verification if access is denied.
 */
export async function submitSitemapToSearchConsole(
  siteUrl: string,
  sitemapUrl: string
): Promise<SitemapSubmitResult> {
  try {
    const auth = getGoogleAuth(["https://www.googleapis.com/auth/webmasters"]);
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`;

    const resp = await fetch(url, {
      method: "PUT",
      headers: { Authorization: "Bearer " + token.token },
      signal: AbortSignal.timeout(15000),
    });

    if (resp.ok || resp.status === 204) {
      return { success: true, siteUrl, sitemapUrl, method: "Webmasters API" };
    }

    const data = await resp.json() as { error?: { message?: string; code?: number } };
    const errMsg = data.error?.message ?? `HTTP ${resp.status}`;

    // If 403 forbidden — try to verify site first, then retry
    if (resp.status === 403) {
      const verifyResult = await verifySite(siteUrl);
      if (!verifyResult.success) {
        return {
          success: false,
          siteUrl,
          sitemapUrl,
          error: `Нет доступа к Search Console. Верификация не удалась: ${verifyResult.error}`,
          method: "Webmasters API",
        };
      }

      // Retry after verification
      const retryToken = await client.getAccessToken();
      const retryResp = await fetch(url, {
        method: "PUT",
        headers: { Authorization: "Bearer " + retryToken.token },
        signal: AbortSignal.timeout(15000),
      });

      if (retryResp.ok || retryResp.status === 204) {
        return { success: true, siteUrl, sitemapUrl, method: "Webmasters API (после верификации)" };
      }

      const retryData = await retryResp.json() as { error?: { message?: string } };
      return {
        success: false,
        siteUrl,
        sitemapUrl,
        error: retryData.error?.message ?? `HTTP ${retryResp.status}`,
        method: "Webmasters API",
      };
    }

    return { success: false, siteUrl, sitemapUrl, error: errMsg, method: "Webmasters API" };
  } catch (err) {
    return {
      success: false,
      siteUrl,
      sitemapUrl,
      error: err instanceof Error ? err.message : String(err),
      method: "Webmasters API",
    };
  }
}

/**
 * Get the status of the submitted sitemap from Search Console.
 */
export async function getSitemapStatus(
  siteUrl: string,
  sitemapUrl: string
): Promise<SitemapStatusResult> {
  try {
    const auth = getGoogleAuth(["https://www.googleapis.com/auth/webmasters.readonly"]);
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const encodedSite = encodeURIComponent(siteUrl);
    const encodedSitemap = encodeURIComponent(sitemapUrl);
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedSitemap}`;

    const resp = await fetch(url, {
      headers: { Authorization: "Bearer " + token.token },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const data = await resp.json() as { error?: { message?: string } };
      return {
        success: false,
        siteUrl,
        sitemapUrl,
        error: data.error?.message ?? `HTTP ${resp.status}`,
      };
    }

    const data = await resp.json() as {
      lastDownloaded?: string;
      lastSubmitted?: string;
      isPending?: boolean;
      warnings?: number;
      errors?: number;
      contents?: Array<{ type?: string; submitted?: number; indexed?: number }>;
    };

    const urlCount = data.contents?.reduce((sum, c) => sum + (c.submitted ?? 0), 0) ?? 0;

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
 * List all sitemaps for a site from Search Console.
 */
export async function listSitemaps(siteUrl: string): Promise<{
  success: boolean;
  sitemaps?: Array<{ path: string; lastSubmitted?: string; isPending?: boolean; urlCount?: number }>;
  error?: string;
}> {
  try {
    const auth = getGoogleAuth(["https://www.googleapis.com/auth/webmasters.readonly"]);
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const encodedSite = encodeURIComponent(siteUrl);
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`;

    const resp = await fetch(url, {
      headers: { Authorization: "Bearer " + token.token },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const data = await resp.json() as { error?: { message?: string } };
      return { success: false, error: data.error?.message ?? `HTTP ${resp.status}` };
    }

    const data = await resp.json() as {
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
      urlCount: s.contents?.reduce((sum, c) => sum + (c.submitted ?? 0), 0) ?? 0,
    }));

    return { success: true, sitemaps };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
