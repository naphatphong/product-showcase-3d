"use client";

import Image from "next/image";
import Link from "next/link";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { archivo, plexMono } from "@/components/fonts";
import Reveal from "@/components/Reveal";
import { setMusic, stopMusic } from "@/lib/hearthSound";
import { STOPS } from "@/config/hearth";
import HearthTour, { tourY } from "./hearth/HearthTour";
import { SETTLE_AT } from "./hearth/timeline";
import "./house.css"; // สไตล์ของหน้านี้ (คลาสขึ้นต้นด้วย hs-) โหลดเฉพาะหน้า /house

const pad = (n: number) => String(n).padStart(2, "0");
// รูปห้อง (room-*, รูปใน Details) = ภาพเรนเดอร์ของผู้ออกแบบห้อง (cavitbarisbalta) ครอปให้พอดีช่อง
// day / night / plan = เรนเดอร์จากโมเดลเดียวกับทัวร์ด้วย Cycles (scripts/hearth/bake.py → still_<ชื่อ>)
const photo = (name: string) => `/photos/hearth/${name}.webp`;

// จอแรก: ภาพนิ่ง 3 ภาพค่อยๆ ซูมช้าๆ และจางสลับกัน (แทนวิดีโอ ไฟล์เล็กกว่ามาก)
const HERO = [
  { name: "room-1", alt: "The living room under a mirrored bronze ceiling, looking towards the kitchen and the dining table" },
  { name: "room-2", alt: "The sofa by the window, the Christmas tree and the fire under the TV wall" },
  { name: "room-3", alt: "The marble kitchen island, looking back into the living room" },
];

// ข้อความใหญ่กลางหน้า: คำค่อยๆ เข้มขึ้นตามการเลื่อน (แบบ fluid.glass)
const STATEMENT =
  "HEARTH is one long room: a soft sofa facing a low fire, a white table under a cloud of feathers and a kitchen in gold-veined marble. Every piece in it is a real 3D model.";

// กลุ่มรูปลอยในส่วน Details: ตำแหน่งบนจอคอม (% ของความกว้าง, vh จากบนสุด, ความกว้าง vw)
// speed = เลื่อนเร็ว/ช้ากว่าหน้า (ค่าบวก = ลอยขึ้นเร็วกว่า) ให้ดูมีระยะลึก / name = ชื่อตัวใหญ่บนรูป
// wide = บนมือถือรูปนี้กว้างเต็มแถว (ที่เหลือวางคู่กัน 2 รูปต่อแถว)
type Tile = { src: string; alt: string; name?: string; x: number; y: number; w: number; ratio: string; speed: number; wide?: boolean };
const TILES: Tile[] = [
  { src: photo("sofa"), alt: "The cream sofa, the armchair and the Christmas tree by the window", name: "Sofa", x: 20, y: 0, w: 28, ratio: "4 / 3", speed: 0.06, wide: true },
  { src: photo("feathers"), alt: "A cloud of feathers hanging over the dining table", name: "Feathers", x: 64, y: 40, w: 19, ratio: "4 / 5", speed: 0.16 },
  { src: photo("fire"), alt: "The long fire in its glass box under the TV wall", x: 49, y: 72, w: 13, ratio: "1 / 1", speed: 0.26 },
  { src: photo("marble"), alt: "Gold-veined marble behind the kitchen sink", name: "Marble", x: 4, y: 58, w: 22, ratio: "4 / 5", speed: 0.1 },
  { src: photo("dining"), alt: "The dining table under the feather chandelier", name: "Dining", x: 30, y: 100, w: 30, ratio: "16 / 10", speed: 0.04, wide: true },
];

// ขนาดห้อง (วัดจากโมเดล) / ป้ายโซนบนแปลน (ตำแหน่ง % บนรูปแปลน, stop = มุมในทัวร์ที่กดแล้วพาไปดู)
const SPECS = [
  { label: "Floor area", value: "52 m²" },
  { label: "Room", value: "9.1 × 5.7 m" },
  { label: "Ceiling", value: "2.7 m" },
  { label: "Seats", value: "5 sofa · 8 table · 3 bar" },
];
const ZONES = [
  { label: "Living", stop: "sofa", x: 24, y: 30 },
  { label: "Dining", stop: "dining", x: 47, y: 74 },
  { label: "Kitchen", stop: "kitchen", x: 79, y: 50 },
];

// ส่วนต่างๆ ของหน้า (ใช้กับป้ายในแถบเมนูลอยด้านล่าง + เมนู)
const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "about", label: "About" },
  { id: "tour", label: "Tour" },
  { id: "details", label: "Details" },
  { id: "light", label: "Day & night" },
  { id: "plan", label: "Plan & price" },
] as const;

type Stage = "load" | "open" | "done";

// หน้าแรกของเว็บ HEARTH (แบบ fluid.glass)
// 1) หน้าโหลด: พื้นเทา + ชื่อเว็บ แผ่นสีเข้มค่อยๆ สูงขึ้นจากล่าง แล้วขยายเต็มจอ เปิดเข้าภาพแรก
// 2) ภาพนิ่งเต็มจอสลับกัน + หัวข้อกลางล่าง / แถบเมนูลอยด้านล่างติดจอตลอด / ปุ่มเปิดเพลง (ปิดไว้ก่อน)
// 3) สลับพื้นเข้ม/ครีม: แนะนำ → ข้อความใหญ่ → ทัวร์ 3D → กลุ่มรูปลอย (กดดูรูปใหญ่) → เทียบกลางวัน/กลางคืน → แปลน + ราคา
export default function HouseLanding() {
  const root = useRef<HTMLDivElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const box = useRef<HTMLDialogElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [stage, setStage] = useState<Stage>("load");
  const [section, setSection] = useState(0);
  const [menu, setMenu] = useState(false);
  const [music, setMusicOn] = useState(false);
  const [shown, setShown] = useState<Tile | null>(null); // รูปที่เปิดดูเต็มจออยู่

  // ---------- หน้าโหลด ----------
  // ตัวเลข + เส้นบรอนซ์ค่อยๆ วิ่งไปถึง 90 ระหว่างรอภาพแรก → ภาพโหลดเสร็จ (หรือครบ 4 วินาที) วิ่งต่อจนครบ 100
  // อยู่อย่างน้อย 2 วินาทีให้เห็นโลโก้วาดตัวเองจบ แล้วเปิด: แสงวงกลมกระจายออกจากกลางจอ เผยภาพแรก (CSS ทำต่อ)
  useEffect(() => {
    const started = performance.now();
    let last = started;
    let loaded = false;
    let shown = 0;
    let raf = 0;
    let timer = 0;
    const load = () => (loaded = true);
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      shown += ((loaded ? 100 : 90) - shown) * (1 - Math.exp(-dt * (loaded ? 7 : 1.1)));
      if (loaded && shown > 99.5) shown = 100;
      // แก้ DOM ตรงๆ ทุกเฟรม ไม่ต้องให้ React วาดใหม่
      if (count.current) count.current.textContent = String(Math.floor(shown)).padStart(3, "0");
      loader.current?.style.setProperty("--p", String(shown / 100));
      if (shown === 100 && now - started > 2000) {
        setStage("open");
        timer = window.setTimeout(() => setStage("done"), 1700);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const img = root.current?.querySelector<HTMLImageElement>(".hs-hero-still img");
    if (img?.complete) load();
    img?.addEventListener("load", load, { once: true });
    const fallback = setTimeout(load, 4000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(fallback);
      img?.removeEventListener("load", load);
    };
  }, []);

  // ออกจากหน้า: ปิดเพลง
  useEffect(() => stopMusic, []);

  // ---------- เลื่อนหน้าแบบนุ่ม (Lenis) + ภาพลอยต่างระดับ + ข้อความค่อยๆ เข้ม ----------
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const l = reduce ? null : new Lenis({ autoRaf: true });
    lenis.current = l;
    const tiles = [...(root.current?.querySelectorAll<HTMLElement>("[data-speed]") ?? [])];
    const words = [...(statement.current?.querySelectorAll<HTMLElement>("[data-word]") ?? [])];
    let raf = 0;
    let lit = -1;
    const update = () => {
      raf = 0;
      const vh = innerHeight;
      // ภาพลอย: ยิ่งห่างจากกลางจอ ยิ่งเลื่อนต่างจากหน้า (ปิดไว้บนมือถือและเครื่องที่ลดภาพเคลื่อนไหว)
      if (!reduce && innerWidth >= 768) {
        for (const t of tiles) {
          const r = t.parentElement!.getBoundingClientRect();
          const off = (r.top + r.height / 2 - vh / 2) * Number(t.dataset.speed);
          t.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
        }
      }
      // ข้อความใหญ่: นับว่าเลื่อนผ่านไปกี่ % แล้วทำให้คำเข้มขึ้นตามนั้น (เริ่มตอนบนข้อความอยู่ 85% ของจอ จบตอนอยู่ 25%)
      const el = statement.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.6 + r.height * 0.4)));
        const n = reduce ? words.length : Math.round(p * words.length);
        if (n !== lit) {
          lit = n;
          words.forEach((w, i) => (w.dataset.lit = String(i < n)));
        }
      }
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", request, { passive: true });
    addEventListener("resize", request);
    return () => {
      removeEventListener("scroll", request);
      removeEventListener("resize", request);
      cancelAnimationFrame(raf);
      l?.destroy();
      lenis.current = null;
    };
  }, []);

  // ---------- ชิ้นต่างๆ ค่อยๆ โผล่ขึ้นเมื่อเลื่อนมาถึง (ครั้งเดียว) ----------
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "true";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    root.current?.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  // ---------- ส่วนที่อยู่กลางจอ → ป้ายบนแถบเมนู ----------
  useEffect(() => {
    const current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setSection(SECTIONS.findIndex((x) => x.id === e.target.id));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) current.observe(el);
    }
    return () => current.disconnect();
  }, []);

  // ลิงก์ในหน้า (#plan ฯลฯ): เลื่อนไปแบบนุ่มด้วย Lenis
  const jump = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const id = e.currentTarget.getAttribute("href")!;
    const target = id === "#top" ? 0 : document.querySelector<HTMLElement>(id);
    if (target === null) return;
    e.preventDefault();
    setMenu(false);
    if (lenis.current) lenis.current.scrollTo(target, { duration: 1.6 });
    else if (target === 0) scrollTo({ top: 0 });
    else target.scrollIntoView();
  }, []);

  // ป้ายห้องบนแปลน → เลื่อนกลับขึ้นไปที่มุมนั้นในทัวร์ 3D
  const toStop = (id: string) => {
    const y = tourY(STOPS.findIndex((x) => x.id === id) + SETTLE_AT);
    if (lenis.current) lenis.current.scrollTo(y, { duration: 2.4 });
    else scrollTo({ top: y });
  };

  // ดูรูปเต็มจอ (<dialog> ของเบราว์เซอร์: กด Esc ปิดได้ โฟกัสอยู่ในกล่อง) / ระหว่างเปิดหยุดการเลื่อนหน้า
  const openPhoto = (t: Tile) => {
    setShown(t);
    box.current?.showModal();
    lenis.current?.stop();
  };
  const closedPhoto = () => {
    setShown(null);
    lenis.current?.start();
  };

  // เปิด/ปิดเพลง (ต้องเริ่มจากการกดปุ่มเท่านั้น เบราว์เซอร์ถึงยอมให้มีเสียง)
  const toggleMusic = () => {
    setMusic(!music);
    setMusicOn(!music);
  };

  return (
    <div ref={root} className={`${archivo.variable} ${plexMono.variable} hs-root`} data-stage={stage}>
      {/* ---------- หน้าโหลด ---------- */}
      {/* ไฟอุ่นๆ กลางจอ + โลโก้วาดเส้นกรอบแล้วเปลวไฟติดขึ้น + ชื่อเลื่อนขึ้นทีละตัว + ตัวเลขและเส้นบรอนซ์บอกความคืบหน้า */}
      <div ref={loader} className="hs-loader" aria-hidden={stage === "done"} role="status" aria-label="Loading">
        <div className="hs-loader-glow" />
        <div className="hs-loader-center" data-active="true">
          <svg viewBox="0 0 20 20" className="hs-loader-mark" aria-hidden>
            <rect x="2.8" y="2.8" width="14.4" height="14.4" pathLength={1} />
            <path d={FLAME} />
          </svg>
          <p className="hs-loader-word">
            <Reveal text="Hearth" delay={0.5} step={0.07} />
          </p>
        </div>
        <div className="hs-loader-foot hs-label">
          <span>Living room &amp; kitchen</span>
          <span ref={count}>000</span>
        </div>
        <i className="hs-loader-line" />
      </div>

      {/* ---------- จอแรก: ภาพนิ่งเต็มจอสลับกัน ---------- */}
      <section id="top" className="hs-hero" data-active={stage === "done"}>
        <div className="hs-hero-stills">
          {HERO.map((h, i) => (
            <div key={h.name} className="hs-hero-still">
              <Image src={photo(h.name)} alt={h.alt} fill preload={i === 0} sizes="100vw" className="hs-cover" />
            </div>
          ))}
        </div>
        <div className="hs-hero-shade" />
        <header className="hs-header">
          <span />
          <Link href="/house" className="hs-wordmark" aria-label="HEARTH">
            Hearth
          </Link>
          <Link href="/" className="hs-top-link">
            <Arrow /> Back to orbit
          </Link>
        </header>
        <div className="hs-hero-copy">
          <h1 className="hs-hero-title">
            <Reveal text="A living room built" delay={0.1} step={0.018} />
            <br />
            <Reveal text="around the fire." delay={0.45} step={0.018} />
          </h1>
          <a href="#tour" onClick={jump} className="hs-btn hs-btn-light hs-hero-cta">
            <Arrow /> Take the tour
          </a>
        </div>
        <div className="hs-hero-meta">
          <span className="hs-label">Design & renders · cavitbarisbalta</span>
          <button type="button" className="hs-film-btn" aria-pressed={music} onClick={toggleMusic}>
            {music ? "Sound off" : "Sound on"}
          </button>
        </div>
      </section>

      {/* ---------- แถบแนะนำ (พื้นเข้ม) ---------- */}
      <section className="hs-band">
        <div className="hs-rule" />
        <div className="hs-band-row">
          <p data-reveal className="hs-label">
            <Diamond /> Living room & kitchen
          </p>
          <p data-reveal className="hs-band-text" style={{ "--d": "0.12s" } as CSSProperties}>
            One open room for living, dining and cooking. The photographs are the designer&apos;s renders of this room; the
            tour below runs the same 3D model live in your browser.
          </p>
        </div>
      </section>

      {/* ---------- ข้อความใหญ่ (พื้นครีม) ---------- */}
      <section id="about" className="hs-paper hs-about">
        <p data-reveal className="hs-label hs-center">
          <Diamond /> About Hearth
        </p>
        <p ref={statement} className="hs-statement">
          {STATEMENT.split(" ").map((w, i) => (
            <span key={i} data-word className="hs-word">
              {w}{" "}
            </span>
          ))}
        </p>
        <div data-reveal className="hs-center">
          <a href="#plan" onClick={jump} className="hs-btn">
            <Arrow /> See the plan
          </a>
        </div>
      </section>

      {/* ---------- ทัวร์ห้อง HEARTH: เลื่อนลงทีละมุม เฟอร์นิเจอร์เด้งขึ้น (components/house/hearth) ---------- */}
      <HearthTour lenis={lenis} />

      {/* ---------- กลุ่มรูปลอย (พื้นครีม) ---------- */}
      <section id="details" className="hs-paper hs-collection">
        <div className="hs-rule" />
        <p data-reveal className="hs-label">
          <Diamond /> Details
        </p>
        <div className="hs-collage">
          <div data-reveal className="hs-coll-text">
            <p>
              Five <strong>corners</strong> of the room up close: the sofa by the window, the feather chandelier, the
              long fire, the gold-veined marble and the dining table.
            </p>
            <a href="#tour" onClick={jump} className="hs-btn">
              <Arrow /> Back to the tour
            </a>
          </div>
          {TILES.map((t, i) => (
            <div
              key={t.src}
              className="hs-tile-slot"
              data-wide={t.wide}
              style={{ "--x": `${t.x}%`, "--y": `${t.y}vh`, "--w": `${t.w}vw` } as CSSProperties}
            >
              <div data-speed={t.speed} className="hs-tile-move">
                <button
                  type="button"
                  data-reveal
                  className="hs-tile"
                  style={{ "--d": `${(i % 3) * 0.1}s` } as CSSProperties}
                  aria-label={`View larger: ${t.alt}`}
                  onClick={() => openPhoto(t)}
                >
                  <span className="hs-tile-img" data-named={!!t.name} style={{ aspectRatio: t.ratio }}>
                    <Image src={t.src} alt="" fill sizes="(min-width: 768px) 30vw, 50vw" className="hs-cover" />
                  </span>
                  {t.name && <span className="hs-tile-name">{t.name}</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- เทียบกลางวัน/กลางคืน: ภาพมุมเดียวกัน 2 ภาพซ้อนกัน ลากเส้นแบ่งเพื่อเปิดภาพค่ำ (พื้นเข้ม) ---------- */}
      <section id="light" className="hs-light">
        <div className="hs-rule" />
        <div className="hs-plan-head">
          <p data-reveal className="hs-label">
            <Diamond /> Day & night
          </p>
          <h2 data-reveal className="hs-h2">
            The same room,
            <br />
            two kinds of light.
          </h2>
        </div>
        <div data-reveal className="hs-compare">
          <Image src={photo("day")} alt="The living room by day" fill sizes="100vw" className="hs-cover" />
          <div className="hs-compare-night">
            <Image src={photo("night")} alt="The same view at night" fill sizes="100vw" className="hs-cover" />
          </div>
          <i className="hs-compare-line" aria-hidden />
          <span className="hs-label hs-compare-tag" data-side="day">
            Day
          </span>
          <span className="hs-label hs-compare-tag" data-side="night">
            Night
          </span>
          {/* แถบเลื่อนของเบราว์เซอร์ (ใช้คีย์บอร์ดได้) วางโปร่งใสทับทั้งภาพ: ค่าที่ลาก → ตัวแปร CSS --cut โดยไม่ต้องวาด React ใหม่ */}
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            aria-label="Slide between day and night"
            className="hs-compare-range"
            onInput={(e) => e.currentTarget.parentElement!.style.setProperty("--cut", `${e.currentTarget.value}%`)}
          />
        </div>
      </section>

      {/* ---------- แปลน + ราคา (พื้นครีม) ---------- */}
      <section id="plan" className="hs-paper hs-plan">
        <div className="hs-rule" />
        <div className="hs-plan-head">
          <p data-reveal className="hs-label">
            <Diamond /> Plan & price
          </p>
          <h2 data-reveal className="hs-h2">
            52 m² of open plan.
            <br />
            Living, dining, kitchen.
          </h2>
        </div>
        <div className="hs-plan-row">
          <figure data-reveal className="hs-plan-img">
            <Image src={photo("plan")} alt="Top-down plan of the HEARTH room" fill sizes="(min-width: 768px) 60vw, 100vw" />
            {ZONES.map((z) => (
              <button
                key={z.label}
                type="button"
                className="hs-plan-zone hs-label"
                style={{ left: `${z.x}%`, top: `${z.y}%` }}
                aria-label={`${z.label}: see it in the 3D tour`}
                onClick={() => toStop(z.stop)}
              >
                {z.label} ↑
              </button>
            ))}
          </figure>
          <div data-reveal className="hs-plan-info" style={{ "--d": "0.12s" } as CSSProperties}>
            <dl className="hs-specs">
              {SPECS.map((x) => (
                <div key={x.label}>
                  <dt className="hs-label">{x.label}</dt>
                  <dd>{x.value}</dd>
                </div>
              ))}
            </dl>
            <div className="hs-price">
              <p className="hs-label">Fully furnished, as shown</p>
              <p className="hs-price-num">฿2,450,000</p>
              <p className="hs-price-note">Concept price for a portfolio project.</p>
            </div>
            <span className="hs-btn hs-btn-ghost" aria-disabled>
              <Arrow /> Enquire · concept
            </span>
          </div>
        </div>
        <p data-reveal className="hs-plan-hint hs-label">Tap a room on the plan to see it in the 3D tour</p>
      </section>

      {/* ---------- รูปเต็มจอ (กดที่ไหนก็ปิด) ---------- */}
      <dialog ref={box} className="hs-box" aria-label={shown?.alt} onClose={closedPhoto} onClick={() => box.current?.close()}>
        {shown && <Image src={shown.src} alt={shown.alt} fill sizes="100vw" className="hs-box-img" />}
        <button type="button" className="hs-film-btn hs-box-close">
          Close
        </button>
      </dialog>

      {/* ---------- ท้ายหน้า ---------- */}
      <footer className="hs-footer">
        <div className="hs-foot-row">
          <p className="hs-foot-text">A living room built around the fire.</p>
          <div className="hs-foot-links">
            <Link href="/" className="hs-btn">
              <Arrow /> Back to orbit
            </Link>
            <Link href="/credits" className="hs-btn hs-btn-ghost">
              <Arrow /> Credits
            </Link>
          </div>
        </div>
        <p className="hs-foot-word" aria-hidden>
          Hearth
        </p>
        <p className="hs-foot-note">
          Concept project by Blue. Room design and photographs by cavitbarisbalta; the tour, plan and day and night views
          are rendered by Blue from the same 3D model.
        </p>
      </footer>

      {/* ---------- แถบเมนูลอยด้านล่าง (ติดจอตลอด) ---------- */}
      <nav className="hs-pill" aria-label="Sections" data-open={menu}>
        <ul className="hs-menu" id="house-menu" hidden={!menu}>
          {SECTIONS.map((x, i) => (
            <li key={x.id}>
              <a href={`#${x.id}`} onClick={jump} className="hs-menu-link" aria-current={i === section ? "true" : undefined}>
                <span>{pad(i + 1)}</span> {x.label}
              </a>
            </li>
          ))}
          <li>
            <button type="button" className="hs-menu-link" aria-pressed={music} onClick={toggleMusic}>
              <span>♪</span> {music ? "Sound off" : "Sound on"}
            </button>
          </li>
          <li>
            <Link href="/" className="hs-menu-link">
              <span>↩</span> Back to orbit
            </Link>
          </li>
        </ul>
        <div className="hs-pill-bar">
          <a href="#top" onClick={jump} className="hs-pill-mark" aria-label="Back to top">
            <Mark />
          </a>
          <span className="hs-pill-label" aria-live="polite">
            {SECTIONS[section].label}
          </span>
          <button
            type="button"
            className="hs-pill-menu"
            aria-expanded={menu}
            aria-controls="house-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
            onClick={() => setMenu(!menu)}
          >
            <i />
            <i />
            <i />
          </button>
        </div>
      </nav>
    </div>
  );
}

// โลโก้: เตาผิงสี่เหลี่ยมกับเปลวไฟข้างใน
const FLAME = "M10 5.5c.6 2.3 3.2 3.6 3.2 6.6a3.2 3.2 0 0 1-6.4 0c0-1.6 1-2.4 1.6-3.4.3 1 .8 1.5 1.4 1.7-.4-1.6-.4-3.2.2-4.9z";

function Mark() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="inline-block align-[-3px]">
      <rect x="2.8" y="2.8" width="14.4" height="14.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d={FLAME} fill="currentColor" />
    </svg>
  );
}

function Diamond() {
  return <span aria-hidden className="hs-diamond" />;
}

function Arrow() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
      <path d="M2 1v5.5h7.5M7 4l2.5 2.5L7 9" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
