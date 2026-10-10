"use client";

import Link from "next/link";
import Reveal from "@/components/Reveal";
import { CHAPTERS, SHOWROOM_CARS, type Chapter } from "@/config/f1";

// ข้อความที่ลอยทับฉาก 3D ของแต่ละ section ในหน้า GRID 26 (position: fixed อยู่กับที่ ไม่เลื่อนตามหน้า)
// section ไหนแสดงอยู่ ข้อความของ section นั้นจะค่อยๆ โผล่ขึ้นมา ที่เหลือซ่อน (คลาส overlay ใน globals.css)
// ตัวครอบเป็น pointer-events-none: เมาส์/นิ้วทะลุไปถึงฉาก 3D ด้านหลัง ยกเว้นปุ่มที่เปิดไว้เอง

const pad = (n: number) => String(n).padStart(2, "0");

// ---------- หน้าแรก: รถประกอบครบ ----------
export function HeroOverlay({ active, car }: { active: boolean; car: string }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="absolute inset-x-5 bottom-8 flex flex-col gap-6 md:inset-x-[60px] md:bottom-16 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="f1-label reveal-fade">
            <span className="text-[var(--f1-red)]">■</span> {car} · 2026 season
          </p>
          <h2 className="f1-title mt-3 text-[clamp(3.6rem,9.5vw,9rem)]">
            <Reveal text="Take it apart." step={0.03} />
          </h2>
        </div>
        <div className="reveal-fade max-w-xs md:pb-3">
          <p className="text-sm leading-relaxed text-[var(--f1-muted)]">
            One Formula 1 car, sixteen parts. Scroll to see how fast it is and where it comes from, then pull it
            apart piece by piece and watch it go back together.
          </p>
          <p className="f1-label mt-5 flex items-center gap-3">
            <span className="scroll-hint" aria-hidden />
            Scroll down
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- แยกชิ้นทั้งคัน ----------
export function ExplodeOverlay({ active }: { active: boolean }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-copy">
        <p className="f1-label reveal-fade">
          <span className="text-[var(--f1-red)]">00</span> · Exploded view · 16 parts
        </p>
        <h2 className="f1-title mt-3 text-[clamp(2.6rem,5vw,4.8rem)]">
          <Reveal text="Every part has a job." delay={0.1} />
        </h2>
        <p className="reveal-fade mt-5 text-[14px] leading-relaxed text-[var(--f1-muted)] md:text-[15px]">
          Some parts cut through the air, some push the car down onto the track and some keep the driver safe. Here
          they are in eight chapters, one group of parts at a time.
        </p>
      </div>
    </div>
  );
}

// ---------- บทชิ้นส่วน (8 บท): เลขบท หัวข้อ คำอธิบาย และตัวเลข 3 ช่องแบบตารางในแบบวิศวกรรม ----------
export function ChapterOverlay({ active, chapter, index }: { active: boolean; chapter: Chapter; index: number }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-copy">
        <p className="f1-label reveal-fade">
          <span className="text-[var(--f1-red)]">
            {pad(index + 1)} / {pad(CHAPTERS.length)}
          </span>{" "}
          · {chapter.kicker}
        </p>
        <h2 className="f1-title mt-3 text-[clamp(2.4rem,4.6vw,4.5rem)]">
          <Reveal text={chapter.title} delay={0.1} />
        </h2>
        <p className="reveal-fade mt-4 text-[13.5px] leading-relaxed text-[var(--f1-muted)] md:mt-5 md:text-[15px]">
          {chapter.text}
        </p>
        <dl className="reveal-fade mt-5 grid w-full grid-cols-3 border-t border-[var(--f1-line)] md:mt-7">
          {chapter.stats.map((s) => (
            <div key={s.label} className="border-l border-[var(--f1-line)] px-3 pt-3 first:border-l-0 first:pl-0">
              <dt className="f1-label text-[9px] md:text-[10px]">{s.label}</dt>
              <dd className="mt-1.5 text-[13px] leading-tight font-semibold md:text-[15px]">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// ---------- รายการบทด้านขวาจอ (คอมเท่านั้น) แบบตารางรายการชิ้นส่วนในแบบวิศวกรรม กดไปบทนั้นได้ ----------
// พื้นกระดาษโปร่งแสง + เบลอด้านหลัง: อ่านออกแม้มีชิ้นส่วนรถอยู่ข้างหลัง
export function ChapterNav({
  active,
  current,
  onGo,
}: {
  active: boolean;
  current: number; // บทที่กำลังแสดง
  onGo: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Parts"
      data-active={active}
      className="overlay pointer-events-none fixed top-1/2 right-[60px] z-[3] hidden w-48 -translate-y-1/2 border border-[var(--f1-line)] bg-[rgba(236,235,231,0.8)] backdrop-blur-sm md:block"
    >
      <p className="f1-label border-b border-[var(--f1-line)] px-4 py-2.5 text-[10px]">Parts list</p>
      <ol className="py-2">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              onClick={() => onGo(i)}
              aria-current={i === current ? "step" : undefined}
              className={`pointer-events-auto flex w-full items-center gap-3 px-4 py-[5px] text-left transition-colors ${i === current ? "text-[var(--f1-ink)]" : "text-[var(--f1-faint)] hover:text-[var(--f1-ink)]"}`}
            >
              <span className={`f1-mono text-[10px] ${i === current ? "text-[var(--f1-red)]" : ""}`}>{pad(i + 1)}</span>
              <span className="text-[11px] tracking-[0.14em] uppercase">{c.short}</span>
              {i === current && <span aria-hidden className="ml-auto h-1.5 w-1.5 bg-[var(--f1-red)]" />}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------- ประกอบกลับ ----------
export function AssembleOverlay({ active }: { active: boolean }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-copy">
        <p className="f1-label reveal-fade">
          <span className="text-[var(--f1-red)]">09</span> · Reassembly
        </p>
        <h2 className="f1-title mt-3 text-[clamp(2.6rem,5vw,4.8rem)]">
          <Reveal text="Back together." delay={0.1} />
        </h2>
        <p className="reveal-fade mt-5 text-[14px] leading-relaxed text-[var(--f1-muted)] md:text-[15px]">
          Every part flies back to exactly where it came from. One car again, ready for the grid.
        </p>
      </div>
    </div>
  );
}

// ---------- ท้ายหน้า: ชวนไปหน้าโชว์รูม 3D (รถ 3 ทีม กดดูชิ้นส่วนได้) ----------
export function Outro({ active, note }: { active: boolean; note?: string }) {
  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="absolute inset-x-5 bottom-[9%] flex flex-col items-center text-center md:bottom-[11%]">
        <p className="f1-label reveal-fade">GRID 26 · 1:18 scale models</p>
        <h2 className="f1-title mt-3 text-[clamp(2.8rem,6.5vw,6rem)]">
          <Reveal text="Meet all three." />
        </h2>
        <p className="reveal-fade mt-4 max-w-md text-sm leading-relaxed text-[var(--f1-muted)]">
          Red Bull, Ferrari and Mercedes side by side in a 3D showroom. Pick a car, then click any part to see what it
          does.
        </p>
        <p className="f1-label reveal-fade mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px]">
          {SHOWROOM_CARS.map((c) => (
            <span key={c.id}>
              <span className="text-[var(--f1-red)]">■</span> {c.short}
            </span>
          ))}
          <span>· 16 parts each · 360°</span>
        </p>
        {/* ปุ่มหลักตัวใหญ่ มีแสงวิ่งผ่านเป็นระยะ / ปุ่มกลับเป็นปุ่มรองอยู่ข้างล่าง */}
        <div className="reveal-fade mt-7 flex flex-col items-center gap-5">
          <Link href="/f1/showroom" className="f1-cta f1-cta-xl f1-shine pointer-events-auto">
            Enter the 3D garage{" "}
            <span aria-hidden className="f1-arrow">
              →
            </span>
          </Link>
          <Link href="/" className="f1-label pointer-events-auto text-[10px] underline-offset-4 hover:underline">
            ← Back to orbit
          </Link>
        </div>
        <p className="reveal-fade mt-10 max-w-xl text-[10px] leading-relaxed text-[var(--f1-faint)]">
          {note ?? "Concept project — not a real product."} ·{" "}
          <Link href="/credits" className="pointer-events-auto underline underline-offset-2 hover:text-[var(--f1-ink)]">
            Credits
          </Link>
        </p>
      </div>
    </div>
  );
}

// ---------- ตัวหนังสือใหญ่จางๆ ด้านหลังรถ (อยู่ชั้นหลัง canvas) ----------
export function GhostText({ active, text }: { active: boolean; text: string }) {
  return (
    <div
      aria-hidden
      data-active={active}
      className="overlay pointer-events-none fixed inset-0 z-[1] flex items-center justify-center"
    >
      <span className="f1-title f1-ghost ghost-line text-[clamp(9rem,36vw,34rem)] leading-none">
        {text}
      </span>
    </div>
  );
}
