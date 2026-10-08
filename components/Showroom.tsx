"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { products } from "@/config/products";
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
export default function Showroom() {
  const narrow = useNarrow();
  const router = useRouter();
  const [active, setActive] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // ภาพโลกโหลดเสร็จหรือยัง
  const swipeStart = useRef<number | null>(null);
  const labelLayer = useRef<HTMLDivElement>(null); // ชั้นวางป้ายชื่อสินค้า (drei จะใส่ป้ายลงในนี้)
  // มือถือ: ต้องมีสินค้าอยู่ตรงกลางเสมอ (เริ่มที่ชิ้นแรก) / คอม: ยังไม่ชี้อะไร = null
  const shown = narrow ? (active ?? 0) : active;

  // เลื่อนไปชิ้นถัดไป (dir = 1) หรือก่อนหน้า (dir = -1) แบบวนรอบ
  const step = useCallback(
    (dir: 1 | -1) => setActive(((shown ?? (dir === 1 ? -1 : 0)) + dir + products.length) % products.length),
    [shown],
  );

  // เข้าหน้าสินค้า
  const enter = useCallback((index: number) => router.push(`/${products[index].slug}`), [router]);

  // แตะ/คลิกสินค้า: บนมือถือถ้าเป็นชิ้นด้านข้าง ให้เลื่อนมาตรงกลางก่อน / ชิ้นกลาง (หรือบนคอม) = เข้าเลย
  const select = (index: number) => (narrow && index !== shown ? setActive(index) : enter(index));

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
          onHover={narrow ? () => {} : setActive}
          onSelect={select}
          onReady={onReady}
          labelLayer={labelLayer}
        />
      </div>
      <div ref={labelLayer} className="pointer-events-none fixed inset-0 z-[5]" />

      {!ready && (
        <p className="fixed inset-x-0 top-1/2 z-10 text-center text-[11px] uppercase tracking-[0.35em] text-white/50 motion-safe:animate-pulse">
          Entering orbit…
        </p>
      )}

      <ProductPanel index={shown} narrow={narrow} onEnter={enter} onStep={step} />
    </>
  );
}
