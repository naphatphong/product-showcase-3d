// ข้อมูลที่หน้าเว็บ (HTML) กับฉาก 3D ของหน้า GRID 26 ใช้ร่วมกัน — object ธรรมดาที่แก้ค่าได้ (เก็บใน useRef)
// หน้าเว็บเขียนค่า (ตำแหน่งเลื่อนจอ, เมาส์) ฉาก 3D อ่านค่าทุกเฟรม — ไม่ใช้ React state เพราะเปลี่ยนทุกเฟรม
// (แนวเดียวกับหน้า FIZZ: components/fizz/motion.ts)

import { CHAPTERS, DESIGN_CALLOUTS } from "@/config/f1";

// section ตามลำดับในหน้า: หน้าแรก → ความเร็ว → ประวัติ → ความสวย → แยกชิ้นทั้งคัน → 8 บท (บทละชิ้นส่วน)
// → ประกอบกลับ → ไปโชว์รูม — ลำดับต้องตรงกับท่ากล้องใน scene/timeline.ts
export const SECTIONS = [
  "hero",
  "speed",
  "heritage",
  "design",
  "explode",
  ...CHAPTERS.map((c) => c.id),
  "assemble",
  "outro",
];
export const SPEED_I = SECTIONS.indexOf("speed");
export const HERITAGE_I = SECTIONS.indexOf("heritage");
export const DESIGN_I = SECTIONS.indexOf("design");
export const EXPLODE_I = SECTIONS.indexOf("explode");
export const FIRST_CHAPTER = SECTIONS.indexOf(CHAPTERS[0].id); // section แรกที่เป็นบทชิ้นส่วน
export const ASSEMBLE = SECTIONS.indexOf("assemble");

// section ที่ไม่ใช้ฉาก 3D (ซ่อนฉากแล้วหยุดวาด ประหยัดแบตเครื่อง): หน้าประวัติ (วิดีโอ + รูปถ่าย)
export const NO_3D = new Set([HERITAGE_I]);

export type Motion = {
  scroll: number; // ตำแหน่งเลื่อนจอ (px)
  tops: number[]; // ขอบบนของแต่ละ section (px)
  pointerX: number; // ตำแหน่งเมาส์ −1 (ซ้าย) ถึง 1 (ขวา)
  pointerY: number;
  // ทางกลับ: ฉาก 3D เขียน ตำแหน่งบนจอของจุดที่ป้ายในหน้าความสวยชี้ไป ให้หน้าเว็บวาดเส้นของป้ายตาม
  // ทีละ 3 ค่าต่อป้าย: x, y (px จากมุมซ้ายบนของจอ), มองเห็นไหม (1/0)
  anchors: Float32Array;
};

export const createMotion = (): Motion => ({
  scroll: 0,
  tops: SECTIONS.map(() => 0),
  pointerX: 0,
  pointerY: 0,
  anchors: new Float32Array(DESIGN_CALLOUTS.length * 3),
});

// ตำแหน่งเลื่อนจอ → เลข section แบบทศนิยม เช่น 2.5 = เลื่อนจาก section 2 ไป 3 ได้ครึ่งทาง
// section ที่ยาวกว่า 1 จอ (หน้าประวัติ) นับว่าอยู่ที่ section นั้นเต็มๆ จนถึงจอสุดท้ายของมัน
// แล้วค่อยเริ่มเปลี่ยนไป section ถัดไป กล้องเลยไม่ขยับระหว่างที่ยังอ่านหน้ายาวอยู่
export function sectionProgress({ scroll, tops }: Motion) {
  const last = tops.length - 1;
  if (scroll >= tops[last]) return last;
  let i = 0;
  while (i < last - 1 && scroll >= tops[i + 1]) i++;
  const pageH = tops[1] - tops[0]; // ความสูง 1 จอ (หน้าแรกสูงพอดี 1 จอเสมอ)
  const from = Math.max(tops[i], tops[i + 1] - pageH);
  const span = tops[i + 1] - from;
  return i + (span > 0 ? Math.min(1, Math.max(0, (scroll - from) / span)) : 0);
}
