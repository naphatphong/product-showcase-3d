import * as THREE from "three";

// ค่าที่เปลี่ยนสีของชิ้นส่วนรถ 1 ชิ้น (ใช้ทั้งหน้าเรื่องเล่า /f1 และหน้าโชว์รูม /f1/showroom)
// ghost: 0 = สีจริง, 1 = เทาอ่อนทั้งชิ้น (ตอนเน้นชิ้นอื่น)
// glow: 0 = ปกติ, 1 = ขอบชิ้นเรืองแสงสีแดง (ตอนเอาเมาส์ชี้ชิ้นนั้นในโชว์รูม)
export type Tint = { ghost: { value: number }; glow: { value: number } };

export const createTint = (): Tint => ({
  ghost: { value: 0 },
  glow: { value: 0 },
});

// แทรกโค้ดเล็กๆ ท้าย shader ของวัสดุเดิม (ยังเห็นแสงเงา/รายละเอียดของชิ้นอยู่ เหมือนโมเดลดินปั้นในภาพเขียนแบบ)
// - ghost: ผสมสีที่คำนวณแสงแล้วกับสีเทาอ่อน
// - glow: ขอบชิ้นที่หันเฉียงออกจากกล้อง (rim) สว่างขึ้นเป็นสีแดง — ใช้ได้เฉพาะวัสดุที่มีแสง (Standard/Physical)
export function addTint(material: THREE.Material, tint: Tint) {
  const lit = (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGhost = tint.ghost;
    shader.uniforms.uGlow = tint.glow;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform float uGhost;\nuniform float uGlow;\nvoid main() {")
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        ${
          lit
            ? `float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
        gl_FragColor.rgb += uGlow * (0.06 + 0.9 * rim) * vec3(1.0, 0.16, 0.08);`
            : ""
        }
        float luma = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.72 + 0.24 * luma), uGhost);`,
      );
  };
  // วัสดุชนิดเดียวกันใช้โค้ดแทรกเดียวกัน → บอก three.js ว่าใช้ shader ชุดเดียวกันได้ (ไม่ต้องสร้างใหม่ทีละวัสดุ)
  material.customProgramCacheKey = () => (lit ? "f1-tint-lit" : "f1-tint");
}
