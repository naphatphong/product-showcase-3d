"use client";

import { useRef, type PointerEvent } from "react";
import { benefits, brandStories } from "@/config/fizz";
import type { Variant } from "@/config/products";
import { BenefitIcon } from "./icons";
import Reveal from "./Reveal";

// ข้อความที่ลอยทับฉาก 3D ของแต่ละ section (position: fixed อยู่กับที่ ไม่เลื่อนตามหน้า)
// section ไหนถูกเลือก ข้อความของ section นั้นจะค่อยๆ โผล่ขึ้นมา ที่เหลือซ่อน (คลาส overlay ใน globals.css)
// ตัวครอบเป็น pointer-events-none: เมาส์/นิ้วทะลุไปถึงฉาก 3D ด้านหลัง ยกเว้นปุ่มที่เปิดไว้เอง

type Brand = Variant;

const pad = (n: number) => String(n).padStart(2, "0");

// ---------- section เลือกยี่ห้อ (หน้าแรกของหน้า) ----------
export function HeroOverlay({
  active,
  brands,
  brand,
  onStep,
  onPick,
}: {
  active: boolean;
  brands: Brand[];
  brand: number;
  onStep: (dir: 1 | -1) => void;
  onPick: (index: number) => void;
}) {
  const b = brands[brand];
  const slider = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // แถบเลือกยี่ห้อ: แตะ/ลากบนแถบ → เลือกยี่ห้อที่ใกล้ตำแหน่งนิ้วที่สุด
  const pickAt = (e: PointerEvent) => {
    const r = slider.current?.getBoundingClientRect();
    if (!r) return;
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    onPick(Math.round(f * (brands.length - 1)));
  };

  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      {/* ลูกศรซ้าย/ขวา: มือถือ = ข้างกระป๋องที่อยู่ตรงกลาง, คอม = ขอบจอซ้าย/ขวา (ไม่บังกระป๋อง) */}
      {(
        [
          [-1, "Previous can", "left-[calc(50%-9.5rem)] md:left-[60px]", "‹"],
          [1, "Next can", "right-[calc(50%-9.5rem)] md:right-[60px]", "›"],
        ] as const
      ).map(([dir, label, side, icon]) => (
        <button
          key={dir}
          aria-label={label}
          onClick={() => onStep(dir)}
          className={`pointer-events-auto absolute top-[36%] grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 pb-0.5 text-2xl text-white/80 backdrop-blur-sm transition hover:bg-white hover:text-black md:top-1/2 md:h-12 md:w-12 md:border md:border-white/20 ${side}`}
        >
          {icon}
        </button>
      ))}

      <div className="absolute inset-x-0 bottom-[5%] flex flex-col items-center px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/60">
          {pad(brand + 1)} / {pad(brands.length)} · {brandStories[b.id].taste}
        </p>
        {/* key: เปลี่ยนยี่ห้อ = สร้างตัวอักษรใหม่ แอนิเมชันเลื่อนขึ้นเล่นใหม่ */}
        <h2 key={b.id} className="fizz-title mt-2 text-[clamp(2.4rem,6vw,4.75rem)] leading-[0.92]">
          <Reveal text={b.name} />
        </h2>

        {/* แถบเลือกยี่ห้อ: เส้นไล่สีของทั้ง 6 ยี่ห้อ + จุดบอกยี่ห้อที่เลือก (ปุ่มจริงซ่อนอยู่ใต้แต่ละสี) */}
        <div
          ref={slider}
          className="pointer-events-auto relative mt-7 h-6 w-[min(20rem,70vw)] cursor-pointer touch-none"
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            pickAt(e);
          }}
          onPointerMove={(e) => dragging.current && pickAt(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <div
            className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
            style={{ background: `linear-gradient(90deg, ${brands.map((x) => x.accent).join(", ")})` }}
          />
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-[left] duration-500 ease-out"
            style={{ left: `${(brand / (brands.length - 1)) * 100}%`, background: b.accent }}
          />
          <div className="absolute inset-0 flex" role="group" aria-label="Choose a can">
            {brands.map((x, i) => (
              <button
                key={x.id}
                aria-label={x.name}
                aria-pressed={i === brand}
                onClick={() => onPick(i)}
                className="h-full flex-1 opacity-0"
              />
            ))}
          </div>
        </div>

        <p className="mt-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-white/50">
          <span className="scroll-hint" aria-hidden />
          Scroll to discover
        </p>
      </div>
    </div>
  );
}

// ---------- section ยี่ห้อที่เลือก: ประวัติสั้นๆ ----------
export function BrandOverlay({ active, brand }: { active: boolean; brand: Brand }) {
  const s = brandStories[brand.id];
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="fizz-copy">
        <p className="reveal-fade text-[11px] uppercase tracking-[0.3em] text-white/60">
          Since {s.since} · {brand.origin.city}
        </p>
        <h2 key={brand.id} className="fizz-title mt-3 text-[clamp(2.2rem,4.4vw,4.2rem)] leading-[0.92]">
          <Reveal text={brand.name} delay={0.1} />
        </h2>
        <p className="reveal-fade mt-5 max-w-sm text-[15px] leading-relaxed text-white/80">{s.story}</p>
        <dl className="reveal-fade mt-6 flex gap-8 text-[11px] uppercase tracking-[0.25em]">
          <div>
            <dt className="text-white/45">Taste</dt>
            <dd className="mt-1 text-white">{s.taste}</dd>
          </div>
          <div>
            <dt className="text-white/45">Can</dt>
            <dd className="mt-1 text-white">500 ml</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

// ---------- 4 section ข้อเด่นของน้ำอัดลม ----------
export function BenefitOverlay({ active, index }: { active: boolean; index: number }) {
  const x = benefits[index];
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="fizz-copy">
        {/* ป้ายเล็ก: สิ่งที่ "ไม่ใช่" ถูกขีดฆ่า */}
        <p className="reveal-fade flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em]">
          <span className="grid h-5 w-5 place-items-center bg-[var(--tint1)] text-white">×</span>
          <s className="bg-white px-2 py-0.5 text-black decoration-black">{x.strike}</s>
        </p>
        <h2 className="fizz-title mt-4 text-[clamp(2.4rem,5.5vw,4.8rem)] leading-[0.92]">
          <Reveal text={x.title} delay={0.1} />
        </h2>
        <p className="reveal-fade mt-5 max-w-sm text-[15px] leading-relaxed text-white/80">{x.text}</p>
      </div>
    </div>
  );
}

// ---------- ปุ่มไอคอน 4 ข้อเด่น ด้านขวา (แสดงตั้งแต่ section ยี่ห้อถึงข้อเด่นข้อสุดท้าย) ----------
export function BenefitNav({
  active,
  current,
  onGo,
}: {
  active: boolean;
  current: number; // ข้อเด่นที่กำลังแสดง (−1 = ยังไม่ถึง)
  onGo: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Soda facts"
      data-active={active}
      className="overlay pointer-events-none fixed top-1/2 right-4 z-[3] flex -translate-y-1/2 flex-col items-center gap-3 md:right-[60px] md:gap-5"
    >
      {benefits.map((x, i) => (
        <span key={x.id} className="flex flex-col items-center gap-3 md:gap-5">
          {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-white/40" />}
          <button
            aria-label={x.title}
            aria-current={i === current ? "step" : undefined}
            onClick={() => onGo(i)}
            className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full border transition md:h-12 md:w-12 ${i === current ? "border-white bg-[var(--tint1)] text-white shadow-[0_0_18px_var(--tint1)]" : "border-white/25 bg-black/20 text-white/70 hover:border-white/60"}`}
          >
            <BenefitIcon name={x.icon} className="h-5 w-5" />
          </button>
        </span>
      ))}
    </nav>
  );
}

// ---------- ตัวหนังสือใหญ่จางๆ ด้านหลังกระป๋อง (อยู่ชั้นหลัง canvas) ----------
export function GhostText({
  active,
  lines,
  size = "text-[clamp(4rem,17vw,16rem)]",
}: {
  active: boolean;
  lines: string[];
  size?: string; // ขนาดตัวอักษร (คำยาวต้องเล็กลง ไม่ให้ล้นจอ)
}) {
  return (
    <div
      aria-hidden
      data-active={active}
      className="overlay pointer-events-none fixed inset-0 z-[1] flex flex-col items-center justify-center"
    >
      {lines.map((l, i) => (
        <span
          key={l}
          className={`fizz-title ghost-line leading-[0.85] text-white/[0.13] ${size}`}
          style={{ ["--d" as string]: `${0.1 + i * 0.12}s` }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

// ---------- ข้อความเล็กด้านล่าง ของ section CRACK และรวมกระป๋อง ----------
export function Caption({
  active,
  title,
  text,
  action,
}: {
  active: boolean;
  title: string;
  text: string;
  action?: { label: string; onClick: () => void }; // ปุ่มเล็กใต้ข้อความ (ถ้ามี)
}) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-x-0 bottom-[7%] z-[3] px-6 text-center">
      <h2 className="fizz-title text-[clamp(1.8rem,3.5vw,3rem)] leading-none">
        <Reveal text={title} />
      </h2>
      <p className="reveal-fade mx-auto mt-3 max-w-xl text-sm text-white/75">{text}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="reveal-fade pointer-events-auto mt-5 rounded-full border border-white/40 px-5 py-2 text-[11px] uppercase tracking-[0.25em] transition hover:bg-white hover:text-black"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
