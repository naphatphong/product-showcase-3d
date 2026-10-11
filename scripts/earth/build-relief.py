"""สร้างภาพ "ความนูน + ทะเล" ของโลก (public/textures/earth-relief*.webp) จากแผนที่ความสูงของ NASA

ใช้:  python3 scripts/earth/build-relief.py <gebco_08_rev_elev_21600x10800.png> <earth-day-8k.webp> <public/textures>
  - ภาพความสูง: NASA Visible Earth "Topography" (https://visibleearth.nasa.gov/images/73934/topography)
    ทะเล = 0, ภูเขาสูงสุด (~6,400 ม.) = 255
  - ภาพกลางวัน: ใช้ช่วยแยกทะเลกับที่ราบต่ำริมทะเล (ทั้งคู่ความสูง 0 แต่ทะเลเป็นสีน้ำเงิน)

ผลลัพธ์ 1 ภาพ 3 ช่องสี (shader ใน components/three/Earth.tsx อ่านตามนี้):
  R = ความชันไปทางตะวันออก, G = ความชันไปทางเหนือ (0.5 = ราบ) → ใช้เอียงแสงให้ภูเขานูน
  B = ทะเล (1 = น้ำ, 0 = แผ่นดิน) → ใช้ทำแสงแดดสะท้อนผิวน้ำ
"""
import sys
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
elev_path, day_path, out_dir = sys.argv[1:4]

SLOPE_SCALE = 6.0      # ความชันจริงที่ขนาดพิกเซลนี้น้อยมาก (ภูเขาสูงชันสุด ~0.08) → คูณขยายก่อนเก็บ
EXAGGERATE = 40.0      # ขยายความสูงให้ภูเขาดูนูนจากวงโคจร (ของจริงแบนมากเมื่อเทียบกับขนาดโลก)
R_EARTH = 6_371_000.0  # รัศมีโลก (เมตร)

def blur(a, sigma):
    """เบลอแบบ gaussian (แยกแนวนอน/แนวตั้ง) — แนวนอนวนรอบได้เพราะแผนที่ต่อกันซ้าย-ขวา"""
    r = int(sigma * 3 + 0.5)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    x = sum(w * np.roll(a, i - r, axis=1) for i, w in enumerate(k))
    pad = np.pad(x, ((r, r), (0, 0)), mode="edge")
    return sum(w * pad[i : i + a.shape[0]] for i, w in enumerate(k)).astype(np.float32)


src = Image.open(elev_path).convert("L")
day8k = Image.open(day_path).convert("RGB")

for W, suffix in ((8192, "-8k"), (4096, "")):
    H = W // 2
    elev = np.asarray(src.resize((W, H), Image.Resampling.BOX), dtype=np.float32) / 255.0 * 6400.0
    # เกลี่ยเบาๆ ให้ความชันไม่เป็นขั้นบันได (ภาพต้นฉบับเก็บความสูงแค่ 256 ระดับ)
    elev = blur(elev, 1.2)
    lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi                 # แถวบนสุด = ขั้วโลกเหนือ
    dx = 2 * np.pi * R_EARTH * np.maximum(np.cos(lat), 0.02) / W    # ความกว้างของ 1 พิกเซล (เมตร) แคบลงเมื่อใกล้ขั้วโลก
    dy = np.pi * R_EARTH / H
    east = (np.roll(elev, -1, axis=1) - np.roll(elev, 1, axis=1)) / (2 * dx[:, None])
    north = (np.roll(elev, 1, axis=0) - np.roll(elev, -1, axis=0)) / (2 * dy)
    north[0] = north[-1] = 0
    enc = lambda s: np.clip(0.5 + np.tanh(s * EXAGGERATE / SLOPE_SCALE) * 0.5, 0, 1)  # tanh = ภูเขาชันมากไม่ล้นช่อง

    # ทะเล: ความสูง 0 และสีในภาพกลางวันเป็นน้ำเงิน (ที่ราบลุ่มริมทะเลความสูง 0 เหมือนกันแต่สีเขียว/น้ำตาล)
    zero = np.asarray(src.point(lambda v: 255 if v == 0 else 0).resize((W, H), Image.Resampling.BOX), dtype=np.float32) / 255
    day = np.asarray(day8k.resize((W, H), Image.Resampling.BOX), dtype=np.float32) / 255
    blue = np.clip((day[..., 2] - day[..., 0] - 0.01) / 0.05, 0, 1)
    water = zero * np.maximum(blue, (zero > 0.99) * 0.85)           # กลางมหาสมุทรนับเป็นน้ำแน่ๆ แม้สีภาพจะเพี้ยน
    water = blur(water, 0.8)

    rgb = np.stack([enc(east), enc(north), water], axis=-1)
    out = f"{out_dir}/earth-relief{suffix}.webp"
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(out, quality=88, method=6)
    print(out, f"east p99={np.percentile(np.abs(east), 99):.4f}", f"water={water.mean():.3f}")
