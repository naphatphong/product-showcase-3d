// ข้อมูลสินค้าทั้งหมดของโชว์รูม — แก้ชื่อ รายละเอียด สี ได้ที่ไฟล์นี้ที่เดียว
// เก็บเป็นข้อมูลล้วน (ไม่มีโค้ด 3D ปน) เพื่อให้ย้ายไปเก็บใน Supabase ได้ในเฟสร้านค้า
// ชื่อสินค้า (FIZZ / SIGNAL / GRID 26 / HEARTH) แก้ได้ที่นี่ที่เดียว

type Place = { city: string; lat: number; lon: number };

// แบบของสินค้า (เช่น รถ 3 ทีม, น้ำ 6 ยี่ห้อ) — แต่ละแบบมีโมเดล สี และเมืองบ้านเกิดของตัวเอง
export type Variant = {
  id: string;
  name: string;
  model: string; // ไฟล์ .glb ในโฟลเดอร์ public/
  accent: string; // สีของแบบนี้: แสงขอบสินค้า, ปุ่ม Enter, จุดบอกตำแหน่ง
  swatch?: string; // สีของปุ่มเลือกแบบ (CSS background) ถ้าไม่ตรงกับ accent เช่น กระป๋องสีดำ
  origin: Place;
};

export type Product = {
  slug: "drink" | "phone" | "f1" | "house"; // ใช้เป็น URL ของหน้าสินค้า เช่น /phone
  name: string;
  category: string;
  tagline: string;
  accent: string; // สีประจำสินค้า (ใช้ในหน้าสินค้า)
  specs: { label: string; value: string }[];
  // จุด "บ้านเกิด" ของสินค้า (แสดงในหน้าสินค้า) — lat บวก = เหนือ, lon บวก = ตะวันออก
  origin: Place;
  note?: string; // ข้อความเล็กๆ ท้ายหน้าสินค้า (ถ้าไม่มี ใช้ข้อความ concept project)
  size?: number; // ขนาดในโชว์รูม (ความยาวด้านที่ยาวที่สุด) ค่าเริ่มต้น 1.9 — ของยาวๆ อย่างรถให้ใหญ่ขึ้น
  // แบบของสินค้า อย่างน้อย 1 แบบ (type [Variant, ...Variant[]] = array ที่ห้ามว่าง)
  // มีมากกว่า 1 แบบ → แผงรายละเอียดมีปุ่มให้เลือก / ตอนกดเข้า กล้องดำดิ่งไปเมืองของแบบที่เลือก
  variants: [Variant, ...Variant[]];
  defaultVariant?: string; // id ของแบบที่เลือกไว้ตอนเปิดเว็บ (ไม่ใส่ = แบบแรก) ลำดับปุ่มเลือกแบบไม่เปลี่ยน
};

// เมืองที่ใช้ซ้ำหลายแบบ
const ATLANTA: Place = { city: "Atlanta", lat: 33.75, lon: -84.39 }; // Coca-Cola (1886)
const NEW_BERN: Place = { city: "New Bern", lat: 35.11, lon: -77.04 }; // Pepsi (1893)
const CUPERTINO: Place = { city: "Cupertino", lat: 37.33, lon: -122.01 }; // Apple Park

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
    defaultVariant: "pepsi-zero",
    // กระป๋อง 6 ยี่ห้อ = 6 แบบ (โมเดลต้นฉบับมี 6 กระป๋องในไฟล์เดียว แยกออกมาไฟล์ละยี่ห้อ จะได้โหลดทีละกระป๋อง)
    // เมืองบ้านเกิด = เมืองที่ยี่ห้อนั้นเริ่มต้น (สูตร Zero ใช้เมืองเดียวกับยี่ห้อหลัก, Sprite ใช้ Atlanta ที่ตั้งของ Coca-Cola)
    variants: [
      { id: "coca-cola", name: "Coca-Cola", model: "/models/soda/coca-cola.glb", accent: "#f40009", origin: ATLANTA },
      {
        id: "coke-zero",
        name: "Coke Zero",
        model: "/models/soda/coca-cola-zero.glb",
        accent: "#ff4f4f",
        swatch: "linear-gradient(135deg, #f40009 50%, #111 50%)", // กระป๋องแดง ตัวหนังสือดำ
        origin: ATLANTA,
      },
      { id: "sprite", name: "Sprite", model: "/models/soda/sprite.glb", accent: "#1fbf5c", origin: ATLANTA },
      { id: "pepsi", name: "Pepsi", model: "/models/soda/pepsi.glb", accent: "#2f6fe0", origin: NEW_BERN },
      {
        id: "pepsi-zero",
        name: "Pepsi Zero",
        model: "/models/soda/pepsi-zero.glb",
        accent: "#4aa3ff",
        swatch: "linear-gradient(135deg, #111 50%, #2f6fe0 50%)", // กระป๋องดำ โลโก้น้ำเงิน
        origin: NEW_BERN,
      },
      {
        id: "dr-pepper",
        name: "Dr Pepper",
        model: "/models/soda/dr-pepper.glb",
        accent: "#c8324f",
        swatch: "#6d0f22", // สีกระป๋องจริงเข้มกว่า accent (accent สว่างขึ้นให้อ่านบนพื้นดำได้)
        origin: { city: "Waco", lat: 31.55, lon: -97.15 },
      },
    ],
  },
  {
    slug: "phone",
    name: "SIGNAL",
    category: "Smartphones",
    tagline: "Pro, from every angle.",
    accent: "#7d8cff",
    specs: [
      { label: "Display", value: "6.3″" },
      { label: "Chip", value: "A19 Pro" },
      { label: "Cameras", value: "3 × 48 MP" },
    ],
    origin: CUPERTINO,
    note: "Fan concept — not affiliated with Apple. 3D model by zhe_kan (CC BY-NC-SA 4.0).",
    size: 1.7, // มือถือ 2 เครื่องวางคู่กันเป็นสี่เหลี่ยมเกือบจัตุรัส ดูใหญ่กว่ากระป๋อง จึงย่อลงนิดหน่อย
    // โมเดลวางมือถือ 2 เครื่องคู่กัน (ด้านหลัง + หน้าจอ) ตามที่ผู้สร้างจัดไว้
    variants: [
      {
        id: "iphone-17-pro",
        name: "iPhone 17 Pro",
        model: "/models/phone/iphone-17-pro.glb",
        accent: "#7d8cff",
        swatch: "#34406e", // สี Deep Blue ของตัวเครื่อง
        origin: CUPERTINO,
      },
    ],
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
    defaultVariant: "redbull-rb22",
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
  {
    slug: "house",
    name: "HEARTH",
    category: "Living room & kitchen",
    tagline: "A living room built around the fire.",
    accent: "#c9955c", // บรอนซ์อุ่นแบบโคมทองเหลืองในห้อง
    specs: [
      { label: "Floor area", value: "52 m²" },
      { label: "Ceiling", value: "2.7 m" },
      { label: "Seats", value: "16" },
    ],
    origin: { city: "Khon Kaen", lat: 16.44, lon: 102.83 },
    size: 2.3, // ห้องยาวแต่เตี้ย ขยายขึ้นนิดหน่อย จะได้ไม่ดูเล็กกว่าชิ้นอื่น
    // ห้องเดียวกับทัวร์ในหน้า /house แบบบ้านตุ๊กตา: ตัดฝ้ากับครึ่งบนของผนังออก มองเห็นข้างใน (scripts/hearth/ring.py)
    variants: [
      {
        id: "hearth",
        name: "Hearth",
        model: "/models/house/hearth-ring.glb",
        accent: "#c9955c",
        swatch: "#b5a796", // สีหินอุ่นของหน้า HEARTH
        origin: { city: "Khon Kaen", lat: 16.44, lon: 102.83 },
      },
    ],
  },
];

// ลำดับของแบบเริ่มต้น (จาก defaultVariant) — id ไม่ตรงกับแบบไหนเลย → แบบแรก
export function defaultVariantIndex(product: Product) {
  return Math.max(0, product.variants.findIndex((v) => v.id === product.defaultVariant));
}

// ค่าที่ใช้แสดงจริงของสินค้าตามแบบที่เลือก (เลขแบบเกินจำนวน → ใช้แบบแรก)
export function look(product: Product, variant = 0) {
  const v = product.variants[variant] ?? product.variants[0];
  return { variant: v, accent: v.accent, origin: v.origin };
}

// ลิงก์ไปหน้าสินค้า: สินค้าที่มีหลายแบบส่งแบบที่เลือกไปด้วย (?v=sprite) หน้าสินค้าจะเปิดมาที่แบบเดียวกัน
export function productHref(product: Product, variant = 0) {
  const v = look(product, variant).variant;
  return product.variants.length > 1 ? `/${product.slug}?v=${v.id}` : `/${product.slug}`;
}
