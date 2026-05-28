/**
 * Bulk submit all active+approved products to Google Indexing API.
 * Run: node scripts/bulk-reindex.mjs
 */
import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from .env file if present
try {
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(__dirname, "../.env") });
} catch {}

const { OAuth2Client } = await import("google-auth-library");
const mysql2 = await import("mysql2/promise");

const BASE_URL = "https://kattachegirma.uz";
const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const DELAY_MS = 400; // ~2.5 req/sec, well within Google's 200/day quota

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getAccessToken() {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Missing Google OAuth env vars: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN");
  }

  const client = new OAuth2Client(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error("Failed to get access token");
  return tokenResponse.token;
}

async function getProductSlugs() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const conn = await mysql2.default.createConnection(dbUrl);
  const [rows] = await conn.execute(
    "SELECT slug FROM products WHERE isActive = 1 AND isApproved = 1"
  );
  await conn.end();
  return rows.map((r) => r.slug);
}

async function submitUrl(url, token) {
  const res = await fetch(INDEXING_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, body: text };
}

async function main() {
  console.log("🔑 Getting Google access token...");
  const token = await getAccessToken();
  console.log("✅ Token obtained\n");

  console.log("📦 Fetching product slugs from DB...");
  const slugs = await getProductSlugs();
  console.log(`✅ Found ${slugs.length} active+approved products\n`);

  let succeeded = 0;
  let failed = 0;
  const errors = [];

  console.log(`🚀 Submitting ${slugs.length} URLs to Google Indexing API...\n`);

  for (let i = 0; i < slugs.length; i++) {
    const url = `${BASE_URL}/product/${slugs[i]}`;
    const result = await submitUrl(url, token);

    if (result.ok) {
      succeeded++;
      if ((i + 1) % 10 === 0 || i === slugs.length - 1) {
        console.log(`  [${i + 1}/${slugs.length}] ✅ ${succeeded} OK, ${failed} failed`);
      }
    } else {
      failed++;
      errors.push({ url, status: result.status, body: result.body.slice(0, 200) });
      console.log(`  [${i + 1}/${slugs.length}] ❌ ${url} → HTTP ${result.status}`);
      if (result.status === 429) {
        console.log("  ⏳ Rate limited — waiting 10s...");
        await sleep(10000);
      }
    }

    if (i < slugs.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n📊 РЕЗУЛЬТАТ:`);
  console.log(`  ✅ Успешно: ${succeeded}/${slugs.length}`);
  console.log(`  ❌ Ошибки: ${failed}`);

  if (errors.length > 0) {
    console.log("\n❌ Ошибки:");
    for (const e of errors.slice(0, 10)) {
      console.log(`  ${e.url} → HTTP ${e.status}: ${e.body}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
