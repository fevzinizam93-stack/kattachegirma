import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const queries = [
  `CREATE TABLE IF NOT EXISTS \`sellers\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int,
    \`name\` varchar(256) NOT NULL,
    \`phone\` varchar(32),
    \`telegram\` varchar(128),
    \`description\` text,
    \`isApproved\` boolean DEFAULT false,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`sellers_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`store_settings\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`key\` varchar(128) NOT NULL,
    \`value\` text,
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`store_settings_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`store_settings_key_unique\` UNIQUE(\`key\`)
  )`,
  `ALTER TABLE \`users\` MODIFY COLUMN \`role\` enum('user','admin','seller') NOT NULL DEFAULT 'user'`,
  `ALTER TABLE \`products\` ADD COLUMN IF NOT EXISTS \`sellerId\` int`,
  `ALTER TABLE \`products\` ADD COLUMN IF NOT EXISTS \`sellerPhone\` varchar(32)`,
  `ALTER TABLE \`products\` ADD COLUMN IF NOT EXISTS \`sellerTelegram\` varchar(128)`,
  `ALTER TABLE \`products\` ADD COLUMN IF NOT EXISTS \`sellerName\` varchar(256)`,
  `ALTER TABLE \`products\` ADD COLUMN IF NOT EXISTS \`isApproved\` boolean DEFAULT true`,
];

for (const q of queries) {
  try {
    await connection.execute(q);
    console.log("✓", q.slice(0, 60).trim());
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log("⚠ Already exists, skipping:", q.slice(0, 60).trim());
    } else {
      console.error("✗ Error:", e.message, "\nQuery:", q.slice(0, 80));
    }
  }
}

// Seed default store settings
const defaults = [
  ['store_phone', ''],
  ['store_address', ''],
  ['store_description', 'Katta Chegirma - O\'zbekistonda eng arzon uy texnikasi do\'koni.'],
  ['store_telegram', ''],
  ['about_text', ''],
  ['about_images', '[]'],
];

for (const [key, value] of defaults) {
  try {
    await connection.execute(
      'INSERT IGNORE INTO store_settings (`key`, `value`) VALUES (?, ?)',
      [key, value]
    );
    console.log("✓ Setting:", key);
  } catch (e) {
    console.error("✗ Setting error:", e.message);
  }
}

await connection.end();
console.log("Migration complete!");
