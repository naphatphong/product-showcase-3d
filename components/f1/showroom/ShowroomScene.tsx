"use client"; // WebGL มีแค่ในเบราว์เซอร์

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { CHAPTERS, EXPLODE, EXPLODE_ORDER, SHOWROOM_CARS, SHOWROOM_OPEN, type PartId } from "@/config/f1";
import { addTint, createTint, type Tint } from "../scene/tint";
import Garage, { CEILING, FRONT_Z, HALF_W, WALL_Z } from "./Garage";

// สิ่งที่หน้าเว็บเลือกอยู่ (ส่งลงมาจาก Showroom.tsx)
export type ShowroomView = {
  focus: number | null; // คันที่เลือก (null = มองรวมทั้งอู่)
  hover: number | null; // คันที่เมาส์ชี้อยู่ตอนมองรวม (ไฟสปอตไลท์คันนั้นสว่างขึ้น)
  exploded: boolean; // กดแยกชิ้นทั้งคันอยู่
  chapter: number | null; // ระบบที่กดดูอยู่ (ลำดับใน CHAPTERS) เช่น ปีกหน้า, ล้อ
};

type Props = ShowroomView & {
  narrow: boolean;
  cars: { name: string; accent: string }[];
  onHoverCar: (i: number | null) => void;
  onPickCar: (i: number) => void;
  onPickPart: (chapter: number | null) => void; // กดชิ้นส่วน → ระบบที่ชิ้นนั้นอยู่ (กดซ้ำ = ปิด)
  onHoverPart: (chapter: number | null) => void;
  onReady: () => void;
  onProgress: (percent: number) => void;
};

const deg = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const chapterOf = (part: unknown) => CHAPTERS.findIndex((c) => c.parts.includes(part as PartId));
const setCursor = (on: boolean) => {
  document.body.style.cursor = on ? "pointer" : "";
};

// ฉาก 3D ของหน้าโชว์รูม: อู่รถแข่ง + รถ 3 คันจอดเฉียงๆ + สปอตไลท์เหนือรถแต่ละคัน
// เลือกคันไหน → กล้องค่อยๆ เคลื่อนโค้งไปหาคันนั้น ไฟคันนั้นสว่าง คันอื่นมืดลง แล้วลากหมุนดูรอบคันได้
export default function ShowroomScene(props: Props) {
  const hoverPart = useRef<{ car: number; chapter: number } | null>(null); // ระบบที่เมาส์ชี้อยู่ (ขอบเรืองแสง)
  useEffect(() => () => setCursor(false), []);
  return (
    <Canvas
      dpr={props.narrow ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true }}
      camera={{ position: [4, 4, 18], fov: 32, near: 0.1, far: 80 }}
      fallback={<NoWebGL onReady={props.onReady} />}
    >
      <color attach="background" args={["#0c0d0f"]} />
      <fog attach="fog" args={["#0c0d0f", 24, 52]} />
      <Progress onProgress={props.onProgress} />
      <Rig {...props} />
      <Lights {...props} />
      <Garage narrow={props.narrow} />
      <Suspense fallback={null}>
        {SHOWROOM_CARS.map((_, i) => (
          <Car key={i} index={i} hoverPart={hoverPart} {...props} />
        ))}
        {/* เงานุ่มๆ ใต้รถทั้ง 3 คัน (ชิ้นที่ลอยสูงตอนแยกชิ้น เงาจะจางลงเอง) */}
        <ContactShadows
          position={[0.2, 0.004, -0.2]}
          scale={[20, 13]}
          far={2.4}
          blur={2.2}
          opacity={0.8}
          resolution={props.narrow ? 512 : 1024}
          color="#000000"
        />
        <Ready onReady={props.onReady} />
      </Suspense>
      <Pickers {...props} />
      {props.focus === null && <Tags {...props} />}
    </Canvas>
  );
}

function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  const progress = useProgress((s) => s.progress);
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

function NoWebGL({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// ---------- กล้อง ----------
// ท่ากล้อง: หมุนรอบจุดที่มอง (tx, ty, tz) แบบลูกโลก — az = มุมรอบแกนตั้ง (0 = มองจากด้านหน้าอู่), el = มุมเงย, dist = ระยะ
// shift = เลื่อนภาพไปทางขวา / lift = เลื่อนภาพขึ้น (สัดส่วนจอ) เว้นที่ให้แผงข้อความ
type Cam = {
  tx: number;
  ty: number;
  tz: number;
  az: number;
  el: number;
  dist: number;
  fov: number;
  shift: number;
  lift: number;
};

const OVERVIEW: Cam = {
  tx: 0.2,
  ty: 0.45,
  tz: -0.4,
  az: 0.16,
  el: 0.2,
  dist: 16.5,
  fov: 32,
  shift: 0.02,
  lift: -0.04,
};
// มือถือ (จอตั้ง): มองจากมุมเฉียงสูงกว่า รถ 3 คันซ้อนเป็นแนวลึก ไม่ต้องถอยกล้องไกลมาก
const OVERVIEW_NARROW: Cam = {
  tx: 0.2,
  ty: 0.5,
  tz: -0.4,
  az: 0.62,
  el: 0.36,
  dist: 27,
  fov: 40,
  shift: 0,
  lift: 0.06,
};

// ท่ากล้องตอนเลือกรถคันที่ i: มุม view ของคันนั้น (เฉียงหน้า-ข้าง, config/f1.ts) / แยกชิ้นแล้ว = ถอยออกให้เห็นทุกชิ้น
// มือถือ: เปิดดูชิ้นส่วนอยู่ (inspecting) แผงข้อความด้านล่างสูงขึ้น และหัวเรื่องซ่อน → เลื่อนรถขึ้นไปครึ่งบนของจอ
function carCam(i: number, narrow: boolean, open: number, inspecting: boolean): Cam {
  const c = SHOWROOM_CARS[i];
  const az = c.view * deg;
  return narrow
    ? {
        tx: c.x,
        ty: 0.6 + 0.6 * open,
        tz: c.z,
        az,
        el: 0.26,
        dist: 16.5 + 7 * open,
        fov: 40,
        shift: 0,
        lift: inspecting ? 0.2 : 0,
      }
    : {
        tx: c.x,
        ty: 0.5 + 0.6 * open,
        tz: c.z,
        az,
        el: 0.2,
        dist: 10.6 + 3.6 * open,
        fov: 30,
        shift: -0.13,
        lift: -0.04,
      };
}

// กล้องอยู่ในห้องเสมอ: หมุนไปด้านหลังรถ (ทางผนัง) หรือมองจากด้านบน กล้องจะขยับเข้าใกล้รถแทนการทะลุผนัง/เพดาน
// คืนระยะไกลสุดจากจุดที่มอง (from) ไปตามทิศ d ก่อนชนผนังหลัง ผนังข้าง หรือเพดาน (เว้นห่างไว้นิดหนึ่ง)
// ด้านหน้าอู่เปิดโล่งไปทาง pit lane: ผนังข้าง/เพดานมีแค่ถึง FRONT_Z กล้องที่ออกไปหน้าอู่แล้วจึงถอยได้ไกลเท่าที่ต้องการ
const GAP = 0.4;
const camDir = new THREE.Vector3();
function roomReach(from: THREE.Vector3, d: THREE.Vector3) {
  let reach = Infinity;
  const inside = (t: number) => {
    if (t > 0 && from.z + d.z * t < FRONT_Z) reach = Math.min(reach, t);
  };
  if (d.z < -1e-4) reach = Math.min(reach, (WALL_Z + GAP - from.z) / d.z);
  if (Math.abs(d.x) > 1e-4) inside((Math.sign(d.x) * (HALF_W - GAP) - from.x) / d.x);
  if (d.y > 1e-4) inside((CEILING - GAP - from.y) / d.y);
  return Math.max(2.5, reach);
}

// ผู้กำกับกล้อง: ทุกเฟรมจัดกล้องตามท่าเป้าหมาย + มุมที่ผู้ใช้ลากหมุน
// เปลี่ยนคันที่เลือก → เคลื่อนช้าๆ 3 วินาที เป็นเส้นโค้ง (ถอยออกนิดหนึ่งกลางทาง แล้วร่อนเข้าหารถ) แบบกล้องถ่ายโฆษณารถ
function Rig({ focus, exploded, chapter, narrow }: Props) {
  const gl = useThree((s) => s.gl);
  const now = useRef<Cam | null>(null); // ท่าที่กล้องอยู่จริงตอนนี้
  const user = useRef({ az: 0, el: 0, zoom: 1 }); // ลากหมุน/ซูมเพิ่มจากท่าของคันที่เลือก
  const glide = useRef<{ from: Cam; t: number; dur: number } | null>(null);
  const focusRef = useRef(focus);
  const target = useMemo(() => new THREE.Vector3(), []);

  // เปลี่ยนคันที่เลือก (หรือกลับไปมองรวม): เริ่มเคลื่อนกล้องจากท่าปัจจุบัน และล้างมุมที่ลากหมุนไว้
  useEffect(() => {
    focusRef.current = focus;
    if (now.current)
      glide.current = {
        from: { ...now.current },
        t: 0,
        dur: focus === null ? 2.4 : 3.2,
      };
    user.current = { az: 0, el: 0, zoom: 1 };
  }, [focus]);

  // ลากหมุนรอบคัน (นิ้วเดียว/เมาส์) + ซูม (ล้อเมาส์ / หนีบ 2 นิ้ว) — ใช้ได้ตอนเลือกรถอยู่เท่านั้น
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch = spread();
    };
    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p || focusRef.current === null) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      const u = user.current;
      if (pts.size === 2) {
        const d = spread();
        if (pinch > 0) u.zoom = clamp(u.zoom * (pinch / d), 0.6, 1.7);
        pinch = d;
      } else {
        u.az -= dx * 0.0065;
        u.el = clamp(u.el + dy * 0.0045, -0.17, 1.0); // มองได้ตั้งแต่ระดับพื้นจนถึงมุมสูงจากด้านบน
      }
    };
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (focusRef.current === null) return;
      e.preventDefault();
      user.current.zoom = clamp(user.current.zoom * Math.exp(e.deltaY * 0.0012), 0.6, 1.7);
    };
    el.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", onUp);
    addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const open = exploded ? 1 : chapter !== null ? SHOWROOM_OPEN : 0;
    const base = focus === null ? (narrow ? OVERVIEW_NARROW : OVERVIEW) : carCam(focus, narrow, open, chapter !== null);
    const u = user.current;
    const goal: Cam = {
      ...base,
      az: base.az + u.az + (focus === null ? Math.sin(state.clock.elapsedTime * 0.12) * 0.04 : 0), // มองรวม: ลอยวนช้าๆ
      el: clamp(base.el + u.el, 0.03, 1.2),
      dist: base.dist * u.zoom,
    };
    if (!now.current) now.current = { ...goal };
    const c = now.current;
    const g = glide.current;
    if (g) {
      g.t = Math.min(1, g.t + dt / g.dur);
      const k = easeInOut(g.t);
      const arc = Math.sin(Math.PI * k); // 0 → 1 (กลางทาง) → 0
      // หมุนไปทางที่ใกล้กว่า (ไม่หมุนอ้อมเกินครึ่งรอบ)
      const daz = Math.atan2(Math.sin(goal.az - g.from.az), Math.cos(goal.az - g.from.az));
      for (const key of ["tx", "ty", "tz", "el", "dist", "fov", "shift", "lift"] as const)
        c[key] = g.from[key] + (goal[key] - g.from[key]) * k;
      c.az = g.from.az + daz * k;
      c.dist += arc * 2.4;
      c.el += arc * 0.08;
      if (g.t >= 1) {
        glide.current = null;
        Object.assign(c, goal);
      }
    } else {
      for (const key of ["tx", "ty", "tz", "az", "el", "dist", "fov", "shift", "lift"] as const)
        c[key] = damp(c[key], goal[key], 4, dt);
    }

    const { width: w, height: h } = state.size;
    target.set(c.tx, c.ty, c.tz);
    const cam = state.camera as THREE.PerspectiveCamera;
    camDir.set(Math.sin(c.az) * Math.cos(c.el), Math.sin(c.el), Math.cos(c.az) * Math.cos(c.el));
    cam.position.copy(target).addScaledVector(camDir, Math.min(c.dist, roomReach(target, camDir)));
    cam.lookAt(target);
    cam.fov = c.fov;
    cam.setViewOffset(w, h, -c.shift * w, c.lift * h, w, h);
    cam.updateProjectionMatrix();
  }, -1);
  return null;
}

// ---------- ไฟ ----------
// ไฟรวมของอู่ (ไฟเพดาน) + สปอตไลท์เหนือรถทุกคัน: มองรวม = สว่างกลางๆ (คันที่ชี้อยู่สว่างเต็ม)
// เลือกคันไหน = คันนั้นสว่างเต็ม คันอื่นและไฟเพดานหรี่ลง รถคันที่เลือกเลยเด่นขึ้นมา
function Lights({ focus, hover }: Props) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const room = useRef(1);
  useFrame((state, dt) => {
    room.current = damp(room.current, focus === null ? 1 : 0.5, 2, dt);
    state.scene.environmentIntensity = 0.95 * room.current;
    if (ambient.current) ambient.current.intensity = 0.45 * room.current;
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.45} color="#cfd6e4" />
      <hemisphereLight args={["#dfe6f2", "#16171a", 0.5]} />
      {/* ภาพสะท้อนบนสีรถ: แผงไฟเพดานยาวๆ + แสงจากทาง pit lane ด้านหน้า */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, -3]} rotation-x={Math.PI / 2} scale={[22, 0.6, 1]} />
        <Lightformer form="rect" intensity={3} position={[0, 6, 1.2]} rotation-x={Math.PI / 2} scale={[22, 0.6, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2.5, 14]} scale={[24, 4, 1]} color="#cfdcff" />
        <Lightformer form="rect" intensity={0.6} position={[-14, 3, 0]} rotation-y={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[14, 3, 0]} rotation-y={-Math.PI / 2} scale={[10, 4, 1]} />
      </Environment>
      {SHOWROOM_CARS.map((_, i) => (
        <CarLight key={i} index={i} level={focus === null ? (hover === i ? 1 : 0.75) : focus === i ? 1 : 0.12} />
      ))}
    </>
  );
}

// ลำแสงที่มองเห็นได้ (เหมือนแสงส่องผ่านฝุ่นในอู่): กรวยโปร่งแสง สว่างตรงกลาง จางที่ขอบและจางลงเมื่อใกล้พื้น
const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  float along = 1.0 - vUv.y; // 0 = ที่โคมไฟ, 1 = ที่พื้น
  float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
  float a = uOpacity * pow(facing, 1.8) * smoothstep(0.0, 0.2, along) * (1.0 - 0.7 * along);
  gl_FragColor = vec4(uColor * a, 1.0);
}`;

const LAMP_Y = 5.7;
const ANGLE = 0.44;

// สปอตไลท์ 1 ดวงเหนือรถคันที่ index: โคมไฟ + แสงจริง (ส่องรถและพื้น) + ลำแสงที่มองเห็น
// level = ความสว่างเป้าหมาย 0–1 ค่อยๆ เปลี่ยน (หรี่/สว่างขึ้นนุ่มๆ ไม่กระพริบ)
function CarLight({ index, level }: { index: number; level: number }) {
  const c = SHOWROOM_CARS[index];
  const light = useRef<THREE.SpotLight>(null);
  const lamp = useRef<THREE.MeshBasicMaterial>(null);
  const beam = useRef<THREE.ShaderMaterial>(null);
  const now = useRef(level);
  // โคมอยู่สูงเหนือรถ เยื้องมาทางหน้าอู่เล็กน้อย ส่องลงกลางคัน
  const rig = useMemo(() => {
    const from = new THREE.Vector3(c.x + 0.5, LAMP_Y, c.z + 1.4);
    const to = new THREE.Vector3(c.x, 0, c.z);
    const target = new THREE.Object3D();
    target.position.copy(to);
    const dir = to.clone().sub(from);
    const h = dir.length();
    const beam = new THREE.ConeGeometry(h * Math.tan(ANGLE) * 0.92, h, 48, 1, true);
    beam.translate(0, -h / 2, 0); // ปลายกรวยอยู่ที่โคมไฟ
    const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    const uniforms = {
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color("#fff3e0") },
    };
    return { from, target, beam, turn, uniforms };
  }, [c.x, c.z]);

  useFrame((_, dt) => {
    now.current = damp(now.current, level, 2.2, dt);
    const v = now.current;
    if (light.current) light.current.intensity = 190 * v;
    if (beam.current) beam.current.uniforms.uOpacity.value = 0.17 * v * v;
    lamp.current?.color.setScalar(0.15 + 0.85 * v);
  });

  return (
    <group>
      <primitive object={rig.target} />
      <spotLight
        ref={light}
        position={rig.from}
        target={rig.target}
        angle={ANGLE}
        penumbra={0.8}
        decay={2}
        color="#fff3e0"
      />
      <group position={rig.from} quaternion={rig.turn}>
        <mesh geometry={rig.beam}>
          <shaderMaterial
            ref={beam}
            vertexShader={BEAM_VERT}
            fragmentShader={BEAM_FRAG}
            uniforms={rig.uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* โคมไฟ: กระบอกสีดำ + หน้าโคมเรืองแสง */}
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.2, 0.26, 0.36, 24]} />
          <meshStandardMaterial color="#141416" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.025, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.24, 24]} />
          <meshBasicMaterial ref={lamp} color="#fff3e0" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ---------- รถ ----------
// ข้อมูลของแต่ละชิ้นใน node.userData: ตำแหน่งตอนประกอบ, สีจาง/ขอบเรือง (tint.ts), ระยะแยกชิ้นตอนนี้, ลำดับตอนแยกชิ้น
type PartData = { base: THREE.Vector3; tint: Tint; ex: number; order: number };
const offset = new THREE.Vector3();

function Car({
  index,
  hoverPart,
  focus,
  exploded,
  chapter,
  onPickPart,
  onHoverPart,
}: Props & {
  index: number;
  hoverPart: RefObject<{ car: number; chapter: number } | null>;
}) {
  const c = SHOWROOM_CARS[index];
  const { scene } = useGLTF(c.model);
  const pickable = useRef(false); // กดชิ้นส่วนได้เฉพาะคันที่เลือกอยู่

  // สำเนาของรถ (ไม่แก้ตัวต้นฉบับในแคชของ useGLTF): วัสดุแยกทีละชิ้น ชิ้นอื่นจะได้ไม่จาง/เรืองตาม
  const model = useMemo(() => {
    const root = scene.clone(true);
    for (const node of root.children) {
      const tint = createTint();
      const data: PartData = {
        base: node.position.clone(),
        tint,
        ex: 0,
        order: Math.max(0, EXPLODE_ORDER.indexOf(node.name as PartId)),
      };
      node.userData = data;
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = (mesh.material as THREE.Material).clone();
        addTint(mesh.material, tint);
        mesh.userData.part = node.name;
        // หาชิ้นที่เมาส์ชี้ (raycast) เฉพาะคันที่เลือกอยู่: รถคันละ ~270,000 สามเหลี่ยม เช็คทุกคันทุกครั้งที่ขยับเมาส์จะหน่วง
        const raycast = mesh.raycast;
        mesh.raycast = function (this: THREE.Mesh, rc, hits) {
          if (pickable.current) raycast.call(this, rc, hits);
        };
      });
    }
    return root;
  }, [scene]);

  useEffect(() => {
    pickable.current = focus === index;
  }, [focus, index]);

  useFrame((_, dt) => {
    const mine = focus === index;
    const picked = mine && chapter !== null ? CHAPTERS[chapter].parts : null;
    const open = mine ? (exploded ? 1 : picked ? SHOWROOM_OPEN : 0) : 0;
    const hot = hoverPart.current?.car === index ? hoverPart.current.chapter : -1;
    for (const node of model.children) {
      const d = node.userData as PartData;
      const name = node.name as PartId;
      // ชิ้นนอก (order น้อย) ขยับเร็วกว่าชิ้นใน → ชิ้นส่วนแยก/ประกอบไล่กันเป็นจังหวะ
      d.ex = damp(d.ex, open, 3.4 - d.order * 0.13, dt);
      const dir = EXPLODE[name] ?? [0, 0, 0];
      node.position.copy(d.base).add(offset.set(dir[0] * d.ex, dir[1] * d.ex, dir[2] * d.ex));
      d.tint.ghost.value = damp(d.tint.ghost.value, picked && !picked.includes(name) ? 0.82 : 0, 5, dt);
      const glow = hot >= 0 && CHAPTERS[hot].parts.includes(name) ? 1 : 0;
      d.tint.glow.value = damp(d.tint.glow.value, glow, 10, dt);
    }
  });

  // ชี้/กดชิ้นส่วน (เฉพาะคันที่เลือกอยู่): ชี้ = ทั้งระบบเรืองแสง, กด = เปิดรายละเอียดของระบบนั้น
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (focus !== index) return;
    e.stopPropagation();
    const ch = chapterOf(e.object.userData.part);
    if ((hoverPart.current?.chapter ?? -1) === ch) return;
    hoverPart.current = ch >= 0 ? { car: index, chapter: ch } : null;
    onHoverPart(ch >= 0 ? ch : null);
    setCursor(ch >= 0);
  };
  const onOut = () => {
    if (hoverPart.current?.car !== index) return;
    hoverPart.current = null;
    onHoverPart(null);
    setCursor(false);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (focus !== index || e.delta > 6) return; // ลากหมุนกล้องอยู่ ไม่นับเป็นการกด
    e.stopPropagation();
    const ch = chapterOf(e.object.userData.part);
    if (ch >= 0) onPickPart(ch === chapter ? null : ch);
  };

  return (
    <group
      position={[c.x, 0, c.z]}
      rotation-y={c.rot * deg}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <primitive object={model} />
    </group>
  );
}

// กล่องล่องหนครอบรถแต่ละคัน: ชี้/กดเพื่อเลือกคัน (ถูกกว่าเช็คทุกสามเหลี่ยมของรถ) — คันที่เลือกอยู่ไม่มีกล่อง จะได้กดชิ้นส่วนได้
function Pickers({ focus, onHoverCar, onPickCar }: Props) {
  return (
    <group>
      {SHOWROOM_CARS.map((c, i) =>
        i === focus ? null : (
          <mesh
            key={i}
            position={[c.x, 0.65, c.z]}
            rotation-y={c.rot * deg}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverCar(i);
              setCursor(true);
            }}
            onPointerOut={() => {
              onHoverCar(null);
              setCursor(false);
            }}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              setCursor(false);
              onPickCar(i);
            }}
          >
            <boxGeometry args={[2.1, 1.3, 5.7]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ),
      )}
    </group>
  );
}

// ป้ายชื่อลอยเหนือรถแต่ละคัน (ตอนมองรวมทั้งอู่)
function Tags({ hover, cars }: Props) {
  return (
    <>
      {SHOWROOM_CARS.map((c, i) => (
        <Html key={i} position={[c.x, 1.9, c.z]} center zIndexRange={[3, 0]} style={{ pointerEvents: "none" }}>
          <div className="f1-tag" data-hot={hover === i}>
            <span className="f1-tag-num">0{i + 1}</span>
            {cars[i].name}
          </div>
        </Html>
      ))}
    </>
  );
}

// เริ่มโหลดไฟล์รถทั้ง 3 คันทันทีที่เปิดไฟล์นี้
SHOWROOM_CARS.forEach((c) => useGLTF.preload(c.model));
