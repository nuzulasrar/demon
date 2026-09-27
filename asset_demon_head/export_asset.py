import bpy, os, json
from mathutils import Matrix
ROOT=os.path.dirname(os.path.abspath(__file__));OUT=os.path.join(ROOT,'export');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s=bpy.context.scene;o=bpy.data.objects['Demon • million-face textured sculpt']
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
mat=o.data.materials[0];nt=mat.node_tree;n=nt.nodes;l=nt.links
p=next(v for v in n if v.type=='BSDF_PRINCIPLED');out=next(v for v in n if v.type=='OUTPUT_MATERIAL')
original_output=out.inputs['Surface'].links[0].from_socket
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=8
s.render.bake.use_selected_to_active=False;s.render.bake.margin=12;s.render.bake.use_clear=True
images={}
def bake_socket(key,socket,size=2048,color=True):
    print('BAKING',key,flush=True)
    im=bpy.data.images.new('Demon_'+key,width=size,height=size,alpha=False,float_buffer=False)
    im.colorspace_settings.name='sRGB' if color else 'Non-Color'
    tex=n.new('ShaderNodeTexImage');tex.image=im;n.active=tex
    emit=n.new('ShaderNodeEmission');emit.inputs['Strength'].default_value=1
    l.new(socket,emit.inputs['Color']);l.new(emit.outputs[0],out.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT')
    l.new(original_output,out.inputs['Surface']);n.remove(emit)
    im.filepath_raw=os.path.join(OUT,'Demon_'+key+'.png');im.file_format='PNG';im.save()
    images[key]=im
    print('BAKED',key,flush=True)
bake_socket('BaseColor',p.inputs['Base Color'].links[0].from_socket)
bake_socket('Roughness',p.inputs['Roughness'].links[0].from_socket,color=False)
# Normalize emission into an LDR texture and retain HDR intensity as a glTF factor.
strength=p.inputs['Emission Strength'].links[0].from_socket
norm=n.new('ShaderNodeMath');norm.operation='DIVIDE';norm.inputs[1].default_value=5.5;l.new(strength,norm.inputs[0])
em=n.new('ShaderNodeMixRGB');em.blend_type='MULTIPLY';em.inputs[0].default_value=1
l.new(p.inputs['Emission Color'].links[0].from_socket,em.inputs[1]);l.new(norm.outputs[0],em.inputs[2])
bake_socket('Emission',em.outputs[0])
print('BAKING Normal',flush=True)
im=bpy.data.images.new('Demon_Normal',width=4096,height=4096,alpha=False,float_buffer=False);im.colorspace_settings.name='Non-Color'
tex=n.new('ShaderNodeTexImage');tex.image=im;n.active=tex
s.render.bake.normal_space='TANGENT';bpy.ops.object.bake(type='NORMAL')
im.filepath_raw=os.path.join(OUT,'Demon_Normal.png');im.file_format='PNG';im.save();images['Normal']=im
print('BAKED Normal',flush=True)
# Export a portable, texture-only material. The original Blender scene is untouched.
portable=bpy.data.materials.new('DemonHead_PBR');portable.use_nodes=True
pn=portable.node_tree.nodes;pl=portable.node_tree.links;bs=pn.get('Principled BSDF')
bs.inputs['Metallic'].default_value=0;bs.inputs['IOR'].default_value=1.46
bs.inputs['Specular IOR Level'].default_value=.25
bs.inputs['Emission Strength'].default_value=5.5
for key,target in [('BaseColor','Base Color'),('Roughness','Roughness'),('Emission','Emission Color')]:
    tex=pn.new('ShaderNodeTexImage');tex.image=images[key];tex.label=key;pl.new(tex.outputs['Color'],bs.inputs[target])
tex=pn.new('ShaderNodeTexImage');tex.image=images['Normal'];nm=pn.new('ShaderNodeNormalMap');pl.new(tex.outputs['Color'],nm.inputs['Color']);pl.new(nm.outputs['Normal'],bs.inputs['Normal'])
o.data.materials.clear();o.data.materials.append(portable)
mw=o.matrix_world.copy();o.parent=None;o.matrix_world=mw;o.name='DemonHead'
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
# Custom high-density masks have been baked and are not needed in the export.
for name in ['Eye Ember Mask','Horn Keratin Mask']:
    attr=o.data.attributes.get(name)
    if attr:o.data.attributes.remove(attr)
path=os.path.join(OUT,'Demon_Head.glb')
bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_image_format='AUTO',export_extras=False)
print('EXPORTED',path,os.path.getsize(path),flush=True)
