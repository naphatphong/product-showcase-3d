"use client";

import * as THREE from "three";
import { EARTH_CENTER, EARTH_RADIUS, SUN_DIR } from "./Earth";

// ฉากหลังของอวกาศ: ทรงกลมใหญ่ครอบทั้งฉาก (วาดด้านใน) ระบายสีด้วย shader แทนสีดำสนิท
// - พื้นเป็นน้ำเงินเข้มมาก (อวกาศจริงในภาพถ่ายไม่ได้ดำ 0,0,0)
// - แสงฟ้าเรืองจางๆ แนบขอบโลก (ชั้นบรรยากาศสะท้อนแสงอาทิตย์) ด้านที่โดนแดดสว่างกว่า
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
  varying vec3 vPosW;
  void main() {
    vec3 d = normalize(vPosW - cameraPosition);
    vec3 toEarth = uEarth - cameraPosition;
    float limb = asin(uRadius / length(toEarth));                 // รัศมีเชิงมุมของโลกที่กล้องเห็น
    float off = acos(dot(d, normalize(toEarth))) - limb;          // ห่างจากขอบโลกออกไปกี่เรเดียน
    vec3 col = vec3(0.0012, 0.0016, 0.004);                        // พื้นอวกาศ: น้ำเงินเกือบดำ
    float lit = 0.25 + 0.75 * smoothstep(-0.6, 0.6, dot(d, uSunDir));
    col += vec3(0.008, 0.022, 0.06) * exp(-max(off, 0.0) * 9.0) * lit; // แสงฟ้าแนบขอบโลก
    float sun = max(dot(d, uSunDir), 0.0);
    col += vec3(0.03, 0.014, 0.004) * pow(sun, 6.0);              // แสงอุ่นทางดวงอาทิตย์
    float neb = pow(max(dot(d, normalize(vec3(-0.2, 0.75, -0.6))), 0.0), 10.0);
    col += vec3(0.006, 0.003, 0.014) * neb;                        // เนบิวลาด้านบน
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// ค่าคงที่ ไม่เปลี่ยนเลย สร้างไว้นอก component ได้
const uniforms = {
  uEarth: { value: EARTH_CENTER },
  uRadius: { value: EARTH_RADIUS },
  uSunDir: { value: SUN_DIR },
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
