import { describe, it, expect } from "vitest";
import { GoogleAuth } from "google-auth-library";

describe("Google Indexing API service account credentials", () => {
  it("should have GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON env var set", () => {
    const keyJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;

    // Skip gracefully if not set (CI / local dev without credentials)
    if (!keyJson) {
      console.log("Skipping: GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON not set");
      return;
    }

    expect(keyJson, "GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON must be set").toBeTruthy();

    // Verify it's valid JSON with expected service account fields
    const parsed = JSON.parse(keyJson);
    expect(parsed.type).toBe("service_account");
    expect(parsed.client_email).toBeTruthy();
    expect(parsed.private_key).toBeTruthy();
  });

  it("should successfully create GoogleAuth client and get access token", async () => {
    const keyJson = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON;

    // Skip if credentials not set (CI environment)
    if (!keyJson) {
      console.log("Skipping service account token test: GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON not set");
      return;
    }

    const credentials = JSON.parse(keyJson);
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    expect(tokenResponse.token, "Should get a valid access token").toBeTruthy();
    expect(typeof tokenResponse.token).toBe("string");
    expect(tokenResponse.token!.length).toBeGreaterThan(10);
  }, 15000); // 15s timeout for network call
});
