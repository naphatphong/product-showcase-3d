"""สร้างภาพดาวเทียมละเอียดของ "เมืองบ้านเกิด" สินค้าแต่ละชิ้น (public/textures/cities/*.webp)

ตอนกล้องพุ่งลงไปที่เมือง กล้องอยู่สูงแค่ ~200 กม. ภาพโลก 8K (ละเอียด ~5 กม./พิกเซล) จะเบลอมาก
ภาพนี้คือแผ่นสี่เหลี่ยมกว้าง ~445 กม. รอบเมือง ละเอียด ~220 ม./พิกเซล ที่ shader เอาไปแปะทับตอนดำดิ่ง

ใช้:  python3 scripts/earth/build-city-patches.py <public/textures/earth-day-8k.webp> <public/textures/cities> <tile-cache-dir>
  - ภาพดาวเทียม: Sentinel-2 cloudless 2016 โดย EOX (CC BY 4.0, https://s2maps.eu) ดึงเป็น tile จาก tiles.maps.eox.at
  - ปรับสีให้เข้ากับภาพโลก 8K เดิม (ดูขั้นตอนในโค้ดด้านล่าง) → ขอบแผ่นภาพกลืนไปกับโลกเดิม ไม่เห็นรอยต่อหรือสีเพี้ยน
ต้องตรงกับ components/three/Earth.tsx: PATCH_SPAN (องศา) และวิธีคำนวณกรอบ (cityRect)
"""
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
day_path, out_dir, cache = sys.argv[1:4]

PATCH_SPAN = 4.0   # ความสูงของแผ่นภาพ (องศาละติจูด) ความกว้างในองศาลองจิจูด = PATCH_SPAN / cos(lat) → ได้สี่เหลี่ยมจัตุรัสบนพื้นจริง
LEVEL = 9          # ระดับ tile ของ EOX (WGS84): 1 tile = 180/2^9 องศา = 256 px → ~150 ม./พิกเซล
SIZES = ((2048, ""), (1024, "-sm"))
CITIES = {  # ต้องตรงกับ origin ใน config/products.ts (ชื่อไฟล์ = ชื่อเมืองตัวเล็ก เว้นวรรคเป็น -)
    "Atlanta": (33.75, -84.39), "New Bern": (35.11, -77.04), "Waco": (31.55, -97.15),
    "Cupertino": (37.33, -122.01), "Monaco": (43.74, 7.42), "Brackley": (52.03, -1.15),
    "Maranello": (44.53, 10.86), "Milton Keynes": (52.04, -0.76), "Khon Kaen": (16.44, 102.83),
}

TILE_DEG = 180 / 2**LEVEL
URL = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless/default/WGS84/{z}/{r}/{c}.jpg"
os.makedirs(cache, exist_ok=True)
os.makedirs(out_dir, exist_ok=True)


def tile(r, c):
    path = f"{cache}/{LEVEL}-{r}-{c}.jpg"
    if not os.path.exists(path):
        subprocess.run(["curl", "-sSf", "--retry", "3", "-o", path, URL.format(z=LEVEL, r=r, c=c)], check=True)
    return path


day = Image.open(day_path).convert("RGB")
DW, DH = day.size
for city, (lat, lon) in CITIES.items():
    half_lat = PATCH_SPAN / 2
    half_lon = PATCH_SPAN / 2 / math.cos(math.radians(lat))
    north, south, west, east = lat + half_lat, lat - half_lat, lon - half_lon, lon + half_lon
    r0, r1 = int((90 - north) // TILE_DEG), int((90 - south) // TILE_DEG)
    c0, c1 = int((west + 180) // TILE_DEG), int((east + 180) // TILE_DEG)
    jobs = [(r, c) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)]
    with ThreadPoolExecutor(6) as pool:
        paths = list(pool.map(lambda rc: tile(*rc), jobs))
    mosaic = Image.new("RGB", ((c1 - c0 + 1) * 256, (r1 - r0 + 1) * 256))
    for (r, c), p in zip(jobs, paths):
        mosaic.paste(Image.open(p).convert("RGB"), ((c - c0) * 256, (r - r0) * 256))
    px = 256 / TILE_DEG  # พิกเซลต่อองศา
    box = ((west + 180 - c0 * TILE_DEG) * px, (90 - north - r0 * TILE_DEG) * px,
           (east + 180 - c0 * TILE_DEG) * px, (90 - south - r0 * TILE_DEG) * px)
    sat = mosaic.crop(tuple(round(v) for v in box))
    # กรอบเดียวกันบนภาพโลก 8K (ขนาดแค่ ~90 พิกเซล)
    dbox = ((west + 180) / 360 * DW, (90 - north) / 180 * DH, (east + 180) / 360 * DW, (90 - south) / 180 * DH)
    # ปรับสี Sentinel-2 ทั้งภาพให้ใกล้ Blue Marble: a*x+b ต่อสี ให้ค่าเฉลี่ยและความต่างสี (std) เท่ากับภาพโลกเดิม
    # ที่ขนาดย่อเท่ากัน (a เดียวกันทั้ง 3 สี จะได้ไม่เพี้ยนเป็นสีแปลกๆ) ส่วนขอบแผ่นภาพ shader จะค่อยๆ จางให้กลืนกับโลกเดิมเอง
    # (เคยลองชดเชยส่วนที่สีต่างกันแบบเกลี่ยนุ่มๆ ด้วย แต่เกิดแถบสว่างในทะเลตามแนวชายฝั่ง เลยไม่ใช้)
    base_lo = np.asarray(day.crop(tuple(round(v) for v in dbox)), dtype=np.float32)
    bh, bw = base_lo.shape[:2]
    sat_lo = np.asarray(sat.resize((bw, bh), Image.Resampling.BOX), dtype=np.float32)
    a = float(np.clip(base_lo.std() / max(sat_lo.std(), 1), 0.5, 1.5))
    fit = [(a, base_lo[..., ch].mean() - a * sat_lo[..., ch].mean()) for ch in range(3)]
    slug = city.lower().replace(" ", "-")
    for size, suffix in SIZES:
        s = np.asarray(sat.resize((size, size), Image.Resampling.LANCZOS), dtype=np.float32)
        out = np.stack([s[..., ch] * fit[ch][0] + fit[ch][1] for ch in range(3)], axis=-1)
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(f"{out_dir}/{slug}{suffix}.webp", quality=80, method=6)
    print(f"{city}: {len(jobs)} tiles, color fit", " ".join(f"{a:.2f}x+{b:.0f}" for a, b in fit))
