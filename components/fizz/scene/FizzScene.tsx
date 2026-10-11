"use client"; // WebGL มีแค่ในเบราว์เซอร์

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { products } from "@/config/products";
import { CANS, mod, sectionProgress, type Motion } from "../motion";
import Bubbles from "./Bubbles";
import { blankPose, JUMPS, JUMPS_NARROW, POSES, POSES_NARROW, sample, type Pose } from "./timeline";

const brands = products.find((p) => p.slug === "drink")!.variants;

const CAN_H = 3.6; // ความสูงกระป๋องในฉาก (หน่วย)
const GAP = 3.1; // ระยะห่างระหว่างกระป๋องในแถว (ก่อนคูณ spacing ของท่า)
const FACE = -0.35; // หมุนกระป๋องให้โลโก้หันหากล้อง (โมเดลต้นฉบับหันโลโก้เยื้องไปนิดหน่อย)
const FALL = 1.5; // วินาทีที่กระป๋อง 1 ใบใช้ร่วงลงมา (ฉากเปิด)

export type SceneProps = {
  motion: RefObject<Motion>;
  narrow: boolean;
  onReady: () => void; // โหลดโมเดลครบแล้ว
  onProgress: (percent: number) => void; // ความคืบหน้าการโหลดไฟล์จริง 0–100
  onPick: (can: number) => void; // คลิกกระป๋องใบที่ can (0–11)
  onHover: (over: boolean) => void;
};

// ฉาก 3D ของหน้า FIZZ: กระป๋อง 12 ใบ + แสง — ท่าของกล้อง/กระป๋องมาจาก timeline.ts ตามตำแหน่งที่เลื่อนจอ
export default function FizzScene(props: SceneProps) {
  // ท่าปัจจุบัน (คำนวณใหม่ทุกเฟรมใน Director แล้วส่วนอื่นอ่านต่อ) เก็บใน ref เพราะแก้ค่าทุกเฟรม
  const pose = useRef<Pose>(blankPose());
  return (
    // alpha: พื้นหลังโปร่งใส เห็นสีพื้นหลัง CSS ของยี่ห้อด้านหลัง
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 29], fov: 20, near: 0.1, far: 200 }}
      fallback={<NoWebGL onReady={props.onReady} />}
    >
      <Progress onProgress={props.onProgress} />
      <Director motion={props.motion} narrow={props.narrow} pose={pose} />
      <Lights pose={pose} />
      <Bubbles motion={props.motion} pose={pose} narrow={props.narrow} />
      <Suspense fallback={null}>
        <Cans {...props} pose={pose} />
        <Ready onReady={props.onReady} />
      </Suspense>
    </Canvas>
  );
}

// ส่งความคืบหน้าการโหลดไฟล์ (นับจากไฟล์ที่ three.js โหลดเสร็จจริง) ออกไปให้หน้าโหลด
function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

// เครื่องที่ไม่รองรับ WebGL: ไม่มีฉาก 3D แต่ต้องบอกว่า "พร้อม" ไม่งั้นหน้าโหลดจะค้าง (ข้อความทั้งหน้ายังใช้ได้)
function NoWebGL({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// อยู่ใน Suspense เดียวกับกระป๋อง → mount หลังโมเดลโหลดครบเท่านั้น
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// ผู้กำกับ: ทุกเฟรมแปลงตำแหน่งเลื่อนจอเป็นท่า แล้วจัดกล้องตามท่า (priority −1 = ทำก่อน component อื่น)
function Director({ motion, narrow, pose }: { motion: RefObject<Motion>; narrow: boolean; pose: RefObject<Pose> }) {
  const look = useRef({ x: 0, y: 0 }); // ตำแหน่งเมาส์แบบหน่วงให้นุ่ม
  useFrame((state, dt) => {
    const m = motion.current;
    const p = sample(narrow ? POSES_NARROW : POSES, narrow ? JUMPS_NARROW : JUMPS, sectionProgress(m), pose.current);
    look.current.x = THREE.MathUtils.damp(look.current.x, m.pointerX, 3, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, m.pointerY, 3, dt);
    const cam = state.camera as THREE.PerspectiveCamera;
    // กล้องขยับตามเมาส์เล็กน้อย (parallax) ตามน้ำหนัก pointer ของท่า
    cam.position.set(p.camX + look.current.x * 0.4 * p.pointer, p.camY - look.current.y * 0.25 * p.pointer, p.camZ);
    cam.rotation.set(p.camRX, p.camRY, p.camRZ);
    cam.fov = p.fov;
    cam.updateProjectionMatrix();
  }, -1);
  return null;
}

// แสง: สตูดิโอ (ภาพสะท้อนบนโลหะจาก Environment + ไฟหลัก) กับสปอตไลต์แคบๆ ที่ไล่ส่องฉลาก
function Lights({ pose }: { pose: RefObject<Pose> }) {
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  useFrame(({ scene }) => {
    const p = pose.current;
    // ภาพสะท้อนรอบตัวหรี่ลงในฉากสปอตไลต์ ให้กระป๋องมืดแล้วเห็นเฉพาะจุดที่ถูกส่อง
    scene.environmentIntensity = 0.12 + 0.9 * p.key;
    if (key.current) key.current.intensity = 2.2 * p.key;
    if (fill.current) fill.current.intensity = 0.7 * p.key;
    const s = spot.current;
    if (s) {
      // ส่องจากด้านหน้าเยื้องซ้ายบน ไปยังจุดบนกระป๋องหน้าสุด (จุดเลื่อนตาม spotY = ไล่สแกนฉลาก)
      s.intensity = 520 * p.spot;
      s.position.set(p.canX - 1.2, p.canY + p.spotY + 1.6, 7);
      s.target.position.set(p.canX, p.canY + p.spotY, 0);
      s.target.updateMatrixWorld();
    }
  });
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight ref={key} position={[4, 6, 8]} />
      <directionalLight ref={fill} position={[-6, 1, 4]} color="#cfe0ff" />
      <spotLight ref={spot} angle={0.16} penumbra={1} decay={2} distance={0} color="#ffffff" />
      {/* Environment = ภาพรอบตัวสำหรับแสงสะท้อนบนโลหะ สร้างจากแผ่นไฟ (Lightformer) เหมือนซอฟต์บ็อกซ์ในสตูดิโอ */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-7, 1, 2]} rotation-y={Math.PI / 2} scale={[1.5, 8, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[7, 1, 2]} rotation-y={-Math.PI / 2} scale={[1.5, 8, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[0, -5, 3]} rotation-x={-Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>
    </>
  );
}

// ระยะจากกระป๋องใบที่ i ถึงตำแหน่งหน้าสุด (หน่วย = กระป๋อง) วนรอบได้: −6 … 6
const offset = (i: number, pos: number) => mod(i - pos + CANS / 2, CANS) - CANS / 2;
const easeOutBack = (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

// กระป๋อง 12 ใบ (6 ยี่ห้อ × 2) — ทุกเฟรมจัดตำแหน่ง/มุมตามท่า + ตำแหน่งวงกระป๋อง (ยี่ห้อที่เลือก)
function Cans({ motion, pose, onPick, onHover }: SceneProps & { pose: RefObject<Pose> }) {
  const gltfs = useGLTF(brands.map((b) => b.model));
  // เตรียมโมเดล: จัดให้จุดกึ่งกลางอยู่ที่ (0,0,0) และสูงเท่ากันทุกใบ แล้วโคลนเป็น 12 ใบ (ใช้ geometry/texture ร่วมกัน)
  const models = useMemo(
    () =>
      Array.from({ length: CANS }, (_, i) => {
        const src = gltfs[i % brands.length].scene;
        const box = new THREE.Box3().setFromObject(src);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // ครอบด้วย group ที่ย่อ/ขยายและเลื่อน แทนการแก้ตัวโมเดลเอง (โมเดลบางไฟล์มีการหมุน/ย่อที่ราก)
        const fit = new THREE.Group();
        const k = CAN_H / size.y;
        fit.scale.setScalar(k);
        fit.position.copy(center).multiplyScalar(-k);
        fit.add(src.clone(true));
        return fit;
      }),
    [gltfs],
  );
  const outer = useRef<(THREE.Group | null)[]>([]); // ตำแหน่ง + เอียง
  const inner = useRef<(THREE.Group | null)[]>([]); // หมุนรอบแกนกระป๋อง
  const pos = useRef<number | null>(null); // ตำแหน่งวงกระป๋องที่แสดงอยู่ (ไล่ตาม motion.goal)

  useFrame((state, dt) => {
    const m = motion.current;
    const p = pose.current;
    pos.current =
      pos.current === null ? m.goal : THREE.MathUtils.damp(pos.current, m.goal, m.dragging ? 18 : 5, dt);
    const now = performance.now();
    for (let i = 0; i < CANS; i++) {
      const o = outer.current[i];
      const n = inner.current[i];
      if (!o || !n) continue;
      const d = offset(i, pos.current);
      const ad = Math.abs(d);
      const front = Math.max(0, 1 - ad); // 1 = ใบหน้าสุด
      const x = p.canX + d * GAP * p.spacing;

      // ฉากเปิด: ใบที่อยู่ใกล้กลางร่วงลงมาก่อน ใบข้างๆ ตามมาทีละใบ (ก่อนเริ่ม = ซ่อนอยู่บนฟ้า)
      let drop = 16;
      if (m.introAt !== null) {
        const t = (now - m.introAt) / 1000 - ad * 0.09;
        drop = t <= 0 ? 16 : t >= FALL ? 0 : 16 * (1 - easeOutBack(t / FALL));
      }

      // แถวโค้ง (wave): ซ้ายต่ำ-ขวาสูงเป็นคลื่น ใบด้านข้างถอยไปด้านหลัง
      // เกลียว (swirl): เรียงทแยงขึ้นไปทางขวา แต่ละใบบิดต่างกันเล็กน้อย
      const y = p.canY + Math.sin(x * 0.2) * 1.1 * p.wave + d * 0.55 * p.swirl;
      const z = p.canZ * front - ad * 1.4 * p.wave - ad * 0.35 * p.swirl;
      o.position.set(x, y + p.fall + drop, z);
      o.rotation.set(
        p.canRX * front - 0.16 * p.wave * (1 - front) + (d * 0.07 + 0.25) * p.swirl,
        0,
        p.canRZ * front + 0.18 * p.wave * (1 - front) - 0.45 * p.swirl,
      );
      // หมุนรอบแกนกระป๋อง: หันโลโก้เข้ากล้อง + ท่าโชว์ด้านหลัง (spin) + หันตามเมาส์ + ใบข้างๆ เอียงเข้าหากลาง
      n.rotation.y =
        FACE +
        p.canRY * front +
        p.spin * front -
        d * 0.25 * p.wave +
        m.pointerX * 0.35 * p.pointer * front +
        Math.sin(state.clock.elapsedTime * 0.6 + i) * 0.05;
      const s = 1 + (p.scale - 1) * front;
      o.scale.setScalar(s);
    }
  });

  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 8) return; // ลากไปไกล = กำลังหมุนวง ไม่ใช่คลิก
    onPick(i);
  };

  return models.map((model, i) => (
    <group
      key={i}
      ref={(el) => {
        outer.current[i] = el;
      }}
      onClick={click(i)}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <group
        ref={(el) => {
          inner.current[i] = el;
        }}
      >
        <primitive object={model} />
      </group>
    </group>
  ));
}

// โหลดไฟล์กระป๋องทั้ง 6 ยี่ห้อล่วงหน้าตั้งแต่เปิดไฟล์นี้ (ระหว่างที่ React ยังเตรียมฉาก)
brands.forEach((b) => useGLTF.preload(b.model));
