// Авто-характеристики: вытягиваем значения из описания (и уже распознанных specs).
// Что нашли — показываем, чего нет — пропускаем. Ручной ввод не нужен.

type Extractor = (text: string) => string | null;

export interface SpecField { label: string; extract: Extractor; }
export interface SpecTemplate { name: string; match: string[]; fields: SpecField[]; }

const num = (re: RegExp, unit: string): Extractor => (t) => {
  const m = t.match(re);
  return m ? `${m[1]} ${unit}`.trim() : null;
};
const has = (re: RegExp): Extractor => (t) => (re.test(t) ? "Есть" : null);
const oneOf = (opts: [RegExp, string][]): Extractor => (t) => {
  for (const [re, label] of opts) if (re.test(t)) return label;
  return null;
};
const dims: Extractor = (t) => {
  const m = t.match(/(\d{2,3}(?:[.,]\d)?)\s*[x×х]\s*(\d{2,3}(?:[.,]\d)?)\s*[x×х]\s*(\d{2,3}(?:[.,]\d)?)/);
  return m ? `${m[1]}×${m[2]}×${m[3]} см` : null;
};
const energyClass: Extractor = (t) => {
  const m = t.match(/(?:класс|klass|energiya|energy)[^a-z0-9]{0,5}(a\+{0,3})/i) || t.match(/\b(a\+{2,3})\b/i);
  return m ? m[1].toUpperCase() : null;
};
const warranty: Extractor = (t) => {
  const m = t.match(/(?:гаранти\w*|kafolat)[:\s-]*?(\d+)\s*(год|года|лет|yil|oy|мес\w*)/i)
        || t.match(/(\d+)\s*(год|года|лет|yil)\s*(?:гаранти|kafolat)/i);
  return m ? `${m[1]} ${m[2]}` : null;
};
const btu: Extractor = (t) => {
  let m = t.match(/(\d{4,5})\s*btu/i);
  if (m) return `${m[1]} BTU`;
  m = t.match(/(\d{1,2})\s*btu/i);
  if (m) return `${parseInt(m[1], 10) * 1000} BTU`;
  return null;
};
const dryer: Extractor = (t) => {
  if (/без сушк|quritishsiz/.test(t)) return null;
  return /сушк|quritish|drying/.test(t) ? "Есть" : null;
};

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    name: "Телевизоры",
    match: ["телевизор", "televizor", "tv"],
    fields: [
      { label: "Диагональ", extract: (t) => { const m = t.match(/(\d{2,3})\s*(?:дюйм|[""″]|inch)/) || t.match(/диагонал\w*[:\s]*?(\d{2,3})/); return m ? `${m[1]} дюймов` : null; } },
      { label: "Разрешение", extract: oneOf([[/4k|uhd|ultra ?hd/, "4K UHD"], [/full ?hd|1920|1080/, "Full HD"], [/\bhd\b/, "HD"]]) },
      { label: "Тип экрана", extract: oneOf([[/oled/, "OLED"], [/qled/, "QLED"], [/led/, "LED"]]) },
      { label: "Smart TV", extract: has(/smart ?tv|смарт/) },
      { label: "Операционная система", extract: oneOf([[/android/, "Android TV"], [/web ?os/, "WebOS"], [/tizen/, "Tizen"]]) },
      { label: "Частота обновления", extract: num(/(\d{2,3})\s*(?:гц|hz)/, "Гц") },
      { label: "Wi-Fi", extract: has(/wi-?fi|вай-?фай/) },
      { label: "Гарантия", extract: warranty },
    ],
  },
  {
    name: "Стиральные машины",
    match: ["стиральн", "kir yuvish", "kiryuvish", "stiral"],
    fields: [
      { label: "Тип загрузки", extract: oneOf([[/фронтальн|frontal|old yuklash/, "Фронтальная"], [/вертикальн|vertikal|tepadan/, "Вертикальная"]]) },
      { label: "Максимальная загрузка", extract: num(/(\d{1,2}(?:[.,]\d)?)\s*(?:кг|kg)/, "кг") },
      { label: "Скорость отжима", extract: num(/(\d{3,4})\s*(?:об\/?мин|rpm|aylanish)/, "об/мин") },
      { label: "Класс энергоэффективности", extract: energyClass },
      { label: "Инверторный мотор", extract: has(/инвертор|inverter/) },
      { label: "Сушка", extract: dryer },
      { label: "Уровень шума", extract: num(/(\d{2,3})\s*(?:дб|db)/, "дБ") },
      { label: "Габариты (В×Ш×Г)", extract: dims },
      { label: "Гарантия", extract: warranty },
    ],
  },
  {
    name: "Холодильники",
    match: ["холодильник", "muzlatgich", "sovutgich", "holodilnik", "xolodilnik"],
    fields: [
      { label: "Полезный объём", extract: num(/(\d{2,4})\s*(?:л|litr|liter)\b/, "л") },
      { label: "Количество камер", extract: oneOf([[/двухкамерн|2\s*камер|ikki kamera/, "2"], [/однокамерн|1\s*камер/, "1"]]) },
      { label: "No Frost", extract: has(/no ?frost|ноу ?фрост/) },
      { label: "Класс энергоэффективности", extract: energyClass },
      { label: "Инверторный компрессор", extract: has(/инвертор|inverter/) },
      { label: "Уровень шума", extract: num(/(\d{2,3})\s*(?:дб|db)/, "дБ") },
      { label: "Габариты (В×Ш×Г)", extract: dims },
      { label: "Гарантия", extract: warranty },
    ],
  },
  {
    name: "Кондиционеры",
    match: ["кондицион", "konditsioner", "split", "сплит"],
    fields: [
      { label: "Площадь охлаждения", extract: num(/(\d{1,3})\s*(?:м²|m²|кв\.?\s?м|kv\.?\s?m|m2)/, "м²") },
      { label: "Мощность", extract: btu },
      { label: "Инвертор", extract: has(/инвертор|inverter/) },
      { label: "Режимы", extract: (t) => { const cool = /охлажд|cooling|sovit/.test(t); const heat = /обогрев|isitish|heat/.test(t); if (cool && heat) return "Охлаждение / Обогрев"; if (cool) return "Охлаждение"; return null; } },
      { label: "Уровень шума", extract: num(/(\d{2,3})\s*(?:дб|db)/, "дБ") },
      { label: "Класс энергоэффективности", extract: energyClass },
      { label: "Wi-Fi", extract: has(/wi-?fi|вай-?фай/) },
      { label: "Гарантия", extract: warranty },
    ],
  },
];

export function getSpecTemplate(name?: string | null): SpecTemplate | null {
  if (!name) return null;
  const n = name.toLowerCase();
  for (const t of SPEC_TEMPLATES) if (t.match.some((m) => n.includes(m))) return t;
  return null;
}

export function extractSpecs(
  tpl: SpecTemplate,
  description?: string | null,
  existingSpecs?: Record<string, string> | null
): { label: string; value: string }[] {
  const specText = existingSpecs ? Object.entries(existingSpecs).map(([k, v]) => `${k} ${v}`).join("  ") : "";
  const text = `${description ?? ""}  ${specText}`.toLowerCase();
  const out: { label: string; value: string }[] = [];
  for (const f of tpl.fields) {
    const v = f.extract(text);
    if (v) out.push({ label: f.label, value: v });
  }
  return out;
}
