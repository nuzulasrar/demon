import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BASE = import.meta.env.BASE_URL || '/';
const assetPath = (path) => `${BASE}${path.replace(/^\//, '')}`;

export default function DemonCanvas({
  renderMode,
  isAutoRotate,
  showWireframe,
  emissiveIntensity,
  lightIntensity,
  flipTextureY,
  focusTarget = 'both',
  isAnimating = true,
  animSpeed = 1.0,
  onFpsUpdate,
  canvasRefCallback,
  onResetViewCallback
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderMode,
    isAutoRotate,
    showWireframe,
    emissiveIntensity,
    lightIntensity,
    flipTextureY,
    focusTarget,
    isAnimating,
    animSpeed
  });

  const [loading, setLoading] = useState(true);
  const [loadStage, setLoadStage] = useState('Initializing scene...');
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  // Sync state ref
  useEffect(() => {
    stateRef.current.renderMode = renderMode;
    stateRef.current.isAutoRotate = isAutoRotate;
    stateRef.current.showWireframe = showWireframe;
    stateRef.current.emissiveIntensity = emissiveIntensity;
    stateRef.current.lightIntensity = lightIntensity;
    stateRef.current.flipTextureY = flipTextureY;
    stateRef.current.focusTarget = focusTarget;
    stateRef.current.isAnimating = isAnimating;
    stateRef.current.animSpeed = animSpeed;
  }, [
    renderMode,
    isAutoRotate,
    showWireframe,
    emissiveIntensity,
    lightIntensity,
    flipTextureY,
    focusTarget,
    isAnimating,
    animSpeed
  ]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a090e);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    camera.position.set(0, 0.35, 3.8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    if (canvasRefCallback) {
      canvasRefCallback(renderer.domElement);
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 12;
    controls.target.set(0, 0.15, 0);

    const FOCUS_CONFIG = {
      both: {
        target: new THREE.Vector3(0, 0.15, 0),
        camera: new THREE.Vector3(0, 0.35, 3.8)
      },
      demon: {
        target: new THREE.Vector3(-1.15, -0.05, 0),
        camera: new THREE.Vector3(-1.15, 0.15, 2.3)
      },
      orc: {
        target: new THREE.Vector3(1.05, 0.15, 0),
        camera: new THREE.Vector3(1.05, 0.35, 2.4)
      }
    };

    let targetCamPos = new THREE.Vector3(0, 0.35, 3.8);
    let targetLookAt = new THREE.Vector3(0, 0.15, 0);
    let isFocusAnimating = false;
    let prevFocusTarget = stateRef.current.focusTarget;

    if (onResetViewCallback) {
      onResetViewCallback(() => {
        const config = FOCUS_CONFIG[stateRef.current.focusTarget] || FOCUS_CONFIG.both;
        targetCamPos.copy(config.camera);
        targetLookAt.copy(config.target);
        isFocusAnimating = true;
      });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xfff6ed, 2.4);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 3;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Cool fill light
    const fillLight = new THREE.DirectionalLight(0x88a5cc, 1.3);
    fillLight.position.set(-4, 3, 3);
    scene.add(fillLight);

    // Rim light from behind
    const rimLight = new THREE.DirectionalLight(0xff9944, 1.8);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Secondary cool rim light
    const coolRimLight = new THREE.DirectionalLight(0x44aaff, 1.2);
    coolRimLight.position.set(3, 3, -3);
    scene.add(coolRimLight);

    // Ground Grid & Floor
    const groundY = -0.8;
    const gridHelper = new THREE.GridHelper(10, 30, 0x444455, 0x1f1f28);
    gridHelper.position.y = groundY;
    scene.add(gridHelper);

    // Soft shadow receiver plane
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = groundY - 0.001;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Models container group
    const modelsGroup = new THREE.Group();
    scene.add(modelsGroup);


    // Textures collection
    const textureLoader = new THREE.TextureLoader();
    const demonTextures = {};
    const orcTextures = {};

    const loadTex = (url, isColor = false, flipY = false) => {
      return new Promise((resolve) => {
        textureLoader.load(
          url,
          (tex) => {
            tex.flipY = flipY;
            tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
            resolve(tex);
          },
          undefined,
          (err) => {
            console.warn('Texture failed to load:', url, err);
            resolve(null);
          }
        );
      });
    };

    let demonMesh = null;
    let demonMaterial = null;
    let demonScene = null;
    let mixerDemon = null;
    let actionDemon = null;
    const origDemonTextures = {};
    let orcMesh = null;
    let orcMaterial = null;

    const loadAllAssets = async () => {
      try {
        setLoadStage('Loading Demon and Orc textures...');
        setLoadProgress(15);

        // Load Demon textures (GLTF convention: flipY = false)
        const demonTexPromise = Promise.all([
          loadTex(assetPath('asset_demon/texture_diffuse.png'), true, false),
          loadTex(assetPath('asset_demon/texture_normal.png'), false, false),
          loadTex(assetPath('asset_demon/texture_emissive.png'), true, false),
          loadTex(assetPath('asset_demon/texture_roughness.png'), false, false),
          loadTex(assetPath('asset_demon/texture_metallic.png'), false, false),
          loadTex(assetPath('asset_demon/shaded.png'), true, false)
        ]);

        // Load Orc textures (OBJ convention: flipY = true)
        const orcTexPromise = Promise.all([
          loadTex(assetPath('asset_orc/texture_diffuse.png'), true, true),
          loadTex(assetPath('asset_orc/texture_normal.png'), false, true),
          loadTex(assetPath('asset_orc/texture_roughness.png'), false, true),
          loadTex(assetPath('asset_orc/texture_metallic.png'), false, true),
          loadTex(assetPath('asset_orc/texture_pbr.png'), false, true),
          loadTex(assetPath('asset_orc/shaded.png'), true, true)
        ]);

        const [
          [dDiffuse, dNormal, dEmissive, dRoughness, dMetallic, dShaded],
          [oDiffuse, oNormal, oRoughness, oMetallic, oPbr, oShaded]
        ] = await Promise.all([demonTexPromise, orcTexPromise]);

        demonTextures.diffuse = dDiffuse;
        demonTextures.normal = dNormal;
        demonTextures.emissive = dEmissive;
        demonTextures.roughness = dRoughness;
        demonTextures.metallic = dMetallic;
        demonTextures.shaded = dShaded;

        orcTextures.diffuse = oDiffuse;
        orcTextures.normal = oNormal;
        orcTextures.roughness = oRoughness;
        orcTextures.metallic = oMetallic;
        orcTextures.pbr = oPbr;
        orcTextures.shaded = oShaded;

        setLoadStage('Loading animated Demon (Rigged 11-joint skeleton & 24s Idle)...');
        setLoadProgress(45);

        const gltfLoader = new GLTFLoader();
        const loadDemonModel = new Promise((resolve, reject) => {
          gltfLoader.load(
            assetPath('demon_glb/demon_animated.glb'),
            (gltf) => {
              demonScene = gltf.scene;

              gltf.scene.traverse((child) => {
                if ((child.isSkinnedMesh || child.isMesh) && !demonMesh) {
                  demonMesh = child;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });

              if (!demonMesh) {
                reject(new Error('SkinnedMesh not found in demon_animated.glb'));
                return;
              }

              demonMaterial = demonMesh.material;
              if (demonMaterial) {
                origDemonTextures.diffuse = demonMaterial.map || demonTextures.diffuse || null;
                origDemonTextures.normal = demonMaterial.normalMap || demonTextures.normal || null;
                origDemonTextures.roughness = demonMaterial.roughnessMap || demonTextures.roughness || null;
                origDemonTextures.metallic = demonMaterial.metalnessMap || demonTextures.metallic || null;
                origDemonTextures.emissive = demonMaterial.emissiveMap || demonTextures.emissive || null;

                demonMaterial.emissive = new THREE.Color(0xffffff);
                demonMaterial.emissiveIntensity = 1.0;
              }

              // Initialize AnimationMixer for Demon's 24s idle cycle
              mixerDemon = new THREE.AnimationMixer(gltf.scene);
              const clip = gltf.animations.find((c) => c.name === 'Demon_Idle') || gltf.animations[0];
              if (clip) {
                actionDemon = mixerDemon.clipAction(clip);
                actionDemon.setLoop(THREE.LoopRepeat, Infinity);
                actionDemon.play();
              }

              gltf.scene.scale.set(1.25, 1.25, 1.25);
              gltf.scene.position.set(-1.15, groundY, 0);
              gltf.scene.rotation.y = 0.12;

              modelsGroup.add(gltf.scene);
              resolve();
            },
            (xhr) => {
              if (xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 30);
                setLoadProgress(45 + percent);
              }
            },
            (err) => reject(err)
          );
        });

        await loadDemonModel;

        setLoadStage('Decoding Orc 3D mesh (OBJ & Tangents)...');
        setLoadProgress(75);

        // Load Orc OBJ model
        const objLoader = new OBJLoader();
        const loadOrcModel = new Promise((resolve, reject) => {
          objLoader.load(
            assetPath('asset_orc/base.obj'),
            (obj) => {
              let rawGeometry = null;
              obj.traverse((child) => {
                if (child.isMesh && !rawGeometry) {
                  rawGeometry = child.geometry;
                }
              });

              if (!rawGeometry) {
                reject(new Error('Geometry not found in orc base.obj'));
                return;
              }

              // Index vertices and preserve authentic Blender normals
              const indexedGeometry = mergeVertices(rawGeometry);
              // Setup uv2 for Ambient Occlusion
              indexedGeometry.setAttribute('uv2', indexedGeometry.attributes.uv);
              // Compute tangents for optimal normal map lighting
              indexedGeometry.computeTangents();

              orcMaterial = new THREE.MeshStandardMaterial({
                map: orcTextures.diffuse || null,
                normalMap: orcTextures.normal || null,
                normalScale: new THREE.Vector2(1.0, 1.0),
                roughnessMap: orcTextures.pbr || orcTextures.roughness || null,
                roughness: 1.0,
                metalnessMap: orcTextures.pbr || orcTextures.metallic || null,
                metalness: 1.0,
                aoMap: orcTextures.pbr || null,
                aoMapIntensity: 1.0,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
              });

              orcMesh = new THREE.Mesh(indexedGeometry, orcMaterial);
              orcMesh.castShadow = true;
              orcMesh.receiveShadow = true;

              // Orc bounding box Y is [0.0, 1.897]. Scale 0.95 gives ~1.80m height
              orcMesh.scale.set(0.95, 0.95, 0.95);
              orcMesh.position.set(1.05, groundY, 0);
              orcMesh.rotation.y = -0.12;

              modelsGroup.add(orcMesh);
              resolve();
            },
            undefined,
            (err) => reject(err)
          );
        });

        await loadOrcModel;

        setLoadProgress(100);
        setLoading(false);
      } catch (err) {
        console.error('Asset load error:', err);
        setErrorMsg(err.message);
        setLoading(false);
      }
    };

    loadAllAssets();

    // Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    let animId;
    const startTime = performance.now();
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let prevRenderMode = null;
    let prevWireframe = null;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      try {
        const now = performance.now();
        const delta = Math.min((now - lastFrameTime) * 0.001, 0.1);
        lastFrameTime = now;

        // FPS
        frameCount++;
        if (now - lastFpsTime >= 500) {
          const fpsVal = Math.round((frameCount * 1000) / (now - lastFpsTime));
          if (onFpsUpdate) onFpsUpdate(fpsVal);
          frameCount = 0;
          lastFpsTime = now;
        }

        // Check focus changes
        if (stateRef.current.focusTarget !== prevFocusTarget) {
          prevFocusTarget = stateRef.current.focusTarget;
          const config = FOCUS_CONFIG[prevFocusTarget] || FOCUS_CONFIG.both;
          targetCamPos.copy(config.camera);
          targetLookAt.copy(config.target);
          isFocusAnimating = true;
        }

        // Smooth camera interpolation when switching focus
        if (isFocusAnimating) {
          camera.position.lerp(targetCamPos, 0.08);
          controls.target.lerp(targetLookAt, 0.08);
          if (
            camera.position.distanceTo(targetCamPos) < 0.01 &&
            controls.target.distanceTo(targetLookAt) < 0.01
          ) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            isFocusAnimating = false;
          }
        }

        controls.update();

        // Auto rotation of both models around center
        if (modelsGroup && stateRef.current.isAutoRotate) {
          modelsGroup.rotation.y += 0.006;
        }

        // Procedural Idle Animation (Breathing, Sway, Fire & Ember Physics)
        const isAnim = stateRef.current.isAnimating;
        const speed = stateRef.current.animSpeed;
        const t = ((now - startTime) * 0.001) * speed;

        if (isAnim) {
          // --- 1. Demon Skeletal Animation ---
          if (mixerDemon) {
            mixerDemon.update(delta * speed);
          }

          // Magma emissive pulse in sync with respiration
          if (demonMaterial && stateRef.current.renderMode === 'pbr') {
            const eBase = stateRef.current.emissiveIntensity;
            const pulse = 0.8 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.6));
            demonMaterial.emissiveIntensity = eBase * pulse;
          }

          // --- 2. Orc Idle Animation ---
          if (orcMesh) {
            // Independent breathing cycle and warrior weight shifting
            const oBreath = Math.sin(t * 2.0 + 1.4);
            const oBreathCos = Math.cos(t * 2.0 + 1.4);
            const oSway = Math.sin(t * 1.0 + 0.7);

            // Deep chest expansion
            const oScaleXZ = 0.95 * (1 + 0.015 * oBreath);
            const oScaleY = 0.95 * (1 + 0.008 * oBreath);
            orcMesh.scale.set(oScaleXZ, oScaleY, oScaleXZ);

            // Grounded weight shift and forward battle posture
            orcMesh.position.y = groundY + 0.006 * (oBreath * 0.5 + 0.5);
            orcMesh.rotation.y = -0.12 + 0.02 * oSway;
            orcMesh.rotation.z = -0.014 * oSway;
            orcMesh.rotation.x = 0.01 * oBreathCos;
          }


        } else {
          // Paused pose
          if (mixerDemon) {
            mixerDemon.update(0);
          }
          if (demonScene) {
            demonScene.scale.set(1.25, 1.25, 1.25);
            demonScene.position.set(-1.15, groundY, 0);
            demonScene.rotation.set(0, 0.12, 0);
            if (demonMaterial && stateRef.current.renderMode === 'pbr') {
              demonMaterial.emissiveIntensity = stateRef.current.emissiveIntensity;
            }
          }
          if (orcMesh) {
            orcMesh.scale.set(0.95, 0.95, 0.95);
            orcMesh.position.set(1.05, groundY, 0);
            orcMesh.rotation.set(0, -0.12, 0);
          }
        }

        // Dynamic light intensity (with subtle organic torch flicker)
        const lightMult = stateRef.current.lightIntensity;
        const flicker = isAnim
          ? 1.0 + 0.03 * Math.sin(t * 7.4) + 0.015 * Math.cos(t * 11.2)
          : 1.0;

        ambientLight.intensity = 0.65 * lightMult;
        keyLight.intensity = 2.4 * lightMult * flicker;
        fillLight.intensity = 1.3 * lightMult;
        rimLight.intensity = 1.8 * lightMult * flicker;
        coolRimLight.intensity = 1.2 * lightMult;

        // Handle flipY dynamically: Demon is false by default, Orc is true by default
        const isFlipped = stateRef.current.flipTextureY;
        const demonTargetFlip = isFlipped ? true : false;
        const orcTargetFlip = isFlipped ? false : true;

        Object.values(demonTextures).forEach((tex) => {
          if (tex && tex.flipY !== demonTargetFlip) {
            tex.flipY = demonTargetFlip;
            tex.needsUpdate = true;
          }
        });

        Object.values(orcTextures).forEach((tex) => {
          if (tex && tex.flipY !== orcTargetFlip) {
            tex.flipY = orcTargetFlip;
            tex.needsUpdate = true;
          }
        });

        // Update materials according to renderMode
        const mode = stateRef.current.renderMode;
        const eIntensity = stateRef.current.emissiveIntensity;
        const wire = stateRef.current.showWireframe;

        const modeOrWireChanged = mode !== prevRenderMode || wire !== prevWireframe;
        if (modeOrWireChanged) {
          prevRenderMode = mode;
          prevWireframe = wire;
          if (demonMaterial) demonMaterial.needsUpdate = true;
          if (orcMaterial) orcMaterial.needsUpdate = true;
        }

        const updateMaterial = (material, textures, isDemon) => {
          if (!material) return;
          material.wireframe = wire;

          if (mode === 'pbr') {
            material.map = isDemon ? (origDemonTextures.diffuse || textures.diffuse) : (textures.diffuse || null);
            material.normalMap = isDemon ? (origDemonTextures.normal || textures.normal) : (textures.normal || null);
            material.normalScale.set(1, 1);
            if (isDemon) {
              material.emissiveMap = origDemonTextures.emissive || textures.emissive || null;
              material.emissive.set(0xffffff);
              if (!isAnim) material.emissiveIntensity = eIntensity;
              material.roughnessMap = origDemonTextures.roughness || textures.roughness || null;
              material.metalnessMap = origDemonTextures.metallic || textures.metallic || null;
              material.aoMap = null;
            } else {
              material.emissiveMap = null;
              material.emissive.set(0x000000);
              material.emissiveIntensity = 0.0;
              // For Orc: use texture_pbr (packed AO, Roughness, Metalness)
              if (textures.pbr) {
                material.roughnessMap = textures.pbr;
                material.metalnessMap = textures.pbr;
                material.aoMap = textures.pbr;
                material.aoMapIntensity = 1.0;
              } else {
                material.roughnessMap = textures.roughness || null;
                material.metalnessMap = textures.metallic || null;
                material.aoMap = null;
              }
            }
            material.roughness = 1.0;
            material.metalness = 1.0;
            material.color.set(0xffffff);
          } else if (mode === 'diffuse') {
            material.map = isDemon ? (origDemonTextures.diffuse || textures.diffuse) : (textures.diffuse || null);
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.roughness = 0.85;
            material.metalness = 0.05;
            material.color.set(0xffffff);
          } else if (mode === 'shaded') {
            material.map = textures.shaded || (isDemon ? origDemonTextures.diffuse : textures.diffuse) || null;
            material.normalMap = (isDemon ? origDemonTextures.normal : textures.normal) || null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.roughness = 0.5;
            material.metalness = 0.1;
            material.color.set(0xffffff);
          } else if (mode === 'normal') {
            material.map = (isDemon ? origDemonTextures.normal : textures.normal) || null;
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.roughness = 0.5;
            material.metalness = 0.0;
            material.color.set(0xffffff);
          } else if (mode === 'roughness') {
            material.map = (isDemon ? origDemonTextures.roughness : textures.roughness) || null;
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.color.set(0xffffff);
          } else if (mode === 'metallic') {
            material.map = (isDemon ? origDemonTextures.metallic : textures.metallic) || null;
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.color.set(0xffffff);
          } else if (mode === 'clay') {
            material.map = null;
            material.normalMap = (isDemon ? origDemonTextures.normal : textures.normal) || null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.roughness = 0.85;
            material.metalness = 0.05;
            material.color.set(0x52545c);
          }
        };

        if (demonMesh && demonMaterial) {
          updateMaterial(demonMaterial, demonTextures, true);
        }
        if (orcMesh && orcMaterial) {
          updateMaterial(orcMaterial, orcTextures, false);
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error('Render loop error:', err);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (mixerDemon) {
        mixerDemon.stopAllAction();
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      gridHelper.geometry.dispose();
      floorGeo.dispose();
      floorMat.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Canvas Mount */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: 'grab'
        }}
      />

      {/* Loading Screen */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a090e',
            zIndex: 100
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#ff4d26',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '20px'
            }}
          />
          <div
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#f5f3f4',
              letterSpacing: '0.04em',
              marginBottom: '8px'
            }}
          >
            Loading Demon & Orc 3D Models...
          </div>
          <div
            style={{
              fontSize: '0.82rem',
              color: '#9a94a0',
              marginBottom: '20px',
              textAlign: 'center',
              maxWidth: '460px'
            }}
          >
            {loadStage}
          </div>
          <div
            style={{
              width: '280px',
              height: '5px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${loadProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff4d26, #ff8c42)',
                transition: 'width 0.25s ease'
              }}
            />
          </div>
          <span
            style={{
              marginTop: '10px',
              fontSize: '0.8rem',
              color: '#777',
              fontFamily: 'monospace'
            }}
          >
            {loadProgress}%
          </span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a090e',
            zIndex: 100,
            padding: '24px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              color: '#ff4444',
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '8px'
            }}
          >
            Failed to Load 3D Models
          </div>
          <div
            style={{
              color: '#888',
              fontSize: '0.85rem',
              maxWidth: '420px',
              marginBottom: '18px',
              lineHeight: 1.5
            }}
          >
            {errorMsg}
          </div>
          <button
            className="glass-btn active"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
