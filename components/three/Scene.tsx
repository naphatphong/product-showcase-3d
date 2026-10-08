"use client"; // ใช้ WebGL และ hooks ของ React จึงต้องรันฝั่งเบราว์เซอร์ (Client Component)

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import Earth from "./Earth";

// ฉาก 3D หลักของหน้าแรก: อวกาศ + โลก (สินค้าจะเพิ่มในขั้นถัดไป)
export default function Scene() {
  return (
    // fixed + inset-0 = เต็มจอและไม่เลื่อนตามหน้าเว็บ, -z-10 = อยู่หลังเนื้อหา HTML
    <div className="fixed inset-0 -z-10 bg-black">
      {/* camera: ถอยหลัง 9 หน่วย สูงขึ้นนิดหน่อย มองลงมาที่กลางฉาก
          dpr [1, 2]: ความคมตามจอ แต่ไม่เกิน 2 เท่า กันมือถือจอคมสูงทำงานหนักเกิน */}
      <Canvas camera={{ position: [0, 0.4, 9], fov: 38 }} dpr={[1, 2]}>
        {/* ดาว: กระจายอยู่บนทรงกลมรัศมี 120 รอบฉาก, fade = ดาวขอบๆ จางลง */}
        <Stars radius={120} depth={40} count={6000} factor={5} saturation={0} fade speed={0.4} />
        {/* Suspense: รอภาพโลกโหลดเสร็จก่อนค่อยแสดง (ระหว่างนั้นเห็นแค่ดาว) */}
        <Suspense fallback={null}>
          <Earth />
        </Suspense>
      </Canvas>
    </div>
  );
}
