// เครดิตของสิ่งที่ไม่ได้สร้างเอง (ภาพโลก, โมเดล 3D, รูปถ่าย, วิดีโอ) — หน้า /credits สร้างจากรายการนี้
// license แบบ Creative Commons กำหนดให้บอก 4 อย่าง: ชื่องาน, ผู้สร้าง, ลิงก์ต้นฉบับ, license
// และต้องบอกด้วยว่าเราแก้ไขอะไรไปบ้าง (changes)
// เพิ่มโมเดลใหม่ → เพิ่มเครดิตที่นี่ + ใน public/models/CREDITS.md

// ลิงก์อ่านเงื่อนไขของแต่ละ license
export const LICENSES = {
  "Public domain": "https://earthobservatory.nasa.gov/image-use-policy",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-NC 4.0": "https://creativecommons.org/licenses/by-nc/4.0/",
  "CC BY-NC-SA 4.0": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  // Pexels ไม่บังคับให้ให้เครดิต แต่เราใส่ไว้ทุกไฟล์เพื่อความถูกต้อง
  "Pexels License": "https://www.pexels.com/license/",
  // CGTrader: ใช้ในงานของเราได้ (รวมงานขาย) แต่ห้ามแจกไฟล์โมเดลต่อแบบแยกชิ้น และห้ามใช้ฝึก/ป้อน AI
  "Royalty Free License (no AI)": "https://www.cgtrader.com/pages/terms-and-conditions#royalty-free-license",
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
    usedFor: "Earth — mountain relief and ocean sun glint",
    title: "Topography (GEBCO elevation, 21600×10800)",
    author: "NASA Visible Earth",
    authorUrl: "https://visibleearth.nasa.gov",
    source: "https://visibleearth.nasa.gov/images/73934/topography",
    license: "Public domain",
    changes: "Turned into a slope map and an ocean mask (scripts/earth/build-relief.py), 8192×4096 and 4096×2048 WebP.",
  },
  {
    usedFor: "Earth — sharp close-up of each product's home city during the dive",
    title: "Sentinel-2 cloudless 2016 (contains modified Copernicus Sentinel data 2016)",
    author: "EOX IT Services GmbH",
    authorUrl: "https://eox.at",
    source: "https://s2maps.eu",
    license: "CC BY 4.0",
    changes:
      "Cropped to a ~445 km square around each city, colour-matched to the NASA Blue Marble map and resized to 2048 / 1024 px WebP (scripts/earth/build-city-patches.py).",
  },
  {
    usedFor: "GRID 26 — Mercedes W17",
    title: "2026 Mercedes W17",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-mercedes-w17-b806f1e70aa343219e7158169549b97b",
    license: "CC BY 4.0",
    changes:
      "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB. A second copy is split into 16 named parts for the garage (~5.4 MB).",
  },
  {
    usedFor: "GRID 26 — Ferrari SF-26",
    title: "2026 Ferrari SF-26",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-ferrari-sf-26-e5ca6cecdc42449283f4bed27360f2a7",
    license: "CC BY 4.0",
    changes:
      "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB. A second copy is split into 16 named parts for the garage (~5.6 MB).",
  },
  {
    usedFor: "GRID 26 — Red Bull RB22",
    title: "2026 Redbull RB22",
    author: "Dave Love",
    authorUrl: "https://sketchfab.com/Tyler_Dave",
    source: "https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383",
    license: "CC BY 4.0",
    changes:
      "Compressed for the web (WebP textures, meshopt geometry), ~31 MB → ~3.9 MB. A second copy is split into 16 named parts for the scroll story and the garage (~5.9 MB).",
  },
  {
    usedFor: "FIZZ — all six cans",
    title: "Soda Cans - 500ml | Free Download",
    author: "Mark Peters",
    authorUrl: "https://sketchfab.com/mark-peters",
    source: "https://sketchfab.com/3d-models/soda-cans-500ml-free-download-84452c6420a44ea4be84c49fc6b2df6c",
    license: "CC BY-NC 4.0",
    changes:
      "Split into one file per can, then compressed for the web (WebP textures, meshopt geometry), ~2.2 MB → ~250 KB per can.",
  },
  {
    usedFor: "SIGNAL — iPhone 17 Pro",
    title: "Apple iPhone 17 Pro 6.3''",
    author: "zhe_kan",
    authorUrl: "https://sketchfab.com/zhe_kan",
    source: "https://sketchfab.com/3d-models/apple-iphone-17-pro-63-b05fec18fb8343acbb96ed84773f5e93",
    license: "CC BY-NC-SA 4.0",
    // ShareAlike (SA): ไฟล์ที่เราแก้แล้วต้องแจกต่อด้วย license เดียวกัน
    changes:
      "Compressed for the web (WebP textures, meshopt geometry), 1.6 MB → 227 KB. The modified file is shared under the same licence, CC BY-NC-SA 4.0.",
  },
  {
    usedFor: "HEARTH — the living room and kitchen (tour and home page), and its photographs",
    title: "Living room free 3d model",
    author: "cavitbarisbalta",
    authorUrl: "https://www.behance.net/cavitbarisbalta",
    source: "https://www.cgtrader.com/free-3d-models/interior/living-room/living-room-3d-model-b34a08fc-d4c3-4455-8b70-bef9d95cc471",
    license: "Royalty Free License (no AI)",
    changes:
      "Cropped to the living room and kitchen, materials re-made, meshes simplified, lighting baked in Blender Cycles and compressed for the web (scripts/hearth). The home page piece is a cut-away dollhouse of the same room (ceiling and upper walls removed). The photographs on /house are the designer's own renders from the product page, cropped to fit.",
  }, // รูปถ่ายและวิดีโอในหน้า /f1 (ดาวน์โหลดจาก Pexels)
  {
    usedFor: "GRID 26 — heritage video (desktop)",
    title: "Formula 1 race, Miami (Pexels video 15293954)",
    author: "Pexels contributor",
    authorUrl: "https://www.pexels.com/video/15293954/",
    source: "https://www.pexels.com/video/15293954/",
    license: "Pexels License",
    changes: "Scaled down to 1600×900 and re-encoded without sound; poster image taken from a frame of the clip.",
  },
  {
    usedFor: "GRID 26 — heritage video (phones)",
    title: "Verstappen Overtake at Spa",
    author: "Timo van Overdijk",
    authorUrl: "https://www.pexels.com/video/verstappen-overtake-at-spa-16726088/",
    source: "https://www.pexels.com/video/verstappen-overtake-at-spa-16726088/",
    license: "Pexels License",
    changes:
      "Scaled down to 720×1280 at 30 fps and re-encoded without sound; poster image taken from a frame of the clip.",
  },
  {
    usedFor: "GRID 26 — heritage, 2006",
    title: "Dynamic Formula 1 Car Racing on São Paulo Track",
    author: "Jonathan Borba",
    authorUrl: "https://www.pexels.com/@jonathanborba/",
    source: "https://www.pexels.com/photo/dynamic-formula-1-car-racing-on-sao-paulo-track-34680414/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — heritage, 2006",
    title: "Red Bull Racing Car on Interlagos Circuit",
    author: "Jonathan Borba",
    authorUrl: "https://www.pexels.com/@jonathanborba/",
    source: "https://www.pexels.com/photo/red-bull-racing-car-on-interlagos-circuit-34926315/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — heritage, 2023",
    title:
      "Formula 1 Red Bull RB19 race car and Toyota GR010 Hybrid Le Mans hypercar in front of the Heydar Aliyev Center in Baku, Azerbaijan",
    author: "Muhammed Abasov",
    authorUrl: "https://www.pexels.com/@muhammed-abasov-789288188/",
    source:
      "https://www.pexels.com/photo/formula-1-red-bull-rb19-race-car-and-toyota-gr010-hybrid-le-mans-hypercar-in-front-of-the-heydar-aliyev-center-in-baku-azerbaijan-19417092/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — heritage, 2024",
    title: "High-Speed Formula 1 Racing Action on Track",
    author: "Jonathan Borba",
    authorUrl: "https://www.pexels.com/@jonathanborba/",
    source: "https://www.pexels.com/photo/high-speed-formula-1-racing-action-on-track-29252126/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — heritage, 2024",
    title: "Professional Pit Stop at Formula One Race",
    author: "Jonathan Borba",
    authorUrl: "https://www.pexels.com/@jonathanborba/",
    source: "https://www.pexels.com/photo/professional-pit-stop-at-formula-one-race-29327954/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
  {
    usedFor: "GRID 26 — heritage, 2025",
    title: "High-Speed Formula 1 Car Racing in São Paulo",
    author: "Jonathan Borba",
    authorUrl: "https://www.pexels.com/@jonathanborba/",
    source: "https://www.pexels.com/photo/high-speed-formula-1-car-racing-in-sao-paulo-34835661/",
    license: "Pexels License",
    changes: "Resized and converted to WebP.",
  },
];

// ชื่อแบรนด์/โลโก้ที่ปรากฏในโมเดล เป็นของเจ้าของ — บอกไว้ชัดๆ ว่าเว็บนี้ไม่เกี่ยวข้องกับเขา
export const trademarks = [
  "Formula 1, Mercedes-AMG Petronas F1, Scuderia Ferrari, Oracle Red Bull Racing and their sponsors",
  "The Coca-Cola Company, PepsiCo and Keurig Dr Pepper",
  "Apple Inc.",
];
