"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { archivo, plexMono } from "@/components/fonts";
import Reveal from "@/components/Reveal";
import { HOMES, HOUSE_FILM, LIVE_MODEL, ROOM_FILM, type HomeShot } from "@/config/house";
import "./house.css"; // สไตล์ของหน้านี้ (คลาสขึ้นต้นด้วย hs-) โหลดเฉพาะหน้า /house

// โมเดล 3D โหลดเมื่อเลื่อนมาใกล้ส่วน "In 3D" เท่านั้น (โค้ด three.js + ไฟล์โมเดลไม่โหลดตอนเปิดหน้า)
const ModelViewer = dynamic(() => import("./ModelViewer"), { ssr: false });

const pad = (n: number) => String(n).padStart(2, "0");
const home = (id: string) => HOMES.find((h) => h.id === id)!;

// ข้อความใหญ่กลางหน้า: คำค่อยๆ เข้มขึ้นตามการเลื่อน (แบบ fluid.glass)
const STATEMENT =
  "We draw homes that sit quietly on their land: pale concrete, rough stone, timber screens and deep shade. Every house is built in 3D, down to the last chair.";

// กลุ่มรูปลอยในส่วน Collection: ตำแหน่งบนจอคอม (% ของความกว้าง, vh จากบนสุด, ความกว้าง vw)
// speed = เลื่อนเร็ว/ช้ากว่าหน้า (ค่าบวก = ลอยขึ้นเร็วกว่า) ให้ดูมีระยะลึก / name = ชื่อบ้านตัวใหญ่บนรูป
// wide = บนมือถือรูปนี้กว้างเต็มแถว (ที่เหลือวางคู่กัน 2 รูปต่อแถว)
type Tile = {
  shot: HomeShot;
  name?: string;
  href?: string;
  x: number;
  y: number;
  w: number;
  ratio: string;
  speed: number;
  wide?: boolean;
};
const TILES: Tile[] = [
  { shot: home("monolith").cover, name: "Monolith", href: "#home-monolith", x: 20, y: 0, w: 28, ratio: "4 / 5", speed: 0.06, wide: true },
  { shot: home("pavilion").cover, name: "Pavilion", href: "#home-pavilion", x: 64, y: 44, w: 21, ratio: "3 / 4", speed: 0.16 },
  { shot: { ...home("monolith").cover, src: "/photos/house/monolith-5.webp", alt: "Rippled water of the Monolith pool", caption: "Pool" }, x: 49, y: 76, w: 12, ratio: "1 / 1", speed: 0.26 },
  { shot: home("lounge").cover, name: "Lounge", href: "#home-lounge", x: 4, y: 70, w: 25, ratio: "4 / 3", speed: 0.1, wide: true },
  { shot: home("slope").cover, name: "Slope", href: "#home-slope", x: 33, y: 104, w: 22, ratio: "4 / 5", speed: 0.04 },
  { shot: home("pavilion").shots[0], x: 75, y: 118, w: 16, ratio: "16 / 10", speed: 0.2 },
];

// ส่วนต่างๆ ของหน้า (ใช้กับป้ายในแถบเมนูลอยด้านล่าง + เมนู)
const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "about", label: "About" },
  { id: "collection", label: "Collection" },
  { id: "interior", label: "Interior" },
  { id: "model", label: "In 3D" },
  { id: "homes", label: "Homes" },
] as const;

type Stage = "load" | "open" | "done";

// หน้าแรกของเว็บบ้าน (แบบ fluid.glass)
// 1) หน้าโหลด: พื้นเทา + ชื่อเว็บ แผ่นสีเข้มค่อยๆ สูงขึ้นจากล่าง แล้วขยายเต็มจอ เปิดเข้าวิดีโอ
// 2) วิดีโอเต็มจอ (MONOLITH) + หัวข้อกลางล่าง / แถบเมนูลอยด้านล่างติดจอตลอด
// 3) สลับพื้นเข้ม/ครีม: แนะนำ → ข้อความใหญ่ → กลุ่มรูปลอย → วิดีโอในห้อง → โมเดล 3D หมุนได้ → รายการบ้านทุกหลัง
// รูปและวิดีโอทั้งหมดอัดจากโมเดล 3D ของบ้านหลังนั้นเอง (ดู config/house.ts)
export default function HouseLanding() {
  const root = useRef<HTMLDivElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const heroFilm = useRef<HTMLVideoElement>(null);
  const roomFilm = useRef<HTMLVideoElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("load");
  const [section, setSection] = useState(0);
  const [menu, setMenu] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [heroPaused, setHeroPaused] = useState<boolean | null>(null); // null = ยังไม่ได้กด (ใช้ค่าตามเครื่อง)
  const [roomPaused, setRoomPaused] = useState<boolean | null>(null);
  const [roomNear, setRoomNear] = useState(false); // ส่วนวิดีโอห้องใกล้เข้ามา → เริ่มโหลดวิดีโอ
  const [roomInView, setRoomInView] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const [modelNear, setModelNear] = useState(false); // ส่วน 3D ใกล้เข้ามา → โหลดโมเดล
  const [modelReady, setModelReady] = useState(false);
  const [modelInView, setModelInView] = useState(false); // โมเดลอยู่ในจอ → วาดภาพทุกเฟรม (ออกนอกจอ = หยุดวาด ประหยัดแบต)

  // ---------- หน้าโหลด ----------
  // รอวิดีโอหัวเว็บพร้อมเล่น (หรือครบ 4 วินาที) แต่อยู่อย่างน้อย 1.4 วินาทีให้เห็นจังหวะแผ่นสีเข้มขึ้นมา
  useEffect(() => {
    const started = performance.now();
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      const wait = Math.max(0, 1400 - (performance.now() - started));
      setTimeout(() => {
        setStage("open");
        setTimeout(() => setStage("done"), 1100);
      }, wait);
    };
    const v = heroFilm.current;
    if (v && v.readyState >= 3) open();
    v?.addEventListener("canplay", open, { once: true });
    const t = setTimeout(open, 4000);
    return () => {
      clearTimeout(t);
      v?.removeEventListener("canplay", open);
    };
  }, []);

  // ---------- จอแคบ (มือถือ) ----------
  useEffect(() => {
    const mq = matchMedia("(max-width: 767px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  // ---------- ส่วนที่อยู่กลางจอ → ป้ายบนแถบเมนู / วิดีโอและโมเดลโหลดเมื่อใกล้ ----------
  useEffect(() => {
    const current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setSection(SECTIONS.findIndex((x) => x.id === e.target.id));
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    const near = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.target.id === "interior") setRoomNear(true);
          if (e.target.id === "model") setModelNear(true);
        }
      },
      { rootMargin: "600px 0px 600px 0px" },
    );
    const inView = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === roomFilm.current) setRoomInView(e.isIntersecting);
          if (e.target === heroFilm.current) setHeroInView(e.isIntersecting);
          if (e.target === stageBox.current) setModelInView(e.isIntersecting);
        }
      },
      { threshold: 0.01 },
    );
    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (!el) continue;
      current.observe(el);
      near.observe(el);
    }
    if (roomFilm.current) inView.observe(roomFilm.current);
    if (heroFilm.current) inView.observe(heroFilm.current);
    if (stageBox.current) inView.observe(stageBox.current);
    return () => {
      current.disconnect();
      near.disconnect();
      inView.disconnect();
    };
  }, []);

  // ---------- เล่น/หยุดวิดีโอ: เล่นเฉพาะตอนอยู่ในจอ / ผู้ใช้กดหยุดได้ / เครื่องที่ลดภาพเคลื่อนไหวเริ่มแบบหยุด ----------
  useEffect(() => {
    const v = heroFilm.current;
    if (!v) return;
    const stopped = heroPaused ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (heroInView && !stopped) v.play().catch(() => {});
    else v.pause();
  }, [heroInView, heroPaused]);
  useEffect(() => {
    const v = roomFilm.current;
    if (!v || !roomNear) return;
    const stopped = roomPaused ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (roomInView && !stopped) v.play().catch(() => {});
    else v.pause();
  }, [roomInView, roomNear, roomPaused]);

  // ลิงก์ในหน้า (#collection ฯลฯ): เลื่อนไปแบบนุ่มด้วย Lenis
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

  const onModelReady = useCallback(() => setModelReady(true), []);
  const heroStopped = heroPaused === true;
  const roomStopped = roomPaused === true;

  return (
    <div ref={root} className={`${archivo.variable} ${plexMono.variable} hs-root`} data-stage={stage}>
      {/* ---------- หน้าโหลด ---------- */}
      <div className="hs-loader" aria-hidden={stage === "done"} role="status" aria-label="Loading">
        <p className="hs-loader-mark">
          <Mark /> Monolith
        </p>
        <div className="hs-loader-panel" />
      </div>

      {/* ---------- จอแรก: วิดีโอเต็มจอ ---------- */}
      <section id="top" className="hs-hero" data-active={stage === "done"}>
        <video
          ref={heroFilm}
          className="hs-hero-film"
          poster={HOUSE_FILM.poster}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src={HOUSE_FILM.src} media="(min-width: 768px)" type="video/mp4" />
          <source src={HOUSE_FILM.small} type="video/mp4" />
        </video>
        <div className="hs-hero-shade" />
        <header className="hs-header">
          <span />
          <Link href="/house" className="hs-wordmark" aria-label="Monolith houses">
            Monolith
          </Link>
          <Link href="/" className="hs-top-link">
            <Arrow /> Back to orbit
          </Link>
        </header>
        <div className="hs-hero-copy">
          <h1 className="hs-hero-title">
            <Reveal text="Houses shaped by concrete," delay={0.1} step={0.018} />
            <br />
            <Reveal text="stone and light." delay={0.45} step={0.018} />
          </h1>
        </div>
        <div className="hs-hero-meta">
          <span className="hs-label">Rendered from the Monolith model</span>
          <button type="button" className="hs-film-btn" onClick={() => setHeroPaused(!heroStopped)}>
            {heroStopped ? "Play" : "Pause"}
          </button>
        </div>
      </section>

      {/* ---------- แถบแนะนำ (พื้นเข้ม) ---------- */}
      <section className="hs-band">
        <div className="hs-rule" />
        <div className="hs-band-row">
          <p data-reveal className="hs-label">
            <Diamond /> Residential collection
          </p>
          <p data-reveal className="hs-band-text" style={{ "--d": "0.12s" } as CSSProperties}>
            Three houses and one living room, each a real 3D model you will be able to walk through. Every picture
            and film on this page is rendered from those same models.
          </p>
        </div>
      </section>

      {/* ---------- ข้อความใหญ่ (พื้นครีม) ---------- */}
      <section id="about" className={`hs-paper hs-about`}>
        <p data-reveal className={`hs-label hs-center`}>
          <Diamond /> About Monolith
        </p>
        <p ref={statement} className="hs-statement">
          {STATEMENT.split(" ").map((w, i) => (
            <span key={i} data-word className="hs-word">
              {w}{" "}
            </span>
          ))}
        </p>
        <div data-reveal className="hs-center">
          <a href="#homes" onClick={jump} className="hs-btn">
            <Arrow /> See every home
          </a>
        </div>
      </section>

      {/* ---------- กลุ่มรูปลอย (พื้นครีม) ---------- */}
      <section id="collection" className={`hs-paper hs-collection`}>
        <div className="hs-rule" />
        <p data-reveal className="hs-label">
          <Diamond /> The collection
        </p>
        <div className="hs-collage">
          <div data-reveal className="hs-coll-text">
            <p>
              Our <strong>collection</strong> is four places to live: a stone and concrete villa, a timber pavilion, a
              white two-storey house and a living room with a wall of glass.
            </p>
            <a href="#homes" onClick={jump} className="hs-btn">
              <Arrow /> Collection overview
            </a>
          </div>
          {TILES.map((t, i) => {
            const body = (
              <>
                <div className="hs-tile-img" style={{ aspectRatio: t.ratio }}>
                  <Image src={t.shot.src} alt={t.shot.alt} fill sizes="(min-width: 768px) 28vw, 50vw" className="hs-cover" />
                </div>
                {t.name && <span className="hs-tile-name">{t.name}</span>}
              </>
            );
            return (
              <div
                key={i}
                className="hs-tile-slot"
                data-wide={t.wide}
                style={{ "--x": `${t.x}%`, "--y": `${t.y}vh`, "--w": `${t.w}vw` } as CSSProperties}
              >
                <div data-speed={t.speed} className="hs-tile-move">
                  <div data-reveal className="hs-tile" style={{ "--d": `${(i % 3) * 0.1}s` } as CSSProperties}>
                    {t.href ? (
                      <a href={t.href} onClick={jump} className="hs-tile-link">
                        {body}
                      </a>
                    ) : (
                      body
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- ภายในบ้าน: วิดีโอห้อง (พื้นเข้ม) ---------- */}
      <section id="interior" className="hs-interior">
        <div className="hs-rule" />
        <p data-reveal className="hs-label">
          <Diamond /> Interior
        </p>
        <figure data-reveal className="hs-room-film">
          <video
            ref={roomFilm}
            src={roomNear ? ROOM_FILM.src : undefined}
            poster={ROOM_FILM.poster}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
          />
          <figcaption className="hs-room-meta">
            <span className="hs-label">Lounge · rendered from the room model</span>
            <button type="button" className="hs-film-btn" onClick={() => setRoomPaused(!roomStopped)}>
              {roomStopped ? "Play" : "Pause"}
            </button>
          </figcaption>
        </figure>
        <div className="hs-interior-foot">
          <h2 data-reveal className="hs-h2">
            Rooms you can
            <br />
            walk into.
          </h2>
          <div data-reveal className="hs-address" style={{ "--d": "0.12s" } as CSSProperties}>
            <p className="hs-label">Location</p>
            <p>
              Khon Kaen, Thailand
              <br />
              16.44° N, 102.83° E
            </p>
            <span className={`hs-btn hs-btn-ghost`} aria-disabled>
              <Arrow /> Walk-through · next
            </span>
          </div>
        </div>
      </section>

      {/* ---------- โมเดล 3D หมุนได้ (พื้นเข้ม) ---------- */}
      <section id="model" className="hs-model">
        <div className="hs-model-head">
          <p data-reveal className="hs-label">
            <Diamond /> In 3D
          </p>
          <p data-reveal className="hs-model-text" style={{ "--d": "0.1s" } as CSSProperties}>
            The same Monolith model, live in your browser. Drag to turn it.
          </p>
        </div>
        <div ref={stageBox} className="hs-stage" data-ready={modelReady}>
          {modelNear && <ModelViewer src={LIVE_MODEL} narrow={narrow} active={modelInView} onReady={onModelReady} />}
          {!modelReady && <p className={`hs-label hs-stage-wait`}>Loading model…</p>}
        </div>
        <dl className="hs-model-specs">
          {home("monolith").specs.map((x) => (
            <div key={x.label}>
              <dt className="hs-label">{x.label}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---------- บ้านทุกหลัง (พื้นครีม) ---------- */}
      <section id="homes" className={`hs-paper hs-homes`}>
        <div className="hs-rule" />
        <div className="hs-homes-head">
          <p data-reveal className="hs-label">
            <Diamond /> Featured homes
          </p>
          <div>
            <h2 data-reveal className="hs-h2">
              Each home tells a story
              <br />
              of light and material.
            </h2>
          </div>
        </div>
        <ol className="hs-home-list">
          {HOMES.map((h, i) => (
            <li key={h.id} id={`home-${h.id}`} className="hs-home-row">
              <div data-reveal className="hs-home-info">
                <p className="hs-label">
                  {pad(i + 1)} · {h.type}
                </p>
                <h3 className="hs-home-name">{h.name}</h3>
                <p className="hs-home-summary">{h.summary}</p>
                <dl className="hs-specs">
                  {h.specs.map((x) => (
                    <div key={x.label}>
                      <dt className="hs-label">{x.label}</dt>
                      <dd>{x.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="hs-home-shots">
                {[h.cover, ...h.shots].map((p, k) => (
                  <figure
                    key={p.src}
                    data-reveal
                    className={k === 0 ? "hs-shot-main" : "hs-shot"}
                    style={{ "--d": `${0.08 + k * 0.08}s` } as CSSProperties}
                  >
                    <div className="hs-shot-img">
                      <Image
                        src={p.src}
                        alt={p.alt}
                        fill
                        sizes={k === 0 ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 19vw, 33vw"}
                        className="hs-cover"
                      />
                    </div>
                    <figcaption className="hs-label">{p.caption}</figcaption>
                  </figure>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- ท้ายหน้า ---------- */}
      <footer className="hs-footer">
        <div className="hs-foot-row">
          <p className="hs-foot-text">A place where concrete, stone and light connect.</p>
          <div className="hs-foot-links">
            <Link href="/" className="hs-btn">
              <Arrow /> Back to orbit
            </Link>
            <Link href="/credits" className={`hs-btn hs-btn-ghost`}>
              <Arrow /> Credits
            </Link>
          </div>
        </div>
        <p className="hs-foot-word" aria-hidden>
          Monolith
        </p>
        <p className="hs-foot-note">
          Concept project by Blue. Houses and room are 3D models; every image is rendered from them.
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

// โลโก้: แท่งหินสูงกับแท่งเตี้ยวางคู่กัน (เหมือนหอคอยกับตัวบ้าน MONOLITH)
function Mark() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden className="inline-block align-[-3px]">
      <rect x="3" y="2" width="6" height="16" fill="currentColor" />
      <rect x="11" y="8" width="6" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
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
