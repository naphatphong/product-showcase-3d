"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HERITAGE, HERITAGE_FILM } from "@/config/f1";

const pad = (n: number) => String(n).padStart(2, "0");

// เตรียมแถวไว้ครั้งเดียว: เลขรูปนับต่อกันทั้งหน้า (Fig. 01, 02, ...) และแถวที่มีรูปสลับข้างกันไปเรื่อยๆ
const ROWS = (() => {
  let fig = 0;
  let withPhotos = 0;
  return HERITAGE.map((era) => {
    const photos = (era.photos ?? []).map((p) => ({ ...p, fig: ++fig }));
    const flip = photos.length > 0 && withPhotos++ % 2 === 1; // แถวที่มีรูปแถวที่ 2, 4, ... รูปอยู่ซ้าย
    return { ...era, photos, flip };
  });
})();

// หน้าประวัติของ GRID 26 แบบหน้าเว็บ Longbow: หน้ายาวที่เลื่อนลงอ่านไปเรื่อยๆ (ไม่ใช่ทีละจอเหมือน section อื่น)
// - จอแรก: วิดีโอแข่งรถเต็มกรอบ (คอม = คลิปแนวนอน, มือถือ = คลิปแนวตั้ง) — เลื่อนลงต่อถึงจะเจอหัวเรื่อง
// - หัวเรื่องตัวใหญ่ "Since 2005." แล้วตามด้วยปีสำคัญทีละแถว บนกริด 4 คอลัมน์แบบแบบวิศวกรรม
// - แถวที่มีรูป: ปี + ข้อความ 2 คอลัมน์ รูป 2 คอลัมน์ (สลับซ้าย/ขวาทีละแถว) / แถวที่ไม่มีรูป: ชื่อรถตัวโตแบบโปสเตอร์
// - แต่ละชิ้นค่อยๆ โผล่ขึ้นมาตอนเลื่อนมาถึง (IntersectionObserver ใส่ data-in ให้ แล้ว CSS ทำภาพเคลื่อนไหว)
// อยู่ในเนื้อหาที่เลื่อนจริงของหน้า (ไม่ใช่ข้อความลอยอยู่กับที่) — F1Story เลื่อนจออิสระให้ในช่วงนี้
export default function HeritageSection({
  active,
  near,
  narrow,
}: {
  active: boolean; // section นี้แสดงอยู่
  near: boolean; // อยู่ติดกับ section ที่แสดงอยู่ → เริ่มโหลดวิดีโอไว้ก่อน
  narrow: boolean; // จอแคบ (มือถือ) → คลิปแนวตั้ง
}) {
  const root = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const [filmInView, setFilmInView] = useState(false); // วิดีโอยังอยู่ในจอ (เลื่อนลงไปอ่านต่อแล้ว = หยุดเล่น)
  const [paused, setPaused] = useState<boolean | null>(null); // null = ยังไม่ได้กด (ใช้ค่าตามการตั้งค่าเครื่อง)
  const clip = narrow ? HERITAGE_FILM.tall : HERITAGE_FILM.wide;
  const src = near ? clip.src : undefined; // โหลดเมื่อเลื่อนมาใกล้ ไม่เปลืองเน็ตตั้งแต่เปิดหน้า

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "true";
          io.unobserve(e.target); // โผล่ครั้งเดียว เลื่อนกลับมาก็ยังอยู่
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  // วิดีโออยู่ในจอไหม (เห็นอย่างน้อย 15%)
  useEffect(() => {
    const v = film.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => setFilmInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // เล่นเฉพาะตอนอยู่หน้านี้และวิดีโอยังอยู่ในจอ / ผู้ใช้กดหยุดได้ (วิดีโอที่เล่นเองเกิน 5 วินาทีต้องหยุดได้)
  // เครื่องที่ตั้งให้ลดภาพเคลื่อนไหว: เริ่มแบบหยุดไว้ (เห็นรูปปก) กดเล่นเองได้
  useEffect(() => {
    const v = film.current;
    if (!v || !src) return;
    const stopped = paused ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && filmInView && !stopped) v.play().catch(() => {});
    else v.pause();
  }, [active, filmInView, paused, src]);
  const stopped = paused === true;

  return (
    <div ref={root} className="f1-hx">
      {/* จอแรก: วิดีโอเต็มกรอบ เปิดออกจากตรงกลางตอนเลื่อนมาถึง / ป้ายคลิป + ปุ่มหยุดอยู่มุมล่าง */}
      <figure data-reveal className="f1-hx-film">
        <video
          ref={film}
          src={src}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
        />
        <figcaption className="f1-hx-film-meta">
          <span className="f1-label text-[9px] text-white/85 md:text-[10px]">
            <span className="text-[var(--f1-red)]">[ Clip ]</span> {clip.caption}
          </span>
          <button
            type="button"
            onClick={() => setPaused(!stopped)}
            aria-label={stopped ? "Play video" : "Pause video"}
            className="f1-hx-film-btn pointer-events-auto"
          >
            {stopped ? "Play" : "Pause"}
          </button>
        </figcaption>
      </figure>

      <header className="f1-hx-head">
        <div data-reveal>
          <p className="f1-label">[ Heritage ]</p>
          <h2 className="f1-title f1-hx-title mt-3">Since 2005.</h2>
        </div>
        <p data-reveal className="f1-hx-intro" style={{ "--d": "0.15s" } as CSSProperties}>
          In November 2004 Red Bull bought the Jaguar team from Ford for a symbolic one dollar. Twenty-one seasons
          later it has won six constructors&apos; and eight drivers&apos; championships.
        </p>
      </header>

      <ol className="f1-hx-list">
        {ROWS.map((era) => {
          const photos = era.photos;
          return (
            <li key={era.year} className="f1-hx-era" data-photos={photos.length} data-flip={era.flip}>
              <div data-reveal className="f1-hx-when">
                <p className="f1-title f1-hx-year">{era.year}</p>
                <p className="f1-label mt-3 text-[10px]">
                  <span className="text-[var(--f1-red)]">{era.car}</span> · {era.title}
                </p>
              </div>
              <p data-reveal className="f1-hx-text" style={{ "--d": "0.1s" } as CSSProperties}>
                {era.text}
              </p>
              <div className="f1-hx-media">
                {photos.length ? (
                  photos.map((p, k) => (
                    <figure
                      key={p.src}
                      data-reveal
                      className="f1-hx-fig"
                      style={{ "--d": `${0.12 + k * 0.14}s` } as CSSProperties}
                    >
                      <div className="f1-hx-img">
                        <Image
                          src={p.src}
                          alt={p.alt}
                          fill
                          sizes={photos.length > 1 ? "(min-width: 768px) 23vw, 50vw" : "(min-width: 768px) 46vw, 100vw"}
                          className="object-cover"
                        />
                      </div>
                      <figcaption className="f1-label mt-2.5 text-[9px] md:text-[10px]">
                        <span className="text-[var(--f1-red)]">[ Fig. {pad(p.fig)} ]</span> {p.caption}
                      </figcaption>
                    </figure>
                  ))
                ) : (
                  // ไม่มีรูป: ชื่อรถตัวโตเป็นเส้นขอบ เติมช่องว่างแบบโปสเตอร์
                  <span aria-hidden data-reveal className="f1-title f1-hx-ghost">
                    {era.car}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
