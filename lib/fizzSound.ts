// เสียงของหน้า FIZZ — สังเคราะห์เองด้วย Web Audio API ทั้งหมด (ไม่มีไฟล์เสียง)
// ข้อดี: ไม่ติดลิขสิทธิ์เสียงของใคร, ไม่ต้องโหลดไฟล์เพิ่ม, ปรับเสียงตามสถานการณ์ได้สด
// เสียงมี 4 แบบ:
//   fizz bed = เสียงซ่าเบาๆ ตลอดเวลา (ฟองแตกเป๊าะแป๊ะ) ดังเบาตามความหนาแน่นของฟองในแต่ละ section
//   crack    = เสียงเปิดกระป๋อง: แกร๊ก + ฟู่ ของแก๊สที่พุ่งออก
//   pop      = ฟองแตกดังป๊อก ตอนเปลี่ยนยี่ห้อ
//   whoosh   = ลมวูบเบาๆ ตอนเปลี่ยน section
// เบราว์เซอร์ไม่ยอมให้เว็บเปิดเสียงเองก่อนผู้ใช้กดอะไร → ต้องเรียก unlock() ในตอนที่ผู้ใช้กดปุ่มเท่านั้น

import { burst as synthBurst, whiteNoise, type BurstOptions } from "./synth";

let ctx: AudioContext | null = null;
let master: GainNode | null = null; // ปุ่มปรับเสียงหลัก (ปิด = 0)
let bed: GainNode | null = null; // ความดังของเสียงซ่าพื้นหลัง
let noise: AudioBuffer | null = null; // เสียงซ่า (white noise) ยาว 2 วินาที ใช้ซ้ำ

// สร้างเสียงฟองแตกเป๊าะแป๊ะ: ส่วนใหญ่เงียบ มีจุดเสียงสั้นๆ แบบสุ่มกระจาย + เสียงฟู่เบาๆ ด้านหลัง
function crackleBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  let tail = 0; // ความดังของฟองที่เพิ่งแตก (ค่อยๆ ลดลง)
  for (let i = 0; i < d.length; i++) {
    if (Math.random() < 0.0016) tail = 0.3 + Math.random() * 0.7;
    tail *= 0.93;
    d[i] = (Math.random() * 2 - 1) * (tail + 0.035);
  }
  return buf;
}

// เริ่มระบบเสียง (เรียกตอนผู้ใช้กดปุ่มเปิดเสียง) — สร้างครั้งเดียว ครั้งต่อไปแค่ปลุกให้ทำงานต่อ
export function unlock() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    noise = whiteNoise(ctx, 2);

    // เสียงซ่าพื้นหลัง: วนเล่นไม่หยุด กรองเอาเฉพาะเสียงแหลม (ฟองเล็กๆ) แล้วปรับความดังผ่าน bed
    const src = ctx.createBufferSource();
    src.buffer = crackleBuffer(ctx, 3);
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    bed = ctx.createGain();
    bed.gain.value = 0;
    src.connect(hp).connect(bed).connect(master);
    src.start();
  }
  void ctx.resume();
}

let enabled = false;

// เปิด/ปิดเสียงทั้งหมด (ค่อยๆ เฟด ไม่ตัดฉับ) — ปิดแล้วพักระบบเสียงด้วย ไม่ให้กิน CPU ระหว่างเงียบ
export function setEnabled(on: boolean) {
  enabled = on;
  if (!ctx || !master) return;
  master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.12);
  if (on) void ctx.resume();
  else
    setTimeout(() => {
      if (!enabled) sleep();
    }, 600);
}

// ความดังของเสียงซ่าพื้นหลัง 0–1
export function setFizz(level: number) {
  if (!ctx || !bed) return;
  bed.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.4);
}

// ชิ้นเสียงซ่าที่ผ่านตัวกรอง (ดู lib/synth.ts) ส่งเข้าปุ่มปรับเสียงหลักของหน้านี้
function burst(opts: BurstOptions) {
  if (ctx && master && noise) synthBurst(ctx, master, noise, opts);
}

// เสียงเปิดกระป๋อง: แกร๊ก (โลหะงัด) → ฟู่ (แก๊สพุ่ง) → ซ่าเป๊าะแป๊ะดังขึ้นช่วงหนึ่ง
export function crack() {
  if (!ctx || !master) return;
  // แกร๊ก: เสียงซ่าสั้นมากช่วงกลาง-แหลม + เสียงโลหะ "ติ๊ง" สั้นๆ
  burst({ type: "bandpass", freq: 3200, q: 2, peak: 0.9, attack: 0.002, release: 0.05 });
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const og = ctx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(2600, t);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.12, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og).connect(master);
  o.start(t);
  o.stop(t + 0.1);
  // ฟู่: เสียงแหลมที่ค่อยๆ ทุ้มลงตามแรงดันที่หมดไป
  burst({ at: 0.02, type: "bandpass", freq: 7000, freqTo: 2500, q: 0.8, peak: 0.55, attack: 0.02, release: 0.7 });
  // ฟองซ่าดังขึ้นแล้วค่อยๆ กลับระดับเดิม
  if (bed) {
    const now = bed.gain.value;
    bed.gain.cancelScheduledValues(t);
    bed.gain.setValueAtTime(now, t);
    bed.gain.linearRampToValueAtTime(0.6, t + 0.15);
    bed.gain.setTargetAtTime(now, t + 0.6, 0.8);
  }
}

// ฟองแตกดังป๊อก (เสียงสูงต่ำต่างกันเล็กน้อยตามยี่ห้อ)
export function pop(index = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const base = 520 + index * 70;
  o.type = "sine";
  o.frequency.setValueAtTime(base * 1.8, t);
  o.frequency.exponentialRampToValueAtTime(base * 0.6, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.15);
}

// ลมวูบเบาๆ ตอนเปลี่ยน section
export function whoosh() {
  burst({ type: "bandpass", freq: 380, freqTo: 1600, q: 1.2, peak: 0.16, attack: 0.25, release: 0.5 });
}

// ออกจากหน้า/ซ่อนแท็บ: หยุดทำงานชั่วคราว (ไม่กิน CPU) — กลับมาเรียก unlock() เพื่อปลุก
export function sleep() {
  if (ctx && ctx.state === "running") void ctx.suspend();
}
