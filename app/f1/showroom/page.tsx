import type { Metadata } from "next";
import Link from "next/link";
import { archivo, plexMono } from "@/components/fonts";
import { products } from "@/config/products";

const f1 = products.find((p) => p.slug === "f1")!;

export const metadata: Metadata = {
  title: `Showroom — ${f1.name}`,
  description: `${f1.name}: three 2026 Formula 1 cars in a 3D showroom.`,
};

// หน้าโชว์รูม 3D ของ GRID 26 (/f1/showroom) — ตอนนี้เป็นหน้าชั่วคราว
// ขั้นถัดไป: รถ 3 ทีมบนแท่นหมุน กดชิ้นส่วนบนรถเพื่อดูชื่อและคำอธิบายได้
export default function Page() {
  return (
    <div className={`${archivo.variable} ${plexMono.variable} f1-root`}>
      <div aria-hidden className="f1-paper fixed inset-0 z-0" />
      <main className="relative z-[1] flex min-h-dvh flex-col items-center justify-center px-6 text-center motion-safe:animate-fade-in">
        <p className="f1-label">
          <span className="text-[var(--f1-red)]">■</span> {f1.name} · 3D showroom
        </p>
        <h1 className="f1-title mt-4 text-[clamp(3.2rem,9vw,7.5rem)]">Coming next.</h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--f1-muted)]">
          Three cars on turntables. Pick one, spin it around, then click any part to see what it does.
        </p>
        {/* รถ 3 คันที่จะอยู่ในโชว์รูม พร้อมสีประจำทีม */}
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {f1.variants.map((v) => (
            <li key={v.id} className="f1-pill flex items-center gap-2">
              <span aria-hidden className="h-2 w-2" style={{ background: v.accent }} />
              {v.name}
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link href="/" className="f1-pill">
            ← Orbit
          </Link>
          <Link href="/f1" className="f1-cta">
            Back to the story
          </Link>
        </div>
      </main>
    </div>
  );
}
