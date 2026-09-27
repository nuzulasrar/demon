import bpy, json, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=args[0])
for obj in bpy.context.scene.objects:
    if obj.type=='MESH':
        box=[obj.matrix_world@Vector(v) for v in obj.bound_box]
        print('MODEL',json.dumps({'name':obj.name,'vertices':len(obj.data.vertices),'polygons':len(obj.data.polygons),'min':[min(v[i] for v in box) for i in range(3)],'max':[max(v[i] for v in box) for i in range(3)],'materials':[m.name for m in obj.data.materials]}))
for mat in bpy.data.materials:
    if mat.use_nodes:
        print('MATERIAL',mat.name,[(n.name,n.type) for n in mat.node_tree.nodes])
for img in bpy.data.images:
    print('IMAGE',img.name,list(img.size))
