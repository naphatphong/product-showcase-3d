import type { Benefit } from "@/config/fizz";

// ไอคอนเส้นของ 4 ข้อเด่น (วาดเองด้วย SVG ไม่ต้องลงไลบรารีไอคอน)
// stroke="currentColor" = ใช้สีตัวอักษรของปุ่มที่ครอบอยู่ เปลี่ยนสีตามสถานะได้ด้วย CSS
const paths: Record<Benefit["icon"], React.ReactNode> = {
  // ฟองซ่า 3 ลูกลอยขึ้น
  bubbles: (
    <>
      <circle cx="9" cy="15" r="4" />
      <circle cx="16" cy="9" r="2.6" />
      <circle cx="11" cy="5" r="1.6" />
    </>
  ),
  // เกล็ดหิมะ = เย็นจัด
  cold: (
    <>
      <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
      <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
    </>
  ),
  // เลข 0 ขีดทับ = น้ำตาลเป็นศูนย์
  zero: (
    <>
      <ellipse cx="12" cy="12" rx="5.5" ry="8" />
      <path d="M8 18 16 6" />
    </>
  ),
  // ลูกศร 3 ทางวนเป็นวง = รีไซเคิล
  recycle: (
    <>
      <path d="M7.5 9.5 10 5.5a2.3 2.3 0 0 1 4 0l2 3.4" />
      <path d="m17.5 15.5-2.2 3.9h-6.6" />
      <path d="M6.2 13 4.6 15.8a2.3 2.3 0 0 0 2 3.6h2" />
      <path d="m14 7.9 2 1 1-2.2M10.5 17.4l-1.8 2 1.8 1.9M5 11.7l1.2 1.3 1.8-1.1" />
    </>
  ),
};

export function BenefitIcon({ name, className }: { name: Benefit["icon"]; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
