// ข้อมูลที่หน้าเว็บ (HTML) กับฉาก 3D ใช้ร่วมกัน — เป็น object ธรรมดาที่แก้ค่าได้ (เก็บใน useRef)
// หน้าเว็บเขียนค่า (ตำแหน่งเลื่อนจอ, กระป๋องที่เลือก, เมาส์) ฉาก 3D อ่านค่าทุกเฟรม
// ไม่ใช้ React state เพราะค่าพวกนี้เปลี่ยนทุกเฟรม ถ้าเป็น state หน้าเว็บจะ render ใหม่ตลอด

// ชื่อ section ตามลำดับในหน้า (ต้องตรงกับลำดับท่าใน scene/timeline.ts)
export const SECTIONS = [
  "hero",
  "brand",
  "fizz",
  "cold",
  "zero",
  "recycle",
  "crack",
  "lineup",
  "faq",
  "finale",
  "loop",
] as const;

// จำนวนกระป๋องในฉาก: 6 ยี่ห้อ × 2 ชุด พอให้แถวกระป๋องยาวเต็มจอกว้างๆ และวนต่อกันได้ไม่ขาด
// กระป๋องใบที่ i เป็นยี่ห้อที่ i mod 6
export const CANS = 12;

// section 0–7 เลื่อนทีละ 1 section ต่อการหมุนล้อ/ปัด 1 ครั้ง, ตั้งแต่ FAQ ลงไปเลื่อนอิสระ
export const FREE_FROM = SECTIONS.indexOf("faq");

export type Motion = {
  scroll: number; // ตำแหน่งเลื่อนจอ (px) — วนกลับเป็น 0 เมื่อเลื่อนเลยท้ายหน้า
  tops: number[]; // ขอบบนของแต่ละ section (px)
  goal: number; // ตำแหน่งวงกระป๋องที่ต้องหมุนไปหา (หน่วย = กระป๋อง, นับต่อเนื่องไม่วนกลับ)
  dragging: boolean; // กำลังลากหมุนวงกระป๋องอยู่ไหม
  pointerX: number; // ตำแหน่งเมาส์ −1 (ซ้าย) ถึง 1 (ขวา)
  pointerY: number;
  introAt: number | null; // เวลาที่เริ่มฉากกระป๋องร่วงลงมา (performance.now) — null = ยังไม่เริ่ม
  tint: string; // สีหลักของยี่ห้อที่เลือก (ฟองซ่าใช้สีนี้)
};

export const createMotion = (): Motion => ({
  scroll: 0,
  tops: SECTIONS.map(() => 0),
  goal: 0,
  dragging: false,
  pointerX: 0,
  pointerY: 0,
  introAt: null,
  tint: "#ffffff",
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

// หารเอาเศษแบบไม่ติดลบ เช่น mod(-1, 6) = 5 (ตัว % ของ JavaScript จะได้ −1)
export const mod = (a: number, n: number) => ((a % n) + n) % n;
