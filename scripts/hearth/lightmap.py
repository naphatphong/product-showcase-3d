# แปลง lightmap ที่อบได้ (.exr เก็บแสงแบบ linear ค่าเกิน 1 ได้) ให้เป็นรูปเล็กๆ สำหรับเว็บ (.webp 8 บิต)
#   1. เบลอเม็ดนอยส์จากการอบ เฉพาะภายในแต่ละเกาะ UV (เบลอแบบมีหน้ากาก แสงไม่ไหลข้ามไปผนังอื่น)
#   2. เติมสีลงช่องว่างระหว่างเกาะ ตอนเบราว์เซอร์กรองรูป (filtering) จะได้ไม่ดึงสีดำเข้ามาเป็นขอบ
#   3. เก็บเป็น แสง / SCALE ผ่านเส้นโค้ง sRGB (ส่วนมืดได้ระดับสีมากขึ้น)
# ใน three.js: lightMap.colorSpace = SRGBColorSpace, lightMapIntensity = SCALE * PI
#
# วิธีใช้:  python3.13 -I lightmap.py <in.exr> <out.webp> [scale=4] [blur_px=2]
# เช่น     python3.13 -I lightmap.py work/bake/day_empty.exr public/models/house/lm-day-empty.webp 6
# ดูบรรทัดสุดท้ายที่พิมพ์ออกมา: "clipped" = กี่ % ที่สว่างเกิน scale (ถูกตัด) และ p99 ของแสง → เลือก scale ให้พอดี
import bpy, sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
SCALE = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0
R = int(sys.argv[4]) if len(sys.argv) > 4 else 2
im = bpy.data.images.load(src); w, h = im.size
a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]   # Blender เก็บแถวล่างขึ้นก่อน → กลับหัว
mask = (a.sum(2) > 1e-6).astype(np.float32)                                 # 1 = จุดที่อยู่ในเกาะ UV (ถูกอบ)

def box(x, r):  # เบลอแบบกล่องทีละแกน ด้วยผลรวมสะสม (เร็ว ไม่ขึ้นกับรัศมี) ขอบภาพใช้ค่าขอบซ้ำ
    for ax in (0, 1):
        p = np.pad(x, [(r + 1, r) if i == ax else (0, 0) for i in range(x.ndim)], mode='edge')
        c = np.cumsum(p, axis=ax, dtype=np.float64)
        sl = lambda s, e: tuple(slice(s, e) if i == ax else slice(None) for i in range(x.ndim))
        x = ((c[sl(2 * r + 1, None)] - c[sl(0, -2 * r - 1)]) / (2 * r + 1)).astype(np.float32)
    return x

def mblur(x, m, r, n=2):  # เบลอเฉพาะจุดที่หน้ากากเป็น 1 (n รอบ ≈ เบลอนุ่มแบบเกาส์)
    num, den = x * m[..., None], m.copy()
    for _ in range(n): num, den = box(num, r), box(den, r)
    return num / np.maximum(den, 1e-6)[..., None], den

sm, _ = mblur(a, mask, R) if R > 0 else (a, mask)
sm = np.where(mask[..., None] > 0, sm, 0)
# เติมช่องว่าง: ค่อยๆ ขยายรัศมีเบลอ แล้วเอาสีไปเติมจุดว่างที่อยู่ติดสีแล้ว
filled, m = sm.copy(), mask.copy()
for r in (2, 4, 8, 16, 32):
    b, d = mblur(filled, m, r, 1)
    hole = (m == 0) & (d > 1e-3)
    filled[hole] = b[hole]; m = np.maximum(m, hole.astype(np.float32))
v = np.clip(filled / SCALE, 0, 1)
srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
Image.fromarray((srgb * 255 + 0.5).astype(np.uint8)).save(out, quality=92, method=6)
print(out, 'clipped %.3f%%' % (100 * (filled > SCALE).mean()), 'p99', float(np.percentile(a[mask > 0], 99)))
