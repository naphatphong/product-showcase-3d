"use client";

import Link from "next/link";
import { products } from "@/config/products";
import { formatCoords } from "@/lib/format";

type Props = {
  index: number | null; // สินค้าที่กำลังแสดง (null = ยังไม่ได้ชี้อะไร)
  narrow: boolean;
  onEnter: (index: number) => void;
  onStep: (dir: 1 | -1) => void; // เลื่อนไปชิ้นก่อนหน้า/ถัดไป
};

// แผงรายละเอียดด้านล่างจอ: เปลี่ยนตามสินค้าที่ชี้ (คอม) หรือชิ้นที่อยู่ตรงกลาง (มือถือ)
export default function ProductPanel({ index, narrow, onEnter, onStep }: Props) {
  const p = index === null ? null : products[index];

  return (
    <section
      aria-label="Product details"
      aria-live="polite"
      className="pointer-events-auto fixed inset-x-4 bottom-8 z-20 mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-md"
    >
      {!p || index === null ? (
        <p className="py-3 text-center text-[11px] uppercase tracking-[0.3em] text-white/50">
          Hover a product to explore · ← → to browse
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-white/50">
            <span>
              0{index + 1} · {p.category}
            </span>
            <span>{narrow ? p.origin.city : `${p.origin.city} · ${formatCoords(p.origin)}`}</span>
          </div>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
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
              className="shrink-0 rounded-full border px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] transition-colors hover:bg-white/10"
              style={{ borderColor: p.accent, color: p.accent }}
            >
              Enter →
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            {p.specs.map((s) => (
              <div key={s.label}>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-white/40">{s.label}</dt>
                <dd className="mt-1 text-sm">{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* มือถือ: ปุ่มเลื่อนซ้าย/ขวา + จุดบอกว่าอยู่ชิ้นที่เท่าไร (ปัดบนจอก็ได้) */}
          {narrow && (
            <div className="mt-4 flex items-center justify-between">
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
                    style={i === index ? { background: p.accent } : undefined}
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
        </>
      )}
    </section>
  );
}
