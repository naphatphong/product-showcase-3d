// ย่อโมเดลบ้าน (ไฟล์ต้นฉบับจาก 3ds Max ~785 MB, 18.6 ล้านสามเหลี่ยม) ให้เล็กพอใช้บนเว็บ
//
// วิธีใช้:  node scripts/build-house.mjs <ต้นฉบับ.glb> <ผลลัพธ์.glb> <รูปความโปร่งของใบไม้.jpg> [ring|tour]
// เช่น     node scripts/build-house.mjs house.glb public/models/house/villa-ring.glb "Export Texture/beech leaf_op.jpg" ring
//          node scripts/build-house.mjs house.glb public/models/house/villa-tour.glb "Export Texture/beech leaf_op.jpg" tour
//
// ต้นฉบับเป็น .fbx → แปลงเป็น .glb ก่อนด้วย FBX2glTF (npm i fbx2gltf):
//          FBX2glTF --binary --input Export.fbx --output house
//
// ทำได้ 2 ขนาด (PROFILES ด้านล่าง):
//   ring = ตัวเล็กสำหรับลอยบนวงแหวนหน้าแรก (เห็นบนจอแค่ราว 1/3 ของความกว้างจอ) ~6.5 MB
//   tour = ตัวละเอียดสำหรับหน้าเว็บบ้าน (ภาพ วิดีโอ และเดินชมบ้าน) เก็บเฟอร์นิเจอร์ ใบไม้เยอะกว่า รูปพื้นผิว 2048 px
// ขั้นตอน (ตัวเลขของแต่ละขนาดอยู่ใน PROFILES):
//   1. (ตัวเล็ก) ทิ้งเฟอร์นิเจอร์ในบ้าน (โซฟา เตียงอาบแดด กาน้ำ ...) — มองจากไกลไม่เห็น แต่กินสามเหลี่ยมเกือบ 4 แสน
//   2. ลดรายละเอียด: ต้นไม้/ไม้เลื้อย/รั้วไม้ระแนง เป็นก้อนสามเหลี่ยมหนาแน่นที่สุด ลดได้มาก มองไกลยังเป็นทรงพุ่มเหมือนเดิม
//   3. แก้วัสดุ: ไฟล์จาก 3ds Max (V-Ray) แปลงมาเป็นโลหะ 40% ทุกชิ้น + มีสีประจำจุดยอด (COLOR_0) สีเทาเข้ม
//      ทำให้คอนกรีตกับใบไม้ดูมืดและมันวาว → ปรับเป็นวัสดุด้าน (ไม่ใช่โลหะ) และลบสีประจำจุดยอดทิ้ง
//      ใบไม้: ในไฟล์เป็นแผ่นสี่เหลี่ยมที่มีรูปใบไม้บนพื้นสีเขียวขี้ม้า ส่วนรูป "ความโปร่ง" (ขาว = ใบ, ดำ = ทะลุ)
//      หลุดไปตอนแปลง FBX → เอารูปนั้นมาใส่เป็นช่อง alpha ใบไม้จึงกลับมาเป็นรูปใบจริง
//   4. รูปพื้นผิวย่อเหลือไม่เกิน 1024 px (ตัวละเอียด 2048) แปลงเป็น WebP (รูปดินต้นฉบับ 8192 px ใหญ่ 64 MB)
//   5. บีบไฟล์แบบ meshopt (drei ถอดให้เองตอนโหลด เหมือนโมเดลรถ)

import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { compactPrimitive, dedup, meshopt, prune, simplifyPrimitive, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const [src, out, leafOpacity, profileName = "ring"] = process.argv.slice(2);

// ตัวเลขของแต่ละขนาด
//   furniture: เก็บเฟอร์นิเจอร์ไหม (false) หรือ [ratio, error] ของการลดรายละเอียดเฟอร์นิเจอร์
//              (โซฟาบุนวมในไฟล์ละเอียดมาก 2 ตัวรวมกัน 4 ล้านสามเหลี่ยม ลดได้เยอะโดยมองไม่ออก) / leaves: [เก็บใบไว้กี่ส่วน, ขยายใบที่เหลือกี่เท่า]
//   foliage / rest: [ratio, error] ของการลดรายละเอียด (กิ่งไม้/ไม้เลื้อย และส่วนอื่นทั้งหมด) / texture: ขนาดรูปสูงสุด (px)
const PROFILES = {
  ring: { furniture: false, leaves: [0.04, 3.0], foliage: [0.03, 0.05], rest: [0.1, 0.01], texture: 1024 },
  tour: { furniture: [0.04, 0.004], leaves: [0.22, 1.6], foliage: [0.15, 0.01], rest: [0.35, 0.002], texture: 2048 },
};
const profile = PROFILES[profileName];
if (!src || !out || !leafOpacity || !profile) {
  console.error("ใช้: node scripts/build-house.mjs <ต้นฉบับ.glb> <ผลลัพธ์.glb> <รูปความโปร่งของใบไม้.jpg> [ring|tour]");
  process.exit(1);
}

// ชื่อชิ้นเฟอร์นิเจอร์ในบ้าน (ตามชื่อ node ในไฟล์ต้นฉบับ) — ตัดออกทั้งหมดในตัวเล็ก
const FURNITURE = /minotti|sofa|plaid|sunbed|legs|lamp|^base|dish|ketle|cup|tray|marble|^frame/i;
// ต้นไม้ พุ่มไม้ ไม้เลื้อย — ลดรายละเอียดแรงที่สุด
const FOLIAGE = /prunus|crataegus|ivy/i;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(src);
const root = doc.getRoot();
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);

const tris = () =>
  root
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((t, p) => t + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);
console.log("ต้นฉบับ", Math.round(tris()).toLocaleString(), "สามเหลี่ยม");

// 1. ทิ้งเฟอร์นิเจอร์ (เฉพาะตัวเล็ก)
if (!profile.furniture) for (const n of root.listNodes()) if (FURNITURE.test(n.getName().trim())) n.dispose();

// 2. ลดรายละเอียด
//    ต้นไม้ในไฟล์นี้ปั้นใบทีละใบ (ต้นหนึ่งมี 3.5 หมื่นใบ ใบละ ~5 สามเหลี่ยม) ใบแยกกันเป็นชิ้นเล็กๆ ลดรายละเอียดแบบปกติไม่ได้
//    (ตัวลดรายละเอียดยุบได้แค่ภายในชิ้น ใบหนึ่งยุบต่อไม่ได้แล้ว) → ใช้วิธี "เก็บใบไว้บางส่วน แล้วขยายใบที่เหลือ"
//    มองจากไกลพุ่มยังทึบเท่าเดิม แต่จำนวนสามเหลี่ยมลดตามสัดส่วนที่เก็บไว้
//    ส่วนอื่น (ตัวบ้าน ผนัง รั้ว กิ่งไม้) ลดรายละเอียดแบบปกติ: ratio = เก็บสามเหลี่ยมไว้กี่ส่วน, error = ยอมเพี้ยนได้กี่ส่วนของขนาดชิ้น
await doc.transform(dedup(), weld()); // dedup = ต้นไม้ที่ซ้ำกันใช้ข้อมูลชุดเดียว, weld = รวมจุดยอดที่ซ้อนกัน (ต้องทำก่อนลดรายละเอียด)

// ชิ้นที่ต่อกัน (connected components): จุดยอดที่อยู่ในสามเหลี่ยมเดียวกันถือว่าต่อกัน (union-find)
function components(index, count) {
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (let i = 0; i < index.length; i += 3) {
    const a = find(index[i]);
    parent[find(index[i + 1])] = a;
    parent[find(index[i + 2])] = a;
  }
  return find;
}

// เก็บใบไว้ keep ส่วน (สุ่มแบบเดิมทุกครั้งที่รัน) แล้วขยายใบที่เหลือ grow เท่ารอบจุดกลางของใบ
function thinLeaves(prim, keep, grow) {
  const index = prim.getIndices().getArray();
  const pos = prim.getAttribute("POSITION");
  const p = pos.getArray().slice();
  const find = components(index, pos.getCount());
  const kept = (root) => ((root * 2654435761) >>> 0) / 2 ** 32 < keep; // สุ่มจากเลขชิ้น: ได้ผลเดิมทุกครั้ง
  // จุดกลางของแต่ละใบ
  const sum = new Map();
  for (let v = 0; v < pos.getCount(); v++) {
    const r = find(v);
    const s = sum.get(r) ?? [0, 0, 0, 0];
    s[0] += p[v * 3];
    s[1] += p[v * 3 + 1];
    s[2] += p[v * 3 + 2];
    s[3]++;
    sum.set(r, s);
  }
  for (let v = 0; v < pos.getCount(); v++) {
    const s = sum.get(find(v));
    for (let k = 0; k < 3; k++) p[v * 3 + k] = s[k] / s[3] + (p[v * 3 + k] - s[k] / s[3]) * grow;
  }
  pos.setArray(p);
  const out = [];
  for (let i = 0; i < index.length; i += 3) if (kept(find(index[i]))) out.push(index[i], index[i + 1], index[i + 2]);
  prim.getIndices().setArray(new Uint32Array(out));
  compactPrimitive(prim); // ทิ้งจุดยอดของใบที่ไม่ได้เก็บ
}

// บางชิ้น (รั้วไม้ระแนง ก้านไม้เลื้อย) สามเหลี่ยมทุกอันมีจุดยอดของตัวเอง ไม่ต่อกันเลย ลดรายละเอียดไม่ได้
// → ต่อจุดยอดที่ตำแหน่งเดียวกันเข้าด้วยกัน (ไม่สนว่า UV ต่างกันไหม ขอบลายผิวอาจเพี้ยนนิดหน่อย มองไกลไม่เห็น)
function weldByPosition(prim) {
  const index = prim.getIndices().getArray();
  const pos = prim.getAttribute("POSITION");
  // ชิ้นเล็ก (กล่อง ผนังเรียบ) ไม่ต้องลด และถ้าต่อจุดยอด ลายผิวจะเพี้ยน / ชิ้นที่ต่อกันดีอยู่แล้วก็ข้าม
  if (index.length / 3 < 5000 || pos.getCount() < (index.length / 3) * 1.5) return;
  const p = pos.getArray();
  const first = new Map();
  const remap = new Uint32Array(pos.getCount());
  for (let v = 0; v < pos.getCount(); v++) {
    const key = `${p[v * 3].toFixed(4)},${p[v * 3 + 1].toFixed(4)},${p[v * 3 + 2].toFixed(4)}`;
    if (!first.has(key)) first.set(key, v);
    remap[v] = first.get(key);
  }
  prim.getIndices().setArray(Uint32Array.from(index, (v) => remap[v]));
  compactPrimitive(prim);
}

// ทำกับทุก mesh ที่ชื่อ node ตรงกับ test (mesh ที่ใช้ซ้ำหลาย node ทำครั้งเดียว)
function eachPrimitive(test, fn) {
  const meshes = new Set(root.listNodes().filter((n) => n.getMesh() && test(n.getName())).map((n) => n.getMesh()));
  for (const mesh of meshes) for (const prim of mesh.listPrimitives()) fn(prim);
}
const LEAF = /leaf|#189|#191/i; // วัสดุใบไม้ (ไม้เลื้อยกับพุ่มไม้ใช้รูปใบเดียวกับต้นไม้)
eachPrimitive(
  (name) => FOLIAGE.test(name),
  (prim) => {
    if (LEAF.test(prim.getMaterial()?.getName() ?? "")) return thinLeaves(prim, ...profile.leaves);
    weldByPosition(prim);
    const [ratio, error] = profile.foliage;
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error, lockBorder: false });
  },
);
if (profile.furniture)
  eachPrimitive(
    (name) => FURNITURE.test(name.trim()),
    (prim) => {
      weldByPosition(prim);
      const [ratio, error] = profile.furniture;
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error, lockBorder: false });
    },
  );
eachPrimitive(
  // ตัวละเอียด: เฟอร์นิเจอร์ลดแยกไปแล้วข้างบน / ตัวเล็ก: เหมือนเดิมทุกอย่าง (ตัวเล็กใน Step 59 ได้ไฟล์เดิม)
  (name) => !FOLIAGE.test(name) && !(profile.furniture && FURNITURE.test(name.trim())),
  (prim) => {
    weldByPosition(prim);
    const [ratio, error] = profile.rest;
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error, lockBorder: false });
  },
);

// 3. วัสดุด้าน: ไม่ใช่โลหะ, ผิวหยาบ, ไม่มีสีประจำจุดยอด
for (const m of root.listMaterials()) {
  m.setMetallicFactor(0);
  m.setRoughnessFactor(0.92);
}
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) prim.setAttribute("COLOR_0", null);

// ใบไม้: รวมรูปใบ (RGB) กับรูปความโปร่ง (ขาวดำ) เป็นรูปเดียวแบบมี alpha
// MASK = ตัดขอบคม (ไม่ต้องเรียงลำดับวาดแบบโปร่งแสงจริง เร็วกว่า), doubleSided = เห็นใบทั้งสองด้าน
const leafMats = root.listMaterials().filter((m) => LEAF.test(m.getName()));
const leafTex = leafMats[0]?.getBaseColorTexture();
if (leafTex) {
  const rgb = sharp(Buffer.from(leafTex.getImage()));
  const { width, height } = await rgb.metadata();
  const alpha = await sharp(leafOpacity).resize(width, height).greyscale().raw().toBuffer();
  const png = await rgb.removeAlpha().joinChannel(alpha, { raw: { width, height, channels: 1 } }).png().toBuffer();
  leafTex.setImage(new Uint8Array(png)).setMimeType("image/png");
  for (const m of leafMats) m.setBaseColorTexture(leafTex).setAlphaMode("MASK").setAlphaCutoff(0.5).setDoubleSided(true);
}

// 4-5. ย่อรูป + บีบไฟล์ (ไม่รวมก้อน: ต้นไม้ 10 ต้นใช้ข้อมูลชุดเดียวกัน ถ้ารวมก้อนจะกลายเป็น 10 ชุด ไฟล์ใหญ่ขึ้น)
await doc.transform(
  prune(),
  textureCompress({ encoder: sharp, targetFormat: "webp", resize: [profile.texture, profile.texture], quality: 80 }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);

console.log("ผลลัพธ์", Math.round(tris()).toLocaleString(), "สามเหลี่ยม");
await io.write(out, doc);
