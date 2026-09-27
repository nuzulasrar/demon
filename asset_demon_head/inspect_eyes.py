import bpy,numpy as np
bpy.ops.wm.open_mainfile(filepath='/Users/nuzul/Desktop/Demon_Head_Reference/Demon_Head.blend')
o=bpy.data.objects['model'];m=o.data
im=bpy.data.images['texture_diffuse'];w,h=im.size
pix=np.empty(w*h*4,dtype=np.float32);im.pixels.foreach_get(pix);pix=pix.reshape((h,w,4))
uv=np.empty(len(m.loops)*2,dtype=np.float32);m.uv_layers.active.data.foreach_get('uv',uv);uv=uv.reshape(-1,2)[::8]
vi=np.empty(len(m.loops),dtype=np.int32);m.loops.foreach_get('vertex_index',vi);vi=vi[::8]
vs=np.empty(len(m.vertices)*3,dtype=np.float32);m.vertices.foreach_get('co',vs);vs=vs.reshape(-1,3)[vi]
colors=pix[(uv[:,1]*h).astype(int).clip(0,h-1),(uv[:,0]*w).astype(int).clip(0,w-1),:3]
score=colors[:,0]*colors[:,1]/(colors[:,2]+.05)
for side in [-1,1]:
    mask=(vs[:,0]*side>.055)&(abs(vs[:,0])<.16)&(vs[:,2]>-.13)&(vs[:,2]<0)&(vs[:,1]<-.28)&(colors[:,1]>.55)&(colors[:,2]>.45)
    idx=np.where(mask)[0];idx=idx[np.argsort(score[idx])[-100:]]
    print('EYE_CANDIDATE',side,'LOCAL_MEAN',vs[idx].mean(axis=0).tolist(),'LOCAL_MIN',vs[idx].min(axis=0).tolist(),'LOCAL_MAX',vs[idx].max(axis=0).tolist(),'COLOR',colors[idx].mean(axis=0).tolist())
print('MATRIX',list(map(list,o.matrix_world)))
