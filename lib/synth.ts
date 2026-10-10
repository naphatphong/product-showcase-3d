// ชิ้นส่วนสังเคราะห์เสียงที่ใช้ร่วมกันหลายหน้า (Web Audio API) — ไม่มีไฟล์เสียง สร้างเสียงจากตัวเลขล้วน

// เสียงซ่า (white noise) ยาว seconds วินาที — สร้างครั้งเดียวแล้วใช้ซ้ำเป็นวัตถุดิบของเสียงลม/เสียงฟู่
export function whiteNoise(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export type BurstOptions = {
  at?: number; // เริ่มอีกกี่วินาทีจากตอนนี้
  type: BiquadFilterType; // ชนิดตัวกรอง เช่น bandpass = เหลือเฉพาะช่วงเสียงรอบ freq
  freq: number;
  freqTo?: number; // ความถี่ปลายทาง (กวาดเสียงจาก freq → freqTo)
  q?: number;
  peak: number; // ความดังสูงสุด
  attack: number; // วินาทีที่ใช้ดังขึ้น
  release: number; // วินาทีที่ใช้จางลง
};

// ชิ้นเสียงซ่าที่ผ่านตัวกรอง พร้อมกำหนดความดังตามเวลา (attack = ดังขึ้น, release = จางลง)
export function burst(c: AudioContext, out: AudioNode, noise: AudioBuffer, o: BurstOptions) {
  const t = (o.at ?? 0) + c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = o.type;
  f.Q.value = o.q ?? 1;
  f.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.attack + o.release);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.peak, t + o.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.attack + o.release);
  src.connect(f).connect(g).connect(out);
  src.loop = true; // เสียงยาวกว่าบัฟเฟอร์ก็ไม่ขาด
  src.start(t, Math.random()); // เริ่มที่จุดสุ่มใน noise แต่ละครั้งจะได้ไม่ซ้ำกัน
  src.stop(t + o.attack + o.release + 0.05);
}

// เสียงโทนเดียว (oscillator) ดังขึ้นเร็วแล้วจางลง — ใช้ทำเสียงกริ๊ง/ป๊อก/เสียงทุ้มๆ
export function tone(
  c: AudioContext,
  out: AudioNode,
  o: { at?: number; type?: OscillatorType; freq: number; freqTo?: number; peak: number; attack: number; release: number },
) {
  const t = (o.at ?? 0) + c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t);
  if (o.freqTo) osc.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.attack + o.release);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.peak, t + o.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.attack + o.release);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + o.attack + o.release + 0.05);
}
