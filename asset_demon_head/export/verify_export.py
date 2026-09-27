import bpy,os,json,struct
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'export');path=os.path.join(OUT,'Demon_Head.glb')
with open(path,'rb') as f:
    magic,version,length=struct.unpack('<4sII',f.read(12));size,kind=struct.unpack('<I4s',f.read(8));doc=json.loads(f.read(size))
assert magic==b'glTF' and version==2 and length==os.path.getsize(path)
assert not doc.get('cameras')
assert all('bufferView' in x for x in doc['images'])
assert 'KHR_materials_emissive_strength' in doc.get('extensionsUsed',[])
triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
assert triangles==1000000
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'Demon_Head.blend'))
o=bpy.data.objects['Demon • million-face textured sculpt'];bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=path)
model=[o for o in bpy.context.selected_objects if o.type=='MESH'];assert len(model)==1
assert len(model[0].data.polygons)==1000000
s=bpy.context.scene;s.render.engine='BLENDER_EEVEE';s.render.resolution_percentage=45;s.render.filepath=os.path.join(OUT,'Demon_Head_export_preview.png')
bpy.ops.render.render(write_still=True)
report={'file':path,'size_bytes':length,'triangles':triangles,'embedded_images':len(doc['images']),'materials':len(doc['materials']),'extensions':doc.get('extensionsUsed',[]),'reimport':'passed','preview':s.render.filepath}
open(os.path.join(OUT,'verification.json'),'w').write(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
