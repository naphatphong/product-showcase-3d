import Link from "next/link";
import { faq } from "@/config/fizz";

// ส่วนท้ายของหน้า FIZZ — เลื่อนอ่านตามปกติ (ไม่ล็อกทีละ section)

// คำถามที่พบบ่อย: <details> + <summary> ของ HTML กดเปิด/ปิดได้เอง ใช้คีย์บอร์ดได้ และ screen reader รู้จัก
export function Faq() {
  return (
    <div className="pointer-events-auto @container mx-auto max-w-4xl px-6 pt-32 pb-24 md:px-[60px] md:pt-40">
      {/* ขนาดตัวอักษรอิงความกว้างคอลัมน์ (cqi) ไม่ใช่ความกว้างจอ → คำว่า QUESTIONS? ยาวพอดีคอลัมน์
          ขอบซ้าย-ขวาตรงกับรายการคำถามด้านล่างทุกขนาดจอ ไม่ล้นออกไปทางขวา */}
      <h2 className="fizz-title text-[12cqi] leading-[0.88]">
        Got
        <br />
        questions?
      </h2>
      {/* รายการคำถามชิดซ้ายตรงกับหัวข้อ */}
      <div className="mt-12">
        {faq.map((x) => (
          <details key={x.q} className="faq-item group border-b border-white/15 first:border-t">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] text-white/90 hover:text-white">
              {x.q}
              <span aria-hidden className="text-white/60 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-6 text-sm leading-relaxed text-white/65">{x.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ท้ายหน้า: ชวนไปดูสินค้าอื่น แล้วเลื่อนต่อจะวนกลับไปหน้าเลือกยี่ห้อ
export function Finale() {
  return (
    <div className="pointer-events-auto flex h-full flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">That&apos;s the lineup</p>
      <h2 className="fizz-title mt-4 text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.9]">Thirsty for more?</h2>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-white/30 px-6 py-3 text-[11px] uppercase tracking-[0.25em] transition hover:bg-white hover:text-black"
        >
          ← Back to orbit
        </Link>
        <Link
          href="/phone"
          className="rounded-full bg-white px-6 py-3 text-[11px] uppercase tracking-[0.25em] text-black transition hover:bg-white/80"
        >
          Next: SIGNAL →
        </Link>
      </div>
      <p className="mt-16 text-[11px] uppercase tracking-[0.3em] text-white/45">Keep scrolling to start over ↓</p>
      <p className="absolute inset-x-6 bottom-6 text-[10px] text-white/35">
        Fan concept — not affiliated with The Coca-Cola Company, PepsiCo or Keurig Dr Pepper. 3D model by Mark
        Peters (CC BY-NC 4.0) ·{" "}
        <Link href="/credits" className="underline underline-offset-2 hover:text-white/70">
          Credits
        </Link>
      </p>
    </div>
  );
}
