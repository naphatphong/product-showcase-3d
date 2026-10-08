"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { EARTH_CENTER, EARTH_RADIUS, SUN_DIR } from "./Earth";

// แสงแฟลร์ของเลนส์ (แบบภาพถ่ายย้อนแสงในต้นแบบ): วาดทับทั้งจอด้วย shader แบบบวกแสง (additive)
// - แสงอุ่นเรืองรอบดวงอาทิตย์ (ดวงอาทิตย์อยู่เหนือขอบจอด้านบน → เห็นเป็นแสงฟุ้งที่ขอบบน)
// - "ผี" ของเลนส์: วงแสงจางๆ หลายสีเรียงบนเส้นจากดวงอาทิตย์ผ่านกลางจอไปอีกฝั่ง
// - วงรุ้ง: ส่วนโค้งสีรุ้งจางๆ ฝั่งตรงข้ามดวงอาทิตย์
// ดวงอาทิตย์ถูกโลกบัง (เช่น ตอนดำดิ่งเข้าหาโลก) หรือออกห่างจากจอมาก → แฟลร์ค่อยๆ จางหาย

const vertex = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0); // สี่เหลี่ยมเต็มจอ ไม่ขึ้นกับกล้อง
  }
`;

const fragment = /* glsl */ `
  uniform vec2 uSun;      // ตำแหน่งดวงอาทิตย์บนจอ (-1..1 คือในจอ, เกินได้)
  uniform vec2 uRes;      // ขนาดจอ (พิกเซลจริง)
  uniform float uVis;     // ความแรงรวม 0–1

  // วงผีของเลนส์: แผ่นกลมขอบสว่างกว่าตรงกลางนิดหน่อย
  float ghost(vec2 p, vec2 c, float r) {
    float d = length(p - c);
    return smoothstep(r, r * 0.55, d) * (0.6 + 0.4 * smoothstep(r * 0.4, r, d));
  }

  // สีรุ้งจากค่า 0–1 (แดง → ม่วง)
  vec3 spectrum(float t) {
    return clamp(abs(fract(t + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  }

  void main() {
    vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
    vec2 p = (gl_FragCoord.xy / uRes * 2.0 - 1.0) * aspect; // พิกัดจอที่ปรับให้วงกลมไม่เบี้ยว
    vec2 sun = uSun * aspect;

    // แสงเรืองรอบดวงอาทิตย์: วงกว้างสีอุ่น + แกนกลางสว่าง
    float r = length(p - sun);
    vec3 col = vec3(1.0, 0.62, 0.32) * 0.16 * exp(-r * 1.3);
    col += vec3(1.0, 0.86, 0.68) * 0.22 * exp(-r * 4.5);

    // ผีของเลนส์: เรียงบนเส้นจากดวงอาทิตย์ผ่านกลางจอ (k ติดลบ = เลยกลางจอไปอีกฝั่ง)
    col += vec3(0.55, 0.75, 1.0) * 0.08 * ghost(p, sun * -0.22, 0.05);
    col += vec3(0.45, 1.0, 0.65) * 0.05 * ghost(p, sun * -0.48, 0.13);
    col += vec3(1.0, 0.55, 0.35) * 0.045 * ghost(p, sun * -0.78, 0.24);
    col += vec3(0.65, 0.6, 1.0) * 0.07 * ghost(p, sun * -1.05, 0.07);

    // วงรุ้ง: วงกลมรอบจุดฝั่งตรงข้ามดวงอาทิตย์ เห็นเป็นส่วนโค้งเฉพาะด้านที่หันเข้าหาดวงอาทิตย์
    vec2 hc = sun * -0.35;
    vec2 hv = p - hc;
    float hd = length(hv);
    float t = (hd - 0.62) / 0.07; // -1..1 = ความหนาของวง
    float arc = smoothstep(0.35, 0.95, dot(hv / max(hd, 1e-4), normalize(sun - hc)));
    col += spectrum(t * 0.5 + 0.5) * max(1.0 - t * t, 0.0) * arc * 0.1;

    gl_FragColor = vec4(col * uVis, 1.0);
  }
`;

const sunPoint = new THREE.Vector3();
const toEarth = new THREE.Vector3();

// ดวงอาทิตย์ถูกโลกบังไหม: ยิงเส้นจากกล้องไปทางดวงอาทิตย์ แล้วดูว่าชนทรงกลมของโลก (รวมบรรยากาศ) หรือเปล่า
function sunBlocked(camera: THREE.Camera) {
  toEarth.copy(EARTH_CENTER).sub(camera.position);
  const along = toEarth.dot(SUN_DIR); // ระยะตามแนวเส้นไปถึงจุดที่ใกล้ศูนย์กลางโลกที่สุด
  if (along < 0) return false; // โลกอยู่ด้านหลัง
  const r = EARTH_RADIUS * 1.03;
  return toEarth.lengthSq() - along * along < r * r;
}

export default function LensFlare() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uSun: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) }, uVis: { value: 0 } }),
    [],
  );

  useFrame(({ camera, gl }, dt) => {
    const m = material.current;
    if (!m) return;
    // ตำแหน่งดวงอาทิตย์บนจอ: จุดไกลๆ ทางทิศ SUN_DIR จากกล้อง แปลงเป็นพิกัดจอ
    camera.updateMatrixWorld();
    sunPoint.copy(camera.position).addScaledVector(SUN_DIR, 100).project(camera);
    m.uniforms.uSun.value.set(sunPoint.x, sunPoint.y);
    gl.getDrawingBufferSize(m.uniforms.uRes.value);
    // ความแรง: ดวงอาทิตย์อยู่หลังกล้อง/ถูกโลกบัง = 0, ออกห่างจากจอ = จางลง — ค่อยๆ เปลี่ยน ไม่กระพริบ
    const behind = sunPoint.z > 1;
    const off = Math.hypot(sunPoint.x, sunPoint.y);
    const want = behind || sunBlocked(camera) ? 0 : 1 - THREE.MathUtils.smoothstep(off, 1.6, 3.6);
    m.uniforms.uVis.value = THREE.MathUtils.damp(m.uniforms.uVis.value, want, 3, dt);
  });

  return (
    // วาดหลังสุด (renderOrder สูง), ไม่สนความลึก, บวกแสงเข้ากับภาพเดิม
    <mesh frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
