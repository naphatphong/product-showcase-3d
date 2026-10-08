"use client"; // ใช้ WebGL และ hooks ของ React จึงต้องรันฝั่งเบราว์เซอร์ (Client Component)

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, Stars, useProgress } from "@react-three/drei";
import * as THREE from "three";
import Safe from "@/components/Safe";
import { look, products } from "@/config/products";
import { DIVE_SECONDS } from "@/lib/dive";
import Backdrop from "./Backdrop";
import Earth, { EARTH_CENTER, EARTH_RADIUS, SUN_DIR } from "./Earth";
import FloatingProduct from "./FloatingProduct";

// มุมกล้องปกติ 2 แบบ (มองตรงไปทาง −z เสมอ): จอกว้าง (คอม) / จอแคบ (มือถือแนวตั้ง ถอยออกและมุมกว้างขึ้น)
// จุด SLOT (0,0,0) = ที่จอดของสินค้าชิ้นที่เลือก — คอมเยื้องขวาบนนิดหน่อย (ชื่อสินค้าอยู่ซ้ายล่าง), มือถืออยู่กลางค่อนบน
const VIEWS = {
  wide: { pos: new THREE.Vector3(-0.8, -0.3, 8), look: new THREE.Vector3(-0.8, -0.3, 0), fov: 38 },
  narrow: { pos: new THREE.Vector3(0, -1.2, 11), look: new THREE.Vector3(0, -1.2, 0), fov: 52 },
};
// มุมกล้องตอนหน้าเปิด: ถอยหลังและเงยขึ้น → โลกลดลงไปอยู่ครึ่งล่าง ท้องฟ้าด้านบนว่างให้หัวข้อ
// กดเริ่มแล้วกล้องค่อยๆ ก้มลงมาเป็นมุมปกติ พร้อมกับที่สินค้าชิ้นแรกบินเข้ามา
const SPLASH = {
  wide: { pos: new THREE.Vector3(-0.8, 0.3, 9.5), look: new THREE.Vector3(-0.8, 2.2, 0), fov: 38 },
  narrow: { pos: new THREE.Vector3(0, -0.5, 12.5), look: new THREE.Vector3(0, 1.6, 0), fov: 52 },
};
const ARRIVE_SECONDS = 2.2; // เวลาที่สินค้าชิ้นแรกบินจากนอกจอเข้ามาจอด
const ARRIVE_FROM = 1.7; // ชิ้นแรกเริ่มบินจากตรงไหน (นับเป็นระยะห่างระหว่างสินค้า: เกิน 1 = นอกจอมุมขวาบน)

// ---------- วงโคจรของสินค้า ----------
// สินค้าทุกชิ้นเป็นเหมือนดาวเทียมบนวงโคจรเดียวกันรอบโลก (วงกลมรอบศูนย์กลางโลก ผ่านจุด SLOT)
// ตรง SLOT สินค้าเคลื่อนเฉียงขึ้นขวาตามแนวขอบโลก: ชิ้นถัดไปรออยู่นอกจอมุมขวาบน ชิ้นก่อนหน้าอยู่นอกจอมุมซ้ายล่าง
const SLOT = new THREE.Vector3(0, 0, 0);
const ORBIT_RADIUS = SLOT.distanceTo(EARTH_CENTER);
const RADIAL = SLOT.clone().sub(EARTH_CENTER).normalize(); // ทิศจากศูนย์กลางโลกออกมาที่ SLOT
const PATH_ANGLE = THREE.MathUtils.degToRad(33); // มุมเฉียงของเส้นทางบนจอ (0 = แนวนอน)
// ทิศที่สินค้าเคลื่อนผ่าน SLOT: เฉียงขึ้นขวาบนจอ แล้วปรับให้ตั้งฉากกับแนวรัศมี (สัมผัสวงโคจรพอดี)
const ALONG = new THREE.Vector3(Math.cos(PATH_ANGLE), Math.sin(PATH_ANGLE), 0);
ALONG.addScaledVector(RADIAL, -ALONG.dot(RADIAL)).normalize();

// ตำแหน่งบนวงโคจรที่มุม a (เรเดียน) นับจาก SLOT: บวก = ไปทางขวาบน, ลบ = ไปทางซ้ายล่าง
function orbitPoint(a: number, out: THREE.Vector3) {
  return out
    .copy(EARTH_CENTER)
    .addScaledVector(RADIAL, ORBIT_RADIUS * Math.cos(a))
    .addScaledVector(ALONG, ORBIT_RADIUS * Math.sin(a));
}

// ตำแหน่งวงแหวนที่ต้องหมุนไปหา (หน่วย = จำนวนชิ้น เช่น 1.4 = เลยชิ้นที่ 2 ไปเกือบครึ่งทาง)
// เป็น ref เพราะเปลี่ยนทุกครั้งที่นิ้ว/เมาส์ขยับตอนลาก — ฉากอ่านค่าเองทุกเฟรม ไม่ต้อง render ใหม่
export type Ring = { goal: number };

export type SceneProps = {
  narrow: boolean;
  front: number; // สินค้าที่อยู่หน้าสุดของวงแหวน
  ring: RefObject<Ring>;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onReady: () => void; // เรียกเมื่อภาพโลกโหลดเสร็จ (ฉากพร้อมแสดง)
  onProgress: (percent: number) => void; // ความคืบหน้าการโหลดไฟล์จริง 0–100 (ภาพโลก + โมเดลสินค้า)
  started: boolean; // false = หน้าเปิด (เห็นแค่โลก สินค้ายังไม่มา), true = สินค้าบินเข้ามาแล้ว
  labelLayer: RefObject<HTMLDivElement | null>; // ชั้น HTML สำหรับป้ายชื่อสินค้า
  variants: number[]; // สินค้าแต่ละชิ้นเลือกแบบที่เท่าไรอยู่ (ใช้กับสินค้าที่มีหลายแบบ)
  diveTo: { lat: number; lon: number } | null; // มีค่า = กำลังดำดิ่งเข้าหาจุดนี้บนโลก
};

export default function Scene(props: SceneProps) {
  return (
    // dpr [1, 2]: ความคมตามจอ แต่ไม่เกิน 2 เท่า กันมือถือจอคมสูงทำงานหนักเกิน
    // fallback: แสดงแทนเมื่อเครื่องไม่รองรับ WebGL
    <Canvas
      camera={{ position: SPLASH.wide.pos.toArray(), fov: 38 }}
      dpr={[1, 2]}
      fallback={<NoWebGL onReady={props.onReady} onProgress={props.onProgress} />}
    >
      <Progress onProgress={props.onProgress} />
      <Rig narrow={props.narrow} started={props.started} diveTo={props.diveTo} />
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
      {/* Suspense: รอภาพโลกโหลดเสร็จก่อนค่อยแสดง (ระหว่างนั้นเห็นดาวกับสินค้าไปก่อน)
          Safe: ถ้าโหลดภาพโลกไม่สำเร็จ ไม่มีโลกแต่หน้ายังใช้ได้ (และบอกว่าพร้อมแล้ว ฉากจะได้ไม่ค้างที่ loading) */}
      <Safe onError={props.onReady}>
        <Suspense fallback={null}>
          <Earth focus={props.diveTo} />
          <Ready onReady={props.onReady} />
        </Suspense>
      </Safe>
    </Canvas>
  );
}

// สินค้าบนวงโคจร: เห็นทีละชิ้นที่ SLOT — หมุนวงโคจร = ชิ้นเดิมเลื่อนออกไปมุมหนึ่ง ชิ้นใหม่เลื่อนเข้ามาจากอีกมุม
// ระยะห่างระหว่างชิ้นคำนวณจากขนาดจอ ให้ชิ้นข้างเคียงอยู่พ้นขอบจอพอดี (ลากค้างไว้ = เห็นชิ้นเดิมออก ชิ้นใหม่เข้าพร้อมกัน)
// วนได้ไม่สิ้นสุด: ตำแหน่งของแต่ละชิ้นนับห่างจากชิ้นตรงกลางไม่เกินครึ่งวง (3 ชิ้น = −1.5 ถึง 1.5 ชิ้น)
// ชิ้นที่ข้ามจากฝั่งหนึ่งไปอีกฝั่งจะกระโดดตอนอยู่นอกจอ ผู้ใช้จึงไม่เห็น
function Carousel({ narrow, front, ring, onHover, onSelect, labelLayer, variants, started }: SceneProps) {
  const size = useThree((s) => s.size);
  const view = narrow ? VIEWS.narrow : VIEWS.wide;
  // ครึ่งความกว้าง/สูงของภาพที่ระยะของ SLOT (คิดจากมุมกล้องปกติ จะได้ไม่เปลี่ยนตามตอนกล้องขยับ)
  const halfH = view.pos.z * Math.tan(THREE.MathUtils.degToRad(view.fov / 2));
  const halfW = (halfH * size.width) / size.height;
  const scale = narrow ? 1.25 : 1.2; // ขนาดสินค้า
  // ระยะที่ต้องเลื่อนจนสินค้าพ้นขอบจอ (เผื่อครึ่งตัวสินค้า + ป้ายใต้สินค้า) ทั้งทางขวาบนและซ้ายล่าง เอาทางที่ไกลกว่า
  const sx = SLOT.x - view.look.x;
  const sy = SLOT.y - view.look.y;
  const m = 1.6 * scale;
  const cos = Math.cos(PATH_ANGLE);
  const sin = Math.sin(PATH_ANGLE);
  const out = Math.max(
    Math.min((halfW + m - sx) / cos, (halfH + m - sy) / sin),
    Math.min((halfW + m + sx) / cos, (halfH + m + sy) / sin),
  );
  const spacing = out / ORBIT_RADIUS; // มุมระหว่างสินค้า 2 ชิ้นบนวงโคจร (เรเดียน)

  const items = useRef<(THREE.Group | null)[]>([]);
  const pos = useRef<number | null>(null); // ตำแหน่งวงโคจรที่แสดงอยู่ตอนนี้ (ไล่ตาม ring.goal แบบนุ่มๆ)
  const bank = useRef(0); // มุมเอียงตอนเคลื่อนที่ (เหมือนเครื่องบินเอียงตอนเลี้ยว)
  const arrive = useRef(0); // ความคืบหน้าการบินเข้ามาของชิ้นแรก 0 → 1
  const extraPrev = useRef(ARRIVE_FROM); // ระยะบินที่เหลือของเฟรมก่อน (ใช้คิดความเร็ว)
  const point = useRef(new THREE.Vector3());
  // ผู้ใช้ที่ตั้ง "ลดการเคลื่อนไหว": สินค้ากระโดดไปเลย ไม่เลื่อนให้เห็น
  const [reduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useFrame((_, dt) => {
    const goal = ring.current.goal;
    // หน้าเปิด: สินค้ายังไม่มา / กดเริ่มแล้ว: ชิ้นแรกบินจากนอกจอมุมขวาบนเข้ามาจอด (เร็วตอนแรก แล้วค่อยๆ ชะลอ)
    if (started) arrive.current = reduced ? 1 : Math.min(1, arrive.current + dt / ARRIVE_SECONDS);
    const extra = ARRIVE_FROM * Math.pow(1 - arrive.current, 3); // ระยะที่ยังเหลือก่อนถึงที่จอด (easeOutCubic)
    const prevGoal = pos.current ?? goal;
    const p = pos.current === null || reduced ? goal : THREE.MathUtils.damp(prevGoal, goal, 5, dt);
    // ความเร็ว (ชิ้นต่อวินาที รวมการบินเข้ามาตอนเริ่ม) → เอียงตัวไปทางที่เคลื่อน
    const shown = p - extra;
    const v = dt > 0 && pos.current !== null ? (shown - (prevGoal - extraPrev.current)) / dt : 0;
    extraPrev.current = extra;
    pos.current = p;
    bank.current = THREE.MathUtils.damp(bank.current, THREE.MathUtils.clamp(v * 0.18, -0.4, 0.4), 6, dt);
    const n = products.length;
    items.current.forEach((g, i) => {
      if (!g) return;
      const k = mod(i - p + n / 2, n) - n / 2; // ห่างจากชิ้นตรงกลางกี่ชิ้น: −n/2 ถึง n/2
      // ระหว่างบินเข้ามา: แสดงเฉพาะชิ้นที่จะมาจอด (ชิ้นอื่นอาจลอยผ่านกลางจอเพราะเลื่อนตามกันมา)
      g.visible = started && (arrive.current >= 1 || Math.abs(k) < 0.5);
      g.position.copy(orbitPoint((k + extra) * spacing, point.current));
      g.rotation.z = bank.current;
      g.scale.setScalar(scale);
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

// หารเอาเศษแบบไม่ติดลบ เช่น mod(-1, 3) = 2
const mod = (a: number, n: number) => ((a % n) + n) % n;

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

function Rig({ narrow, started, diveTo }: Pick<SceneProps, "narrow" | "started" | "diveTo">) {
  // จุดที่กล้องมอง: เริ่มที่มุมของหน้าเปิด (ไม่ใช่ 0,0,0 ไม่งั้นเฟรมแรกๆ กล้องจะหันวูบ)
  const look = useRef((narrow ? SPLASH.narrow : SPLASH.wide).look.clone());
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
    const views = started ? VIEWS : SPLASH;
    const view = narrow ? views.narrow : views.wide;
    const k = narrow ? 0 : 1; // มือถือไม่มีเมาส์ → ไม่ต้อง parallax
    const damp = THREE.MathUtils.damp;
    cam.position.x = damp(cam.position.x, view.pos.x + state.pointer.x * 0.5 * k, 1.6, dt);
    cam.position.y = damp(cam.position.y, view.pos.y + state.pointer.y * 0.25 * k, 1.6, dt);
    cam.position.z = damp(cam.position.z, view.pos.z, 1.6, dt);
    cam.fov = damp(cam.fov, view.fov, 4, dt);
    cam.updateProjectionMatrix();
    look.current.lerp(view.look, 1 - Math.exp(-1.6 * dt));
    cam.lookAt(look.current);
  });
  return null;
}

// ส่ง % การโหลดไฟล์ทั้งหมดของฉาก (drei นับจากตัวโหลดกลางของ three.js: ภาพ + โมเดล) ออกไปให้หน้าโหลด
// โหลดครบแล้ว (ไม่มีไฟล์ค้าง) = 100 — ไฟล์ที่โหลดไม่สำเร็จก็นับว่าจบ หน้าโหลดจะได้ไม่ค้าง
function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  const { progress, active, total } = useProgress();
  const done = total > 0 && !active;
  useEffect(() => onProgress(done ? 100 : progress), [done, progress, onProgress]);
  return null;
}

// component นี้อยู่ใน Suspense เดียวกับโลก จึง mount หลังภาพโลกโหลดเสร็จเท่านั้น
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

// เครื่องที่ไม่รองรับ WebGL: บอกหน้าโหลดว่าเสร็จแล้ว (ไม่งั้นค้างที่หน้าโหลด) แล้วแสดงลิงก์สินค้าแทนฉาก
function NoWebGL({ onReady, onProgress }: Pick<SceneProps, "onReady" | "onProgress">) {
  useEffect(() => {
    onProgress(100);
    onReady();
  }, [onReady, onProgress]);
  return (
    // อยู่ด้านบน (ใต้แถบบนสุด) ไม่ทับหัวข้อหน้าเปิดกลางจอ
    <div className="flex h-full flex-col items-center gap-3 p-8 pt-28 text-center text-sm">
      <p className="text-white/60">This browser can’t show the 3D showroom. Pick a product:</p>
      {products.map((p) => (
        <Link key={p.slug} href={`/${p.slug}`} className="underline">
          {p.name} — {p.category}
        </Link>
      ))}
    </div>
  );
}
