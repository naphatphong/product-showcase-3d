"use client";

import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Center, Html, Resize, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Safe from "@/components/Safe";
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
  // ขนาดครึ่งหนึ่งของสินค้าจริง (รู้หลังวัดขนาดโมเดล): สูง = ใช้กับกล่องรับคลิก, กว้าง = วางป้ายข้างสินค้าพอดี
  // ความกว้างคิดจากด้านที่ยาวกว่าระหว่างกว้าง/ลึก เพราะสินค้าหมุนรอบตัวเองตลอด
  const [half, setHalf] = useState({ w: size / 2, h: size / 2 });
  const halfHeight = half.h;

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
          {/* Safe: ไฟล์โมเดลโหลดไม่สำเร็จ → ซ่อนเฉพาะชิ้นนี้ (key = เปลี่ยนแบบแล้วลองใหม่ได้) */}
          <Safe key={variantId}>
            <Suspense fallback={null}>
              {/* key: เปลี่ยนแบบ = สร้าง Center/Resize ใหม่ ให้วัดขนาดโมเดลใหม่อีกรอบ */}
              <Center
                key={variantId}
                onCentered={({ width, height, depth }) => {
                  const w = (Math.max(width, depth) * size) / 2;
                  const h = (height * size) / 2;
                  // ค่าเดิม → คืน object เดิม React จะไม่ render ใหม่ (Center เรียกฟังก์ชันนี้ทุกครั้งที่ render)
                  setHalf((cur) => (cur.w === w && cur.h === h ? cur : { w, h }));
                }}
              >
                <Resize>
                  <GltfModel url={variant.model} />
                </Resize>
              </Center>
            </Suspense>
          </Safe>
        </group>
      </group>

      {/* ป้ายข้างสินค้า (เฉพาะชิ้นที่จอดอยู่) แบบหน้าจอเครื่องมือ: เป้าเล็ง + เส้น + "Click to enter"
          เป็น HTML ที่ drei จัดตำแหน่งให้ตามจุด 3D (แค่ตกแต่ง screen reader ข้ามได้)
          ชิ้นอื่นอยู่นอกจอ ไม่ต้องมีป้าย (ถ้ามี ป้ายจะลอยผ่านกลางจอตอนสินค้าบินเข้ามา) */}
      {/* portal: บอก drei ให้วางป้ายในชั้นที่เตรียมไว้ตั้งแต่แรก (ถ้าปล่อยให้ drei หาที่วางเอง มันจะย้ายที่หลัง
          render ครั้งแรก ทำให้ React 19 error ตอนเปลี่ยนหน้า) */}
      {labelLayer && active && (
        <Html
          portal={labelLayer as RefObject<HTMLElement>}
          position={[half.w + 0.1, -half.h * 0.35, 0]}
          pointerEvents="none"
          zIndexRange={[5, 0]}
        >
          {/* มุมซ้ายบนของ Html อยู่ที่จุด 3D → เลื่อนให้กลางเป้าเล็งตรงจุดนั้นพอดี */}
          <div
            aria-hidden
            className="orbit-mono flex -translate-x-[6px] -translate-y-1/2 items-center gap-2 text-[9px] whitespace-nowrap tracking-[0.3em] text-white/85 uppercase motion-safe:animate-fade-in"
          >
            <span className="orbit-cross" style={{ color: variant.accent }} />
            <span className="h-px w-8 bg-white/40" />
            Click to enter
          </div>
        </Html>
      )}
    </group>
  );
}
