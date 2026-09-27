import bpy, os, time

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'export')
os.makedirs(OUT, exist_ok=True)

blend_path = os.path.join(ROOT, 'Demon_Head.blend')
print(f"Opening {blend_path}...", flush=True)
bpy.ops.wm.open_mainfile(filepath=blend_path)

s = bpy.context.scene
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 16

o = bpy.data.objects['Demon • million-face textured sculpt']
bpy.ops.object.select_all(action='DESELECT')
o.select_set(True)
bpy.context.view_layer.objects.active = o

mat = o.data.materials[0]
nt = mat.node_tree
n = nt.nodes

# Create 2048x2048 shaded texture
width, height = 2048, 2048
im = bpy.data.images.new('Demon_Shaded', width=width, height=height, alpha=False, float_buffer=False)
im.colorspace_settings.name = 'sRGB'

tex = n.new('ShaderNodeTexImage')
tex.image = im
n.active = tex

s.render.bake.use_selected_to_active = False
s.render.bake.margin = 16
s.render.bake.use_clear = True

t0 = time.time()
print(f"Baking COMBINED shaded map at {width}x{height} with 16 samples...", flush=True)
bpy.ops.object.bake(type='COMBINED')
print(f"Baking finished in {time.time() - t0:.2f}s", flush=True)

out_export = os.path.join(OUT, 'Demon_Shaded.png')
im.filepath_raw = out_export
im.file_format = 'PNG'
im.save()
print(f"Saved {out_export}", flush=True)

# Also save directly in asset_demon_head root as shaded.png (replacing broken symlink)
root_shaded = os.path.join(ROOT, 'shaded.png')
if os.path.islink(root_shaded) or os.path.exists(root_shaded):
    try:
        os.remove(root_shaded)
    except Exception:
        pass
im.filepath_raw = root_shaded
im.file_format = 'PNG'
im.save()
print(f"Saved {root_shaded}", flush=True)
