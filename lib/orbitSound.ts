// เสียงของหน้าแรก (วงโคจร) — สังเคราะห์เองด้วย Web Audio API ทั้งหมด (ไม่มีไฟล์เสียง ไม่ติดลิขสิทธิ์)
// เสียงมี 5 แบบ:
//   ambience = เสียงอวกาศเบาๆ ตลอดเวลา: เสียงทุ้มต่ำ (drone) หายใจเข้าออกช้าๆ + เสียงลมจางๆ
//   whoosh   = ลมวูบตอนสินค้าบินผ่าน (บินเข้ามาครั้งแรก / เปลี่ยนชิ้น)
//   chime    = เสียงกริ๊งใสๆ มีเสียงสะท้อน ตอนกด Enter orbit
//   blip     = เสียงติ๊กสั้นๆ ตอนเลือกแบบ (ยี่ห้อ/ทีม)
//   dive     = เสียงพุ่งลงหาโลก ดังขึ้นเรื่อยๆ ตอนกดเข้าหน้าสินค้า
// เบราว์เซอร์ไม่ยอมให้เว็บเปิดเสียงเองก่อนผู้ใช้กดอะไร → ต้องเรียก unlock() ในตอนที่ผู้ใช้กดปุ่มเท่านั้น

import { burst, tone, whiteNoise, type BurstOptions } from "./synth";

let ctx: AudioContext | null = null;
let master: GainNode | null = null; // ปุ่มปรับเสียงหลัก (ปิด = 0)
let space: GainNode | null = null; // ทางเข้าของเสียงสะท้อน (echo) ใช้กับเสียงกริ๊ง
let noise: AudioBuffer | null = null;

// เริ่มระบบเสียง (เรียกตอนผู้ใช้กดปุ่มเปิดเสียง) — สร้างครั้งเดียว ครั้งต่อไปแค่ปลุกให้ทำงานต่อ
export function unlock() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const c = new AudioContext();
    ctx = c;
    master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    noise = whiteNoise(c, 3);

    // เสียงทุ้มต่ำ: โน้ต A1 + E2 (คู่ห้า ฟังดูกว้างๆ นิ่งๆ) จูนเพี้ยนกันนิดหน่อยให้เสียงขยับเป็นคลื่น
    const drone = c.createGain();
    drone.gain.value = 0.16;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    lp.connect(drone).connect(master);
    for (const [type, freq, detune, level] of [
      ["sine", 55, 0, 0.9],
      ["sine", 82.4, 4, 0.6],
      ["triangle", 110, -6, 0.18],
    ] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = c.createGain();
      g.gain.value = level;
      o.connect(g).connect(lp);
      o.start();
    }
    // หายใจ: คลื่นช้ามาก (LFO) ขยับความสว่างของเสียงทุ้ม + ความดังขึ้นลงเล็กน้อย
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoDepth = c.createGain();
    lfoDepth.gain.value = 140;
    lfo.connect(lfoDepth).connect(lp.frequency);
    const lfo2 = c.createOscillator();
    lfo2.frequency.value = 0.09;
    const lfo2Depth = c.createGain();
    lfo2Depth.gain.value = 0.05;
    lfo2.connect(lfo2Depth).connect(drone.gain);
    lfo.start();
    lfo2.start();

    // เสียงลมจางๆ: noise วนเล่น กรองเหลือช่วงกลางทุ้ม
    const air = c.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 500;
    bp.Q.value = 0.6;
    const airGain = c.createGain();
    airGain.gain.value = 0.025;
    air.connect(bp).connect(airGain).connect(master);
    air.start();

    // เสียงสะท้อน: หน่วง 0.32 วินาที วนกลับเข้าตัวเอง 35% (ได้เสียงก้องแบบห้องกว้าง)
    space = c.createGain();
    space.gain.value = 0.3;
    const delay = c.createDelay(1);
    delay.delayTime.value = 0.32;
    const feedback = c.createGain();
    feedback.gain.value = 0.35;
    space.connect(delay).connect(feedback).connect(delay);
    delay.connect(master);
  }
  void ctx.resume();
}

let enabled = false;

// เปิด/ปิดเสียงทั้งหมด (ค่อยๆ เฟด ไม่ตัดฉับ) — ปิดแล้วพักระบบเสียงด้วย ไม่ให้กิน CPU ระหว่างเงียบ
export function setEnabled(on: boolean) {
  enabled = on;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.25);
  if (on) void ctx.resume();
  else
    setTimeout(() => {
      if (!enabled) sleep();
    }, 1200);
}

function noiseBurst(o: BurstOptions) {
  if (ctx && master && noise && enabled) burst(ctx, master, noise, o);
}

// ลมวูบตอนสินค้าบินผ่าน — long = บินเข้ามาครั้งแรก (ยาวกว่า), dir = ทิศ (ถัดไป = เสียงสูงขึ้น, ย้อนกลับ = ต่ำลง)
export function whoosh(dir: 1 | -1 = 1, long = false) {
  if (!ctx || !master || !enabled) return;
  const [from, to] = dir > 0 ? [240, 1400] : [1400, 240];
  noiseBurst({ type: "bandpass", freq: from, freqTo: to, q: 1.4, peak: 0.22, attack: long ? 0.9 : 0.3, release: long ? 1.4 : 0.6 });
  // เสียงทุ้มต่ำวูบตาม (ความรู้สึกว่ามีของใหญ่ผ่านหน้า)
  tone(ctx, master, { freq: long ? 70 : 90, freqTo: 45, peak: 0.12, attack: long ? 0.6 : 0.2, release: long ? 1.4 : 0.6 });
}

// เสียงกริ๊งใสๆ 2 โน้ต (E5 + B5) มีเสียงสะท้อน — ตอนกด Enter orbit
export function chime() {
  if (!ctx || !master || !space || !enabled) return;
  for (const [freq, at] of [
    [659, 0],
    [988, 0.09],
  ]) {
    tone(ctx, master, { at, freq, peak: 0.1, attack: 0.01, release: 1.6 });
    tone(ctx, space, { at, freq, peak: 0.1, attack: 0.01, release: 1.6 });
  }
}

// เสียงติ๊กสั้นๆ ตอนเลือกแบบ (เสียงสูงต่ำต่างกันเล็กน้อยตามแบบ)
export function blip(index = 0) {
  if (!ctx || !master || !enabled) return;
  tone(ctx, master, { freq: 1300 + index * 90, freqTo: 900 + index * 60, peak: 0.08, attack: 0.004, release: 0.08 });
}

// พุ่งลงหาโลก: เสียงลมที่สว่างขึ้นและดังขึ้นเรื่อยๆ + เสียงทุ้มที่สูงขึ้น ยาวเท่ากับการดำดิ่ง (seconds)
export function dive(seconds: number) {
  if (!ctx || !master || !enabled) return;
  noiseBurst({ type: "lowpass", freq: 180, freqTo: 4200, q: 0.9, peak: 0.32, attack: seconds * 0.85, release: 0.5 });
  tone(ctx, master, { type: "triangle", freq: 38, freqTo: 120, peak: 0.16, attack: seconds * 0.8, release: 0.6 });
}

// ออกจากหน้า/ซ่อนแท็บ: หยุดทำงานชั่วคราว (ไม่กิน CPU) — กลับมาเรียก unlock() เพื่อปลุก
export function sleep() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}
