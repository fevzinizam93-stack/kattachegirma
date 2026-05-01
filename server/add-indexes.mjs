import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const db = await createConnection(process.env.DATABASE_URL);

const indexes = [
  "CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products(categoryId)",
  "CREATE INDEX IF NOT EXISTS idx_products_isActive ON products(isActive)",
  "CREATE INDEX IF NOT EXISTS idx_products_isHit ON products(isHit, isActive)",
  "CREATE INDEX IF NOT EXISTS idx_products_isFeatured ON products(isFeatured)",
  "CREATE INDEX IF NOT EXISTS idx_products_isPremium ON products(isPremium)",
  "CREATE INDEX IF NOT EXISTS idx_products_createdAt ON products(createdAt)",
  "CREATE INDEX IF NOT EXISTS idx_products_sellerId ON products(sellerId)",
  "CREATE INDEX IF NOT EXISTS idx_products_moderationStatus ON products(moderationStatus)",
  "CREATE INDEX IF NOT EXISTS idx_favorites_userId ON favorites(userId)",
  "CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId)",
  "CREATE INDEX IF NOT EXISTS idx_reviews_productId ON reviews(productId)",
  "CREATE INDEX IF NOT EXISTS idx_sellers_userId ON sellers(userId)",
];

for (const sql of indexes) {
  try {
    await db.execute(sql);
    console.log('✓', sql.split(' ')[5]);
  } catch (e) {
    console.log('⚠', sql.split(' ')[5], e.message);
  }
}

await db.end();
console.log('Done!');
