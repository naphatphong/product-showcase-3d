// ขั้นที่ 0.1: ย่อไฟล์ VH ดิบ (แปลงจาก FBX แล้ว ~16 ล้านสามเหลี่ยม) ให้ Blender เปิดไหว
//   - ข้อมูลซ้ำใช้ร่วมกัน + เชื่อมจุดยอดที่ซ้อนกัน (weld)
//   - ชิ้นที่หนาแน่น (เกิน 5,000 สามเหลี่ยม) ลดรายละเอียดตาม ratio โดยยอมให้ผิดรูปไม่เกิน error (สัดส่วนของขนาดชิ้น)
//     ชิ้นที่เป็น "สามเหลี่ยมกระจัดกระจาย" (ไม่มีจุดยอดร่วมเลย) เชื่อมตามตำแหน่งก่อน ไม่งั้นลดไม่ได้
//   - ลบสีประจำจุดยอด (COLOR_0) ที่ติดมาจาก 3ds Max (ทำให้ทุกอย่างหม่นเทา)
//
// วิธีใช้:  [RAW=1] node --max-old-space-size=14000 scripts/hearth/reduce.mjs <vh.glb> <ผลลัพธ์.glb> [ratio=0.25] [error=0.002]
// เช่น     RAW=1 node --max-old-space-size=14000 scripts/hearth/reduce.mjs work/vh.glb work/vh-raw.glb 0.5 0.001
//   RAW=1 = ไม่บีบ meshopt (Blender เปิดไฟล์ที่บีบแบบ meshopt ไม่ได้)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, meshopt, prune, simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
const [src, out, ratio = '0.25', error = '0.002'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src); const root = doc.getRoot();
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
const tris = () => root.listMeshes().flatMap(m => m.listPrimitives()).reduce((t, p) => t + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0);
console.log('in', Math.round(tris()));
await doc.transform(dedup({ propertyTypes: ['Accessor', 'Mesh', 'Texture'] }), weld());
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const index = prim.getIndices(); if (!index || index.getCount() / 3 < 5000) continue;
  const pos = prim.getAttribute('POSITION'); const p = pos.getArray(); const ia = index.getArray();
  if (pos.getCount() >= (ia.length / 3) * 1.5) { // สามเหลี่ยมกระจัดกระจาย: จุดที่ตำแหน่งเดียวกัน (ปัด 0.1 มม.) ให้เป็นจุดเดียว
    const first = new Map(); const remap = new Uint32Array(pos.getCount());
    for (let v = 0; v < pos.getCount(); v++) { const k = `${p[v*3].toFixed(4)},${p[v*3+1].toFixed(4)},${p[v*3+2].toFixed(4)}`; if (!first.has(k)) first.set(k, v); remap[v] = first.get(k); }
    index.setArray(Uint32Array.from(ia, v => remap[v])); compactPrimitive(prim);
  }
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: +ratio, error: +error, lockBorder: false });
}
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) prim.setAttribute('COLOR_0', null);
await doc.transform(prune({ keepLeaves: true }), ...(process.env.RAW ? [] : [meshopt({ encoder: MeshoptEncoder, level: 'high' })]));
console.log('out', Math.round(tris()));
await io.write(out, doc);
