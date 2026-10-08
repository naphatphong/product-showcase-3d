"use client"; // ใช้ WebGL และ hooks ของ React จึงต้องรันฝั่งเบราว์เซอร์ (Client Component)

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Stars } from "@react-three/drei";
import * as THREE from "three";
import { look, products } from "@/config/products";
import { DIVE_SECONDS } from "@/lib/dive";
import Backdrop from "./Backdrop";
import Earth, { EARTH_CENTER, EARTH_RADIUS, SUN_DIR } from "./Earth";
import FloatingProduct from "./FloatingProduct";

// มุมกล้องปกติ 2 แบบ: จอกว้าง (คอม) / จอแคบ (มือถือแนวตั้ง ต้องถอยออกและมุมกว้างขึ้นให้สินค้าพอดีจอ)
const VIEWS = {
  wide: { pos: new THREE.Vector3(0, 0.6, 8.2), look: new THREE.Vector3(0, 0.25, 0), fov: 38 },
  narrow: { pos: new THREE.Vector3(0, 0.8, 9.5), look: new THREE.Vector3(0, -0.3, 0), fov: 46 },
};

// ตำแหน่งวงแหวนที่ต้องหมุนไปหา (หน่วย = จำนวนชิ้น เช่น 1.4 = เลยชิ้นที่ 2 ไปเกือบครึ่งทาง)
// เป็น ref เพราะเปลี่ยนทุกครั้งที่นิ้ว/เมาส์ขยับตอนลาก — ฉากอ่านค่าเองทุกเฟรม ไม่ต้อง render ใหม่
export type Ring = { goal: number };

export type SceneProps = {
  narrow: boolean;
  front: number; // สินค้าที่อยู่หน้าสุดของวงแหวน
  ring: RefObject<Ring>;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onReady: () => void; // เรียกเมื่อภาพโลกโหลดเสร็จ (ใช้ซ่อนข้อความ loading)
  labelLayer: RefObject<HTMLDivElement | null>; // ชั้น HTML สำหรับป้ายชื่อสินค้า
  variants: number[]; // สินค้าแต่ละชิ้นเลือกแบบที่เท่าไรอยู่ (ใช้กับสินค้าที่มีหลายแบบ)
  diveTo: { lat: number; lon: number } | null; // มีค่า = กำลังดำดิ่งเข้าหาจุดนี้บนโลก
};

export default function Scene(props: SceneProps) {
  return (
    // dpr [1, 2]: ความคมตามจอ แต่ไม่เกิน 2 เท่า กันมือถือจอคมสูงทำงานหนักเกิน
    // fallback: แสดงแทนเมื่อเครื่องไม่รองรับ WebGL
    <Canvas camera={{ position: [0, 0.6, 8.2], fov: 38 }} dpr={[1, 2]} fallback={<NoWebGL />}>
      <Rig narrow={props.narrow} diveTo={props.diveTo} />
      <Backdrop />
      {/* ดาว: กระจายอยู่บนทรงกลมรัศมี 120 รอบฉาก, fade = ดาวขอบๆ จางลง */}
      <Stars radius={120} depth={40} count={6000} factor={5} saturation={0} fade speed={0.4} />

      {/* ไฟของสินค้า: ไฟหลักจากหน้าซ้าย + ไฟจากฝั่งดวงอาทิตย์ขวาบน (ทิศเดียวกับแสงบนโลก) */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 5, 6]} intensity={2.2} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(10)} intensity={2.4} color="#dce8ff" />
      {/* Environment = ภาพรอบตัวที่ใช้ทำแสงสะท้อนบนโลหะ สร้างจากแผ่นไฟ (Lightformer) ในฉากเอง ไม่ต้องโหลดไฟล์ */}
      <Environment resolution={256} environmentIntensity={1.25}>
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

      <Carousel {...props} />
      {/* Suspense: รอภาพโลกโหลดเสร็จก่อนค่อยแสดง (ระหว่างนั้นเห็นดาวกับสินค้าไปก่อน) */}
      <Suspense fallback={null}>
        <Earth focus={props.diveTo} />
        <Ready onReady={props.onReady} />
      </Suspense>
    </Canvas>
  );
}

// วงแหวนสินค้า (carousel แบบหมุนรอบ): สินค้าเรียงบนวงรีที่นอนราบ ชิ้นหน้าสุดอยู่กลางจอ ใหญ่และใกล้กล้องที่สุด
// ชิ้นอื่นอยู่ลึกเข้าไปด้านหลังซ้าย/ขวา — หมุนวงแหวน = ทุกชิ้นเลื่อนไปตามเส้นวงรีพร้อมกัน
function Carousel({ narrow, front, ring, onHover, onSelect, labelLayer, variants }: SceneProps) {
  const size = useThree((s) => s.size);
  const view = narrow ? VIEWS.narrow : VIEWS.wide;
  // ความกว้างของภาพที่ระยะของสินค้า (z = 0) คิดจากมุมกล้องปกติ จะได้ไม่เปลี่ยนตามตอนกล้องขยับ
  const viewWidth =
    2 * view.pos.z * Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * (size.width / size.height);
  // คอม: ชิ้นหน้าสุดต้องไม่ชนหัวเว็บ (สูง ~190px) และแผงรายละเอียด (~220px) ที่สูงคงที่เป็น px
  // แต่ฉาก 3D ย่อ/ขยายตามความสูงจอ → จอเตี้ยต้องลดขนาดชิ้นหน้าสุดลง
  // (1 หน่วยในฉาก = ความสูงจอ / 5.65 px, สินค้าสูงสุด 1.9 หน่วย, เผื่อป้าย "Click to enter" + ระยะห่างอีก ~110px)
  const fit = ((size.height - 520) * 5.65) / (1.9 * size.height);
  // rx = รัศมีแนวกว้าง (ตามความกว้างจอ), rz = ความลึก, front/side = ขนาดชิ้นหน้าสุด/ชิ้นด้านหลัง
  // มือถือ: ชิ้นด้านข้างโผล่ขอบจอพอให้รู้ว่ามีอีก / คอม: เห็นครบทุกชิ้น
  const layout = narrow
    ? { rx: viewWidth * 0.62, rz: 2, y: 0.12, front: 1.1, side: 0.7 }
    : {
        rx: THREE.MathUtils.clamp(viewWidth * 0.4, 2.8, 4.4),
        rz: 2,
        y: 0.45,
        front: THREE.MathUtils.clamp(fit, 0.85, 1.2),
        side: 0.75,
      };
  const items = useRef<(THREE.Group | null)[]>([]);
  const pos = useRef<number | null>(null); // ตำแหน่งวงแหวนที่แสดงอยู่ตอนนี้ (ไล่ตาม ring.goal แบบนุ่มๆ)
  // ผู้ใช้ที่ตั้ง "ลดการเคลื่อนไหว": วงแหวนกระโดดไปเลย ไม่หมุนให้เห็น
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useFrame((_, dt) => {
    const goal = ring.current.goal;
    const p = pos.current === null || reduced ? goal : THREE.MathUtils.damp(pos.current, goal, 6, dt);
    pos.current = p;
    const n = products.length;
    items.current.forEach((g, i) => {
      if (!g) return;
      // มุมของชิ้นนี้บนวงแหวน: 0 = หน้าสุด, ชิ้นถัดไปอยู่ทางขวา (+), ชิ้นก่อนหน้าอยู่ทางซ้าย (−)
      const a = ((i - p) / n) * Math.PI * 2;
      const near = (Math.cos(a) + 1) / 2; // 1 = หน้าสุด → 0 = หลังสุด
      g.position.set(layout.rx * Math.sin(a), layout.y, layout.rz * (Math.cos(a) - 1));
      g.scale.setScalar(layout.side + (layout.front - layout.side) * near * near);
    });
  });

  return products.map((product, i) => (
    <group
      key={product.slug}
      ref={(el) => {
        items.current[i] = el;
      }}
    >
      <FloatingProduct
        product={product}
        index={i}
        active={front === i}
        variant={look(product, variants[i]).variant}
        labelLayer={narrow ? null : labelLayer} // มือถือมีแผงรายละเอียดแล้ว ไม่ต้องมีป้าย
        onHover={onHover}
        onSelect={onSelect}
      />
    </group>
  ));
}

// กล้อง:
// - ปกติ: ค่อยๆ เข้าหามุมปกติ + ขยับตามเมาส์เล็กน้อย (parallax) ให้ฉากดูมีมิติ
// - ตอนกดเข้าสินค้า: พุ่งเข้าหาเมืองบ้านเกิดบนโลก (โลกจะหมุนให้เมืองนั้นหันมาทางกล้องพร้อมกัน)
type Dive = {
  t0: number;
  from: THREE.Vector3;
  fromLook: THREE.Vector3;
  fromFov: number;
  to: THREE.Vector3;
  lookTo: THREE.Vector3;
};

function Rig({ narrow, diveTo }: { narrow: boolean; diveTo: SceneProps["diveTo"] }) {
  const look = useRef(new THREE.Vector3());
  const dive = useRef<Dive | null>(null);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;

    if (diveTo) {
      if (!dive.current) {
        // คำนวณเส้นทางครั้งเดียวตอนเริ่ม:
        // ทิศจากศูนย์กลางโลกไปยังเมือง = ละติจูดของเมือง + มุมเดียวกับที่กล้องอยู่ (เพราะโลกหมุนเมืองมาหากล้อง)
        const azimuth = Math.atan2(cam.position.x - EARTH_CENTER.x, cam.position.z - EARTH_CENTER.z);
        const lat = THREE.MathUtils.degToRad(diveTo.lat);
        const dir = new THREE.Vector3(
          Math.cos(lat) * Math.sin(azimuth),
          Math.sin(lat),
          Math.cos(lat) * Math.cos(azimuth),
        );
        const surface = EARTH_CENTER.clone().addScaledVector(dir, EARTH_RADIUS);
        dive.current = {
          t0: state.clock.elapsedTime,
          from: cam.position.clone(),
          fromLook: look.current.clone(),
          fromFov: cam.fov,
          to: surface.clone().addScaledVector(dir, 1.6), // หยุดเหนือผิวโลกนิดหน่อย
          lookTo: surface,
        };
      }
      const d = dive.current;
      const t = Math.min((state.clock.elapsedTime - d.t0) / DIVE_SECONDS, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic: เริ่มช้า เร่ง แล้วชะลอ
      cam.position.lerpVectors(d.from, d.to, e);
      look.current.lerpVectors(d.fromLook, d.lookTo, Math.min(1, e * 1.5)); // หันไปมองเมืองก่อนถึง
      cam.fov = d.fromFov + 12 * e; // มุมกว้างขึ้นนิดหน่อย ให้รู้สึกถึงความเร็ว
      cam.updateProjectionMatrix();
      cam.lookAt(look.current);
      return;
    }

    dive.current = null;
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
