"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import Reveal from "@/components/Reveal";
import { DESIGN_CALLOUTS, type Callout } from "@/config/f1";
import type { Motion } from "./motion";

const pad = (n: number) => String(n).padStart(2, "0");

// ระยะใน config เป็น px ที่จอ 1440×900 → คูณ --u (ขนาดรถบนจอเทียบกับจอนั้น) ป้ายจะย่อ/ขยายไปพร้อมรถ
const u = (px: number) => `calc(var(--u) * ${px})`;

// เส้นหักมุมจากจุดบนรถไปหากล่องข้อความ: ขึ้น/ลงก่อน (dy) แล้วไปทางซ้าย/ขวา (dx) — ใช้เส้นขอบของกล่องสี่เหลี่ยมวาด
function leader({ dx, dy }: Callout): CSSProperties {
  const side = dx > 0 ? "borderLeftWidth" : "borderRightWidth";
  const end = dy < 0 ? "borderTopWidth" : "borderBottomWidth";
  return {
    left: u(Math.min(0, dx)),
    top: u(Math.min(0, dy)),
    width: u(Math.abs(dx)),
    height: u(Math.abs(dy)),
    [side]: 1,
    [end]: 1,
  };
}
// กล่องข้อความต่อจากปลายเส้น (อยู่ด้านขวาของปลายเส้นถ้าเส้นไปทางขวา และกลับกัน) ห่างปลายเส้น 10px
function box({ dx, dy }: Callout): CSSProperties {
  const gap = `calc(var(--u) * ${Math.abs(dx)} + 10px)`;
  return dx > 0 ? { left: gap, top: u(dy) } : { right: gap, top: u(dy) };
}

// หน้าความสวยของ GRID 26: กล้องเข้าใกล้รถ 3D ลอยวนช้าๆ (ท่า DESIGN ใน scene/timeline.ts)
// - ข้อความด้านซ้าย (มือถือ = ด้านล่าง พร้อมตาราง 3 ช่องแทนป้าย)
// - คอม: ป้าย 3 อัน (แบบป้าย HUD ของเว็บ Aevion) ชี้ไปที่จุดบนตัวรถ — ฉาก 3D คำนวณตำแหน่งจุดบนจอให้ทุกเฟรม
//   (motion.anchors) แล้วหน้านี้ย้ายป้ายตามใน requestAnimationFrame
export default function DesignSection({ active, motion }: { active: boolean; motion: RefObject<Motion> }) {
  const pins = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const follow = () => {
      const a = motion.current.anchors;
      pins.current.forEach((el, i) => {
        if (!el) return;
        el.style.transform = `translate3d(${a[i * 3].toFixed(1)}px, ${a[i * 3 + 1].toFixed(1)}px, 0)`;
        el.dataset.on = a[i * 3 + 2] ? "true" : "false";
      });
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [active, motion]);

  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-copy">
        <p className="f1-label reveal-fade">[ Design ]</p>
        <h2 className="f1-title mt-3 text-[clamp(2.6rem,5vw,4.8rem)]">
          <Reveal text="Fast standing still." delay={0.1} />
        </h2>
        <p className="reveal-fade mt-5 text-[14px] leading-relaxed text-[var(--f1-muted)] md:text-[15px]">
          Low, long and matte. Red Bull has raced in navy blue, red and yellow since its first season, and for 2026
          the car got smaller: narrower, shorter and 32 kg lighter than the year before.
        </p>
        {/* มือถือ: จุดเด่น 3 ข้อเป็นตาราง (จอเล็ก ป้ายชี้บนรถจะบังรถ) */}
        <dl className="reveal-fade mt-5 grid w-full grid-cols-3 border-t border-[var(--f1-line)] md:hidden">
          {DESIGN_CALLOUTS.map((c) => (
            <div key={c.label} className="border-l border-[var(--f1-line)] px-3 pt-3 first:border-l-0 first:pl-0">
              <dt className="f1-label text-[9px]">{c.label}</dt>
              <dd className="mt-1.5 text-[12px] leading-tight font-semibold">{c.short}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* คอม: ป้ายชี้จุดบนรถ */}
      {DESIGN_CALLOUTS.map((c, i) => (
        <div
          key={c.label}
          ref={(el) => {
            pins.current[i] = el;
          }}
          data-on="false"
          className="f1-pin"
          style={{ "--d": `${0.5 + i * 0.18}s` } as CSSProperties}
        >
          <span aria-hidden className="f1-pin-dot" />
          <span aria-hidden className="f1-pin-line" style={leader(c)} />
          <div className="f1-pin-box" style={box(c)}>
            <p className="f1-label text-[10px]">
              <span className="text-[var(--f1-red)]">[ {pad(i + 1)} ]</span> {c.label}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-[var(--f1-muted)]">{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
