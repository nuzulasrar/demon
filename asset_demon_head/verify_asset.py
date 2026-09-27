import bpy,json,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s=bpy.context.scene
if 'REFERENCE • original supplied image' not in bpy.data.images:
    ref=bpy.data.images.load('/Users/nuzul/Downloads/Gemini_Generated_Image_27jhwi27jhwi27jh.jpeg');ref.name='REFERENCE • original supplied image';ref.use_fake_user=True;ref.pack()
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.shading.use_scene_lights=True
            a.spaces.active.shading.use_scene_world=True
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.region_3d.view_camera_zoom=5
info={'blend':bpy.data.filepath,'engine':s.render.engine,'camera':s.camera.name,'triangles':sum(len(o.data.polygons) for o in s.objects if o.type=='MESH' and 'sculpt' in o.name),'packed_images':[{ 'name':i.name,'size':list(i.size),'packed':bool(i.packed_file)} for i in bpy.data.images if i.type=='IMAGE'],'renders':{f:os.path.getsize(os.path.join(ROOT,f)) for f in ['demon_head_front.png','demon_head_three_quarter.png']}}
assert info['triangles']==1000000
assert all(i['packed'] for i in info['packed_images'])
assert all(v>100000 for v in info['renders'].values())
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
open(os.path.join(ROOT,'verification.json'),'w').write(json.dumps(info,indent=2))
print(json.dumps(info,indent=2))
