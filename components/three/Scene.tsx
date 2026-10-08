"use client"; // ใช้ WebGL และ hooks ของ React จึงต้องรันฝั่งเบราว์เซอร์ (Client Component)

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// ฉาก 3D หลักของทั้งเว็บ
// M1: มีแค่กระบอกโลหะไว้ทดสอบว่าฉากทำงาน — M2 จะเปลี่ยนเป็นกระป๋องจริง
export default function Scene() {
  return (
    // fixed + inset-0 = เต็มจอและไม่เลื่อนตามหน้าเว็บ
    // -z-10 = อยู่หลังเนื้อหา HTML (ข้อความ sections จะเลื่อนผ่านด้านหน้า)
    <div className="fixed inset-0 -z-10">
      {/* Canvas ของ R3F สร้าง scene + camera + renderer ให้อัตโนมัติ
          camera: ถอยหลังออกมา 6 หน่วย, fov 35 = เลนส์แคบ ภาพไม่บิดเหมือนเลนส์กว้าง
          dpr [1, 2]: ความคมตามจอ แต่ไม่เกิน 2 เท่า กันมือถือจอคมสูงทำงานหนักเกิน */}
      <Canvas camera={{ position: [0, 0, 6], fov: 35 }} dpr={[1, 2]}>
        {/* แสงทั่วไปอ่อนๆ + แสงหลักจากมุมขวาบน */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 5, 4]} intensity={2} />

        {/* mesh = วัตถุ 1 ชิ้น ประกอบด้วย geometry (รูปทรง) + material (วัสดุ)
            args ของ cylinder: [รัศมีบน, รัศมีล่าง, ความสูง, จำนวนเหลี่ยมรอบวง] */}
        <mesh>
          <cylinderGeometry args={[0.6, 0.6, 3, 48]} />
          {/* metalness 1 = โลหะเต็มตัว, roughness ต่ำ = เงา
              ตอนนี้ดูมืดเพราะโลหะต้องมีสิ่งแวดล้อมให้สะท้อน (จะใส่ Environment ใน M2) */}
          <meshStandardMaterial color="#c0c0c0" metalness={1} roughness={0.25} />
        </mesh>

        {/* ใช้เมาส์/นิ้วหมุนดูชั่วคราว — ปิดซูม/เลื่อน ไม่ให้กวนการ scroll
            M5 จะเปลี่ยนเป็นระบบลากหมุนของเราเอง */}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
