"use client";

import * as THREE from "three";
import { DAYLIGHT, EARTH_CENTER, EARTH_RADIUS, SUN_DIR } from "./Earth";

// ฉากหลังของอวกาศ: ทรงกลมใหญ่ครอบทั้งฉาก (วาดด้านใน) ระบายสีด้วย shader แทนสีดำสนิท
// - พื้นเป็นน้ำเงินเข้มมาก (อวกาศจริงในภาพถ่ายไม่ได้ดำ 0,0,0)
// - แสงฟ้าจากขอบโลกฟุ้งออกไปในอวกาศ ค่อยๆ จางลงตามระยะ (ชั้นบรรยากาศกระเจิงแสงอาทิตย์) ด้านที่โดนแดดสว่างกว่า
// - แสงอุ่นๆ จางๆ ทางดวงอาทิตย์ (มุมซ้ายบน) + เนบิวลาสีม่วงจางๆ ให้ท้องฟ้าไม่โล่งเกินไป
// ทรงกลมรัศมี 300 อยู่ไกลกว่าดาว (รัศมี 120–160) ดาวจึงยังอยู่ด้านหน้าฉากหลังนี้

const vertex = /* glsl */ `
  varying vec3 vPosW;
  void main() {
    vPosW = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vPosW, 1.0);
  }
`;

// สีในนี้เป็นค่าแสงแบบ linear (ก่อนแปลงเป็น sRGB) ตัวเลขเล็กๆ จึงออกมาเป็นสีที่มองเห็นได้
// คิดทิศจากตำแหน่งกล้องจริง (cameraPosition) → แสงแนบขอบโลกพอดีทุกมุมกล้อง
const fragment = /* glsl */ `
  uniform vec3 uEarth;
  uniform float uRadius;
  uniform vec3 uSunDir;
  uniform float uDaylight; // 0 = หน้าเปิด (มืด) → 1 = กลางวัน
  varying vec3 vPosW;
  void main() {
    vec3 d = normalize(vPosW - cameraPosition);
    vec3 toEarth = uEarth - cameraPosition;
    float limb = asin(uRadius / length(toEarth));                 // รัศมีเชิงมุมของโลกที่กล้องเห็น
    float off = acos(dot(d, normalize(toEarth))) - limb;          // ห่างจากขอบโลกออกไปกี่เรเดียน
    vec3 col = vec3(0.0018, 0.0026, 0.0065);                       // พื้นอวกาศ: น้ำเงินเกือบดำ
    // แสงฟ้าจากขอบโลกฟุ้งออกไปในอวกาศ: ชิดขอบโลกสว่างสุด แล้วค่อยๆ จางลงตามระยะ
    // ผสม 2 ชั้น: ชั้นใกล้ขอบจางเร็ว (exp −10) + ชั้นฟุ้งไกลจางช้า (exp −3) → ไล่ระดับนุ่มๆ ไม่เป็นเส้นขอบ
    // ฝั่งดวงอาทิตย์ (ซ้ายบน) สว่างกว่า / หน้าเปิด (กลางคืน) จางกว่าตอนกลางวัน
    float lit = (0.45 + 0.55 * smoothstep(-0.6, 0.6, dot(d, uSunDir))) * (0.45 + 0.55 * uDaylight);
    float o = max(off, 0.0);
    col += vec3(0.012, 0.045, 0.16) * (0.6 * exp(-o * 10.0) + 0.4 * exp(-o * 3.0)) * lit;
    float sun = max(dot(d, uSunDir), 0.0);
    col += vec3(0.03, 0.014, 0.004) * pow(sun, 6.0) * (0.3 + 0.7 * uDaylight); // แสงอุ่นทางดวงอาทิตย์
    float neb = pow(max(dot(d, normalize(vec3(-0.2, 0.75, -0.6))), 0.0), 10.0);
    col += vec3(0.006, 0.003, 0.014) * neb;                        // เนบิวลาด้านบน
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// สร้างครั้งเดียวนอก component ได้ (ค่าที่เปลี่ยน คือ uDaylight เป็น object ที่ Scene.tsx แก้ value ให้เองทุกเฟรม)
const uniforms = {
  uEarth: { value: EARTH_CENTER },
  uRadius: { value: EARTH_RADIUS },
  uSunDir: { value: SUN_DIR },
  uDaylight: DAYLIGHT, // object เดียวกับที่ Scene.tsx อัปเดตทุกเฟรม ค่าในนี้จึงเปลี่ยนตามเอง
};

export default function Backdrop() {
  return (
    // renderOrder -1 + ไม่เขียน depth = วาดก่อนทุกอย่างและไม่บังอะไรเลย
    <mesh renderOrder={-1}>
      <sphereGeometry args={[300, 64, 32]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
