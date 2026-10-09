"use client"; // WebGL มีแค่ในเบราว์เซอร์

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { CHAPTERS, DESIGN_CALLOUTS, EXPLODE, EXPLODE_ORDER, FOCUS, STORY_CAR, type PartId } from "@/config/f1";
import { DESIGN_I, FIRST_CHAPTER, sectionProgress, type Motion } from "../motion";
import { blankPose, DESIGN_ASPECT, POSES, POSES_NARROW, sample, type Pose } from "./timeline";

export type SceneProps = {
  motion: RefObject<Motion>;
  narrow: boolean;
  hidden: boolean; // section ที่แสดงอยู่ไม่ใช้ฉาก 3D (หน้าเว็บซ่อนฉากไว้) → หยุดวาด
  onReady: () => void; // โหลดโมเดลครบแล้ว
  onProgress: (percent: number) => void; // ความคืบหน้าการโหลดไฟล์จริง 0–100
};

// ฉาก 3D ของหน้า GRID 26: รถ RB22 ที่แยกเป็น 16 ชิ้น + ไฟสตูดิโอ + เงาบนพื้น
// ท่ากล้องและระยะแยกชิ้นมาจาก timeline.ts ตามตำแหน่งที่เลื่อนจอ
export default function F1Scene(props: SceneProps) {
  const pose = useRef<Pose>(blankPose()); // ท่าปัจจุบัน (Director คำนวณทุกเฟรม ส่วนอื่นอ่านต่อ)
  return (
    // alpha: พื้นหลังโปร่งใส เห็นกระดาษเขียนแบบ (CSS) ด้านหลัง
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [6, 2, 7], fov: 30, near: 0.1, far: 120 }}
      fallback={<NoWebGL onReady={props.onReady} />}
    >
      <Progress onProgress={props.onProgress} />
      <Pause hidden={props.hidden} />
      <Director motion={props.motion} narrow={props.narrow} pose={pose} />
      <Lights />
      <Suspense fallback={null}>
        <Car motion={props.motion} pose={pose} />
        <Ready onReady={props.onReady} />
      </Suspense>
      {/* เงานุ่มๆ ใต้รถ (ไม่ต้องมีพื้นจริง) — ชิ้นที่ลอยสูงเงาจะจางลงเอง */}
      <ContactShadows
        position={[0, -0.03, 0.2]}
        scale={[11, 13]}
        far={3}
        blur={2.6}
        opacity={0.42}
        resolution={props.narrow ? 256 : 512}
        color="#2a2a2a"
      />
    </Canvas>
  );
}

// ส่งความคืบหน้าการโหลดไฟล์ (นับจากไฟล์ที่ three.js โหลดเสร็จจริง) ออกไปให้หน้าโหลด
function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

// เครื่องที่ไม่รองรับ WebGL: บอกว่า "พร้อม" ไม่งั้นหน้าโหลดจะค้าง (ข้อความทั้งหน้ายังอ่านได้)
function NoWebGL({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// ฉากถูกซ่อน (หน้าประวัติ/หน้าวิดีโอ): หยุดวาดหลังฉากจางหายหมดแล้ว ไม่ให้การ์ดจอทำงานเปล่าๆ ระหว่างเล่นวิดีโอ
// กลับมาแสดง: วาดต่อทันที
function Pause({ hidden }: { hidden: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    if (!hidden) {
      setFrameloop("always");
      return;
    }
    const t = setTimeout(() => setFrameloop("never"), 700); // รอให้ฉากจางหายก่อน (CSS 0.5 วินาที)
    return () => clearTimeout(t);
  }, [hidden, setFrameloop]);
  return null;
}

// อยู่ใน Suspense เดียวกับรถ → mount หลังโมเดลโหลดครบเท่านั้น
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// ผู้กำกับ: ทุกเฟรมแปลงตำแหน่งเลื่อนจอเป็นท่า แล้วจัดกล้องตามท่า (priority −1 = ทำก่อน component อื่น)
function Director({ motion, narrow, pose }: { motion: RefObject<Motion>; narrow: boolean; pose: RefObject<Pose> }) {
  const look = useRef({ x: 0, y: 0 }); // ตำแหน่งเมาส์แบบหน่วงให้นุ่ม
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const m = motion.current;
    const p = sample(narrow ? POSES_NARROW : POSES, sectionProgress(m), pose.current);
    look.current.x = THREE.MathUtils.damp(look.current.x, m.pointerX, 2.5, dt);
    look.current.y = THREE.MathUtils.damp(look.current.y, m.pointerY, 2.5, dt);
    const { width: w, height: h } = state.size;
    // จอแคบกว่าที่ออกแบบท่าไว้: ถอยกล้องออก ให้เห็นความกว้างเท่าเดิม (ชิ้นส่วนไม่ล้นขอบจอซ้ายขวา)
    const dist = p.dist * Math.max(1, (narrow ? DESIGN_ASPECT.narrow : DESIGN_ASPECT.wide) / (w / h));
    // กล้องหมุนรอบจุดที่มอง + ขยับตามเมาส์เล็กน้อย (parallax) + ลอยวนช้าๆ ตามเวลา (ท่าที่มี drift)
    const time = state.clock.elapsedTime;
    const az = p.az + look.current.x * 0.06 + p.drift * Math.sin(time * 0.17) * 0.1;
    const el = p.el - look.current.y * 0.035 + p.drift * Math.sin(time * 0.11) * 0.025;
    target.set(p.tx, p.ty, p.tz);
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.set(
      target.x + dist * Math.sin(az) * Math.cos(el),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(az) * Math.cos(el),
    );
    cam.lookAt(target);
    cam.fov = p.fov;
    // เลื่อนภาพทั้งภาพ (ไม่เปลี่ยนมุมมอง) เว้นที่ให้ข้อความ: shift = ไปทางขวา, lift = ขึ้นบน
    cam.setViewOffset(w, h, -p.shift * w, p.lift * h, w, h);
    cam.updateProjectionMatrix();
  }, -1);
  return null;
}

// ไฟสตูดิโอ: ภาพสะท้อนบนสีรถ/คาร์บอนจากแผ่นไฟ (Lightformer) + ไฟหลักจากด้านบน
function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 6]} intensity={1.6} />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#dfe6ff" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.6} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-8, 2, 2]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[8, 2, -2]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={0.9} position={[0, 2, 9]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
      </Environment>
    </>
  );
}

// ---------- ชิ้นส่วนที่ "จาง" เป็นสีเทาอ่อน (ตอนเน้นชิ้นอื่น) ----------
// แทรกโค้ดเล็กๆ ท้าย shader ของวัสดุเดิม: ผสมสีที่คำนวณแสงแล้วกับสีเทาอ่อนตามค่า uGhost (0 = สีจริง, 1 = เทาทั้งชิ้น)
// ยังเห็นแสงเงา/รายละเอียดของชิ้นอยู่ เหมือนโมเดลดินปั้นในภาพเขียนแบบ
function addGhost(material: THREE.Material, ghost: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGhost = ghost;
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", "uniform float uGhost;\nvoid main() {").replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>
      float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.72 + 0.24 * luma), uGhost);`,
    );
  };
  // ทุกวัสดุใช้โค้ดแทรกเดียวกัน → บอก three.js ว่าใช้ shader ชุดเดียวกันได้ (ไม่ต้องสร้างใหม่ทีละวัสดุ)
  material.customProgramCacheKey = () => "f1-ghost";
}

// ข้อมูลของแต่ละชิ้นที่เก็บไว้ใน node.userData: ตำแหน่งตอนประกอบ, ค่าจางของชิ้น, ลำดับตอนแยกชิ้น,
// focus = ลอยออกมาแค่ไหนตอนบทของชิ้นนี้แสดงอยู่ (0–1 ค่อยๆ เปลี่ยน)
type PartData = { base: THREE.Vector3; ghost: { value: number }; order: number; focus: number };

const STAGGER = 0.035; // หน่วงการออกตัวของแต่ละชิ้น (สัดส่วนของช่วงแยกชิ้น)
const SPAN = 1 - STAGGER * (EXPLODE_ORDER.length - 1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const offset = new THREE.Vector3();
const anchor = new THREE.Vector3();

// รถ: เตรียมชิ้นส่วนครั้งเดียว แล้วทุกเฟรมเลื่อนแต่ละชิ้นตามระยะแยกชิ้นของท่า + ทำชิ้นที่ไม่ได้เน้นให้จาง
function Car({ motion, pose }: { motion: RefObject<Motion>; pose: RefObject<Pose> }) {
  const { scene } = useGLTF(STORY_CAR.model);
  const group = useRef<THREE.Group>(null);

  // สำเนาของรถสำหรับหน้านี้ (ไม่แก้ตัวต้นฉบับที่ useGLTF เก็บไว้ในแคช — geometry/texture ยังใช้ร่วมกัน ไม่เปลืองหน่วยความจำ)
  const model = useMemo(() => {
    const root = scene.clone(true);
    for (const node of root.children) {
      const ghost = { value: 0 };
      // ตำแหน่งเดิมของ node (ไฟล์ที่บีบแล้วเก็บตำแหน่ง/ขนาดของชิ้นไว้ที่ node) — ตอนแยกชิ้นจะบวกเพิ่มจากตรงนี้
      const data: PartData = {
        base: node.position.clone(),
        ghost,
        order: Math.max(0, EXPLODE_ORDER.indexOf(node.name as PartId)),
        focus: 0,
      };
      node.userData = data;
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        // วัสดุของแต่ละชิ้นแยกกัน (ชิ้นอื่นที่ใช้วัสดุเดียวกันจะได้ไม่จางตาม)
        mesh.material = (mesh.material as THREE.Material).clone();
        addGhost(mesh.material, ghost);
      });
    }
    return root;
  }, [scene]);

  useFrame((state, dt) => {
    const car = group.current?.children[0]; // = model (เข้าถึงผ่าน ref ทุกเฟรม)
    if (!car) return;
    const p = pose.current;
    const t = sectionProgress(motion.current);
    // บทที่กำลังแสดง → ชิ้นที่เน้น (บทอื่น/หน้าแรก/ประกอบกลับ = ไม่จางเลย)
    const focus = CHAPTERS[Math.round(t) - FIRST_CHAPTER]?.parts;
    for (const node of car.children) {
      const part = node.userData as PartData;
      const name = node.name as PartId;
      // ชิ้นที่ order น้อย (ชิ้นนอก) ออกก่อน — ตอนประกอบกลับ ค่า ex ลดลง ชิ้นนอกจึงกลับเข้าที่หลังสุด
      const local = Math.min(1, Math.max(0, (p.ex - part.order * STAGGER) / SPAN));
      const e = easeInOut(local);
      const dir = EXPLODE[name] ?? [0, 0, 0];
      // บทของชิ้นนี้: ลอยออกมาหน้าชิ้นอื่น (FOCUS) / บทอื่น: กลับที่เดิม แล้วจางเป็นสีเทา
      const on = focus?.includes(name) ?? false;
      part.focus = THREE.MathUtils.damp(part.focus, on ? 1 : 0, 3.5, dt);
      const f = easeInOut(part.focus);
      const pop = FOCUS[name] ?? [0, 0, 0];
      node.position.copy(part.base).add(offset.set(dir[0] * e + pop[0] * f, dir[1] * e + pop[1] * f, dir[2] * e + pop[2] * f));
      part.ghost.value = THREE.MathUtils.damp(part.ghost.value, focus && !on ? 0.9 : 0, 5, dt);
    }
    // หน้าแรก: รถส่ายไปมาช้าๆ เหมือนวางบนแท่นหมุน (เลื่อนออกจากหน้าแรกแล้วค่อยๆ หยุด)
    const hero = Math.max(0, 1 - t);
    car.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.14 * hero;

    // หน้าความสวย: แปลงจุดบนตัวรถที่ป้ายชี้ไป เป็นตำแหน่งบนจอ แล้วส่งกลับไปให้หน้าเว็บวาดเส้น/กล่องข้อความตาม
    const out = motion.current.anchors;
    const near = Math.abs(t - DESIGN_I) < 0.5;
    const { width: w, height: h } = state.size;
    car.updateWorldMatrix(true, false);
    state.camera.updateMatrixWorld(); // กล้องเพิ่งขยับในเฟรมนี้ (Director) → อัปเดตก่อนคำนวณ ไม่ให้ป้ายตามหลังรถ 1 เฟรม
    DESIGN_CALLOUTS.forEach((c, i) => {
      anchor.set(...c.anchor).applyMatrix4(car.matrixWorld).project(state.camera);
      out[i * 3] = (anchor.x * 0.5 + 0.5) * w;
      out[i * 3 + 1] = (-anchor.y * 0.5 + 0.5) * h;
      out[i * 3 + 2] = near && anchor.z < 1 ? 1 : 0; // z ≥ 1 = จุดอยู่หลังกล้อง
    });
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

// เริ่มโหลดไฟล์รถทันทีที่เปิดไฟล์นี้ (ระหว่างที่ React ยังเตรียมฉาก)
useGLTF.preload(STORY_CAR.model);
