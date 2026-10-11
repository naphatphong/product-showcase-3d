# ขั้นที่ 1 ของโมเดลห้อง HEARTH (VH) สำหรับเว็บ: เปิดไฟล์ VH ที่ใส่รูปพื้นผิวแล้ว → แก้วัสดุ → ตัดเหลือแค่
# ห้องนั่งเล่น + ครัว → แยก "ตัวห้อง" (ผนัง พื้น ฝ้า ตู้ติดผนัง) ออกจาก "เฟอร์นิเจอร์ที่จะเด้งขึ้นตอนเลื่อนชม"
# แล้วลดรายละเอียดชิ้นที่หนัก ตั้งแต่ขั้นนี้ (แสงจะถูกอบลงบนสามเหลี่ยมชุดเดียวกับที่เว็บได้จริง)
#
# วิธีใช้:  python3.13 -I prep.py <vh-raw-tex.glb> <ผลลัพธ์.blend> <manifest.json> [detail=22] [needles=0.45]
#   detail  = ยิ่งมาก ยิ่งเก็บรายละเอียด (ดูสูตร goal ด้านล่าง)
#   needles = เก็บใบสนของต้นคริสต์มาสไว้กี่ส่วน
# ต้องมี Blender แบบโมดูล Python: python3.13 -m pip install bpy   (ดู README.md)
import bpy, bmesh, sys, re, json, math, random
import numpy as np

src, out_blend, out_json = sys.argv[1:4]
K = float(sys.argv[4]) if len(sys.argv) > 4 else 22.0
NEEDLES = float(sys.argv[5]) if len(sys.argv) > 5 else 0.45
bpy.ops.wm.read_factory_settings(use_empty=True)
# merge_vertices: เชื่อมจุดยอดที่ซ้อนกัน ถ้าไม่เชื่อม ตอนลดรายละเอียดผิวจะฉีกเป็นร่องตามรอยต่อ
bpy.ops.import_scene.gltf(filepath=src, merge_vertices=True)
sc = bpy.context.scene
# กลุ่มจากไฟล์ FBX มาเป็น "กล่องเปล่า" (empty) ที่เป็นพ่อของชิ้นงาน: ปลดชิ้นงานออกโดยคงตำแหน่งเดิมไว้ แล้วลบกล่องเปล่าทิ้ง
# (ถ้าลบกล่องเปล่าก่อนปลด ลูกจะหล่นไปกองที่จุด 0,0,0 — โต๊ะอาหาร ต้นคริสต์มาส ไฟรางเคยหายเพราะแบบนี้)
for o in sc.objects:
    if o.parent:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in [o for o in sc.objects if o.type == 'EMPTY']: bpy.data.objects.remove(o)

def bsdf(m):
    return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m and m.use_nodes else None
def hexc(h):  # สี #rrggbb → ค่าสีแบบ linear ที่ Blender ใช้
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c] + [1]
def world_verts(o):  # ตำแหน่งจุดยอดทั้งหมดในพิกัดโลก
    co = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', co)
    M = np.array(o.matrix_world); return co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]

# ---------- วัสดุ (ชุดเดียวกับภาพเรนเดอร์ Cycles ที่บลูดูแล้ว) ----------
RULES = {
  r'^PVC White Matte$': dict(color='#e9e5df', rough=0.6),
  r'^PVC White Glossy': dict(color='#efece7', rough=0.2),
  r'^PVC Black': dict(color='#161616', rough=0.45),
  r'^Fabric Velvet': dict(color='#d9d0c2', rough=0.9, sheen=0.6),
  r'^Brass Clean0$': dict(color='#7a5f45', rough=0.18, metal=1),
  r'^Brass': dict(color='#b08d57', rough=0.25, metal=1),
  r'^Aluminium|^chrome|Chrome': dict(rough=0.2, metal=1),
  r'^Curtain': dict(color='#f1ece4', rough=0.9, alpha=0.75),
  r'^Glass Milky': dict(color='#f4f2ee', rough=0.35),
  r'^Glass|^glass|YARD_glasz': dict(glass=True),
  r'^Leather': dict(color='#bfb3a3', rough=0.5),
  r'^Granite': dict(color='#141414', rough=0.25),
  r'^Lake Dolap': dict(color='#e6e1d9', rough=0.35),
  r'^ParquetRW': dict(rough=0.35),
  r'^ItalianPlaster': dict(rough=0.8),
  r'^Material #2147474173$': dict(rough=0.15),          # หินอ่อนพื้น
  r'^Material #2147474174$': dict(rough=0.12),          # หินอ่อนลายทอง: ผนังหลังซิงก์ + ท็อปเกาะครัว
  r'^Kronco - fire': dict(emit=6),                      # ไฟในเตาผิง
  r'^Material #2147473862$': dict(emit=1.2),            # รูปวิวนอกหน้าต่าง
  r'^Feather': dict(color='#efe9df', rough=0.8),        # ขนนกของโคมไฟเหนือโต๊ะอาหาร
  r'^Tree_Hairs$': dict(color='#24331d', rough=0.7),    # ใบสน
}
for m in bpy.data.materials:
    b = bsdf(m)
    if not b: continue
    b.inputs['Metallic'].default_value = 0
    for rx, o in RULES.items():
        if not re.search(rx, m.name): continue
        if 'color' in o: b.inputs['Base Color'].default_value = hexc(o['color'])
        if 'rough' in o: b.inputs['Roughness'].default_value = o['rough']
        if 'metal' in o: b.inputs['Metallic'].default_value = o['metal']
        if 'sheen' in o: b.inputs['Sheen Weight'].default_value = o['sheen']
        if 'alpha' in o: b.inputs['Alpha'].default_value = o['alpha']
        if o.get('glass'):
            b.inputs['Base Color'].default_value = (1, 1, 1, 1); b.inputs['Roughness'].default_value = 0
            b.inputs['Transmission Weight'].default_value = 1; b.inputs['Alpha'].default_value = 1
        if 'emit' in o:
            img = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE'), None)
            if img: m.node_tree.links.new(img.outputs['Color'], b.inputs['Emission Color'])
            b.inputs['Emission Strength'].default_value = o['emit']
        break

# ---------- ตัดเหลือห้องนั่งเล่น + ครัว (ห้องอื่นใน VH ว่างเปล่า) ----------
X0, X1, Y0, Y1 = 19.45, 25.7, 10.05, 19.8                # ขอบห้องในพิกัด Blender (เมตร)
KEEP_OUTSIDE = re.compile(r'^Box213877599[12]')          # แผ่นรูปวิวนอกหน้าต่าง อยู่นอกห้องแต่ต้องเก็บไว้
removed, cropped = [], []
for o in list(sc.objects):
    if o.type != 'MESH' or KEEP_OUTSIDE.match(o.name): continue
    w = world_verts(o); lo, hi = w.min(0), w.max(0)
    if lo[0] >= X0 - .3 and hi[0] <= X1 + .3 and lo[1] >= Y0 - .3 and hi[1] <= Y1 + .3: continue   # อยู่ในห้องทั้งชิ้น
    if hi[0] < X0 or lo[0] > X1 or hi[1] < Y0 or lo[1] > Y1:                                      # อยู่นอกห้องทั้งชิ้น
        removed.append(o.name); bpy.data.objects.remove(o); continue
    bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world                                    # คร่อมขอบ: ตัดเฉพาะหน้าที่อยู่นอก
    kill = [f for f in bm.faces if not (X0 <= (c := M @ f.calc_center_median()).x <= X1 and Y0 <= c.y <= Y1)]
    if kill:
        bmesh.ops.delete(bm, geom=kill, context='FACES'); bm.to_mesh(o.data); cropped.append(o.name)
    bm.free()
    if len(o.data.polygons) == 0: removed.append(o.name); bpy.data.objects.remove(o)
print('removed', len(removed), 'cropped', cropped, flush=True)

# ---------- แผ่นหินอ่อนหลังซิงก์ (กล่องบาง 2 ซม.) มาแบบ "กลับด้าน": ชิ้นนี้ถูกสะท้อนกระจก (scale ติดลบ) ทุกหน้าในห้อง
# จึงหันเข้าในกล่อง ตอนอบแสงเลยอบจากด้านในออกมาดำทั้งแผ่น → ย้ายจุดทั้งหมดไปพิกัดโลก (ไม่มีการสะท้อนแล้ว)
# กลับหน้าให้หันออกนอกกล่อง ทิ้งหน้าหลังที่ชนผนัง (บนเว็บสองผิวทับกันจะกะพริบเป็นลาย) แล้วขยับออกจากผนัง 4 มม. ----------
Vec = __import__('mathutils').Vector
for o in [o for o in sc.objects if o.name == 'Object2113134077']:
    if o.data.users > 1: o.data = o.data.copy()
    bm = bmesh.new(); bm.from_mesh(o.data)
    bm.transform(o.matrix_world); o.matrix_world = __import__('mathutils').Matrix.Identity(4); bm.normal_update()
    cb = sum((v.co for v in bm.verts), Vec()) / len(bm.verts)
    for f in bm.faces:
        if f.normal.dot(f.calc_center_median() - cb) < 0: f.normal_flip()   # กล่องนูน: หน้าต้องหันออกจากจุดกลางกล่อง
    bm.normal_update()
    to_room = (Vec((22.6, 14.9, 1.2)) - cb).normalized()
    front = max(bm.faces, key=lambda f: f.calc_area() * f.normal.dot(to_room))
    n = front.normal.copy()                                                # หน้าหลักที่หันเข้าห้อง
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.dot(n) < -0.9], context='FACES')
    bm.to_mesh(o.data); bm.free()
    # ทิศแรเงาเดิมที่ติดมากับไฟล์ (custom normals) ยังชี้กลับด้าน: ล้างทิ้ง แล้วแรเงาแบบผิวเรียบแบน
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
    for p in o.data.polygons: p.use_smooth = False
    o.location += n * 0.004

# ---------- พิกัดรูปพื้นผิวของวัสดุที่ปูซ้ำ (ไม้พื้น ปูนฉาบ หินอ่อน) ----------
# พิกัดเดิมจาก FBX ขนาดไม่ตรง (บางชิ้น เช่นพื้นห้องนั่งเล่น ไม่มีเลย) → ฉายจากพิกัดโลกตามด้านที่ผิวหันไป
# ตัวเลข = ขนาดรูปหนึ่งแผ่นบนผิวจริง (เมตร) แนวนอน x แนวตั้ง
TILE = {r'^ParquetRW': (2.2, 2.2), r'^ItalianPlaster': (2.5, 2.5), r'^Material #2147474174$': (1.0, 2.0)}
for o in sc.objects:
    if o.type != 'MESH': continue
    idx = {i: t for i, m in enumerate(o.data.materials) if m for rx, t in TILE.items() if re.search(rx, m.name)}
    if not idx: continue
    if not o.data.uv_layers: o.data.uv_layers.new(name='UVMap')
    me = o.data; uv = me.uv_layers[0].data; M = o.matrix_world; R = M.to_3x3()
    for p in me.polygons:
        if p.material_index not in idx: continue
        tu, tv = idx[p.material_index]; n = (R @ p.normal); ax = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][ax]
        for li in p.loop_indices:
            v = M @ me.vertices[me.loops[li].vertex_index].co
            uv[li].uv = (v[a] / tu, v[b] / tv)

# ---------- เฟอร์นิเจอร์ที่จะเด้งขึ้นตอนเลื่อนชม: อยู่มุมไหน (zone) และเข้าฉากแบบไหน (kind) ----------
# kind: floor = งอกขึ้นจากพื้น, drop = หล่นลงมาเด้ง, hang = ห้อยลงมาจากเพดาน, wall = เลื่อนเข้าติดผนัง, rug = พรมคลี่ออก
ZONES = [  # (zone, ชื่อชิ้น (regex), kind)
  ('sofa', r'^T109TPD', 'floor'), ('sofa', r'^2883_model', 'floor'), ('sofa', r'^CUERPO_MADERA', 'floor'),
  ('sofa', r'^Box2131643590', 'rug'), ('sofa', r'^Minotti_Duvet Sofa_023\.003$', 'floor'), ('sofa', r'^Minotti_Duvet Sofa_023', 'drop'), ('sofa', r'^YARD_008', 'drop'),
  ('sofa', r'^FLOOR LIGHT', 'floor'),
  ('fire', r'^Rectangle184$', 'wall'), ('fire', r'^(Tree|Tree_Hairs|Stand)$', 'floor'),
  ('fire', r'^(Ball|Star)_', 'drop'),
  ('dining', r'^Line2065050834', 'floor'), ('dining', r'^Plane0(5[5-9]|6[0-2])', 'floor'),
  ('dining', r'^Object21131342(09|10)$', 'hang'), ('dining', r'^TABLE LIGHT', 'drop'),
  ('kitchen', r'^Object21131341(57|68|69)$', 'floor'), ('kitchen', r'^ISLAND PENDANT', 'hang'),
]
# ชิ้นที่มาเป็นหลายก้อนแต่ต้องเด้งพร้อมกัน → รวมเป็นชิ้นเดียว
MERGE = {'tree': r'^(Tree|Tree_Hairs|Stand)$', 'island': r'^(Object2113134(107|078|035|039|037)|Box2138775896)$',
         'chandelier': r'^Object21131342(09|10)$'}

def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return objs[0]

for name, rx in MERGE.items():
    objs = [o for o in sc.objects if o.type == 'MESH' and re.match(rx, o.name)]
    if len(objs) > 1: join(objs, 'item_' + name)
    elif objs: objs[0].name = 'item_' + name

# ---------- ต้นคริสต์มาส: ใบสน 1.3 แสนใบ ใบละ 14 สามเหลี่ยม หนักเกินไป และตัวลดรายละเอียดยุบใบจนหายหมด
# → เก็บไว้บางส่วน (NEEDLES) แล้ววาดแต่ละใบใหม่เป็นสามเหลี่ยมผอมๆ 1 อัน (โคนกว้าง 2.6 มม. ปลายแหลม) ----------
def needles_to_slivers(o, keep, width=0.0026):
    me = o.data
    mi = [i for i, m in enumerate(me.materials) if m and m.name.startswith('Tree_Hairs')]
    if not mi: return
    bm = bmesh.new(); bm.from_mesh(me); rnd = random.Random(7)
    seen, kill, segs = set(), [], []
    for f in bm.faces:
        if f.index in seen or f.material_index not in mi: continue
        stack, part = [f], []; seen.add(f.index)       # หาใบหนึ่งใบ = กลุ่มหน้าที่ต่อกัน
        while stack:
            g = stack.pop(); part.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        kill += part
        if rnd.random() < keep:                         # ใบที่เก็บ: หาแนวยาวของใบ (โคน → ปลาย)
            vs = np.array([v.co[:] for g in part for v in g.verts]); c = vs.mean(0)
            u = np.linalg.svd(vs - c, full_matrices=False)[2][0]; t = (vs - c) @ u
            segs.append((c + u * t.min(), c + u * t.max()))
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    w = width / max(o.matrix_world.to_scale()[0], 1e-6) / 2
    for a, b in segs:                                   # วาดใหม่: หันหน้าแบบสุ่ม จะได้เห็นจากทุกมุม
        ax = b - a; side = np.cross(ax, np.array([rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)]))
        side = side / max(np.linalg.norm(side), 1e-9) * w
        f = bm.faces.new([bm.verts.new(a + side), bm.verts.new(a - side), bm.verts.new(b)]); f.material_index = mi[0]
    bm.to_mesh(me); bm.free()
    me.materials[mi[0]].use_backface_culling = False   # ใบบาง: แสดงสองหน้า
    print('needles kept', len(segs), flush=True)
if 'item_tree' in bpy.data.objects: needles_to_slivers(bpy.data.objects['item_tree'], NEEDLES)
KIND_OF_MERGED = {'item_tree': ('fire', 'floor'), 'item_island': ('kitchen', 'floor'), 'item_chandelier': ('dining', 'hang')}

items = []
for o in list(sc.objects):
    if o.type != 'MESH': continue
    hit = KIND_OF_MERGED.get(o.name) or next(((z, k) for z, rx, k in ZONES if re.match(rx, o.name)), None)
    if not hit: o['role'] = 'shell'; continue
    zone, kind = hit
    # ย้ายจุดหมุน (pivot) ไปตรงที่ชิ้นแตะพื้น/เพดาน/ผนัง จะได้เด้ง/ยืด/หดจากตรงนั้น
    w = world_verts(o); lo, hi = w.min(0), w.max(0); c = (lo + hi) / 2
    piv = (c[0], c[1], hi[2] if kind == 'hang' else lo[2])
    if kind == 'wall': piv = (lo[0], c[1], c[2])
    sc.cursor.location = piv
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    vol = float(np.prod(np.maximum(hi - lo, 0.02)))     # ขนาดชิ้น: ชิ้นเล็กเด้งเร็ว ชิ้นใหญ่เด้งช้า (ใช้ในหน้าเว็บ)
    # ค่าพวกนี้ติดไปกับไฟล์ .glb (extras) → three.js อ่านได้จาก object.userData
    o['role'] = 'item'; o['zone'] = zone; o['kind'] = kind; o['vol'] = vol
    items.append(dict(name=o.name, zone=zone, kind=kind, vol=round(vol, 4), pivot=[round(v, 3) for v in piv],
                      size=[round(v, 3) for v in (hi - lo)], tris=sum(len(p.vertices) - 2 for p in o.data.polygons)))

# ---------- ลดรายละเอียด: ชิ้นใหญ่ที่หนักลดเยอะ ชิ้นเล็กจิ๋ว (ห่วง ลูกบอล) เหลือไม่กี่สามเหลี่ยม ----------
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
# ไฟรางบนฝ้า (BANT) มาเป็นเศษผิวเล็กๆ 1.5 แสนชิ้นพันกัน ตัวลดรายละเอียดลดไม่ลง (และเคยกินรางหายหมด)
# → เชื่อมจุดยอดก่อน แล้วเก็บรางยาวๆ ไว้ตามเดิม ส่วนหัวสปอตไลต์แต่ละดวงวาดใหม่เป็น "เปลือกนูน" (convex hull)
#   มองจากพื้นขึ้นไปดูไม่ออก แล้วค่อยลดรายละเอียดตามปกติพร้อมชิ้นอื่น
if 'BANT' in bpy.data.objects:
    b = bpy.data.objects['BANT']; t0 = tris(b); s_ = max(abs(x) for x in b.matrix_world.to_scale())
    bm = bmesh.new(); bm.from_mesh(b.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001 / s_)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.verts.ensure_lookup_table(); bm.verts.index_update()
    seen = [False] * len(bm.verts); parts = []
    for v in bm.verts:                                  # แยกชิ้นที่ต่อกัน
        if seen[v.index]: continue
        st, idx = [v], []; seen[v.index] = True
        while st:
            u = st.pop(); idx.append(u)
            for e in u.link_edges:
                w = e.other_vert(u)
                if not seen[w.index]: seen[w.index] = True; st.append(w)
        parts.append(idx)
    out = bmesh.new(); nrail = nhull = 0
    for vs in parts:
        co = np.array([v.co[:] for v in vs]); ext = float(np.max(np.ptp(co, 0))) * s_
        if ext < 0.012: continue                                         # น็อต หมุด: มองไม่เห็น ทิ้ง
        if ext > 0.4:                                                    # ราง: คัดลอกตามเดิม
            faces = {f for v in vs for f in v.link_faces}; m = {}
            for f in faces:
                nv = [m.setdefault(x.index, out.verts.new(x.co)) for x in f.verts]
                try: nf = out.faces.new(nv); nf.material_index = f.material_index
                except ValueError: pass
            nrail += 1
        else:                                                            # หัวสปอตไลต์: เปลือกนูน
            hv = [out.verts.new(c) for c in co]
            r = bmesh.ops.convex_hull(out, input=hv)
            bmesh.ops.delete(out, geom=list({x for x in r['geom_interior'] + r['geom_unused'] if isinstance(x, bmesh.types.BMVert)}), context='VERTS')
            nhull += 1
    bm.free(); out.to_mesh(b.data); out.free()
    for f in b.data.polygons: f.material_index = 0 if f.material_index != 2 else f.material_index
    print('track lights', len(parts), 'parts:', nrail, 'rails kept,', nhull, 'spots as hulls,', t0, '->', tris(b), flush=True)
total0 = total1 = 0
for o in [o for o in sc.objects if o.type == 'MESH']:
    t = tris(o); total0 += t
    d = math.sqrt(sum(x * x for x in o.dimensions))   # เส้นทแยงของกล่องที่ครอบชิ้น (เมตร)
    goal = min(t, 3000 + K * math.sqrt(t), 300 + 3000 * d ** 1.5)
    dims = sorted(o.dimensions)
    if dims[0] < 0.06 and dims[1] < 0.12: goal = min(goal, 240)   # ราวผ้าม่าน แท่งเล็กยาว: ไม่กี่สามเหลี่ยมก็พอ
    if o.name == 'BANT': goal = min(goal, 25000)                    # ไฟราง: รางบาง สปอตไลต์สีดำ
    if o.name == 'item_tree': goal = t                               # ต้นคริสต์มาสลดทีละใบไปแล้ว
    if goal < t * 0.9:
        if o.data.users > 1: o.data = o.data.copy()
        # บางชิ้นมาเป็นเศษผิวแยกกัน: เชื่อมจุดยอดที่ห่างกันไม่ถึง 0.1 มม. และทิ้งจุดลอยๆ ก่อน
        # ไม่งั้นตัวลดรายละเอียดจะกินเศษแต่ละชิ้นจนหาย
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001 / max(abs(x) for x in o.matrix_world.to_scale()))
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(o.data); bm.free(); t = tris(o)
        for _ in range(3):   # ชิ้นที่พันกันบางทีลดไม่ถึงเป้าในรอบเดียว: ลดซ้ำ
            if tris(o) < goal * 1.3: break
            m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1.0, goal / max(tris(o), 1)); m.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
        # ผิวที่ลดแล้ว: โค้งนุ่มยังเนียน ขอบหักมุมเกิน 35° ยังคม
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        if o.data.has_custom_normals: bpy.ops.mesh.customdata_custom_splitnormals_clear()
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35), keep_sharp_edges=False)
    total1 += tris(o)
    if tris(o) > 20000: print('  big', o.name, t, '->', tris(o), flush=True)
    for it in items:
        if it['name'] == o.name: it['tris'] = tris(o)
print('tris', total0, '->', total1, flush=True)

shell = [o for o in sc.objects if o.type == 'MESH' and o.get('role') == 'shell']
stats = dict(items=len(items), shell=len(shell),
             shell_tris=sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in shell))
json.dump(dict(stats=stats, removed=removed, cropped=cropped, items=sorted(items, key=lambda i: (i['zone'], -i['vol']))),
          open(out_json, 'w'), indent=1)
print(stats, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=out_blend, compress=False)
