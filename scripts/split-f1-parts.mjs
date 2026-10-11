// แยกโมเดลรถ F1 (ไฟล์ต้นฉบับจาก Sketchfab ~31 MB) เป็นชิ้นส่วนที่มีชื่อ สำหรับหน้า /f1 (รถแยกชิ้น + โชว์รูมกดดูชิ้นส่วน)
//
// วิธีใช้:  node scripts/split-f1-parts.mjs <ต้นฉบับ.glb> <ผลลัพธ์.glb>
// เช่น     node scripts/split-f1-parts.mjs ~/Downloads/2026_redbull_rb22.glb public/models/f1/redbull-rb22-parts.glb
//
// ปัญหา: ไฟล์ต้นฉบับแบ่งก้อนตาม "วัสดุ" (คาร์บอน, สีตัวถัง, ยาง ...) ไม่ได้แบ่งตามชิ้นส่วนรถ
//        เช่น จมูกรถกับฝาครอบเครื่องเป็นสีเดียวกัน เลยอยู่ในก้อนเดียวกัน แยกออกจากกันตรงๆ ไม่ได้
// วิธีแก้ (ทำครั้งเดียวตอนเตรียมไฟล์ ไม่ได้ทำในเบราว์เซอร์):
//   1. ในแต่ละก้อน หา "ชิ้นที่แยกกันอยู่แล้ว" = กลุ่มสามเหลี่ยมที่ต่อกัน (connected components) เช่น ล้อ น็อต ปีก
//   2. ดูว่าชิ้นนั้นอยู่ตรงไหนของรถ แล้วจัดเข้าชิ้นส่วนที่มีชื่อ (ปีกหน้า ล้อหน้าซ้าย ฝาครอบเครื่อง ...)
//   3. ตัวถังผืนใหญ่ที่ต่อกันทั้งคัน ตัดทีละสามเหลี่ยมตามโซนบนตัวรถ (จมูก ไซด์พอด ฝาครอบเครื่อง ...)
//   4. เขียนไฟล์ใหม่: 1 ชิ้นส่วน = 1 node (ชื่อตาม PARTS) ตำแหน่งจุดยอดเป็นพิกัดจริงบนรถ → node อยู่ที่ (0,0,0) = ประกอบครบ
//      หน้าเว็บเลื่อน node ออกไป = แยกชิ้น / เลื่อนกลับมาที่ 0 = ประกอบกลับ
//   5. บีบไฟล์แบบเดียวกับไฟล์รถเดิม (texture WebP ไม่เกิน 2048 px + ลดรายละเอียดเล็กน้อย + meshopt) แต่ไม่รวมก้อน (join)
//      (ถ้ารวมก้อน ชิ้นส่วนที่แยกไว้จะกลับไปรวมกันตามวัสดุอีก / ตอนลดรายละเอียดล็อกจุดยอดที่ขอบไว้ รอยตัดจะได้ไม่เป็นร่อง)
//
// กฎตำแหน่งในไฟล์นี้วัดจากรถ Red Bull RB22 (หน่วยเมตร: x = ซ้าย/ขวา, y = ขึ้น, z = หน้า +/หลัง −)
// รถคันอื่นถูกยืด/หดให้เพลาล้อตรงกับ RB22 ก่อนใช้กฎ (ดู carFrame) → ใช้กฎชุดเดียวได้ทั้ง 3 คัน

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

// ชื่อชิ้นส่วน (= ชื่อ node ในไฟล์ผลลัพธ์) ต้องตรงกับ config/f1.ts
export const PARTS = [
  "front", // ปีกหน้าและจมูก
  "halo", // Halo (โครงกันกระแทกเหนือหัวคนขับ)
  "cockpit", // ห้องคนขับ พวงมาลัย เข็มขัด
  "chassis", // ตัวถังหลัก (survival cell)
  "sidepodL", // ไซด์พอดซ้าย (+ กระจกมองข้าง)
  "sidepodR", // ไซด์พอดขวา
  "cover", // ฝาครอบเครื่องและช่องรับลม (airbox)
  "pu", // เครื่องยนต์ (power unit)
  "floor", // พื้นรถและดิฟฟิวเซอร์
  "rear", // ปีกหลัง
  "suspF", // ช่วงล่างหน้า
  "suspR", // ช่วงล่างหลัง
  "wFL", // ล้อหน้าซ้าย
  "wFR", // ล้อหน้าขวา
  "wRL", // ล้อหลังซ้าย
  "wRR", // ล้อหลังขวา
];

// ตำแหน่งเพลาล้อของ RB22 (รถต้นแบบของกฎ)
const REF = { front: 1.701, rear: -1.701, track: 0.7555, hub: 0.323 };

// วัสดุของห้องคนขับ (พวงมาลัย จอ ไฟบนพวงมาลัย เข็มขัด) — ชื่อวัสดุต่างกันในแต่ละทีม
const COCKPIT_MATS =
  /steeringwheel|(^|_)sw(_|$|\.)|lcd|clearled|clared|kers_|black_s|cinture|plastic_interior|indicator_lights|rev_lights|whitelight/i;
// วัสดุยาง: ใช้หาตำแหน่งล้อทั้ง 4
const TYRE_MATS = /sidewall|tyre|tread/i;

// โซนบนตัวรถ สำหรับสามเหลี่ยมของตัวถังผืนใหญ่ (พิกัดหลังปรับให้เพลาตรงกับ RB22 แล้ว)
function regionOf(x, y, z) {
  const ax = Math.abs(x);
  if (z > 1.45) return "front";
  if (y < 0.16 || (z < -1.1 && y < 0.36)) return "floor";
  if (y > 0.8 && z > 0.1 && z < 1.3 && ax < 0.4) return "halo";
  if (z < -1.85 && y > 0.5) return "rear";
  if (z < 0.15 && y > 0.5 && ax < 0.36) return "cover";
  if (ax >= 0.3 && z > -1.3 && z < 1.0) return x < 0 ? "sidepodL" : "sidepodR";
  return "chassis";
}

// ชิ้นเล็กที่แยกกันอยู่แล้ว: ตัดสินจากวัสดุ + จุดกึ่งกลาง (c) + ขนาด (s) ของชิ้น
function partOf(mat, c, s) {
  const ax = Math.abs(c.x);
  const az = Math.abs(c.z);
  const big = Math.max(s.x, s.y, s.z);
  if (COCKPIT_MATS.test(mat)) return "cockpit";
  // ล้อ: อยู่ข้างตัวรถ ระดับดุมล้อ ใกล้เพลา และไม่ใหญ่กว่าล้อ
  if (ax > 0.5 && Math.abs(c.y - 0.32) < 0.32 && Math.abs(az - 1.7) < 0.4 && big < 0.8)
    return (c.z > 0 ? "wF" : "wR") + (c.x < 0 ? "L" : "R");
  if (c.z > 2.1 && c.y < 0.55) return "front";
  if (c.z < -1.85 && c.y > 0.5) return "rear";
  if (c.y < 0.16 || (c.z < -1.1 && c.y < 0.36 && ax < 0.65)) return "floor";
  // กระจกมองข้าง → ไปกับไซด์พอดฝั่งเดียวกัน
  if (ax > 0.55 && c.y > 0.62 && c.y < 0.82 && c.z > 0.5 && c.z < 0.85) return c.x < 0 ? "sidepodL" : "sidepodR";
  // ปีกนก/ก้านช่วงล่าง: ระหว่างตัวรถกับล้อ ใกล้เพลา
  if (ax > 0.15 && ax < 0.8 && c.y > 0.1 && c.y < 0.62 && Math.abs(az - 1.7) < 0.6) return c.z > 0 ? "suspF" : "suspR";
  if (ax < 0.36 && c.y > 0.6 && c.z < 0.2 && c.z > -1.85) return "cover";
  // ของที่อยู่ข้างในตัวถังช่วงหลังห้องคนขับ = เครื่องยนต์ ระบบระบายความร้อน
  if (ax < 0.45 && c.y > 0.12 && c.y < 0.7 && c.z > -1.6 && c.z < 0.4) return "pu";
  return regionOf(c.x, c.y, c.z);
}

// ---------- คณิตศาสตร์เล็กๆ (เมทริกซ์ 4×4 แบบ column-major ตาม glTF) ----------
const applyPoint = (m, v, out) => {
  const [x, y, z] = v;
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
  return out;
};
const applyDir = (n, v, out) => {
  const [x, y, z] = v;
  out[0] = n[0] * x + n[3] * y + n[6] * z;
  out[1] = n[1] * x + n[4] * y + n[7] * z;
  out[2] = n[2] * x + n[5] * y + n[8] * z;
  const l = Math.hypot(out[0], out[1], out[2]) || 1;
  out[0] /= l;
  out[1] /= l;
  out[2] /= l;
  return out;
};
// เมทริกซ์ 3×3 ส่วนหมุน/ย่อขยาย และ inverse-transpose ของมัน (ใช้หมุนเวกเตอร์ปกติของผิว)
function linearParts(m) {
  const a = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]];
  const [a00, a01, a02, a10, a11, a12, a20, a21, a22] = a;
  const det = a00 * (a11 * a22 - a12 * a21) - a10 * (a01 * a22 - a02 * a21) + a20 * (a01 * a12 - a02 * a11);
  const inv = [
    (a11 * a22 - a12 * a21) / det,
    (a02 * a21 - a01 * a22) / det,
    (a01 * a12 - a02 * a11) / det,
    (a12 * a20 - a10 * a22) / det,
    (a00 * a22 - a02 * a20) / det,
    (a02 * a10 - a00 * a12) / det,
    (a10 * a21 - a11 * a20) / det,
    (a01 * a20 - a00 * a21) / det,
    (a00 * a11 - a01 * a10) / det,
  ];
  // transpose ของ inverse
  const normal = [inv[0], inv[3], inv[6], inv[1], inv[4], inv[7], inv[2], inv[5], inv[8]];
  return { linear: a, normal, det };
}

// ---------- อ่านไฟล์ ----------
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/split-f1-parts.mjs <input.glb> <output.glb>");
  process.exit(1);
}
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(input);
const root = doc.getRoot();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
const buffer = root.listBuffers()[0];

// ทุก primitive ในไฟล์ พร้อมพิกัดจุดยอดบนรถจริง (world space)
const oldNodes = root.listNodes();
const prims = [];
for (const node of oldNodes) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 4) continue; // เอาเฉพาะสามเหลี่ยม
    const pos = prim.getAttribute("POSITION");
    const world = new Float32Array(pos.getCount() * 3);
    const v = [0, 0, 0];
    const w = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) {
      applyPoint(m, pos.getElement(i, v), w);
      world.set(w, i * 3);
    }
    const ind = prim.getIndices();
    const idx = ind ? Uint32Array.from(ind.getArray()) : Uint32Array.from({ length: pos.getCount() }, (_, i) => i);
    prims.push({ prim, matrix: m, world, idx, mat: prim.getMaterial()?.getName() ?? "" });
  }
}

// ---------- ตำแหน่งเพลาล้อของรถคันนี้ → ฟังก์ชันแปลงพิกัดให้ตรงกับ RB22 ----------
function carFrame() {
  const q = { FL: [], FR: [], RL: [], RR: [] };
  for (const p of prims) {
    if (!TYRE_MATS.test(p.mat)) continue;
    for (let i = 0; i < p.world.length; i += 3) {
      const x = p.world[i];
      const z = p.world[i + 2];
      q[(z > 0 ? "F" : "R") + (x < 0 ? "L" : "R")].push([x, p.world[i + 1], z]);
    }
  }
  // จุดกึ่งกลางกล่องของยางแต่ละล้อ = จุดกึ่งกลางล้อ
  const centre = (pts) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k]);
        hi[k] = Math.max(hi[k], p[k]);
      }
    }
    return lo.map((l, k) => (l + hi[k]) / 2);
  };
  const c = Object.fromEntries(Object.entries(q).map(([k, pts]) => [k, centre(pts)]));
  const front = (c.FL[2] + c.FR[2]) / 2;
  const rear = (c.RL[2] + c.RR[2]) / 2;
  const track = (Math.abs(c.FL[0]) + Math.abs(c.FR[0]) + Math.abs(c.RL[0]) + Math.abs(c.RR[0])) / 4;
  const hub = (c.FL[1] + c.FR[1] + c.RL[1] + c.RR[1]) / 4;
  console.log(`axles: front z=${front.toFixed(3)} rear z=${rear.toFixed(3)} track=${track.toFixed(3)} hub=${hub.toFixed(3)}`);
  const kz = (REF.front - REF.rear) / (front - rear);
  return (x, y, z) => ({ x: (x * REF.track) / track, y: (y * REF.hub) / hub, z: REF.rear + (z - rear) * kz });
}
const toRef = carFrame();

// ---------- แบ่งสามเหลี่ยมทุกตัวเข้าชิ้นส่วน ----------
// ผล: Map "ชิ้นส่วน|ลำดับ primitive" → รายการสามเหลี่ยม (ตำแหน่งเริ่มของสามเหลี่ยมใน idx)
const partTris = new Map();
const add = (part, pi, t) => {
  const k = `${part}|${pi}`;
  if (!partTris.has(k)) partTris.set(k, []);
  partTris.get(k).push(t);
};

prims.forEach((p, pi) => {
  const { world, idx } = p;
  const n = world.length / 3;
  // เชื่อมจุดยอดที่อยู่ตำแหน่งเดียวกัน (ไฟล์มักแยกจุดยอดตรงรอยต่อ UV) ละเอียด 0.2 มม.
  const weld = new Int32Array(n);
  const keys = new Map();
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(world[i * 3] * 5000)},${Math.round(world[i * 3 + 1] * 5000)},${Math.round(world[i * 3 + 2] * 5000)}`;
    let id = keys.get(k);
    if (id === undefined) keys.set(k, (id = keys.size));
    weld[i] = id;
  }
  // union-find: สามเหลี่ยมที่ใช้จุดยอดร่วมกัน = ชิ้นเดียวกัน
  const parent = Int32Array.from({ length: keys.size }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let t = 0; t < idx.length; t += 3) {
    const a = find(weld[idx[t]]);
    for (const b0 of [weld[idx[t + 1]], weld[idx[t + 2]]]) {
      const b = find(b0);
      if (a !== b) parent[b] = a;
    }
  }
  const comps = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = find(weld[idx[t]]);
    let c = comps.get(r);
    if (!c) comps.set(r, (c = { tris: [], lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }));
    c.tris.push(t);
    for (let k = 0; k < 3; k++) {
      const i = idx[t + k] * 3;
      for (let a = 0; a < 3; a++) {
        c.lo[a] = Math.min(c.lo[a], world[i + a]);
        c.hi[a] = Math.max(c.hi[a], world[i + a]);
      }
    }
  }

  for (const c of comps.values()) {
    const size = { x: c.hi[0] - c.lo[0], y: c.hi[1] - c.lo[1], z: c.hi[2] - c.lo[2] };
    // ตัวถังผืนใหญ่ (สามเหลี่ยมเยอะ + ยาวเกิน 1.2 ม.) → ตัดทีละสามเหลี่ยมตามโซน
    if (c.tris.length > 2500 && Math.max(size.x, size.y, size.z) > 1.2) {
      for (const t of c.tris) {
        let x = 0;
        let y = 0;
        let z = 0;
        for (let k = 0; k < 3; k++) {
          const i = idx[t + k] * 3;
          x += world[i] / 3;
          y += world[i + 1] / 3;
          z += world[i + 2] / 3;
        }
        const r = toRef(x, y, z);
        add(regionOf(r.x, r.y, r.z), pi, t);
      }
      continue;
    }
    const ref = toRef((c.lo[0] + c.hi[0]) / 2, (c.lo[1] + c.hi[1]) / 2, (c.lo[2] + c.hi[2]) / 2);
    const s = toRef(size.x, size.y, 0); // ขนาดแนวกว้าง/สูงปรับตามสัดส่วนรถ (แนวยาวใช้ค่าจริง)
    const part = partOf(p.mat, ref, { x: Math.abs(s.x), y: Math.abs(s.y), z: size.z });
    for (const t of c.tris) add(part, pi, t);
  }
});

// ---------- สร้าง node ใหม่ 1 ชิ้นส่วน = 1 node ----------
const stats = {};
const meshes = new Map(PARTS.map((part) => [part, doc.createMesh(part)]));
for (const [key, tris] of partTris) {
  const [part, pi] = key.split("|");
  const { prim, matrix, idx } = prims[+pi];
  const { linear, normal, det } = linearParts(matrix);
  const flip = det < 0; // เมทริกซ์กลับด้าน (mirror) → สลับลำดับจุดยอดให้หน้าผิวหันออกเหมือนเดิม
  // ใช้เฉพาะจุดยอดที่สามเหลี่ยมของชิ้นนี้ใช้ แล้วเรียงเลขใหม่
  const count = prim.getAttribute("POSITION").getCount();
  const remap = new Int32Array(count).fill(-1);
  const used = [];
  const outIdx = new Uint32Array(tris.length * 3);
  tris.forEach((t, j) => {
    const order = flip ? [0, 2, 1] : [0, 1, 2];
    order.forEach((k, o) => {
      const vi = idx[t + k];
      if (remap[vi] < 0) {
        remap[vi] = used.length;
        used.push(vi);
      }
      outIdx[j * 3 + o] = remap[vi];
    });
  });

  const out = doc.createPrimitive().setMaterial(prim.getMaterial());
  for (const semantic of prim.listSemantics()) {
    const acc = prim.getAttribute(semantic);
    const size = acc.getElementSize();
    const el = new Array(size).fill(0);
    const tmp = [0, 0, 0];
    let arr;
    if (semantic === "POSITION" || semantic === "NORMAL" || semantic === "TANGENT") {
      // ย้ายเข้าพิกัดจริงบนรถ (node ใหม่ไม่มีการหมุน/ย่อขยาย)
      arr = new Float32Array(used.length * size);
      used.forEach((vi, i) => {
        acc.getElement(vi, el);
        if (semantic === "POSITION") applyPoint(matrix, el, tmp);
        else applyDir(semantic === "NORMAL" ? normal : linear, el, tmp);
        arr.set(tmp, i * size);
        if (semantic === "TANGENT") arr[i * size + 3] = flip ? -el[3] : el[3];
      });
    } else {
      // UV / สี: คัดลอกตามเดิม (ชนิดข้อมูลเดิม)
      const src = acc.getArray();
      arr = new src.constructor(used.length * size);
      used.forEach((vi, i) => arr.set(src.subarray(vi * size, vi * size + size), i * size));
    }
    const a = doc
      .createAccessor()
      .setType(acc.getType())
      .setArray(arr)
      .setNormalized(semantic.startsWith("POSITION") ? false : acc.getNormalized())
      .setBuffer(buffer);
    out.setAttribute(semantic, a);
  }
  const ia = used.length < 65536 ? Uint16Array.from(outIdx) : outIdx;
  out.setIndices(doc.createAccessor().setType("SCALAR").setArray(ia).setBuffer(buffer));
  meshes.get(part).addPrimitive(out);
  stats[part] = (stats[part] ?? 0) + tris.length;
}

// แทนที่ node เดิมทั้งหมดด้วย node ชิ้นส่วน (ชื่อ node = ชื่อชิ้นส่วน)
for (const node of oldNodes) node.dispose();
for (const part of PARTS) {
  const mesh = meshes.get(part);
  if (mesh.listPrimitives().length) scene.addChild(doc.createNode(part).setMesh(mesh));
  else console.warn(`warning: part "${part}" is empty`);
}
// ตอนแยกชิ้น จะเห็นด้านในของตัวถัง → ให้ทุกวัสดุแสดงผลทั้ง 2 ด้าน (ไม่งั้นด้านในจะโปร่งเป็นรู)
for (const mat of root.listMaterials()) mat.setDoubleSided(true);

// ---------- บีบไฟล์ แล้วบันทึก ----------
await doc.transform(
  prune(),
  dedup(),
  weld(),
  // ลดจำนวนสามเหลี่ยมแบบแทบมองไม่ออก (คลาดได้ไม่เกิน 0.01% ของขนาดชิ้น) — lockBorder: ห้ามขยับจุดยอดที่ขอบ (รอยตัด)
  simplify({ simplifier: MeshoptSimplifier, ratio: 0, error: 0.0001, lockBorder: true }),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [2048, 2048] }),
  meshopt({ encoder: MeshoptEncoder, level: "medium" }),
);
await io.write(output, doc);

const total = Object.values(stats).reduce((a, b) => a + b, 0);
console.log(`parts (triangles): ${JSON.stringify(stats)}`);
console.log(`total triangles ${total}, primitives ${partTris.size} → ${output}`);
