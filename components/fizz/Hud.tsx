"use client";

import Link from "next/link";
import type { RefObject } from "react";

// กรอบหน้าจอแบบ HUD ของหน้า FIZZ (อยู่กับที่ตลอด):
// - เส้นบอกความคืบหน้าการเลื่อนหน้าด้านบน (ความยาวมาจาก CSS variable --p ที่ Fizz อัปเดตเองทุกครั้งที่เลื่อน)
// - แถบเมนู: ปุ่มเสียง | โลโก้ FIZZ | กลับหน้าโชว์รูม
// - มุมจอ 4 มุมเป็นเส้นหักมุม เหมือนช่องมองภาพของกล้อง
export default function Hud({
  bar,
  sound,
  onSound,
  onLogo,
}: {
  bar: RefObject<HTMLDivElement | null>; // ตัวที่ Fizz ใส่ค่า --p (0–1)
  sound: boolean;
  onSound: () => void;
  onLogo: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[4]">
      {/* เส้นความคืบหน้า: เส้นจางเต็มความกว้าง + เส้นสว่างยาวตามที่เลื่อนไป ปลายเส้นเรืองแสง */}
      <div ref={bar} className="absolute top-4 right-5 left-5 h-px bg-white/15 md:right-[60px] md:left-[60px]">
        <div className="hud-progress absolute inset-y-0 left-0 bg-white" />
      </div>

      <header className="absolute inset-x-0 top-0 flex h-24 items-center justify-between px-5 md:h-28 md:px-[60px]">
        {/* ปุ่มเสียง: แท่งเสียง 4 แท่งขยับเมื่อเปิดเสียง */}
        <button
          onClick={onSound}
          aria-pressed={sound}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          className="pointer-events-auto flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:text-white"
        >
          <span>{sound ? "On" : "Off"}</span>
          <span className={`sound-bars ${sound ? "is-on" : ""}`} aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>

        <button
          onClick={onLogo}
          aria-label="FIZZ — back to the top"
          className="fizz-title pointer-events-auto absolute left-1/2 -translate-x-1/2 text-3xl md:text-4xl"
        >
          FIZZ
        </button>

        <Link
          href="/"
          className="pointer-events-auto rounded-full border border-white/25 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm transition hover:bg-white hover:text-black"
        >
          ← Orbit
        </Link>
      </header>

      {/* มุมจอ 4 มุม */}
      {[
        "top-24 left-5 border-t border-l md:top-28 md:left-[60px]",
        "top-24 right-5 border-t border-r md:top-28 md:right-[60px]",
        "bottom-5 left-5 border-b border-l md:bottom-8 md:left-[60px]",
        "bottom-5 right-5 border-b border-r md:bottom-8 md:right-[60px]",
      ].map((c) => (
        <span key={c} aria-hidden className={`absolute h-2.5 w-2.5 border-white/50 ${c}`} />
      ))}
    </div>
  );
}
