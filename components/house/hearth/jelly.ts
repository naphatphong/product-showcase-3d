// การเด้งแบบเยลลี่ / หยดน้ำ ของเฟอร์นิเจอร์ในทัวร์ HEARTH (ไม่มี React: ฉาก 3D เรียกทุกเฟรม)
//
// ใช้ "สปริง" แทนการเคลื่อนตามเวลาที่กำหนดตายตัว: ขนาดของชิ้น (x) ถูกดึงเข้าหาเป้าหมาย (1 = โผล่, 0 = ยุบ)
// แรงดึง = k × ระยะที่ยังขาด − c × ความเร็ว  → k มาก = ดึงแรง/เร็ว, c น้อย = เบรกน้อย เลยเกินเป้าแล้วเด้งกลับ (ตัวเด้ง)
// ระหว่างที่ขนาดเปลี่ยนเร็ว ชิ้นจะยืดสูงขึ้น/ผอมลง และตอนเด้งกลับจะเตี้ยลง/อ้วนขึ้น (ปริมาตรเท่าเดิม) จึงดูนิ่มเหมือนเยลลี่
// ชิ้นเล็ก (kind = drop เช่น หมอน ลูกบอลบนต้นคริสต์มาส) หล่นจากข้างบนตามแรงโน้มถ่วง กระแทกพื้นแล้วยุบ-เด้ง

export type Kind = "floor" | "drop" | "hang" | "wall" | "rug";

export type Jelly = {
  x: number; // ขนาด 0 → 1 (เกิน 1 ได้ตอนเด้ง)
  v: number; // ความเร็วที่ขนาดเปลี่ยน (ต่อวินาที)
  h: number; // drop: ความสูงเหนือที่วาง (เมตร)
  hv: number; // drop: ความเร็วตก (เมตร/วินาที, ติดลบ = ลง)
  q: number; // drop: ยุบตัวตอนกระแทก (บวก = แบนลง)
  qv: number;
  on: boolean; // เป้าหมาย: แสดง / ซ่อน
  wait: number; // วินาทีที่ต้องรอก่อนเริ่ม (ให้ชิ้นใหญ่ขึ้นก่อน ชิ้นเล็กตามมาทีละชิ้น)
};

export const createJelly = (): Jelly => ({ x: 0, v: 0, h: 0, hv: 0, q: 0, qv: 0, on: false, wait: 0 });

// ---------- ค่าที่ปรับความรู้สึกได้ ----------
const IN = { k: 50, c: 9 }; // โผล่ขึ้น: ค่อยๆ พองขึ้นสุดใน ~0.55 วินาที เกินเป้าแค่ ~7% แล้วกระเพื่อมกลับครั้งเดียว (นิ่งใน ~1 วินาที)
const OUT = { k: 120, c: 22 }; // ยุบลง: ไม่เด้ง (เบรกพอดี)
const POP = { k: 160, c: 24 }; // drop: ขยายเต็มขนาดกลางอากาศก่อนหล่น (~0.35 วินาที)
const SQUASH = { k: 200, c: 14 }; // drop: ยุบแล้วกระเพื่อมกลับเบาๆ หลังกระแทก
const DROP_FROM = 0.35; // drop: หล่นจากสูงกว่าที่วาง (เมตร)
const GRAVITY = 7; // เบากว่าโลกจริงนิดหน่อย หล่นช้าลงแบบสโลว์โมชั่น
const BOUNCE = 0.3; // กระแทกแล้วเด้งกลับด้วยความเร็วกี่ส่วน (หล่นจาก 0.35 m → เด้งอีกครั้งสูงราว 3 ซม. แล้วนิ่ง)
const IMPACT_SQUASH = 1.0; // ความเร็วกระแทก 1 m/s → ยุบราว 4% (หล่นจาก 0.35 m กระแทกที่ ~2.2 m/s → ยุบ ~10%)
const STRETCH = 0.04; // ความเร็วของขนาด 1/วินาที → ยืดเท่าไร
const STEP = 1 / 240; // คำนวณย่อยทีละ 1/240 วินาที (สปริงแข็งต้องก้าวเล็ก ไม่งั้นค่าระเบิด)

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// สั่งให้ชิ้นโผล่ / ยุบ (wait = รอกี่วินาที)
export function setJelly(j: Jelly, on: boolean, wait: number, kind: Kind) {
  if (j.on === on) return;
  j.on = on;
  j.wait = wait;
  // drop ที่ยังไม่โผล่เลย: เริ่มจากกลางอากาศ
  if (on && kind === "drop" && j.x < 0.01) {
    j.h = DROP_FROM;
    j.hv = 0;
    j.q = 0;
    j.qv = 0;
  }
}

// กระโดดไปสถานะสุดท้ายทันที (เครื่องที่ตั้งลดภาพเคลื่อนไหว)
export function snapJelly(j: Jelly) {
  j.x = j.on ? 1 : 0;
  j.v = j.h = j.hv = j.q = j.qv = 0;
  j.wait = 0;
}

const spring = (x: number, v: number, target: number, s: { k: number; c: number }, dt: number) => {
  v += (s.k * (target - x) - s.c * v) * dt;
  return [x + v * dt, v] as const;
};

export function stepJelly(j: Jelly, kind: Kind, dt: number) {
  if (j.wait > 0) {
    j.wait -= dt;
    if (j.wait > 0) return;
    dt = -j.wait; // เวลาที่เหลือของเฟรมนี้หลังรอครบ
    j.wait = 0;
  }
  for (let left = dt; left > 1e-6; left -= STEP) {
    const d = Math.min(STEP, left);
    if (kind === "drop" && j.on) {
      [j.x, j.v] = spring(j.x, j.v, 1, POP, d);
      // ตกลงมา: กระแทกพื้น → ยุบตัว แล้วเด้งขึ้นเบาลงทุกครั้ง
      if (j.h > 0 || j.hv > 0) {
        j.hv -= GRAVITY * d;
        j.h += j.hv * d;
        if (j.h <= 0) {
          const hit = -j.hv;
          j.h = 0;
          j.hv = hit * BOUNCE > 0.35 ? hit * BOUNCE : 0;
          j.qv += hit * IMPACT_SQUASH;
        }
      }
      [j.q, j.qv] = spring(j.q, j.qv, 0, SQUASH, d);
    } else {
      [j.x, j.v] = spring(j.x, j.v, j.on ? 1 : 0, j.on ? IN : OUT, d);
      [j.q, j.qv] = spring(j.q, j.qv, 0, SQUASH, d);
    }
  }
  if (!j.on && j.x < 0.002 && Math.abs(j.v) < 0.01) j.x = j.v = 0;
}

// แปลงสถานะเป็นขนาดของชิ้น (out = [กว้าง x, สูง y, ลึก z]) — ชิ้นถูกย่อ/ขยายรอบจุดหมุนของมัน
// (floor/drop/rug = กลางฐาน, hang = กลางด้านบน, wall = กลางชิ้น ดู HearthScene)
export function jellyScale(j: Jelly, kind: Kind, out: { x: number; y: number; z: number }) {
  const x = Math.max(0, j.x);
  if (kind === "rug") {
    // พรม: คลี่ออกตามแนวพื้น ไม่สูงขึ้น
    out.x = out.z = x;
    out.y = 1;
    return out;
  }
  if (kind === "wall") {
    out.x = out.y = out.z = x;
    return out;
  }
  // ยืด (ตอนขนาดโตเร็ว) / แบน (ตอนเด้งกลับ, ตอนกระแทก) โดยปริมาตรเท่าเดิม: สูง × (1 + s), กว้าง ÷ √(1 + s)
  const s = kind === "drop" ? clamp(-j.q, -0.35, 0.3) : clamp(j.v * STRETCH, -0.16, 0.18);
  out.y = x * (1 + s);
  out.x = out.z = x / Math.sqrt(1 + s);
  return out;
}
