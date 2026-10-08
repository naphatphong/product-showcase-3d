"use client";

import Link from "next/link";
import { look, products } from "@/config/products";
import { formatCoords } from "@/lib/format";

type Props = {
  index: number; // สินค้าที่อยู่หน้าสุดของวงแหวน
  narrow: boolean;
  onEnter: (index: number) => void;
  onStep: (dir: 1 | -1) => void; // หมุนไปชิ้นก่อนหน้า/ถัดไป
  hidden: boolean; // ซ่อนตอนกำลังดำดิ่งเข้าหน้าสินค้า
  variant: number; // แบบที่เลือกอยู่ของสินค้าชิ้นนี้
  onVariant: (variant: number) => void;
};

// แผงรายละเอียดด้านล่างจอ: แสดงสินค้าที่อยู่หน้าสุดของวงแหวนเสมอ
// จัดวางด้วย grid-template-areas (คลาส panel-grid ใน globals.css) — แต่ละส่วนบอกแค่ว่าอยู่ช่องไหน ([grid-area:...])
// มือถือ: เรียงลงเป็นแถว / คอม: 2 คอลัมน์ (ซ้าย = ชื่อ + เลือกแบบ, ขวา = สเปก + ปุ่ม Enter) แผงจะได้เตี้ย ไม่บังสินค้า
export default function ProductPanel({ index, narrow, onEnter, onStep, hidden, variant, onVariant }: Props) {
  const p = products[index];
  const { variant: v, accent, origin } = look(p, variant);

  return (
    <section
      aria-label="Product details"
      aria-live="polite"
      className={`panel-grid fixed inset-x-4 bottom-8 z-20 mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-md transition-opacity duration-500 ${hidden ? "pointer-events-none opacity-0" : "pointer-events-auto"}`}
    >
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/50 [grid-area:head]">
        0{index + 1} · {p.category}
      </p>
      <p className="text-right text-[10px] uppercase tracking-[0.28em] text-white/50 [grid-area:city]">
        {origin.city}
        <span className="hidden md:inline"> · {formatCoords(origin)}</span>
      </p>

      <div className="mt-2 [grid-area:title]">
        <h2 className="font-display text-4xl font-light tracking-[0.1em] sm:text-5xl">{p.name}</h2>
        <p className="mt-1 text-sm text-white/60">{p.tagline}</p>
      </div>

      {/* เป็นลิงก์จริง (คลิกขวา/เปิดแท็บใหม่ได้) แต่คลิกปกติจะเล่นแอนิเมชันก่อนเปลี่ยนหน้า */}
      <Link
        href={`/${p.slug}`}
        onClick={(e) => {
          e.preventDefault();
          onEnter(index);
        }}
        className="mt-3 self-end justify-self-end rounded-full border px-5 py-2.5 text-[11px] whitespace-nowrap uppercase tracking-[0.25em] transition-colors [grid-area:enter] hover:bg-white/10"
        style={{ borderColor: accent, color: accent }}
      >
        Enter →
      </Link>

      {/* สินค้าที่มีหลายแบบ: ปุ่มวงกลมสีของแต่ละแบบ (บอกชื่อผ่าน aria-label/title) + ชื่อแบบที่เลือกอยู่ */}
      {p.variants.length > 1 && (
        <div
          role="group"
          aria-label="Choose a version"
          className="mt-3 flex flex-wrap items-center gap-1 [grid-area:pick]"
        >
          {p.variants.map((x, i) => (
            <button
              key={x.id}
              aria-label={x.name}
              title={x.name}
              aria-pressed={i === variant}
              onClick={() => onVariant(i)}
              className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${i === variant ? "border-white/70" : "border-transparent hover:border-white/30"}`}
            >
              <span
                className="h-4 w-4 rounded-full ring-1 ring-white/25"
                style={{ background: x.swatch ?? x.accent }}
              />
            </button>
          ))}
          <span className="ml-2 text-[10px] uppercase tracking-[0.22em] text-white/75">{v.name}</span>
        </div>
      )}

      {/* สเปก: มือถือเป็น 3 คอลัมน์ใต้ชื่อ (จอเตี้ยซ่อนไว้ ไม่ให้แผงบังสินค้า) / คอมเป็นรายการในคอลัมน์ขวา */}
      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 [grid-area:specs] md:mt-2 md:grid-cols-1 md:gap-1.5 md:border-0 md:pt-0 [@media(max-width:767px)_and_(max-height:760px)]:hidden">
        {p.specs.map((s) => (
          <div key={s.label} className="md:flex md:items-baseline md:justify-between md:gap-8">
            <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">{s.label}</dt>
            <dd className="mt-1 text-sm md:mt-0">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* มือถือ: ปุ่มหมุนซ้าย/ขวา + จุดบอกว่าอยู่ชิ้นที่เท่าไร (ลากบนจอก็ได้) — คอมมีปุ่มที่ขอบจอแทน */}
      {narrow && (
        <div className="mt-4 flex items-center justify-between [grid-area:nav]">
          <button
            aria-label="Previous product"
            onClick={() => onStep(-1)}
            className="px-3 py-1 text-xl text-white/70"
          >
            ‹
          </button>
          <div className="flex gap-2" aria-hidden>
            {products.map((q, i) => (
              <span
                key={q.slug}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6" : "w-1.5 bg-white/30"}`}
                style={i === index ? { background: accent } : undefined}
              />
            ))}
          </div>
          <button
            aria-label="Next product"
            onClick={() => onStep(1)}
            className="px-3 py-1 text-xl text-white/70"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
