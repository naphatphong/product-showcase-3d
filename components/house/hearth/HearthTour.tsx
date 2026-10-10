"use client";

import dynamic from "next/dynamic";
import type Lenis from "lenis";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import Safe from "@/components/Safe";
import { HEARTH, STOPS } from "@/config/hearth";
import { SETTLE_AT, clamp, createMotion, nightAt, stopAt } from "./timeline";

// ฉาก 3D (three.js + ไฟล์ห้อง ~13 MB) โหลดเมื่อเลื่อนมาใกล้ส่วนนี้เท่านั้น
const HearthScene = dynamic(() => import("./HearthScene"), { ssr: false });

const N = STOPS.length;
const PAUSE = 3000; // ปุ่ม Auto: หยุดดูแต่ละมุมกี่มิลลิวินาที
const pad = (n: number) => String(n).padStart(2, "0");
const linear = (x: number) => x;
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ตำแหน่งเลื่อนหน้า (px) ที่ทำให้ทัวร์อยู่ที่ t (ใช้ทั้งในทัวร์ และป้ายห้องบนแปลนที่พากลับมาดูมุมนั้น)
export function tourY(t: number) {
  const el = document.getElementById("tour");
  if (!el) return 0;
  return el.getBoundingClientRect().top + scrollY + (t / N) * (el.offsetHeight - innerHeight);
}

// ทัวร์ห้อง HEARTH: ส่วนที่สูง N+1 จอ ภาพ 3D ติดอยู่กับจอ (sticky) ระหว่างเลื่อนผ่าน
// เลื่อนลง 1 จอ = ไป 1 มุม: กล้องเดินทางไปมุมถัดไป แล้วค่อยๆ เคลื่อนเข้าช้าๆ เฟอร์นิเจอร์มุมนั้นเด้งขึ้น
// เลื่อนกลับขึ้น = เฟอร์นิเจอร์ยุบลงไป / ปุ่ม Auto เลื่อนให้เองทีละมุม หยุดดูมุมละ 3 วินาที
export default function HearthTour({ lenis }: { lenis: RefObject<Lenis | null> }) {
  const section = useRef<HTMLElement>(null);
  const autoBtn = useRef<HTMLButtonElement>(null);
  const motion = useRef(createMotion()); // ตำแหน่งในทัวร์ (ฉาก 3D อ่านทุกเฟรม)
  const autoRun = useRef({ id: 0, timer: 0 }); // รอบของปุ่ม Auto (id เปลี่ยน = รอบเก่าถูกยกเลิก)
  const [stop, setStop] = useState(0); // มุมที่กำลังแสดง
  const [dark, setDark] = useState(false); // ยามค่ำ → ตัวหนังสือสีอ่อน
  const [lite, setLite] = useState<boolean | null>(null); // null = ยังไม่โหลดฉาก / true = มือถือ (โมเดลเบา)
  const [inView, setInView] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [auto, setAuto] = useState(false);

  // ---------- การเลื่อน → ตำแหน่งในทัวร์ ----------
  useEffect(() => {
    let raf = 0;
    const sync = () => {
      raf = 0;
      const t = motion.current.t;
      setStop(stopAt(t).i); // ค่าเท่าเดิม React ไม่วาดใหม่
      setDark(nightAt(t) > 0.5);
    };
    const onScroll = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 0 = ขอบบนของส่วนนี้ถึงขอบบนจอ → N = เลื่อนจนขอบล่างของส่วนนี้ถึงขอบล่างจอ
      motion.current.t = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1) * N;
      if (!raf) raf = requestAnimationFrame(sync); // ข้อความ/จุดนำทางอัปเดตเฟรมละครั้งพอ
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ---------- ปุ่ม Auto ----------
  const stopAuto = useCallback(() => {
    const a = autoRun.current;
    a.id++;
    clearTimeout(a.timer);
    setAuto(false);
  }, []);

  // เลื่อนหน้าไปที่ตำแหน่ง t ของทัวร์ (ใช้ Lenis ให้นุ่ม / เครื่องที่ลดภาพเคลื่อนไหว: กระโดดไปเลย)
  const scrollToT = useCallback(
    (target: number, easing: (x: number) => number, done?: () => void) => {
      const y = tourY(target);
      const l = lenis.current;
      if (l) {
        const distance = Math.abs(target - motion.current.t);
        l.scrollTo(y, { duration: clamp(0.8 + distance * 2.4, 1.6, 4.5), easing, onComplete: () => done?.() });
      } else {
        scrollTo({ top: y, behavior: "instant" });
        done?.();
      }
    },
    [lenis],
  );

  const startAuto = useCallback(() => {
    const a = autoRun.current;
    const id = ++a.id;
    setAuto(true);
    const wait = () => {
      if (a.id === id) a.timer = window.setTimeout(next, PAUSE);
    };
    // ไปมุมถัดไปที่ยังไม่ถึงจุดพักดู (ความเร็วเลื่อนคงที่: กล้องชะลอเองตอนถึงแต่ละมุมอยู่แล้ว)
    function next() {
      if (a.id !== id) return;
      const i = STOPS.findIndex((_, k) => k + SETTLE_AT > motion.current.t + 0.02);
      if (i < 0) {
        a.id++;
        setAuto(false); // ถึงมุมสุดท้ายแล้ว
        return;
      }
      scrollToT(i + SETTLE_AT, linear, wait);
    }
    // อยู่ท้ายทัวร์แล้ว: กลับไปเริ่มมุมแรกใหม่
    if (motion.current.t > N - 1 + SETTLE_AT - 0.02) scrollToT(SETTLE_AT, easeInOut, wait);
    else next();
  }, [scrollToT]);

  // ผู้ชมเลื่อนเอง / แตะ / กดปุ่มคีย์บอร์ด ระหว่าง Auto → หยุด Auto ทันที (ไม่แย่งการควบคุม)
  useEffect(() => {
    if (!auto) return;
    const cancel = (e: Event) => {
      if (autoBtn.current?.contains(e.target as Node)) return;
      stopAuto();
      const l = lenis.current;
      if (l) l.scrollTo(l.scroll, { immediate: true }); // หยุดการเลื่อนที่ Auto สั่งไว้ค้างอยู่
    };
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    for (const e of events) addEventListener(e, cancel, { capture: true, passive: true });
    return () => {
      for (const e of events) removeEventListener(e, cancel, { capture: true });
    };
  }, [auto, stopAuto, lenis]);

  useEffect(() => () => clearTimeout(autoRun.current.timer), []);

  // ---------- โหลดฉากเมื่อใกล้ / วาดเฉพาะตอนอยู่ในจอ ----------
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const near = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setLite((v) => v ?? matchMedia("(max-width: 767px)").matches); // ตัดสินครั้งเดียว หมุนจอทีหลังไม่โหลดใหม่
        near.disconnect();
      },
      { rootMargin: "100% 0px 100% 0px" }, // เริ่มโหลดเมื่อเหลืออีกราว 1 จอจะถึง (ไม่แย่งเน็ตกับภาพหัวเว็บตอนเปิดหน้า)
    );
    const view = new IntersectionObserver(([e]) => {
      setInView(e.isIntersecting);
      if (!e.isIntersecting) stopAuto();
    });
    near.observe(el);
    view.observe(el);
    return () => {
      near.disconnect();
      view.disconnect();
    };
  }, [stopAuto]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);
  const s = STOPS[stop];

  return (
    <section ref={section} id="tour" className="hs-tour" style={{ "--stops": N } as CSSProperties}>
      <div className="hs-tour-stage" data-dark={dark}>
        <div className="hs-tour-canvas" aria-hidden>
          {lite !== null && !failed && (
            <Safe onError={onFail}>
              <HearthScene motion={motion} lite={lite} active={inView} onProgress={setProgress} onReady={onReady} />
            </Safe>
          )}
        </div>

        {/* หน้าโหลด: พื้นสีเดียวกับห้อง + เปอร์เซ็นต์ */}
        <div className="hs-tour-wait" data-done={ready && !failed}>
          <p className="hs-label">
            {failed ? "The 3D room could not be shown on this device" : `Loading the room · ${Math.round(progress)}%`}
          </p>
          {!failed && (
            <div className="hs-tour-bar">
              <i style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          )}
        </div>

        <div className="hs-tour-top">
          <p className="hs-label">
            <span aria-hidden className="hs-diamond" /> The tour · {HEARTH.name}
          </p>
          <button
            ref={autoBtn}
            type="button"
            className="hs-tour-auto"
            aria-pressed={auto}
            onClick={auto ? stopAuto : startAuto}
          >
            {auto ? (
              <>
                <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden>
                  <rect x="1" y="1" width="8" height="8" fill="currentColor" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden>
                  <path d="M1.5 0.5 9 5 1.5 9.5z" fill="currentColor" />
                </svg>
                Auto
              </>
            )}
          </button>
        </div>

        {/* จุดนำทาง: กดเพื่อไปมุมนั้น */}
        <ol className="hs-tour-dots" aria-label="Tour stops">
          {STOPS.map((x, i) => (
            <li key={x.id}>
              <button
                type="button"
                className="hs-tour-dot"
                aria-current={i === stop ? "step" : undefined}
                onClick={() => {
                  stopAuto();
                  scrollToT(i + SETTLE_AT, easeInOut);
                }}
              >
                <span className="hs-label">{x.title}</span>
                <i />
              </button>
            </li>
          ))}
        </ol>

        {/* ข้อความของมุมนี้ (key เปลี่ยน = เล่นท่าโผล่ใหม่) */}
        <div key={s.id} className="hs-tour-caption" aria-live="polite">
          <p className="hs-label">
            {pad(stop + 1)} / {pad(N)}
          </p>
          <h3 className="hs-tour-title">{s.title}</h3>
          <p className="hs-tour-text">{s.text}</p>
        </div>
      </div>
    </section>
  );
}
