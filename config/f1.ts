// ข้อมูลหน้า GRID 26 (/f1): ชิ้นส่วนรถ + เนื้อหาแต่ละบทของเรื่องเล่า "แยกชิ้นส่วนรถ แล้วประกอบกลับ"
// ชื่อชิ้นส่วน (PartId) = ชื่อ node ในไฟล์ public/models/f1/*-parts.glb (สร้างด้วย scripts/split-f1-parts.mjs)
// แก้ข้อความ/ตัวเลข/ทิศที่ชิ้นส่วนลอยออก ได้ที่ไฟล์นี้ที่เดียว

export type PartId =
  | "front"
  | "halo"
  | "cockpit"
  | "chassis"
  | "sidepodL"
  | "sidepodR"
  | "cover"
  | "pu"
  | "floor"
  | "rear"
  | "suspF"
  | "suspR"
  | "wFL"
  | "wFR"
  | "wRL"
  | "wRR";

// รถในเรื่องเล่า: Red Bull RB22 คันเดียว (บลูเลือก 2026-10-09) ส่วนอีก 2 ทีมอยู่ในหน้าโชว์รูม
export const STORY_CAR = {
  name: "Red Bull RB22",
  short: "RB22",
  model: "/models/f1/redbull-rb22-parts.glb",
};

// ตำแหน่งที่แต่ละชิ้นลอยไปตอนแยกชิ้นเต็มที่ (เมตร เทียบกับตำแหน่งตอนประกอบ)
// x = ด้านข้าง, y = ขึ้น, z = ไปทางหน้ารถ (+) / ท้ายรถ (−)
// แนวคิด: พื้นรถกับล้อวางอยู่บนพื้นเหมือนเดิม (ล้อแยกออกด้านข้าง) ชิ้นอื่นลอยขึ้นเป็นชั้นๆ เหมือนภาพแยกชิ้นในคู่มือ
export const EXPLODE: Record<PartId, [number, number, number]> = {
  floor: [0, 0, 0],
  wFL: [-1.0, 0, 0.35],
  wFR: [1.0, 0, 0.35],
  wRL: [-1.0, 0, -0.35],
  wRR: [1.0, 0, -0.35],
  chassis: [0, 0.75, 0],
  suspF: [0, 0.75, 0.2],
  suspR: [0, 0.75, -0.2],
  sidepodL: [-0.95, 0.85, 0],
  sidepodR: [0.95, 0.85, 0],
  pu: [0, 1.05, -0.2],
  cockpit: [0, 1.55, 0.5],
  halo: [0, 1.75, 0.35],
  cover: [0, 1.75, -0.45],
  front: [0, 0.75, 1.45],
  rear: [0, 0.95, -1.05],
};

// ลำดับตอนแยกชิ้น: ชิ้นนอกออกก่อน ชิ้นในตามมา
// (ตอนประกอบกลับใช้ลำดับเดียวกันแบบย้อนกลับเอง: ชิ้นในเข้าที่ก่อน ชิ้นนอกเข้าที่หลังสุด)
export const EXPLODE_ORDER: PartId[] = [
  "front",
  "rear",
  "wFL",
  "wFR",
  "wRL",
  "wRR",
  "cover",
  "halo",
  "cockpit",
  "sidepodL",
  "sidepodR",
  "suspF",
  "suspR",
  "pu",
  "chassis",
  "floor",
];

export type Chapter = {
  id: string; // ชื่อ section ในหน้า (ต้องไม่ซ้ำกับ section อื่น)
  kicker: string; // หมวดเล็กๆ เหนือหัวข้อ
  title: string;
  short: string; // ชื่อสั้นในรายการบทด้านขวาจอ
  text: string;
  stats: { label: string; value: string }[]; // ตัวเลข/ข้อมูลสั้นๆ 3 ช่อง
  parts: PartId[]; // ชิ้นที่เน้นในบทนี้ (ชิ้นอื่นกลายเป็นสีเทาอ่อน)
};

// 8 บท บทละชิ้นส่วน (ข้อมูลตามกติการถ F1 ปี 2026 ของ FIA — ตัวเลขที่มี ≈ เป็นค่าประมาณ)
export const CHAPTERS: Chapter[] = [
  {
    id: "front",
    kicker: "Aerodynamics",
    title: "Front wing & nose",
    short: "Front wing",
    text: "The first part of the car to meet the air. It decides how air flows around the front wheels and under the car. New for 2026, its flaps move: they flatten on the straights to cut drag, then tilt back up for grip in the corners.",
    stats: [
      { label: "Active aero", value: "Front + rear" },
      { label: "Car width", value: "1,900 mm" },
      { label: "Nose", value: "Crash structure" },
    ],
    parts: ["front"],
  },
  {
    id: "cockpit",
    kicker: "Safety",
    title: "Halo & cockpit",
    short: "Cockpit",
    text: "A titanium hoop over the driver's head that can deflect a loose wheel or debris. Below it is the cockpit: a seat moulded to the driver, a six-point harness and a steering wheel packed with buttons, dials and a screen.",
    stats: [
      { label: "Halo", value: "Titanium" },
      { label: "Weight", value: "≈ 7 kg" },
      { label: "Required since", value: "2018" },
    ],
    parts: ["halo", "cockpit"],
  },
  {
    id: "chassis",
    kicker: "Structure",
    title: "Survival cell",
    short: "Survival cell",
    text: "The carbon-fibre tub at the heart of the car. The driver sits inside it, the fuel cell sits right behind them, and almost everything else bolts on to it. It has to pass the FIA's crash and load tests before it may race.",
    stats: [
      { label: "Material", value: "Carbon composite" },
      { label: "Inside", value: "Driver + fuel" },
      { label: "Wheelbase", value: "≤ 3,400 mm" },
    ],
    parts: ["chassis"],
  },
  {
    id: "power",
    kicker: "Power",
    title: "Power unit",
    short: "Power unit",
    text: "A 1.6-litre turbocharged V6 working together with a strong electric motor. From 2026 the power is split roughly half and half between the two, and the engine runs on 100% sustainable fuel. The engine cover lifts off to show it.",
    stats: [
      { label: "Engine", value: "1.6 L V6 turbo" },
      { label: "Electric motor", value: "350 kW" },
      { label: "Fuel", value: "100% sustainable" },
    ],
    parts: ["pu", "cover"],
  },
  {
    id: "sidepods",
    kicker: "Cooling",
    title: "Sidepods",
    short: "Sidepods",
    text: "The bodywork on each side of the driver hides the radiators that keep the engine and battery at working temperature. Their shape guides air towards the back of the car, and it is one of the easiest ways to tell the teams apart.",
    stats: [
      { label: "Inside", value: "Radiators" },
      { label: "Cools", value: "Engine + battery" },
      { label: "Shape", value: "Team-specific" },
    ],
    parts: ["sidepodL", "sidepodR"],
  },
  {
    id: "floor",
    kicker: "Aerodynamics",
    title: "Floor & diffuser",
    short: "Floor",
    text: "The biggest wing on the car is underneath it. Air rushing under the floor and out through the diffuser at the back pulls the car down onto the track. The 2026 rules make the floor flatter, so it relies less on ground effect than before.",
    stats: [
      { label: "Job", value: "Downforce" },
      { label: "Under it", value: "Wear plank" },
      { label: "Downforce vs 2025", value: "≈ −30%" },
    ],
    parts: ["floor"],
  },
  {
    id: "rear",
    kicker: "Aerodynamics",
    title: "Rear wing",
    short: "Rear wing",
    text: "It presses the rear tyres into the track for grip and stability. In 2026 every car opens its rear-wing flap on the straights for top speed, which replaces DRS, and closes it again before the next corner.",
    stats: [
      { label: "Moving flap", value: "On straights" },
      { label: "Replaces", value: "DRS" },
      { label: "Drag vs 2025", value: "≈ −55%" },
    ],
    parts: ["rear"],
  },
  {
    id: "wheels",
    kicker: "Grip",
    title: "Wheels & suspension",
    short: "Wheels",
    text: "Four 18-inch wheels on Pirelli tyres, a little narrower for 2026. The suspension arms join each wheel to the car and keep the tyres pressed flat on the track over every kerb and bump.",
    stats: [
      { label: "Rims", value: "18-inch" },
      { label: "Tyres", value: "Pirelli" },
      { label: "Car minimum", value: "768 kg" },
    ],
    parts: ["wFL", "wFR", "wRL", "wRR", "suspF", "suspR"],
  },
];
