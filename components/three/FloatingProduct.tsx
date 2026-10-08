"use client";

import { useRef, useState, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Center, Html, Resize, useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { Product } from "@/config/products";
import { CarPlaceholder, DrinkPlaceholder, WatchPlaceholder } from "./placeholders";

// ขนาดของสินค้าทุกชิ้น: ด้านที่ยาวที่สุดจะยาวเท่านี้ (หน่วยในฉาก) ทุกชิ้นจึงดูใหญ่พอๆ กัน
const SIZE = 1.9;

type Props = {
  product: Product;
  index: number;
  position: [number, number, number]; // ตำแหน่งเป้าหมาย (สินค้าจะค่อยๆ เลื่อนไปหา)
  scale: number;
  active: boolean; // สินค้าที่กำลังแสดงรายละเอียด
  dimmed: boolean; // มีชิ้นอื่น active อยู่ → ชิ้นนี้หรี่ลง
  // ชั้น HTML (อยู่นอก Canvas) ที่ใช้วางป้ายชื่อ — null = ไม่แสดงป้าย
  labelLayer: RefObject<HTMLDivElement | null> | null;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
};

// สินค้า 1 ชิ้นลอยอยู่กลางอวกาศ (ไม่มีฐาน) + แสงขอบสีประจำสินค้า + ป้ายชื่อด้านล่าง
export default function FloatingProduct({
  product,
  index,
  position,
  scale,
  active,
  dimmed,
  labelLayer,
  onHover,
  onSelect,
}: Props) {
  const root = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const rim = useRef<THREE.PointLight>(null);
  const lift = useRef(0); // ความสูงที่ยกขึ้นตอนนี้ (ค่อยๆ เปลี่ยน)
  const [hovered, setHovered] = useState(false);
  useCursor(hovered); // เปลี่ยนเมาส์เป็นรูปมือเมื่อชี้สินค้า

  useFrame((state, dt) => {
    const r = root.current;
    const m = model.current;
    if (!r || !m) return;
    const damp = THREE.MathUtils.damp; // ค่อยๆ เข้าใกล้ค่าเป้าหมาย (ยิ่งตัวเลขที่ 3 มาก ยิ่งเร็ว)
    // เลื่อนไปตำแหน่ง/ขนาดเป้าหมาย (ใช้ตอน carousel บนมือถือเลื่อน)
    r.position.x = damp(r.position.x, position[0], 5, dt);
    r.position.y = damp(r.position.y, position[1], 5, dt);
    r.position.z = damp(r.position.z, position[2], 5, dt);
    r.scale.setScalar(damp(r.scale.x, active ? scale * 1.08 : dimmed ? scale * 0.92 : scale, 5, dt));
    // ลอยขึ้นลงช้าๆ (แต่ละชิ้นจังหวะไม่ตรงกัน) + ยกสูงขึ้นเมื่อ active + หมุนรอบตัวเอง
    lift.current = damp(lift.current, active ? 0.15 : 0, 4, dt);
    m.position.y = lift.current + Math.sin(state.clock.elapsedTime * 1.1 + index * 2) * 0.08;
    m.rotation.y += dt * (active ? 0.6 : 0.2);
    // แสงขอบสีประจำสินค้า สว่างขึ้นเมื่อ active
    if (rim.current) rim.current.intensity = damp(rim.current.intensity, active ? 25 : dimmed ? 2 : 6, 6, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // ไม่ให้สินค้าที่อยู่ด้านหลังได้ event ซ้ำ
    setHovered(true);
    onHover(index);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 8) return; // นิ้วลากไปไกล = กำลังปัด carousel ไม่ใช่การแตะ
    onSelect(index);
  };

  return (
    <group ref={root} position={position}>
      {/* กล่องล่องหนครอบตัวสินค้า ใช้รับเมาส์/นิ้ว (ชี้โดนง่ายกว่าเล็งตัวสินค้าตรงๆ) */}
      <mesh visible={false} onPointerOver={over} onPointerOut={() => setHovered(false)} onClick={click}>
        <cylinderGeometry args={[1.05, 1.05, 2.1, 16]} />
      </mesh>

      {/* ไฟดวงเล็กสีประจำสินค้า วางไว้ด้านหลัง ทำให้ขอบสินค้าเรืองสีนั้น (rim light) */}
      <pointLight
        ref={rim}
        color={product.accent}
        intensity={6}
        distance={3}
        decay={2}
        position={[0, 0.3, -1]}
      />

      {/* ตัวสินค้า (ตอนนี้เป็นโมเดลชั่วคราว รอโมเดลจริง)
          Resize = ย่อ/ขยายให้ด้านที่ยาวสุดยาว 1 หน่วย, Center = เลื่อนให้จุดกึ่งกลางอยู่ที่ (0,0,0)
          โมเดลจริงที่ได้มาจะขนาดเท่าไรก็ตาม จะถูกจัดให้ขนาดและตำแหน่งเท่ากันหมด */}
      <group ref={model}>
        <group scale={SIZE}>
          <Center>
            <Resize>
              {product.slug === "drink" && <DrinkPlaceholder accent={product.accent} />}
              {product.slug === "watch" && <WatchPlaceholder />}
              {product.slug === "car" && <CarPlaceholder />}
            </Resize>
          </Center>
        </group>
      </group>

      {/* ป้ายชื่อใต้สินค้า: เป็น HTML ที่ drei จัดตำแหน่งให้ตามจุด 3D (แค่ตกแต่ง screen reader ข้ามได้) */}
      {/* portal: บอก drei ให้วางป้ายในชั้นที่เตรียมไว้ตั้งแต่แรก (ถ้าปล่อยให้ drei หาที่วางเอง มันจะย้ายที่หลัง
          render ครั้งแรก ทำให้ React 19 error ตอนเปลี่ยนหน้า) */}
      {labelLayer && (
        <Html
          portal={labelLayer as RefObject<HTMLElement>}
          position={[0, -SIZE / 2 - 0.2, 0]}
          center
          pointerEvents="none"
          zIndexRange={[5, 0]}
        >
          <div
            aria-hidden
            className={`w-56 text-center transition-opacity duration-500 ${active ? "opacity-100" : dimmed ? "opacity-35" : "opacity-70"}`}
          >
            <div className="text-[10px] tracking-[0.35em] text-white/50">0{index + 1}</div>
            <div className="mt-1 font-display text-xl tracking-[0.2em] text-white">{product.name}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.25em] text-white/50">
              {product.category}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
