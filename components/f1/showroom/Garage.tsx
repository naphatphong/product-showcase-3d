"use client";

import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

// ห้องอู่รถแข่ง (สร้างจากโค้ดล้วน ไม่มีไฟล์โมเดล): พื้นอีพ็อกซี่สีเทาเข้มเงาวับ, ผนังหลังเป็นแผ่นเหล็กสีเข้ม
// มีแถบไฟ LED, ตัวหนังสือ GRID 26, จอมอนิเตอร์, ตู้เครื่องมือ, ยางซ้อนกัน และเส้นทาสีบนพื้นแบบช่องจอดใน pit lane
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

export default function Garage({ narrow, cars }: { narrow: boolean; cars: { name: string; accent: string }[] }) {
  return (
    <group>
      <Floor narrow={narrow} />
      <Walls />
      <WallLights />
      <Monitors cars={cars} />
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
// ด้านบนพื้นมีเส้นทาสี: เส้นกริดจางๆ, เส้นขาวขอบ pit lane, แถบเหลืองดำตรงทางเข้าอู่
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
  const stripes = useMemo(() => {
    const t = canvasTexture(512, 64, (g) => {
      g.fillStyle = "#151515";
      g.fillRect(0, 0, 512, 64);
      g.fillStyle = "#f2c200";
      for (let x = -64; x < 576; x += 64) {
        g.beginPath();
        g.moveTo(x, 64);
        g.lineTo(x + 32, 0);
        g.lineTo(x + 64, 0);
        g.lineTo(x + 32, 64);
        g.fill();
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(WIDTH / 4, 1);
    return t;
  }, []);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, MID_Z]}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        {narrow ? (
          <meshStandardMaterial color="#34363b" roughness={0.42} metalness={0.25} />
        ) : (
          <MeshReflectorMaterial
            color="#34363b"
            roughness={0.62}
            metalness={0.35}
            blur={[380, 110]}
            resolution={768}
            mixBlur={1}
            mixStrength={9}
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
      {/* แถบเหลืองดำตรงทางเข้าอู่ + เส้นขาวขอบ pit lane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 4.6]}>
        <planeGeometry args={[WIDTH, 0.42]} />
        <meshStandardMaterial map={stripes} roughness={0.7} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 6.1]}>
        <planeGeometry args={[WIDTH, 0.12]} />
        <meshStandardMaterial color="#e8e8e4" roughness={0.6} />
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

// ไฟเส้นแนวตั้งบนผนังหลัง: หลอดสว่าง + แสงฟุ้งบนผนังรอบๆ (ภาพไล่สีจางๆ ซ้อนแบบบวกแสง) ให้ผนังไม่มืดตื้อ
// เว้นช่องตรงกลางไว้ให้จอมอนิเตอร์
const STRIPS = [-12.6, -8.4, -4.2, 4.2, 8.4, 12.6];
function WallLights() {
  const glow = useMemo(
    () =>
      canvasTexture(128, 512, (g) => {
        // สว่างตรงกลาง จางออกด้านข้าง และจางที่หัว/ท้ายหลอด
        const x = g.createLinearGradient(0, 0, 128, 0);
        x.addColorStop(0, "rgba(255,255,255,0)");
        x.addColorStop(0.5, "rgba(255,255,255,1)");
        x.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = x;
        g.fillRect(0, 0, 128, 512);
        g.globalCompositeOperation = "destination-in";
        const y = g.createLinearGradient(0, 0, 0, 512);
        y.addColorStop(0, "rgba(0,0,0,0)");
        y.addColorStop(0.25, "rgba(0,0,0,1)");
        y.addColorStop(0.75, "rgba(0,0,0,1)");
        y.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = y;
        g.fillRect(0, 0, 128, 512);
      }),
    [],
  );
  return (
    <group>
      {STRIPS.map((x) => (
        <group key={x} position={[x, 2.3, WALL_Z + 0.03]}>
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[0.05, 2.6]} />
            <meshBasicMaterial color="#c9d3e6" toneMapped={false} />
          </mesh>
          <mesh>
            <planeGeometry args={[1.6, 4.2]} />
            <meshBasicMaterial
              map={glow}
              color="#8796b3"
              transparent
              opacity={0.32}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
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

// จอมอนิเตอร์บนผนัง: จอละคัน (ชื่อรถ + แถบสีทีม) แบบจอข้อมูลในอู่จริง
function Monitors({ cars }: { cars: { name: string; accent: string }[] }) {
  const screens = useMemo(
    () =>
      cars.map((c, i) =>
        canvasTexture(640, 360, (g) => {
          g.fillStyle = "#07080a";
          g.fillRect(0, 0, 640, 360);
          g.fillStyle = c.accent;
          g.fillRect(0, 0, 640, 14);
          g.fillStyle = "rgba(240,240,236,0.5)";
          g.font = "500 22px ui-monospace, Menlo, monospace";
          g.fillText(`CAR 0${i + 1} · TELEMETRY`, 32, 62);
          g.fillStyle = "#f2f2ee";
          g.font = "800 64px 'Arial Narrow', Arial, sans-serif";
          g.fillText(c.name.toUpperCase(), 32, 140);
          // เส้นกราฟความเร็วสมมติ (ตกแต่งให้เหมือนจอข้อมูล)
          g.strokeStyle = c.accent;
          g.lineWidth = 3;
          g.beginPath();
          for (let x = 0; x <= 576; x += 8) {
            const y = 270 - 60 * Math.sin(x / 47 + i) - 25 * Math.sin(x / 13 + i * 2);
            if (x === 0) g.moveTo(32 + x, y);
            else g.lineTo(32 + x, y);
          }
          g.stroke();
        }),
      ),
    [cars],
  );
  return (
    <group>
      {screens.map((map, i) => (
        <group key={i} position={[(i - 1) * 1.75, 2.45, WALL_Z + 0.06]}>
          <mesh>
            <boxGeometry args={[1.6, 0.95, 0.06]} />
            <meshStandardMaterial color="#0a0a0c" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.032]}>
            <planeGeometry args={[1.5, 0.85]} />
            <meshBasicMaterial map={map} toneMapped={false} />
          </mesh>
        </group>
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
