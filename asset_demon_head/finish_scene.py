import bpy,numpy as np,os
from mathutils import Vector
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s=bpy.context.scene;o=bpy.data.objects['model'];o.name='Demon • million-face textured sculpt';m=o.data
# A UV-aware corner mask isolates the reconstructed eyes without floating eye geometry.
im=bpy.data.images['texture_diffuse'];w,h=im.size
pix=np.empty(w*h*4,dtype=np.float32);im.pixels.foreach_get(pix);pix=pix.reshape(h,w,4)
uv=np.empty(len(m.loops)*2,dtype=np.float32);m.uv_layers.active.data.foreach_get('uv',uv);uv=uv.reshape(-1,2)
vi=np.empty(len(m.loops),dtype=np.int32);m.loops.foreach_get('vertex_index',vi)
vs=np.empty(len(m.vertices)*3,dtype=np.float32);m.vertices.foreach_get('co',vs);vs=vs.reshape(-1,3)[vi]
c=pix[(uv[:,1]*h).astype(int).clip(0,h-1),(uv[:,0]*w).astype(int).clip(0,w-1),:3]
region=(abs(vs[:,0])>.055)&(abs(vs[:,0])<.155)&(vs[:,2]>-.09)&(vs[:,2]<-.015)&(vs[:,1]<-.28)
mask=(np.clip((np.minimum(c[:,1],c[:,2])-.25)/.45,0,1)*region).astype(np.float32)
attr=m.attributes.new('Eye Ember Mask','FLOAT','CORNER');attr.data.foreach_set('value',mask)
mat=m.materials[0];mat.name='Demon | crimson skin, keratin, living embers';nt=mat.node_tree;n=nt.nodes;l=nt.links
p=next(v for v in n if v.type=='BSDF_PRINCIPLED');p.location=(720,200)
# Keratin and skin are dielectrics, not polished metal.
for name in ['Metallic','Coat Weight']:
    for link in list(p.inputs[name].links):l.remove(link)
    p.inputs[name].default_value=0
p.inputs['Specular IOR Level'].default_value=.32
p.inputs['Subsurface Weight'].default_value=.035
oldrough=p.inputs['Roughness'].links[0].from_socket if p.inputs['Roughness'].is_linked else None
remap=n.new('ShaderNodeMapRange');remap.name='Natural surface roughness';remap.label='Roughness • 0.52 to 0.78';remap.location=(400,30)
remap.inputs['To Min'].default_value=.52;remap.inputs['To Max'].default_value=.78
if oldrough:l.new(oldrough,remap.inputs['Value'])
l.new(remap.outputs[0],p.inputs['Roughness'])
base=p.inputs['Base Color'].links[0].from_socket
mul=n.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;mul.inputs[2].default_value=(.52,.32,.37,1);mul.label='Deep crimson reference grade';mul.location=(140,330);l.new(base,mul.inputs[1]);l.new(mul.outputs[0],p.inputs['Base Color'])
coord=n.new('ShaderNodeTexCoord');coord.location=(-600,-450)
noise=n.new('ShaderNodeTexNoise');noise.location=(-370,-440);noise.inputs['Scale'].default_value=240;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.73;l.new(coord.outputs['Object'],noise.inputs['Vector'])
bump=n.new('ShaderNodeBump');bump.label='Fine skin / horn grain';bump.location=(430,-180);bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.005
if p.inputs['Normal'].is_linked:l.new(p.inputs['Normal'].links[0].from_socket,bump.inputs['Normal'])
l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
a=n.new('ShaderNodeAttribute');a.attribute_name='Eye Ember Mask';a.location=(-380,720);a.label='UV-isolated eye surfaces'
r=n.new('ShaderNodeValToRGB');r.location=(-100,700);r.color_ramp.elements[0].position=0;r.color_ramp.elements[0].color=(.7,.003,.0003,1);r.color_ramp.elements[1].position=.9;r.color_ramp.elements[1].color=(1,.2,.012,1);l.new(a.outputs['Fac'],r.inputs['Fac'])
l.new(r.outputs['Color'],p.inputs['Emission Color'])
strength=n.new('ShaderNodeMath');strength.operation='MULTIPLY';strength.inputs[1].default_value=8;strength.location=(450,580);l.new(a.outputs['Fac'],strength.inputs[0]);l.new(strength.outputs[0],p.inputs['Emission Strength'])
# Eye bounce subtly lights the surrounding brow and cheek.
col=bpy.data.collections.new('03 • EYES | warm light spill');s.collection.children.link(col)
for side,local in [('L',(-.105,-.36,-.049)),('R',(.105,-.38,-.05))]:
    d=bpy.data.lights.new('Eye '+side+' • ember spill','POINT');d.color=(1,.018,.001);d.energy=1.8;d.shadow_soft_size=.065
    ob=bpy.data.objects.new(d.name,d);col.objects.link(ob);ob.location=o.matrix_world@Vector(local)
# Match the evenly colored reference background with a camera-ray world shader.
bpy.data.objects['Studio • matte gray backdrop'].hide_render=True
wn=s.world.node_tree;bg=wn.nodes.get('Background');bg.inputs['Color'].default_value=(.19,.17,.18,1);bg.inputs['Strength'].default_value=.38
cb=wn.nodes.new('ShaderNodeBackground');cb.inputs['Color'].default_value=(.24,.22,.23,1);cb.inputs['Strength'].default_value=1
lp=wn.nodes.new('ShaderNodeLightPath');mix=wn.nodes.new('ShaderNodeMixShader');wn.links.new(lp.outputs['Is Camera Ray'],mix.inputs[0]);wn.links.new(bg.outputs[0],mix.inputs[1]);wn.links.new(cb.outputs[0],mix.inputs[2]);wn.links.new(mix.outputs[0],wn.nodes.get('World Output').inputs['Surface'])
s.camera=bpy.data.objects['CAM 01 • reference front'];s.camera.location=(0,-15.4,2.8);s.camera.rotation_euler=(Vector((0,0,2.75))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.type='ORTHO';s.camera.data.ortho_scale=6.25
bpy.data.objects['Key • large neutral softbox'].data.energy=800
bpy.data.objects['Fill • frontal silk'].data.energy=440
bpy.data.objects['Rim • horn edges'].data.energy=750
s.cycles.device='CPU';s.cycles.samples=160;s.cycles.adaptive_threshold=.012
s.render.resolution_x=1800;s.render.resolution_y=1800;s.render.resolution_percentage=100
s.render.filepath=os.path.join(ROOT,'demon_head_front.png')
s['Finish']='Dielectric PBR correction, micrograin layered over normal map, UV-isolated emissive eyes, packed textures and reference, Cycles studio.'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s.render.engine='BLENDER_EEVEE';s.render.resolution_percentage=55;s.render.filepath=os.path.join(ROOT,'preview_finished.png')
bpy.ops.render.render(write_still=True)
