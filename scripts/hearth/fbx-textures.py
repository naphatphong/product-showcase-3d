# ตัวช่วย: อ่านไฟล์ FBX แบบ binary เอง (ไม่ต้องมีโปรแกรม 3D) แล้วบอกว่า
#   มีรูปพื้นผิว (Texture/Video) ชื่อไฟล์อะไรบ้าง มีวัสดุ (Material) อะไรบ้าง และรูปไหนต่อเข้ากับวัสดุไหน
# ใช้ตอนเขียนตาราง RULES ใน attach-textures.mjs (FBX ของ VH ไม่ได้แนบรูปมา แต่ยังจำชื่อไฟล์รูปไว้)
#
# วิธีใช้:  python3 -I scripts/hearth/fbx-textures.py "VH (FBX).FBX" fbx-textures.json
import struct, sys, json
data = open(sys.argv[1], 'rb').read()
ver = struct.unpack_from('<I', data, 23)[0]; big = ver >= 7500
def read_node(o):
    if big: end, nprops, plen = struct.unpack_from('<QQQ', data, o); o += 24
    else: end, nprops, plen = struct.unpack_from('<III', data, o); o += 12
    nl = data[o]; o += 1; name = data[o:o+nl].decode('latin1'); o += nl
    props = []; p = o
    for _ in range(nprops):
        t = chr(data[p]); p += 1
        if t in 'YCILFD':
            sz = {'Y':2,'C':1,'I':4,'L':8,'F':4,'D':8}[t]; fmt = {'Y':'<h','C':'<B','I':'<i','L':'<q','F':'<f','D':'<d'}[t]
            props.append(struct.unpack_from(fmt, data, p)[0]); p += sz
        elif t in 'SR':
            l = struct.unpack_from('<I', data, p)[0]; p += 4; v = data[p:p+l]; p += l
            props.append(v.decode('utf-8', 'replace') if t == 'S' else None)
        else:  # arrays: skip
            n, enc, cl = struct.unpack_from('<III', data, p); p += 12 + cl; props.append(None)
    o += plen
    return name, props, o, end
def children(o, end):
    sentinel = 25 if big else 13
    while o < end - sentinel:
        name, props, co, nend = read_node(o)
        if nend == 0: break
        yield name, props, co, nend
        o = nend
top = {}
o = 27
for name, props, co, nend in children(o, len(data)):
    top[name] = (co, nend)
objs = {}
co, nend = top['Objects']
for name, props, c2, e2 in children(co, nend):
    if name in ('Texture', 'Video', 'Material'):
        d = {'type': name, 'name': props[1].split('\x00')[0] if len(props) > 1 and props[1] else ''}
        for n3, p3, c3, e3 in children(c2, e2):
            if n3 in ('FileName', 'RelativeFilename', 'Filename'): d[n3] = p3[0]
            if n3 == 'Properties70':
                for n4, p4, c4, e4 in children(c3, e3):
                    if p4 and isinstance(p4[0], str) and ('File' in p4[0] or p4[0] in ('DiffuseColor',)): d[p4[0]] = p4[4:] if len(p4) > 4 else p4
        objs[props[0]] = d
conns = []
co, nend = top['Connections']
for name, props, c2, e2 in children(co, nend):
    if props[1] in objs or props[2] in objs: conns.append(props)
out = {'objs': {str(k): v for k, v in objs.items()}, 'conns': conns}
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, default=str)
tex = [v for v in objs.values() if v['type'] == 'Texture']
print('textures', len(tex), 'videos', sum(v['type']=='Video' for v in objs.values()), 'materials', sum(v['type']=='Material' for v in objs.values()))
for t in tex[:15]: print(t)
