"use client";

import * as THREE from "three";

// ฉากหลังของอวกาศ: ทรงกลมใหญ่ครอบทั้งฉาก (วาดด้านใน) ระบายสีด้วย shader แทนสีดำสนิท
// - พื้นเป็นน้ำเงินเข้มมาก (อวกาศจริงในภาพถ่ายไม่ได้ดำ 0,0,0)
// - แสงฟ้าเรืองจางๆ เหนือขอบโลก (ชั้นบรรยากาศสะท้อนแสงอาทิตย์) ทำให้ครึ่งล่างของจอสว่างขึ้น
// - เนบิวลาสีม่วงจางๆ มุมซ้ายบน ให้ท้องฟ้าไม่โล่งเกินไป
// ทรงกลมรัศมี 300 อยู่ไกลกว่าดาว (รัศมี 120–160) ดาวจึงยังอยู่ด้านหน้าฉากหลังนี้

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position; // ทรงกลมอยู่ที่จุดศูนย์กลางฉาก → ตำแหน่งบนผิว = ทิศที่มองออกไป
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// สีในนี้เป็นค่าแสงแบบ linear (ก่อนแปลงเป็น sRGB) ตัวเลขเล็กๆ จึงออกมาเป็นสีที่มองเห็นได้
const fragment = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    vec3 col = vec3(0.0012, 0.0016, 0.004);                                  // พื้นอวกาศ: น้ำเงินเกือบดำ
    float above = d.y + 0.16;                                                 // ระยะเหนือขอบโลก (ขอบโลกอยู่แถว y ≈ -0.16)
    float glow = exp(-above * above * 45.0) * smoothstep(0.3, -0.6, d.z);    // แถบเรืองเหนือขอบโลก ด้านหน้ากล้อง
    col += vec3(0.006, 0.016, 0.042) * glow;
    float neb = pow(max(dot(d, normalize(vec3(-0.55, 0.5, -0.67))), 0.0), 8.0); // เนบิวลามุมซ้ายบน
    col += vec3(0.008, 0.004, 0.018) * neb;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function Backdrop() {
  return (
    // renderOrder -1 + ไม่เขียน depth = วาดก่อนทุกอย่างและไม่บังอะไรเลย
    <mesh renderOrder={-1}>
      <sphereGeometry args={[300, 48, 24]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}
