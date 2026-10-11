"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Reveal from "@/components/Reveal";
import Safe from "@/components/Safe";
import { archivo, plexMono } from "@/components/fonts";
import { CHAPTERS, SHOWROOM_CARS } from "@/config/f1";
import { products } from "@/config/products";
import { useNarrow } from "@/lib/useNarrow";
import Loader from "../Loader";

// ฉาก 3D โหลดแยกไฟล์ทีหลัง (three.js ใหญ่) และรันเฉพาะในเบราว์เซอร์
const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false });

const f1 = products.find((p) => p.slug === "f1")!;
// ข้อมูลรถในอู่ = ตำแหน่งจอด (config/f1.ts) + ชื่อ สีทีม เมืองโรงงาน (config/products.ts)
const CARS = SHOWROOM_CARS.map((c) => {
  const v = f1.variants.find((x) => x.id === c.id)!;
  return { ...c, name: v.name, accent: v.accent, city: v.origin.city };
});
const SCENE_CARS = CARS.map((c) => ({ name: c.name, accent: c.accent }));
const pad = (n: number) => String(n + 1).padStart(2, "0");

// หน้าโชว์รูม GRID 26 (/f1/showroom): อู่รถแข่งที่มีรถ 3 คันจอดเฉียงๆ
// 1. มองรวมทั้งอู่ → ชี้รถคันไหน ไฟสปอตไลท์คันนั้นสว่างขึ้น / กดรถหรือปุ่มด้านล่างเพื่อเลือก
// 2. เลือกแล้ว: กล้องค่อยๆ เคลื่อนไปหาคันนั้น ลากหมุนดูได้รอบคัน, ปุ่ม Explode แยกชิ้นทั้งคัน
// 3. กดชิ้นส่วนบนรถ (หรือเลือกจากรายการ) → ชิ้นอื่นจางเป็นสีเทา แผงด้านข้างบอกชื่อ หน้าที่ และตัวเลขของชิ้นนั้น
// ปุ่ม Esc = ย้อนกลับทีละขั้น, ลูกศรซ้าย/ขวา = เปลี่ยนคัน
export default function Showroom() {
  const narrow = useNarrow();
  const [focus, setFocus] = useState<number | null>(null); // คันที่เลือก
  const [hover, setHover] = useState<number | null>(null); // คันที่ชี้อยู่ตอนมองรวม
  const [exploded, setExploded] = useState(false);
  const [chapter, setChapter] = useState<number | null>(null); // ระบบที่เปิดดูอยู่
  const [hoverPart, setHoverPart] = useState<number | null>(null); // ระบบที่เมาส์ชี้อยู่บนรถ
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  // เลือกคัน (null = กลับไปมองรวม): เริ่มใหม่ทุกครั้ง รถประกอบครบ ยังไม่เปิดดูชิ้นไหน
  const pickCar = useCallback((i: number | null) => {
    setFocus(i);
    setHover(null);
    setExploded(false);
    setChapter(null);
    setHoverPart(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (chapter !== null) setChapter(null);
        else if (exploded) setExploded(false);
        else pickCar(null);
      } else if (focus !== null && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        pickCar((focus + (e.key === "ArrowRight" ? 1 : CARS.length - 1)) % CARS.length);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [focus, chapter, exploded, pickCar]);

  const onReady = useCallback(() => setReady(true), []);
  const onProgress = useCallback((p: number) => setProgress(p), []);
  // โหลดเสร็จ: ถ้ามาจากลิงก์ในหน้าเรื่อง เช่น /f1/showroom?car=redbull-rb22&part=power
  // กล้องจะเคลื่อนไปคันนั้นและเปิดชิ้นนั้นให้เลย
  const onLoaded = useCallback(() => {
    setStarted(true);
    const q = new URLSearchParams(location.search);
    const i = CARS.findIndex((c) => c.id === q.get("car"));
    if (i < 0) return;
    pickCar(i);
    const part = CHAPTERS.findIndex((c) => c.id === q.get("part"));
    if (part >= 0) setChapter(part);
  }, [pickCar]);
  const car = focus === null ? null : CARS[focus];
  const ch = chapter === null ? null : CHAPTERS[chapter];

  return (
    <div className={`${archivo.variable} ${plexMono.variable} f1-root f1-garage`}>
      <h1 className="sr-only">GRID 26 garage: three 2026 Formula 1 cars in 3D</h1>

      {/* ฉาก 3D เต็มจอ — touch-none: นิ้วบนฉากใช้หมุน/ซูมรถ เบราว์เซอร์ไม่เลื่อนหน้าเอง */}
      <div aria-hidden className="fixed inset-0 z-0 touch-none">
        <Safe onError={onReady}>
          <ShowroomScene
            focus={focus}
            hover={hover}
            exploded={exploded}
            chapter={chapter}
            narrow={narrow}
            cars={SCENE_CARS}
            onHoverCar={setHover}
            onPickCar={pickCar}
            onPickPart={setChapter}
            onHoverPart={setHoverPart}
            onReady={onReady}
            onProgress={onProgress}
          />
        </Safe>
      </div>
      {/* เงามืดที่ขอบจอ ให้ตัวหนังสือด้านบน/ล่างอ่านง่าย */}
      <div aria-hidden className="f1-garage-shade pointer-events-none fixed inset-0 z-[1]" />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-[4] flex h-24 items-center justify-between px-5 md:h-28 md:px-[60px]">
        <Link
          href="/f1"
          aria-label="GRID 26 — back to the story"
          className="pointer-events-auto flex items-center gap-2.5"
        >
          <span aria-hidden className="h-2.5 w-2.5 bg-[var(--f1-red)]" />
          <span className="f1-title text-[26px] md:text-[30px]">GRID 26</span>
          <span className="f1-label ml-1 hidden md:inline">/ Garage</span>
        </Link>
        <Link href="/" className="f1-pill pointer-events-auto">
          ← Orbit
        </Link>
      </header>

      {/* มองรวม: หัวเรื่องมุมซ้ายบน */}
      <div data-active={started && !car} className="overlay f1-garage-copy pointer-events-none fixed z-[3]">
        <p className="f1-label reveal-fade">[ Garage · {CARS.length} cars ]</p>
        <h2 className="f1-title mt-3 text-[clamp(2.8rem,6vw,5.6rem)]">
          <Reveal text="Pick a car." delay={0.1} />
        </h2>
        <p className="reveal-fade mt-4 max-w-[22rem] text-[13.5px] leading-relaxed text-[var(--f1-muted)]">
          Three 2026 Formula 1 cars, made as 1:18 scale models. Choose one to walk up to it, turn it around and take it
          apart.
        </p>
      </div>

      {/* เลือกคันแล้ว: ชื่อรถ + ปุ่มกลับ/แยกชิ้น (มือถือ: ซ่อนตอนเปิดดูชิ้นส่วน ให้ที่รถกับแผงข้อความ) */}
      <div
        data-active={started && !!car && !(narrow && chapter !== null)}
        className="overlay f1-garage-copy pointer-events-none fixed z-[3]"
      >
        {car && focus !== null && (
          <div key={focus}>
            <p className="f1-label reveal-fade">
              [ Car {pad(focus)} / {pad(CARS.length - 1)} ] · 1:18 scale model
            </p>
            <h2 className="f1-title mt-3 text-[clamp(2.3rem,4.6vw,4.4rem)]">
              <Reveal text={car.name} delay={0.6} step={0.03} />
            </h2>
            <p className="f1-label reveal-fade mt-3">
              <span style={{ color: car.accent }}>■</span> Built in {car.city}
            </p>
            <div className="reveal-fade pointer-events-auto mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => pickCar(null)} className="f1-pill">
                ← All cars
              </button>
              <button
                type="button"
                onClick={() => setExploded((v) => !v)}
                aria-pressed={exploded}
                className="f1-pill f1-pill-hot"
              >
                {exploded ? "Assemble" : "Explode"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* แผงชิ้นส่วน: คอม = ขวากลางจอ / มือถือ = ด้านล่างเหนือปุ่มเลือกรถ */}
      <aside data-active={started && !!car} aria-label="Parts" className="overlay f1-inspect fixed z-[3]">
        {ch && chapter !== null ? (
          <div key={chapter} className="f1-inspect-in">
            <div className="flex items-start justify-between gap-4">
              <p className="f1-label text-[var(--f1-red)]">
                [ {pad(chapter)} ] {ch.kicker}
              </p>
              <button type="button" onClick={() => setChapter(null)} aria-label="Close" className="f1-x">
                ×
              </button>
            </div>
            <h3 className="f1-title mt-3 text-[clamp(1.9rem,2.5vw,2.5rem)]">{ch.title}</h3>
            <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--f1-muted)]">{ch.text}</p>
            <dl className="f1-inspect-stats mt-5">
              {ch.stats.map((s) => (
                <div key={s.label}>
                  <dt className="f1-label text-[9px]">{s.label}</dt>
                  <dd className="mt-1.5 text-[14px] leading-tight">{s.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setChapter((chapter + CHAPTERS.length - 1) % CHAPTERS.length)}
                className="f1-pill"
              >
                ← Prev
              </button>
              <button type="button" onClick={() => setChapter((chapter + 1) % CHAPTERS.length)} className="f1-pill">
                Next →
              </button>
            </div>
          </div>
        ) : (
          <div className="f1-inspect-in">
            <p className="f1-label hidden md:block">[ Inspect ]</p>
            <p className="text-[13.5px] leading-relaxed text-[var(--f1-muted)] md:mt-3 md:min-h-[2.6em]">
              {hoverPart !== null
                ? `${CHAPTERS[hoverPart].title}: ${narrow ? "tap" : "click"} to open.`
                : `${narrow ? "Tap" : "Click"} any part of the car, or pick one below.`}
            </p>
            <ul className="f1-inspect-list mt-3">
              {CHAPTERS.map((c, k) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setChapter(k)} data-hot={hoverPart === k}>
                    <span className="f1-label text-[9px]">{pad(k)}</span>
                    {c.short}
                  </button>
                </li>
              ))}
            </ul>
            <p className="f1-label mt-4 text-[9px]">
              {narrow ? "Drag to turn · pinch to zoom" : "Drag to turn · scroll to zoom"}
            </p>
          </div>
        )}
      </aside>

      {/* ปุ่มเลือกรถ 3 คัน (ล่างซ้าย) — ชี้ = ไฟคันนั้นสว่างขึ้น, กด = เลือก */}
      <nav aria-label="Cars" data-active={started} className="overlay f1-carbar fixed z-[3]">
        {CARS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pickCar(i)}
            onMouseEnter={() => focus === null && setHover(i)}
            onMouseLeave={() => setHover(null)}
            aria-pressed={focus === i}
            className="f1-car"
            style={{ "--accent": c.accent } as CSSProperties}
          >
            <span className="f1-label text-[9px]">{pad(i)}</span>
            <span className="f1-car-name">{narrow ? c.short : c.name}</span>
            <span className="f1-label hidden text-[9px] md:block">{c.city}</span>
          </button>
        ))}
      </nav>

      <Loader progress={progress} ready={ready} onDone={onLoaded} label="Opening the garage" garage />
    </div>
  );
}
