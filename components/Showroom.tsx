"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

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

// ส่วนที่โต้ตอบได้ของหน้าแรก: เก็บว่าสินค้าชิ้นไหนกำลังถูกเลือก แล้วส่งให้ฉาก 3D
export default function Showroom() {
  const narrow = useNarrow();
  const [active, setActive] = useState<number | null>(null);
  // มือถือ: ต้องมีสินค้าอยู่ตรงกลางเสมอ (เริ่มที่ชิ้นแรก) / คอม: ยังไม่ชี้อะไร = null
  const shown = narrow ? (active ?? 0) : active;

  return (
    <div className="fixed inset-0 touch-none">
      <Scene
        narrow={narrow}
        active={shown}
        // มือถือไม่มี hover (แตะแล้วเกิด pointerover ด้วย) จึงใช้ hover เฉพาะบนคอม
        onHover={narrow ? () => {} : setActive}
        onSelect={setActive}
      />
    </div>
  );
}
