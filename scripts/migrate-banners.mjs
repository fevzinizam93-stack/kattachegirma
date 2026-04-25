import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log("Connected to DB, creating banners table...");

await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`banners\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`title\` varchar(256) NOT NULL,
    \`titleUz\` varchar(256),
    \`description\` text,
    \`descriptionUz\` text,
    \`bgColor\` varchar(32) NOT NULL DEFAULT '#dc2626',
    \`textColor\` varchar(32) NOT NULL DEFAULT '#ffffff',
    \`link\` varchar(512),
    \`linkText\` varchar(128),
    \`linkTextUz\` varchar(128),
    \`endsAt\` timestamp NULL,
    \`isActive\` boolean NOT NULL DEFAULT true,
    \`sortOrder\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`banners_id\` PRIMARY KEY(\`id\`)
  )
`);

console.log("✅ banners table created successfully");
await conn.end();
