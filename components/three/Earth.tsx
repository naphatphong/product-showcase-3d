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
// ก่อนกดเริ่ม (หน้าเปิด) ฉากมืด: แสงมาจากหลังโลกเกือบตรงข้ามกล้อง → โลกฝั่งที่เห็นเป็นกลางคืน (เห็นไฟเมือง)
// เหลือแค่แถบโค้งบางๆ ตรงขอบโลกด้านซ้ายบนที่เริ่มโดนแดด เหมือนพระอาทิตย์กำลังจะขึ้น
const NIGHT_LIGHT = SUN_DIR.clone().addScaledVector(toCamera, -2.5).normalize();
// ความสว่างของฉาก: 0 = มืด (หน้าเปิด) → 1 = กลางวันเต็มที่ / Scene.tsx ค่อยๆ เพิ่มค่านี้ตอนสินค้าลอยเข้ามา
// เป็น object { value } แบบเดียวกับ uniform ของ shader จึงส่งให้ shader หลายตัวใช้ร่วมกันได้เลย
export const DAYLIGHT = { value: 0 };
// ทิศแสงบนผิวโลกตอนนี้: ไล่จาก NIGHT_LIGHT ไปหา EARTH_LIGHT ตาม DAYLIGHT
// → เส้นแบ่งกลางวัน/กลางคืนกวาดผ่านโลกจากขอบซ้ายบน (พระอาทิตย์ขึ้น) อัปเดตทุกเฟรมใน useFrame ด้านล่าง
const lightDir = EARTH_LIGHT.clone();

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
  // เมฆบางๆ (ค่าต่ำ) แทบใส มองทะลุเห็นพื้น ส่วนแกนเมฆหนาขาวชัด → เป็นก้อนๆ ไม่เป็นหมอกฟุ้งทั้งลูก
  float cloudAt(vec2 uv) {
    float c = bicubic(uClouds, uv, uCloudsSize).r;
    float b = texture2D(uClouds, uv, 2.0).r;
    return smoothstep(0.1, 0.95, clamp(c + (c - b) * 0.6, 0.0, 1.0));
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
    // ทะเลเป็นน้ำเงินกรมท่าเข้ม (ภาพต้นฉบับเกือบดำ) แล้วเพิ่มคอนทราสต์: ส่วนมืดมืดลง ส่วนสว่างสว่างขึ้น ไม่ดูซีดแบน
    float luma = dot(day, vec3(0.299, 0.587, 0.114));
    day = mix(vec3(luma), day, 0.9);
    day = mix(day, vec3(0.008, 0.035, 0.11), water * 0.5);
    day = pow(day, vec3(1.12)) * 1.1;

    // ---------- เมฆ (ติดไปกับพื้นโลก หมุนไปพร้อมกัน) ----------
    float clouds = cloudAt(vUv);
    // ทิศของแสงอาทิตย์บนแผนที่ (ตะวันออก/เหนือ ณ จุดนี้) → ใช้ทำเงาเมฆ และทำให้เมฆดูเป็นก้อนนูน
    vec3 no = normalize(vNormalO);
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), no) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(no, east);
    float cosLat = max(length(no.xz), 0.05);     // ใกล้ขั้วโลก ภาพแผนที่ถูกยืด → ระยะในแนวนอนต้องคูณชดเชย
    vec2 sunUv = vec2(dot(uSunObj, east) / cosLat, dot(uSunObj, north) * 2.0) * 0.0012;
    // เงาเมฆบนพื้น: เมฆที่อยู่ "ระหว่าง" จุดนี้กับดวงอาทิตย์บังแสง (ยิ่งแสงเฉียง เงายิ่งทอดยาว)
    float shadow = cloudAt(vUv + sunUv * (1.0 + (1.0 - lit) * 2.0)) * (1.0 - clouds);
    // ความนูนของเมฆ: ด้านที่หันเข้าหาดวงอาทิตย์สว่างกว่า ด้านหลังมืดกว่า (เทียบความหนาเมฆที่จุดนี้กับจุดเยื้องไปทางแสง)
    float relief = clamp((clouds - cloudAt(vUv + sunUv * 0.6)) * 2.5, -1.0, 1.0);

    // ---------- แสงด้านกลางวัน ----------
    vec3 ground = day * (0.06 + lit * 1.35) * (1.0 - shadow * 0.55);
    vec3 cloudCol = vec3(1.0, 0.99, 0.97) * (0.05 + lit * 1.45) * (0.94 - relief * 0.2);
    vec3 dayCol = mix(ground, cloudCol, clouds * 0.85); // 0.85 = แม้เมฆหนาสุดก็ยังเห็นพื้นข้างใต้จางๆ
    // แสงแดดสะท้อนผิวน้ำ (เฉพาะทะเลที่ไม่มีเมฆบัง)
    float glint = pow(max(dot(n, normalize(uSunDir + v)), 0.0), 70.0);
    dayCol += vec3(1.0, 0.92, 0.8) * glint * water * (1.0 - clouds) * 0.7;

    // ---------- ด้านกลางคืน ----------
    // แสงจันทร์/แสงดาวจางๆ สีน้ำเงิน: กลางคืนยังเห็นเมฆและแผ่นดินลางๆ ไม่ดำสนิท
    vec3 moon = mix(day * vec3(0.5, 0.65, 1.0), vec3(0.55, 0.65, 0.85), clouds * 0.85) * 0.07;
    // แสงไฟเมือง (โดนเมฆบังก็จางลง)
    vec3 night = bicubic(uNight, vUv, uNightSize).rgb;
    vec3 nightCol = moon + night * 2.2 * (1.0 - clouds * 0.7);

    vec3 col = mix(nightCol, dayCol, dayMix);

    // ---------- ชั้นบรรยากาศ (หัวใจของความสมจริง) ----------
    // แสงแดดกระเจิงในอากาศเป็นสีฟ้า (เหตุผลเดียวกับที่ท้องฟ้าเป็นสีฟ้า) ยิ่งมองเฉียงไปทางขอบโลก ยิ่งมองทะลุอากาศหนา ฟ้ายิ่งเข้ม
    // แต่อากาศ "ใส": ไม่ทาสีทับพื้น ใช้วิธี (1) พื้นมืดลงนิดหน่อยตามความหนาอากาศ (2) บวกแสงฟ้าที่กระเจิงเพิ่มเข้าไป
    // → ขอบโลกเป็นม่านฟ้าใสๆ ซ้อนทับ แต่ยังมองทะลุเห็นเมฆและพื้นจนถึงขอบ
    float airLit = max(smoothstep(-0.2, 0.6, sun), 0.15);  // กลางคืนยังเหลือม่านฟ้าจางๆ ที่ขอบ
    float depth = pow(1.0 - view, 2.0);                    // ความหนาของอากาศที่มองทะลุ (0 ตรงกลาง → 1 ที่ขอบ)
    float veil = pow(1.0 - view, 2.6);                     // ม่านฟ้า: เริ่มจางๆ ห่างจากขอบ แล้วเข้มขึ้นจนถึงขอบ
    vec3 airCol = mix(vec3(0.06, 0.2, 0.75), vec3(0.12, 0.38, 1.0), depth); // ฟ้าเข้มด้านใน → ฟ้าสดที่ขอบ (ไม่ขาว)
    col = col * (1.0 - depth * 0.35) + airCol * airLit * (0.03 + veil * 0.95);
    // แถบฟ้าเส้นบางๆ เลียดขอบโลกพอดี
    col += vec3(0.15, 0.4, 1.0) * pow(1.0 - view, 16.0) * (0.1 + 0.6 * airLit);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// shader ของชั้นบรรยากาศ: ทรงกลมใหญ่กว่าโลกนิดหน่อย วาดด้านใน (BackSide)
// แล้วเรืองแสงแบบบวกสี (additive) เห็นเป็นวงแสงสีฟ้าใสๆ รอบขอบโลก
const ATMO_SCALE = 1.04; // ขอบนอกของชั้นบรรยากาศ (เท่าของรัศมีโลก)
const atmosphereFragment = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uCenter;   // ศูนย์กลางโลก
  uniform float uRadius;  // รัศมีโลก
  uniform float uTop;     // รัศมีขอบนอกของชั้นบรรยากาศ
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    // เส้นสายตาจากกล้องผ่านพิกเซลนี้ เฉียดผิวโลกสูงแค่ไหน: 0 = เลียดผิวโลกพอดี → 1 = ขอบนอกของบรรยากาศ
    vec3 ray = normalize(vPosW - cameraPosition);
    vec3 oc = uCenter - cameraPosition;
    float h = length(oc - ray * dot(oc, ray));                  // ระยะใกล้สุดระหว่างเส้นสายตากับศูนย์กลางโลก
    float a = clamp((h - uRadius) / (uTop - uRadius), 0.0, 1.0);
    float core = exp(-a * 14.0);                                 // เส้นฟ้าสว่างบางๆ ชิดผิวโลก
    float halo = exp(-a * 3.0) * (1.0 - a);                      // ม่านฟ้าใสๆ ที่ค่อยๆ จางออกไปในอวกาศ
    float lit = smoothstep(-0.45, 0.5, dot(n, uSunDir));         // ด้านโดนแดดสว่างกว่า
    vec3 c = vec3(0.25, 0.55, 1.0) * core + vec3(0.05, 0.22, 1.0) * halo * 0.45;
    gl_FragColor = vec4(c * (0.2 + 1.3 * lit), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// ขนาดภาพเป็นพิกเซล (ภาพที่โหลดแล้วเป็น <img> หรือ ImageBitmap ซึ่งมี width/height ทั้งคู่)
const sizeOf = (t: THREE.Texture) => {
  const img = t.image as { width: number; height: number };
  return new THREE.Vector2(img.width, img.height);
};

// สร้างครั้งเดียวนอก component ได้ (lightDir เป็น Vector3 ตัวเดิมที่ useFrame แก้ค่าทุกเฟรม shader จึงเห็นค่าใหม่เอง)
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const atmosphereUniforms = {
  uSunDir: { value: lightDir },
  uCenter: { value: EARTH_CENTER },
  uRadius: { value: EARTH_RADIUS },
  uTop: { value: EARTH_RADIUS * ATMO_SCALE },
};

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
  // ภาพพื้นโลก กลางวัน/กลางคืน/เมฆ มี 2 ขนาด: 8K (8192×4096) สำหรับจอคอม โลกอยู่ใกล้กล้องมาก ภาพยิ่งละเอียดยิ่งคม
  // และ 4K สำหรับมือถือ หรือการ์ดจอที่รับภาพกว้าง 8192 ไม่ได้ (maxTextureSize = ขนาดภาพใหญ่สุดที่การ์ดจอรับได้)
  const maxSize = useThree((s) => s.gl.capabilities.maxTextureSize);
  const hd = !narrow && maxSize >= 8192 ? "-8k" : "";

  // โหลดภาพ 3 ภาพพร้อมกัน (ระหว่างโหลด React Suspense จะรอให้ครบก่อน)
  // ฟังก์ชันที่ส่งเป็นตัวที่ 2 ทำงานครั้งเดียวตอนโหลดเสร็จ ใช้ตั้งค่าภาพ
  const [day, night, clouds] = useTexture(
    [`/textures/earth-day${hd}.webp`, `/textures/earth-night${hd}.webp`, `/textures/earth-clouds${hd}.webp`],
    ([d, n, c]) => {
      d.colorSpace = THREE.SRGBColorSpace; // ภาพสีต้องบอกว่าเป็น sRGB สีจะได้ไม่ซีด
      n.colorSpace = THREE.SRGBColorSpace;
      c.wrapS = THREE.RepeatWrapping; // เงาเมฆอ่านภาพเยื้องไปข้างๆ ได้ แม้ตรงรอยต่อซ้าย-ขวาของภาพ
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
      uSunDir: { value: lightDir },
      uSunObj: { value: lightDir.clone() },
    }),
    [day, night, clouds],
  );
  // ref ชี้ไปที่ material จริงในฉาก — ค่าที่ต้องเปลี่ยนทุกเฟรมให้แก้ผ่าน ref (กฎของ React)
  const surface = useRef<THREE.ShaderMaterial>(null);

  // useFrame ทำงานทุกเฟรม (~60 ครั้ง/วินาที) dt = เวลาที่ผ่านไปจากเฟรมก่อน (วินาที)
  useFrame(({ camera }, dt) => {
    const g = group.current;
    if (!g) return;
    lightDir.copy(NIGHT_LIGHT).lerp(EARTH_LIGHT, DAYLIGHT.value).normalize();
    if (surface.current) {
      // ทิศแสงอาทิตย์เทียบกับลูกโลก = หมุนย้อนกลับเท่าที่โลกหมุนไป (โลกหมุนแค่รอบแกน Y)
      (surface.current.uniforms.uSunObj.value as THREE.Vector3).copy(lightDir).applyAxisAngle(Y_AXIS, -g.rotation.y);
    }

    if (!focus) {
      targetRotation.current = null;
      g.rotation.y += dt * 0.004; // ปกติ: โลกและเมฆหมุนไปพร้อมกันช้าๆ (โลกอยู่ใกล้มาก หมุนเร็วกว่านี้ผิวโลกจะไหลเร็วเกิน)
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
      <mesh scale={ATMO_SCALE}>
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
