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
import { look, productHref, products } from "@/config/products";
import { DIVE_SECONDS } from "@/lib/dive";
import { formatCoords } from "@/lib/format";
import * as sfx from "@/lib/orbitSound";
import { site } from "@/config/site";
import OrbitLoader from "./OrbitLoader";
import OrbitPanel from "./OrbitPanel";
import Safe from "./Safe";
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

// ข้อมูลระหว่างลากเปลี่ยนชิ้นบนวงโคจร
type Drag = {
  x: number; // ตำแหน่งนิ้ว/เมาส์ตอนเริ่มกด
  from: number; // ตำแหน่งวงโคจรตอนเริ่มกด
  moved: boolean; // ลากไกลพอจะนับเป็นการลากหรือยัง (ยัง = อาจเป็นแค่การคลิก)
  lastX: number;
  lastT: number;
  v: number; // ความเร็วตอนลาก (ชิ้นต่อวินาที) ใช้ตอนปล่อย: ปัดแรง = ไปต่ออีกชิ้น
};

// จำไว้ในแท็บนี้ว่าผ่านหน้าเปิดแล้ว (กลับมาหน้าแรกอีกครั้ง → ข้ามหน้าเปิด สินค้าบินเข้ามาเลย)
const SEEN = "orbit-entered";
// หลังกดเริ่ม รอให้สินค้าชิ้นแรกบินใกล้ถึงที่จอดก่อน (มิลลิวินาที) แล้วค่อยแสดงรายละเอียด/ปุ่ม/ป้าย
const ARRIVE_UI_DELAY = 1300;

// ส่วนที่โต้ตอบได้ของหน้าแรก:
// 1. หน้าเปิด: เห็นแค่โลก + หัวข้อ + ปุ่ม Enter orbit (กดปุ่ม / เลื่อนลง / Enter = เริ่ม)
// 2. วงโคจรสินค้า: สินค้าชิ้นแรกบินเข้ามา แล้วเลื่อนเปลี่ยนทีละชิ้นได้ไม่สิ้นสุด + แผงรายละเอียด + การดำดิ่งเข้าหน้าสินค้า
// cart / logo / intro = ข้อความที่ render บน server (ส่งมาจาก page.tsx) — Showroom แค่จัดวางและซ่อน/แสดงตามจังหวะ
export default function Showroom({ cart, logo, intro }: { cart: ReactNode; logo: ReactNode; intro: ReactNode }) {
  const narrow = useNarrow();
  const router = useRouter();
  // turn = วงโคจรเลื่อนมาแล้วกี่ชิ้น (นับต่อเนื่อง ไม่วนกลับ เช่น 0, 1, 2, 3 หรือติดลบ)
  // สินค้าที่จอดอยู่ตรงกลาง = turn หารจำนวนสินค้าเอาเศษ → วนได้เรื่อยๆ ไม่สะดุดตอนครบรอบ
  const [turn, setTurn] = useState(0);
  const front = mod(turn, N);
  // ตำแหน่งที่ฉาก 3D ต้องหมุนไปหา (ค่าเดียวกับ turn แต่ระหว่างลากเป็นทศนิยมตามนิ้ว)
  const ring = useRef<Ring>({ goal: 0 });
  const drag = useRef<Drag | null>(null);
  const wheel = useRef({ acc: 0, last: -Infinity, done: false }); // สถานะการเลื่อนล้อเมาส์ครั้งล่าสุด
  const lastPick = useRef({ index: -1, t: -Infinity }); // คลิกสินค้าครั้งล่าสุด (ใช้แยกดับเบิลคลิก)
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null); // สินค้าที่เมาส์ชี้อยู่ (ใช้เปลี่ยนรูปเมาส์)
  // แบบที่เลือกของสินค้าแต่ละชิ้น (เริ่มที่แบบแรกทุกชิ้น) เช่น [0, 0, 1] = ชิ้นที่ 3 เลือกแบบที่ 2
  const [variants, setVariants] = useState(() => products.map(() => 0));
  const [ready, setReady] = useState(false); // ภาพโลกโหลดเสร็จหรือยัง
  const [progress, setProgress] = useState<number | null>(null); // % การโหลดไฟล์ของฉาก (null = โค้ด 3D ยังไม่มา)
  const [loaded, setLoaded] = useState(false); // หน้าโหลดเปิดม่านจบแล้ว → เริ่มหน้าเปิด
  const [started, setStarted] = useState(false); // ผ่านหน้าเปิดแล้วหรือยัง (false = ยังอยู่หน้าเปิด)
  const [arrived, setArrived] = useState(false); // สินค้าชิ้นแรกบินมาถึงแล้ว → แสดงรายละเอียด
  const [entering, setEntering] = useState<number | null>(null); // กำลังดำดิ่งเข้าสินค้าชิ้นไหน
  const [sound, setSound] = useState(false); // เปิดเสียงไหม (ปิดไว้ก่อนเสมอ ผู้ใช้เลือกเปิดเอง)
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

  // เคยผ่านหน้าเปิดแล้วในแท็บนี้ → ข้ามหน้าเปิด: โหลดเสร็จแล้วสินค้าบินเข้ามาเลย
  // (อ่านหลัง render แรก เพราะ server ไม่รู้ค่า sessionStorage — เก็บใน ref ไว้ใช้ตอนหน้าโหลดจบ)
  const skipIntro = useRef(false);
  useEffect(() => {
    try {
      skipIntro.current = sessionStorage.getItem(SEEN) === "1";
    } catch {
      // บางเบราว์เซอร์ (โหมดส่วนตัว/ปิด storage) อ่านไม่ได้ → แสดงหน้าเปิดตามปกติ
    }
  }, []);

  // กดเริ่มแล้ว → รอสินค้าบินมาถึงก่อนแสดงรายละเอียด (ผู้ใช้ที่ตั้ง "ลดการเคลื่อนไหว" สินค้าไม่ได้บิน แสดงทันที)
  useEffect(() => {
    if (!started) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setArrived(true), reduced ? 0 : ARRIVE_UI_DELAY);
    return () => clearTimeout(t);
  }, [started]);

  // ออกจากหน้าเปิด → สินค้าชิ้นแรกบินเข้ามา (เปิดเสียงอยู่: กริ๊ง + ลมวูบยาวๆ ตามจังหวะที่บินเข้ามา)
  const start = useCallback(() => {
    setStarted(true);
    sfx.chime();
    sfx.whoosh(1, true);
    try {
      sessionStorage.setItem(SEEN, "1");
    } catch {
      // จำไม่ได้ก็ไม่เป็นไร ครั้งหน้าแค่เห็นหน้าเปิดอีกรอบ
    }
  }, []);

  // เลื่อนวงโคจรไปตำแหน่ง t: ฉาก 3D อ่านจาก ref ทันที, รายละเอียดสินค้าอัปเดตจาก state
  const rotateTo = useCallback((t: number) => {
    ring.current.goal = t;
    setTurn(t);
  }, []);

  // หมุนไปชิ้นถัดไป (dir = 1) หรือก่อนหน้า (dir = -1)
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!busy && started) rotateTo(Math.round(ring.current.goal) + dir);
    },
    [busy, started, rotateTo],
  );

  // เลื่อนเอาชิ้น index มาจอดตรงกลาง ทางที่ใกล้ที่สุด (3 ชิ้น: ไปทางซ้ายหรือขวา 1 ชิ้นเสมอ)
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
      const href = productHref(products[index], variants[index]); // ส่งแบบที่เลือกไปด้วย เช่น /drink?v=sprite
      // ผู้ใช้ที่ตั้งค่า "ลดการเคลื่อนไหว" ในเครื่อง: ข้ามแอนิเมชัน เปลี่ยนหน้าทันที
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return router.push(href);
      bringToFront(index);
      setEntering(index);
      sfx.dive(DIVE_SECONDS);
      router.prefetch(href); // โหลดหน้าปลายทางรอไว้ระหว่างแอนิเมชัน
      timer.current = setTimeout(() => router.push(href), DIVE_SECONDS * 1000);
    },
    [router, busy, bringToFront, variants],
  );

  // คลิก/แตะสินค้า:
  // - ชิ้นที่จอดอยู่ → เข้าหน้าสินค้า
  // - ชิ้นอื่น (โผล่ขอบจอระหว่างเลื่อน) → เลื่อนมาจอดก่อน (คลิกอีกครั้งถึงเข้า)
  // - คลิกที่ 2 ของดับเบิลคลิกไม่นับ (สินค้ากำลังหมุนหนี อาจไปโดนชิ้นอื่น) ให้ onDoubleClick จัดการแทน
  const select = (index: number) => {
    if (busy || !started) return; // หน้าเปิด: สินค้ายังซ่อนอยู่ แต่กล่องรับคลิกยังอยู่ในฉาก → ไม่นับ
    const now = performance.now();
    if (now - lastPick.current.t < 450) return;
    lastPick.current = { index, t: now };
    if (index === front) enter(index);
    else bringToFront(index);
  };
  // ดับเบิลคลิกสินค้าชิ้นไหนก็ได้ = เข้าหน้าสินค้านั้นเลย
  const doubleClick = () => {
    if (!started) return;
    const { index, t } = lastPick.current;
    if (index >= 0 && performance.now() - t < 700) enter(index);
  };

  // ---------- ลากเพื่อเปลี่ยนชิ้น (เมาส์และนิ้วใช้โค้ดเดียวกัน ผ่าน Pointer Events) ----------
  // ระยะลากต่อ 1 ชิ้น: ประมาณระยะที่สินค้าเลื่อนบนจอจริง สินค้าจึงเลื่อนตามนิ้วพอดี
  const pxPerItem = () => Math.min(640, Math.max(220, window.innerWidth * (narrow ? 0.6 : 0.4)));

  const pointerDown = (e: PointerEvent) => {
    if (busy || !started || (e.pointerType === "mouse" && e.button !== 0)) return; // เมาส์: เฉพาะปุ่มซ้าย
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
    // ลากไปทางซ้าย = ชิ้นถัดไปเลื่อนเข้ามาจากขวาบน (เหมือนปัดรูปในมือถือ)
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

  // ล้อเมาส์ / ทัชแพด: เลื่อน 1 ครั้ง = หมุน 1 ชิ้น (หน้าเปิด: เลื่อนลง = เริ่ม)
  // ทัชแพดส่ง event รัวๆ ต่อเนื่อง (รวมแรงเฉื่อยหลังปล่อยนิ้ว) → นับเป็นครั้งเดียวจนกว่าจะหยุดไป 200ms
  const onWheel = (e: WheelEvent) => {
    if (busy) return;
    const w = wheel.current;
    if (e.timeStamp - w.last > 200) {
      w.acc = 0; // หยุดไปพักหนึ่งแล้ว = เริ่มการเลื่อนครั้งใหม่
      w.done = false;
    }
    w.last = e.timeStamp;
    if (w.done) return; // การเลื่อนครั้งนี้หมุนไปแล้ว รอให้หยุดก่อน
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 800 : 1; // บางเบราว์เซอร์นับเป็นบรรทัด/หน้า
    w.acc += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
    if (Math.abs(w.acc) >= 40) {
      if (!started) {
        if (w.acc > 0) start();
      } else step(w.acc > 0 ? 1 : -1); // เลื่อนลง/ไปทางขวา = ชิ้นถัดไป
      w.done = true;
    }
  };

  const onReady = useCallback(() => setReady(true), []);
  // หน้าโหลดเปิดม่านจบ → แสดงหน้าเปิด (หรือข้ามไปเลยถ้าเคยผ่านแล้ว)
  const onLoaded = useCallback(() => {
    setLoaded(true);
    if (skipIntro.current) setStarted(true);
  }, []);

  // ---------- เสียง (ปิดไว้ก่อน) ----------
  // เปิดเสียง: ต้องปลุกระบบเสียงตอนผู้ใช้กดปุ่มเท่านั้น (กฎของเบราว์เซอร์) จึงเรียก unlock ในตัวจัดการคลิกเลย
  const toggleSound = () => {
    if (!sound) sfx.unlock();
    setSound(!sound);
  };
  useEffect(() => {
    if (sound) sfx.unlock(); // กลับมาจากหน้าอื่น/แท็บอื่น: ปลุกระบบเสียงให้ทำงานต่อ
    sfx.setEnabled(sound);
  }, [sound]);
  // ซ่อนแท็บ = พักเสียง, กลับมา = ทำงานต่อ (ถ้าเปิดอยู่) / ออกจากหน้า = ปิดเสียงและพักระบบ
  const soundOn = useRef(sound);
  useEffect(() => {
    soundOn.current = sound;
  }, [sound]);
  useEffect(() => {
    const onVis = () => (document.hidden ? sfx.sleep() : soundOn.current && sfx.unlock());
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      sfx.setEnabled(false);
      sfx.sleep();
    };
  }, []);
  // เปลี่ยนชิ้น (ปุ่ม/ลาก/ล้อเมาส์) → ลมวูบตามทิศที่สินค้าบิน
  const lastTurn = useRef(turn);
  useEffect(() => {
    if (turn !== lastTurn.current) sfx.whoosh(turn > lastTurn.current ? 1 : -1);
    lastTurn.current = turn;
  }, [turn]);

  // คีย์บอร์ด: ← → เปลี่ยนชิ้น, Enter เข้าหน้าสินค้าที่จอดอยู่
  // หน้าเปิด: Enter / เว้นวรรค / ↓ / → = เริ่ม (ถ้ากำลัง focus ปุ่ม/ลิงก์อยู่ ปล่อยให้ปุ่มนั้นทำงานเอง)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!started) {
        if (!loaded) return; // ยังอยู่หน้าโหลด
        if (e.target === document.body && ["Enter", " ", "ArrowDown", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      // ถ้ากำลัง focus ปุ่ม/ลิงก์อยู่ ปล่อยให้ Enter ทำงานกับปุ่มนั้นตามปกติ
      else if (e.key === "Enter" && e.target === document.body) enter(front);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, enter, front, started, start, loaded]);

  return (
    <>
      {/* พื้นที่ฉาก 3D: รับการลาก/ล้อเมาส์/ดับเบิลคลิก
          touch-none = ปิดการเลื่อน/ซูมของเบราว์เซอร์บนฉาก ให้ฉากรับการลากเอง
          รูปเมาส์: มือจับ (ลากได้) / นิ้วชี้ตอนชี้สินค้า (คลิกได้) / กำมือตอนกำลังลาก */}
      <div
        className={`fixed inset-0 touch-none transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{
          cursor: busy || !started ? "default" : dragging ? "grabbing" : hovered !== null ? "pointer" : "grab",
        }}
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
        {/* กันพังชั้นนอกสุด: ถ้าฉาก 3D พังทั้งฉาก หัวเว็บ แผงรายละเอียด และปุ่ม Enter ยังใช้ได้ */}
        <Safe
          onError={() => {
            setProgress(100);
            onReady();
          }}
        >
          <Scene
            narrow={narrow}
            front={front}
            ring={ring}
            onHover={narrow ? () => {} : setHovered}
            onSelect={select}
            onReady={onReady}
            onProgress={setProgress}
            started={started}
            labelLayer={labelLayer}
            diveTo={entering === null ? null : look(products[entering], variants[entering]).origin}
            variants={variants}
          />
        </Safe>
      </div>
      {/* ป้ายข้างสินค้า: ซ่อนตอนหน้าเปิด/ดำดิ่ง และโผล่หลังสินค้าชิ้นแรกบินมาถึง */}
      <div
        ref={labelLayer}
        className={`pointer-events-none fixed inset-0 z-[5] transition-opacity duration-500 ${busy || !arrived ? "opacity-0" : ""}`}
      />

      {/* แถบบนสุด (จางหายตอนดำดิ่ง) */}
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-20 flex h-20 items-center justify-between px-5 transition-opacity duration-500 md:h-24 md:px-10 ${busy ? "opacity-0" : ""}`}
      >
        {cart}
        <div className="absolute left-1/2 -translate-x-1/2">{logo}</div>
        {/* ปุ่มเสียง: แท่งเสียง 4 แท่งขยับเมื่อเปิดเสียง (คลาส sound-bars ใน globals.css) */}
        <button
          onClick={toggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Turn sound off" : "Turn sound on"}
          className="orbit-mono pointer-events-auto flex items-center gap-2 text-[10px] tracking-[0.25em] text-white/70 uppercase hover:text-white"
        >
          <span className="hidden sm:inline">Sound</span>
          <span>{sound ? "On" : "Off"}</span>
          <span className={`sound-bars ${sound ? "is-on" : ""}`} aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        </button>
      </header>

      {/* หน้าเปิด: หัวข้อ + ปุ่มเริ่ม กลางจอ (class overlay = ค่อยๆ โผล่/จางตาม data-active, ตัวอักษรเลื่อนขึ้นตอนโผล่) */}
      <div
        data-active={loaded && !started}
        className="overlay pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
      >
        {/* แสงมืดจางๆ ด้านหลังข้อความ ให้อ่านง่ายแม้อยู่บนโลกที่สว่าง */}
        <div aria-hidden className="orbit-scrim absolute inset-0" />
        <div className="relative -mt-[6vh]">
          {intro}
          <button onClick={start} className="orbit-cta reveal-fade pointer-events-auto mt-9">
            {site.cta}
          </button>
          <p className="orbit-mono reveal-fade mt-5 flex items-center justify-center gap-3 text-[9px] tracking-[0.3em] text-white/45 uppercase">
            <span className="scroll-hint" aria-hidden />
            or scroll / press Enter
          </p>
        </div>
        {/* ชวนเปิดเสียง (แบบ "Experience with headphones" ของต้นแบบ) — กดแล้วเปิด/ปิดเสียงได้เลย */}
        <button
          onClick={toggleSound}
          aria-pressed={sound}
          className="orbit-mono reveal-fade pointer-events-auto absolute bottom-12 flex flex-col items-center gap-2 text-[9px] tracking-[0.3em] text-white/55 uppercase transition-colors hover:text-white"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
            <rect x="3" y="14" width="4" height="6" rx="1.5" />
            <rect x="17" y="14" width="4" height="6" rx="1.5" />
          </svg>
          {sound ? "Sound on" : "Experience with sound"}
        </button>
      </div>

      {/* คอม: ปุ่มเปลี่ยนชิ้นซ้าย/ขวาที่ขอบจอ (มือถืออยู่ข้างปุ่มเข้าในแผงรายละเอียด) */}
      {(
        [
          [-1, "Previous product", "left-10", "‹"],
          [1, "Next product", "right-10", "›"],
        ] as const
      ).map(([dir, label, side, icon]) => (
        <button
          key={dir}
          aria-label={label}
          onClick={() => step(dir)}
          className={`fixed top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/25 pb-0.5 text-2xl text-white/80 backdrop-blur-sm transition-[opacity,background-color,color] duration-500 hover:bg-white hover:text-black md:grid ${side} ${busy || !arrived ? "pointer-events-none opacity-0" : ""}`}
        >
          {icon}
        </button>
      ))}

      <OrbitPanel
        index={front}
        narrow={narrow}
        visible={arrived && !busy}
        onEnter={enter}
        onStep={step}
        variant={variants[front]}
        onVariant={(v) => {
          sfx.blip(v);
          setVariants((cur) => cur.map((x, i) => (i === front ? v : x)));
        }}
      />

      {/* ระหว่างดำดิ่ง: บอกปลายทาง แล้วจอค่อยๆ มืดลงช่วงท้าย ต่อด้วยหน้าสินค้าที่ค่อยๆ สว่างขึ้น */}
      {entering !== null && (
        <p className="orbit-mono pointer-events-none fixed inset-x-0 top-1/2 z-40 -translate-y-1/2 px-6 text-center text-[11px] tracking-[0.3em] text-white/80 uppercase motion-safe:animate-fade-in">
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

      <OrbitLoader progress={progress} ready={ready} logo={logo} onDone={onLoaded} />
    </>
  );
}
