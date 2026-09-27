"""Build a packed, editable Blender studio around the reference reconstruction."""
import bpy, math, os, sys, json
from mathutils import Vector, Quaternion
ROOT=os.path.dirname(os.path.abspath(__file__))
MODEL=os.path.join(ROOT,'demon_head_source.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=MODEL)
scene=bpy.context.scene
asset=bpy.data.collections.new('01 • DEMON | textured reconstruction')
scene.collection.children.link(asset)
meshes=[o for o in scene.objects if o.type=='MESH']
for obj in list(scene.objects):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    asset.objects.link(obj)
for o in meshes:
    for p in o.data.polygons: p.use_smooth=True
    o['source']='Image-guided Hyper3D reconstruction; studio finish in Blender'
# Normalize the complete asset without changing its mesh or UVs.
points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
lo=Vector([min(v[i] for v in points) for i in range(3)])
hi=Vector([max(v[i] for v in points) for i in range(3)])
center=(lo+hi)*.5
scale=5.5/(hi.z-lo.z)
root=bpy.data.objects.new('DEMON • master transform',None)
asset.objects.link(root)
for obj in list(asset.objects):
    if obj!=root and obj.parent is None: obj.parent=root
root.scale=(scale,)*3
root.location=(-center.x*scale,-center.y*scale,-lo.z*scale)
bpy.context.view_layer.update()
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for n in mat.node_tree.nodes:
        if n.type=='BSDF_PRINCIPLED':
            n.inputs['IOR'].default_value=1.46
            if not n.inputs['Roughness'].is_linked: n.inputs['Roughness'].default_value=.48
            if not n.inputs['Metallic'].is_linked: n.inputs['Metallic'].default_value=0
            n.inputs['Subsurface Weight'].default_value=.025
            n.inputs['Subsurface Radius'].default_value=(1,.28,.16)
            n.inputs['Subsurface Scale'].default_value=.065
            n.inputs['Coat Weight'].default_value=.035
            n.inputs['Coat Roughness'].default_value=.4
studio=bpy.data.collections.new('02 • STUDIO | cameras and softboxes')
scene.collection.children.link(studio)
def move(obj,col):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    col.objects.link(obj)
def track(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def camera(name,pos,target,lens=70):
    data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data);studio.objects.link(obj)
    obj.location=pos;track(obj,target);data.lens=lens;data.sensor_width=36
    data.clip_end=200;return obj
front=camera('CAM 01 • reference front',(0,-15.4,2.95),(0,0,2.75),70)
three=camera('CAM 02 • three quarter',(8.0,-14.5,3.6),(0,0,2.75),72)
back=camera('CAM 03 • rear inspection',(8,14,3.7),(0,0,2.75),72)
scene.camera=front
def area(name,pos,target,power,color,size,shape='DISK',size_y=None):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape=shape;d.size=size
    if size_y is not None and hasattr(d,'size_y'):d.size_y=size_y
    o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=pos;track(o,target);return o
area('Key • large neutral softbox',(-4,-6,8),(0,0,3),950,(1,.89,.82),5)
area('Fill • frontal silk',(4,-5,4),(0,0,2.5),550,(.82,.9,1),4)
area('Rim • horn edges',(1,3,7),(0,0,3),1100,(1,.76,.67),3)
area('Lower bounce',(-1,-4,.5),(0,0,2),90,(1,.55,.4),3)
world=bpy.data.worlds.new('Neutral gray studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.19,.175,.18,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.48
scene.world=world
# A large vertical backdrop keeps a clean reference-like gray behind the bust.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,6,3),rotation=(math.pi/2,0,0))
bg=bpy.context.object;bg.name='Studio • matte gray backdrop';move(bg,studio)
mat=bpy.data.materials.new('Backdrop • warm gray');mat.diffuse_color=(.235,.216,.225,1);mat.use_nodes=True
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=mat.diffuse_color;p.inputs['Roughness'].default_value=1
bg.data.materials.append(mat)
# Packed reference is available in the image editor; it is never rendered on the model.
refpath='/Users/nuzul/Downloads/Gemini_Generated_Image_27jhwi27jhwi27jh.jpeg'
if os.path.exists(refpath):
    ref=bpy.data.images.load(refpath);ref.name='REFERENCE • original supplied image';ref.use_fake_user=True;ref.pack()
scene.render.engine='CYCLES'
scene.cycles.samples=192;scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.015
scene.cycles.max_bounces=8
scene.render.resolution_x=1800;scene.render.resolution_y=1800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
# Metal on Apple Silicon when available; CPU remains a valid fallback.
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='METAL'
    if any(d.type=='METAL' for d in prefs.devices):scene.cycles.device='GPU'
except Exception as exc: print('GPU fallback:',exc)
# Subtle optical bloom, applied only to genuinely bright emissive details.
comp=bpy.data.node_groups.new('Studio • subtle eye bloom','CompositorNodeTree')
scene.compositing_node_group=comp
comp.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor')
rl=comp.nodes.new('CompositorNodeRLayers');gl=comp.nodes.new('CompositorNodeGlare');gl.inputs['Type'].default_value='Fog Glow';gl.inputs['Quality'].default_value='High';gl.inputs['Strength'].default_value=.18
if 'Threshold' in gl.inputs:gl.inputs['Threshold'].default_value=1.5
out=comp.nodes.new('NodeGroupOutput')
comp.links.new(rl.outputs['Image'],gl.inputs['Image']);comp.links.new(gl.outputs['Image'],out.inputs['Image'])
rl.location=(-350,0);gl.location=(-100,0);out.location=(170,0)
for screen in bpy.data.screens:
    for a in screen.areas:
        if a.type=='VIEW_3D':
            a.spaces.active.region_3d.view_perspective='CAMERA'
            a.spaces.active.shading.type='MATERIAL'
            a.spaces.active.overlay.show_overlays=False
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
scene['Reference']='Supplied Gemini_Generated_Image_27jhwi27jhwi27jh.jpeg'
scene['Reconstruction note']='Single-image reconstruction. Unseen surfaces are inferred; facial and horn fidelity should be assessed against the packed reference.'
scene['Asset polygons']=sum(len(o.data.polygons) for o in meshes)
scene.render.filepath=os.path.join(ROOT,'demon_head_front.png')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
# Quick composition proof before final quality renders.
scene.cycles.samples=32;scene.render.resolution_percentage=45
scene.render.filepath=os.path.join(ROOT,'preview_front.png')
bpy.ops.render.render(write_still=True)
print('STUDIO_READY',ROOT)
