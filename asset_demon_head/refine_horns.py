import bpy,numpy as np,os
ROOT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
s=bpy.context.scene;o=bpy.data.objects['Demon • million-face textured sculpt'];m=o.data
v=np.empty(len(m.vertices)*3,dtype=np.float32);m.vertices.foreach_get('co',v);v=v.reshape(-1,3)
def ramp(x,a,b):
    t=np.clip((x-a)/(b-a),0,1);return t*t*(3-2*t)
x=abs(v[:,0]);z=v[:,2]
mask=np.maximum(ramp(x,.195,.24)*ramp(z,-.035,.055),ramp(x,.135,.19)*ramp(z,.18,.26)).astype(np.float32)
a=m.attributes.new('Horn Keratin Mask','FLOAT','POINT');a.data.foreach_set('value',mask)
nt=m.materials[0].node_tree;n=nt.nodes;l=nt.links;p=next(v for v in n if v.type=='BSDF_PRINCIPLED')
a=n.new('ShaderNodeAttribute');a.attribute_name='Horn Keratin Mask';a.location=(50,1100);a.label='Horn material isolation'
old=p.inputs['Base Color'].links[0].from_socket
mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[2].default_value=(.30,.16,.20,1);mix.label='Black-maroon horn keratin';mix.location=(400,340);l.new(a.outputs['Fac'],mix.inputs[0]);l.new(old,mix.inputs[1]);l.new(mix.outputs[0],p.inputs['Base Color'])
r=n.new('ShaderNodeMapRange');r.inputs['To Min'].default_value=.32;r.inputs['To Max'].default_value=.17;l.new(a.outputs['Fac'],r.inputs['Value']);l.new(r.outputs[0],p.inputs['Specular IOR Level'])
for nd in n:
    if nd.type=='BUMP':nd.inputs['Distance'].default_value=.008
rim=bpy.data.objects['Rim • horn edges'].data;rim.color=(1,.36,.40);rim.energy=650
s.world.node_tree.nodes.get('Background.001').inputs['Color'].default_value=(.21,.19,.20,1)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
