# ขั้นที่ 8: โมเดล "บ้านตุ๊กตา" ของห้อง HEARTH สำหรับวงแหวนสินค้าหน้าแรก (ชิ้นที่ 4)
# ห้องเดียวกับทัวร์ แต่ตัดทุกอย่างที่สูงเกิน CUT ทิ้ง (ฝ้า ไฟราง ผ้าม่าน มู่ลี่ ครึ่งบนของผนัง) เหมือนโมเดลสถาปัตย์แบบผ่าครึ่ง
# - ผนังเหลือแต่ผิวด้านใน + เห็นด้านเดียว: ผนังฝั่งที่ใกล้กล้องจะโปร่งไปเอง มองเข้าไปในห้องได้ทุกมุมที่หมุน
# - เฟอร์นิเจอร์ที่ตั้งพื้น (ต้นคริสต์มาส โคมตั้งพื้น) ไม่ตัด / โคมห้อยจากฝ้าเอาออก / มีฐานสีเข้มรองใต้พื้น
# - ไม่มีแสงอบ: วงแหวนส่องไฟเอง (เหมือนสินค้าชิ้นอื่น)
#
# วิธีใช้:  python3.13 -I scripts/hearth/ring.py <hearth.blend จากขั้นที่ 1> <ผลลัพธ์.glb>
# แล้วบีบ:  node scripts/hearth/compress.mjs <ผลลัพธ์.glb> public/models/house/hearth-ring.glb 256
import bpy, bmesh, sys, os, re, random
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I ไม่ใส่โฟลเดอร์สคริปต์ให้เอง
from feathers import feather_uvs

src, out = sys.argv[1], sys.argv[2]
CUT = 1.3                                # ตัดที่ความสูง (เมตร)
X0, Y0, X1, Y1 = 19.66, 10.13, 25.57, 19.69  # ขอบในของห้อง (แกน Blender: z ชี้ขึ้น) เผื่อออกไป ~3 ซม.
MID = Vector(((X0 + X1) / 2, (Y0 + Y1) / 2, 0))  # กลางห้อง
KEEP = 0.35                              # ลดรายละเอียดเหลือเท่านี้ (วงแหวนเห็นห้องเล็กๆ)
TWO_SIDED = re.compile(r'^(Tree_Hairs|Feather)')  # แผ่นบาง (ใบสน ขนนก) ต้องเห็นสองหน้า

bpy.ops.wm.open_mainfile(filepath=src)
sc = bpy.context.scene
for o in sc.objects:
    if o.parent:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in [o for o in sc.objects if o.type in ('LIGHT', 'CAMERA', 'EMPTY')]: bpy.data.objects.remove(o)
feather_uvs()

def mats(o): return [m.name for m in o.data.materials if m]
def gone(o):
    if o.get('kind') == 'hang': return True                       # โคมห้อยจากฝ้า (ฝ้าถูกตัดออกแล้ว)
    if o.get('role') == 'item': return False
    m = mats(o)
    return ('Material #2147473862' in m                              # รูปวิวนอกหน้าต่าง
            or o.name.startswith('Curtains') or 'Curtain_02_mtl' in m or m == ['Fabric Velvet'])  # ผ้าม่าน
for o in [o for o in sc.objects if o.type == 'MESH' and gone(o)]: bpy.data.objects.remove(o)

# ตัดด้วยระนาบ 5 แผ่น (ด้านบน + ขอบห้อง 4 ด้าน) ทิ้งส่วนที่อยู่ฝั่งที่ระนาบชี้ไป
WALLS = [((X0, 0, 0), (-1, 0, 0)), ((X1, 0, 0), (1, 0, 0)), ((0, Y0, 0), (0, -1, 0)), ((0, Y1, 0), (0, 1, 0))]
TOP = ((0, 0, CUT), (0, 0, 1))
whole = lambda o: o.get('role') == 'item' and o.get('kind') in ('floor', 'drop', 'rug')  # ของตั้งพื้นไม่ตัดความสูง
total = 0
for o in [o for o in sc.objects if o.type == 'MESH']:
    if o.data.users > 1: o.data = o.data.copy()
    bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(o.matrix_world)
    for co, no in WALLS + ([] if whole(o) else [TOP]):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True)
    # ตัวห้อง (ผนัง ตู้ติดผนัง กรอบหน้าต่าง): ลบด้านที่ตั้งตรงและหันหนีกลางห้อง (ด้านนอกผนัง หลังตู้) ไม่งั้นมองจากนอกห้อง
    # จะเห็นเป็นกำแพงเทาบังข้างใน / เฟอร์นิเจอร์ไม่ลบ (หลังโซฟาก็ต้องเห็นจากในห้อง)
    if o.get('role') != 'item':
        bm.normal_update()
        def away(f):
            d = f.calc_center_median() - MID; d.z = 0
            return abs(f.normal.z) < 0.5 and d.length > 0.3 and f.normal.dot(d.normalized()) > 0.5
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if away(f)], context='FACES')
    bm.to_mesh(o.data); bm.free()
    o.matrix_world = Matrix.Identity(4)
    if not o.data.polygons: bpy.data.objects.remove(o); continue
    # ลดรายละเอียด (ใบสนเป็นสามเหลี่ยมแผ่นเดียวอยู่แล้ว: สุ่มทิ้งบางใบแทน ยุบแล้วต้นจะโกร๋น)
    t = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if o.name == 'item_tree':
        rnd = random.Random(3); bm = bmesh.new(); bm.from_mesh(o.data)
        mi = {i for i, m in enumerate(o.data.materials) if m and m.name.startswith('Tree_Hairs')}
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in mi and rnd.random() > KEEP], context='FACES')
        bm.to_mesh(o.data); bm.free()
    elif t > 400:
        m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = KEEP; m.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='dec')
    total += sum(len(p.vertices) - 2 for p in o.data.polygons)

# ฐานสีเข้มใต้พื้น (ปิดขอบพื้นที่ถูกตัด และทำให้ดูเป็นโมเดลตั้งโชว์)
bpy.ops.mesh.primitive_cube_add()
base = bpy.context.object; base.name = 'base'
base.scale = ((X1 - X0) / 2, (Y1 - Y0) / 2, 0.14); base.location = ((X0 + X1) / 2, (Y0 + Y1) / 2, -0.145)
bpy.ops.object.transform_apply(scale=True)
mb = bpy.data.materials.new('Base'); mb.use_nodes = True
b = mb.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value = (0.045, 0.034, 0.028, 1); b.inputs['Roughness'].default_value = 0.55
base.data.materials.append(mb)

# วัสดุ: เห็นด้านเดียว (ผนังฝั่งใกล้กล้องจึงโปร่ง) / กระจก: ใสแบบง่าย ไม่ใช้ transmission (หนักเกินไปสำหรับวงแหวน)
for m in bpy.data.materials:
    m.use_backface_culling = not TWO_SIDED.match(m.name)
    p = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if p and p.inputs['Transmission Weight'].default_value > 0:
        p.inputs['Transmission Weight'].default_value = 0
        p.inputs['Alpha'].default_value = 0.2
        p.inputs['Roughness'].default_value = 0.05
        m.surface_render_method = 'BLENDED'

print('tris', total, flush=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=True, export_extras=False,
                          export_normals=True, export_tangents=False, export_materials='EXPORT', export_vertex_color='NONE',
                          export_image_format='AUTO', export_cameras=False, export_lights=False, use_selection=False)
print(out)
