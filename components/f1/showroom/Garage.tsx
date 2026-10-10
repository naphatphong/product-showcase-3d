"use client";

import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

// ห้องอู่รถแข่ง (สร้างจากโค้ดล้วน ไม่มีไฟล์โมเดล): พื้นอีพ็อกซี่สีเทาเข้มเงาวับ, ผนังหลังเป็นแผ่นเหล็กสีเข้ม
// มีตัวหนังสือ GRID 26 บนผนัง, ตู้เครื่องมือ และยางซ้อนกัน
// หน่วยเป็นเมตร: พื้นอยู่ที่ y = 0, ผนังหลังที่ z = WALL_Z, ด้านหน้า (z บวก) เปิดออกไปทาง pit lane ที่กล้องอยู่
// ขนาดห้องใช้ใน ShowroomScene.tsx ด้วย (กันกล้องหมุนทะลุผนัง/เพดาน)

export const WALL_Z = -8.5;
export const FRONT_Z = 12;
export const HALF_W = 15;
export const CEILING = 6.2;
const WIDTH = HALF_W * 2;
const DEPTH = FRONT_Z - WALL_Z;
const MID_Z = (FRONT_Z + WALL_Z) / 2;

// วาดลงผืนผ้าใบ (canvas) แล้วใช้เป็นรูปบนพื้นผิว 3D — ตัวหนังสือ/ลายเส้นไม่ต้องโหลดไฟล์รูปเพิ่ม
function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function Garage({ narrow }: { narrow: boolean }) {
  return (
    <group>
      <Floor narrow={narrow} />
      <Walls />
      {/* ของในอู่: ชิดผนังหลัง + บางชิ้นวางใกล้รถ ให้เหมือนอู่ที่ใช้งานอยู่จริง */}
      <ToolChest x={-6.3} z={WALL_Z + 0.4} />
      <ToolChest x={6.3} z={WALL_Z + 0.4} />
      <ToolChest x={8.9} z={1.3} rot={-0.55} />
      <TyreStack x={-10.4} z={WALL_Z + 0.9} band="#e10600" />
      <TyreStack x={-11.3} z={WALL_Z + 0.75} band="#ffd31a" />
      <TyreStack x={10.5} z={WALL_Z + 0.85} band="#f2f2f2" />
      <TyreStack x={-8.6} z={1.6} band="#e10600" />
      <TyreStack x={-9.35} z={2.2} band="#e10600" />
      <TyreStack x={3.4} z={-4.6} band="#ffd31a" />
      <CeilingLights />
    </group>
  );
}

// พื้น: คอม = สะท้อนเงารถกับไฟจริงแบบเบลอๆ (MeshReflectorMaterial วาดฉากกลับหัวอีกรอบ) / มือถือ = พื้นมันธรรมดา ประหยัดแรงเครื่อง
// ด้านบนพื้นมีเส้นกริดจางๆ ของแผ่นพื้น
function Floor({ narrow }: { narrow: boolean }) {
  const lines = useMemo(() => {
    const t = canvasTexture(1024, 1024, (g) => {
      g.clearRect(0, 0, 1024, 1024);
      g.strokeStyle = "rgba(255,255,255,0.07)";
      g.lineWidth = 3;
      for (let i = 0; i <= 1024; i += 128) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i, 1024);
        g.moveTo(0, i);
        g.lineTo(1024, i);
        g.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(WIDTH / 12, DEPTH / 12);
    return t;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, MID_Z]}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        {narrow ? (
          <meshStandardMaterial color="#34363b" roughness={0.28} metalness={0.3} />
        ) : (
          <MeshReflectorMaterial
            color="#34363b"
            roughness={0.45}
            metalness={0.4}
            blur={[260, 70]}
            resolution={768}
            mixBlur={0.8}
            mixStrength={14}
            depthScale={1}
            minDepthThreshold={0.6}
            maxDepthThreshold={1.6}
            mirror={0}
          />
        )}
      </mesh>
      {/* เส้นกริดของแผ่นพื้น */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.002, MID_Z]}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshBasicMaterial map={lines} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

// ผนังหลัง + ผนังข้าง + เพดาน: แผ่นเหล็กสีเทาเข้ม รอยต่อแผ่นทุก 2.4 ม., ตัวหนังสือ GRID 26 ทาบนผนัง
function Walls() {
  const sign = useMemo(
    () =>
      canvasTexture(2048, 256, (g) => {
        g.clearRect(0, 0, 2048, 256);
        g.fillStyle = "#e10600";
        g.fillRect(40, 70, 110, 110);
        g.fillStyle = "rgba(240,240,236,0.9)";
        g.font = "800 190px 'Arial Narrow', Arial, sans-serif";
        g.textBaseline = "middle";
        g.fillText("GRID 26", 190, 134);
        g.font = "500 44px ui-monospace, Menlo, monospace";
        g.fillStyle = "rgba(240,240,236,0.45)";
        g.fillText("GARAGE · 1:18 SCALE MODELS · 2026 SEASON", 1000, 134);
      }),
    [],
  );
  const seams = [];
  for (let x = -WIDTH / 2; x <= WIDTH / 2; x += 2.4) seams.push(x);

  return (
    <group>
      <mesh position={[0, CEILING / 2, WALL_Z]}>
        <planeGeometry args={[WIDTH, CEILING]} />
        <meshStandardMaterial color="#33363c" roughness={0.6} metalness={0.3} />
      </mesh>
      {seams.map((x) => (
        <mesh key={x} position={[x, CEILING / 2, WALL_Z + 0.01]}>
          <planeGeometry args={[0.03, CEILING]} />
          <meshBasicMaterial color="#0b0b0d" />
        </mesh>
      ))}
      {/* แถบล่างของผนัง (กันกระแทก) สีเทาเข้มกว่า */}
      <mesh position={[0, 0.5, WALL_Z + 0.02]}>
        <planeGeometry args={[WIDTH, 1]} />
        <meshStandardMaterial color="#1b1c20" roughness={0.8} />
      </mesh>
      <mesh position={[-1.2, 4.75, WALL_Z + 0.03]}>
        <planeGeometry args={[11, 11 / 8]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>
      {/* ผนังข้าง */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HALF_W, CEILING / 2, MID_Z]} rotation-y={(-s * Math.PI) / 2}>
          <planeGeometry args={[DEPTH, CEILING]} />
          <meshStandardMaterial color="#232529" roughness={0.7} />
        </mesh>
      ))}
      {/* เพดาน */}
      <mesh position={[0, CEILING, MID_Z]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshStandardMaterial color="#101113" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ไฟเพดาน: แผงไฟยาวเรียงเป็นแถว (เห็นเป็นแถบสว่างด้านบน + สะท้อนบนพื้นมัน)
function CeilingLights() {
  const bars = [];
  for (let x = -10.5; x <= 10.5; x += 3.5) for (const z of [-5.4, -1.4, 2.6]) bars.push([x, z]);
  return (
    <group>
      {bars.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, CEILING - 0.05, z]}>
          <boxGeometry args={[2.4, 0.06, 0.22]} />
          <meshBasicMaterial color="#dfe5f2" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ตู้เครื่องมือสีแดง: กล่อง + ร่องลิ้นชัก 5 ชั้น + มือจับสีเงิน
function ToolChest({ x, z, rot = 0 }: { x: number; z: number; rot?: number }) {
  const drawers = [0.18, 0.36, 0.54, 0.72, 0.88];
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.3, 1.0, 0.6]} />
        <meshStandardMaterial color="#9c1414" roughness={0.38} metalness={0.45} />
      </mesh>
      {drawers.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.302]}>
            <planeGeometry args={[1.24, 0.012]} />
            <meshBasicMaterial color="#2a0505" />
          </mesh>
          <mesh position={[0, y + 0.07, 0.31]}>
            <boxGeometry args={[0.5, 0.025, 0.02]} />
            <meshStandardMaterial color="#c9ccd2" roughness={0.25} metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* ล้อเลื่อนของตู้ */}
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 0.05, 0.2]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}

// ยางซ้อนกัน 4 เส้น + แถบสีบอกชนิดยาง (แดง = นิ่ม, เหลือง = กลาง, ขาว = แข็ง)
function TyreStack({ x, z, band }: { x: number; z: number; band: string }) {
  return (
    <group position={[x, 0, z]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0.19 + i * 0.37, 0]} rotation-y={i * 0.7}>
          <mesh>
            <cylinderGeometry args={[0.36, 0.36, 0.36, 40, 1, true]} />
            <meshStandardMaterial color="#121212" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.181, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.2, 0.36, 40]} />
            <meshStandardMaterial color="#151515" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.183, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.29, 0.305, 48]} />
            <meshStandardMaterial color={band} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
