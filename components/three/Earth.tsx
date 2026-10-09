"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

// ตำแหน่งและขนาดโลกในฉาก — โลกใหญ่มากและอยู่ใกล้กล้อง (กล้องลอยสูงจากผิวโลกราว 1 ใน 5 ของรัศมี)
// ศูนย์กลางโลกอยู่ขวาล่างนอกจอ → เห็นโลกเต็มครึ่งขวาล่าง ขอบโลกโค้งเฉียงจากซ้ายล่างขึ้นไปขวาบน (แบบภาพถ่ายจากวงโคจร)
// ตัวเลขคำนวณจากมุมกล้องปกติของจอกว้าง (VIEWS.wide ใน Scene.tsx): ทิศไปศูนย์กลางโลกเยื้องขวา 31° ก้มลง 41°
// และโลกกินมุมมอง 55° จากศูนย์กลาง — ย้ายกล้องเมื่อไรต้องคำนวณใหม่
export const EARTH_CENTER = new THREE.Vector3(21.98, -38.75, -29.91);
export const EARTH_RADIUS = 48;
// ทิศที่แสงอาทิตย์ส่องมา (ใช้ทั้ง shader ของโลกและไฟของสินค้า ให้แสงไปทางเดียวกัน)
// ดวงอาทิตย์อยู่เหนือขอบจอด้านบนค่อนซ้าย อยู่หลังโลกเล็กน้อย (ย้อนแสง): แถวขอบโลกเป็นกลางวันสว่าง
// ไล่มืดลงไปทางขวาล่างจนถึงช่วงพลบค่ำ (เห็นแสงไฟเมืองจางๆ) — ดูมีมิติกว่าโลกที่สว่างทั้งลูก
export const SUN_DIR = new THREE.Vector3(-0.32, 0.58, -0.75).normalize();
// ทิศแสงที่ใช้ระบายผิวโลกจริงๆ: เอียงจาก SUN_DIR มาทางกล้องราวครึ่งทาง (โลกในเว็บต้นแบบ edolus ก็สว่างทั้งลูกแบบนี้)
// ถ้าใช้ SUN_DIR ตรงๆ โลกครึ่งที่เราเห็นจะโดนแดดแค่ครึ่งเดียว อีกครึ่งเป็นพลบค่ำ → มืดทึบ ไม่เหมือนรูปถ่ายจากอวกาศ
// แบบนี้โลกส่วนที่เห็นสว่างทั้งหมด โดยขอบซ้ายบน (ฝั่งดวงอาทิตย์) ยังสว่างที่สุด ส่วนแฟลร์และฉากหลังยังใช้ SUN_DIR เหมือนเดิม
const toCamera = new THREE.Vector3(-0.8, -0.3, 8).sub(EARTH_CENTER).normalize(); // ทิศจากศูนย์กลางโลกไปหากล้อง (จอกว้าง)
export const EARTH_LIGHT = SUN_DIR.clone().addScaledVector(toCamera, 0.75).normalize(); // 0.75 = ยังเหลือเงามืดจางๆ ทางขวาล่าง โลกดูกลมมีมิติ

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
// vertex shader: ส่ง uv, normal (ทั้งของลูกโลกเอง และในโลก/world space) และตำแหน่งในโลก ไปให้ fragment shader
const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalO;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalO = normal;
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
  uniform vec2 uNightSize;  // ขนาดภาพ (พิกเซล) ใช้กับการกรองแบบ bicubic
  uniform vec2 uCloudsSize;
  uniform vec3 uSunDir;
  uniform vec3 uSunObj;     // ทิศแสงอาทิตย์เทียบกับลูกโลก (หมุนตามโลก) ใช้หาว่าเงาเมฆตกไปทางไหนบนแผนที่
  uniform float uCloudShift;
  varying vec2 vUv;
  varying vec3 vNormalO;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  // อ่านภาพแบบ bicubic (B-spline) จาก 4 จุดที่ GPU ผสมให้อยู่แล้ว (เทคนิคจาก GPU Gems 2 บทที่ 20)
  // กล้องอยู่ใกล้โลกมาก ภาพถูกขยายหลายเท่า — อ่านแบบปกติจะเห็นขอบเป็นสี่เหลี่ยม (โดยเฉพาะไฟเมืองจุดเล็กๆ)
  vec4 cubicWeights(float v) {
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
  }
  vec4 bicubic(sampler2D tex, vec2 uv, vec2 size) {
    vec2 st = uv * size - 0.5;
    vec2 f = fract(st);
    st -= f;
    vec4 xc = cubicWeights(f.x);
    vec4 yc = cubicWeights(f.y);
    vec4 c = st.xxyy + vec2(-0.5, 1.5).xyxy;
    vec4 w = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
    vec4 o = (c + vec4(xc.yw, yc.yw) / w) / size.xxyy;
    vec4 s0 = texture2D(tex, o.xz);
    vec4 s1 = texture2D(tex, o.yz);
    vec4 s2 = texture2D(tex, o.xw);
    vec4 s3 = texture2D(tex, o.yw);
    float sx = w.x / (w.x + w.y);
    float sy = w.z / (w.z + w.w);
    return mix(mix(s3, s2, sx), mix(s1, s0, sx), sy);
  }

  // อ่านเมฆแบบ bicubic + unsharp mask (ลบภาพเบลอจาก mipmap เล็กกว่า 2 ขั้น ได้เฉพาะขอบ แล้วบวกกลับ) + ดึงคอนทราสต์
  // ส่วนบางๆ ใสขึ้น ส่วนหนาขาวขึ้น เมฆจึงเป็นก้อนชัด ไม่เป็นหมอกฟุ้งทั้งลูก
  float cloudAt(vec2 uv) {
    float c = bicubic(uClouds, uv, uCloudsSize).r;
    float b = texture2D(uClouds, uv, 2.0).r;
    return smoothstep(0.06, 0.75, clamp(c + (c - b) * 0.8, 0.0, 1.0));
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float sun = dot(n, uSunDir);                 // 1 = แดดตรงหัว, ติดลบ = ด้านกลางคืน
    float lit = max(sun, 0.0);
    float dayMix = smoothstep(-0.18, 0.28, sun); // เส้นแบ่งกลางวัน/กลางคืนแบบนุ่มๆ
    float view = max(dot(n, v), 0.0);            // 1 = มองตรงลงไป, 0 = มองเฉียงเลียดขอบโลก

    // ---------- พื้นโลก ----------
    // unsharp mask แบบเบาๆ ให้ชายฝั่งและภูเขาคม / bias -0.5 = อ่านภาพละเอียดกว่าที่ GPU เลือกให้นิดหน่อย (แถวขอบโลก)
    vec3 day = texture2D(uDay, vUv, -0.5).rgb;
    vec3 dayBlur = texture2D(uDay, vUv, 2.0).rgb;
    day = clamp(day + (day - dayBlur) * 0.5, 0.0, 1.0);
    float water = smoothstep(0.015, 0.07, day.b - day.r); // ทะเลในภาพเป็นสีน้ำเงินเข้ม (น้ำเงิน > แดง)
    // มองจากอวกาศจริง แผ่นดินจะซีดและอมฟ้าเพราะอากาศหนาหลายสิบกิโลเมตรคั่นอยู่ → ลดความอิ่มสีแผ่นดินลงนิด
    // ทะเลจริงเป็นน้ำเงินเข้มสด ไม่ใช่เกือบดำแบบในภาพ → ยกสีทะเลขึ้น
    float luma = dot(day, vec3(0.299, 0.587, 0.114));
    day = mix(vec3(luma), day, 0.85);
    day = mix(day, vec3(0.015, 0.07, 0.19), water * 0.55);

    // ---------- เมฆ ----------
    vec2 cloudUv = vUv + vec2(uCloudShift, 0.0); // เมฆเลื่อนช้ากว่าพื้นโลก
    float clouds = cloudAt(cloudUv);
    // ทิศของแสงอาทิตย์บนแผนที่ (ตะวันออก/เหนือ ณ จุดนี้) → ใช้ทำเงาเมฆ และทำให้เมฆดูเป็นก้อนนูน
    vec3 no = normalize(vNormalO);
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), no) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(no, east);
    float cosLat = max(length(no.xz), 0.05);     // ใกล้ขั้วโลก ภาพแผนที่ถูกยืด → ระยะในแนวนอนต้องคูณชดเชย
    vec2 sunUv = vec2(dot(uSunObj, east) / cosLat, dot(uSunObj, north) * 2.0) * 0.0012;
    // เงาเมฆบนพื้น: เมฆที่อยู่ "ระหว่าง" จุดนี้กับดวงอาทิตย์บังแสง (ยิ่งแสงเฉียง เงายิ่งทอดยาว)
    float shadow = cloudAt(cloudUv + sunUv * (1.0 + (1.0 - lit) * 2.0)) * (1.0 - clouds);
    // ความนูนของเมฆ: ด้านที่หันเข้าหาดวงอาทิตย์สว่างกว่า ด้านหลังมืดกว่า (เทียบความหนาเมฆที่จุดนี้กับจุดเยื้องไปทางแสง)
    float relief = clamp((clouds - cloudAt(cloudUv + sunUv * 0.6)) * 2.5, -1.0, 1.0);

    // ---------- แสงด้านกลางวัน ----------
    vec3 ground = day * (0.06 + lit * 1.35) * (1.0 - shadow * 0.55);
    vec3 cloudCol = vec3(1.0, 0.99, 0.97) * (0.05 + lit * 1.35) * (0.94 - relief * 0.2);
    vec3 dayCol = mix(ground, cloudCol, clouds * 0.95);
    // แสงแดดสะท้อนผิวน้ำ (เฉพาะทะเลที่ไม่มีเมฆบัง)
    float glint = pow(max(dot(n, normalize(uSunDir + v)), 0.0), 70.0);
    dayCol += vec3(1.0, 0.92, 0.8) * glint * water * (1.0 - clouds) * 0.7;

    // ---------- ด้านกลางคืน: แสงไฟเมือง (โดนเมฆบังก็จางลง) ----------
    vec3 night = bicubic(uNight, vUv, uNightSize).rgb;
    vec3 nightCol = night * 1.5 * (1.0 - clouds * 0.8);

    vec3 col = mix(nightCol, dayCol, dayMix);

    // ---------- ชั้นบรรยากาศ (หัวใจของความสมจริง) ----------
    // แสงแดดกระเจิงในอากาศเป็นสีฟ้า (เหตุผลเดียวกับที่ท้องฟ้าเป็นสีฟ้า) ทั้งลูกจึงมีม่านฟ้าบางๆ ทับอยู่
    // และยิ่งมองเฉียงไปทางขอบโลก ยิ่งมองทะลุอากาศหนา ม่านฟ้ายิ่งทึบจนกลืนพื้นด้านล่าง
    float airLit = smoothstep(-0.2, 0.6, sun);
    float depth = pow(1.0 - view, 1.9);                    // ความหนาของอากาศที่มองทะลุ (0 ตรงกลาง → 1 ที่ขอบ)
    vec3 airCol = mix(vec3(0.16, 0.36, 0.78), vec3(0.62, 0.8, 1.0), depth); // ฟ้าเข้มด้านใน → ฟ้าอ่อนเกือบขาวที่ขอบ
    col = mix(col, airCol * airLit, clamp(0.06 + depth * 0.9, 0.0, 0.92) * airLit);
    // แถบสว่างเส้นบางๆ เลียดขอบโลกพอดี
    col += vec3(0.45, 0.68, 1.0) * pow(1.0 - view, 5.0) * (0.1 + 1.2 * airLit);

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
    float glow = pow(1.0 - smoothstep(-0.36, 0.0, d), 2.6);      // สว่างสุดชิดผิวโลก แล้วจางออก
    float lit = smoothstep(-0.45, 0.5, dot(n, uSunDir));         // ด้านโดนแดดสว่างกว่า
    vec3 c = mix(vec3(0.3, 0.58, 1.0), vec3(0.75, 0.88, 1.0), glow); // ชิดผิวโลกเกือบขาว ด้านนอกฟ้าเข้ม
    gl_FragColor = vec4(c * glow * (0.12 + 1.9 * lit), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// ขนาดภาพเป็นพิกเซล (ภาพที่โหลดแล้วเป็น <img> หรือ ImageBitmap ซึ่งมี width/height ทั้งคู่)
const sizeOf = (t: THREE.Texture) => {
  const img = t.image as { width: number; height: number };
  return new THREE.Vector2(img.width, img.height);
};

// ค่าคงที่ ไม่เปลี่ยนเลย สร้างไว้นอก component ได้
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const atmosphereUniforms = { uSunDir: { value: EARTH_LIGHT } };

type Props = {
  // ถ้ามีค่า = กำลังจะเข้าหน้าสินค้า: หมุนโลกให้จุดนี้หันมาหากล้อง
  focus?: { lat: number; lon: number } | null;
  narrow?: boolean; // จอแคบ (มือถือ) → ใช้ภาพ 4K พอ ประหยัดเน็ตและหน่วยความจำ
};

// มุมเริ่มต้นของโลก: หมุนให้ยุโรป (ละติจูด 48° ลองจิจูด 15°) อยู่ใต้กล้อง — เห็นทั้งแผ่นดิน ทะเล และเมฆ
const camAzimuth = Math.atan2(-0.8 - EARTH_CENTER.x, 8 - EARTH_CENTER.z); // ทิศของกล้องจอกว้าง มองจากศูนย์กลางโลก
const START_ROTATION = facingRotation(48, 15, camAzimuth);

export default function Earth({ focus, narrow = false }: Props) {
  const group = useRef<THREE.Group>(null);
  const targetRotation = useRef<number | null>(null);
  // ภาพพื้นโลกกลางวัน/กลางคืนมี 2 ขนาด: 8K (8192×4096) สำหรับจอคอม โลกอยู่ใกล้กล้องมาก ภาพยิ่งละเอียดยิ่งคม
  // และ 4K สำหรับมือถือ หรือการ์ดจอที่รับภาพกว้าง 8192 ไม่ได้ (maxTextureSize = ขนาดภาพใหญ่สุดที่การ์ดจอรับได้)
  const maxSize = useThree((s) => s.gl.capabilities.maxTextureSize);
  const hd = !narrow && maxSize >= 8192 ? "-8k" : "";

  // โหลดภาพ 3 ภาพพร้อมกัน (ระหว่างโหลด React Suspense จะรอให้ครบก่อน)
  // ฟังก์ชันที่ส่งเป็นตัวที่ 2 ทำงานครั้งเดียวตอนโหลดเสร็จ ใช้ตั้งค่าภาพ
  const [day, night, clouds] = useTexture(
    [`/textures/earth-day${hd}.webp`, `/textures/earth-night${hd}.webp`, "/textures/earth-clouds.webp"],
    ([d, n, c]) => {
      d.colorSpace = THREE.SRGBColorSpace; // ภาพสีต้องบอกว่าเป็น sRGB สีจะได้ไม่ซีด
      n.colorSpace = THREE.SRGBColorSpace;
      c.wrapS = THREE.RepeatWrapping; // ให้เมฆเลื่อนวนรอบโลกได้ไม่มีรอยต่อ
      for (const t of [d, n, c]) t.anisotropy = 16; // ภาพคมขึ้นตอนมองเฉียงๆ (three.js ลดให้เองถ้าเครื่องรองรับไม่ถึง)
    },
  );

  // uniforms = ค่าที่ส่งจาก JavaScript เข้าไปใน shader
  // useMemo = สร้าง object นี้ครั้งเดียว (ไม่สร้างใหม่ทุกครั้งที่ React render)
  const uniforms = useMemo(
    () => ({
      uDay: { value: day },
      uNight: { value: night },
      uClouds: { value: clouds },
      uNightSize: { value: sizeOf(night) },
      uCloudsSize: { value: sizeOf(clouds) },
      uSunDir: { value: EARTH_LIGHT },
      uSunObj: { value: EARTH_LIGHT.clone() },
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
    if (surface.current) {
      surface.current.uniforms.uCloudShift.value += dt * 0.0004;
      // ทิศแสงอาทิตย์เทียบกับลูกโลก = หมุนย้อนกลับเท่าที่โลกหมุนไป (โลกหมุนแค่รอบแกน Y)
      (surface.current.uniforms.uSunObj.value as THREE.Vector3).copy(EARTH_LIGHT).applyAxisAngle(Y_AXIS, -g.rotation.y);
    }

    if (!focus) {
      targetRotation.current = null;
      g.rotation.y += dt * 0.004; // ปกติ: โลกหมุนช้าๆ (โลกอยู่ใกล้มาก หมุนเร็วกว่านี้ผิวโลกจะไหลเร็วเกิน)
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
    <group ref={group} position={EARTH_CENTER} rotation-y={START_ROTATION}>
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
      <mesh scale={1.03}>
        <sphereGeometry args={[EARTH_RADIUS, 160, 80]} />
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
