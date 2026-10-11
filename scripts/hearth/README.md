# HEARTH: โมเดลห้องสำหรับหน้า /house

ห้องนั่งเล่น + ครัวจากโมเดล VH ("Living room" โดย cavitbarisbalta, CGTrader, Royalty Free License (no AI))
ทำเป็นโมเดลเว็บที่ "อบแสง" (bake) ไว้แล้วด้วย Cycles หน้าเว็บจึงได้แสงนุ่มแบบภาพเรนเดอร์ โดยไม่ต้องคำนวณแสงสดในเบราว์เซอร์

## ต้องมี

- Blender แบบโมดูล Python (ไม่ต้องลงโปรแกรม Blender): `python3.13 -m pip install bpy==5.2.* pillow numpy`
  ทุกคำสั่ง `.py` รันด้วย `python3.13 -I` (`-I` = ไม่โหลดโค้ดจากโฟลเดอร์ปัจจุบัน)
- Node + แพ็กเกจของ repo (`npm install`) สำหรับสคริปต์ `.mjs`
- FBX2glTF: `npm i -g fbx2gltf` (แปลง FBX → glb)
- ไฟล์ต้นฉบับ: `VH (FBX).FBX` (428 MB) และรูปพื้นผิวจาก `VH (MAX15).zip` (ไฟล์ FBX ไม่ได้แนบรูปมา)

## ลำดับขั้น

ตัวอย่างใช้โฟลเดอร์ทำงาน `work/` (ไม่ commit ไฟล์ในนั้น ไฟล์ใหญ่หลายร้อย MB)

```sh
# 0. FBX → glb (กิน RAM ~12 GB, ผลลัพธ์ ~630 MB / 11.9 ล้านสามเหลี่ยม)
FBX2glTF --binary --input "VH (FBX).FBX" --output work/vh

# 0.1 ย่อให้ Blender เปิดไหว (ไม่บีบ meshopt เพราะ Blender อ่านไม่ได้)
RAW=1 node --max-old-space-size=14000 scripts/hearth/reduce.mjs work/vh.glb work/vh-raw.glb 0.5 0.001

# 0.2 ใส่รูปพื้นผิวกลับให้วัสดุ (โฟลเดอร์รูปจาก VH (MAX15).zip)
#     ตารางจับคู่วัสดุ → รูป หามาจาก: python3 -I scripts/hearth/fbx-textures.py "VH (FBX).FBX" work/fbx-textures.json
node --max-old-space-size=8000 scripts/hearth/attach-textures.mjs work/vh-raw.glb work/vh-raw-tex.glb "work/VH (MAX15)/textures"

# 1. แก้วัสดุ ตัดเหลือห้องนั่งเล่น + ครัว แยกชิ้นทัวร์ ลดรายละเอียด (~2.5 นาที, ได้ ~504,000 สามเหลี่ยม)
python3.13 -I scripts/hearth/prep.py work/vh-raw-tex.glb work/hearth.blend work/manifest.json 22 0.45

# 2. อบแสงทั้ง 7 รอบ (~1 ชม. บน CPU 4 คอร์)
VSPP=128 python3.13 -I scripts/hearth/bake.py work/hearth.blend work/bake 2048 96

# 3. lightmap .exr → .webp (ตัวเลขที่ 3 = scale: ค่าแสงที่ถือเป็น "ขาวสุด" ของรูป)
python3.13 -I scripts/hearth/lightmap.py work/bake/day_empty.exr public/models/house/hearth-lm-day-empty.webp 6
python3.13 -I scripts/hearth/lightmap.py work/bake/day_full.exr  public/models/house/hearth-lm-day-full.webp 6
python3.13 -I scripts/hearth/lightmap.py work/bake/night.exr     public/models/house/hearth-lm-night.webp 5

# 4. ส่งออกเป็น glb (ตัวเต็ม และตัวเบาสำหรับมือถือ keep=0.5)
python3.13 -I scripts/hearth/export.py work/bake/hearth-lm.blend work/hearth-export.glb
python3.13 -I scripts/hearth/export.py work/bake/hearth-lm.blend work/hearth-lite-export.glb 0.5

# 5. บีบสำหรับเว็บ
node scripts/hearth/compress.mjs work/hearth-export.glb public/models/house/hearth.glb
node scripts/hearth/compress.mjs work/hearth-lite-export.glb public/models/house/hearth-lite.glb 512

# 6. ภาพ 360° สำหรับเงาสะท้อน
cp work/bake/pano_day.hdr public/models/house/hearth-pano-day.hdr
cp work/bake/pano_night.hdr public/models/house/hearth-pano-night.hdr

# 7. ภาพนิ่งของหน้าเว็บ (Cycles, มุมกล้องอยู่ใน STILLS ใน bake.py): สไลด์กลางวัน/กลางคืน + แปลน → public/photos/hearth/<ชื่อ>.webp
#    still_plan = แปลนมองจากบน พื้นหลังโปร่งใส / PCT=25 = เรนเดอร์ 25% ของขนาดจริงไว้ลองมุมกล้องเร็วๆ
python3.13 -I scripts/hearth/bake.py work/hearth.blend public/photos/hearth 512 96 \
  still_day still_night still_plan

# 8. ชิ้นที่ 4 บนวงแหวนหน้าแรก: ห้องแบบบ้านตุ๊กตา (ตัดฝ้า/ครึ่งบนของผนัง ผนังฝั่งใกล้กล้องโปร่ง) ไม่มีแสงอบ ~2 MB
python3.13 -I scripts/hearth/ring.py work/hearth.blend work/hearth-ring-export.glb
node scripts/hearth/compress.mjs work/hearth-ring-export.glb public/models/house/hearth-ring.glb 256
```

## อะไรอยู่ในไฟล์ไหน

| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `hearth.glb` / `hearth-lite.glb` | ตัวห้อง + เฟอร์นิเจอร์ แสงที่อบติดมากับจุดยอด (`_bake_day`, `_bake_night`) |
| `hearth-lm-day-empty.webp` | แสงกลางวันบนผนัง/พื้น/ฝ้า ตอนห้องยังว่าง |
| `hearth-lm-day-full.webp` | แสงกลางวัน ตอนเฟอร์นิเจอร์ครบ (มีเงาใต้เฟอร์นิเจอร์) |
| `hearth-lm-night.webp` | แสงกลางคืน (ไฟซ่อนฝ้า เตาผิง โคมไฟ) จุดที่ 6 ของทัวร์ |
| `hearth-pano-day.hdr` / `-night.hdr` | ภาพ 360° จากกลางห้อง ใช้ทำเงาสะท้อนบนพื้นหินอ่อน โลหะ กระจก |
| `hearth-ring.glb` | ห้องแบบบ้านตุ๊กตา สำหรับวงแหวนสินค้าหน้าแรก (ส่องไฟด้วยไฟของฉากอวกาศ) |

ใน glb:
- ชิ้นที่เด้งขึ้นในทัวร์ชื่อ `item_...` มีข้อมูลแนบ `userData = { role: 'item', zone, kind, vol }`
  (`zone` = มุมของทัวร์: `sofa` `fire` `dining` `kitchen`;
  `kind` = ท่าเด้ง: `floor` โผล่จากพื้น, `drop` ชิ้นเล็กหล่นลงมาเด้ง, `hang` โคมห้อยลงจากฝ้า, `wall` ติดผนัง, `rug` พรมคลี่ออก;
  `vol` = ขนาด ใช้เรียงลำดับว่าชิ้นไหนเด้งก่อน)
  ชิ้นที่มีหลายวัสดุจะเป็นกลุ่ม ให้อ่าน role จาก `parent.userData` ด้วย
- `shell_lm` = ผนัง พื้น ฝ้า (ใช้ lightmap) พิกัด lightmap อยู่ใน attribute `_lmuv` ให้คัดลอกเข้า `uv1`

## กติกาฝั่งหน้าเว็บ (three.js 0.186)

- lightmap: `colorSpace = SRGBColorSpace`, `flipY` ค่าเริ่มต้น (true), `lightMapIntensity = scale × π`
  หน้าเว็บผสม day_empty → day_full ทีละโซนตามมุมที่เฟอร์นิเจอร์เด้งขึ้นแล้ว
- แสงต่อจุดยอด: ค่าในไฟล์ = √(แสง/4) → แสง = ค่า² × 4 ใส่เข้าที่ `irradiance` ของ shader และปิดแสงกระจายจาก env
  (env จากภาพ 360° ให้แค่เงาสะท้อน)
- tone mapping: AgX + เพิ่ม contrast 1.2 รอบ 0.606 ใน log space (= "Medium High Contrast" ของ Blender), exposure ~0.7
- กลางคืน: exposure ลดเหลือ ~0.2 (AgX บีบช่วงแสงมาก ลดแสงลงครึ่งหนึ่งภาพมืดลงนิดเดียว ต้องลดหลายเท่าถึงจะเป็นค่ำ)
  รูปวิวนอกหน้าต่าง (`Material #2147473862`) หรี่เหลือ ~5% อมน้ำเงิน, ผิวหลอดไฟ (`Light`, `21 - Default23`, `13 - Default2`) เรืองสีส้มอุ่น
- ขนนกโคมระย้า (วัสดุ `Feather*`): ใช้แสงจาก env, เห็นสองด้าน
