// "เส้นเวลา" ของฉาก 3D ในหน้า FIZZ: กำหนดท่าของกล้องและกระป๋องตอนที่แต่ละ section อยู่บนสุดของจอ
// ระหว่าง 2 section ค่าทุกตัวจะค่อยๆ เปลี่ยนจากท่าหนึ่งไปอีกท่าตามระยะที่เลื่อนจอ (scroll-linked)
// ไฟล์นี้เป็นตัวเลขล้วน ไม่มี three.js — ปรับท่าได้ที่นี่ที่เดียว

export type Pose = {
  // กล้อง: ตำแหน่ง, มุมหมุน (เรเดียน), มุมมองแนวตั้ง (องศา)
  camX: number;
  camY: number;
  camZ: number;
  camRX: number;
  camRY: number;
  camRZ: number;
  fov: number;
  // กระป๋องที่อยู่หน้าสุด: ตำแหน่ง มุมเอียง ขนาด และ spin = หมุนรอบแกนตัวเอง (โชว์ด้านหลังกระป๋อง)
  canX: number;
  canY: number;
  canZ: number;
  canRX: number;
  canRY: number;
  canRZ: number;
  spin: number;
  scale: number;
  // การจัดแถวกระป๋องทั้งหมด
  spacing: number; // ระยะห่างระหว่างกระป๋อง (คูณกับระยะมาตรฐาน)
  wave: number; // 1 = แถวโค้งไปด้านหลัง (หน้าแรกของ section เลือกยี่ห้อ)
  swirl: number; // 1 = เรียงเป็นเกลียวทแยง (section รวมทุกกระป๋อง)
  fall: number; // ยกกระป๋องขึ้นไปบนฟ้า (หน่วยในฉาก) ใช้ตอนกระป๋องร่วงลงมา
  // แสง
  key: number; // ไฟหลัก (สตูดิโอ)
  spot: number; // สปอตไลต์แคบๆ ที่ไล่ส่องฉลาก
  spotY: number; // จุดที่สปอตไลต์ส่อง วัดจากกลางกระป๋องหน้าสุด (บวก = สูงขึ้น) ไล่ลงทีละข้อ = สแกนฉลาก
  // อื่นๆ
  bubbles: number; // ความหนาแน่นของฟองซ่า 0–1
  pointer: number; // กระป๋องหันตามเมาส์มากแค่ไหน
};

const deg = Math.PI / 180;

// ท่ามาตรฐาน: section เลือกยี่ห้อ (แถวกระป๋องโค้ง กล้องมุมแคบจากระยะไกล ภาพแบนแบบเลนส์เทเล)
const HERO: Pose = {
  camX: 0,
  camY: 0,
  camZ: 29,
  camRX: 0,
  camRY: 0,
  camRZ: 0,
  fov: 20,
  canX: 0,
  canY: 0.15,
  canZ: 0.6,
  canRX: -8 * deg,
  canRY: 0,
  canRZ: -14 * deg,
  spin: 0,
  scale: 1.18,
  spacing: 1,
  wave: 1,
  swirl: 0,
  fall: 0,
  key: 1,
  spot: 0,
  spotY: 1.2,
  bubbles: 0.35,
  pointer: 1,
};

// สร้างท่าใหม่จากท่าก่อนหน้า (ระบุแค่ค่าที่ต่าง)
const from = (base: Pose, change: Partial<Pose>): Pose => ({ ...base, ...change });

// ท่าตอนกล้องซูมเข้าหากระป๋องที่เลือก
const BRAND = from(HERO, {
  camZ: 8.5,
  fov: 34,
  canX: 1.35,
  canY: -0.2,
  canZ: 0,
  canRX: -24 * deg,
  canRY: 12 * deg,
  canRZ: 20 * deg,
  scale: 1,
  spacing: 2.4,
  wave: 0,
  bubbles: 0.3,
  pointer: 0.6,
});

// ท่าตอนสปอตไลต์ไล่ส่องฉลากด้านหลัง (4 section) — กล้องมองเงยขึ้นเล็กน้อย ไฟสตูดิโอดับ เหลือสปอตไลต์
const BENEFIT = from(BRAND, {
  camX: 0,
  camY: -1.6,
  camZ: 12.5,
  camRX: 9 * deg,
  camRZ: -8 * deg,
  fov: 22,
  canX: 0.9,
  canY: -0.5,
  canZ: 0,
  canRX: 0,
  canRY: 0,
  canRZ: 0,
  spin: 160 * deg,
  key: 0.05,
  spot: 1,
  spotY: 1.2,
  pointer: 0,
});

// ท่า "CRACK. FIZZ. SIP." — กระป๋องกลางจอ หันโลโก้กลับมาด้านหน้า
const CRACK = from(HERO, {
  camZ: 9,
  fov: 42,
  canY: 0,
  canZ: -0.4,
  canRX: -16 * deg,
  canRZ: -6 * deg,
  scale: 1,
  spacing: 3.2,
  wave: 0,
  bubbles: 1,
  pointer: 0.8,
});

// ท่ารวมทุกกระป๋อง: เรียงเป็นเกลียวทแยง มองจากมุมต่ำด้านซ้าย
const LINEUP = from(HERO, {
  camX: -2.5,
  camY: -3,
  camZ: 24,
  camRX: 9 * deg,
  camRY: -8 * deg,
  camRZ: -10 * deg,
  fov: 30,
  canX: 0,
  canY: 0,
  canZ: -0.4,
  canRX: 0,
  canRY: 0,
  canRZ: 0,
  scale: 1,
  spacing: 0.5,
  wave: 0,
  swirl: 1,
  bubbles: 0.5,
  pointer: 0,
});

// FAQ / ท้ายเว็บ: กล้องเลื่อนลงต่ำ กระป๋องหลุดขึ้นไปนอกจอ เหลือแค่พื้นหลังกับฟองซ่า
const AWAY = from(LINEUP, { camY: -12, camRX: 0, camRY: 0, camRZ: 0, bubbles: 0.25, key: 0.6 });

// วนกลับ: กระป๋องอยู่บนฟ้า (มองไม่เห็น) แล้วร่วงลงมาเข้าแถวเป็นหน้าเลือกยี่ห้ออีกครั้ง
const SKY = from(HERO, { fall: 16 });

// ท่าตอนที่ section แต่ละอันอยู่บนสุดของจอ (ลำดับต้องตรงกับ section ในหน้า)
// hero, brand, fizz, cold, zero, recycle, crack, lineup, faq, finale, loop
export const POSES: Pose[] = [
  HERO,
  BRAND,
  from(BENEFIT, { canY: -0.9, camRZ: -8 * deg, spotY: 1.1 }),
  from(BENEFIT, { canY: -0.35, camRZ: 5 * deg, spin: 175 * deg, spotY: 0.4, bubbles: 0.55 }),
  from(BENEFIT, { canY: 0.2, camRZ: -8 * deg, spin: 160 * deg, spotY: -0.3, bubbles: 0.3 }),
  from(BENEFIT, { canY: 0.75, camRZ: 5 * deg, spin: 175 * deg, spotY: -1, bubbles: 0.3 }),
  CRACK,
  LINEUP,
  AWAY,
  AWAY,
  HERO,
];

// ช่วงที่ "กระโดด" ท่าทันที (มองไม่เห็นเพราะกระป๋องอยู่นอกจอ): ช่วงที่ 9 (ท้ายเว็บ → หน้าวนกลับ)
// เริ่มจากท่า SKY แทนท่า AWAY → ระหว่างเลื่อนผ่านท้ายเว็บ กระป๋องจะร่วงลงมาจากฟ้า
export const JUMPS: Record<number, Pose> = { 9: SKY };

// จอแคบ (มือถือแนวตั้ง): ภาพแคบกว่ามาก ต้องถอยกล้อง/ย้ายกระป๋องให้อยู่กลางจอและเหนือข้อความด้านล่าง
export const POSES_NARROW: Pose[] = POSES.map((p, i) => {
  const narrow: Partial<Pose>[] = [
    { camZ: 32, canY: 1.1, scale: 1.25 }, // hero: กระป๋องอยู่สูงขึ้น เหนือชื่อยี่ห้อ
    { camZ: 15, canX: 0, canY: 1.5, canRZ: 14 * deg }, // brand: ข้อความอยู่ล่าง กระป๋องอยู่บน
    {},
    {},
    {},
    {},
    { camZ: 12, canY: 1.2 },
    { camX: -1.5, camZ: 34 },
    {},
    {},
    { camZ: 34, canY: 1.1, scale: 1.05 },
  ];
  // ข้อเด่น 4 ข้อ: กระป๋องอยู่ครึ่งบนของจอ (ข้อความอยู่ล่าง) ขยับขึ้นทีละนิดตามข้อ
  const benefit =
    i >= 2 && i <= 5 ? { camZ: 20, camY: -0.4, camRX: 2 * deg, canX: 0, canY: 1.3 + (i - 2) * 0.06 } : {};
  return from(p, { ...benefit, ...narrow[i] });
});
export const JUMPS_NARROW: Record<number, Pose> = { 9: from(POSES_NARROW[10], { fall: 16 }) };

// ค่อยๆ เร่งแล้วค่อยๆ ชะลอ (เหมือน power1.inOut ของ GSAP)
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// หาท่า ณ ตำแหน่ง t (เลข section แบบทศนิยม เช่น 2.5 = เลื่อนจาก section 2 ไป 3 ได้ครึ่งทาง)
// เขียนผลลงใน out (ไม่สร้าง object ใหม่ทุกเฟรม ลดภาระ garbage collector)
export function sample(poses: Pose[], jumps: Record<number, Pose>, t: number, out: Pose) {
  const last = poses.length - 1;
  const i = Math.max(0, Math.min(last - 1, Math.floor(t)));
  const f = ease(Math.max(0, Math.min(1, t - i)));
  const a = jumps[i] ?? poses[i];
  const b = poses[i + 1];
  for (const k in a) {
    const key = k as keyof Pose;
    out[key] = a[key] + (b[key] - a[key]) * f;
  }
  return out;
}

export const blankPose = (): Pose => ({ ...HERO });
