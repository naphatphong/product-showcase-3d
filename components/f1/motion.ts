// ข้อมูลที่หน้าเว็บ (HTML) กับฉาก 3D ของหน้า GRID 26 ใช้ร่วมกัน — object ธรรมดาที่แก้ค่าได้ (เก็บใน useRef)
// หน้าเว็บเขียนค่า (ตำแหน่งเลื่อนจอ, เมาส์) ฉาก 3D อ่านค่าทุกเฟรม — ไม่ใช้ React state เพราะเปลี่ยนทุกเฟรม
// (แนวเดียวกับหน้า FIZZ: components/fizz/motion.ts)

import { CHAPTERS } from "@/config/f1";

// section ตามลำดับในหน้า: หน้าแรก → แยกชิ้นทั้งคัน → 8 บท (บทละชิ้นส่วน) → ประกอบกลับ → ไปโชว์รูม
// ลำดับต้องตรงกับท่ากล้องใน scene/timeline.ts
export const SECTIONS = ["hero", "explode", ...CHAPTERS.map((c) => c.id), "assemble", "outro"];
export const FIRST_CHAPTER = 2; // section แรกที่เป็นบทชิ้นส่วน
export const ASSEMBLE = SECTIONS.indexOf("assemble");

export type Motion = {
  scroll: number; // ตำแหน่งเลื่อนจอ (px)
  tops: number[]; // ขอบบนของแต่ละ section (px)
  pointerX: number; // ตำแหน่งเมาส์ −1 (ซ้าย) ถึง 1 (ขวา)
  pointerY: number;
};

export const createMotion = (): Motion => ({
  scroll: 0,
  tops: SECTIONS.map(() => 0),
  pointerX: 0,
  pointerY: 0,
});

// ตำแหน่งเลื่อนจอ → เลข section แบบทศนิยม เช่น 2.5 = เลื่อนจาก section 2 ไป 3 ได้ครึ่งทาง
export function sectionProgress({ scroll, tops }: Motion) {
  const last = tops.length - 1;
  if (scroll >= tops[last]) return last;
  let i = 0;
  while (i < last - 1 && scroll >= tops[i + 1]) i++;
  const span = tops[i + 1] - tops[i];
  return i + (span > 0 ? Math.min(1, Math.max(0, (scroll - tops[i]) / span)) : 0);
}
