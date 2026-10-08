"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// ตำแหน่งและขนาดโลกในฉาก — โลกใหญ่มากและอยู่ต่ำ/ไกลกว่าสินค้า
// กล้องจึงเห็นแค่ส่วนบนของโลกเป็นขอบฟ้าโค้งๆ ครึ่งล่างของจอ (y ยิ่งมาก โลกยิ่งโผล่สูงขึ้น)
export const EARTH_CENTER = new THREE.Vector3(0, -15, -16);
export const EARTH_RADIUS = 12;
// ทิศที่แสงอาทิตย์ส่องมา (ใช้ทั้ง shader ของโลกและไฟของสินค้า ให้แสงไปทางเดียวกัน)
// มาจากด้านขวา ค่อนมาทางกล้องนิดหน่อย → โลกที่เราเห็นเป็นกลางวันราว 2 ใน 3 (ขวา) ฝั่งซ้ายเป็นกลางคืนมีไฟเมือง
export const SUN_DIR = new THREE.Vector3(0.9, 0.4, 0.15).normalize();

// แปลงละติจูด/ลองจิจูด เป็นเวกเตอร์ทิศบนลูกโลก (ก่อนหมุน)
// สูตรนี้ตรงกับวิธีที่ SphereGeometry ของ three.js แปะภาพแผนที่โลกแบบ equirectangular
export function latLonToVector(lat: number, lon: number) {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
}

// มุมหมุนแกน Y ที่ทำให้จุด lat/lon หันไปทางมุม azimuth ที่ต้องการ (เช่น ทิศของกล้อง)
export function facingRotation(lat: number, lon: number, azimuth: number) {
  const p = latLonToVector(lat, lon);
  return azimuth - Math.atan2(p.x, p.z);
}

// ---------- shader ของผิวโลก ----------
// vertex shader: ส่ง uv, normal และตำแหน่งในโลก (world space) ไปให้ fragment shader
const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// fragment shader: คำนวณสีทีละพิกเซล
const surfaceFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uClouds;
  uniform vec3 uSunDir;
  uniform float uCloudShift;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float sun = dot(n, uSunDir);                 // 1 = แดดตรงหัว, ติดลบ = ด้านกลางคืน
    float dayMix = smoothstep(-0.18, 0.28, sun); // เส้นแบ่งกลางวัน/กลางคืนแบบนุ่มๆ

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float clouds = texture2D(uClouds, vUv + vec2(uCloudShift, 0.0)).r; // เมฆเลื่อนช้ากว่าพื้นโลก

    // ด้านกลางวัน: พื้นโลกโดนแดด + เมฆสีขาว
    vec3 dayCol = day * (0.08 + max(sun, 0.0) * 1.15);
    dayCol = mix(dayCol, vec3(0.03 + max(sun, 0.0) * 1.05), clouds * 0.92);

    // แสงแดดสะท้อนผิวน้ำ: ทะเลในภาพเป็นสีน้ำเงินเข้ม (น้ำเงิน > แดง) ใช้แยกน้ำออกจากแผ่นดิน
    float water = smoothstep(0.015, 0.07, day.b - day.r) * (1.0 - clouds);
    float glint = pow(max(dot(n, normalize(uSunDir + v)), 0.0), 70.0);
    dayCol += vec3(1.0, 0.92, 0.8) * glint * water * 0.7;

    // ด้านกลางคืน: แสงไฟเมือง (โดนเมฆบังก็จางลง)
    vec3 nightCol = night * 1.9 * (1.0 - clouds * 0.8);

    vec3 col = mix(nightCol, dayCol, dayMix);

    // ขอบโลกมีสีฟ้าของชั้นบรรยากาศ (fresnel: ยิ่งมองเฉียงยิ่งสว่าง)
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += vec3(0.3, 0.6, 1.0) * fres * (0.15 + 0.85 * smoothstep(-0.25, 0.6, sun));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// shader ของชั้นบรรยากาศ: ทรงกลมใหญ่กว่าโลกนิดหน่อย วาดด้านใน (BackSide)
// แล้วเรืองแสงแบบบวกสี (additive) เห็นเป็นวงแสงสีฟ้ารอบขอบโลก
const atmosphereFragment = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float d = dot(n, v);                                         // ใกล้ 0 = ขอบนอกสุดของวงแสง
    float glow = pow(1.0 - smoothstep(-0.32, 0.0, d), 2.2);      // สว่างสุดชิดผิวโลก แล้วจางออก
    float lit = smoothstep(-0.45, 0.5, dot(n, uSunDir));         // ด้านโดนแดดสว่างกว่า
    gl_FragColor = vec4(vec3(0.32, 0.62, 1.0) * glow * (0.12 + 1.3 * lit), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// ค่าคงที่ ไม่เปลี่ยนเลย สร้างไว้นอก component ได้
const atmosphereUniforms = { uSunDir: { value: SUN_DIR } };

type Props = {
  // ถ้ามีค่า = กำลังจะเข้าหน้าสินค้า: หมุนโลกให้จุดนี้หันมาหากล้อง
  focus?: { lat: number; lon: number } | null;
};

export default function Earth({ focus }: Props) {
  const group = useRef<THREE.Group>(null);
  const targetRotation = useRef<number | null>(null);

  // โหลดภาพ 3 ภาพพร้อมกัน (ระหว่างโหลด React Suspense จะรอให้ครบก่อน)
  // ฟังก์ชันที่ส่งเป็นตัวที่ 2 ทำงานครั้งเดียวตอนโหลดเสร็จ ใช้ตั้งค่าภาพ
  const [day, night, clouds] = useTexture(
    ["/textures/earth-day.webp", "/textures/earth-night.webp", "/textures/earth-clouds.webp"],
    ([d, n, c]) => {
      d.colorSpace = THREE.SRGBColorSpace; // ภาพสีต้องบอกว่าเป็น sRGB สีจะได้ไม่ซีด
      n.colorSpace = THREE.SRGBColorSpace;
      c.wrapS = THREE.RepeatWrapping; // ให้เมฆเลื่อนวนรอบโลกได้ไม่มีรอยต่อ
      for (const t of [d, n, c]) t.anisotropy = 8; // ภาพคมขึ้นตอนมองเฉียงๆ
    },
  );

  // uniforms = ค่าที่ส่งจาก JavaScript เข้าไปใน shader
  // useMemo = สร้าง object นี้ครั้งเดียว (ไม่สร้างใหม่ทุกครั้งที่ React render)
  const uniforms = useMemo(
    () => ({
      uDay: { value: day },
      uNight: { value: night },
      uClouds: { value: clouds },
      uSunDir: { value: SUN_DIR },
      uCloudShift: { value: 0 },
    }),
    [day, night, clouds],
  );
  // ref ชี้ไปที่ material จริงในฉาก — ค่าที่ต้องเปลี่ยนทุกเฟรมให้แก้ผ่าน ref (กฎของ React)
  const surface = useRef<THREE.ShaderMaterial>(null);

  // useFrame ทำงานทุกเฟรม (~60 ครั้ง/วินาที) dt = เวลาที่ผ่านไปจากเฟรมก่อน (วินาที)
  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    if (surface.current) surface.current.uniforms.uCloudShift.value += dt * 0.0015;

    if (!focus) {
      targetRotation.current = null;
      g.rotation.y += dt * 0.012; // ปกติ: โลกหมุนช้าๆ
      return;
    }
    // กำลังเข้าหน้าสินค้า: คำนวณมุมเป้าหมายครั้งเดียว แล้วค่อยๆ หมุนไปหา
    if (targetRotation.current === null) {
      const azimuth = Math.atan2(camera.position.x - EARTH_CENTER.x, camera.position.z - EARTH_CENTER.z);
      const want = facingRotation(focus.lat, focus.lon, azimuth);
      // เลือกทางที่หมุนสั้นที่สุด (ไม่ให้โลกหมุนเกินครึ่งรอบ)
      const diff = THREE.MathUtils.euclideanModulo(want - g.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      targetRotation.current = g.rotation.y + diff;
    }
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetRotation.current, 4, dt);
  });

  return (
    <group ref={group} position={EARTH_CENTER}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 160, 96]} />
        <shaderMaterial
          ref={surface}
          vertexShader={vertex}
          fragmentShader={surfaceFragment}
          uniforms={uniforms}
        />
      </mesh>
      {/* ชั้นบรรยากาศ: วาดด้านใน (BackSide) + บวกสี (Additive) + ไม่บังวัตถุอื่น (depthWrite ปิด) */}
      <mesh scale={1.045}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 64]} />
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmosphereUniforms}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
