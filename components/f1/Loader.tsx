"use client";

import { useEffect, useRef, useState } from "react";

// หน้าโหลดของ GRID 26 (แนวเดียวกับหน้าโหลดของ FIZZ): ตัวเลข % มาจากไฟล์ที่โหลดเสร็จจริง
// - ช่วงแรก (ไฟล์โค้ด 3D ยังโหลดไม่เสร็จ) ขยับเองช้าๆ ถึง 12%
// - จากนั้นใช้ % จริงของไฟล์โมเดลรถ (progress 0–100 → แสดง 12–100)
// - ตัวเลขที่แสดงค่อยๆ ไล่ตามค่าจริง (ไม่กระโดด) แล้วจางหายเมื่อพร้อม → เรียก onDone
export default function Loader({
  progress,
  ready,
  onDone,
  label = "Assembling the RB22",
  garage = false,
}: {
  progress: number | null; // null = โค้ด 3D ยังโหลดไม่เสร็จ
  ready: boolean;
  onDone: () => void;
  label?: string; // ข้อความหน้าตัวเลข %
  garage?: boolean; // หน้าโชว์รูม: พื้นมืดแบบอู่รถ (หน้าเรื่องเล่า = กระดาษสีอ่อน)
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
      className={`${garage ? "bg-[var(--f1-paper)]" : "f1-paper"} fixed inset-0 z-[5] flex flex-col items-center justify-center transition-opacity duration-700 ${fading ? "opacity-0" : ""}`}
    >
      <p className="f1-title flex items-center gap-4 text-6xl md:text-8xl">
        <span aria-hidden className="h-4 w-4 bg-[var(--f1-red)] md:h-5 md:w-5" />
        GRID 26
      </p>
      <p className="f1-label mt-6">
        {label} · <span ref={num}>0</span>%
      </p>
      <div className="mt-4 h-px w-48 overflow-hidden bg-[var(--f1-line)]">
        <div ref={line} className="h-full origin-left scale-x-0 bg-[var(--f1-ink)]" />
      </div>
    </div>
  );
}
