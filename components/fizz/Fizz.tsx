"use client";

import dynamic from "next/dynamic";
import Lenis, { type VirtualScrollData } from "lenis";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Safe from "@/components/Safe";
import { benefits, brandStories } from "@/config/fizz";
import { defaultVariantIndex, products } from "@/config/products";
import * as sfx from "@/lib/fizzSound";
import { useNarrow } from "@/lib/useNarrow";
import { archivo } from "@/components/fonts";
import Hud from "./Hud";
import Loader from "./Loader";
import { CANS, createMotion, FREE_FROM, mod, SECTIONS } from "./motion";
import { BenefitNav, BenefitOverlay, BrandOverlay, Caption, GhostText, HeroOverlay } from "./Overlays";
import { Faq, Finale } from "./Outro";

// ฉาก 3D โหลดแยกไฟล์ทีหลัง (three.js ใหญ่) และรันเฉพาะในเบราว์เซอร์ — ข้อความในหน้าขึ้นก่อนได้เลย
const FizzScene = dynamic(() => import("./scene/FizzScene"), { ssr: false });

// ยี่ห้อทั้ง 6 มาจาก config สินค้า (ชื่อ ไฟล์โมเดล สี เมือง)
const drink = products.find((p) => p.slug === "drink")!;
const brands = drink.variants;
const N = brands.length;
const LAST = SECTIONS.length - 1; // section สุดท้าย = สำเนาหน้าเลือกยี่ห้อ (ใช้ตอนวนกลับ)
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
// ความดังของเสียงซ่าพื้นหลังในแต่ละ section (ตามลำดับ SECTIONS) — section ฟองซ่า/CRACK ดังสุด
const FIZZ_LEVEL = [0.25, 0.2, 0.7, 0.4, 0.25, 0.25, 0.6, 0.35, 0.12, 0.12, 0.25];

// หน้าสินค้า FIZZ: เลื่อนจอทีละ section (เหมือนเปิดหน้าหนังสือ) ฉาก 3D ขยับตามการเลื่อน
// ไฟล์นี้เป็นตัวควบคุม: ตำแหน่งเลื่อนจอ, section ที่แสดงอยู่, ยี่ห้อที่เลือก แล้วส่งต่อให้แต่ละส่วน
export default function Fizz() {
  const narrow = useNarrow();
  const motion = useRef(createMotion()); // ข้อมูลที่ฉาก 3D อ่านทุกเฟรม (ดู motion.ts)
  const urlRead = useRef(false); // อ่านยี่ห้อที่ส่งมาทาง URL (?v=) แล้วหรือยัง
  const lenis = useRef<Lenis | null>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const bar = useRef<HTMLDivElement>(null); // เส้นความคืบหน้าด้านบน
  // สถานะการเลื่อนทีละ section: busy = กำลังเลื่อนอยู่ (ไม่รับคำสั่งใหม่), last = เวลาที่หมุนล้อครั้งล่าสุด
  // queued = ปุ่มคีย์บอร์ดที่กดระหว่างกำลังเลื่อน (จำไว้ 1 ครั้ง เลื่อนเสร็จแล้วทำต่อ)
  const pager = useRef({
    busy: false,
    last: -Infinity,
    timer: 0 as ReturnType<typeof setTimeout> | 0,
    queued: 0 as -1 | 0 | 1,
  });
  const pageRef = useRef<(dir: 1 | -1) => void>(() => {});
  // การปัดนิ้วบนมือถือ: จุดเริ่มต้น + ตัดสินแล้วว่าเป็นการปัดแบบไหน
  const touch = useRef<{ x: number; y: number; mode: "page" | "free" | "side" | null } | null>(null);
  const [brand, setBrand] = useState(0);
  const [active, setActive] = useState(0); // section ที่แสดงอยู่
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false); // โมเดลกระป๋องโหลดครบแล้ว
  const [progress, setProgress] = useState<number | null>(null); // % การโหลดไฟล์จริง (null = โค้ด 3D ยังไม่มา)
  const [started, setStarted] = useState(false); // หน้าโหลดหายไปแล้ว เริ่มฉากเปิด
  const [hover, setHover] = useState(false); // เมาส์อยู่บนกระป๋อง
  const [dragging, setDragging] = useState(false);
  // ลากหมุนวงกระป๋อง (หน้าเลือกยี่ห้อ): จุดเริ่ม, ตำแหน่งวงตอนเริ่ม, ความเร็วล่าสุด
  const drag = useRef<{ x: number; from: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(
    null,
  );

  // ---------- เลือกยี่ห้อ (หมุนวงกระป๋อง) ----------
  // goal นับต่อเนื่อง (…, −1, 0, 1, 2, …) ยี่ห้อ = goal mod 6 → หมุนวนไปทางเดียวได้เรื่อยๆ ไม่สะดุด
  const rotateTo = useCallback((goal: number) => {
    motion.current.goal = goal;
    setBrand(mod(goal, N));
  }, []);
  const step = useCallback((dir: 1 | -1) => rotateTo(Math.round(motion.current.goal) + dir), [rotateTo]);
  // เลือกยี่ห้อ b ด้วยทางที่หมุนสั้นที่สุด
  const pick = useCallback(
    (b: number) => {
      const cur = Math.round(motion.current.goal);
      let d = mod(b - mod(cur, N), N);
      if (d > N / 2) d -= N;
      rotateTo(cur + d);
    },
    [rotateTo],
  );

  // ---------- เลื่อนไปยัง section ----------
  // ปล่อยให้เลื่อนได้อีกครั้งเมื่อเลื่อนเสร็จ และผู้ใช้หยุดหมุนล้อแล้ว (ทัชแพดส่ง event ต่อจากแรงเฉื่อยอีกพักหนึ่ง)
  const release = useCallback(() => {
    const p = pager.current;
    clearTimeout(p.timer);
    const check = () => {
      if (performance.now() - p.last > 180) {
        p.busy = false;
        const q = p.queued;
        p.queued = 0;
        if (q) pageRef.current(q); // มีปุ่มที่กดค้างคิวไว้ → เลื่อนต่ออีก 1 section
      } else p.timer = setTimeout(check, 60);
    };
    check();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const l = lenis.current;
      if (!l) return;
      const p = pager.current;
      p.busy = true;
      clearTimeout(p.timer);
      const far = Math.abs(motion.current.tops[index] - motion.current.scroll) > innerHeight * 1.5;
      const duration = far ? 1.6 : 1.2;
      l.scrollTo(motion.current.tops[index], { duration, easing: easeOut, lock: true, force: true, onComplete: release });
      p.timer = setTimeout(release, duration * 1000 + 400); // กันค้าง ถ้า onComplete ไม่ถูกเรียก
    },
    [release],
  );

  // ช่วงที่เลื่อนทีละ section: ก่อนถึง FAQ (หรืออยู่ขอบบน FAQ พอดีแล้วเลื่อนขึ้น)
  const paged = useCallback((dir: number) => {
    const { scroll, tops } = motion.current;
    return scroll < tops[FREE_FROM] - 4 || (dir < 0 && scroll <= tops[FREE_FROM] + 4);
  }, []);

  // เลื่อนไป section ถัดไป/ก่อนหน้า: หาขอบ section ถัดไปตามทิศ (ถ้าค้างอยู่กลาง section จะเข้าที่ก่อน)
  const page = useCallback(
    (dir: 1 | -1) => {
      const { scroll, tops } = motion.current;
      let target = -1;
      if (dir > 0) target = tops.findIndex((t, i) => i <= FREE_FROM && t > scroll + 4);
      else for (let i = FREE_FROM; i >= 0 && target < 0; i--) if (tops[i] < scroll - 4) target = i;
      if (target >= 0) goTo(target);
    },
    [goTo],
  );
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // ---------- Lenis: เลื่อนจอแบบนุ่ม + วนรอบไม่รู้จบ ----------
  useEffect(() => {
    const m = motion.current;
    const p = pager.current;
    let settle: ReturnType<typeof setTimeout> | undefined;

    // วัดตำแหน่งขอบบนของทุก section (ตอนเริ่มและทุกครั้งที่ขนาดหน้าเปลี่ยน)
    const measure = () => {
      m.tops = sections.current.map((el) => el?.offsetTop ?? 0);
    };
    measure();

    // virtualScroll: Lenis ถามเราก่อนทุกครั้งที่มีการหมุนล้อ/ปัดนิ้ว — คืนค่า false = เราจัดการเอง Lenis ไม่ต้องเลื่อน
    const onVirtual = ({ deltaX, deltaY, event }: VirtualScrollData) => {
      if (event.type === "wheel") {
        const w = event as WheelEvent;
        // ปัด 2 นิ้วแนวนอนบนทัชแพด: หน้าเลือกยี่ห้อ = หมุนวงกระป๋อง, ที่อื่นไม่ทำอะไร
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (w.cancelable) w.preventDefault();
          p.last = w.timeStamp;
          if (!p.busy && Math.abs(deltaX) > 3 && sectionAt(m.scroll) === 0) {
            p.busy = true;
            step(deltaX > 0 ? 1 : -1);
            release();
          }
          return false;
        }
        const dir = deltaY > 0 ? 1 : -1;
        if (!paged(dir)) return true; // FAQ/ท้ายเว็บ: เลื่อนอิสระ ให้ Lenis ทำตามปกติ
        if (w.cancelable) w.preventDefault();
        p.last = w.timeStamp;
        if (!p.busy && Math.abs(deltaY) > 2) page(dir);
        return false;
      }

      // นิ้วบนมือถือ: ตัดสินตอนเริ่มขยับว่าเป็นการปัดขึ้นลง (เปลี่ยน section) หรือปัดข้าง (หมุนวงกระป๋อง)
      const t = event as TouchEvent;
      const pt = t.touches[0] ?? t.changedTouches[0];
      if (!pt) return true;
      if (event.type === "touchstart") {
        touch.current = { x: pt.clientX, y: pt.clientY, mode: null };
        return true;
      }
      const s = touch.current;
      if (!s) return true;
      const dx = pt.clientX - s.x;
      const dy = pt.clientY - s.y;
      if (!s.mode && Math.max(Math.abs(dx), Math.abs(dy)) > 6) {
        if (Math.abs(dx) > Math.abs(dy)) s.mode = "side";
        else s.mode = paged(dy < 0 ? 1 : -1) ? "page" : "free";
      }
      if (s.mode === "free" || !s.mode) return true;
      if (event.cancelable) event.preventDefault();
      if (event.type === "touchend") {
        touch.current = null;
        if (s.mode === "page" && Math.abs(dy) > 30 && !p.busy) page(dy < 0 ? 1 : -1);
      }
      return false;
    };

    const l = new Lenis({ autoRaf: true, infinite: true, syncTouch: true, virtualScroll: onVirtual });
    lenis.current = l;

    // section ที่อยู่กลางจอตอนนี้
    const sectionAt = (scroll: number) => {
      const mid = scroll + innerHeight / 2;
      let a = 0;
      m.tops.forEach((top, i) => top <= mid && (a = i));
      return a;
    };

    const onScroll = () => {
      const prev = m.scroll;
      m.scroll = l.scroll;
      // เลื่อนเลยท้ายหน้า → Lenis วนกลับมาต้นหน้า (หน้าสุดท้ายหน้าตาเหมือนหน้าแรก จึงดูต่อเนื่อง) → จัดให้ตรงพอดี
      if (prev - m.scroll > l.limit * 0.5 && !p.busy) goTo(0);
      setActive(sectionAt(m.scroll));
      bar.current?.style.setProperty("--p", String(l.limit > 0 ? m.scroll / l.limit : 0));
      // หยุดเลื่อนค้างกลาง section (เช่น เลื่อนขึ้นจาก FAQ) → จัดเข้าที่ section ที่ใกล้ที่สุด
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (p.busy || l.isTouching || m.scroll >= m.tops[FREE_FROM] - 4) return;
        let near = 0;
        m.tops.forEach((top, i) => Math.abs(top - m.scroll) < Math.abs(m.tops[near] - m.scroll) && (near = i));
        if (Math.abs(m.tops[near] - m.scroll) > 4) goTo(near);
      }, 200);
    };
    l.on("scroll", onScroll);

    // เริ่มที่หน้าเลือกยี่ห้อเสมอ + ยี่ห้อที่ส่งมาจากหน้าแรก (?v=sprite) — ไม่มี ?v= (เปิดหน้านี้ตรงๆ) ใช้ยี่ห้อเริ่มต้นใน config
    // (เลือกยี่ห้อในเฟรมถัดไป: React ไม่แนะนำให้เปลี่ยน state ทันทีใน effect เพราะจะ render ซ้อนกัน)
    l.scrollTo(0, { immediate: true, force: true });
    onScroll();
    const fromUrl = brands.findIndex((b) => b.id === new URLSearchParams(location.search).get("v"));
    const start = fromUrl >= 0 ? fromUrl : defaultVariantIndex(drink);
    const startFrame = requestAnimationFrame(() => {
      urlRead.current = true; // อ่านยี่ห้อจาก URL แล้ว ต่อจากนี้เขียน URL ตามยี่ห้อที่เลือกได้
      if (start > 0) rotateTo(start);
    });

    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    ro.observe(document.body);

    // เมาส์: ใช้ทำให้กระป๋องหันตามเล็กน้อย (−1 ถึง 1)
    const onPointer = (e: PointerEvent) => {
      m.pointerX = (e.clientX / innerWidth) * 2 - 1;
      m.pointerY = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener("pointermove", onPointer);

    return () => {
      // หน้าถูกซ่อน/ปิด (เช่น กดกลับหน้าโชว์รูม): เลิกใช้ Lenis คืนการเลื่อนจอปกติ
      cancelAnimationFrame(startFrame);
      ro.disconnect();
      removeEventListener("pointermove", onPointer);
      clearTimeout(settle);
      clearTimeout(p.timer);
      p.busy = false;
      l.destroy();
      lenis.current = null;
    };
  }, [goTo, page, paged, release, rotateTo, step]);

  // คีย์บอร์ด: ↓ ↑ PageDown PageUp Space = เปลี่ยน section, ← → = เปลี่ยนยี่ห้อ (ในหน้าเลือกยี่ห้อ)
  // (ถ้าไม่ดักไว้ เบราว์เซอร์จะเลื่อนจอเองครั้งละเกือบเต็มจอ ไม่ตรง section)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; // กำลังพิมพ์อยู่
      // Space บนปุ่ม/ลิงก์ = กดปุ่มนั้น จึงใช้เลื่อน section เฉพาะตอนไม่ได้เลือกปุ่มอะไรอยู่
      const space = e.key === " " && el === document.body;
      const down = e.key === "ArrowDown" || e.key === "PageDown" || space;
      const up = e.key === "ArrowUp" || e.key === "PageUp";
      if ((down || up) && paged(down ? 1 : -1)) {
        e.preventDefault();
        if (!pager.current.busy) page(down ? 1 : -1);
        else pager.current.queued = down ? 1 : -1;
      } else if (active === 0 && el === document.body && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        step(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [active, page, paged, step]);

  // ---------- เสียง (ปิดไว้ก่อนเสมอ เปิดได้จากปุ่มมุมซ้ายบน) ----------
  // เปิด/ปิด: ต้องปลุกระบบเสียงตอนผู้ใช้กดปุ่มจริงๆ (กฎของเบราว์เซอร์) จึงเรียก unlock ใน handler นี้
  const toggleSound = () => {
    if (!sound) sfx.unlock();
    setSound(!sound);
  };
  // ปุ่ม "ฟังเสียง" ใน section CRACK: เปิดเสียง (ถ้ายังปิด) แล้วเล่นเสียงเปิดกระป๋อง
  const playCrack = () => {
    sfx.unlock();
    setSound(true);
    setTimeout(sfx.crack, 150); // รอเสียงหลักเฟดขึ้นนิดหนึ่งก่อน
  };
  useEffect(() => {
    if (sound) sfx.unlock(); // กลับมาจากหน้าอื่น/แท็บอื่น: ปลุกระบบเสียงให้ทำงานต่อ
    sfx.setEnabled(sound);
  }, [sound]);
  useEffect(() => {
    if (sound) sfx.setFizz(FIZZ_LEVEL[active]);
  }, [active, sound]);
  // เปลี่ยน section = ลมวูบ, เข้า section CRACK = เสียงเปิดกระป๋อง, เปลี่ยนยี่ห้อ = ฟองแตกป๊อก
  const heard = useRef({ active, brand });
  useEffect(() => {
    const h = heard.current;
    if (sound && h.active !== active) {
      sfx.whoosh();
      if (SECTIONS[active] === "crack") sfx.crack();
    }
    if (sound && h.brand !== brand) sfx.pop(brand);
    heard.current = { active, brand };
  }, [active, brand, sound]);
  // ซ่อนแท็บ = พักระบบเสียง, กลับมา = ปลุก (ถ้าเปิดเสียงไว้) / ออกจากหน้านี้ = ปิดเสียง
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

  // ยี่ห้อที่เลือกอยู่ใส่ไว้ใน URL (?v=pepsi) แชร์ลิงก์แล้วเปิดมาเจอยี่ห้อเดิม (replaceState = ไม่เพิ่มประวัติการกด back)
  // ต้องรออ่าน ?v= ที่ส่งมาจากหน้าแรกก่อน (urlRead) ไม่งั้นจะเขียนยี่ห้อแรกทับ — โหมด dev ที่ React รัน effect 2 รอบจะเจอ
  useEffect(() => {
    motion.current.tint = brands[brand].accent; // ฟองซ่าเปลี่ยนสีตามยี่ห้อ
    if (!urlRead.current) return;
    const url = new URL(location.href);
    url.searchParams.set("v", brands[brand].id);
    history.replaceState(history.state, "", url);
  }, [brand]);

  // ---------- ลากหมุนวงกระป๋อง (เมาส์และนิ้วใช้โค้ดเดียวกัน) เฉพาะหน้าเลือกยี่ห้อ ----------
  const pxPerCan = () => Math.min(420, Math.max(150, innerWidth * (innerWidth < 768 ? 0.45 : 0.2)));
  const pointerDown = (e: ReactPointerEvent) => {
    if (active !== 0 || (e.pointerType === "mouse" && e.button !== 0)) return;
    const goal = motion.current.goal;
    drag.current = { x: e.clientX, from: goal, moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const pointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (e.pointerType === "mouse" && e.buttons === 0) {
      drag.current = null; // ปล่อยเมาส์นอกฉากไปแล้ว
      return;
    }
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return; // ขยับนิดเดียว = ยังเป็นการคลิก
      d.moved = true;
      motion.current.dragging = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId); // ลากเลยออกนอกฉากก็ยังหมุนต่อได้
    }
    const per = pxPerCan();
    const dt = (e.timeStamp - d.lastT) / 1000;
    if (dt > 0) d.v = 0.7 * d.v + 0.3 * (-(e.clientX - d.lastX) / per / dt);
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    motion.current.goal = d.from - dx / per; // ลากไปซ้าย = ใบทางขวาเลื่อนเข้ามาตรงกลาง
    setBrand(mod(Math.round(motion.current.goal), N));
  };
  const pointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    motion.current.dragging = false;
    setDragging(false);
    const g = motion.current.goal;
    const v = e.timeStamp - d.lastT > 120 ? 0 : d.v; // ค้างนิ้วไว้ก่อนปล่อย = ไม่มีแรงส่ง
    let target = Math.round(g + Math.max(-1, Math.min(1, v * 0.25)));
    if (target === Math.round(d.from) && Math.abs(g - d.from) > 0.15) target += Math.sign(g - d.from);
    rotateTo(target);
  };

  // คลิกกระป๋อง: ใบตรงกลาง = ไปดูประวัติยี่ห้อ, ใบอื่น = หมุนมาไว้ตรงกลาง (เฉพาะหน้าเลือกยี่ห้อ)
  const onPick = (can: number) => {
    if (active !== 0) return;
    const cur = Math.round(motion.current.goal);
    let d = mod(can - mod(cur, CANS), CANS);
    if (d > CANS / 2) d -= CANS;
    if (d === 0) goTo(1);
    else rotateTo(cur + d);
  };
  const onReady = useCallback(() => setReady(true), []);
  const onProgress = useCallback((p: number) => setProgress(p), []);
  // หน้าโหลดจางหายแล้ว → กระป๋องเริ่มร่วงลงมาจากฟ้า + ข้อความหน้าแรกเริ่มเลื่อนขึ้นมา
  // (ผู้ใช้ที่ตั้ง "ลดการเคลื่อนไหว": กระป๋องอยู่ในแถวเลย ไม่ต้องร่วง)
  const onLoaded = useCallback(() => {
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    motion.current.introAt = performance.now() - (still ? 60_000 : 0);
    setStarted(true);
  }, []);

  const b = brands[brand];
  const tint = brandStories[b.id].tint;

  return (
    <div
      className={`${archivo.variable} fizz-root`}
      data-section={SECTIONS[active]}
      // สีพื้นหลังของยี่ห้อที่เลือก: CSS ทั้งหน้าใช้ var(--tint1) / var(--tint2) และค่อยๆ เปลี่ยนสีเอง
      style={{ "--tint1": tint[0], "--tint2": tint[1] } as CSSProperties}
    >
      <h1 className="sr-only">FIZZ — six classic sodas in 3D</h1>

      {/* ชั้นหลังสุด: พื้นหลังไล่สีตามยี่ห้อ + เงาฟุ้งที่เปลี่ยนไปตาม section (ดู .fizz-bg ใน globals.css) */}
      <div aria-hidden className="fizz-bg fixed inset-0 z-0">
        <div className="fizz-glow" />
        <div className="fizz-blobs" />
        <div className="fizz-dark" />
      </div>

      {/* ตัวหนังสือใหญ่จางๆ (อยู่หลังกระป๋อง) */}
      <GhostText active={active === 6} lines={["Crack.", "Fizz.", "Sip."]} />
      <GhostText active={active === 7} lines={["Six", "classics."]} size="text-[clamp(3rem,12.5vw,12rem)]" />

      {/* ฉาก 3D (อยู่กับที่เต็มจอ) — รับการลากหมุนวงกระป๋องในหน้าเลือกยี่ห้อ
          touch-none: นิ้วบนฉากไม่ทำให้เบราว์เซอร์เลื่อน/ซูมเอง (เราจัดการเองทั้งหมด) */}
      <div
        aria-hidden
        className="fixed inset-0 z-[2] touch-none"
        style={{ cursor: active !== 0 ? "default" : dragging ? "grabbing" : hover ? "pointer" : "grab" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <Safe onError={onReady}>
          <FizzScene
            motion={motion}
            narrow={narrow}
            onReady={onReady}
            onProgress={onProgress}
            onPick={onPick}
            onHover={setHover}
          />
        </Safe>
      </div>

      {/* ข้อความของแต่ละ section (ลอยอยู่กับที่ เปลี่ยนตาม section ที่แสดง) */}
      <HeroOverlay
        active={started && (active === 0 || active === LAST)}
        brands={brands}
        brand={brand}
        onStep={step}
        onPick={pick}
      />
      <BrandOverlay active={active === 1} brand={b} />
      {benefits.map((x, i) => (
        <BenefitOverlay key={x.id} active={active === i + 2} index={i} />
      ))}
      <BenefitNav active={active >= 1 && active <= 5} current={active - 2} onGo={(i) => goTo(i + 2)} />
      <Caption
        active={active === 6}
        title="Pssst."
        text="Cold can, one crack, the first rush of bubbles."
        action={{ label: sound ? "Crack another ▸" : "Hear it ▸", onClick: playCrack }}
      />
      <Caption active={active === 7} title="The lineup" text={brands.map((x) => x.name).join(" · ")} />

      {/* เนื้อหาที่เลื่อนจริง: section ละ 1 จอ (เป็นตัวกำหนดความยาวหน้า) + FAQ + ท้ายเว็บ
          pointer-events-none: เมาส์ทะลุไปถึงฉาก 3D ยกเว้นส่วนที่เปิดไว้ (FAQ, ปุ่มท้ายเว็บ) */}
      <main className="pointer-events-none relative z-[3]">
        {SECTIONS.map((id, i) => (
          <section
            key={id}
            id={id}
            ref={(el) => {
              sections.current[i] = el;
            }}
            className={id === "faq" ? "relative" : "relative h-svh"}
          >
            {id === "faq" && <Faq />}
            {id === "finale" && <Finale />}
          </section>
        ))}
      </main>

      {/* แถบไล่สีจางด้านบนจอ (FAQ/ท้ายเว็บ): ข้อความที่เลื่อนขึ้นไปจะจางหายก่อนถึงโลโก้ ไม่ทับกัน */}
      <div aria-hidden className="fizz-topfade pointer-events-none fixed inset-x-0 top-0 z-[4] h-36" />
      <Hud bar={bar} sound={sound} onSound={toggleSound} onLogo={() => goTo(0)} />
      <Loader progress={progress} ready={ready} onDone={onLoaded} />
    </div>
  );
}
