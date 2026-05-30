// Use the same DB setup as the app (Drizzle + mysql2)
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
const pool = mysql.createPool(url);
const db = drizzle(pool);

const [rows] = await pool.execute(
  "SELECT id, name, email, role, openId FROM users WHERE role='admin' ORDER BY id ASC LIMIT 5"
);
console.log(JSON.stringify(rows, null, 2));
await pool.end();
