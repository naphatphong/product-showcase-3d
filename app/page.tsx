import Link from "next/link";
import Showroom from "@/components/Showroom";
import { products } from "@/config/products";
import { site } from "@/config/site";

// หน้าแรก (Server Component): หัวเว็บ + ข้อความ render บน server จึงขึ้นทันที
// ส่วนที่เป็น 3D และโต้ตอบได้อยู่ใน <Showroom /> (Client Component)
export default function Home() {
  return (
    <main className="h-dvh overflow-hidden">
      {/* หัวเว็บ render บน server แล้วส่งเข้าไปเป็น children ของ Showroom (Client Component)
          pointer-events-none: ให้เมาส์/นิ้วทะลุข้อความไปถึงฉาก 3D ด้านหลัง */}
      <Showroom>
        <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-10">
          <div className="font-display text-lg tracking-[0.35em]">
            {site.name}{" "}
            <span className="font-sans text-[11px] tracking-[0.2em] text-white/50">{site.byline}</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">Cart · 0</div>
        </header>

        <div className="pointer-events-none fixed inset-x-0 top-20 z-10 px-4 text-center sm:top-24">
          <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">[ {site.eyebrow} ]</p>
          <h1 className="mt-3 font-display text-4xl font-light sm:text-6xl">{site.headline}</h1>
        </div>
      </Showroom>

      <p className="pointer-events-none fixed inset-x-0 bottom-2.5 z-10 text-center text-[10px] text-white/35">
        Concept projects · Earth: NASA · F1 models: Dave Love, CC BY 4.0
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
