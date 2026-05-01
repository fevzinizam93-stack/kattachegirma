/**
 * Mass re-translate all products from Russian to Uzbek (Latin script)
 * using the Manus built-in LLM API.
 * Run: node scripts/mass-translate.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

if (!DB_URL || !FORGE_URL || !FORGE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

async function translateRuToUz(name, description) {
  const prompt = [
    "Translate the following product information from Russian to Uzbek (Latin script, as used in modern Uzbekistan).",
    "Return ONLY a JSON object with keys \"nameUz\" and \"descriptionUz\". No extra text.",
    "",
    `Name (Russian): ${name}`,
    description ? `Description (Russian): ${description}` : "",
  ].filter(Boolean).join("\n");

  const res = await fetch(`${FORGE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional Russian-to-Uzbek translator. Output only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "product_translation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              nameUz: { type: "string", description: "Product name in Uzbek" },
              descriptionUz: { type: "string", description: "Product description in Uzbek" },
            },
            required: ["nameUz", "descriptionUz"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  return {
    nameUz: parsed.nameUz ?? "",
    descriptionUz: parsed.descriptionUz ?? "",
  };
}

// Simple check: does the string look like bad transliteration?
// Bad transliteration often has patterns like "fiksirovat", "hash", "poverkhnost" etc.
// We translate ALL products to ensure correctness.
function needsRetranslation(nameUz, nameRu) {
  if (!nameUz || nameUz.trim() === "") return true;
  // If Uzbek name is identical to Russian name, it was never translated
  if (nameUz.trim() === nameRu.trim()) return true;
  // If Uzbek name contains Cyrillic characters mixed with Latin (bad transliteration artifact)
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(nameUz);
  if (hasCyrillic) return true;
  return false;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  
  // Fetch all products
  const [rows] = await conn.execute(
    "SELECT id, name, nameUz, description, descriptionUz FROM products ORDER BY id"
  );
  
  console.log(`Found ${rows.length} products total`);
  
  let translated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of rows) {
    const { id, name, nameUz, description, descriptionUz } = product;
    
    if (!needsRetranslation(nameUz, name)) {
      // Still translate all to ensure quality - comment this out to only fix bad ones
      // skipped++;
      // continue;
    }

    try {
      process.stdout.write(`[${id}] ${name} → `);
      const result = await translateRuToUz(name, description || "");
      
      await conn.execute(
        "UPDATE products SET nameUz = ?, descriptionUz = ? WHERE id = ?",
        [result.nameUz, result.descriptionUz, id]
      );
      
      console.log(`✓ ${result.nameUz}`);
      translated++;
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`✗ Error for product ${id}: ${err.message}`);
      errors++;
    }
  }

  await conn.end();
  
  console.log("\n=== DONE ===");
  console.log(`Translated: ${translated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
