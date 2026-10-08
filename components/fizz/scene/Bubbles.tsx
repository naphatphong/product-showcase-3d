"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Motion } from "../motion";
import type { Pose } from "./timeline";

// ฟองซ่าลอยขึ้น: จุดเล็กๆ หลายร้อยจุด วาดเป็นฟองด้วย shader (ขอบวง + จุดสะท้อนแสง)
// - คำนวณตำแหน่งบนการ์ดจอทั้งหมด (CPU ไม่ต้องขยับทีละจุดทุกเฟรม) แค่ส่งเวลาเข้าไป
// - ฟองอยู่ "หน้ากล้อง" เสมอ (ระยะ 4.5–16 หน่วย) ไม่ว่ากล้องจะบินไปไหน ภาพจึงมีฟองเต็มจอทุก section
// - จำนวนฟองที่เห็นตามค่า bubbles ของท่า (section ฟองซ่า = เยอะสุด), สีตามยี่ห้อที่เลือก

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity; // 0–1 สัดส่วนฟองที่แสดง
  uniform float uTan;       // tan(ครึ่งมุมมองแนวตั้ง) ใช้คำนวณขนาดภาพที่ระยะต่างๆ
  uniform float uAspect;    // กว้าง/สูง ของจอ
  uniform float uViewH;     // ความสูงจอเป็นพิกเซลจริง (ใช้คิดขนาดจุด)
  attribute vec4 aSeed;     // x = ซ้าย-ขวา (−1..1), y = ความลึก (0..1), z = ความเร็ว, w = ขนาด
  attribute float aPhase;   // ตำแหน่งเริ่มต้น (0..1) และลำดับการปรากฏ
  varying float vAlpha;
  void main() {
    float depth = mix(4.5, 16.0, aSeed.y);
    float halfH = depth * uTan;
    float halfW = halfH * uAspect;
    float rise = fract(aPhase + uTime * aSeed.z);                       // 0 = ล่างจอ → 1 = บนจอ แล้ววนใหม่
    float wobble = sin(uTime * (1.0 + aSeed.z * 8.0) + aPhase * 40.0) * 0.015 * depth; // ส่ายซ้ายขวาเล็กน้อย
    vec3 p = vec3(aSeed.x * halfW * 1.1 + wobble, mix(-1.15, 1.15, rise) * halfH, -depth);
    gl_Position = projectionMatrix * vec4(p, 1.0);                      // ตำแหน่งเทียบกับกล้องโดยตรง
    gl_PointSize = aSeed.w * uViewH / (2.0 * depth * uTan);
    // ค่อยๆ โผล่/หายที่ขอบล่าง-บน + แสดงเฉพาะฟองที่ลำดับต่ำกว่าค่าความหนาแน่น + ฟองไกลจางกว่า
    float edge = smoothstep(0.0, 0.08, rise) * (1.0 - smoothstep(0.9, 1.0, rise));
    float shown = 1.0 - smoothstep(uIntensity - 0.08, uIntensity, aPhase);
    vAlpha = edge * shown * mix(1.0, 0.45, aSeed.y);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;                                 // −1..1 ภายในจุด
    float r = length(c);
    if (r > 1.0 || vAlpha <= 0.0) discard;
    float ring = smoothstep(0.7, 0.93, r) * (1.0 - smoothstep(0.93, 1.0, r)); // ขอบฟอง
    float spark = 1.0 - smoothstep(0.0, 0.3, length(c - vec2(-0.38, -0.38))); // จุดสะท้อนแสงมุมซ้ายบน
    float a = (ring * 0.75 + 0.07 + spark * 0.9) * vAlpha;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), 0.55 + spark * 0.45), a);
  }
`;

const target = new THREE.Color(); // สีปลายทาง (ใช้ซ้ำทุกเฟรม ไม่สร้างใหม่)

export default function Bubbles({
  motion,
  pose,
  narrow,
}: {
  motion: RefObject<Motion>;
  pose: RefObject<Pose>;
  narrow: boolean;
}) {
  const count = narrow ? 110 : 220;
  // ค่าสุ่มของแต่ละฟอง (สร้างครั้งเดียว) — seed เรียงจากเล็กไปใหญ่ทำให้ "ความหนาแน่น" เพิ่มฟองแบบกระจายทั่วจอ
  const geometry = useMemo(() => {
    const seed = new Float32Array(count * 4);
    const phase = new Float32Array(count);
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; // สุ่มแบบกำหนดผลได้ (เหมือนเดิมทุกครั้ง)
    for (let i = 0; i < count; i++) {
      seed[i * 4] = rand() * 2 - 1;
      seed[i * 4 + 1] = rand();
      seed[i * 4 + 2] = 0.03 + rand() * 0.07;
      seed[i * 4 + 3] = 0.035 + Math.pow(rand(), 3) * 0.09; // ส่วนใหญ่เป็นฟองเล็ก มีฟองใหญ่ไม่กี่ลูก
      phase[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uTan: { value: 0.18 },
      uAspect: { value: 1 },
      uViewH: { value: 800 },
      uColor: { value: new THREE.Color("#ffffff") },
    }),
    [],
  );
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, dt) => {
    const m = material.current;
    if (!m) return;
    const cam = state.camera as THREE.PerspectiveCamera;
    const u = m.uniforms;
    // ฟองลอยเร็วขึ้นเล็กน้อยเมื่อหนาแน่น (section ฟองซ่า)
    u.uTime.value += dt * (0.7 + pose.current.bubbles * 0.6);
    u.uIntensity.value = THREE.MathUtils.damp(u.uIntensity.value, pose.current.bubbles, 3, dt);
    u.uTan.value = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    u.uAspect.value = state.size.width / state.size.height;
    u.uViewH.value = state.size.height * state.viewport.dpr;
    u.uColor.value.lerp(target.set(motion.current.tint), 1 - Math.exp(-3 * dt)); // ค่อยๆ เปลี่ยนสีตามยี่ห้อ
  });

  return (
    // frustumCulled={false}: ตำแหน่งจริงคำนวณใน shader three.js จึงไม่รู้ว่าอยู่ในจอไหม อย่าให้มันตัดทิ้ง
    <points geometry={geometry} frustumCulled={false} renderOrder={10}>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
