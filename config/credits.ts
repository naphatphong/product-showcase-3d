// เครดิตของสิ่งที่ไม่ได้สร้างเอง (ภาพโลก, โมเดล 3D) — หน้า /credits สร้างจากรายการนี้
// license แบบ Creative Commons กำหนดให้บอก 4 อย่าง: ชื่องาน, ผู้สร้าง, ลิงก์ต้นฉบับ, license
// และต้องบอกด้วยว่าเราแก้ไขอะไรไปบ้าง (changes)
// เพิ่มโมเดลใหม่ → เพิ่มเครดิตที่นี่ + ใน public/models/CREDITS.md

// ลิงก์อ่านเงื่อนไขของแต่ละ license
export const LICENSES = {
  "Public domain": "https://earthobservatory.nasa.gov/image-use-policy",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
} as const;

export type Credit = {
  usedFor: string; // ใช้กับส่วนไหนของเว็บ
  title: string; // ชื่องานตามที่ผู้สร้างตั้ง
  author: string;
  authorUrl: string;
  source: string; // หน้าต้นฉบับของงาน
  license: keyof typeof LICENSES;
  changes: string; // สิ่งที่เราแก้ไขจากต้นฉบับ
};

export const credits: Credit[] = [
  {
    usedFor: "Earth — day, city lights and clouds",
    title: "Blue Marble Next Generation (July 2004), Black Marble 2016, Blue Marble clouds",
    author: "NASA Earth Observatory",
    authorUrl: "https://earthobservatory.nasa.gov",
    source: "https://earthobservatory.nasa.gov",
    license: "Public domain",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — Mercedes W17",
    title: "2026 Mercedes W17",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-mercedes-w17-b806f1e70aa343219e7158169549b97b",
    license: "CC BY 4.0",
    changes: "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB.",
  },
  {
    usedFor: "GRID 26 — Ferrari SF-26",
    title: "2026 Ferrari SF-26",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7",
    license: "CC BY 4.0",
    changes: "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB.",
  },
  {
    usedFor: "GRID 26 — Red Bull RB22",
    title: "2026 Redbull RB22",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383",
    license: "CC BY 4.0",
    changes: "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB.",
  },
  {
    usedFor: "FIZZ — all six cans",
    title: "Soda Cans - 500ml | Free Download",
    author: "Mark Peters",
    authorUrl: "https://sketchfab.com/mark-peters",
    source: "https://sketchfab.com/3d-models/soda-cans-500ml-free-download-84452c6420a44ea4be84c49fc6b2df6c",
    license: "CC BY-NC 4.0",
    changes: "Split into one file per can, then compressed for the web (WebP textures, meshopt geometry), ~2.2 MB → ~250 KB per can.",
  },
  {
    usedFor: "SIGNAL — iPhone 17 Pro",
    title: "Apple iPhone 17 Pro 6.3''",
    author: "zhe_kan",
    authorUrl: "https://sketchfab.com/zhe_kan",
    source: "https://sketchfab.com/3d-models/apple-iphone-17-pro-63-b05fec18fb8343acbb96ed84773f5e93",
    license: "CC BY-NC-SA 4.0",
    // ShareAlike (SA): ไฟล์ที่เราแก้แล้วต้องแจกต่อด้วย license เดียวกัน
    changes: "Compressed for the web (WebP textures, meshopt geometry), 1.6 MB → 227 KB. The modified file is shared under the same licence, CC BY-NC-SA 4.0.",
  },
];

// ชื่อแบรนด์/โลโก้ที่ปรากฏในโมเดล เป็นของเจ้าของ — บอกไว้ชัดๆ ว่าเว็บนี้ไม่เกี่ยวข้องกับเขา
export const trademarks = [
  "Formula 1, Mercedes-AMG Petronas F1, Scuderia Ferrari, Oracle Red Bull Racing and their sponsors",
  "The Coca-Cola Company, PepsiCo and Keurig Dr Pepper",
  "Apple Inc.",
];
