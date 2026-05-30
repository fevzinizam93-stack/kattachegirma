import { createConnection } from "mysql2/promise";
import { createGzip } from "zlib";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("No DATABASE_URL"); process.exit(1); }

// Parse mysql://user:pass@host:port/dbname?ssl=...
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/([^?]+)/);
if (!match) { console.error("Cannot parse DATABASE_URL"); process.exit(1); }
const [, user, password, host, portStr, database] = match;
const port = portStr ? parseInt(portStr) : 3306;

const conn = await createConnection({
  host, port, user, password, database,
  ssl: { rejectUnauthorized: false },
  multipleStatements: true,
});

let sql = `-- kattachegirma database backup\n-- Date: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS=0;\n\n`;

// Get all tables
const [tables] = await conn.query("SHOW TABLES");
const tableNames = tables.map(r => Object.values(r)[0]);

for (const table of tableNames) {
  // Get CREATE TABLE
  const [[createRow]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
  const createSql = createRow["Create Table"];
  sql += `-- Table: ${table}\nDROP TABLE IF EXISTS \`${table}\`;\n${createSql};\n\n`;

  // Get all rows
  const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
  if (rows.length > 0) {
    const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(", ");
    const values = rows.map(row => {
      const vals = Object.values(row).map(v => {
        if (v === null) return "NULL";
        if (v instanceof Date) return `'${v.toISOString().replace("T", " ").replace(/\.\d+Z$/, "")}'`;
        if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "\\'")}'`;
        if (typeof v === "number") return String(v);
        return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
      });
      return `(${vals.join(", ")})`;
    }).join(",\n  ");
    sql += `INSERT INTO \`${table}\` (${cols}) VALUES\n  ${values};\n\n`;
  }
}

sql += `SET FOREIGN_KEY_CHECKS=1;\n`;

await conn.end();

// Write gzipped
const today = new Date().toISOString().split("T")[0];
const outFile = `/home/ubuntu/kattachegirma-backup-${today}.sql.gz`;

const readable = Readable.from([Buffer.from(sql, "utf8")]);
const gzip = createGzip({ level: 9 });
const dest = createWriteStream(outFile);
await pipeline(readable, gzip, dest);

import { statSync } from "fs";
const size = statSync(outFile).size;
console.log(`BACKUP_FILE=${outFile}`);
console.log(`BACKUP_SIZE=${size}`);
