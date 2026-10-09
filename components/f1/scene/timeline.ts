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
  drift: number; // กล้องลอยวนช้าๆ เองตามเวลา (0 = นิ่ง, 1 = เต็มที่) แบบถ่ายโฆษณารถ
};

const deg = Math.PI / 180;
const from = (base: Pose, change: Partial<Pose>): Pose => ({ ...base, ...change });

// หน้าแรก: รถประกอบครบ มุมเฉียงหน้า-ข้าง
const HERO: Pose = { tx: 0, ty: 0.5, tz: 0.25, az: 49 * deg, el: 11 * deg, dist: 9.4, fov: 30, shift: 0, lift: 0, ex: 0, drift: 0 };

// ความเร็ว: รถเล็กลงไปอยู่ในครึ่งวงกลมของหน้าปัด (แบบโดรนในเว็บ Aevion) — ใช้ตอนยังไม่มีวิดีโอ
// (มีวิดีโอแล้ว ฉาก 3D จะถูกซ่อนในหน้านี้ ดู NO_3D ใน motion.ts)
const SPEED = from(HERO, { az: 34 * deg, el: 9 * deg, dist: 13.6, lift: 0.05 });

// ความสวย: กล้องต่ำ มุมเฉียงหน้า เลนส์ยาว (fov แคบ ภาพไม่บิดเหมือนถ่ายรถในสตูดิโอ) ลอยวนช้าๆ เหมือนถ่ายโฆษณารถ
// รถอยู่ขวา ข้อความอยู่ซ้าย
const DESIGN = from(HERO, { ty: 0.42, tz: 0.2, az: 26 * deg, el: 5 * deg, dist: 12, fov: 20, shift: 0.2, drift: 1 });

// ประวัติ: หน้านี้เป็นรูปถ่าย ฉาก 3D ถูกซ่อน — กล้องรออยู่ห่างจากท่าความสวยนิดหน่อย
// พอเลื่อนต่อ รถจะค่อยๆ โผล่ขึ้นมาพร้อมกล้องเลื่อนเข้าหา
const HERITAGE = from(DESIGN, { az: 30 * deg, dist: 11, drift: 0 });

// แยกชิ้นทั้งคัน: ถอยกล้องให้เห็นทุกชิ้น
const EXPLODE = from(HERO, { ty: 1.25, tz: 0.3, az: 43 * deg, el: 21 * deg, dist: 15, shift: 0.16, ex: 1 });

// บทชิ้นส่วน: กล้องเข้าไปที่ชิ้นนั้น ภาพเลื่อนไปทางขวาเล็กน้อย (ข้อความอยู่ซ้าย รายการชิ้นส่วนอยู่ขวา)
// จุดที่มอง = จุดศูนย์กลางจริงของชิ้นตอนแยกแล้ว (ชิ้นที่เน้นลอยตรงเข้าหากล้องตาม FOCUS ใน config/f1.ts
// จึงยังอยู่ตรงจุดที่มองบนจอ แค่ใหญ่ขึ้น — ระยะ dist นับรวมระยะที่ชิ้นลอยเข้ามาแล้ว)
const CHAPTER = from(EXPLODE, { shift: 0.1 });
const FRONT = from(CHAPTER, { ty: 1.08, tz: 3.72, az: 36 * deg, el: 13 * deg, dist: 6.4 });
const COCKPIT = from(CHAPTER, { ty: 2.3, tz: 0.93, az: 50 * deg, el: 28 * deg, dist: 6 });
const CHASSIS = from(CHAPTER, { ty: 1.18, tz: 0.4, az: 78 * deg, el: 18 * deg, dist: 8.6 });
const POWER = from(CHAPTER, { ty: 1.95, tz: -0.95, az: 70 * deg, el: 16 * deg, dist: 10.5 });
// ไซด์พอดลอยขึ้นสูงกว่าตำแหน่งแยกชิ้น (ไม่ได้ลอยตรงเข้าหากล้อง) จุดที่มองจึงตามขึ้นไปที่ตำแหน่งใหม่
const SIDEPODS = from(CHAPTER, { ty: 2.8, tz: 0.72, az: 25 * deg, el: 22 * deg, dist: 10 });
const FLOOR = from(CHAPTER, { ty: 0.2, tz: -0.9, az: 150 * deg, el: 20 * deg, dist: 8.7 });
const REAR = from(CHAPTER, { ty: 1.72, tz: -3.21, az: 149 * deg, el: 11 * deg, dist: 5.2 });
const WHEELS = from(CHAPTER, { ty: 0.55, tz: 0, az: 18 * deg, el: 24 * deg, dist: 14.5 });

// ประกอบกลับ: กล้องอ้อมไปอีกด้านของรถระหว่างที่ชิ้นส่วนบินกลับเข้าที่
const ASSEMBLE = from(HERO, { az: -49 * deg, el: 14 * deg, dist: 9.6, shift: 0.14 });

// ท้ายหน้า: รถเต็มคันมองจากด้านข้าง ข้อความ + ปุ่มไปโชว์รูมอยู่ด้านล่าง
const OUTRO = from(HERO, { az: -86 * deg, el: 6 * deg, dist: 9.2, lift: 0.1 });

// ท่าตอนที่ section แต่ละอันอยู่เต็มจอ (ลำดับต้องตรงกับ SECTIONS ใน motion.ts)
// hero, speed, heritage, design, explode, front, cockpit, chassis, power, sidepods, floor, rear, wheels, assemble, outro
export const POSES: Pose[] = [
  HERO,
  SPEED,
  HERITAGE,
  DESIGN,
  EXPLODE,
  FRONT,
  COCKPIT,
  CHASSIS,
  POWER,
  SIDEPODS,
  FLOOR,
  REAR,
  WHEELS,
  ASSEMBLE,
  OUTRO,
];

// จอแคบ (มือถือแนวตั้ง): ภาพแคบกว่าจอคอมมาก → เปิดมุมกว้างขึ้น ไม่เลื่อนภาพไปทางขวา (ข้อความอยู่ด้านล่าง)
// ยกภาพขึ้นครึ่งบนของจอ และตั้งระยะกล้องใหม่ทีละท่า ให้ชิ้นส่วนทั้งชิ้นพอดีความกว้างจอมือถือ
// (คิดจากความกว้างของชิ้นส่วนเมื่อมองจากมุมนั้น — รถทั้งคันมุมเฉียงกว้างราว 4.6 ม., แยกชิ้นทั้งคันราว 7 ม.)
// หน้าแรก/ประกอบกลับ/ท้ายหน้า หันรถเข้าหากล้องมากขึ้น (มุมเฉียงแคบกว่า) รถจะได้ไม่เล็กเกินไป
const NARROW: Partial<Pose>[] = [
  { az: 34 * deg, dist: 15.5, lift: 0.12 }, // hero (เผื่อรถส่ายไปมา)
  { dist: 19, lift: -0.13 }, // speed (รถอยู่ในกรอบโค้งครึ่งล่างของจอ)
  { dist: 18 }, // heritage (ฉาก 3D ถูกซ่อน)
  { az: 34 * deg, el: 7 * deg, dist: 16, shift: 0.05 }, // design
  { az: 28 * deg, dist: 20 }, // explode
  { dist: 7.9 }, // front
  { dist: 5.2 }, // cockpit
  { dist: 10.5 }, // chassis
  { dist: 12 }, // power
  { dist: 11.5 }, // sidepods
  { dist: 9.9 }, // floor
  { dist: 6.2 }, // rear
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
