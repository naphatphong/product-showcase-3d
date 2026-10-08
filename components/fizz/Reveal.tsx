// ข้อความที่ "เลื่อนขึ้นมาทีละตัวอักษร" ตอน section ของมันถูกเลือก (data-active="true" ที่ตัวครอบ)
// - แต่ละคำเป็นกล่องที่ซ่อนส่วนเกิน (overflow hidden) ตัวอักษรเริ่มอยู่ใต้กล่องแล้วเลื่อนขึ้นมา
// - หน่วงเวลาทีละตัว (step) ให้ไล่กันเป็นคลื่น
// - screen reader อ่านข้อความเต็มจาก sr-only ส่วนตัวอักษรที่แยกไว้ถูกซ่อนจาก screen reader
// แอนิเมชันเขียนด้วย CSS ล้วน (คลาส reveal-* ใน globals.css) ไม่ต้องใช้ JavaScript ตอนเล่น
export default function Reveal({
  text,
  delay = 0,
  step = 0.02,
}: {
  text: string;
  delay?: number; // วินาทีก่อนตัวแรกเริ่มขยับ
  step?: number; // หน่วงเพิ่มต่อ 1 ตัวอักษร
}) {
  let n = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.split(" ").map((word, w) => (
          <span key={w}>
            {w > 0 && " "}
            <span className="reveal-word">
              {[...word].map((char, c) => (
                <span key={c} className="reveal-char" style={{ animationDelay: `${delay + n++ * step}s` }}>
                  {char}
                </span>
              ))}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}
