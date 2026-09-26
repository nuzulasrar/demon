# Animated demon for Three.js

`demon_animated.glb` contains only the demon character and its rig. The studio backdrop, camera, and lights are excluded. Materials and three 2048 × 2048 textures are embedded in the file.

- Animation: `Demon_Idle`, 24 seconds, seamless repeating idle.
- Includes full-body breathing, corrected whole-head glances, arm/grip movement, and wing follow-through.
- Rig: 11 joints, sampled at 24 fps with four skinning influences per vertex.
- Full-detail mesh: 1,000,000 triangles; file size approximately 62 MB (59 MiB).
- Standard GLB: no Draco, Meshopt, or KTX2 decoder setup is required.

## Load and animate

Copy the GLB into your application's public models directory. Install/use your application's `three` dependency and import the provided `load-demon.js` helper:

```js
const demon = await loadDemon(scene, '/models/demon_animated.glb');

// Inside your existing render loop, with elapsed time in seconds:
demon.mixer.update(deltaSeconds);
renderer.render(scene, camera);
```

Provide scene lighting or an environment map to display the PBR materials. Serve the model over your application's HTTP server. The file contains the animation, but your application must advance the mixer to play it.

OBJ cannot contain this skeletal animation. GLB carries the mesh, textures, skeleton, and animation together.

The Blender source remains `/Users/nuzul/Desktop/ag_demo.blend`.

Documentation: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) and [AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html).
