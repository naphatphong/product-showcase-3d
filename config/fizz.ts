// เนื้อหาของหน้าสินค้า FIZZ (/drink) — ข้อความทั้งหมดของหน้าอยู่ที่นี่ แก้ได้ไฟล์เดียว
// ยี่ห้อ (ชื่อ โมเดล สี เมือง) มาจาก variants ของสินค้า "drink" ใน config/products.ts
// ไฟล์นี้เพิ่มเฉพาะสิ่งที่หน้านี้ใช้: ปีที่เริ่ม รสชาติ คำอธิบาย สีพื้นหลัง

// ข้อมูลเพิ่มของแต่ละยี่ห้อ (key = id ของ variant)
// tint = สีพื้นหลังของหน้าเมื่อเลือกยี่ห้อนี้ [สีหลัก, สีเข้ม]
export type BrandStory = {
  since: number; // ปีที่เริ่มขาย
  taste: string;
  story: string;
  tint: [string, string];
};

export const brandStories: Record<string, BrandStory> = {
  "coca-cola": {
    since: 1886,
    taste: "Classic cola",
    story: "Mixed by pharmacist John Pemberton in Atlanta in 1886. The red can that started it all.",
    tint: ["#e3121b", "#3d0306"],
  },
  "coke-zero": {
    since: 2005,
    taste: "Cola, zero sugar",
    story: "Launched as Coca-Cola Zero in 2005: the classic cola character with no sugar at all.",
    tint: ["#c4101a", "#140405"],
  },
  sprite: {
    since: 1961,
    taste: "Lemon-lime",
    story: "Brought to the US by The Coca-Cola Company in 1961. Clear, crisp and caffeine-free.",
    tint: ["#0f9a4a", "#032312"],
  },
  pepsi: {
    since: 1893,
    taste: "Cola",
    story: "Created by pharmacist Caleb Bradham in New Bern, North Carolina, first sold as Brad's Drink.",
    tint: ["#1d4fd8", "#030c33"],
  },
  "pepsi-zero": {
    since: 1993,
    taste: "Cola, zero sugar",
    story: "First sold as Pepsi Max in 1993. A bolder cola taste without the sugar.",
    tint: ["#2563eb", "#020617"],
  },
  "dr-pepper": {
    since: 1885,
    taste: "23 flavours",
    story: "First served in 1885 at Morrison's Old Corner Drug Store in Waco, Texas. A blend of 23 flavours.",
    tint: ["#8c1531", "#21040b"],
  },
};

// 4 ข้อเด่นของน้ำอัดลม (section ที่สปอตไลต์ไล่ส่องกระป๋อง)
// strike = คำที่ถูกขีดฆ่าในป้ายเล็กๆ (สิ่งที่ "ไม่ใช่") / icon = ชื่อไอคอนใน components/fizz/icons.tsx
export type Benefit = {
  id: string;
  icon: "bubbles" | "cold" | "zero" | "recycle";
  strike: string;
  title: string;
  text: string;
};

export const benefits: Benefit[] = [
  {
    id: "fizz",
    icon: "bubbles",
    strike: "Flat",
    title: "Real fizz",
    text: "Carbon dioxide is dissolved into every can under pressure. Crack it open and it rushes out as millions of tiny bubbles. That bite is the whole point.",
  },
  {
    id: "cold",
    icon: "cold",
    strike: "Warm",
    title: "Ice cold",
    text: "Best at around 4 °C. Cold drinks hold on to their CO₂ for longer, so the fizz lasts and every sip stays sharp.",
  },
  {
    id: "zero",
    icon: "zero",
    strike: "Sugar only",
    title: "Zero sugar, too",
    text: "Two of the six cans skip the sugar completely. Same cola character, sweetened with no-calorie sweeteners instead.",
  },
  {
    id: "recycle",
    icon: "recycle",
    strike: "Single use",
    title: "Endless cans",
    text: "Aluminium can be recycled again and again without losing quality. Recycled cans can be back on the shelf in as little as 60 days.",
  },
];

// คำถามที่พบบ่อย (ใช้แท็ก <details> ของ HTML กดเปิด/ปิดได้เลย ไม่ต้องเขียน JavaScript)
export const faq: { q: string; a: string }[] = [
  {
    q: "What is FIZZ?",
    a: "A concept page from a 3D portfolio: six classic sodas you can spin, compare and explore. Nothing here is for sale.",
  },
  {
    q: "Why does soda fizz?",
    a: "Carbon dioxide is dissolved into the drink under pressure and the can is sealed. Opening it drops the pressure, so the gas escapes as bubbles.",
  },
  {
    q: "Why does cold soda stay fizzy for longer?",
    a: "Gases dissolve better in cold liquids. A warm can loses its CO₂ faster, which is why it tastes flat sooner.",
  },
  {
    q: "Which cans are zero sugar?",
    a: "Coke Zero and Pepsi Zero. They replace sugar with no-calorie sweeteners.",
  },
  {
    q: "How big are the cans?",
    a: "500 ml, the size of the cans in the 3D models.",
  },
  {
    q: "Are the cans recyclable?",
    a: "Yes. Aluminium cans can be recycled endlessly without losing quality.",
  },
  {
    q: "Who made the 3D cans?",
    a: "Mark Peters, shared under CC BY-NC 4.0. All credits are on the Credits page.",
  },
  {
    q: "Is this site linked to these brands?",
    a: "No. It is a non-commercial fan concept, not affiliated with The Coca-Cola Company, PepsiCo or Keurig Dr Pepper.",
  },
];
