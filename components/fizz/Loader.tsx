"use client";

import { useEffect, useRef, useState } from "react";

// หน้าโหลดของ FIZZ: ตัวเลข % มาจากไฟล์ที่โหลดเสร็จจริง (ไม่ใช่ตัวเลขหลอก)
// - ช่วงแรก (ไฟล์โค้ด 3D ยังโหลดไม่เสร็จ) ขยับเองช้าๆ ถึง 12%
// - จากนั้นใช้ % จริงของไฟล์โมเดล (progress 0–100 → แสดง 12–100)
// - ตัวเลขที่แสดงค่อยๆ ไล่ตามค่าจริง (ไม่กระโดด) แล้วจางหายเมื่อพร้อม → เรียก onDone ให้เริ่มฉากเปิด
export default function Loader({
  progress,
  ready,
  onDone,
}: {
  progress: number | null; // null = โค้ด 3D ยังโหลดไม่เสร็จ
  ready: boolean;
  onDone: () => void;
}) {
  const num = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  // ค่าเป้าหมายของตัวเลข
  useEffect(() => {
    target.current = ready ? 100 : progress === null ? 12 : 12 + progress * 0.86;
  }, [progress, ready]);

  // ไล่ตัวเลขทุกเฟรม (แก้ข้อความใน DOM ตรงๆ ไม่ render React ใหม่ 60 ครั้ง/วินาที)
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    let finished = false;
    const tick = () => {
      shown += (target.current - shown) * 0.08;
      if (target.current >= 100 && shown > 99.5) shown = 100;
      if (num.current) num.current.textContent = String(Math.floor(shown));
      if (line.current) line.current.style.transform = `scaleX(${shown / 100})`;
      if (shown === 100 && !finished) {
        finished = true;
        setFading(true);
        setTimeout(() => {
          setGone(true);
          onDone();
        }, 700);
      }
      if (!finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  if (gone) return null;
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`fixed inset-0 z-[5] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${fading ? "opacity-0" : ""}`}
    >
      <p className="fizz-title text-5xl md:text-7xl">FIZZ</p>
      <p className="mt-6 text-[11px] uppercase tracking-[0.35em] text-white/55">
        Chilling six cans · <span ref={num}>0</span>%
      </p>
      <div className="mt-4 h-px w-48 overflow-hidden bg-white/15">
        <div ref={line} className="h-full origin-left scale-x-0 bg-white" />
      </div>
    </div>
  );
}
