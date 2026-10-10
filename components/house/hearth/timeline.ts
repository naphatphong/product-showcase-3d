// ลำดับเหตุการณ์ของทัวร์ HEARTH: แปลง "ตำแหน่งในทัวร์" เป็นท่ากล้อง / เวลาเฟอร์นิเจอร์เด้ง / ความมืดยามค่ำ
// ตำแหน่ง 0 = เริ่มทัวร์ ถึง STOPS.length = จบ — จุดที่ i กินช่วง [i, i + 1)
// มี 2 ค่า: t = ตำแหน่งที่หน้าเว็บเลื่อนถึง / view = ตำแหน่งที่กล้องอยู่จริง
// การเลื่อนแค่บอกว่า "อยู่มุมไหน" แล้วกล้องไหลไปพักที่มุมนั้นเองด้วยความเร็วของมันเอง (glide) ไม่ตามความเร็วเมาส์
// ไฟล์นี้ไม่มี React: หน้าเว็บ (ข้อความ/ปุ่ม) กับฉาก 3D เรียกใช้ร่วมกัน

import * as THREE from "three";
import { EVENING, STOPS, type Pose } from "@/config/hearth";

export const POP_AT = 0.3; // เฟอร์นิเจอร์มุมนั้นเริ่มเด้งเมื่อกล้องไหลมาได้ราว 40% ของทาง
export const SETTLE_AT = 0.93; // ปุ่ม Auto / จุดนำทาง / ป้ายบนแปลน เลื่อนหน้ามาหยุดตรงนี้ของแต่ละจุด
const REST = 0.99; // กล้องพักที่ตำแหน่งนี้ของแต่ละจุด (ท่า settle เต็มที่ ก่อนขึ้นจุดถัดไป)
const GLIDE = 0.95; // ความหนืดของกล้อง: น้อย = ไหลช้าลง (0.95 → ข้ามห้องราว 2 วินาที นิ่งสนิทใน ~4 วินาที)

// ข้อมูลที่หน้าเว็บเขียน แล้วฉาก 3D อ่านทุกเฟรม (object ธรรมดาใน useRef ไม่ใช้ React state เพราะเปลี่ยนทุกเฟรม)
export type TourMotion = { t: number; view: number; vel: number };
export const createMotion = (): TourMotion => ({ t: 0, view: 0, vel: 0 });

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

// จุดที่กำลังแสดง และตำแหน่งภายในจุดนั้น (0–1)
export function stopAt(t: number) {
  const i = clamp(Math.floor(t), 0, STOPS.length - 1);
  return { i, u: clamp(t - i, 0, 1) };
}

// ยามค่ำ: 0 = กลางวัน → 1 = กลางคืน (เริ่มมืดเมื่อเลยกลางทางเข้าจุด "Evening light")
export const nightAt = (t: number) => smooth(EVENING + 0.25, EVENING + 0.75, t);

// มุมนี้ควรมีเฟอร์นิเจอร์หรือยัง (เลื่อนกลับขึ้นไปก่อนจุดนั้น = ยุบลงไป)
export const zoneWanted = (stopIndex: number, t: number) => t >= stopIndex + POP_AT;

// จุดพักของกล้อง: เลื่อนหน้ามาอยู่ในช่วงของมุมไหน (จะเลื่อนเร็วหรือช้า) กล้องก็ไปพักที่มุมนั้น
export const restAt = (t: number) => stopAt(t).i + REST;

// กล้องไหลไปหาจุดพัก 1 เฟรม: สปริงที่หน่วงพอดี (ไม่เลยเป้าแล้วเด้งกลับ) ออกตัวนุ่ม แล้วชะลอยาวๆ ตอนเข้ามุม
// ระยะไกลแค่ไหนก็ใช้เวลาพอๆ กัน เลื่อนข้ามหลายมุมรวดเดียว กล้องก็ไหลผ่านแต่ละมุมไปเองนุ่มๆ
export function glide(m: TourMotion, dt: number) {
  m.vel += (GLIDE * GLIDE * (restAt(m.t) - m.view) - 2 * GLIDE * m.vel) * dt;
  m.view += m.vel * dt;
}

// ---------- ท่ากล้อง ----------
// เก็บทิศมองเป็น quaternion: หมุนจากทิศหนึ่งไปอีกทิศด้วย slerp จะหมุนทางสั้นที่สุดและนุ่ม
// (ถ้าเลื่อนจุดที่มองตรงๆ กล้องจะสะบัดเมื่อจุดที่มองผ่านใกล้กล้อง เช่นตอนหันหลังกลับจากครัว)
type Key = { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number };
const UP = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const key = (p: Pose): Key => {
  const pos = new THREE.Vector3(...p.pos);
  const quat = new THREE.Quaternion().setFromRotationMatrix(m4.lookAt(pos, new THREE.Vector3(...p.at), UP));
  return { pos, quat, fov: p.fov };
};
const KEYS = STOPS.map((s) => ({ arrive: key(s.arrive), settle: key(s.settle) }));

export type CameraPose = { pos: THREE.Vector3; quat: THREE.Quaternion; fov: number };
export const createPose = (): CameraPose => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 60 });

const mix = (out: CameraPose, a: Key, b: Key, k: number) => {
  out.pos.lerpVectors(a.pos, b.pos, k);
  out.quat.slerpQuaternions(a.quat, b.quat, k);
  out.fov = a.fov + (b.fov - a.fov) * k;
  return out;
};
const ab = createPose();
const bc = createPose();

// ทางเดินกล้องของจุดที่ i: เส้นโค้งเดียวจากท่าพักของมุมก่อน → โค้งผ่านใกล้ arrive → จบที่ settle
// (เส้นโค้ง Bézier: ผสม 2 ชั้น) ช่วงแรกกล้องข้ามห้องไปก่อน แล้วค่อยๆ ช้าลงจนเป็นการเคลื่อนเข้ามุมช้าๆ ไม่มีจังหวะหยุดกลางทาง
// ออกตัวและจบแบบนุ่ม (smoothstep) → ผ่านหลายมุมรวดเดียว กล้องก็ชะลอที่แต่ละมุมแล้วค่อยออกตัวต่อ ไม่กระตุก
export function poseAt(t: number, out: CameraPose) {
  const { i, u } = stopAt(t);
  const here = KEYS[i];
  const from = i === 0 ? here.arrive : KEYS[i - 1].settle;
  const p = smooth(0, REST, u);
  mix(ab, from, here.arrive, p);
  mix(bc, here.arrive, here.settle, p);
  return mix(out, ab, bc, p);
}
