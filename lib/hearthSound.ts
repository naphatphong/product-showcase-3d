// เพลงเบาๆ ของหน้า HEARTH (/house) — สังเคราะห์ด้วย Web Audio ทั้งหมด (ไม่มีไฟล์เสียง ไม่ติดลิขสิทธิ์)
//   pad   = คอร์ดนุ่มๆ ค้างยาว เปลี่ยนคอร์ดทุก 8 วินาที (Dmaj9 → Bm9 → Gmaj9 → Asus)
//   bells = โน้ตใสๆ สุ่มจากสเกลเพนทาโทนิก D ห่างกัน 2–5 วินาที มีเสียงสะท้อน
//   fire  = เสียงไฟปะทุเบาๆ เป็นครั้งคราว
// ปิดไว้ก่อนเสมอ: เบราว์เซอร์ให้เปิดเสียงได้ต่อเมื่อผู้ใช้กดปุ่มเท่านั้น → เรียก setMusic(true) ในตอนกดปุ่ม

import { burst, tone, whiteNoise } from "./synth";

const CHORDS = [
  [146.8, 220.0, 277.2, 329.6, 370.0], // Dmaj9
  [123.5, 185.0, 220.0, 293.7, 277.2], // Bm9
  [98.0, 146.8, 185.0, 220.0, 246.9], // Gmaj9
  [110.0, 164.8, 220.0, 293.7, 329.6], // Asus
];
const BELLS = [587.3, 659.3, 740.0, 880.0, 987.8, 1174.7]; // D5 E5 F#5 A5 B5 D6

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let echo: GainNode | null = null;
let noise: AudioBuffer | null = null;
let timers: number[] = [];
let playing = false; // ปิดอยู่: ไม่สร้างโน้ตใหม่ (ไม่งั้นโน้ตที่ตั้งไว้ระหว่างพักจะดังพร้อมกันตอนเปิดใหม่)

function start() {
  const c = new AudioContext();
  ctx = c;
  master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  noise = whiteNoise(c, 2);

  // เสียงสะท้อนแบบห้อง: หน่วง 0.42 วินาที วนกลับ 40%
  echo = c.createGain();
  echo.gain.value = 0.35;
  const delay = c.createDelay(1);
  delay.delayTime.value = 0.42;
  const fb = c.createGain();
  fb.gain.value = 0.4;
  echo.connect(delay).connect(fb).connect(delay);
  delay.connect(master);

  // คอร์ด: โน้ตละ 2 ตัวจูนเพี้ยนกันนิดหน่อย (เสียงกว้างขึ้น) ผ่านตัวกรองที่สว่าง-มืดช้าๆ
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const pad = c.createGain();
  pad.gain.value = 0.05;
  lp.connect(pad).connect(master);
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.05;
  const depth = c.createGain();
  depth.gain.value = 350;
  lfo.connect(depth).connect(lp.frequency);
  lfo.start();
  const voices = CHORDS[0].flatMap((f) =>
    [-5, 5].map((detune) => {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(lp);
      o.start();
      return o;
    }),
  );
  let chord = 0;
  timers.push(
    window.setInterval(() => {
      chord = (chord + 1) % CHORDS.length;
      voices.forEach((o, i) => o.frequency.setTargetAtTime(CHORDS[chord][i >> 1], c.currentTime, 1.2)); // เลื่อนโน้ตช้าๆ ไม่สะดุด
    }, 8000),
  );

  // โน้ตใสๆ กับเสียงไฟปะทุ: ตั้งเวลาสุ่มต่อกันไปเรื่อยๆ
  const bell = () => {
    if (playing && ctx && master && echo) {
      const freq = BELLS[Math.floor(Math.random() * BELLS.length)];
      tone(ctx, master, { freq, peak: 0.035, attack: 0.01, release: 2.6 });
      tone(ctx, echo, { freq, peak: 0.035, attack: 0.01, release: 2.6 });
    }
    timers.push(window.setTimeout(bell, 2000 + Math.random() * 3000));
  };
  const crackle = () => {
    if (playing && ctx && master && noise)
      burst(ctx, master, noise, { type: "highpass", freq: 1800 + Math.random() * 2500, peak: 0.02 + Math.random() * 0.03, attack: 0.003, release: 0.04 + Math.random() * 0.06 });
    timers.push(window.setTimeout(crackle, 150 + Math.random() * 1800));
  };
  bell();
  crackle();
}

// เปิด/ปิดเพลง (ค่อยๆ ดัง/เบา) — ปิดแล้วพักระบบเสียง ไม่กิน CPU
export function setMusic(on: boolean) {
  playing = on;
  if (on && !ctx) start();
  if (!ctx || !master) return;
  const c = ctx;
  master.gain.setTargetAtTime(on ? 1 : 0, c.currentTime, on ? 0.8 : 0.3);
  if (on) void c.resume();
  else
    timers.push(
      window.setTimeout(() => {
        if (master && master.gain.value < 0.01) void c.suspend();
      }, 1500),
    );
}

// ออกจากหน้า: ปิดระบบเสียงทิ้ง (กลับมาหน้านี้ใหม่จะสร้างใหม่ตอนกดเปิด)
export function stopMusic() {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  void ctx?.close();
  ctx = master = echo = null;
  noise = null;
  playing = false;
}
