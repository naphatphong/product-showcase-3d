"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// หน้าโหลดของหน้าแรก (แบบ edolus.com):
// 1. จอดำ โลโก้กลางจอ + ตัวเลข % ใต้โลโก้ — % มาจากไฟล์ที่โหลดเสร็จจริง (ภาพโลก + โมเดลสินค้า)
//    ช่วงแรก (ไฟล์โค้ด 3D ยังโหลดไม่เสร็จ) ขยับเองถึง 12% จากนั้น % จริง (0–100 → แสดง 12–100)
// 2. ครบ 100% และโลกพร้อมแล้ว → ตัวเลขหาย จอดำแยกเป็น 2 แถบ (บนเลื่อนขึ้น ล่างเลื่อนลง) เผยฉากโลก
//    พร้อมกับโลโก้เลื่อนขึ้นไปจอดตรงตำแหน่งโลโก้ของแถบบนสุดพอดี
// 3. จบแล้วเรียก onDone (หัวข้อหน้าเปิดเริ่มโผล่) แล้วหายไป — โลโก้จริงในแถบบนสุดอยู่ตรงนั้นพอดี ไม่เห็นรอยต่อ
// logo = โลโก้ชุดเดียวกับแถบบนสุด (ส่งมาจาก Showroom) ตอนโหลดขยายใหญ่ 2.2 เท่า แล้วค่อยๆ ย่อกลับ 1 เท่าตอนจอด
export default function OrbitLoader({
  progress,
  ready,
  logo,
  onDone,
}: {
  progress: number | null; // null = โค้ด 3D ยังโหลดไม่เสร็จ
  ready: boolean; // ฉากโลกพร้อมแสดงแล้ว
  logo: ReactNode;
  onDone: () => void;
}) {
  const num = useRef<HTMLSpanElement>(null);
  const target = useRef(0);
  const isReady = useRef(false);
  const [phase, setPhase] = useState<"load" | "open" | "gone">("load");

  // ค่าเป้าหมายของตัวเลข
  useEffect(() => {
    target.current = progress === null ? 12 : 12 + progress * 0.88;
    isReady.current = ready;
  }, [progress, ready]);

  // ไล่ตัวเลขทุกเฟรม (แก้ข้อความใน DOM ตรงๆ ไม่ render React ใหม่ 60 ครั้ง/วินาที)
  // ครบ 100 และโลกพร้อม → เปิดม่าน (open) → รอแอนิเมชันจบ → หายไป (gone)
  useEffect(() => {
    let raf = 0;
    let shown = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      shown += (target.current - shown) * 0.08;
      if (target.current >= 99.9 && shown > 99.5) shown = 100;
      if (num.current) num.current.textContent = String(Math.floor(shown));
      if (shown === 100 && isReady.current) {
        // เว้นจังหวะให้เห็น 100% แป๊บหนึ่ง แล้วเปิดม่าน
        timer = setTimeout(
          () => {
            setPhase("open");
            timer = setTimeout(
              () => {
                setPhase("gone");
                onDone();
              },
              reduced ? 300 : 1300,
            );
          },
          reduced ? 0 : 350,
        );
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [onDone]);

  if (phase === "gone") return null;
  const open = phase === "open";
  return (
    <div role="status" aria-label="Loading" className="pointer-events-none fixed inset-0 z-[60]">
      {/* ม่านดำ 2 แถบ: เปิดออกบน/ล่าง (ตอนโหลดรับคลิกไว้ไม่ให้ทะลุไปถึงฉาก) */}
      <div
        className={`orbit-curtain top-0 ${open ? "-translate-y-full" : "pointer-events-auto"}`}
        aria-hidden
      />
      <div
        className={`orbit-curtain bottom-0 ${open ? "translate-y-full" : "pointer-events-auto"}`}
        aria-hidden
      />
      {/* โลโก้: กลางจอขยาย 2.2 เท่า → เลื่อนขึ้นไปจอดที่แถบบนสุด (กึ่งกลางแถบสูง 80px มือถือ / 96px คอม) */}
      <div className={`orbit-loader-logo ${open ? "is-docked" : ""}`} aria-hidden>
        {logo}
      </div>
      <p
        className={`orbit-mono absolute inset-x-0 top-1/2 mt-20 text-center text-[10px] tracking-[0.35em] text-white/60 transition-opacity duration-300 ${open ? "opacity-0" : ""}`}
      >
        <span ref={num}>0</span>%
      </p>
    </div>
  );
}
