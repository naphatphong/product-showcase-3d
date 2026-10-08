"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { products } from "@/config/products";
import { DIVE_SECONDS } from "@/lib/dive";
import { formatCoords } from "@/lib/format";
import ProductPanel from "./ProductPanel";

// โหลดฉาก 3D แบบ dynamic import + ssr: false
// - WebGL มีแค่ในเบราว์เซอร์ ถ้าให้ server render จะ error
// - three.js ไฟล์ใหญ่ แยก bundle ออกมา ข้อความหน้าเว็บจึงขึ้นก่อน แล้ว 3D ค่อยตามมา
const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

// จอแคบ (มือถือแนวตั้ง) หรือไม่ — อ่านจาก CSS media query และอัปเดตเมื่อหมุนจอ/ย่อหน้าต่าง
const NARROW = "(max-width: 767px)";
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false, // ตอน render บน server ยังไม่รู้ขนาดจอ ถือว่าเป็นจอกว้างไว้ก่อน
  );
}

// ส่วนที่โต้ตอบได้ของหน้าแรก: เก็บว่าสินค้าชิ้นไหนกำลังถูกเลือก แล้วส่งให้ฉาก 3D และแผงรายละเอียด
// children = หัวเว็บที่ render บน server (ส่งมาจาก page.tsx) — Showroom แค่ทำให้จางหายตอนดำดิ่ง
export default function Showroom({ children }: { children: ReactNode }) {
  const narrow = useNarrow();
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // ภาพโลกโหลดเสร็จหรือยัง
  const [entering, setEntering] = useState<number | null>(null); // กำลังดำดิ่งเข้าสินค้าชิ้นไหน
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const swipeStart = useRef<number | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null); // ชั้นวางป้ายชื่อสินค้า (drei จะใส่ป้ายลงในนี้)
  // มือถือ: ต้องมีสินค้าอยู่ตรงกลางเสมอ (เริ่มที่ชิ้นแรก) / คอม: ยังไม่ชี้อะไร = null
  const shown = narrow ? (active ?? 0) : active;

  const busy = entering !== null; // ระหว่างดำดิ่ง ไม่รับการกดอื่น

  // Next.js ไม่ได้ทิ้งหน้าเดิมตอนเปลี่ยนหน้า แต่ "ซ่อน" ไว้ (React Activity) เพื่อกดย้อนกลับได้เร็ว
  // cleanup นี้ทำงานตอนหน้าถูกซ่อน → รีเซ็ตสถานะดำดิ่ง ไม่ให้กลับมาเจอจอดำค้าง
  useLayoutEffect(
    () => () => {
      clearTimeout(timer.current);
      setEntering(null);
    },
    [],
  );

  // เลื่อนไปชิ้นถัดไป (dir = 1) หรือก่อนหน้า (dir = -1) แบบวนรอบ
  const step = useCallback(
    (dir: 1 | -1) => {
      if (busy) return;
      setActive(((shown ?? (dir === 1 ? -1 : 0)) + dir + products.length) % products.length);
    },
    [shown, busy],
  );

  // เข้าหน้าสินค้า: เล่นแอนิเมชันดำดิ่งเข้าหาโลก แล้วค่อยเปลี่ยนหน้าเมื่อจบ
  const enter = useCallback(
    (index: number) => {
      if (busy) return;
      const href = `/${products[index].slug}`;
      // ผู้ใช้ที่ตั้งค่า "ลดการเคลื่อนไหว" ในเครื่อง: ข้ามแอนิเมชัน เปลี่ยนหน้าทันที
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      setActive(index);
      setEntering(index);
      router.prefetch(href); // โหลดหน้าปลายทางรอไว้ระหว่างแอนิเมชัน
      timer.current = setTimeout(() => router.push(href), DIVE_SECONDS * 1000);
    },
    [router, busy],
  );

  // แตะ/คลิกสินค้า: บนมือถือถ้าเป็นชิ้นด้านข้าง ให้เลื่อนมาตรงกลางก่อน / ชิ้นกลาง (หรือบนคอม) = เข้าเลย
  const select = (index: number) => {
    if (busy) return;
    if (narrow && index !== shown) setActive(index);
    else enter(index);
  };

  const onReady = useCallback(() => setReady(true), []);

  // คีย์บอร์ด: ← → เลือกสินค้า, Enter เข้าหน้าสินค้า
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      // ถ้ากำลัง focus ปุ่ม/ลิงก์อยู่ ปล่อยให้ Enter ทำงานกับปุ่มนั้นตามปกติ
      else if (e.key === "Enter" && shown !== null && e.target === document.body) enter(shown);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, enter, shown]);

  return (
    <>
      {/* ปัดซ้าย/ขวาบนมือถือ: จำตำแหน่งนิ้วตอนแตะ แล้วดูว่าลากไปไกลแค่ไหนตอนปล่อย
          touch-none = ปิดการเลื่อน/ซูมของเบราว์เซอร์บนฉาก ให้ฉากรับการปัดเอง */}
      <div
        className={`fixed inset-0 touch-none transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        onPointerDown={(e) => (swipeStart.current = e.clientX)}
        onPointerUp={(e) => {
          const x0 = swipeStart.current;
          swipeStart.current = null;
          if (!narrow || x0 === null) return;
          const dx = e.clientX - x0;
          if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); // ปัดไปซ้าย = ชิ้นถัดไป
        }}
      >
        <Scene
          narrow={narrow}
          active={shown}
          // มือถือไม่มี hover (แตะแล้วเกิด pointerover ด้วย) จึงใช้ hover เฉพาะบนคอม
          onHover={narrow || busy ? () => {} : setActive}
          onSelect={select}
          onReady={onReady}
          labelLayer={labelLayer}
          diveTo={entering === null ? null : products[entering].origin}
        />
      </div>
      <div
        ref={labelLayer}
        className={`pointer-events-none fixed inset-0 z-[5] transition-opacity duration-300 ${busy ? "opacity-0" : ""}`}
      />

      {!ready && (
        <p className="fixed inset-x-0 top-1/2 z-10 text-center text-[11px] uppercase tracking-[0.35em] text-white/50 motion-safe:animate-pulse">
          Entering orbit…
        </p>
      )}

      <div className={`transition-opacity duration-500 ${busy ? "opacity-0" : ""}`}>{children}</div>

      <ProductPanel index={shown} narrow={narrow} onEnter={enter} onStep={step} hidden={busy} />

      {/* ระหว่างดำดิ่ง: บอกปลายทาง แล้วจอค่อยๆ มืดลงช่วงท้าย ต่อด้วยหน้าสินค้าที่ค่อยๆ สว่างขึ้น */}
      {entering !== null && (
        <p className="pointer-events-none fixed inset-x-0 top-1/2 z-40 -translate-y-1/2 text-center text-[11px] uppercase tracking-[0.35em] text-white/80 motion-safe:animate-fade-in">
          Descending to {products[entering].origin.city} · {formatCoords(products[entering].origin)}
        </p>
      )}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-30 bg-black transition-opacity ${busy ? "opacity-100" : "opacity-0"}`}
        // เริ่มมืดเมื่อดำดิ่งไปได้ 55% และมืดสนิทก่อนเปลี่ยนหน้าเล็กน้อย (คิดจาก DIVE_SECONDS ตัวเดียว)
        style={{
          transitionDelay: busy ? `${DIVE_SECONDS * 0.55}s` : "0s",
          transitionDuration: busy ? `${DIVE_SECONDS * 0.4}s` : "0s",
        }}
      />
    </>
  );
}
