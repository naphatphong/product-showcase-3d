"use client"; // ใช้ WebGL และ hooks ของ React จึงต้องรันฝั่งเบราว์เซอร์ (Client Component)

import { Suspense, useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Stars } from "@react-three/drei";
import * as THREE from "three";
import { products } from "@/config/products";
import Earth, { SUN_DIR } from "./Earth";
import FloatingProduct from "./FloatingProduct";

// มุมกล้องปกติ 2 แบบ: จอกว้าง (คอม) / จอแคบ (มือถือแนวตั้ง ต้องถอยออกและมุมกว้างขึ้นให้สินค้าพอดีจอ)
const VIEWS = {
  wide: { pos: new THREE.Vector3(0, 0.6, 8.2), look: new THREE.Vector3(0, 0.25, 0), fov: 38 },
  narrow: { pos: new THREE.Vector3(0, 0.8, 9.5), look: new THREE.Vector3(0, -0.3, 0), fov: 46 },
};

export type SceneProps = {
  narrow: boolean;
  active: number | null;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
  onReady: () => void; // เรียกเมื่อภาพโลกโหลดเสร็จ (ใช้ซ่อนข้อความ loading)
  labelLayer: RefObject<HTMLDivElement | null>; // ชั้น HTML สำหรับป้ายชื่อสินค้า
};

export default function Scene(props: SceneProps) {
  return (
    // dpr [1, 2]: ความคมตามจอ แต่ไม่เกิน 2 เท่า กันมือถือจอคมสูงทำงานหนักเกิน
    // fallback: แสดงแทนเมื่อเครื่องไม่รองรับ WebGL
    <Canvas camera={{ position: [0, 0.6, 8.2], fov: 38 }} dpr={[1, 2]} fallback={<NoWebGL />}>
      <Rig narrow={props.narrow} />
      {/* ดาว: กระจายอยู่บนทรงกลมรัศมี 120 รอบฉาก, fade = ดาวขอบๆ จางลง */}
      <Stars radius={120} depth={40} count={6000} factor={5} saturation={0} fade speed={0.4} />

      {/* ไฟของสินค้า: ไฟหลักจากหน้าซ้าย + ไฟขอบจากฝั่งดวงอาทิตย์ (ทิศเดียวกับแสงบนโลก) */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[-4, 5, 6]} intensity={2} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(10)} intensity={3} color="#cfe0ff" />
      {/* Environment = ภาพรอบตัวที่ใช้ทำแสงสะท้อนบนโลหะ สร้างจากแผ่นไฟ (Lightformer) ในฉากเอง ไม่ต้องโหลดไฟล์ */}
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[0, 5, 2]}
          rotation-x={Math.PI / 2}
          scale={[8, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          position={[-6, 1, 3]}
          rotation-y={Math.PI / 2}
          scale={[2, 6, 1]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          color="#9ec5ff"
          position={[6, 1, -3]}
          rotation-y={-Math.PI / 2}
          scale={[2, 6, 1]}
        />
      </Environment>

      <Products {...props} />
      {/* Suspense: รอภาพโลกโหลดเสร็จก่อนค่อยแสดง (ระหว่างนั้นเห็นดาวกับสินค้าไปก่อน) */}
      <Suspense fallback={null}>
        <Earth />
        <Ready onReady={props.onReady} />
      </Suspense>
    </Canvas>
  );
}

// จัดตำแหน่งสินค้า 3 ชิ้น
function Products({ narrow, active, onHover, onSelect, labelLayer }: SceneProps) {
  const size = useThree((s) => s.size);
  const view = narrow ? VIEWS.narrow : VIEWS.wide;
  // ความกว้างของภาพที่ระยะของสินค้า (z = 0) คิดจากมุมกล้องปกติ จะได้ไม่เปลี่ยนตามตอนกล้องขยับ
  const viewWidth =
    2 * view.pos.z * Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * (size.width / size.height);
  const spacing = THREE.MathUtils.clamp(viewWidth * 0.31, 2.6, 3.8);

  return products.map((product, i) => {
    let position: [number, number, number];
    let scale = 1;
    if (narrow) {
      // มือถือ: carousel — k = -1 ซ้าย, 0 กลาง, 1 ขวา (วนรอบได้)
      const k = ((i - (active ?? 0) + 4) % 3) - 1;
      position = [k * viewWidth * 0.62, 0.4, -Math.abs(k) * 1.5];
      scale = k === 0 ? 1 : 0.7;
    } else {
      // คอม: เรียงเป็นแนวโค้ง ชิ้นกลางอยู่ใกล้สุด
      position = [(i - 1) * spacing, 0.4, -Math.abs(i - 1) * 0.9];
    }
    return (
      <FloatingProduct
        key={product.slug}
        product={product}
        index={i}
        position={position}
        scale={scale}
        active={active === i}
        dimmed={active !== null && active !== i}
        labelLayer={narrow ? null : labelLayer} // มือถือมีแผงรายละเอียดแล้ว ไม่ต้องมีป้าย
        onHover={onHover}
        onSelect={onSelect}
      />
    );
  });
}

// กล้อง: ค่อยๆ เข้าหามุมปกติ + ขยับตามเมาส์เล็กน้อย (parallax) ให้ฉากดูมีมิติ
function Rig({ narrow }: { narrow: boolean }) {
  const look = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const view = narrow ? VIEWS.narrow : VIEWS.wide;
    const k = narrow ? 0 : 1; // มือถือไม่มีเมาส์ → ไม่ต้อง parallax
    const damp = THREE.MathUtils.damp;
    cam.position.x = damp(cam.position.x, view.pos.x + state.pointer.x * 0.5 * k, 2.5, dt);
    cam.position.y = damp(cam.position.y, view.pos.y + state.pointer.y * 0.25 * k, 2.5, dt);
    cam.position.z = damp(cam.position.z, view.pos.z, 2.5, dt);
    cam.fov = damp(cam.fov, view.fov, 4, dt);
    cam.updateProjectionMatrix();
    look.current.lerp(view.look, 1 - Math.exp(-4 * dt));
    cam.lookAt(look.current);
  });
  return null;
}

// component นี้อยู่ใน Suspense เดียวกับโลก จึง mount หลังภาพโลกโหลดเสร็จเท่านั้น
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function NoWebGL() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-white/60">This browser can’t show the 3D showroom. Pick a product:</p>
      {products.map((p) => (
        <Link key={p.slug} href={`/${p.slug}`} className="underline">
          {p.name} — {p.category}
        </Link>
      ))}
    </div>
  );
}
