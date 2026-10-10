"use client";

import Link from "next/link";
import { look, productHref, products } from "@/config/products";
import { formatCoords } from "@/lib/format";
import Reveal from "./Reveal";

type Props = {
  index: number; // สินค้าที่จอดอยู่ตรงกลาง
  narrow: boolean;
  visible: boolean; // false = ซ่อน (หน้าเปิด / สินค้ายังบินมาไม่ถึง / กำลังดำดิ่ง)
  onEnter: (index: number) => void;
  onStep: (dir: 1 | -1) => void; // เปลี่ยนไปชิ้นก่อนหน้า/ถัดไป
  variant: number; // แบบที่เลือกอยู่ของสินค้าชิ้นนี้
  onVariant: (variant: number) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

// รายละเอียดสินค้าที่จอดอยู่ แบบหน้าจอเครื่องมือ (HUD) ของต้นแบบ:
// - ซ้ายล่าง: ลำดับ + หมวด, ชื่อสินค้าตัวหนาใหญ่ (ตัวอักษรเลื่อนขึ้นทีละตัว), คำโปรย + สเปกตัวพิมพ์ดีด, ปุ่มเลือกแบบ, ปุ่มเข้า
// - ขวาล่าง (คอม): เมืองบ้านเกิด + พิกัด และตัวบอกว่าอยู่ชิ้นที่เท่าไร
// เปลี่ยนชิ้น → key เปลี่ยน → ข้อความถูกสร้างใหม่ แอนิเมชันเล่นใหม่ (CSS ล้วน คลาส reveal-* / overlay ใน globals.css)
export default function OrbitPanel({ index, narrow, visible, onEnter, onStep, variant, onVariant }: Props) {
  const p = products[index];
  const { variant: v, accent, origin } = look(p, variant);
  const multi = p.variants.length > 1;

  // ปุ่มเข้าหน้าสินค้า: เป็นลิงก์จริง (คลิกขวา/เปิดแท็บใหม่ได้) แต่คลิกปกติจะเล่นแอนิเมชันดำดิ่งก่อนเปลี่ยนหน้า
  const enter = (
    <Link
      href={productHref(p, variant)}
      onClick={(e) => {
        e.preventDefault();
        onEnter(index);
      }}
      className="orbit-cta pointer-events-auto"
    >
      Enter {p.name} →
    </Link>
  );
  // ปุ่ม ‹ › (มือถือ: ข้างปุ่มเข้า / คอมมีปุ่มที่ขอบจออยู่แล้ว)
  const arrow = (dir: 1 | -1) => (
    <button
      aria-label={dir < 0 ? "Previous product" : "Next product"}
      onClick={() => onStep(dir)}
      className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-white/25 pb-0.5 text-xl text-white/80 transition hover:bg-white hover:text-black"
    >
      {dir < 0 ? "‹" : "›"}
    </button>
  );

  return (
    <section
      aria-label="Product details"
      aria-live="polite"
      data-active={visible}
      className="overlay pointer-events-none fixed inset-0 z-20"
    >
      <div className="absolute inset-x-5 bottom-9 md:right-auto md:bottom-14 md:left-10 md:max-w-xl">
        <p className="orbit-mono text-[10px] tracking-[0.28em] text-white/60 uppercase">
          {pad(index + 1)} / {pad(products.length)} — {p.category}
        </p>
        {/* ชื่อสินค้า: key = สร้างใหม่ทุกครั้งที่เปลี่ยนชิ้น ตัวอักษรจะเลื่อนขึ้นใหม่ */}
        <h2 key={p.slug} className="orbit-bold mt-2 text-[clamp(2.9rem,7.5vw,7rem)] leading-[0.9]">
          <Reveal text={p.name} step={0.035} />
        </h2>
        <div key={`${p.slug}-copy`} className="reveal-fade">
          <p className="orbit-mono mt-4 text-[11px] tracking-[0.2em] text-white/85 uppercase">{p.tagline}</p>
          {/* สเปก: บรรทัดเดียวคั่นด้วย / (มือถือซ่อนตอนจอเตี้ย ไม่ให้บังสินค้า) */}
          <p className="orbit-mono mt-2 max-w-md text-[10px] leading-relaxed tracking-[0.16em] text-white/50 uppercase [@media(max-height:700px)]:hidden">
            {p.specs.map((s) => `${s.label} ${s.value}`).join("  /  ")}
          </p>
        </div>

        {/* สินค้าที่มีหลายแบบ: ปุ่มวงกลมสีของแต่ละแบบ (บอกชื่อผ่าน aria-label/title) + ชื่อแบบที่เลือกอยู่ */}
        {multi && (
          <div role="group" aria-label="Choose a version" className="pointer-events-auto mt-5 flex flex-wrap items-center gap-1">
            {p.variants.map((x, i) => (
              <button
                key={x.id}
                aria-label={x.name}
                title={x.name}
                aria-pressed={i === variant}
                onClick={() => onVariant(i)}
                className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${i === variant ? "border-white/80" : "border-transparent hover:border-white/35"}`}
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-white/25" style={{ background: x.swatch ?? x.accent }} />
              </button>
            ))}
            <span className="orbit-mono ml-2 text-[10px] tracking-[0.22em] text-white/80 uppercase">{v.name}</span>
          </div>
        )}

        <div className={`flex items-center gap-4 ${multi ? "mt-6" : "mt-7"} ${narrow ? "justify-between" : ""}`}>
          {narrow && arrow(-1)}
          {enter}
          {narrow && arrow(1)}
        </div>
      </div>

      {/* คอม: ขวาล่าง = เมืองบ้านเกิดของแบบที่เลือก (จุดที่กล้องจะดำดิ่งไป) + ตัวบอกลำดับ */}
      {!narrow && (
        <div className="orbit-mono absolute right-10 bottom-14 text-right text-[10px] tracking-[0.25em] uppercase">
          <p className="text-white/45">Origin</p>
          <p className="mt-1.5 text-white/85">{origin.city}</p>
          <p className="mt-1 text-white/55">{formatCoords(origin)}</p>
          <div className="mt-5 flex items-center justify-end gap-2" aria-hidden>
            {products.map((q, i) => (
              <span
                key={q.slug}
                className={`h-px transition-all duration-500 ${i === index ? "w-10" : "w-4 bg-white/30"}`}
                style={i === index ? { background: accent } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
