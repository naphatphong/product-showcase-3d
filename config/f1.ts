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

// ตอนบทของชิ้นนั้นแสดงอยู่ ชิ้นที่เน้นจะลอยออกมาอีกเท่านี้ (เมตร บวกเพิ่มจากตำแหน่งแยกชิ้น)
// ส่วนใหญ่ลอยตรงเข้าหากล้องของบทนั้น (ทิศเดียวกับมุมกล้องใน components/f1/scene/timeline.ts) ภาพชิ้นจึงใหญ่ขึ้น
// และอยู่หน้าชิ้นอื่น ไม่โดนบัง — ตัวถังกับเครื่องยนต์อยู่กลางคันจึงต้องลอยออกมาไกลกว่าชิ้นอื่น
// ไซด์พอด 2 ข้างลอยขึ้นเหนือชิ้นอื่นทั้งหมดและขยับเข้าหากันเล็กน้อย (ให้ทั้งคู่พอดีจอ) / พื้นรถอยู่ล่างสุด ไม่ต้องลอย
// ถ้าเปลี่ยนมุมกล้องของบทไหน ให้แก้ทิศของชิ้นในบทนั้นตามด้วย
export const FOCUS: Record<PartId, [number, number, number]> = {
  front: [0.46, 0.18, 0.63],
  halo: [0.54, 0.38, 0.45],
  cockpit: [0.54, 0.38, 0.45],
  chassis: [2.23, 0.74, 0.48],
  pu: [2.53, 0.77, 0.92],
  cover: [2.53, 0.77, 0.92],
  sidepodL: [0.35, 1.5, 0.5],
  sidepodR: [-0.35, 1.5, 0.5],
  floor: [0, 0, 0],
  rear: [0.4, 0.15, -0.67],
  wFL: [0.14, 0.2, 0.43],
  wFR: [0.14, 0.2, 0.43],
  wRL: [0.14, 0.2, 0.43],
  wRR: [0.14, 0.2, 0.43],
  suspF: [0.14, 0.2, 0.43],
  suspR: [0.14, 0.2, 0.43],
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

// ---------- หน้าความเร็ว: หน้าปัดครึ่งวงกลม + ตัวเลข 3 ช่อง (แบบส่วน TECH ของเว็บ Aevion) ----------
// ตัวเลขเป็นค่าประมาณของรถ F1 ปี 2026 (ทีมไม่เปิดเผยตัวเลขจริง จึงมี ≈ นำหน้า)
// ช่องที่เลือกอยู่จะนับตัวเลขขึ้นในวงกลมกลางหน้าปัด พร้อมเข็มความเร็ววิ่งไปที่ needle (กม./ชม.) ในเวลา time วินาที
// ช่อง 0–100 กม./ชม. เข็มเริ่มจาก 0 แล้ววิ่งถึง 100 ใน 2.6 วินาทีจริงๆ (เร็วเท่ารถจริง)
export type SpeedStat = {
  value: number; // ตัวเลขในช่อง
  decimals: number; // ทศนิยมกี่ตำแหน่ง
  unit: string;
  label: string;
  needle: number; // ความเร็วที่เข็มไปหยุด (กม./ชม.)
  time: number; // วินาทีที่เข็มใช้วิ่งไปถึง
  fromZero: boolean; // เข็มกลับไปเริ่มที่ 0 ก่อนออกตัว
};

export const SPEED = {
  max: 360, // ปลายหน้าปัด (กม./ชม.)
  stats: [
    { value: 350, decimals: 0, unit: "km/h", label: "Top speed", needle: 350, time: 1.8, fromZero: false },
    { value: 2.6, decimals: 1, unit: "s", label: "0–100 km/h", needle: 100, time: 2.6, fromZero: true },
    { value: 1000, decimals: 0, unit: "hp", label: "Peak power", needle: 320, time: 1.4, fromZero: false },
  ] satisfies SpeedStat[],
};

// ---------- หน้าประวัติ: ไทม์ไลน์ทีม Red Bull Racing เลื่อนลงยาวๆ แบบหน้าเว็บ Longbow ----------
// photos = รูปจริงในโฟลเดอร์ public/photos/f1/ (0–2 รูปต่อปี, ไม่มีรูป = ชื่อรถตัวโตแบบตัวหนังสือโปสเตอร์แทน)
// caption = ที่และปีที่ถ่ายจริง (รูปบางรูปเป็นรถรุ่นหลัง ไม่ใช่รถของปีนั้น เช่น ทีมน้อง Racing Bulls ปี 2025)
export type Photo = { src: string; alt: string; caption: string };
export type Era = {
  year: string;
  car: string;
  title: string;
  text: string;
  photos?: Photo[];
};

// วิดีโอเต็มจอแรกของหน้าประวัติ (ก่อนหัวข้อ "Since 2005."): คลิปแข่งรถจริงจากข้างสนาม
// ไฟล์ใน public/video/f1/ (ย่อด้วย ffmpeg แล้ว ไม่มีเสียง) — wide = คอม (16:9), tall = มือถือ (9:16)
// caption = รถ/สนามที่อยู่ในคลิปจริง (ถ่ายจากอัฒจันทร์ ไม่ใช่รถ RB22)
export type Clip = { src: string; poster: string; caption: string };
export const HERITAGE_FILM: { wide: Clip; tall: Clip } = {
  wide: { src: "/video/f1/race-wide.mp4", poster: "/video/f1/race-wide.webp", caption: "Formula 1 · Miami" },
  tall: { src: "/video/f1/race-tall.mp4", poster: "/video/f1/race-tall.webp", caption: "Verstappen overtaking · Spa" },
};

export const HERITAGE: Era[] = [
  {
    year: "2005",
    car: "RB1",
    title: "First race",
    text: "Red Bull's first Formula 1 car, built by the team it bought from Jaguar.",
  },
  {
    year: "2006",
    car: "STR1",
    title: "A second team",
    text: "Red Bull buys Minardi and turns it into a second team, Toro Rosso. It races today as Racing Bulls.",
    photos: [
      {
        src: "/photos/f1/racing-bulls-2025-b.webp",
        alt: "A white Racing Bulls car cornering at Interlagos",
        caption: "Racing Bulls · São Paulo 2025",
      },
      {
        src: "/photos/f1/racing-bulls-2025-a.webp",
        alt: "A white Racing Bulls car at speed at Interlagos",
        caption: "Racing Bulls · São Paulo 2025",
      },
    ],
  },
  {
    year: "2010",
    car: "RB6",
    title: "First titles",
    text: "Sebastian Vettel and Red Bull win both championships, then three more years in a row.",
  },
  {
    year: "2021",
    car: "RB16B",
    title: "Max's first title",
    text: "The first of four drivers' titles in a row for Max Verstappen.",
  },
  {
    year: "2023",
    car: "RB19",
    title: "21 of 22",
    text: "The most dominant season in Formula 1 history: 21 wins from 22 races.",
    photos: [
      {
        src: "/photos/f1/rb19-baku-2023.webp",
        alt: "The Red Bull RB19 next to a Toyota Le Mans hypercar in front of the Heydar Aliyev Center",
        caption: "RB19 · Baku 2023",
      },
    ],
  },
  {
    year: "2024",
    car: "RB20",
    title: "From 17th to first",
    text: "São Paulo in the rain: Max Verstappen starts 17th and wins, on his way to a fourth title in a row.",
    photos: [
      {
        src: "/photos/f1/rb20-above-2024.webp",
        alt: "The Red Bull RB20 seen from above on track",
        caption: "RB20 · São Paulo 2024",
      },
      {
        src: "/photos/f1/rb-pitstop-2024.webp",
        alt: "The Red Bull pit crew working on the car in the wet pit lane",
        caption: "Pit crew · São Paulo 2024",
      },
    ],
  },
  {
    year: "2025",
    car: "RB21",
    title: "Last Honda year",
    text: "The last season with Honda power before Red Bull builds an engine of its own.",
    photos: [
      {
        src: "/photos/f1/rb21-interlagos-2025.webp",
        alt: "The Red Bull RB21 on track at Interlagos",
        caption: "RB21 · São Paulo 2025",
      },
    ],
  },
  {
    year: "2026",
    car: "RB22",
    title: "Own engine",
    text: "The first Red Bull with an engine of its own, the Red Bull Ford DM01.",
  },
];

// ---------- หน้าความสวย: กล้องเข้าใกล้รถ 3D พร้อมป้ายชี้จุดเด่น (แบบป้าย HUD ของเว็บ Aevion) ----------
// anchor = จุดบนตัวรถที่เส้นของป้ายชี้ไป (เมตร พิกัดเดียวกับโมเดล: x ด้านข้าง, y ขึ้น, z ไปทางหน้ารถ)
// dx, dy = ตำแหน่งกล่องข้อความเทียบกับจุดนั้น (px บนจอคอมขนาด 1440×900, ค่าลบ = ซ้าย/ขึ้น)
//   จอขนาดอื่นระยะจะย่อ/ขยายตามขนาดรถบนจอเอง (ดู --u ของ .f1-pin ใน globals.css)
export type Callout = {
  label: string;
  text: string;
  short: string; // ข้อความสั้นในตาราง 3 ช่องบนมือถือ (มือถือไม่มีป้ายชี้บนรถ)
  anchor: [number, number, number];
  dx: number;
  dy: number;
};

export const DESIGN_CALLOUTS: Callout[] = [
  {
    label: "Matte livery",
    text: "Navy blue, red and yellow since 2005, in matte paint since 2016.",
    short: "Matte since 2016",
    anchor: [0.65, 0.52, 0.25], // โลโก้บนไซด์พอด (พ้นล้อหน้าแม้กล้องลอยไปสุด) → กล่องอยู่ขวาล่าง ไม่ทับเส้นของป้าย 02
    dx: 16,
    dy: 215,
  },
  {
    label: "Smaller car",
    text: "10 cm narrower and 20 cm shorter between the wheels than in 2025.",
    short: "1,900 mm wide",
    anchor: [0.9, 0.18, 2.35],
    dx: -100,
    dy: 140,
  },
  {
    label: "Red Bull Ford",
    text: "Ford is back in Formula 1 for the first time since 2004.",
    short: "Ford is back",
    anchor: [0.12, 0.92, -0.75],
    dx: -70,
    dy: -125,
  },
];
