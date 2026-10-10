// ขั้นที่ 0.2: ใส่รูปพื้นผิวกลับให้วัสดุของ VH (ตอนแปลง FBX → glb รูปหลุดหมด ไฟล์ FBX ไม่ได้แนบรูปมา)
// รูปอยู่ในไฟล์ดาวน์โหลดเวอร์ชัน 3ds Max (VH (MAX15)) จับคู่ "ชื่อวัสดุ → ชื่อรูป" ตามที่ไฟล์ FBX เองบอกไว้
// (อ่านด้วย fbx-textures.py) รูปย่อไม่เกิน 2048 px เป็น JPEG
//   - กระจกเงา/รูปบนจอทีวี/ไฟเตาผิง ใส่เป็นแสงเรือง (emissive) ด้วย
//   - ขนนกของโคมระย้า: รูปขาวดำ O1-O3 เป็นรูปความโปร่ง (ขาว = ขน ดำ = ทะลุ) → ช่อง alpha
//
// วิธีใช้:  node --max-old-space-size=8000 scripts/hearth/attach-textures.mjs <vh-raw.glb> <vh-raw-tex.glb> <โฟลเดอร์รูป>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRTextureTransform } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const [src, out, dir] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src); const root = doc.getRoot();
const tt = doc.createExtension(KHRTextureTransform);
const RULES = [ // [ชื่อวัสดุ (regex), ไฟล์รูป, {emissive = ใส่เป็นแสงเรืองด้วย}]
  ['^Material #2147474173$', 'son zeminim.jpg'],                         // หินอ่อนพื้น/ผนัง
  ['^Material #2147474291$', 'halı son.jpg'],                            // พรม
  ['^Material #2147474343$', '21db47abde8ae71266c7a6ee9e758499.jpg'],
  ['^Material #2147473862$', 'jeshua-sharkey-tS_aLD60nz0-unsplash.jpg', { emissive: 1 }],   // วิวนอกหน้าต่าง
  ['^Material #2147474174$', 'd3815cadf0a39d4bcdd27b23065a4e6d.jpg'],    // หินอ่อนลายทอง
  ['^Material #2147473218$', '94f8fb65fad6e98593bb32d8f06b74f3.jpg'],
  ['^Material #2147474168$', 'Screenshot_50.png'],
  ['^Tree$', 'Tree_texture.jpg'],
  ['^Ball$', 'Decals_texture.jpg'],                                      // ลูกบอลประดับต้นคริสต์มาส
  ['^Kronco - fire 2$', 'Kronco fire diff.jpg', { emissive: 1 }],        // ไฟเตาผิง
  ['^Minotti_Duvet Sofa_0(16|18|27)$', 'Books For all furnitures 3.jpg'],   // ปกหนังสือ
  ['^Minotti_Duvet Sofa_0(17|19|30)$', 'Books For all furnitures 13x.jpg'],
  ['^Minotti_Duvet Sofa_028$', 'Books For all furnitures 2.jpg'],
  ['^Minotti_Duvet Sofa_029$', 'Books For all furnitures 6.jpg'],
  ['^cooktop$', 'mpm_vol.10_p02_4_areas_square_diff.JPG'],
  ['^panel$', 'mpm_vol.10_p15_panel_diff.JPG'],
  ['^ParquetRW', 'xmppmax_v1_13_7_2_d.jpg'],                             // พื้นไม้
  ['^ParquetChvr', 'xmppmax_v1_13_11_10_d.jpg'],
  ['^ItalianPlaster', 'xmppmax_v1_6_2_2_d.jpg'],                         // ผนังปูนฉาบ
];
const cache = new Map();
async function tex(file, size = 2048) {   // รูปเดียวกันใช้ซ้ำได้ ไม่ต้องใส่ไฟล์ซ้ำ
  if (cache.has(file)) return cache.get(file);
  const buf = await sharp(`${dir}/${file}`, { limitInputPixels: false }).resize(size, size, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const t = doc.createTexture(file).setImage(new Uint8Array(buf)).setMimeType('image/jpeg').setURI(file.replace(/\W+/g, '_') + '.jpg');
  cache.set(file, t); return t;
}
for (const m of root.listMaterials()) for (const [re, file, o = {}] of RULES) if (new RegExp(re).test(m.getName())) {
  const t = await tex(file);
  m.setBaseColorTexture(t).setBaseColorFactor([1, 1, 1, 1]).setAlphaMode('OPAQUE');
  if (o.emissive) m.setEmissiveTexture(t).setEmissiveFactor([o.emissive, o.emissive, o.emissive]);
  console.log(m.getName(), '<-', file);
}
// ขนนก: Feather1-6 ใช้รูปความโปร่ง O1-O3 วนกัน สีขนเป็นครีมอ่อน
for (const m of root.listMaterials()) { const k = m.getName().match(/^Feather(\d)$/); if (!k) continue;
  const f = `O${((+k[1] - 1) % 3) + 1}.jpg`;
  const mask = await sharp(`${dir}/${f}`).resize(1024, 1024, { fit: 'inside' }).greyscale().extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = mask.info;
  const rgba = await sharp({ create: { width, height, channels: 3, background: '#f2eee8' } }).joinChannel(mask.data, { raw: { width, height, channels: 1 } }).png().toBuffer();
  m.setBaseColorTexture(doc.createTexture(f).setImage(new Uint8Array(rgba)).setMimeType('image/png')).setBaseColorFactor([1, 1, 1, 1]).setAlphaMode('MASK').setAlphaCutoff(0.4).setDoubleSided(true);
}
await io.write(out, doc);
