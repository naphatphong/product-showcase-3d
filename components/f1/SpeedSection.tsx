"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/Reveal";
import { SPEED } from "@/config/f1";

// หน้าความเร็วของ GRID 26 (แบบส่วน TECH ของเว็บ Aevion):
// - ครึ่งวงกลมกลางจอ = หน้าปัดความเร็ว 0–360 กม./ชม. ข้างในเห็นรถ 3D ของฉากด้านหลัง (วิดีโอแข่งรถอยู่หน้าถัดไป: RaceSection)
// - วงกลมตรงฐานครึ่งวงกลม = ตัวเลขที่นับขึ้นของช่องที่เลือกอยู่
// - ด้านล่าง 3 ช่อง: ความเร็วสูงสุด, 0–100 กม./ชม., แรงม้า — เลือกวนให้เองทีละช่อง หรือกดเลือกเองได้
// ทุกเฟรมแก้ค่าผ่าน ref โดยตรง (เข็ม, ตัวเลข) ไม่ใช้ React state เพราะเปลี่ยน 60 ครั้งต่อวินาที

const LABEL_ROOM = 34; // ที่ว่างเหนือครึ่งวงกลม (px) สำหรับขีดและตัวเลขของหน้าปัด
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const fmt = (v: number, decimals: number) =>
  decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US");

// จุดบนหน้าปัดของความเร็ว v (กม./ชม.) ที่รัศมี r — 0 อยู่ซ้ายสุด, ความเร็วสูงสุดอยู่ขวาสุด, ครึ่งทางอยู่บนสุด
function onDial(v: number, r: number, c: number) {
  const a = Math.PI * (1 - v / SPEED.max);
  return { x: c + r * Math.cos(a), y: c - r * Math.sin(a), a };
}

export default function SpeedSection({
  active,
  narrow,
}: {
  active: boolean; // section นี้แสดงอยู่
  narrow: boolean; // จอแคบ (มือถือ): ครึ่งวงกลมกลายเป็นทรงโค้งประตู ให้รถข้างในใหญ่ขึ้น
}) {
  const stage = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGPathElement>(null); // เส้นสีแดงจาก 0 ถึงเข็ม
  const marker = useRef<SVGGElement>(null); // สามเหลี่ยมสีแดงที่ปลายเข็ม
  const readout = useRef<HTMLSpanElement>(null); // ตัวเลขในวงกลม
  const needle = useRef(0); // ความเร็วที่เข็มชี้อยู่ตอนนี้
  const [size, setSize] = useState(0); // ความกว้างครึ่งวงกลม (px)
  const [stat, setStat] = useState(0); // ช่องที่เลือกอยู่
  const [picked, setPicked] = useState(0); // นับครั้งที่ผู้ใช้กดเลือกช่องเอง (หยุดวนอัตโนมัติชั่วคราว)

  // ขนาดครึ่งวงกลม: กว้างที่สุดที่ใส่ในพื้นที่ได้ (คอม = กว้าง 2 เท่าของสูง, มือถือ = ทรงประตูกว้างเท่าสูง)
  // ResizeObserver เรียก fit ครั้งแรกให้เองทันทีที่เริ่มดู และทุกครั้งที่พื้นที่เปลี่ยนขนาด
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight - LABEL_ROOM;
      setSize(Math.max(0, Math.floor(narrow ? Math.min(w - 36, h) : Math.min(w * 0.74, h * 2, 1100))));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [narrow]);

  // เลือกช่องถัดไปให้เองทุกๆ ช่วง (เวลาวิ่งของเข็ม + ค้างให้อ่าน 2.4 วินาที) / ผู้ใช้กดเลือกเอง → ค้างไว้นานขึ้น
  useEffect(() => {
    if (!active) return;
    const s = SPEED.stats[stat];
    const wait = (s.time + (s.fromZero ? 0.5 : 0) + 2.4) * 1000 + (picked ? 6000 : 0);
    const t = setTimeout(() => {
      setPicked(0);
      setStat((i) => (i + 1) % SPEED.stats.length);
    }, wait);
    return () => clearTimeout(t);
  }, [active, stat, picked]);

  // เข็ม + ตัวเลขในวงกลม: วิ่งตามช่องที่เลือก (เริ่มใหม่ทุกครั้งที่เปลี่ยนช่อง หรือกลับมาที่ section นี้)
  useEffect(() => {
    if (!active || !size) return;
    const s = SPEED.stats[stat];
    const r = size / 2;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drop = s.fromZero ? 0.5 : 0; // ช่อง 0–100: เข็มตกกลับไปที่ 0 ก่อนออกตัว
    const from = needle.current;
    const start = performance.now();
    let raf = 0;

    const draw = (v: number, shown: number) => {
      needle.current = v;
      const p = onDial(v, r, r);
      arc.current?.setAttribute("d", `M 0 ${r} A ${r} ${r} 0 0 1 ${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      marker.current?.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${90 - (p.a * 180) / Math.PI})`);
      if (readout.current) readout.current.textContent = fmt(shown, s.decimals);
    };

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      if (reduce) {
        draw(s.needle, s.value);
        return;
      }
      if (t < drop) {
        draw(from * (1 - easeOut(t / drop)), 0);
      } else {
        const k = Math.min(1, (t - drop) / s.time);
        const base = s.fromZero ? 0 : from;
        // 0–100: ตัวเลขเป็นนาฬิกาจับเวลา นับเวลาจริง / ช่องอื่น: นับขึ้นไปพร้อมเข็ม
        const shown = s.unit === "km/h" ? base + (s.needle - base) * easeOut(k) : s.fromZero ? s.value * k : s.value * easeOut(k);
        draw(base + (s.needle - base) * (s.fromZero ? 1 - Math.pow(1 - k, 1.6) : easeOut(k)), shown);
        if (k >= 1) return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, stat, size]);

  const r = size / 2;
  const height = narrow ? size : r; // ความสูงหน้าปัด (คอม = ครึ่งวงกลมพอดี, มือถือ = ทรงประตู)
  const ticks = [];
  for (let v = 0; v <= SPEED.max; v += 10) ticks.push(v);
  const s = SPEED.stats[stat];

  return (
    <div data-active={active} className="overlay pointer-events-none fixed inset-0 z-[3]">
      <div className="f1-speed">
        {/* หัวเรื่อง: ซ้ายบน / คำอธิบาย: ขวาบน (มือถือเรียงลงมา) */}
        <div className="f1-speed-head">
          <div>
            <p className="f1-label reveal-fade">[ Performance ]</p>
            <h2 className="f1-title mt-3 text-[clamp(2.4rem,3.4vw,3.5rem)]">
              <Reveal text="Built for speed." delay={0.05} />
            </h2>
          </div>
          <p className="reveal-fade hidden max-w-[17rem] text-[13.5px] leading-relaxed text-[var(--f1-muted)] md:block">
            Around a thousand horsepower in a car that weighs 768 kg, and half of it now comes from the electric
            motor. Figures are approximate.
          </p>
        </div>

        {/* พื้นที่ของหน้าปัด: ครึ่งวงกลมวางชิดขอบล่าง กึ่งกลางจอ */}
        <div ref={stage} className="relative min-h-0 flex-1">
          {size > 0 && (
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{ width: size, height }}
            >
              {/* หน้าปัด: เส้นโค้ง, ขีดทุก 10 กม./ชม., ตัวเลขทุก 100, เส้นแดงถึงเข็ม */}
              <svg
                aria-hidden
                width={size}
                height={height}
                viewBox={`0 0 ${size} ${height}`}
                className="f1-dial absolute inset-0 overflow-visible"
              >
                <path d={`M 0 ${height} L 0 ${r} A ${r} ${r} 0 0 1 ${size} ${r} L ${size} ${height}`} className="f1-dial-line" />
                {ticks.map((v) => {
                  const major = v % 50 === 0;
                  const a = onDial(v, r + 7, r);
                  const b = onDial(v, r + (major ? 17 : 12), r);
                  return (
                    <line key={v} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={major ? "f1-dial-major" : "f1-dial-minor"} />
                  );
                })}
                {[0, 100, 200, 300].map((v) => {
                  const p = onDial(v, r + 30, r);
                  return (
                    <text key={v} x={p.x} y={p.y} className="f1-dial-num">
                      {v}
                    </text>
                  );
                })}
                <path ref={arc} d={`M 0 ${r}`} className="f1-dial-arc" />
                <g ref={marker} transform={`translate(0 ${r}) rotate(-90)`}>
                  <path d="M 0 -6 L -5 -15 L 5 -15 Z" className="f1-dial-tip" />
                </g>
              </svg>
            </div>
          )}

          {/* วงกลมกลางฐาน: ตัวเลขที่นับขึ้นของช่องที่เลือก */}
          <div className="f1-hub">
            <span ref={readout} className="f1-hub-num">
              {fmt(0, s.decimals)}
            </span>
            <span className="f1-label text-[9px] md:text-[10px]">{s.unit}</span>
          </div>
        </div>

        {/* 3 ช่องตัวเลข: ช่องที่เลือกอยู่เข้ม ที่เหลือจาง (แบบเว็บ Aevion) */}
        <div className="f1-stats reveal-fade">
          {SPEED.stats.map((st, i) => (
            <button
              key={st.label}
              type="button"
              onClick={() => {
                setStat(i);
                setPicked((n) => n + 1);
              }}
              aria-pressed={i === stat}
              className="f1-stat pointer-events-auto"
            >
              <span className="f1-stat-num">
                {fmt(st.value, st.decimals)}
                <span className="f1-stat-unit"> {st.unit}</span>
              </span>
              <span className="f1-label mt-3 block text-[9px] md:text-[10px]">[ {st.label} ]</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
