import Link from "next/link";
import Showroom from "@/components/Showroom";
import Reveal from "@/components/Reveal";
import { archivo, plexMono } from "@/components/fonts";
import { products } from "@/config/products";
import { site } from "@/config/site";

// หน้าแรก (Server Component): ข้อความ render บน server จึงขึ้นทันที (และ Google อ่านได้)
// ส่วนที่เป็น 3D และโต้ตอบได้อยู่ใน <Showroom /> (Client Component) — ข้อความส่งเข้าไปเป็น props
export default function Home() {
  return (
    <main className={`${archivo.variable} ${plexMono.variable} orbit-root h-dvh overflow-hidden`}>
      <Showroom
        // แถบบนสุด: ตะกร้า (ซ้าย) + โลโก้ (กลาง — หน้าโหลดใช้โลโก้ชุดเดียวกัน แล้วเลื่อนขึ้นมาจอดตรงนี้พอดี)
        // ปุ่มเสียงด้านขวาอยู่ใน Showroom เพราะต้องกดได้
        cart={<p className="orbit-mono text-[10px] uppercase tracking-[0.25em] text-white/60">Cart · 0</p>}
        logo={
          <p className="text-center text-[13px] font-medium tracking-[0.45em] whitespace-nowrap">
            {site.name}
            <span className="orbit-mono mt-1 block text-[9px] font-normal tracking-[0.3em] text-white/45">
              {site.byline}
            </span>
          </p>
        }
        // หน้าเปิด: หัวข้อตัวบางใหญ่กลางจอ (ตัวอักษรเลื่อนขึ้นทีละตัว) + คำอธิบายสั้น — ปุ่มเริ่มอยู่ใน Showroom
        intro={
          <>
            <h1 className="orbit-thin text-[clamp(1.75rem,6vw,5.2rem)] leading-[1.04] uppercase">
              {site.headline.map((line, i) => (
                <span key={line} className="block">
                  <Reveal text={line} delay={0.15 + i * 0.2} step={0.025} />
                </span>
              ))}
            </h1>
            <p className="orbit-mono reveal-fade mx-auto mt-6 max-w-md text-[10px] leading-relaxed tracking-[0.2em] text-white/65 uppercase">
              {site.intro}
            </p>
          </>
        }
      />

      {/* เครดิตเต็ม (ผู้สร้างโมเดล + license) อยู่ที่หน้า /credits — ท้ายจอมีแค่ลิงก์ ไม่ให้รก */}
      <p className="orbit-mono pointer-events-none fixed inset-x-0 bottom-2.5 z-10 text-center text-[9px] tracking-[0.12em] text-white/35">
        Concept projects — not real products ·{" "}
        <Link href="/credits" className="pointer-events-auto underline underline-offset-2 hover:text-white/70">
          Credits
        </Link>
      </p>

      {/* รายการสินค้าแบบ HTML ล้วน: มองไม่เห็นบนจอ แต่ screen reader และ Google อ่านได้ */}
      <nav aria-label="Products" className="sr-only">
        <ul>
          {products.map((p) => (
            <li key={p.slug}>
              <Link href={`/${p.slug}`}>
                {p.name} — {p.category}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
