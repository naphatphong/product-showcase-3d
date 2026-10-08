import SceneLoader from "@/components/three/SceneLoader";
import { brand } from "@/config/brand";

// หน้าแรก (Server Component) — ฉาก 3D + ชื่อแบรนด์ + tagline
// ข้อความนี้ render บน server จึงขึ้นทันที ไม่ต้องรอฉาก 3D โหลด
export default function Home() {
  return (
    <>
      {/* ฉาก 3D อยู่หลังสุด (fixed เต็มจอ) */}
      <SceneLoader />
      {/* pointer-events-none: ให้เมาส์/นิ้วทะลุข้อความไปถึง canvas ด้านหลัง จะได้หมุนกระบอกได้ */}
      <main className="pointer-events-none flex min-h-dvh flex-col items-center justify-between px-4 py-16 text-center">
        <h1 className="text-6xl font-black tracking-tighter sm:text-8xl">{brand.name}</h1>
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">{brand.tagline}</p>
      </main>
      {/* ต้องมีตามข้อห้ามใน PLAN: บอกว่าเป็นงานสมมติ ไม่ใช่สินค้าจริง */}
      <footer className="py-6 text-center text-xs text-white/40">
        Concept project — not a real product.
      </footer>
    </>
  );
}
