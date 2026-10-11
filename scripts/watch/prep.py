"""นาฬิกา Mechanical Watch (CGTrader, emmanualfrancis23) → .glb สำหรับเว็บ (ยังไม่บีบ — บีบต่อด้วย scripts/hearth/compress.mjs)

ใช้:  python3.13 -I scripts/watch/prep.py <Watch Fbx.fbx> <โฟลเดอร์ "all textures" ที่แตก zip แล้ว> <ผลลัพธ์.glb> [subdiv=1]
ต้องมี: python3.13 -m pip install bpy==5.2.* pillow

ไฟล์ FBX คือ "ตัวเรือนหยาบ" ของ Maya (ลิงก์วัสดุมาไม่ครบ) เลยจับคู่วัสดุ → รูปเองด้านล่าง
ชิ้นส่วนยังแยกกันครบ (94 ชิ้นในหัวนาฬิกา) ชื่อชิ้นเดิมไม่เปลี่ยน เผื่อหน้า explode ใช้ต่อ
"""
import bpy, sys, os, math, mathutils
from PIL import Image, ImageChops

a = sys.argv[sys.argv.index("--") + 1:]  # Blender module ไม่กิน "--" ให้ เลยแยกเอง
fbx, tex, out = a[:3]
subdiv = int(a[3]) if len(a) > 3 else 1
work = os.path.join(os.path.dirname(os.path.abspath(out)), "watch-tex")
os.makedirs(work, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "CAMERA":
        bpy.data.objects.remove(o)
meshes = [o for o in sc.objects if o.type == "MESH"]
# แกะออกจากกลุ่ม (group23 ถือ transform ไว้) แล้วลบตัวกลุ่ม ไม่งั้นชิ้นย้ายผิดที่
for o in meshes:
    m = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = m
for o in list(sc.objects):
    if o.type == "EMPTY":
        bpy.data.objects.remove(o)
# ทรงกระบอก 3 อันของสายที่ตกค้างอยู่ที่จุดกำเนิด (สูงเกิน 5 ซม. = ไม่ใช่ชิ้นของนาฬิกา)
for o in list(meshes):
    if max(v[2] for v in (o.matrix_world @ mathutils.Vector(c) for c in o.bound_box)) - min(v[2] for v in (o.matrix_world @ mathutils.Vector(c) for c in o.bound_box)) > 0.05:
        bpy.data.objects.remove(o)
        meshes.remove(o)

# ---- วัสดุ: ชื่อวัสดุ → ชุดรูป (BaseColor/Roughness/Metallic/Normal) ----
SUB = "Substance/"
PBR = {
    "watch_back_support": SUB + "Watch back support/watch back support_Brushed_steel_",
    "watch_eqp_1": SUB + "watch eqp 1/Watch eqp 1_Brushed_steel_",
    "watch_eqp_2": SUB + "Watch eqp 2/watch eqp 2_Brushed_steel_",
    "watch_time_texture": SUB + "Watch time texture/watch time texture_lambert1_",
    "watch_strap_hole1": SUB + "watch strap hole/watch strap with hole_lambert1_",
    "Watch_Strap:strap_top": SUB + "watch strap tp/watch strap_Watch_Strap_strap_top_",
    "watch_strap_hld2": SUB + "watch strap tp/watch strap_Watch_Strap_Watch_Strap_watch_strap_tp_hld2_",
    "watch_strap_lock": SUB + "watch strap tp/watch strap_Watch_Strap_watch_strap_lock_",
    "aiStandardSurface22": SUB + "watch strap tp/watch strap_Watch_Strap_watch_lock_bar_",
}
FACE = {"Watch_face": "Textures/watch face-01-01.png", "watch_face_bottom": "Textures/watch face bottom-01-01.png"}  # มีช่องโปร่งใส (ตัวเลข/ขอบ)
ROSE, GOLD, STEEL = (0.93, 0.62, 0.50), (1.0, 0.76, 0.42), (0.78, 0.78, 0.80)
FLAT = {  # สีล้วน: (สี, metallic, roughness) — ตัวเรือนใช้ rose gold ขัดเงา แทนรูปเหล็กขัดที่ซีดเกินไป
    "watch_frame": (ROSE, 1, 0.07), "Gold": (GOLD, 1, 0.12), "gold_Rughffend": (GOLD, 1, 0.32),
    "Braas": ((0.96, 0.78, 0.52), 1, 0.18), "Rughffend_steel": (STEEL, 1, 0.3), "Brushed_steel": (STEEL, 1, 0.2),
    "Stainless_steel": (STEEL, 1, 0.08), "lambert1": ((0.12, 0.12, 0.13), 1, 0.25), "blue": ((0.02, 0.06, 0.45), 0.3, 0.15),
    "Dimond": ((0.75, 0.02, 0.06), 0, 0.05), "gems": ((0.75, 0.02, 0.06), 0, 0.05),  # ทับทิม
}
STRAP_TINT = (0.16, 0.08, 0.05)  # คูณทับรูปสาย → หนังสีคอนยัคเข้ม


def img(name, tint=None):
    """ย่อรูป 2048 → 1024 (เว็บไม่ต้องใหญ่กว่านี้) แล้วโหลดเข้า Blender; tint = คูณสีทับ"""
    dst = os.path.join(work, name.replace("/", "_") + ("-tint" if tint else ""))
    if not os.path.exists(dst):
        im = Image.open(os.path.join(tex, name)).resize((1024, 1024), Image.LANCZOS)
        if tint:
            im = ImageChops.multiply(im.convert("RGB"), Image.new("RGB", im.size, tuple(round(c * 255) for c in tint)))
        im.save(dst, "PNG")
    return bpy.data.images.load(dst, check_existing=True)


for m in bpy.data.materials:
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(p.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs[0])

    def tex_node(image, data=False):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image
        if data:
            image.colorspace_settings.name = "Non-Color"
        return t

    n, I = m.name, p.inputs
    if n in PBR:
        pre = PBR[n]
        strap = "strap" in n.lower() and "lock" not in n
        nt.links.new(tex_node(img(pre + "BaseColor.png", STRAP_TINT if strap else None)).outputs[0], I["Base Color"])
        nt.links.new(tex_node(img(pre + "Roughness.png"), True).outputs[0], I["Roughness"])
        nt.links.new(tex_node(img(pre + "Metallic.png"), True).outputs[0], I["Metallic"])
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(tex_node(img(pre + "Normal.png"), True).outputs[0], nm.inputs[1])
        nt.links.new(nm.outputs[0], I["Normal"])
    elif n in FACE:
        t = tex_node(img(FACE[n]))
        nt.links.new(t.outputs[0], I["Base Color"])
        nt.links.new(t.outputs[1], I["Alpha"])
        I["Roughness"].default_value = 0.35
        m.surface_render_method = "BLENDED"
    elif n in FLAT:
        c, me, r = FLAT[n]
        I["Base Color"].default_value, I["Metallic"].default_value, I["Roughness"].default_value = (*c, 1), me, r
    elif "Glass" in n:  # กระจก: โปร่งแสงธรรมดา (transmission จริงหนักเกินไปสำหรับ 1 ใน 4 ชิ้นบนวงแหวน)
        I["Base Color"].default_value, I["Alpha"].default_value, I["Roughness"].default_value = (0.97, 0.98, 1, 1), 0.12, 0
        m.surface_render_method = "BLENDED"
    else:
        I["Base Color"].default_value, I["Metallic"].default_value, I["Roughness"].default_value = (*ROSE, 1), 1, 0.15

# ---- ทรง: หมุนให้หน้าปัดหันหา +Z ของเว็บ สายตั้งขึ้น (Blender Z-up → glTF Y-up) แล้วทำให้โค้งเนียน ----
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.transform.rotate(value=math.pi / 2, orient_axis="X")
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
for o in meshes:
    # เกิน 1000 หน้า = หนาแน่นพอแล้ว (เฟือง/ทรงกลมเล็ก) ไม่ subdiv ซ้ำให้ไฟล์บวมเปล่าๆ
    if subdiv and len(o.data.polygons) <= 1000:
        s = o.modifiers.new("s", "SUBSURF")
        s.levels = s.render_levels = subdiv
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="s")
    for poly in o.data.polygons:
        poly.use_smooth = True
tris = sum(len(o.data.polygons) for o in meshes)
print("polygons", tris)

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=False, export_extras=False)
print(out)
