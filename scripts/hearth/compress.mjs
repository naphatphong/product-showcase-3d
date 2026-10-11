// ขั้นที่ 4: บีบโมเดลห้อง HEARTH ที่ส่งออกจาก Blender ให้เล็กพอโหลดบนเว็บ
//   - แสงที่อบไว้ต่อจุดยอด (_BAKE_DAY / _BAKE_NIGHT) → 8 บิตต่อสี
//   - ข้อมูลซ้ำใช้ร่วมกัน (dedup) ทิ้งของที่ไม่มีใครใช้ (prune) แต่เก็บข้อมูลแนบ extras (role/zone/kind ของชิ้นทัวร์) ไว้
//   - รูปพื้นผิวเป็น WebP ย่อไม่เกิน 1024 px (พื้นไม้ พื้นหินอ่อน หินอ่อนลายทอง 2048 px เพราะเห็นใกล้และกินพื้นที่จอมาก)
//   - ตัวเลขตำแหน่ง/ทิศ/พิกัดรูป ลดความละเอียดลง (quantize) แล้วบีบแบบ meshopt (drei ถอดให้เองตอนโหลด)
//
// วิธีใช้:  node scripts/hearth/compress.mjs <hearth-export.glb> <ผลลัพธ์.glb> [ขนาดรูปสูงสุด=1024]
// เช่น     node scripts/hearth/compress.mjs work/hearth-export.glb public/models/house/hearth.glb
//          node scripts/hearth/compress.mjs work/hearth-lite-export.glb public/models/house/hearth-lite.glb 512
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, reorder, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const [src, out, maxTex = '1024'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
// แสงที่อบต่อจุดยอด (_BAKE_DAY / _BAKE_NIGHT เก็บเป็น แสง/4 ช่วง 0..1): เหลือ 8 บิตต่อสี เก็บเป็น "รากที่สอง" ของค่า
// มุมมืดจะได้ระดับสีละเอียดพอ ไม่เป็นขั้นบันได (หน้าเว็บยกกำลังสองกลับ) เก็บ rgb + 1 ไบต์ว่าง ให้ข้อมูลเรียงตรง 4 ไบต์
function bake8() {
  return (document) => {
    const done = new Map();
    for (const mesh of document.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) for (const name of ['_BAKE_DAY', '_BAKE_NIGHT']) {
      const a = prim.getAttribute(name); if (!a) continue;
      if (!done.has(a)) {
        const n = a.getCount(), out = new Uint8Array(n * 4), el = [];
        for (let i = 0; i < n; i++) { a.getElement(i, el); for (let k = 0; k < 3; k++) out[i * 4 + k] = Math.round(Math.sqrt(Math.min(1, Math.max(0, el[k]))) * 255); out[i * 4 + 3] = 255; }
        done.set(a, document.createAccessor(a.getName()).setType('VEC4').setArray(out).setNormalized(true).setBuffer(a.getBuffer()));
      }
      prim.setAttribute(name, done.get(a));
    }
  };
}
const BIG = /xmppmax_v1_13_7_2_d|son zeminim|d3815/;   // รูปพื้นไม้ พื้นหินอ่อน หินอ่อนลายทอง เก็บความละเอียดมากกว่า
await doc.transform(
  bake8(),
  dedup({ propertyTypes: ['Accessor', 'Mesh', 'Texture'] }),
  prune({ keepExtras: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, resize: [+maxTex, +maxTex], pattern: new RegExp(`^(?!.*(${BIG.source})).*$`) }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [+maxTex * 2, +maxTex * 2], pattern: BIG }),
  reorder({ encoder: MeshoptEncoder }),
  // _BAKE_* เป็น 8 บิตแล้ว ไม่ต้อง quantize ซ้ำ
  quantize({ quantizeTexcoord: 14, quantizeNormal: 10, quantizeGeneric: 14, pattern: /^(?!_BAKE_)/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(out, doc);
console.log(out);
