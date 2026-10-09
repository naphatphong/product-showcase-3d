"use client"; // WebGL มีแค่ในเบราว์เซอร์

import { Suspense, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// โมเดลบ้านตัวจริงที่หมุนดูได้ในหน้าเว็บบ้าน (ส่วน "In 3D")
// - หมุนเองช้าๆ / ลากเมาส์หรือนิ้วเพื่อหมุนรอบบ้าน (ปิดซูมและเลื่อน ไม่ให้แย่งการเลื่อนหน้าเว็บ)
// - แสงแดดสีเกือบขาว + แสงสะท้อนนุ่มๆ จากกล่องไฟ (Lightformer) ไม่ต้องโหลดไฟล์ HDR จากเน็ต
//   สีคอนกรีตและน้ำในสระให้ตรงกับรูปนิ่งในหน้า (รูปอัดจากโมเดลเดียวกัน ดู scripts/render/shots.json)
// - ไฟล์นี้ถูกโหลดเมื่อเลื่อนมาใกล้ส่วนนี้เท่านั้น (dynamic import ใน HouseLanding)
export default function ModelViewer({
  src,
  narrow,
  active,
  onReady,
}: {
  src: string;
  narrow: boolean;
  active: boolean; // อยู่ในจอ → วาดทุกเฟรม / นอกจอ → หยุดวาด (ไม่เปลืองการ์ดจอและแบต)
  onReady: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      shadows="percentage"
      dpr={narrow ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true }}
      camera={{ position: narrow ? [9.5, 5.5, 12.5] : [7.6, 4.2, 9.8], fov: 30, near: 0.1, far: 200 }}
    >
      <hemisphereLight args={["#dfe8f5", "#4d4842", 0.9]} />
      <directionalLight
        position={[7, 6, 5]}
        intensity={2.2}
        color="#fff0de"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.6} position={[0, 6, -9]} scale={[12, 4, 1]} />
        <Lightformer intensity={0.8} position={[-8, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer intensity={1.2} color="#fff3e4" position={[8, 5, 6]} rotation-y={-Math.PI / 3} scale={[4, 4, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <House src={src} onReady={onReady} />
      </Suspense>
      <ContactShadows position={[0, -0.01, 0]} scale={16} blur={2.6} far={5} opacity={0.55} color="#000000" />
      <OrbitControls
        makeDefault
        target={[0, 0.9, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate
        autoRotateSpeed={0.55}
        minPolarAngle={0.55}
        maxPolarAngle={1.38}
      />
    </Canvas>
  );
}

const POOL = "Material #174"; // ชื่อวัสดุน้ำในสระของไฟล์ MONOLITH

// ย่อ/ขยายบ้านให้กว้างประมาณ 8 หน่วย วางกึ่งกลาง ตั้งพื้นบ้านที่ y = 0
function House({ src, onReady }: { src: string; onReady: () => void }) {
  const { scene } = useGLTF(src);
  const house = useMemo(() => {
    const root = scene.clone(true); // สำเนา ไม่แก้ตัวในแคช (หน้าแรกใช้ไฟล์เดียวกัน)
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 8 / Math.max(size.x, size.z);
    root.scale.setScalar(s);
    root.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // น้ำในสระ: ในไฟล์เป็นสีซีด → ใช้สีเดียวกับตอนอัดรูป (สำเนาวัสดุ ไม่แก้ตัวที่หน้าแรกใช้)
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m.name === POOL) {
        const water = m.clone();
        water.color.set("#3d7f86");
        water.roughness = 0.05;
        water.metalness = 0;
        water.transparent = false;
        water.opacity = 1;
        mesh.material = water;
      }
    });
    return root;
  }, [scene]);
  useEffect(onReady, [onReady]);
  return <primitive object={house} />;
}
