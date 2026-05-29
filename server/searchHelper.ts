// Умный многоязычный поиск: кириллица ↔ латиница ↔ транслит + синонимы RU↔UZ.

const CYR2LAT: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"j",з:"z",и:"i",й:"y",к:"k",
  л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"x",ц:"ts",
  ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"i",ь:"",э:"e",ю:"yu",я:"ya",
  қ:"q",ғ:"g",ҳ:"h",ў:"o",
};

function cyr2lat(s: string): string {
  return s.toLowerCase().split("").map((c) => (c in CYR2LAT ? CYR2LAT[c] : c)).join("");
}

function lat2cyr(s: string): string {
  let t = s.toLowerCase();
  const di: [RegExp, string][] = [
    [/sh/g, "ш"], [/ch/g, "ч"], [/yo/g, "ё"], [/yu/g, "ю"], [/ya/g, "я"],
    [/ts/g, "ц"], [/o'/g, "ў"], [/g'/g, "ғ"], [/q/g, "қ"],
  ];
  for (const [re, r] of di) t = t.replace(re, r);
  const mono: Record<string, string> = {
    a:"а",b:"б",v:"в",g:"г",d:"д",e:"е",j:"ж",z:"з",i:"и",y:"й",k:"к",l:"л",
    m:"м",n:"н",o:"о",p:"п",r:"р",s:"с",t:"т",u:"у",f:"ф",x:"х",h:"ҳ",c:"к",w:"в",
  };
  return t.split("").map((ch) => (ch in mono ? mono[ch] : ch)).join("");
}

// Синонимы категорий/товаров: RU / UZ-латиница / транслит. Можно дополнять.
const SYNONYM_GROUPS: string[][] = [
  ["стиральн", "kir yuvish", "kiryuvish", "stiral"],
  ["холодильник", "muzlatgich", "sovutgich", "holodilnik", "xolodilnik"],
  ["морозильник", "muzlatkich", "morozilnik"],
  ["пылесос", "changyutgich", "pilesos", "pylesos"],
  ["кондиционер", "konditsioner", "split", "сплит"],
  ["телевизор", "televizor"],
  ["телефон", "telefon", "смартфон", "smartfon", "smartphone"],
  ["микроволнов", "mikroto", "mikrovolnov"],
  ["плита", "plita", "pech", "gaz"],
  ["духовк", "duxovka", "pech"],
  ["утюг", "dazmol", "utyug"],
  ["вентилятор", "ventilyator", "fan"],
  ["блендер", "blender"],
  ["миксер", "mikser", "mixer"],
  ["чайник", "choynak", "chaynik"],
  ["мясорубк", "gosht maydalagich", "myasorubka"],
  ["соковыжималк", "sharbat", "sokovyjimalka"],
  ["ноутбук", "noutbuk", "laptop"],
  ["наушник", "quloqchin", "naushnik"],
];

function stem(token: string): string {
  return token.length > 5 ? token.slice(0, 5) : token;
}

export function buildSearchClause(query: string): { tokenGroups: string[][]; synonymPhrases: string[] } {
  const raw = (query || "").toLowerCase().replace(/ё/g, "е").trim();
  if (!raw) return { tokenGroups: [], synonymPhrases: [] };
  const rawLat = cyr2lat(raw);

  const synonymPhrases = new Set<string>();
  for (const group of SYNONYM_GROUPS) {
    const hit = group.some((g) => raw.includes(g) || rawLat.includes(cyr2lat(g)));
    if (hit) for (const g of group) { synonymPhrases.add(g); synonymPhrases.add(cyr2lat(g)); }
  }

  const tokens = raw.split(/[^a-zа-я0-9'ʻ]+/i).filter((t) => t.length >= 2);
  const tokenGroups: string[][] = [];
  for (const tok of tokens) {
    const set = new Set<string>();
    set.add(stem(tok));
    set.add(stem(cyr2lat(tok)));
    set.add(stem(lat2cyr(tok)));
    const arr = Array.from(set).filter((v) => v.length >= 2);
    if (arr.length) tokenGroups.push(arr);
  }

  return { tokenGroups, synonymPhrases: Array.from(synonymPhrases).filter((p) => p.length >= 2) };
}
