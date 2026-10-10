"use client";

import dynamic from "next/dynamic";
import Lenis, { type VirtualScrollData } from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import Safe from "@/components/Safe";
import { archivo, plexMono } from "@/components/fonts";
import { CHAPTERS, STORY_CAR } from "@/config/f1";
import { products } from "@/config/products";
import { useNarrow } from "@/lib/useNarrow";
import DesignSection from "./DesignSection";
import HeritageSection from "./HeritageSection";
import Hud from "./Hud";
import Loader from "./Loader";
import {
  ASSEMBLE,
  createMotion,
  DESIGN_I,
  EXPLODE_I,
  FIRST_CHAPTER,
  HERITAGE_I,
  NO_3D,
  sectionProgress,
  SECTIONS,
  SPEED_I,
} from "./motion";
import { AssembleOverlay, ChapterNav, ChapterOverlay, ExplodeOverlay, GhostText, HeroOverlay, Outro } from "./Overlays";
import SpeedSection from "./SpeedSection";

// ฉาก 3D โหลดแยกไฟล์ทีหลัง (three.js ใหญ่) และรันเฉพาะในเบราว์เซอร์ — ข้อความในหน้าขึ้นก่อนได้เลย
const F1Scene = dynamic(() => import("./scene/F1Scene"), { ssr: false });

const f1 = products.find((p) => p.slug === "f1")!;
const car = f1.variants.find((v) => v.name === STORY_CAR.name) ?? f1.variants[0]; // ใช้เมืองบ้านเกิดของรถในเรื่อง
const LAST = SECTIONS.length - 1;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// หน้าประวัติยาวกว่า 1 จอ (แบบเว็บ Longbow): ในช่วงนี้เลื่อนจออิสระนุ่มๆ ตามล้อ/นิ้ว ไม่ใช่ทีละ section
// ช่วง = ตั้งแต่ขอบบนของหน้าประวัติอยู่ที่ขอบบนจอ จนขอบล่างของหน้าประวัติถึงขอบล่างจอ (null = หน้าสั้นกว่า 1 จอ)
const freeRange = (tops: number[]) => {
  const start = tops[HERITAGE_I];
  const end = tops[HERITAGE_I + 1] - innerHeight;
  return end > start + 4 ? { start, end } : null;
};
const inside = (y: number, f: { start: number; end: number } | null) => !!f && y >= f.start - 2 && y <= f.end + 2;

// ช่วงที่รถแยกชิ้น (หน้าความสวย ↔ แยกชิ้น) และประกอบกลับ (บทล้อ ↔ ประกอบกลับ): เลื่อนช้ากว่าปกติ
// ให้เห็นชิ้นส่วนลอยออก/บินกลับเข้าที่ทีละชิ้น
const SLOW: [number, number][] = [
  [DESIGN_I, EXPLODE_I],
  [ASSEMBLE - 1, ASSEMBLE],
];
const isSlow = (from: number, to: number) =>
  SLOW.some(([a, b]) => Math.min(from, to) >= a - 0.01 && Math.max(from, to) <= b + 0.01);

// หน้า GRID 26 (/f1): เลื่อนจอทีละ section (เหมือนเปิดทีละสไลด์)
// หน้าแรก → ความเร็ว → ประวัติ → ความสวย → รถ RB22 แยกชิ้น → 8 บทชิ้นส่วน → ประกอบกลับ → ไปโชว์รูม
// ไฟล์นี้เป็นตัวควบคุม: ตำแหน่งเลื่อนจอ, section ที่แสดงอยู่ แล้วส่งต่อให้ฉาก 3D และข้อความแต่ละส่วน
// (โครงเดียวกับหน้า FIZZ: components/fizz/Fizz.tsx แต่ไม่มีเลือกยี่ห้อ/ไม่วนรอบ/ไม่มีเสียง)
export default function F1Story() {
  const narrow = useNarrow();
  const motion = useRef(createMotion()); // ข้อมูลที่ฉาก 3D อ่านทุกเฟรม (ดู motion.ts)
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
  // การปัดนิ้วบนมือถือ: y = จุดเริ่ม, paging = ปัดเปลี่ยน section, free = เลื่อนอิสระในหน้าประวัติ, from = ตำแหน่งตอนเริ่มแตะ
  const touch = useRef<{ y: number; paging: boolean; free: boolean; from: number } | null>(null);
  const [active, setActive] = useState(0); // section ที่แสดงอยู่
  const [ready, setReady] = useState(false); // โมเดลรถโหลดครบแล้ว
  const [progress, setProgress] = useState<number | null>(null); // % การโหลดไฟล์จริง (null = โค้ด 3D ยังไม่มา)
  const [started, setStarted] = useState(false); // หน้าโหลดหายไปแล้ว

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

  // y = ตำแหน่งที่จะไป (ปกติ = ขอบบนของ section นั้น)
  const goTo = useCallback(
    (index: number, y?: number) => {
      const l = lenis.current;
      if (!l) return;
      const p = pager.current;
      p.busy = true;
      clearTimeout(p.timer);
      const m = motion.current;
      const to = y ?? m.tops[index];
      const far = Math.abs(to - m.scroll) > innerHeight * 1.5;
      const duration = isSlow(sectionProgress(m), index) ? 2.6 : far ? 1.8 : 1.3;
      l.scrollTo(to, { duration, easing: easeOut, lock: true, force: true, onComplete: release });
      p.timer = setTimeout(release, duration * 1000 + 400); // กันค้าง ถ้า onComplete ไม่ถูกเรียก
    },
    [release],
  );

  // เลื่อนไป section ถัดไป/ก่อนหน้า: หาขอบ section ถัดไปตามทิศ (ถ้าค้างอยู่กลาง section จะเข้าที่ก่อน)
  // นับจากจุดที่จอกำลังเลื่อนไป (targetScroll) ไม่ใช่จุดที่จออยู่ตอนนี้ — เลื่อนขึ้นเร็วๆ ถึงหัวหน้าประวัติ จอยังตามไม่ทัน
  // ถ้านับจากจุดที่จออยู่ จะคิดว่ายังอยู่ในหน้าประวัติ แล้วเด้งไปท้ายหน้าประวัติแทนที่จะขึ้นไปหน้าความเร็ว
  const page = useCallback(
    (dir: 1 | -1) => {
      const { tops } = motion.current;
      const scroll = lenis.current?.targetScroll ?? motion.current.scroll;
      let target = -1;
      if (dir > 0) target = tops.findIndex((t) => t > scroll + 4);
      else for (let i = LAST; i >= 0 && target < 0; i--) if (tops[i] < scroll - 4) target = i;
      if (target < 0) return;
      // ย้อนขึ้นมาจากหน้าความสวย → ไปที่ท้ายหน้าประวัติ (แล้วเลื่อนอ่านย้อนขึ้นไปได้) ไม่กระโดดไปหัวหน้า
      const f = freeRange(tops);
      if (dir < 0 && target === HERITAGE_I && f) goTo(target, f.end);
      else goTo(target);
    },
    [goTo],
  );
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // ---------- Lenis: เลื่อนจอแบบนุ่ม ทีละ section ----------
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
    // ในหน้าประวัติ (เลื่อนอิสระ) แก้ data.deltaY ให้ไม่เลยขอบช่วง แล้วคืน true = ให้ Lenis เลื่อนแบบนุ่มให้
    const onVirtual = (data: VirtualScrollData) => {
      const { deltaX, deltaY, event } = data;
      const l = lenis.current;
      if (!l) return false;
      const f = freeRange(m.tops);
      const at = l.targetScroll; // ตำแหน่งที่กำลังเลื่อนไป

      if (event.type === "wheel") {
        const w = event as WheelEvent;
        if (Math.abs(deltaX) > Math.abs(deltaY)) return false; // ปัดแนวนอน: ไม่ทำอะไร
        const gap = w.timeStamp - p.last; // ห่างจาก event ล้อครั้งก่อน (หมุนต่อเนื่อง/แรงเฉื่อยทัชแพด = ไม่ถึง 0.2 วินาที)
        p.last = w.timeStamp;
        if (!p.busy && inside(at, f)) {
          const atEdge = deltaY > 0 ? at >= f!.end - 1 : at <= f!.start + 1;
          if (!atEdge) {
            data.deltaY = clamp(at + deltaY, f!.start, f!.end) - at;
            return true;
          }
          // ถึงปลายหน้าประวัติแล้ว: แรงหมุนเดิมที่ยังค้างอยู่ไม่พาข้าม section — ต้องหมุนใหม่อีกครั้ง
          if (gap < 200) {
            if (w.cancelable) w.preventDefault();
            return false;
          }
        }
        if (w.cancelable) w.preventDefault();
        if (!p.busy && Math.abs(deltaY) > 2) page(deltaY > 0 ? 1 : -1);
        return false;
      }

      // นิ้วบนมือถือ: ปัดขึ้น = section ถัดไป, ปัดลง = ก่อนหน้า (ตัดสินตอนปล่อยนิ้ว)
      const t = event as TouchEvent;
      const pt = t.touches[0] ?? t.changedTouches[0];
      if (!pt) return true;
      if (event.type === "touchstart") {
        touch.current = { y: pt.clientY, paging: false, free: false, from: at };
        return true; // ยังไม่กันอะไร — แตะปุ่ม/ลิงก์ต้องกดได้ตามปกติ
      }
      const s = touch.current;
      if (!s) return true;
      const dy = pt.clientY - s.y;

      // เริ่มแตะในหน้าประวัติ: เลื่อนตามนิ้วอิสระ (ยกเว้นเริ่มที่ขอบแล้วปัดออกนอกช่วง = เปลี่ยน section ตามปกติ)
      if (!s.paging && !p.busy && inside(s.from, f)) {
        const leaving = dy < 0 ? s.from >= f!.end - 1 : s.from <= f!.start + 1;
        if (s.free || (Math.abs(dy) > 6 && !leaving)) {
          s.free = true;
          data.deltaY = clamp(at + deltaY, f!.start, f!.end) - at;
          if (event.type === "touchend") {
            touch.current = null;
            // ปล่อยนิ้ว: Lenis ไหลต่อตามแรงเฉื่อย — ถ้าจะไหลเลยขอบช่วง ดึงกลับมาหยุดที่ขอบ
            queueMicrotask(() => {
              const end = clamp(l.targetScroll, f!.start, f!.end);
              if (end !== l.targetScroll) l.scrollTo(end, { programmatic: false, lerp: 0.075 });
            });
          }
          return true;
        }
      }
      if (Math.abs(dy) > 6) s.paging = true;
      if (!s.paging) return true;
      if (event.cancelable) event.preventDefault();
      if (event.type === "touchend") {
        touch.current = null;
        if (Math.abs(dy) > 30 && !p.busy) page(dy < 0 ? 1 : -1);
      }
      return false;
    };

    const l = new Lenis({ autoRaf: true, syncTouch: true, virtualScroll: onVirtual });
    lenis.current = l;

    // section ที่อยู่กลางจอตอนนี้
    const sectionAt = (scroll: number) => {
      const mid = scroll + innerHeight / 2;
      let a = 0;
      m.tops.forEach((top, i) => top <= mid && (a = i));
      return a;
    };

    const onScroll = () => {
      m.scroll = l.scroll;
      setActive(sectionAt(m.scroll));
      bar.current?.style.setProperty("--p", String(l.limit > 0 ? m.scroll / l.limit : 0));
      // หยุดเลื่อนค้างกลาง section (เช่น ย่อ/ขยายหน้าต่าง) → จัดเข้าที่ section ที่ใกล้ที่สุด
      clearTimeout(settle);
      settle = setTimeout(() => {
        if (p.busy || l.isTouching || inside(m.scroll, freeRange(m.tops))) return; // หน้าประวัติหยุดตรงไหนก็ได้
        let near = 0;
        m.tops.forEach((top, i) => Math.abs(top - m.scroll) < Math.abs(m.tops[near] - m.scroll) && (near = i));
        if (Math.abs(m.tops[near] - m.scroll) > 4) goTo(near);
      }, 200);
    };
    l.on("scroll", onScroll);

    // เริ่มที่หน้าแรก หรือ section ที่ระบุในลิงก์ เช่น /f1#power = บทเครื่องยนต์ (ไว้ให้หน้าโชว์รูมลิงก์มาได้)
    const fromHash = SECTIONS.indexOf(decodeURIComponent(location.hash.slice(1)));
    l.scrollTo(fromHash > 0 ? m.tops[fromHash] : 0, { immediate: true, force: true });
    onScroll();

    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    ro.observe(document.body);

    // เมาส์: กล้องขยับตามเล็กน้อย (−1 ถึง 1)
    const onPointer = (e: PointerEvent) => {
      m.pointerX = (e.clientX / innerWidth) * 2 - 1;
      m.pointerY = (e.clientY / innerHeight) * 2 - 1;
    };
    addEventListener("pointermove", onPointer);

    return () => {
      // หน้าถูกซ่อน/ปิด (เช่น กดกลับหน้าโชว์รูม): เลิกใช้ Lenis คืนการเลื่อนจอปกติ
      ro.disconnect();
      removeEventListener("pointermove", onPointer);
      clearTimeout(settle);
      clearTimeout(p.timer);
      p.busy = false;
      l.destroy();
      lenis.current = null;
    };
  }, [goTo, page]);

  // คีย์บอร์ด: ↓ ↑ PageDown PageUp Space = เปลี่ยน section, Home/End = หน้าแรก/หน้าสุดท้าย
  // (ถ้าไม่ดักไว้ เบราว์เซอร์จะเลื่อนจอเองครั้งละเกือบเต็มจอ ไม่ตรง section)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return; // กำลังพิมพ์อยู่
      // Space บนปุ่ม/ลิงก์ = กดปุ่มนั้น จึงใช้เลื่อน section เฉพาะตอนไม่ได้เลือกปุ่มอะไรอยู่
      const space = e.key === " " && el === document.body;
      const down = e.key === "ArrowDown" || e.key === "PageDown" || space;
      const up = e.key === "ArrowUp" || e.key === "PageUp";
      if (down || up) {
        e.preventDefault();
        // ในหน้าประวัติ: เลื่อนทีละ 70% ของจอ จนถึงปลายหน้า แล้วค่อยเปลี่ยน section
        const l = lenis.current;
        const f = freeRange(motion.current.tops);
        if (l && !pager.current.busy && inside(l.targetScroll, f)) {
          const at = l.targetScroll;
          if (down ? at < f!.end - 1 : at > f!.start + 1) {
            l.scrollTo(clamp(at + (down ? 0.7 : -0.7) * innerHeight, f!.start, f!.end), { programmatic: false, lerp: 0.12 });
            return;
          }
        }
        if (!pager.current.busy) page(down ? 1 : -1);
        else pager.current.queued = down ? 1 : -1;
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        goTo(e.key === "Home" ? 0 : LAST);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [goTo, page]);

  const onReady = useCallback(() => setReady(true), []);
  const onProgress = useCallback((p: number) => setProgress(p), []);
  const onLoaded = useCallback(() => setStarted(true), []);
  const chapter = active - FIRST_CHAPTER; // บทที่แสดงอยู่ (ติดลบ/เกิน = ไม่ได้อยู่ในบทชิ้นส่วน)
  const hidden = NO_3D.has(active); // section นี้ไม่ใช้ฉาก 3D (หน้าประวัติ: วิดีโอ + รูปถ่าย) → ซ่อนฉาก

  return (
    <div className={`${archivo.variable} ${plexMono.variable} f1-root`}>
      <h1 className="sr-only">GRID 26 — the {STORY_CAR.name}, taken apart in 3D</h1>

      {/* ชั้นหลังสุด: กระดาษเขียนแบบสีเทาอ่อน + เส้นกริด (ดู .f1-paper ใน globals.css)
          ใส่เป็น div ของหน้านี้เอง ไม่แก้สีพื้นของ body (หน้าอื่นของเว็บเป็นพื้นดำ) */}
      <div aria-hidden className="f1-paper fixed inset-0 z-0" />

      {/* ตัวหนังสือใหญ่จางๆ ด้านหลังรถ ในหน้าแรก */}
      <GhostText active={started && active === 0} text={STORY_CAR.short} />

      {/* ฉาก 3D (อยู่กับที่เต็มจอ) — touch-none: นิ้วบนฉากไม่ทำให้เบราว์เซอร์เลื่อน/ซูมเอง (เราจัดการเองทั้งหมด)
          section ที่ไม่ใช้ฉาก 3D: ฉากค่อยๆ จางหาย แล้วหยุดวาด (ดู Pause ใน F1Scene) */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[2] touch-none transition-opacity duration-500 ${hidden ? "opacity-0" : ""}`}
      >
        <Safe onError={onReady}>
          <F1Scene
            motion={motion}
            narrow={narrow}
            hidden={hidden}
            started={started}
            onReady={onReady}
            onProgress={onProgress}
          />
        </Safe>
      </div>

      {/* ข้อความของแต่ละ section (ลอยอยู่กับที่ เปลี่ยนตาม section ที่แสดง) */}
      <HeroOverlay active={started && active === 0} car={STORY_CAR.name} />
      <SpeedSection active={active === SPEED_I} narrow={narrow} />
      <DesignSection active={active === DESIGN_I} motion={motion} />
      <ExplodeOverlay active={active === EXPLODE_I} />
      {CHAPTERS.map((c, i) => (
        <ChapterOverlay key={c.id} active={chapter === i} chapter={c} index={i} />
      ))}
      <ChapterNav active={chapter >= 0 && active < ASSEMBLE} current={chapter} onGo={(i) => goTo(FIRST_CHAPTER + i)} />
      <AssembleOverlay active={active === ASSEMBLE} />
      <Outro active={active === LAST} note={f1.note} />

      {/* เนื้อหาที่เลื่อนจริง: section ละ 1 จอ (เป็นตัวกำหนดความยาวหน้า) ยกเว้นหน้าประวัติที่ยาวตามเนื้อหา
          pointer-events-none: เมาส์ทะลุไปถึงฉาก 3D */}
      <main className="pointer-events-none relative z-[3]">
        {SECTIONS.map((id, i) => (
          <section
            key={id}
            id={id}
            ref={(el) => {
              sections.current[i] = el;
            }}
            className={i === HERITAGE_I ? "relative min-h-svh" : "relative h-svh"}
          >
            {i === HERITAGE_I && <HeritageSection />}
          </section>
        ))}
      </main>

      {/* ม่านกระดาษใต้แถบเมนู/ป้ายมุมล่าง ตอนหน้าประวัติเลื่อนผ่าน */}
      <div aria-hidden className={`f1-veil f1-veil-top ${active === HERITAGE_I ? "is-on" : ""}`} />
      <div aria-hidden className={`f1-veil f1-veil-bottom ${active === HERITAGE_I ? "is-on" : ""}`} />

      <Hud
        bar={bar}
        sheet={active + 1}
        sheets={SECTIONS.length}
        origin={car.origin}
        onLogo={() => goTo(0)}
        garage={active > SPEED_I}
      />
      <Loader progress={progress} ready={ready} onDone={onLoaded} />
    </div>
  );
}
