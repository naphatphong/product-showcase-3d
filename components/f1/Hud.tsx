"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { formatCoords } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");

// กรอบหน้าจอของหน้า GRID 26 (อยู่กับที่ตลอด) หน้าตาเหมือนกระดาษเขียนแบบวิศวกรรม:
// - เส้นบอกความคืบหน้าการเลื่อนหน้าด้านบน (ความยาวมาจาก CSS variable --p ที่ F1Story อัปเดตเองทุกครั้งที่เลื่อน)
// - แถบเมนู: โลโก้ GRID 26 (กลับขึ้นบนสุด) | กลับหน้าโชว์รูม
// - มุมจอ 4 มุมเป็นเส้นหักมุม + ป้ายเล็กมุมล่างแบบช่องรายละเอียดของแบบ (เลขแผ่น สเกล ที่ตั้งโรงงาน)
export default function Hud({
  bar,
  sheet,
  sheets,
  origin,
  onLogo,
}: {
  bar: RefObject<HTMLDivElement | null>; // ตัวที่ F1Story ใส่ค่า --p (0–1)
  sheet: number; // section ที่แสดงอยู่ (นับจาก 1)
  sheets: number; // จำนวน section ทั้งหมด
  origin: { city: string; lat: number; lon: number }; // ที่ตั้งโรงงานของทีม
  onLogo: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[4]">
      {/* เส้นความคืบหน้า: เส้นจางเต็มความกว้าง + เส้นเข้มยาวตามที่เลื่อนไป ปลายเส้นเป็นจุดสีแดง */}
      <div ref={bar} className="absolute top-4 right-5 left-5 h-px bg-[var(--f1-line)] md:right-[60px] md:left-[60px]">
        <div className="f1-progress absolute inset-y-0 left-0 bg-[var(--f1-ink)]" />
      </div>

      <header className="absolute inset-x-0 top-0 flex h-24 items-center justify-between px-5 md:h-28 md:px-[60px]">
        <button
          onClick={onLogo}
          aria-label="GRID 26 — back to the top"
          className="pointer-events-auto flex items-center gap-2.5"
        >
          <span aria-hidden className="h-2.5 w-2.5 bg-[var(--f1-red)]" />
          <span className="f1-title text-[26px] md:text-[30px]">GRID 26</span>
        </button>

        <Link href="/" className="f1-pill pointer-events-auto">
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
        <span key={c} aria-hidden className={`absolute h-2.5 w-2.5 border-black/35 ${c}`} />
      ))}

      {/* ป้ายมุมล่าง (คอมเท่านั้น — มือถือมีข้อความบทอยู่ตรงนั้น) */}
      <p className="f1-label absolute bottom-[29px] left-[84px] hidden text-[10px] md:block">
        Dwg GRID26-RB22 · Sheet {pad(sheet)} / {pad(sheets)} · Scale 1:18
      </p>
      <p className="f1-label absolute right-[84px] bottom-[29px] hidden text-[10px] md:block">
        {origin.city} · {formatCoords(origin)}
      </p>
    </div>
  );
}
