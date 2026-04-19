import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Insert categories
const categories = [
  { name: "Changyutgichlar", slug: "changyutgichlar", icon: "🧹" },
  { name: "Kir yuvish mashinalari", slug: "kir-yuvish-mashinalari", icon: "🫧" },
  { name: "Muzlatgichlar", slug: "muzlatgichlar", icon: "🧊" },
  { name: "Televizorlar", slug: "televizorlar", icon: "📺" },
  { name: "Konditsionerlar", slug: "konditsionerlar", icon: "❄️" },
  { name: "Idish yuvish mashinalari", slug: "idish-yuvish-mashinalari", icon: "🍽️" },
  { name: "Mikroto'lqinli pechlar", slug: "mikrotoqinli-pechlar", icon: "📡" },
  { name: "Elektr pechlar", slug: "elektr-pechlar", icon: "🔥" },
  { name: "Havo tozalagichlar", slug: "havo-tozalagichlar", icon: "💨" },
  { name: "Suv isitgichlar", slug: "suv-isitgichlar", icon: "🚿" },
  { name: "Blenderlar", slug: "blenderlar", icon: "🥤" },
  { name: "Elektr choynaklar", slug: "elektr-choynaklar", icon: "☕" },
  { name: "Dazmollar", slug: "dazmollar", icon: "👔" },
  { name: "Muzqaymoq mashinalari", slug: "muzqaymoq-mashinalari", icon: "🍦" },
];

for (const cat of categories) {
  try {
    await conn.execute(
      "INSERT IGNORE INTO categories (name, slug, icon) VALUES (?, ?, ?)",
      [cat.name, cat.slug, cat.icon]
    );
  } catch(e) { console.log('Skip:', cat.slug); }
}
console.log("Categories seeded!");

// Insert sample products
const [catRows] = await conn.execute("SELECT id, slug FROM categories");
const catMap = {};
for (const row of catRows) catMap[row.slug] = row.id;

const products = [
  { name: "Avangard AYN2010 Changyutgich", slug: "avangard-ayn2010", categoryId: catMap["changyutgichlar"], brand: "AVANGARD", price: "839402", originalPrice: "1036136", discount: 19, stock: 15, isNew: false, isFeatured: true, description: "Kuchli so'rish kuchi, qulay dizayn, uzoq muddatli xizmat" },
  { name: "Beston VCB-5250BW Changyutgich", slug: "beston-vcb-5250bw", categoryId: catMap["changyutgichlar"], brand: "BESTON", price: "924558", originalPrice: "1156000", discount: 20, stock: 8, isNew: true, isFeatured: true, description: "Zamonaviy dizayn, kuchli motor, HEPA filtri" },
  { name: "Konig Led 50KUW-9000 Televizor", slug: "konig-led-50kuw-9000", categoryId: catMap["televizorlar"], brand: "KONIG", price: "3029145", originalPrice: "4136000", discount: 27, stock: 5, isNew: false, isFeatured: true, description: "50 dyuym, 4K UHD, Smart TV, WiFi" },
  { name: "Avangard AV-2003 Muzlatgich", slug: "avangard-av-2003", categoryId: catMap["muzlatgichlar"], brand: "AVANGARD", price: "669088", originalPrice: "1459029", discount: 54, stock: 3, isNew: false, isFeatured: true, description: "Ikkita kamerali, No-Frost texnologiyasi" },
  { name: "Franco CFR202G Muzlatgich", slug: "franco-cfr202g", categoryId: catMap["muzlatgichlar"], brand: "FRANCO", price: "2785840", originalPrice: "4257804", discount: 35, stock: 7, isNew: false, isFeatured: true, description: "Katta hajmli, A+ energiya tejash sinfi" },
  { name: "Samsung WW70T4542TE Kir yuvish", slug: "samsung-ww70t4542te", categoryId: catMap["kir-yuvish-mashinalari"], brand: "SAMSUNG", price: "4200000", originalPrice: "5500000", discount: 24, stock: 10, isNew: true, isFeatured: true, description: "7 kg, 1400 aylanma, EcoBubble texnologiyasi" },
  { name: "LG F4WV509S0E Kir yuvish", slug: "lg-f4wv509s0e", categoryId: catMap["kir-yuvish-mashinalari"], brand: "LG", price: "5800000", originalPrice: "7200000", discount: 19, stock: 6, isNew: false, isFeatured: false, description: "9 kg, AI DD texnologiyasi, TurboWash" },
  { name: "Midea 12000 BTU Konditsioner", slug: "midea-12000-btu", categoryId: catMap["konditsionerlar"], brand: "MIDEA", price: "3500000", originalPrice: "4200000", discount: 17, stock: 12, isNew: true, isFeatured: true, description: "Inverter, A++ sinf, WiFi boshqaruv" },
  { name: "Gree GWH12AAB Konditsioner", slug: "gree-gwh12aab", categoryId: catMap["konditsionerlar"], brand: "GREE", price: "2900000", originalPrice: "3600000", discount: 19, stock: 9, isNew: false, isFeatured: false, description: "12000 BTU, Inverter texnologiyasi" },
  { name: "Samsung MS23K3515AW Mikroto'lqin", slug: "samsung-ms23k3515aw", categoryId: catMap["mikrotoqinli-pechlar"], brand: "SAMSUNG", price: "1200000", originalPrice: "1500000", discount: 20, stock: 20, isNew: false, isFeatured: false, description: "23 litr, 800 Vt, Ceramic Enamel" },
  { name: "Ariston ANDRIS2 30L Suv isitgich", slug: "ariston-andris2-30l", categoryId: catMap["suv-isitgichlar"], brand: "ARISTON", price: "1800000", originalPrice: "2200000", discount: 18, stock: 14, isNew: false, isFeatured: false, description: "30 litr, 1500 Vt, Titan qoplamasi" },
  { name: "Tefal BL811 Blender", slug: "tefal-bl811", categoryId: catMap["blenderlar"], brand: "TEFAL", price: "450000", originalPrice: "580000", discount: 22, stock: 30, isNew: true, isFeatured: false, description: "1200 Vt, 1.5 litr, 6 tezlik" },
  { name: "Philips HD9352 Elektr choynак", slug: "philips-hd9352", categoryId: catMap["elektr-choynaklar"], brand: "PHILIPS", price: "380000", originalPrice: "480000", discount: 21, stock: 25, isNew: false, isFeatured: false, description: "1.7 litr, 2400 Vt, 360° baza" },
  { name: "Tefal FV1710 Dazmol", slug: "tefal-fv1710", categoryId: catMap["dazmollar"], brand: "TEFAL", price: "320000", originalPrice: "420000", discount: 24, stock: 18, isNew: false, isFeatured: false, description: "2400 Vt, bug' berish, Durilium plita" },
  { name: "Bosch SMS25AW01R Idish yuvish", slug: "bosch-sms25aw01r", categoryId: catMap["idish-yuvish-mashinalari"], brand: "BOSCH", price: "6500000", originalPrice: "8000000", discount: 19, stock: 4, isNew: true, isFeatured: true, description: "12 to'plam, A++ sinf, 5 dastur" },
  { name: "Xiaomi Mi Air Purifier 3H", slug: "xiaomi-mi-air-purifier-3h", categoryId: catMap["havo-tozalagichlar"], brand: "XIAOMI", price: "1500000", originalPrice: "1900000", discount: 21, stock: 11, isNew: true, isFeatured: false, description: "HEPA filtri, WiFi, 380 m³/soat" },
];

for (const p of products) {
  if (!p.categoryId) continue;
  try {
    await conn.execute(
      `INSERT IGNORE INTO products (name, slug, categoryId, brand, price, originalPrice, discount, stock, isNew, isFeatured, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.name, p.slug, p.categoryId, p.brand, p.price, p.originalPrice ?? null, p.discount ?? 0, p.stock, p.isNew ? 1 : 0, p.isFeatured ? 1 : 0, p.description]
    );
  } catch(e) { console.log('Skip product:', p.slug, e.message); }
}
console.log("Products seeded!");
await conn.end();
