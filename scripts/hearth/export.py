# ขั้นที่ 3: ส่งออกห้องที่อบแสงแล้วเป็นโมเดลสำหรับเว็บ (.glb แกน y ชี้ขึ้นแบบ three.js)
# ชิ้นเฟอร์นิเจอร์ที่จะเด้งขึ้นในทัวร์แต่ละชิ้นยังเป็น node ของตัวเอง มีข้อมูลแนบ (extras) {role:'item', zone, kind, vol}
# ตัวห้องที่ใช้ lightmap เป็น node เดียวชื่อ "shell_lm" มีพิกัดรูปชุดที่ 2 (_LMUV) ไว้หยิบแสงจากรูป lightmap
# ชิ้นอื่นทั้งหมดพกแสงที่อบไว้ติดไปกับจุดยอด (_BAKE_DAY, _BAKE_NIGHT เก็บเป็น แสง / VSCALE ให้อยู่ในช่วง 0..1)
#
# วิธีใช้:  python3.13 -I export.py <hearth-lm.blend> <ผลลัพธ์.glb> [keep=1.0]
#   keep < 1 = ลดรายละเอียดทุกชิ้นลงอีก (โมเดลเบาสำหรับมือถือ) แสงที่อบไว้ติดไปกับจุดยอดที่เหลือ
import bpy, sys, os, math
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I ไม่ใส่โฟลเดอร์สคริปต์ให้เอง
from feathers import feather_uvs

src, out = sys.argv[1], sys.argv[2]
KEEP = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
VSCALE = 4.0
bpy.ops.wm.open_mainfile(filepath=src)
sc = bpy.context.scene
# ปลดชิ้นงานออกจากพ่อโดยคงตำแหน่งเดิม แล้วทิ้งไฟ กล้อง กล่องเปล่า (หน้าเว็บมีไฟ/กล้องของตัวเอง)
for o in sc.objects:
    if o.parent:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in [o for o in sc.objects if o.type in ('LIGHT', 'CAMERA', 'EMPTY')]: bpy.data.objects.remove(o)

print('feather cards', feather_uvs(), flush=True)

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
total0 = total1 = 0
for o in [o for o in sc.objects if o.type == 'MESH']:
    t = tris(o); total0 += t
    if KEEP < 0.99 and o.name == 'item_tree':   # ใบสนเป็นสามเหลี่ยมแผ่นเดียวอยู่แล้ว: สุ่มทิ้งบางใบ อย่ายุบ (ยุบแล้วต้นจะโกร๋น)
        import bmesh, random; rnd = random.Random(3); bm = bmesh.new(); bm.from_mesh(o.data)
        mi = {i for i, m in enumerate(o.data.materials) if m and m.name.startswith('Tree_Hairs')}
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in mi and rnd.random() > KEEP], context='FACES')
        bm.to_mesh(o.data); bm.free()
    elif KEEP < 0.99 and o.name != 'shell_lm' and t > 400:
        # ชิ้นที่ใช้ mesh ร่วมกันต้องแยกก่อน ไม่งั้นชิ้นอื่นโดนลดไปด้วย
        if o.data.users > 1: o.data = o.data.copy()
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = KEEP; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
    total1 += tris(o)
print('tris', total0, '->', total1, flush=True)

LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)   # น้ำหนักความสว่างของสี แดง เขียว น้ำเงิน
def clean(corner_rgb, me):
    """แสงถูกอบไว้ที่มุมของแต่ละหน้า (corner) มุมของจุดยอดเดียวกันที่หันไปทางเดียวกัน (normal ตอนแรเงาเท่ากัน)
    ได้ค่าเฉลี่ยค่าเดียว ผิวโค้งเรียบจึงยังเรียบ และใช้จุดยอดร่วมกันในไฟล์ได้ (ไฟล์เล็กลง)
    ส่วนข้ามขอบคม ด้านหน้าระแนงกับร่องระแนงยังเก็บแสงของตัวเองแยกกัน
    จุดยอดบนขอบคมบางจุดตอนอบ "มองทะลุ" เข้าไปเห็นด้านในของหน้าข้างๆ แล้วออกมาเกือบดำ (เป็นเส้นจุดๆ ตามขอบ):
    จุดพวกนั้นให้ใช้ค่าเฉลี่ยแสงของเพื่อนบ้านแทน"""
    nl, nv = len(me.loops), len(me.vertices)
    if nl == 0 or len(corner_rgb) != nl: return corner_rgb
    lv = np.empty(nl, dtype=np.int64); me.loops.foreach_get('vertex_index', lv)
    cn = np.empty(nl * 3, dtype=np.float32); me.corner_normals.foreach_get('vector', cn); cn = cn.reshape(-1, 3)
    q = np.round(cn * 4).astype(np.int64) + 4                            # ปัดทิศ normal เป็นช่อง: ผิวเรียบ = ค่าเดียวต่อจุดยอด
    key = ((lv * 9 + q[:, 0]) * 9 + q[:, 1]) * 9 + q[:, 2]               # ข้ามขอบคม = แยกค่า
    _, g = np.unique(key, return_inverse=True); g = g.ravel(); ng = g.max() + 1
    gs = np.zeros((ng, 3), np.float32); gc = np.zeros(ng, np.float32)
    np.add.at(gs, g, corner_rgb); np.add.at(gc, g, 1); grp = gs / gc[:, None]
    # ต่อจุดยอด: แสงเฉลี่ยของจุดนั้น และแสงเฉลี่ยของจุดเพื่อนบ้าน (ต่อกันด้วยขอบ)
    vs = np.zeros((nv, 3), np.float32); vc = np.zeros(nv, np.float32)
    np.add.at(vs, lv, corner_rgb); np.add.at(vc, lv, 1); vm = vs / np.maximum(vc, 1)[:, None]
    e = np.empty(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
    ns = np.zeros((nv, 3), np.float32); nc = np.zeros(nv, np.float32)
    np.add.at(ns, e[:, 0], vm[e[:, 1]]); np.add.at(ns, e[:, 1], vm[e[:, 0]]); np.add.at(nc, e[:, 0], 1); np.add.at(nc, e[:, 1], 1)
    nm = np.where(nc[:, None] > 0, ns / np.maximum(nc, 1)[:, None], vm)
    bad = (vm @ LUM) < 0.6 * (nm @ LUM)       # มืดกว่าเพื่อนบ้านเกิน 40% = จุดดำที่อบพลาด
    out = grp[g]
    bl = bad[lv]; out[bl] = nm[lv[bl]]
    return out.astype(np.float32)

# แสงที่อบไว้ต่อมุมหน้า: แปลงจากแบบ "สี" (color attribute) เป็นตัวเลข 3 ค่าธรรมดา หารให้อยู่ในช่วง 0..1
# (ชื่อที่ขึ้นต้นด้วย "_" ตัวส่งออก glTF จะเขียนไปตามเดิม three.js อ่านเป็นตัวพิมพ์เล็ก: _bake_day, _bake_night)
peak = []
for o in [o for o in sc.objects if o.type == 'MESH']:
    me = o.data
    for src_name, dst_name in (('bake_day', '_BAKE_DAY'), ('bake_night', '_BAKE_NIGHT')):
        ca = me.color_attributes.get(src_name)
        if not ca: continue
        n = len(ca.data); buf = np.empty(n * 4, dtype=np.float32); ca.data.foreach_get('color', buf)
        rgb = clean(buf.reshape(-1, 4)[:, :3].copy(), me); peak.append(np.percentile(rgb, 99))
        at = me.attributes.get(dst_name) or me.attributes.new(dst_name, 'FLOAT_VECTOR', ca.domain)
        at.data.foreach_set('vector', np.clip(rgb / VSCALE, 0, 1).ravel())
        me.color_attributes.remove(me.color_attributes[src_name])
if peak: print('vertex light p99 (median over meshes)', float(np.median(peak)), 'max', float(np.max(peak)), flush=True)

# ตัวส่งออกเขียนเฉพาะพิกัดรูป (UV) ที่มีรูปพื้นผิวใช้งานอยู่ พิกัด lightmap จึงต้องแอบส่งไปเป็นข้อมูลเสริม (_LMUV)
# แล้วหน้าเว็บค่อยคัดลอกเข้า uv1 ให้ material.lightMap ใช้
sh = bpy.data.objects.get('shell_lm')
if sh:
    me = sh.data; src_uv = me.uv_layers['lightmap'].data
    at = me.attributes.get('_LMUV') or me.attributes.new('_LMUV', 'FLOAT2', 'CORNER')
    buf = [0.0] * (len(src_uv) * 2); src_uv.foreach_get('uv', buf); at.data.foreach_set('vector', buf)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_extras=True, export_attributes=True, export_yup=True, export_apply=True,
                          export_normals=True, export_tangents=False, export_materials="EXPORT", export_vertex_color='NONE',
                          export_image_format='AUTO', export_cameras=False, export_lights=False, use_selection=False)
print('exported', out, flush=True)
