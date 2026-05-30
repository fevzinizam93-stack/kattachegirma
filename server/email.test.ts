import { describe, it, expect } from "vitest";

describe("RESEND_API_KEY validation", () => {
  it("should have RESEND_API_KEY set", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("should be accepted by Resend API (send-only key)", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    // POST to /emails with invalid payload — a valid key returns 422 (validation error),
    // an invalid key returns 401. We just need to confirm it's not 401.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "test@test.com", to: ["x"], subject: "t", html: "t" }),
    });
    // 401 = invalid key, 422/403 = valid key but bad payload/domain
    expect(res.status).not.toBe(401);
  }, 10000);
});
