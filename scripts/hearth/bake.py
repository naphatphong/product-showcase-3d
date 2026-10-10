# ขั้นที่ 2: "อบแสง" ของห้องด้วย Cycles (CPU) เก็บไว้ในไฟล์ แล้วหน้าเว็บแค่หยิบมาแสดง (ไม่ต้องคำนวณแสงสดในเบราว์เซอร์)
#
# ผิวใหญ่เรียบ (ผนัง พื้น ฝ้า) รวมเป็นชิ้นเดียว "shell_lm" แล้วอบแสงลงรูป lightmap ใบเดียว (พิกัดรูปชุดที่ 2 ชื่อ "lightmap"):
#   day_empty  กลางวัน ห้องว่าง (ก่อนเฟอร์นิเจอร์เด้งขึ้น)
#   day_full   กลางวัน เฟอร์นิเจอร์ครบ (มีเงานุ่มๆ ใต้เฟอร์นิเจอร์) → หน้าเว็บค่อยๆ ผสมจากห้องว่างไปห้องเต็มทีละมุม
#   night      กลางคืน: ไฟซ่อนฝ้า เตาผิง โคมไฟ หน้าต่างมืด (จุดที่ 6 "จุดแสงกลางคืน")
# ชิ้นอื่นทั้งหมด (เฟอร์นิเจอร์ ชิ้นเล็ก ชิ้นที่มีรายละเอียด) เก็บแสงไว้ที่ "มุมของแต่ละหน้า" แทน (vday / vnight)
# และถ่ายภาพ 360° จากกลางห้อง (pano_day / pano_night) ให้หน้าเว็บใช้ทำเงาสะท้อน
#
# วิธีใช้:  python3.13 -I bake.py <hearth.blend> <โฟลเดอร์ผลลัพธ์> <ขนาด lightmap> <samples> [ชื่อรอบ ...]
# เช่น     VSPP=128 python3.13 -I bake.py work/hearth.blend work/bake 2048 96      (ครบ 7 รอบ ~1 ชม. บน CPU 4 คอร์)
#          python3.13 -I bake.py work/hearth.blend work/test 1024 16 day_empty vday   (ลองเร็วๆ)
# VSPP = samples ของรอบเก็บแสงที่มุมหน้า (ค่าเริ่มต้น 2 เท่าของ samples, อย่างน้อย 64)
import bpy, bmesh, sys, os, math, time, re
import numpy as np

src, outdir, SIZE, SPP = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
passes = sys.argv[5:] or ['day_empty', 'day_full', 'night', 'vday', 'vnight', 'pano_day', 'pano_night']
VSPP = int(os.environ.get('VSPP', max(SPP * 2, 64)))
PANO = (SIZE // 2, SIZE // 4)    # ขนาดภาพ 360°
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=src)
sc = bpy.context.scene

def bsdf(m):
    return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if m and m.node_tree else None
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def area(o):
    M = o.matrix_world; return sum((M.to_3x3() @ p.normal).length * p.area for p in o.data.polygons)

# ---------- 1. เลือกผิวที่จะอบลง lightmap: ใหญ่ สามเหลี่ยมน้อย ทึบแสง ----------
SKIP = re.compile(r'Curtain|Glass|glass|#2147473862|Kronco')
if 'shell_lm' not in bpy.data.objects:
    # แผ่นปิดช่องเปิดบนฝ้า (ในไฟล์เดิมฝ้าตรงกลางห้องเป็นช่องโล่ง)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(22.6, 15.0, 3.0)); cap = bpy.context.object
    cap.name = 'cap'; cap.scale = (6.4, 9.8, 1); cap.rotation_euler = (math.pi, 0, 0); cap['role'] = 'shell'   # หันหน้าลงมาในห้อง
    cm = bpy.data.materials.new('Ceiling Cap'); cm.use_nodes = True; bsdf(cm).inputs['Base Color'].default_value = (0.81, 0.78, 0.74, 1)
    bsdf(cm).inputs['Roughness'].default_value = 0.7; cap.data.materials.append(cm)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    cap.data.uv_layers.new(name='UVMap')
    # เอาเฉพาะผิวสถาปัตย์หยาบๆ: ชิ้นละเอียด (ราว มือจับ กรอบ) ถ้าใส่ใน lightmap จะแตกเป็นเศษเล็กเต็มรูปจนแต่ละชิ้นได้แค่ไม่กี่จุด
    lm = [o for o in sc.objects if o.type == 'MESH' and o.get('role') == 'shell' and (a := area(o)) > 0.5 and a / max(tris(o), 1) > 0.04
          and not any(SKIP.search(m.name) for m in o.data.materials if m)]
    print('lightmapped objects', len(lm), 'tris', sum(tris(o) for o in lm), flush=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in lm:
        o.select_set(True)
        if not o.data.uv_layers: o.data.uv_layers.new(name='UVMap')
    bpy.context.view_layer.objects.active = lm[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.join(); shell = bpy.context.object; shell.name = 'shell_lm'; shell['role'] = 'shell_lm'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    while len(shell.data.uv_layers) > 1: shell.data.uv_layers.remove(shell.data.uv_layers[-1])
    shell.data.uv_layers[0].name = 'UVMap'
    uvl = shell.data.uv_layers.new(name='lightmap'); shell.data.uv_layers.active = uvl
    for l in shell.data.uv_layers: l.active_render = (l.name == 'UVMap')
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    # หน้าที่หันออกนอกห้อง (ด้านนอกผนัง หลังฝ้า) เห็นแค่ตอนมองแบบบ้านตุ๊กตาจากข้างบน
    # → แยกออกไปเป็น shell_out เก็บแสงที่มุมหน้าแบบชิ้นเล็ก จะได้ไม่เปลืองที่ใน lightmap
    bm = bmesh.from_edit_mesh(shell.data); RX0, RX1, RY0, RY1 = 19.45, 25.7, 10.05, 19.8
    for f in bm.faces:
        c = f.calc_center_median() + f.normal * 0.25
        f.select = not (RX0 < c.x < RX1 and RY0 < c.y < RY1 and -0.05 < c.z < 3.1)
    bmesh.update_edit_mesh(shell.data)
    if any(f.select for f in bm.faces):
        bpy.ops.mesh.separate(type='SELECTED')
        bpy.ops.object.mode_set(mode='OBJECT')
        for o in bpy.context.selected_objects:
            if o is not shell: o.name = 'shell_out'; o['role'] = 'shell'; o.select_set(False)
        bpy.context.view_layer.objects.active = shell; bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.004, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    print('uv packed', flush=True)

shell = bpy.data.objects['shell_lm']
items = [o for o in sc.objects if o.get('role') == 'item']
vtx = [o for o in sc.objects if o.type == 'MESH' and o is not shell and len(o.data.polygons)]
# แสงที่เก็บไว้ที่มุมหน้าต้องมีจุดยอดตามแนวหน้ายาวๆ ด้วย: ไม้ระแนงผนังยาว 2.5 ม. ที่มีจุดยอดแค่สองปลาย
# (ปลายชนพื้นกับฝ้า ซึ่งมืด) จะออกมาเป็นแถบดำทั้งแผ่น → ผ่าขอบที่ยาวเกิน 0.8 ม. ก่อนอบ
if not shell.get('cut'):
    t0 = t1 = 0
    for o in vtx:
        bm = bmesh.new(); bm.from_mesh(o.data); M = o.matrix_world; t0 += len(bm.faces); by = {}
        for e in bm.edges:
            L = (M @ e.verts[0].co - M @ e.verts[1].co).length
            if L > 0.8: by.setdefault(min(int(L / 0.8), 6), []).append(e)
        for n, es in by.items(): bmesh.ops.subdivide_edges(bm, edges=es, cuts=n, use_grid_fill=False)
        if by: bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4]); bm.to_mesh(o.data)
        t1 += len(bm.faces); bm.free()
    shell['cut'] = 1; print('long edges cut: faces', t0, '->', t1, flush=True)

# ---------- 2. ไฟ (ชุดกลางวันตรงกับภาพเรนเดอร์ Cycles ที่บลูดูแล้ว) ----------
for o in [o for o in sc.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o)
def area_light(name, loc, size, power, color, rot=(0, 0, 0), sy=None):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = power; d.color = color; d.shape = 'RECTANGLE'; d.size = size; d.size_y = sy or size
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot; sc.collection.objects.link(o); return o
def point(name, loc, power, color, radius=0.05):
    d = bpy.data.lights.new(name, 'POINT'); d.energy = power; d.color = color; d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d); o.location = loc; sc.collection.objects.link(o); return o
WARM, AMBER, SKY = (1.0, 0.82, 0.62), (1.0, 0.68, 0.42), (0.92, 0.96, 1.0)
COVES = [(22.6, 10.7, 5.6, 0.08), (22.6, 15.5, 5.6, 0.08), (19.9, 13.1, 0.08, 4.6), (25.3, 13.1, 0.08, 4.6)]   # ไฟซ่อนฝ้า (x, y, กว้าง, ยาว)
def emissive(rx, strength, color=None):
    for m in bpy.data.materials:
        if re.search(rx, m.name) and bsdf(m):
            b = bsdf(m); b.inputs['Emission Strength'].default_value = strength
            if color: b.inputs['Emission Color'].default_value = color + (1,)
def world(color, strength):
    w = sc.world or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = color + (1,); bg.inputs['Strength'].default_value = strength

def lights_day():
    for (x, y, sx, sy) in COVES: area_light('cove', (x, y, 2.62), sx, 120, WARM, sy=sy)
    area_light('fill_living', (22.6, 13.2, 2.6), 4.5, 250, WARM, sy=4)
    area_light('fill_kitchen', (22.6, 18.4, 2.45), 4.0, 180, WARM, sy=2)
    area_light('win_e', (26.4, 13.5, 1.4), 6, 900, SKY, rot=(0, math.radians(-90), 0), sy=2.6)      # แสงฟ้าจากหน้าต่างฝั่งตะวันออก
    area_light('win_s', (22.6, 9.6, 1.4), 6, 600, SKY, rot=(math.radians(-90), 0, 0), sy=2.6)       # และฝั่งใต้
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 3.5; sun.data.color = (1.0, 0.9, 0.78)
    sun.data.angle = math.radians(1.5); sun.rotation_euler = (math.radians(62), 0, math.radians(110)); sc.collection.objects.link(sun)
    world((0.75, 0.82, 0.95), 0.6)
    emissive(r'^Material #2147473862$', 1.2, (1, 1, 1)); emissive(r'^Kronco - fire', 6)

def lights_night():
    for (x, y, sx, sy) in COVES: area_light('cove', (x, y, 2.62), sx, 260, AMBER, sy=sy)
    area_light('fill_living', (22.6, 13.2, 2.6), 4.5, 30, WARM, sy=4)
    area_light('kitchen_cove', (22.6, 19.2, 2.45), 4.0, 120, AMBER, sy=0.1)
    point('chandelier', (24.3, 15.0, 1.65), 60, AMBER, 0.25)                                          # โคมขนนกเหนือโต๊ะอาหาร
    point('table_a', (24.3, 14.6, 0.92), 8, AMBER); point('table_b', (24.3, 15.4, 0.92), 8, AMBER)   # โคมตั้งโต๊ะ
    point('floor_lamp', (22.3, 11.8, 1.9), 45, AMBER, 0.12)                                           # โคมตั้งพื้นโค้ง
    point('fire', (20.05, 12.9, 0.5), 70, (1.0, 0.55, 0.25), 0.3)                                    # เตาผิง
    for y in (16.55, 17.0, 17.45): point('pendant', (22.5, y, 1.75), 25, AMBER, 0.08)                 # โคมซิกแซกเหนือเกาะครัว
    world((0.05, 0.07, 0.14), 0.25)
    emissive(r'^Material #2147473862$', 0.06, (0.35, 0.45, 0.8)); emissive(r'^Kronco - fire', 9)

# ---------- 3. รูปที่จะอบลง: ทุกวัสดุของ shell_lm ชี้ไปที่รูป 'lm' ผ่านพิกัด 'lightmap' ----------
img = bpy.data.images.get('lm') or bpy.data.images.new('lm', SIZE, SIZE, float_buffer=True, alpha=False)
if img.size[0] != SIZE: img.scale(SIZE, SIZE)
for m in shell.data.materials:
    if not m: continue
    m.use_nodes = True; nt = m.node_tree
    n = nt.nodes.get('LM_BAKE') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'LM_BAKE'; n.image = img
    uv = nt.nodes.get('LM_UV') or nt.nodes.new('ShaderNodeUVMap'); uv.name = 'LM_UV'; uv.uv_map = 'lightmap'
    nt.links.new(uv.outputs['UV'], n.inputs['Vector'])
    for x in nt.nodes: x.select = False
    n.select = True; nt.nodes.active = n

sc.render.engine = 'CYCLES'; cy = sc.cycles
cy.device = 'CPU'; cy.samples = SPP; cy.use_denoising = False
cy.max_bounces = 8; cy.diffuse_bounces = 4; cy.glossy_bounces = 2; cy.transmission_bounces = 4; cy.transparent_max_bounces = 16
cy.caustics_reflective = cy.caustics_refractive = False; cy.sample_clamp_indirect = 8
# อบเฉพาะ "แสงที่ตกกระทบ" (ไม่คูณสีวัสดุ): หน้าเว็บเอาไปคูณกับสี/ลายของวัสดุเอง
bk = sc.render.bake; bk.use_pass_direct = True; bk.use_pass_indirect = True; bk.use_pass_color = False; bk.margin = 6; bk.margin_type = 'EXTEND'

def pano(path):
    cam = bpy.data.objects.get('pano') or bpy.data.objects.new('pano', bpy.data.cameras.new('pano'))
    if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
    cam.data.type = 'PANO'; cam.data.panorama_type = 'EQUIRECTANGULAR'
    cam.location = (22.6, 14.6, 1.35); cam.rotation_euler = (math.pi / 2, 0, -math.pi / 2)   # หันไปทาง +X: ตรงกับภาพ 360° ของ three.js
    sc.camera = cam; sc.render.resolution_x, sc.render.resolution_y = PANO; sc.render.resolution_percentage = 100
    cy.samples = SPP; cy.use_denoising = True
    sc.render.image_settings.file_format = 'HDR'; sc.render.filepath = path
    bpy.ops.render.render(write_still=True); cy.use_denoising = False

for p in passes:
    t = time.time()
    for o in [o for o in sc.objects if o.type == 'LIGHT']: bpy.data.objects.remove(o)
    (lights_night if 'night' in p else lights_day)()
    for o in items: o.hide_render = (p == 'day_empty')
    bpy.ops.object.select_all(action='DESELECT')
    if p.startswith('pano'):
        pano(os.path.join(outdir, p + '.hdr'))
    elif p.startswith('v'):
        # แสงที่มุมหน้า เก็บใน color attribute (bake_day / bake_night) ของทุกชิ้นที่ไม่ใช่ shell_lm
        # เก็บ "ต่อมุมหน้า" (CORNER) ไม่ใช่ต่อจุดยอด: หน้าไม้ระแนงกับร่องข้างๆ ได้แสงของตัวเอง ไม่เฉลี่ยปนกัน
        name = 'bake_' + p[1:]; cy.samples = VSPP
        for o in vtx:
            ca = o.data.color_attributes.get(name) or o.data.color_attributes.new(name, 'FLOAT_COLOR', 'CORNER')
            o.data.color_attributes.active_color = ca; o.hide_set(False); o.select_set(True)
        bpy.context.view_layer.objects.active = vtx[0]
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS')
        cy.samples = SPP
    else:
        shell.hide_set(False); shell.select_set(True); bpy.context.view_layer.objects.active = shell
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, margin=6, use_clear=True)
        img.filepath_raw = os.path.join(outdir, p + '.exr'); img.file_format = 'OPEN_EXR'; img.save()
    print('baked', p, round(time.time() - t), 's', flush=True)

for o in items: o.hide_render = False
for m in shell.data.materials:  # เก็บกวาดโหนดที่ใช้อบ ไม่ให้ติดไปในไฟล์เว็บ
    if m and m.node_tree:
        for k in ('LM_BAKE', 'LM_UV'):
            if k in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes[k])
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(outdir, 'hearth-lm.blend'), compress=False)
