"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Center, Html, Resize, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Product, Variant } from "@/config/products";

// ขนาดเริ่มต้นของสินค้า: ด้านที่ยาวที่สุดจะยาวเท่านี้ (หน่วยในฉาก) ทุกชิ้นจึงดูใหญ่พอๆ กัน
// (สินค้าแต่ละชิ้นปรับเองได้ด้วย size ใน config เช่น รถยาวๆ ให้ใหญ่ขึ้น)
const SIZE = 1.9;

// โหลดไฟล์ .glb (drei จะแคชไว้ โหลดซ้ำไม่เสียเวลา และถอดไฟล์ที่บีบแบบ meshopt ให้เอง)
function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

type Props = {
  product: Product;
  index: number;
  active: boolean; // อยู่หน้าสุดของวงแหวน = สินค้าที่แผงรายละเอียดกำลังแสดง
  variant: Variant; // แบบที่เลือกอยู่ (โมเดล + สี)
  // ชั้น HTML (อยู่นอก Canvas) ที่ใช้วางป้ายชื่อ — null = ไม่แสดงป้าย
  labelLayer: RefObject<HTMLDivElement | null> | null;
  onHover: (index: number | null) => void; // null = เมาส์ออกจากสินค้าแล้ว
  onSelect: (index: number) => void;
};

// สินค้า 1 ชิ้นลอยอยู่กลางอวกาศ (ไม่มีฐาน) + แสงขอบสีประจำสินค้า + ป้ายชื่อด้านล่าง
// ตำแหน่งบนวงแหวนและขนาด (ใกล้/ไกล) ถูกกำหนดจาก Scene — ไฟล์นี้ดูแลแค่ตัวสินค้าเอง
export default function FloatingProduct({
  product,
  index,
  active,
  variant,
  labelLayer,
  onHover,
  onSelect,
}: Props) {
  const model = useRef<THREE.Group>(null);
  const rim = useRef<THREE.PointLight>(null);
  const lift = useRef(0); // ความสูงที่ยกขึ้นตอนนี้ (ค่อยๆ เปลี่ยน)
  const spin = useRef(0); // มุมที่ยังต้องหมุนเพิ่ม (ใช้ตอนเปลี่ยนแบบ)
  const [hovered, setHovered] = useState(false);
  const size = product.size ?? SIZE;
  // ความสูงครึ่งหนึ่งของสินค้าจริง (รู้หลังวัดขนาดโมเดล) ใช้วางป้ายชื่อให้อยู่ใต้สินค้าพอดี
  const [halfHeight, setHalfHeight] = useState(size / 2);

  // เปลี่ยนแบบ (เช่นเปลี่ยนทีม) → หมุนโชว์ 1 รอบ
  const variantId = variant.id;
  const firstVariant = useRef(variantId);
  useEffect(() => {
    if (variantId !== firstVariant.current) spin.current += Math.PI * 2;
  }, [variantId]);

  // สินค้าที่หมุนมาอยู่หน้าสุด → โหลดไฟล์ของแบบอื่นรอไว้ กดเปลี่ยนแล้วขึ้นทันที
  useEffect(() => {
    if (active) product.variants.forEach((v) => useGLTF.preload(v.model));
  }, [active, product]);

  useFrame((state, dt) => {
    const m = model.current;
    if (!m) return;
    const damp = THREE.MathUtils.damp; // ค่อยๆ เข้าใกล้ค่าเป้าหมาย (ยิ่งตัวเลขที่ 3 มาก ยิ่งเร็ว)
    // ลอยขึ้นลงช้าๆ (แต่ละชิ้นจังหวะไม่ตรงกัน) + ยกสูงขึ้นเมื่ออยู่หน้าสุด + หมุนรอบตัวเอง
    lift.current = damp(lift.current, active ? 0.12 : 0, 4, dt);
    m.position.y = lift.current + Math.sin(state.clock.elapsedTime * 1.1 + index * 2) * 0.08;
    const extra = spin.current * (1 - Math.exp(-5 * dt)); // หมุนเพิ่มแบบเร็วตอนแรกแล้วค่อยๆ ช้าลง
    spin.current -= extra;
    m.rotation.y += dt * (active ? 0.5 : 0.2) + extra;
    // แสงขอบสีประจำสินค้า: สว่างสุดเมื่ออยู่หน้าสุด, ชิ้นด้านข้างสว่างขึ้นเมื่อเอาเมาส์ชี้ (บอกว่าคลิกได้)
    if (rim.current) rim.current.intensity = damp(rim.current.intensity, active ? 22 : hovered ? 12 : 4, 6, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); // ไม่ให้สินค้าที่อยู่ด้านหลังได้ event ซ้ำ
    setHovered(true);
    onHover(index);
  };
  const out = () => {
    setHovered(false);
    onHover(null);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 8) return; // ลากไปไกล = กำลังหมุนวงแหวน ไม่ใช่การคลิก
    onSelect(index);
  };

  return (
    <group>
      {/* กล่องล่องหนครอบตัวสินค้า ใช้รับเมาส์/นิ้ว (ชี้โดนง่ายกว่าเล็งตัวสินค้าตรงๆ) */}
      <mesh visible={false} onPointerOver={over} onPointerOut={out} onClick={click}>
        <cylinderGeometry args={[size / 2 + 0.1, size / 2 + 0.1, Math.max(halfHeight * 2 + 0.3, 1), 16]} />
      </mesh>

      {/* ไฟดวงเล็กสีประจำสินค้า วางไว้ด้านหลัง ทำให้ขอบสินค้าเรืองสีนั้น (rim light) */}
      <pointLight
        ref={rim}
        color={variant.accent}
        intensity={4}
        distance={3}
        decay={2}
        position={[0, 0.3, -1]}
      />

      {/* ตัวสินค้า: ไฟล์ .glb ของแบบที่เลือก
          Resize = ย่อ/ขยายให้ด้านที่ยาวสุดยาว 1 หน่วย, Center = เลื่อนให้จุดกึ่งกลางอยู่ที่ (0,0,0)
          โมเดลจะขนาดเท่าไรก็ตาม จะถูกจัดให้ขนาดและตำแหน่งเท่ากันหมด
          Suspense อยู่นอก Center: Center จะวัดขนาดหลังไฟล์โหลดเสร็จแล้วเท่านั้น */}
      <group ref={model}>
        <group scale={size}>
          <Suspense fallback={null}>
            {/* key: เปลี่ยนแบบ = สร้าง Center/Resize ใหม่ ให้วัดขนาดโมเดลใหม่อีกรอบ */}
            <Center key={variantId} onCentered={({ height }) => setHalfHeight((height * size) / 2)}>
              <Resize>
                <GltfModel url={variant.model} />
              </Resize>
            </Center>
          </Suspense>
        </group>
      </group>

      {/* ป้ายใต้สินค้า: เป็น HTML ที่ drei จัดตำแหน่งให้ตามจุด 3D (แค่ตกแต่ง screen reader ข้ามได้)
          ชิ้นหน้าสุด = บอกว่าคลิกอีกครั้งเพื่อเข้า / ชิ้นอื่น = ชื่อสินค้า (คลิกแล้วหมุนมาข้างหน้า) */}
      {/* portal: บอก drei ให้วางป้ายในชั้นที่เตรียมไว้ตั้งแต่แรก (ถ้าปล่อยให้ drei หาที่วางเอง มันจะย้ายที่หลัง
          render ครั้งแรก ทำให้ React 19 error ตอนเปลี่ยนหน้า) */}
      {labelLayer && (
        <Html
          portal={labelLayer as RefObject<HTMLElement>}
          position={[0, -halfHeight - (active ? 0.18 : 0.25), 0]}
          center
          pointerEvents="none"
          zIndexRange={[5, 0]}
        >
          {active ? (
            <div
              aria-hidden
              className="whitespace-nowrap rounded-full border bg-black/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.3em] backdrop-blur-sm motion-safe:animate-fade-in"
              style={{ borderColor: variant.accent, color: variant.accent }}
            >
              Click to enter
            </div>
          ) : (
            <div
              aria-hidden
              className={`w-56 text-center transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-60"}`}
            >
              <div className="text-[10px] tracking-[0.35em] text-white/50">0{index + 1}</div>
              <div className="mt-1 font-display text-xl tracking-[0.2em] text-white">{product.name}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.25em] text-white/50">
                {product.category}
              </div>
            </div>
          )}
        </Html>
      )}
    </group>
  );
}
