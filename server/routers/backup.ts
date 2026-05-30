import { router } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import { gzipSync } from "zlib";
import { ENV } from "../_core/env";

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ""),
  };
}

export const backupRouter = router({
  // adminProcedure уже проверяет ctx.user.role === 'admin' — это и есть защита
  exportDatabase: adminProcedure.mutation(async () => {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `kattachegirma-backup-${date}.sql.gz`;

    try {
      // Попытка 1: mysqldump (полный SQL-дамп)
      const mysqldump = (await import("mysqldump")).default;
      const conn = parseDbUrl(ENV.databaseUrl);
      const result = await mysqldump({
        connection: conn,
        dump: { schema: { table: { dropIfExist: true } } },
      });
      const sql =
        `-- kattachegirma backup ${new Date().toISOString()}\n` +
        (result.dump.schema ?? "") +
        "\n" +
        (result.dump.data ?? "");
      const gz = gzipSync(Buffer.from(sql, "utf8"));
      return { filename, base64: gz.toString("base64") };
    } catch {
      // Запасной вариант: JSON-дамп через Drizzle
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Нет подключения к базе данных");

      const tablesResult = await db.execute(sql`SHOW TABLES`);
      const tables: string[] = (tablesResult as any[]).map(
        (row: Record<string, unknown>) => Object.values(row)[0] as string
      );

      const dump: Record<string, unknown[]> = {};
      for (const table of tables) {
        try {
          const rows = await db.execute(sql.raw(`SELECT * FROM \`${table}\``));
          dump[table] = rows as unknown[];
        } catch {
          dump[table] = [];
        }
      }

      const json = JSON.stringify(
        { backup_date: new Date().toISOString(), tables: dump },
        null,
        2
      );
      const gz = gzipSync(Buffer.from(json, "utf8"));
      const jsonFilename = `kattachegirma-backup-${date}.json.gz`;
      return { filename: jsonFilename, base64: gz.toString("base64") };
    }
  }),
});
