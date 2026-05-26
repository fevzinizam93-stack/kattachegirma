import { describe, it, expect } from "vitest";
import { OAuth2Client } from "google-auth-library";

describe("Google OAuth2 credentials", () => {
  it("should have all required env vars set", () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    expect(clientId, "GOOGLE_OAUTH_CLIENT_ID must be set").toBeTruthy();
    expect(clientSecret, "GOOGLE_OAUTH_CLIENT_SECRET must be set").toBeTruthy();
    expect(refreshToken, "GOOGLE_OAUTH_REFRESH_TOKEN must be set").toBeTruthy();
  });

  it("should successfully create OAuth2Client and get access token", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    // Skip if credentials not set (CI environment)
    if (!clientId || !clientSecret || !refreshToken) {
      console.log("Skipping OAuth2 token test: credentials not set");
      return;
    }

    const client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });

    const tokenResponse = await client.getAccessToken();
    expect(tokenResponse.token, "Should get a valid access token").toBeTruthy();
    expect(typeof tokenResponse.token).toBe("string");
    expect(tokenResponse.token!.length).toBeGreaterThan(10);
  }, 15000); // 15s timeout for network call
});
