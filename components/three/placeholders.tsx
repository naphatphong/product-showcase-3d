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

// ---------------- 1) กระป๋องเครื่องดื่ม ----------------
export function DrinkPlaceholder({ accent }: { accent: string }) {
  const { geometry, map } = useMemo(() => {
    // เส้นขอบกระป๋อง (ครึ่งซีก) จากก้นขึ้นไปฝา แล้ว LatheGeometry จะหมุนรอบแกน Y ให้เป็นทรงกระบอก
    const r = 0.33;
    const h = 1.22;
    const raw: [number, number][] = [
      [0, 0.05],
      [0.12, 0.035],
      [0.22, 0.012],
      [0.27, 0],
      [0.3, 0.006],
      [0.322, 0.03],
      [r, 0.09], // ก้น
      [r, h - 0.17], // ตัวกระป๋อง (ส่วนที่มีฉลาก)
      [0.3, h - 0.07],
      [0.286, h - 0.02],
      [0.29, h],
      [0.282, h + 0.012],
      [0.27, h - 0.006],
      [0.25, h - 0.02],
      [0, h - 0.03], // คอ + ฝา
    ];
    // เกลี่ยจุดให้ห่างเท่าๆ กันตามความยาวเส้น เพื่อให้ฉลากไม่ยืด (uv แนวตั้งของ Lathe นับตามลำดับจุด)
    const cum = [0];
    for (let i = 1; i < raw.length; i++)
      cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    const L = cum[cum.length - 1];
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k <= 160; k++) {
      const t = (k / 160) * L;
      let i = 1;
      while (cum[i] < t && i < cum.length - 1) i++;
      const f = (t - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      pts.push(
        new THREE.Vector2(
          raw[i - 1][0] + (raw[i][0] - raw[i - 1][0]) * f,
          raw[i - 1][1] + (raw[i][1] - raw[i - 1][1]) * f,
        ),
      );
    }
    // ช่วงของตัวกระป๋องบนภาพฉลาก (0 = ก้น, 1 = ฝา)
    const v0 = cum[6] / L;
    const v1 = cum[7] / L;
    const W = 2048;
    const H = Math.round((W * L) / (2 * Math.PI * r)); // สัดส่วนภาพ = สัดส่วนผิวกระป๋อง ตัวหนังสือจะไม่เบี้ยว

    const map = canvasTexture(W, H, (c) => {
      c.fillStyle = "#c4c7cc"; // อลูมิเนียมที่ก้นและฝา
      c.fillRect(0, 0, W, H);
      const y0 = (1 - v1) * H;
      const y1 = (1 - v0) * H;
      c.fillStyle = "#0c0c0d"; // ตัวกระป๋องดำ
      c.fillRect(0, y0, W, y1 - y0);
      // ลายเฉียงแบบดุดัน 3 เส้น (สีประจำสินค้า)
      c.strokeStyle = accent;
      c.lineWidth = 26;
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.moveTo(W / 2 - 330 + k * 70, y1 - 40);
        c.lineTo(W / 2 - 120 + k * 70, y0 + 40);
        c.stroke();
      }
      // ชื่อแบรนด์แนวตั้ง
      c.save();
      c.translate(W / 2 + 120, (y0 + y1) / 2);
      c.rotate(-Math.PI / 2);
      c.fillStyle = "#f2f2f2";
      c.font = "900 170px Arial, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("VOLTRA", 0, 0);
      c.restore();
    });
    map.wrapS = THREE.RepeatWrapping;
    map.offset.x = 0.5; // ให้กลางฉลากหันมาด้านหน้า (+Z)
    return { geometry: new THREE.LatheGeometry(pts, 128), map };
  }, [accent]);

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        map={map}
        metalness={0.85}
        roughness={0.32}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
      />
    </mesh>
  );
}

// ---------------- 2) นาฬิกา ----------------
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
