# โคมระย้าขนนกมาโดยไม่มีพิกัดรูป (UV) รูปขนนกจึงไม่เคยขึ้น (ใน Cycles แผ่นขนนกเลยใสจนมองไม่เห็น):
# หาทิศหลัก 2 ทิศของขนนกแต่ละแผ่น (SVD) วางแผ่นให้แบน แล้วขึงรูปขนนกทับ ให้ด้านยาวของแผ่นเป็นความสูงของรูป
# ใช้ทั้งตอนส่งออกโมเดลเว็บ (export.py) และตอนเรนเดอร์ภาพนิ่ง (bake.py still_*)
import bpy, bmesh
import numpy as np


def feather_uvs():
    ch = bpy.data.objects.get('item_chandelier')
    if not ch:
        return 0
    me = ch.data; bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv.verify()
    fm = {i for i, m in enumerate(me.materials) if m and m.name.startswith('Feather')}
    seen, cards = set(), 0
    for f in bm.faces:
        if f.index in seen or f.material_index not in fm: continue
        # ไล่หาหน้าที่ติดกันทั้งหมด = ขนนก 1 แผ่น
        st, part = [f], []; seen.add(f.index)
        while st:
            g = st.pop(); part.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen and h.material_index in fm: seen.add(h.index); st.append(h)
        co = np.array([v.co[:] for g in part for v in g.verts]); c = co.mean(0)
        ax = np.linalg.svd(co - c, full_matrices=False)[2]; p = (co - c) @ ax[:2].T
        lo, hi = p.min(0), np.maximum(p.max(0), p.min(0) + 1e-6)
        for g in part:
            for l in g.loops:
                q = (np.array(l.vert.co[:]) - c) @ ax[:2].T; q = (q - lo) / (hi - lo)
                l[uvl].uv = (q[1], q[0])        # แกนแรก = ทิศที่ยาวที่สุด = ความสูงของรูป
        cards += 1
    bm.to_mesh(me); bm.free()
    # ขนนกบางเป็นแผ่นเดียว ต้องเห็นได้ทั้งสองด้าน
    for i in fm: me.materials[i].use_backface_culling = False
    return cards
