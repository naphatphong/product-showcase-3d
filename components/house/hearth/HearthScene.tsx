"use client"; // WebGL มีแค่ในเบราว์เซอร์

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { HEARTH, STOPS, type Zone } from "@/config/hearth";
import { createBakeUniforms, installToneMapping, patchLightmapped, patchVertexBaked } from "./bakedLight";
import { createJelly, jellyScale, setJelly, snapJelly, stepJelly, type Jelly, type Kind } from "./jelly";
import { createPose, nightAt, poseAt, zoneWanted, type TourMotion } from "./timeline";

// ฉาก 3D ของทัวร์ HEARTH (ไฟล์นี้โหลดเมื่อเลื่อนมาใกล้ส่วนทัวร์เท่านั้น: dynamic import ใน HearthTour)
// - ไม่มีไฟสดในฉากเลย: แสงทั้งหมดอบไว้แล้ว (bakedLight.ts) จึงลื่นแม้บนมือถือ
// - ทุกเฟรมอ่านตำแหน่งกล้องในทัวร์ (motion.view ที่ HearthTour ไหลตามการเลื่อน) → วางกล้อง / เด้งเฟอร์นิเจอร์ / ปรับกลางวัน-กลางคืน

installToneMapping();

const ZONES: Zone[] = ["sofa", "fire", "dining", "kitchen"]; // ลำดับเดียวกับ uZones ใน shader
const ZONE_STOP = ZONES.map((z) => STOPS.findIndex((s) => s.zone === z)); // มุมนี้เด้งขึ้นที่จุดไหนของทัวร์

// ชื่อวัสดุในไฟล์ (ดู scripts/hearth/README.md)
const WINDOW_VIEW = /^Material #2147473862$/; // รูปวิวนอกหน้าต่าง
const LAMPS = /^(Light|21 - Default23|13 - Default2)$/; // ผิวหลอดไฟ / แถบ LED
const FEATHER = /^Feather/; // ขนนกของโคมระย้า
const ROOM = "hearth-room"; // ชื่อ object ของห้องในฉาก
const LAMP_COLOR = new THREE.Color(1.0, 0.68, 0.42); // ส้มอุ่นแบบหลอดไส้
const NIGHT_SKY = new THREE.Color(0.35, 0.45, 0.8); // วิวนอกหน้าต่างตอนค่ำ: หรี่ลงและอมน้ำเงิน

// ลำดับการเด้ง: ชิ้นใหญ่ขึ้นก่อน ทีละ 0.12 วินาที แล้วชิ้นเล็ก (drop) หล่นตามมาทีละ 0.06 วินาที
// ตอนยุบกลับทำย้อนลำดับ เร็วกว่า
const STAGGER_IN = 0.12;
const STAGGER_DROP = 0.06;
const STAGGER_OUT = 0.025;

// ตัวเรนเดอร์: AgX ของเราเอง (bakedLight.ts) / ค่าคงที่นอก component ไม่งั้น R3F ตั้งค่าใหม่ทุกครั้งที่ React วาดซ้ำ
const GL = { antialias: true, toneMapping: THREE.CustomToneMapping, toneMappingExposure: HEARTH.exposure.day };
const CAMERA = { fov: STOPS[0].arrive.fov, near: 0.05, far: 80, position: STOPS[0].arrive.pos };

export default function HearthScene({
  motion,
  lite,
  active,
  onProgress,
  onReady,
}: {
  motion: RefObject<TourMotion>;
  lite: boolean; // มือถือ: โมเดลเบา + ความละเอียดจอต่ำลง
  active: boolean; // อยู่ในจอ → วาดทุกเฟรม / นอกจอ → หยุดวาด
  onProgress: (p: number) => void;
  onReady: () => void;
}) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={lite ? [1, 1.5] : [1, 1.75]} gl={GL} camera={CAMERA}>
      <Progress onProgress={onProgress} />
      <Suspense fallback={null}>
        <Room motion={motion} lite={lite} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

// เฟอร์นิเจอร์ 1 ชิ้น: ห่อด้วย group ที่ตั้งอยู่ "จุดหมุน" (กลางฐาน / กลางด้านบนสำหรับโคมห้อย)
// ย่อ/ขยาย group นี้ = ย่อขยายชิ้นรอบจุดนั้น (ชิ้นโผล่จากพื้น ไม่ใช่จากกลางอากาศ)
type Item = { w: THREE.Group; pivot: THREE.Vector3; kind: Kind; j: Jelly; inDelay: number; outDelay: number };
type ZoneState = { on: boolean; items: Item[] };
type Glow = { m: THREE.MeshStandardMaterial; color: THREE.Color; k: number };
// ข้อมูลที่เปลี่ยนทุกเฟรม: เก็บไว้ใน userData ของห้อง แล้วเข้าถึงผ่าน ref ใน useFrame (แบบเดียวกับ F1Scene)
type Runtime = {
  U: ReturnType<typeof createBakeUniforms>;
  zones: ZoneState[];
  windows: Glow[];
  lamps: THREE.MeshStandardMaterial[];
  env: { day: THREE.Texture; night: THREE.Texture };
  pose: ReturnType<typeof createPose>;
  size: { x: number; y: number; z: number };
  bg: { day: THREE.Color; night: THREE.Color };
};

function Room({ motion, lite, onReady }: { motion: RefObject<TourMotion>; lite: boolean; onReady: () => void }) {
  const { scene: model } = useGLTF(lite ? HEARTH.modelLite : HEARTH.model);
  const [lmEmpty, lmFull, lmNight] = useLoader(THREE.TextureLoader, [
    HEARTH.lightmaps.dayEmpty,
    HEARTH.lightmaps.dayFull,
    HEARTH.lightmaps.night,
  ]);
  const [hdrDay, hdrNight] = useLoader(HDRLoader, [HEARTH.panoDay, HEARTH.panoNight]);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get); // อ่าน scene/กล้องสดๆ ใน effect (ค่าจาก hook ห้ามแก้ตรงๆ)
  const group = useRef<THREE.Group>(null);
  const reduce = useMemo(() => matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // ภาพ 360° → แผนที่เงาสะท้อน (PMREM) กลางวัน/กลางคืน
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const day = pm.fromEquirectangular(hdrDay).texture;
    const night = pm.fromEquirectangular(hdrNight).texture;
    pm.dispose();
    return { day, night };
  }, [gl, hdrDay, hdrNight]);
  useEffect(
    () => () => {
      env.day.dispose();
      env.night.dispose();
    },
    [env],
  );

  // เตรียมห้องครั้งเดียว: สำเนาโมเดล → ห่อเฟอร์นิเจอร์ → ใส่แสงอบให้วัสดุ
  const room = useMemo(() => {
    // lightmap: สี sRGB, ใช้พิกัดรูปชุดที่ 2 (uv1)
    for (const t of [lmEmpty, lmFull, lmNight]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.channel = 1;
      t.needsUpdate = true;
    }
    const U = createBakeUniforms(lmFull, lmNight);
    const root = model.clone(true); // สำเนา ไม่แก้ตัวในแคชของ useGLTF (geometry/รูปยังใช้ร่วมกัน)
    root.name = ROOM;
    root.visible = false; // ซ่อนไว้จนกว่า shader จะคอมไพล์เสร็จ (ไม่กระตุกตอนเห็นครั้งแรก)
    root.updateMatrixWorld(true);

    // ---------- เฟอร์นิเจอร์ที่เด้งได้ ----------
    const found: THREE.Object3D[] = [];
    root.traverse((o) => {
      if (o.userData.role === "item") found.push(o);
    });
    const zones: ZoneState[] = ZONES.map(() => ({ on: false, items: [] }));
    const zoneBox = ZONES.map(() => new THREE.Box3());
    const vol = new Map<Item, number>();
    for (const node of found) {
      const zone = ZONES.indexOf(node.userData.zone);
      if (zone < 0) continue;
      const kind = node.userData.kind as Kind;
      const box = new THREE.Box3().setFromObject(node);
      zoneBox[zone].union(box);
      const pivot = box.getCenter(new THREE.Vector3());
      if (kind === "hang") pivot.y = box.max.y;
      else if (kind !== "wall") pivot.y = box.min.y;
      const w = new THREE.Group();
      w.position.copy(pivot);
      node.parent!.add(w);
      w.updateMatrixWorld();
      w.attach(node); // ย้ายเข้า group โดยตำแหน่งในโลกเท่าเดิม
      w.visible = false;
      const item: Item = { w, pivot, kind, j: createJelly(), inDelay: 0, outDelay: 0 };
      vol.set(item, Number(node.userData.vol) || 0);
      zones[zone].items.push(item);
    }
    for (const z of zones) {
      const big = z.items.filter((it) => it.kind !== "drop").sort((a, b) => vol.get(b)! - vol.get(a)!);
      // ชิ้นเล็กสลับลำดับแบบคงที่ (ไม่สุ่มใหม่ทุกครั้ง) ไม่ให้หล่นเรียงเป็นแถว
      const small = z.items.filter((it) => it.kind === "drop").sort((a, b) => frac(vol.get(a)! * 1e5) - frac(vol.get(b)! * 1e5));
      big.forEach((it, i) => (it.inDelay = i * STAGGER_IN));
      const after = big.length * STAGGER_IN + 0.1;
      small.forEach((it, i) => (it.inDelay = after + i * STAGGER_DROP));
      z.items = [...big, ...small];
      z.items.forEach((it, i) => (it.outDelay = (z.items.length - 1 - i) * STAGGER_OUT));
    }
    zoneBox.forEach((b, i) => {
      if (!b.isEmpty()) U.uZones.value[i].set(b.min.x, b.min.z, b.max.x, b.max.z);
    });

    // ---------- วัสดุ ----------
    const mats = new Map<string, THREE.Material>();
    const windows: Glow[] = [];
    const lamps: THREE.MeshStandardMaterial[] = [];
    const prepare = (m0: THREE.Material, mode: "lm" | "v" | "-") => {
      const m = m0.clone() as THREE.MeshPhysicalMaterial;
      // กระจก: ใสแบบง่าย (transmission จริงหนักเกินไปสำหรับห้องทั้งห้อง)
      if (m.transmission > 0) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = 0.18;
        m.roughness = 0.05;
        m.depthWrite = false;
        return m;
      }
      if (WINDOW_VIEW.test(m.name)) {
        windows.push({ m, color: m.emissive.clone(), k: m.emissiveIntensity });
        return m;
      }
      if (LAMPS.test(m.name)) {
        m.emissive = LAMP_COLOR.clone();
        m.emissiveIntensity = 0; // กลางวันไม่เรือง
        lamps.push(m);
      } else if (m.emissiveMap || m.emissive.getHex()) {
        return m; // ชิ้นที่ส่องแสงเอง (ไฟในเตาผิง)
      }
      if (FEATHER.test(m.name)) {
        m.side = THREE.DoubleSide; // แผ่นขนนกบางใส อบแสงไม่ได้ → ใช้แสงจากภาพ 360° แทน
        return m;
      }
      if (mode === "lm") patchLightmapped(m, U, lmEmpty);
      else if (mode === "v") patchVertexBaked(m, U);
      return m;
    };
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const role = o.userData.role ?? o.parent?.userData.role; // ชิ้นหลายวัสดุมาเป็นกลุ่มของ mesh
      const g = mesh.geometry;
      const mode = role === "shell_lm" && g.attributes._lmuv ? "lm" : g.attributes._bake_day ? "v" : "-";
      if (mode === "lm") g.setAttribute("uv1", g.attributes._lmuv);
      const fix = (m0: THREE.Material) => {
        const key = `${m0.uuid}:${mode}`;
        if (!mats.has(key)) mats.set(key, prepare(m0, mode));
        return mats.get(key)!;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
    });

    // รูปทั้งหมดที่ต้องส่งเข้าการ์ดจอ (ทำตอนโหลด ไม่ใช่ตอนเห็นครั้งแรก)
    const textures = new Set<THREE.Texture>([lmFull, lmNight]);
    for (const m of mats.values()) {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
    }
    const runtime: Runtime = {
      U,
      zones,
      windows,
      lamps,
      env,
      pose: createPose(),
      size: { x: 1, y: 1, z: 1 },
      bg: { day: new THREE.Color(HEARTH.background.day), night: new THREE.Color(HEARTH.background.night) },
    };
    root.userData.tour = runtime;
    return { root, mats, textures };
  }, [model, lmEmpty, lmFull, lmNight, env]);

  useEffect(() => () => room.mats.forEach((m) => m.dispose()), [room]);

  // ตั้งฉาก + คอมไพล์ shader ทั้งหมดล่วงหน้า แล้วค่อยบอกหน้าเว็บว่าพร้อม
  useEffect(() => {
    let live = true;
    const { gl, scene, camera } = get();
    const root = scene.getObjectByName(ROOM);
    if (!root) return;
    scene.environment = env.day;
    scene.background = new THREE.Color(HEARTH.background.day);
    for (const t of room.textures) gl.initTexture(t);
    gl.compileAsync(root, camera, scene)
      .catch(() => {}) // บางเครื่องคอมไพล์ล่วงหน้าไม่ได้ → ไปคอมไพล์ตอนวาดจริงแทน
      .then(() => {
        if (!live) return;
        root.visible = true;
        onReady();
      });
    return () => {
      live = false;
      scene.environment = null;
      scene.background = null;
    };
  }, [room, env, get, onReady]);

  useFrame((state, delta) => {
    const r = group.current?.children[0]?.userData.tour as Runtime | undefined;
    if (!r) return;
    const { pose, size, bg } = r;
    const { gl, scene } = state;
    const camera = state.camera as THREE.PerspectiveCamera;
    const t = motion.current.view;

    // ---------- กล้อง ----------
    poseAt(t, pose);
    camera.position.copy(pose.pos);
    camera.quaternion.copy(pose.quat);
    if (!reduce) {
      // หายใจเบาๆ (ไม่กี่มิลลิเมตร) ภาพจะได้ไม่นิ่งเหมือนรูปถ่ายตอนหยุดเลื่อน
      const k = state.clock.elapsedTime;
      camera.position.x += Math.sin(k * 0.27) * 0.008;
      camera.position.y += Math.sin(k * 0.37) * 0.005;
    }
    const fov = fitFov(pose.fov, state.size.width / state.size.height);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // ---------- เฟอร์นิเจอร์เด้ง ----------
    const dt = Math.min(delta, 1 / 20); // สลับแท็บกลับมา: ไม่ให้สปริงกระโดดทีเดียวไกล
    r.zones.forEach((z, zi) => {
      const want = zoneWanted(ZONE_STOP[zi], t);
      if (want !== z.on) {
        z.on = want;
        for (const it of z.items) setJelly(it.j, want, want ? it.inDelay : it.outDelay, it.kind);
      }
      let shown = 0;
      for (const it of z.items) {
        if (reduce) snapJelly(it.j);
        else stepJelly(it.j, it.kind, dt);
        it.w.visible = it.j.x > 0.002;
        if (it.w.visible) {
          jellyScale(it.j, it.kind, size);
          it.w.scale.set(size.x, Math.max(size.y, 1e-3), size.z);
          it.w.position.set(it.pivot.x, it.pivot.y + it.j.h, it.pivot.z);
        }
        shown += Math.min(1, it.j.x);
      }
      // เงาใต้เฟอร์นิเจอร์บนพื้น/ผนังค่อยๆ ปรากฏตามชิ้นที่โผล่
      r.U.uZoneOn.value.setComponent(zi, z.items.length ? shown / z.items.length : 0);
    });

    // ---------- กลางวัน → กลางคืน ----------
    const n = nightAt(t);
    r.U.uNight.value = n;
    // ความสว่างภาพลดแบบทวีคูณ (0.7 → 0.22) ตาคนรู้สึกว่าค่อยๆ มืดลงเท่าๆ กัน
    gl.toneMappingExposure = HEARTH.exposure.day * Math.pow(HEARTH.exposure.night / HEARTH.exposure.day, n);
    scene.environment = n > 0.5 ? r.env.night : r.env.day;
    if (scene.background instanceof THREE.Color) scene.background.lerpColors(bg.day, bg.night, n);
    for (const w of r.windows) {
      w.m.emissiveIntensity = w.k * (1 - 0.95 * n);
      w.m.emissive.copy(w.color).lerp(NIGHT_SKY, n);
    }
    for (const m of r.lamps) m.emissiveIntensity = HEARTH.lampGlow * n;
  });

  return (
    <group ref={group}>
      <primitive object={room.root} />
    </group>
  );
}

const frac = (x: number) => x - Math.floor(x);

// จอแคบ/แนวตั้ง: ขยายมุมกล้องแนวตั้งให้เห็นห้องกว้างพอ (มุมใน config ตั้งไว้สำหรับจอ 16:9)
// ขยายไม่เต็มสัดส่วน (ยกกำลัง 0.6) ไม่งั้นมือถือแนวตั้งจะได้ภาพบิดแบบเลนส์ตาปลา / สูงสุด 88°
function fitFov(fov: number, aspect: number) {
  const half = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * Math.pow(16 / 9 / aspect, 0.6);
  return Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(half)));
}

// ความคืบหน้าการโหลดไฟล์ (นับจากไฟล์ที่ three.js โหลดเสร็จจริง)
// ตัวนับเปลี่ยนค่าระหว่างที่ React กำลังวาดห้อง (ตอนเริ่มโหลดไฟล์) → ส่งออกไปในเฟรมถัดไป ไม่อัปเดตหน้าเว็บกลางคัน
function Progress({ onProgress }: { onProgress: (p: number) => void }) {
  useEffect(() => {
    let raf = 0;
    const send = () => {
      raf = 0;
      onProgress(useProgress.getState().progress);
    };
    send();
    const stop = useProgress.subscribe(() => {
      if (!raf) raf = requestAnimationFrame(send);
    });
    return () => {
      stop();
      cancelAnimationFrame(raf);
    };
  }, [onProgress]);
  return null;
}
