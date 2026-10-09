// "เส้นเวลา" ของฉาก 3D หน้า GRID 26: ท่ากล้อง + ระยะแยกชิ้น ตอนที่แต่ละ section อยู่เต็มจอ
// ระหว่าง 2 section ค่าทุกตัวค่อยๆ เปลี่ยนจากท่าหนึ่งไปอีกท่าตามระยะที่เลื่อนจอ (scroll-linked)
// ไฟล์นี้เป็นตัวเลขล้วน ไม่มี three.js — ปรับมุมกล้องได้ที่นี่ที่เดียว (แนวเดียวกับ components/fizz/scene/timeline.ts)
//
// กล้องหมุนรอบจุดที่มอง (target) แบบลูกโลก: az = หมุนรอบตัวรถ (0 = มองจากหน้ารถ, +90° = มองจากด้านข้าง, 180° = จากท้ายรถ)
// el = มุมเงยจากพื้น, dist = ระยะห่าง (เมตร) — รถยาว 5.4 ม. หน้ารถชี้ไปทาง +z

export type Pose = {
  tx: number; // จุดที่กล้องมอง (เมตร)
  ty: number;
  tz: number;
  az: number; // มุมรอบตัวรถ (เรเดียน)
  el: number; // มุมเงย (เรเดียน)
  dist: number; // ระยะกล้องถึงจุดที่มอง
  fov: number; // มุมมองแนวตั้ง (องศา)
  shift: number; // เลื่อนภาพไปทางขวา (สัดส่วนความกว้างจอ) เว้นที่ด้านซ้ายให้ข้อความ
  lift: number; // เลื่อนภาพขึ้น (สัดส่วนความสูงจอ) เว้นที่ด้านล่างให้ข้อความ (มือถือ)
  ex: number; // ระยะแยกชิ้น 0 = ประกอบครบ, 1 = แยกเต็มที่ (ตำแหน่งตาม EXPLODE ใน config/f1.ts)
};

const deg = Math.PI / 180;
const from = (base: Pose, change: Partial<Pose>): Pose => ({ ...base, ...change });

// หน้าแรก: รถประกอบครบ มุมเฉียงหน้า-ข้าง
const HERO: Pose = { tx: 0, ty: 0.5, tz: 0.25, az: 49 * deg, el: 11 * deg, dist: 9.4, fov: 30, shift: 0, lift: 0, ex: 0 };

// แยกชิ้นทั้งคัน: ถอยกล้องให้เห็นทุกชิ้น
const EXPLODE = from(HERO, { ty: 1.25, tz: 0.3, az: 43 * deg, el: 21 * deg, dist: 15, shift: 0.16, ex: 1 });

// บทชิ้นส่วน: กล้องเข้าไปที่ชิ้นนั้น (จุดที่มอง = ตำแหน่งของชิ้นตอนแยกแล้ว) ภาพเลื่อนไปทางขวา ข้อความอยู่ซ้าย
const CHAPTER = from(EXPLODE, { shift: 0.17 });
const FRONT = from(CHAPTER, { ty: 1.18, tz: 3.62, az: 36 * deg, el: 13 * deg, dist: 4.8 });
const COCKPIT = from(CHAPTER, { ty: 2.2, tz: 0.85, az: 54 * deg, el: 17 * deg, dist: 4.2 });
const CHASSIS = from(CHAPTER, { ty: 1.15, tz: -0.45, az: 66 * deg, el: 18 * deg, dist: 7.2 });
const POWER = from(CHAPTER, { ty: 1.95, tz: -1.05, az: 72 * deg, el: 14 * deg, dist: 5.6 });
const SIDEPODS = from(CHAPTER, { ty: 1.3, tz: 0, az: 17 * deg, el: 32 * deg, dist: 6.8 });
const FLOOR = from(CHAPTER, { ty: 0.25, tz: -0.8, az: 129 * deg, el: 22 * deg, dist: 7 });
const REAR = from(CHAPTER, { ty: 1.61, tz: -3.2, az: 149 * deg, el: 11 * deg, dist: 4.4 });
const WHEELS = from(CHAPTER, { ty: 0.45, tz: 0, az: 52 * deg, el: 17 * deg, dist: 9 });

// ประกอบกลับ: กล้องอ้อมไปอีกด้านของรถระหว่างที่ชิ้นส่วนบินกลับเข้าที่
const ASSEMBLE = from(HERO, { az: -49 * deg, el: 14 * deg, dist: 9.6, shift: 0.14 });

// ท้ายหน้า: รถเต็มคันมองจากด้านข้าง ข้อความ + ปุ่มไปโชว์รูมอยู่ด้านล่าง
const OUTRO = from(HERO, { az: -86 * deg, el: 6 * deg, dist: 9.2, lift: 0.1 });

// ท่าตอนที่ section แต่ละอันอยู่เต็มจอ (ลำดับต้องตรงกับ SECTIONS ใน motion.ts)
// hero, explode, front, cockpit, chassis, power, sidepods, floor, rear, wheels, assemble, outro
export const POSES: Pose[] = [HERO, EXPLODE, FRONT, COCKPIT, CHASSIS, POWER, SIDEPODS, FLOOR, REAR, WHEELS, ASSEMBLE, OUTRO];

// จอแคบ (มือถือแนวตั้ง): ภาพแคบกว่าจอคอมมาก → เปิดมุมกว้างขึ้น ไม่เลื่อนภาพไปทางขวา (ข้อความอยู่ด้านล่าง)
// ยกภาพขึ้นครึ่งบนของจอ และตั้งระยะกล้องใหม่ทีละท่า ให้ชิ้นส่วนทั้งชิ้นพอดีความกว้างจอมือถือ
// (คิดจากความกว้างของชิ้นส่วนเมื่อมองจากมุมนั้น — รถทั้งคันมุมเฉียงกว้างราว 4.6 ม., แยกชิ้นทั้งคันราว 7 ม.)
// หน้าแรก/ประกอบกลับ/ท้ายหน้า หันรถเข้าหากล้องมากขึ้น (มุมเฉียงแคบกว่า) รถจะได้ไม่เล็กเกินไป
const NARROW: Partial<Pose>[] = [
  { az: 34 * deg, dist: 13.5, lift: 0.12 }, // hero
  { az: 28 * deg, dist: 20 }, // explode
  { dist: 7.6 }, // front
  { dist: 5.2 }, // cockpit
  { dist: 9.4 }, // chassis
  { dist: 6.4 }, // power
  { dist: 11.4 }, // sidepods
  { dist: 10.8 }, // floor
  { dist: 5 }, // rear
  { dist: 16 }, // wheels
  { az: -34 * deg, dist: 13.5 }, // assemble
  { az: -62 * deg, dist: 16, lift: 0.2 }, // outro
];
export const POSES_NARROW: Pose[] = POSES.map((p, i) => from(p, { fov: p.fov + 14, shift: 0, lift: 0.17, ...NARROW[i] }));

// สัดส่วนจอ (กว้าง ÷ สูง) ที่ท่าแต่ละชุดออกแบบไว้: คอม 16:10, มือถือแนวตั้งราว 9:19.5
// จอที่แคบกว่านี้ (เช่น แท็บเล็ตแนวตั้ง) ฉาก 3D จะถอยกล้องออกเอง ให้เห็นความกว้างเท่าเดิม
export const DESIGN_ASPECT = { wide: 1.6, narrow: 0.46 };

// ค่อยๆ เร่งแล้วค่อยๆ ชะลอ
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// หาท่า ณ ตำแหน่ง t (เลข section แบบทศนิยม) เขียนผลลงใน out (ไม่สร้าง object ใหม่ทุกเฟรม)
export function sample(poses: Pose[], t: number, out: Pose) {
  const last = poses.length - 1;
  const i = Math.max(0, Math.min(last - 1, Math.floor(t)));
  const f = ease(Math.max(0, Math.min(1, t - i)));
  const a = poses[i];
  const b = poses[i + 1];
  for (const k in a) {
    const key = k as keyof Pose;
    out[key] = a[key] + (b[key] - a[key]) * f;
  }
  return out;
}

export const blankPose = (): Pose => ({ ...HERO });
