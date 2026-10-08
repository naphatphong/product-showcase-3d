// ข้อมูลสินค้าทั้งหมดของโชว์รูม — แก้ชื่อ รายละเอียด สี ได้ที่ไฟล์นี้ที่เดียว
// เก็บเป็นข้อมูลล้วน (ไม่มีโค้ด 3D ปน) เพื่อให้ย้ายไปเก็บใน Supabase ได้ในเฟสร้านค้า
// ชื่อสินค้า (FIZZ / ORLÉ / GRID 26) แก้ได้ที่นี่ที่เดียว

type Place = { city: string; lat: number; lon: number };

// แบบย่อยของสินค้า (เช่น รถ 3 ทีม) — แต่ละแบบมีโมเดล สี และเมืองบ้านเกิดของตัวเอง
export type Variant = {
  id: string;
  name: string;
  model: string; // ไฟล์ .glb ในโฟลเดอร์ public/
  accent: string;
  origin: Place;
};

export type Product = {
  slug: "drink" | "watch" | "f1"; // ใช้เป็น URL ของหน้าสินค้า เช่น /watch
  name: string;
  category: string;
  tagline: string;
  accent: string; // สีประจำสินค้า: แสงวงแหวนที่แท่น + ปุ่ม
  specs: { label: string; value: string }[];
  // จุด "บ้านเกิด" บนโลก ตอนกดเข้า กล้องจะพุ่งเข้าหาจุดนี้ (lat บวก = เหนือ, lon บวก = ตะวันออก)
  origin: Place;
  note?: string; // ข้อความเล็กๆ ท้ายหน้าสินค้า (ถ้าไม่มี ใช้ข้อความ concept project)
  size?: number; // ขนาดในโชว์รูม (ความยาวด้านที่ยาวที่สุด) ค่าเริ่มต้น 1.9 — ของยาวๆ อย่างรถให้ใหญ่ขึ้น
  variants?: Variant[]; // ถ้ามี: เลือกแบบได้ และใช้โมเดล/สี/เมืองของแบบที่เลือก
};

// เมืองที่ใช้ซ้ำหลายแบบ
const ATLANTA: Place = { city: "Atlanta", lat: 33.75, lon: -84.39 }; // Coca-Cola (1886)
const NEW_BERN: Place = { city: "New Bern", lat: 35.11, lon: -77.04 }; // Pepsi (1893)

export const products: Product[] = [
  {
    slug: "drink",
    name: "FIZZ",
    category: "Soft drinks",
    tagline: "Six classics. Ice cold.",
    accent: "#8fd8ff",
    specs: [
      { label: "Volume", value: "500 ml" },
      { label: "Brands", value: "6" },
      { label: "Best served", value: "4 °C" },
    ],
    origin: ATLANTA,
    note: "Fan concept — not affiliated with The Coca-Cola Company, PepsiCo or Keurig Dr Pepper. 3D model by Mark Peters (CC BY-NC 4.0).",
    // กระป๋อง 6 ยี่ห้อ = 6 แบบ (โมเดลต้นฉบับมี 6 กระป๋องในไฟล์เดียว แยกออกมาไฟล์ละยี่ห้อ จะได้โหลดทีละกระป๋อง)
    // เมืองบ้านเกิด = เมืองที่ยี่ห้อนั้นเริ่มต้น (สูตร Zero ใช้เมืองเดียวกับยี่ห้อหลัก, Sprite ใช้ Atlanta ที่ตั้งของ Coca-Cola)
    variants: [
      { id: "coca-cola", name: "Coca-Cola", model: "/models/soda/coca-cola.glb", accent: "#f40009", origin: ATLANTA },
      { id: "coke-zero", name: "Coke Zero", model: "/models/soda/coca-cola-zero.glb", accent: "#ff4f4f", origin: ATLANTA },
      { id: "sprite", name: "Sprite", model: "/models/soda/sprite.glb", accent: "#1fbf5c", origin: ATLANTA },
      { id: "pepsi", name: "Pepsi", model: "/models/soda/pepsi.glb", accent: "#2f6fe0", origin: NEW_BERN },
      { id: "pepsi-zero", name: "Pepsi Zero", model: "/models/soda/pepsi-zero.glb", accent: "#4aa3ff", origin: NEW_BERN },
      {
        id: "dr-pepper",
        name: "Dr Pepper",
        model: "/models/soda/dr-pepper.glb",
        accent: "#c8324f",
        origin: { city: "Waco", lat: 31.55, lon: -97.15 },
      },
    ],
  },
  {
    slug: "watch",
    name: "ORLÉ",
    category: "Luxury watch",
    tagline: "Time, worn beautifully.",
    accent: "#d9b26a",
    specs: [
      { label: "Case", value: "40 mm" },
      { label: "Movement", value: "Automatic" },
      { label: "Reserve", value: "70 h" },
    ],
    origin: { city: "Geneva", lat: 46.2, lon: 6.14 },
  },
  {
    slug: "f1",
    name: "GRID 26",
    category: "1:18 scale model",
    tagline: "Three rivals. One new era.",
    accent: "#e10600",
    specs: [
      { label: "Scale", value: "1:18" },
      { label: "Length", value: "30 cm" },
      { label: "Teams", value: "3" },
    ],
    origin: { city: "Monaco", lat: 43.74, lon: 7.42 },
    note: "Fan concept — not affiliated with Formula 1 or any team. 3D models by Dave Love (CC BY 4.0).",
    size: 2.6,
    // เมืองบ้านเกิด = ที่ตั้งโรงงานของแต่ละทีม
    variants: [
      {
        id: "mercedes-w17",
        name: "Mercedes W17",
        model: "/models/f1/mercedes-w17.glb",
        accent: "#00d7b6",
        origin: { city: "Brackley", lat: 52.03, lon: -1.15 },
      },
      {
        id: "ferrari-sf26",
        name: "Ferrari SF-26",
        model: "/models/f1/ferrari-sf26.glb",
        accent: "#ff2a2a",
        origin: { city: "Maranello", lat: 44.53, lon: 10.86 },
      },
      {
        id: "redbull-rb22",
        name: "Red Bull RB22",
        model: "/models/f1/redbull-rb22.glb",
        accent: "#4f7bff",
        origin: { city: "Milton Keynes", lat: 52.04, lon: -0.76 },
      },
    ],
  },
];

// ค่าที่ใช้แสดงจริงของสินค้า: ถ้ามีหลายแบบ ใช้สี/เมือง/โมเดลของแบบที่เลือก ไม่งั้นใช้ค่าของสินค้า
export function look(product: Product, variant = 0) {
  const v = product.variants?.[variant] ?? null;
  return { variant: v, accent: v?.accent ?? product.accent, origin: v?.origin ?? product.origin };
}
