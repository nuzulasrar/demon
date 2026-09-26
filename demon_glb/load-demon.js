import { AnimationMixer, LoopRepeat } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Load the character into an existing lit Three.js scene. */
export async function loadDemon(scene, url = '/models/demon_animated.glb') {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  scene.add(model);

  const mixer = new AnimationMixer(model);
  const clip = gltf.animations.find((clip) => clip.name === 'Demon_Idle');
  if (!clip) throw new Error('The Demon_Idle animation is missing.');
  const action = mixer.clipAction(clip);
  action.setLoop(LoopRepeat, Infinity).play();

  // Call mixer.update(deltaSeconds) once per frame in your existing render loop.
  return { model, mixer, action, animations: gltf.animations };
}
