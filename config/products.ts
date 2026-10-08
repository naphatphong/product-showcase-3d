// ข้อมูลสินค้าทั้งหมดของโชว์รูม — แก้ชื่อ รายละเอียด สี ได้ที่ไฟล์นี้ที่เดียว
// เก็บเป็นข้อมูลล้วน (ไม่มีโค้ด 3D ปน) เพื่อให้ย้ายไปเก็บใน Supabase ได้ในเฟสร้านค้า
// ชื่อสินค้าทั้ง 3 ยังรอยืนยัน

export type Product = {
  slug: "drink" | "watch" | "car"; // ใช้เป็น URL ของหน้าสินค้า เช่น /watch
  name: string;
  category: string;
  tagline: string;
  accent: string; // สีประจำสินค้า: แสงวงแหวนที่แท่น + ปุ่ม
  specs: { label: string; value: string }[];
  // จุด "บ้านเกิด" บนโลก ตอนกดเข้า กล้องจะพุ่งเข้าหาจุดนี้ (lat บวก = เหนือ, lon บวก = ตะวันออก)
  origin: { city: string; lat: number; lon: number };
};

export const products: Product[] = [
  {
    slug: "drink",
    name: "VOLTRA",
    category: "Energy drink",
    tagline: "Unleash the edge.",
    accent: "#ff3b2f",
    specs: [
      { label: "Caffeine", value: "160 mg" },
      { label: "Volume", value: "500 ml" },
      { label: "Flavors", value: "3" },
    ],
    origin: { city: "Los Angeles", lat: 34.05, lon: -118.24 },
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
    slug: "car",
    name: "GT-R R35",
    category: "Sports car",
    tagline: "Precision at full speed.",
    accent: "#7fb2ff",
    specs: [
      { label: "Engine", value: "3.8 L V6 TT" },
      { label: "Power", value: "565 hp" },
      { label: "0–100", value: "2.9 s" },
    ],
    origin: { city: "Tokyo", lat: 35.68, lon: 139.69 },
  },
];
