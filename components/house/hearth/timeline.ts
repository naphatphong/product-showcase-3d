// ลำดับเหตุการณ์ของทัวร์ HEARTH: แปลง "ตำแหน่งในทัวร์" (t) เป็นท่ากล้อง / เวลาเฟอร์นิเจอร์เด้ง / ความมืดยามค่ำ
// t = 0 ตอนเริ่มส่วนทัวร์ ถึง STOPS.length ตอนเลื่อนผ่านจุดสุดท้าย — จุดที่ i กินช่วง [i, i + 1)
// ในแต่ละจุด: ช่วงแรก (TRAVEL) กล้องเดินทางจากจุดก่อน → ช่วงที่เหลือค่อยๆ เคลื่อนเข้าช้าๆ (arrive → settle)
// ไฟล์นี้ไม่มี React: หน้าเว็บ (ข้อความ/ปุ่ม) กับฉาก 3D เรียกใช้ร่วมกัน

import * as THREE from "three";
import { EVENING, STOPS, type Pose } from "@/config/hearth";

export const TRAVEL = 0.35; // สัดส่วนของแต่ละจุดที่ใช้เดินทาง
export const POP_AT = TRAVEL * 0.6; // เฟอร์นิเจอร์มุมนั้นเริ่มเด้งเมื่อกล้องเดินทางมาได้ 60%
export const SETTLE_AT = 0.93; // ตำแหน่ง "พักดู" ของแต่ละจุด (ปุ่ม Auto / จุดนำทาง เลื่อนมาหยุดตรงนี้)

// ข้อมูลที่หน้าเว็บเขียน แล้วฉาก 3D อ่านทุกเฟรม (object ธรรมดาใน useRef ไม่ใช้ React state เพราะเปลี่ยนทุกเฟรม)
export type TourMotion = { t: number };
export const createMotion = (): TourMotion => ({ t: 0 });

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
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

export function poseAt(t: number, out: CameraPose) {
  const { i, u } = stopAt(t);
  const here = KEYS[i];
  if (u < TRAVEL) {
    const from = i === 0 ? here.arrive : KEYS[i - 1].settle;
    return mix(out, from, here.arrive, easeInOut(u / TRAVEL));
  }
  // ค่อยๆ เคลื่อนเข้า: เร่งออกตัวนุ่มๆ แล้วชะลอตอนจบ (แบบสโลว์โมชั่น)
  return mix(out, here.arrive, here.settle, easeInOut((u - TRAVEL) / (1 - TRAVEL)));
}
