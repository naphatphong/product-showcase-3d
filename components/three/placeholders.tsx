"use client";

// โมเดลชั่วคราว (placeholder) สร้างด้วยโค้ด — ใช้ระหว่างรอโมเดลจริงที่ผู้ใช้จะเจนมาให้
// ทุกชิ้นตั้งจุดกำเนิด (0,0,0) ไว้ที่ "ก้นสินค้า" ตรงกลาง จัดตำแหน่งลอยได้ง่าย
// ขนาดรวมแต่ละชิ้นไม่เกิน ~2 หน่วยกว้าง และ ~1.3 หน่วยสูง

import { useMemo } from "react";
import * as THREE from "three";

// สร้าง texture จากการวาดบน <canvas> 2D (ใช้ทำฉลาก/หน้าปัด โดยไม่ต้องมีไฟล์ภาพ)
function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d")!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------------- นาฬิกา ----------------
export function WatchPlaceholder() {
  const parts = useMemo(() => {
    // ตัวเรือน: เส้นขอบครึ่งซีก หมุนรอบแกน แล้วพลิกให้หน้าปัดหันมาทาง +Z
    const caseGeo = new THREE.LatheGeometry(
      [
        [0, -0.075],
        [0.38, -0.075],
        [0.43, -0.06],
        [0.455, -0.02],
        [0.455, 0.03],
        [0.44, 0.06],
        [0.415, 0.075],
        [0.4, 0.078],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      128,
    );
    caseGeo.rotateX(Math.PI / 2);

    const dial = canvasTexture(1024, 1024, (c) => {
      c.fillStyle = "#ece8e0";
      c.fillRect(0, 0, 1024, 1024);
      c.translate(512, 512);
      for (let k = 0; k < 60; k++) {
        c.save();
        c.rotate((k / 60) * Math.PI * 2);
        c.fillStyle = "#2a241e";
        c.fillRect(-2, -470, 4, k % 5 ? 14 : 24);
        c.restore();
      }
      c.fillStyle = "#2a241e";
      c.textAlign = "center";
      c.font = "500 60px Georgia, serif";
      c.fillText("ORLÉ", 0, -150);
    });

    // สายหนัง: กล่องยาวแบ่งหลายช่วง แล้วดัดให้โค้งไปด้านหลังเป็นครึ่งวงกลม
    const strap = (dir: 1 | -1) => {
      const R = 0.4;
      const len = Math.PI * R;
      const g = new THREE.BoxGeometry(0.3, len, 0.05, 1, 80, 1);
      g.translate(0, len / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        const a = y / R; // ความยาวที่เดินไปตามสาย → มุมบนวงกลม
        const d = R + z;
        p.setXYZ(i, x * (1 - (0.18 * y) / len), dir * d * Math.sin(a), -R + d * Math.cos(a));
      }
      g.computeVertexNormals();
      return g;
    };
    return { caseGeo, dial, strapTop: strap(1), strapBottom: strap(-1) };
  }, []);

  const gold = <meshPhysicalMaterial color="#e3c07e" metalness={1} roughness={0.18} clearcoat={0.4} />;
  return (
    // ยกขึ้นให้ก้นสายด้านล่างอยู่ที่ y = 0 และเอียงเล็กน้อยให้เห็นมิติ
    <group position={[0, 0.88, 0]} rotation={[-0.08, 0, 0.06]}>
      <mesh geometry={parts.caseGeo}>{gold}</mesh>
      <mesh position={[0, 0, 0.05]}>
        <circleGeometry args={[0.4, 96]} />
        <meshStandardMaterial map={parts.dial} metalness={0.2} roughness={0.4} />
      </mesh>
      {/* เข็มชั่วโมง + เข็มนาที */}
      <mesh position={[0.06, 0.07, 0.07]} rotation={[0, 0, -0.9]}>
        <boxGeometry args={[0.03, 0.22, 0.01]} />
        {gold}
      </mesh>
      <mesh position={[-0.11, 0.08, 0.075]} rotation={[0, 0, 0.95]}>
        <boxGeometry args={[0.022, 0.32, 0.01]} />
        {gold}
      </mesh>
      {/* เม็ดมะยม (ปุ่มหมุนข้างตัวเรือน) */}
      <mesh position={[0.49, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 32]} />
        {gold}
      </mesh>
      <mesh geometry={parts.strapTop} position={[0, 0.45, -0.035]}>
        <meshPhysicalMaterial color="#3a2417" roughness={0.55} sheen={0.4} />
      </mesh>
      <mesh geometry={parts.strapBottom} position={[0, -0.45, -0.035]}>
        <meshPhysicalMaterial color="#3a2417" roughness={0.55} sheen={0.4} />
      </mesh>
    </group>
  );
}
