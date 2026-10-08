import type { Metadata } from "next";
import Link from "next/link";
import { products, type Product } from "@/config/products";
import { formatCoords } from "@/lib/format";

// หาข้อมูลสินค้าจาก slug (ทุก slug มีอยู่จริงเพราะ type บังคับไว้)
const find = (slug: Product["slug"]) => products.find((p) => p.slug === slug)!;

// title/description ของหน้าสินค้า สร้างจาก config
export function productMetadata(slug: Product["slug"]): Metadata {
  const p = find(slug);
  return { title: `${p.name} — ${p.category}`, description: `${p.name}: ${p.tagline}` };
}

// หน้าสินค้าชั่วคราว: ชื่อ + จุดบ้านเกิด + ปุ่มกลับ
// (ประสบการณ์เต็มของแต่ละสินค้าจะทำใน milestone P1–P3)
// หน้าจะค่อยๆ สว่างขึ้นจากสีดำ ต่อจากจังหวะที่กล้องพุ่งเข้าหาโลกในหน้าแรก
export default function ProductIntro({ slug }: { slug: Product["slug"] }) {
  const p = find(slug);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center motion-safe:animate-fade-in">
      <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
        {p.category} · {p.origin.city} · {formatCoords(p.origin)}
      </p>
      <h1
        className="mt-5 font-display text-6xl font-light tracking-[0.12em] sm:text-8xl"
        style={{ color: p.accent }}
      >
        {p.name}
      </h1>
      <p className="mt-4 text-lg text-white/70">{p.tagline}</p>
      {/* สินค้าที่มีหลายแบบ (เช่น รถ 3 ทีม): แสดงรายชื่อแบบพร้อมจุดสีประจำ */}
      {p.variants && (
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {p.variants.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-white/70"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: v.accent }} />
              {v.name}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 max-w-md text-sm text-white/40">
        The full {p.category.toLowerCase()} experience is being built — coming next.
      </p>
      <Link
        href="/"
        className="mt-10 text-[11px] uppercase tracking-[0.3em] text-white/70 underline-offset-8 hover:underline"
      >
        ← Back to orbit
      </Link>
      <p className="absolute inset-x-0 bottom-4 text-[10px] text-white/30">
        {p.note ?? "Concept project — not a real product."}
      </p>
    </main>
  );
}
