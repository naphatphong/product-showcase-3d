"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import { look, products } from "@/config/products";
import { DIVE_SECONDS } from "@/lib/dive";
import { formatCoords } from "@/lib/format";
import ProductPanel from "./ProductPanel";
import type { Ring } from "./three/Scene";

// โหลดฉาก 3D แบบ dynamic import + ssr: false
// - WebGL มีแค่ในเบราว์เซอร์ ถ้าให้ server render จะ error
// - three.js ไฟล์ใหญ่ แยก bundle ออกมา ข้อความหน้าเว็บจึงขึ้นก่อน แล้ว 3D ค่อยตามมา
const Scene = dynamic(() => import("./three/Scene"), { ssr: false });

// จอแคบ (มือถือแนวตั้ง) หรือไม่ — อ่านจาก CSS media query และอัปเดตเมื่อหมุนจอ/ย่อหน้าต่าง
const NARROW = "(max-width: 767px)";
function useNarrow() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(NARROW).matches,
    () => false, // ตอน render บน server ยังไม่รู้ขนาดจอ ถือว่าเป็นจอกว้างไว้ก่อน
  );
}

const N = products.length;
// หารเอาเศษแบบไม่ติดลบ เช่น mod(-1, 3) = 2 (ตัว % ของ JavaScript จะได้ -1)
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ข้อมูลระหว่างลากหมุนวงแหวน
type Drag = {
  x: number; // ตำแหน่งนิ้ว/เมาส์ตอนเริ่มกด
  from: number; // ตำแหน่งวงแหวนตอนเริ่มกด
  moved: boolean; // ลากไกลพอจะนับเป็นการลากหรือยัง (ยัง = อาจเป็นแค่การคลิก)
  lastX: number;
  lastT: number;
  v: number; // ความเร็วตอนลาก (ชิ้นต่อวินาที) ใช้ตอนปล่อย: ปัดแรง = ไปต่ออีกชิ้น
};

// ส่วนที่โต้ตอบได้ของหน้าแรก: วงแหวนสินค้า (หมุนได้) + แผงรายละเอียด + การดำดิ่งเข้าหน้าสินค้า
// children = หัวเว็บที่ render บน server (ส่งมาจาก page.tsx) — Showroom แค่ทำให้จางหายตอนดำดิ่ง
export default function Showroom({ children }: { children: ReactNode }) {
  const narrow = useNarrow();
  const router = useRouter();
  // turn = วงแหวนหมุนมาแล้วกี่ชิ้น (นับต่อเนื่อง ไม่วนกลับ เช่น 0, 1, 2, 3 หรือติดลบ)
  // สินค้าที่อยู่หน้าสุด = turn หารจำนวนสินค้าเอาเศษ → หมุนวนได้เรื่อยๆ ไม่สะดุดตอนครบรอบ
  const [turn, setTurn] = useState(0);
  const front = mod(turn, N);
  // ตำแหน่งที่ฉาก 3D ต้องหมุนไปหา (ค่าเดียวกับ turn แต่ระหว่างลากเป็นทศนิยมตามนิ้ว)
  const ring = useRef<Ring>({ goal: 0 });
  const drag = useRef<Drag | null>(null);
  const wheel = useRef({ acc: 0, last: 0, lock: 0 });
  const lastPick = useRef({ index: -1, t: -Infinity }); // คลิกสินค้าครั้งล่าสุด (ใช้แยกดับเบิลคลิก)
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null); // สินค้าที่เมาส์ชี้อยู่ (ใช้เปลี่ยนรูปเมาส์)
  // แบบที่เลือกของสินค้าแต่ละชิ้น (เริ่มที่แบบแรกทุกชิ้น) เช่น [0, 0, 1] = ชิ้นที่ 3 เลือกแบบที่ 2
  const [variants, setVariants] = useState(() => products.map(() => 0));
  const [ready, setReady] = useState(false); // ภาพโลกโหลดเสร็จหรือยัง
  const [entering, setEntering] = useState<number | null>(null); // กำลังดำดิ่งเข้าสินค้าชิ้นไหน
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const labelLayer = useRef<HTMLDivElement>(null); // ชั้นวางป้ายชื่อสินค้า (drei จะใส่ป้ายลงในนี้)

  const busy = entering !== null; // ระหว่างดำดิ่ง ไม่รับการกดอื่น

  // Next.js ไม่ได้ทิ้งหน้าเดิมตอนเปลี่ยนหน้า แต่ "ซ่อน" ไว้ (React Activity) เพื่อกดย้อนกลับได้เร็ว
  // cleanup นี้ทำงานตอนหน้าถูกซ่อน → รีเซ็ตสถานะดำดิ่ง ไม่ให้กลับมาเจอจอดำค้าง
  useLayoutEffect(
    () => () => {
      clearTimeout(timer.current);
      setEntering(null);
    },
    [],
  );

  // หมุนวงแหวนไปตำแหน่ง t: ฉาก 3D อ่านจาก ref ทันที, แผงรายละเอียดอัปเดตจาก state
  const rotateTo = useCallback((t: number) => {
    ring.current.goal = t;
    setTurn(t);
  }, []);

  // หมุนไปชิ้นถัดไป (dir = 1) หรือก่อนหน้า (dir = -1)
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!busy) rotateTo(Math.round(ring.current.goal) + dir);
    },
    [busy, rotateTo],
  );

  // หมุนเอาชิ้น index มาไว้หน้าสุด ทางที่ใกล้ที่สุด (3 ชิ้น: หมุนไปทางซ้ายหรือขวา 1 ชิ้นเสมอ)
  const bringToFront = useCallback(
    (index: number) => {
      const cur = Math.round(ring.current.goal);
      let d = mod(index - mod(cur, N), N);
      if (d > N / 2) d -= N;
      rotateTo(cur + d);
    },
    [rotateTo],
  );

  // เข้าหน้าสินค้า: เล่นแอนิเมชันดำดิ่งเข้าหาโลก แล้วค่อยเปลี่ยนหน้าเมื่อจบ
  const enter = useCallback(
    (index: number) => {
      if (busy) return;
      const href = `/${products[index].slug}`;
      // ผู้ใช้ที่ตั้งค่า "ลดการเคลื่อนไหว" ในเครื่อง: ข้ามแอนิเมชัน เปลี่ยนหน้าทันที
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      bringToFront(index);
      setEntering(index);
      router.prefetch(href); // โหลดหน้าปลายทางรอไว้ระหว่างแอนิเมชัน
      timer.current = setTimeout(() => router.push(href), DIVE_SECONDS * 1000);
    },
    [router, busy, bringToFront],
  );

  // คลิก/แตะสินค้า:
  // - ชิ้นที่อยู่หน้าสุด → เข้าหน้าสินค้า
  // - ชิ้นอื่น → หมุนมาไว้หน้าสุดก่อน (คลิกอีกครั้งถึงเข้า)
  // - คลิกที่ 2 ของดับเบิลคลิกไม่นับ (สินค้ากำลังหมุนหนี อาจไปโดนชิ้นอื่น) ให้ onDoubleClick จัดการแทน
  const select = (index: number) => {
    if (busy) return;
    const now = performance.now();
    if (now - lastPick.current.t < 450) return;
    lastPick.current = { index, t: now };
    if (index === front) enter(index);
    else bringToFront(index);
  };
  // ดับเบิลคลิกสินค้าชิ้นไหนก็ได้ = เข้าหน้าสินค้านั้นเลย
  const doubleClick = () => {
    const { index, t } = lastPick.current;
    if (index >= 0 && performance.now() - t < 700) enter(index);
  };

  // ---------- ลากเพื่อหมุนวงแหวน (เมาส์และนิ้วใช้โค้ดเดียวกัน ผ่าน Pointer Events) ----------
  // ระยะลากต่อ 1 ชิ้น: ประมาณระยะที่สินค้าเลื่อนบนจอจริง สินค้าจึงเลื่อนตามนิ้วพอดี
  const pxPerItem = () => Math.min(420, Math.max(160, window.innerWidth * (narrow ? 0.45 : 0.28)));

  const pointerDown = (e: PointerEvent) => {
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return; // เมาส์: เฉพาะปุ่มซ้าย
    const g = ring.current.goal;
    drag.current = { x: e.clientX, from: g, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const pointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // ไม่ได้กดปุ่มเมาส์ค้างแล้ว (ปล่อยนอกฉากก่อนเริ่มลาก) → ยกเลิก
    if (e.pointerType === "mouse" && e.buttons === 0) {
      drag.current = null;
      return;
    }
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return; // ขยับนิดเดียว = ยังถือว่าคลิก
      d.moved = true;
      setDragging(true);
      // ลากจริงแล้ว: จับ pointer ไว้กับฉาก ลากเลยออกไปนอกฉาก (เช่นผ่านแผงรายละเอียด) ก็ยังหมุนต่อได้
      // (จับหลังเริ่มลากเท่านั้น ถ้าจับตั้งแต่กด การคลิกสินค้าจะไปไม่ถึงฉาก 3D)
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const per = pxPerItem();
    // ลากไปทางซ้าย = ชิ้นทางขวาเลื่อนเข้ามาหน้าสุด (เหมือนปัดรูปในมือถือ)
    const goal = d.from - dx / per;
    const dt = (e.timeStamp - d.lastT) / 1000;
    if (dt > 0) d.v = 0.7 * d.v + 0.3 * (-(e.clientX - d.lastX) / per / dt); // เฉลี่ยให้นิ่ง ไม่กระตุก
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    ring.current.goal = goal;
    setTurn(Math.round(goal)); // ลากผ่านครึ่งชิ้น → แผงรายละเอียดเปลี่ยนเป็นชิ้นใหม่ทันที
  };
  const pointerUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    const g = ring.current.goal;
    const v = e.timeStamp - d.lastT > 120 ? 0 : d.v; // ค้างนิ้วไว้ก่อนปล่อย = ไม่มีแรงส่ง
    let target = Math.round(g + Math.max(-1, Math.min(1, v * 0.25))); // ปัดแรงไปต่อได้อีกไม่เกิน 1 ชิ้น
    // ลากไม่ถึงครึ่งชิ้นแต่ตั้งใจลาก (เกิน 15%) → ไปชิ้นถัดไปตามทิศที่ลาก
    if (target === Math.round(d.from) && Math.abs(g - d.from) > 0.15) target += Math.sign(g - d.from);
    rotateTo(target);
  };

  // ล้อเมาส์ / ทัชแพด: หมุน 1 ชิ้นต่อการเลื่อน 1 ครั้ง แล้วพักสั้นๆ (ทัชแพดส่ง event รัวๆ ต่อเนื่อง)
  const onWheel = (e: WheelEvent) => {
    if (busy) return;
    const w = wheel.current;
    const now = e.timeStamp;
    if (now - w.last > 250) w.acc = 0; // หยุดเลื่อนไปพักหนึ่ง = เริ่มนับใหม่
    w.last = now;
    if (now < w.lock) return;
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1; // บางเบราว์เซอร์นับเป็นบรรทัด/หน้า
    w.acc += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
    if (Math.abs(w.acc) >= 40) {
      step(w.acc > 0 ? 1 : -1);
      w.acc = 0;
      w.lock = now + 450;
    }
  };

  const onReady = useCallback(() => setReady(true), []);

  // คีย์บอร์ด: ← → หมุนวงแหวน, Enter เข้าหน้าสินค้าที่อยู่หน้าสุด
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      // ถ้ากำลัง focus ปุ่ม/ลิงก์อยู่ ปล่อยให้ Enter ทำงานกับปุ่มนั้นตามปกติ
      else if (e.key === "Enter" && e.target === document.body) enter(front);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, enter, front]);

  return (
    <>
      {/* พื้นที่ฉาก 3D: รับการลาก/ล้อเมาส์/ดับเบิลคลิก
          touch-none = ปิดการเลื่อน/ซูมของเบราว์เซอร์บนฉาก ให้ฉากรับการลากเอง
          รูปเมาส์: มือจับ (ลากได้) / นิ้วชี้ตอนชี้สินค้า (คลิกได้) / กำมือตอนกำลังลาก */}
      <div
        className={`fixed inset-0 touch-none transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ cursor: busy ? "default" : dragging ? "grabbing" : hovered !== null ? "pointer" : "grab" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        // จบการลากเมื่อฉากเสียการจับ pointer ที่ตั้งไว้เอง (นิ้วบนมือถือ: เบราว์เซอร์จับไว้กับ canvas ให้ก่อน
        // พอย้ายมาจับที่ฉาก canvas จะได้ event นี้ด้วย — อันนั้นต้องไม่นับ)
        onLostPointerCapture={(e) => e.target === e.currentTarget && pointerUp(e)}
        onWheel={onWheel}
        onDoubleClick={doubleClick}
      >
        <Scene
          narrow={narrow}
          front={front}
          ring={ring}
          onHover={narrow ? () => {} : setHovered}
          onSelect={select}
          onReady={onReady}
          labelLayer={labelLayer}
          diveTo={entering === null ? null : look(products[entering], variants[entering]).origin}
          variants={variants}
        />
      </div>
      <div
        ref={labelLayer}
        className={`pointer-events-none fixed inset-0 z-[5] transition-opacity duration-300 ${busy ? "opacity-0" : ""}`}
      />

      {!ready && (
        <p className="fixed inset-x-0 top-1/2 z-10 text-center text-[11px] uppercase tracking-[0.35em] text-white/50 motion-safe:animate-pulse">
          Entering orbit…
        </p>
      )}

      <div className={`transition-opacity duration-500 ${busy ? "opacity-0" : ""}`}>{children}</div>

      {/* คอม: ปุ่มหมุนวงแหวนซ้าย/ขวาที่ขอบจอ (มือถือใช้ปุ่มในแผงรายละเอียดแทน) */}
      {(
        [
          [-1, "Previous product", "left-6", "‹"],
          [1, "Next product", "right-6", "›"],
        ] as const
      ).map(([dir, label, side, icon]) => (
        <button
          key={dir}
          aria-label={label}
          onClick={() => step(dir)}
          className={`fixed top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/30 pb-0.5 text-2xl text-white/70 backdrop-blur transition hover:border-white/40 hover:text-white md:grid ${side} ${busy ? "pointer-events-none opacity-0" : ""}`}
        >
          {icon}
        </button>
      ))}

      <ProductPanel
        index={front}
        narrow={narrow}
        onEnter={enter}
        onStep={step}
        hidden={busy}
        variant={variants[front]}
        onVariant={(v) => setVariants((cur) => cur.map((x, i) => (i === front ? v : x)))}
      />

      {/* ระหว่างดำดิ่ง: บอกปลายทาง แล้วจอค่อยๆ มืดลงช่วงท้าย ต่อด้วยหน้าสินค้าที่ค่อยๆ สว่างขึ้น */}
      {entering !== null && (
        <p className="pointer-events-none fixed inset-x-0 top-1/2 z-40 -translate-y-1/2 text-center text-[11px] uppercase tracking-[0.35em] text-white/80 motion-safe:animate-fade-in">
          Descending to {look(products[entering], variants[entering]).origin.city} ·{" "}
          {formatCoords(look(products[entering], variants[entering]).origin)}
        </p>
      )}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-30 bg-black transition-opacity ${busy ? "opacity-100" : "opacity-0"}`}
        // เริ่มมืดเมื่อดำดิ่งไปได้ 55% และมืดสนิทก่อนเปลี่ยนหน้าเล็กน้อย (คิดจาก DIVE_SECONDS ตัวเดียว)
        style={{
          transitionDelay: busy ? `${DIVE_SECONDS * 0.55}s` : "0s",
          transitionDuration: busy ? `${DIVE_SECONDS * 0.4}s` : "0s",
        }}
      />
    </>
  );
}
