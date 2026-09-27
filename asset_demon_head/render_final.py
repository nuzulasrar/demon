import bpy,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s=bpy.context.scene
mat=bpy.data.materials['Demon | crimson skin, keratin, living embers']
for n in mat.node_tree.nodes:
    if n.type=='VALTORGB':n.color_ramp.elements[1].color=(1,.075,.002,1)
    if n.type=='MATH' and n.operation=='MULTIPLY':n.inputs[1].default_value=5.5
s.render.engine='CYCLES';s.cycles.samples=160;s.cycles.use_denoising=True;s.render.resolution_percentage=100
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='METAL'
    s.cycles.device='GPU' if any(d.type=='METAL' for d in prefs.devices) else 'CPU'
except:s.cycles.device='CPU'
s.camera=bpy.data.objects['CAM 01 • reference front'];s.render.filepath=os.path.join(ROOT,'demon_head_front.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
bpy.ops.render.render(write_still=True)
s.camera=bpy.data.objects['CAM 02 • three quarter'];s.camera.data.type='ORTHO';s.camera.data.ortho_scale=6.25
s.render.filepath=os.path.join(ROOT,'demon_head_three_quarter.png')
bpy.ops.render.render(write_still=True)
s.camera=bpy.data.objects['CAM 01 • reference front'];s.render.filepath=os.path.join(ROOT,'demon_head_front.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
print('FINAL_RENDERS_DONE',flush=True)
