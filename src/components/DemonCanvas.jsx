import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import CharacterLoadingHUD from './CharacterLoadingHUD';

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
  onResetViewCallback,
  onProgressUpdate
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

  const [characterProgress, setCharacterProgress] = useState({
    demon: { percent: 0, stage: 'Connecting...', loaded: false, error: null },
    orc: { percent: 0, stage: 'Connecting...', loaded: false, error: null },
    orc2: { percent: 0, stage: 'Connecting...', loaded: false, error: null }
  });

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

    // Camera (views Layer 0 for Orcs and Layer 1 for Demon)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 100);
    camera.position.set(0, 0.35, 3.8);
    camera.layers.enable(0);
    camera.layers.enable(1);

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
    // Ground & Height Standards:
    // Old Orc stands from y = -0.8 to y = 1.00208 (total height = 1.80208m)
    // Demon Head bust has raw mesh bounds from y = -2.7502885 to y = 2.7497113 (raw height = 5.50000m)
    const groundY = -0.8;
    const orcTotalHeight = 1.80208445;
    const demonRawHeight = 5.5;
    const demonBaseScale = orcTotalHeight / demonRawHeight; // ~0.3276517
    // Align bottom of Demon Head (geomMinY = -2.7502885) to groundY (-0.80):
    const demonBaseY = groundY - (-2.7502885 * demonBaseScale); // 0.101137

    const getFocusConfig = (currentAspect) => {
      const isPortrait = currentAspect < 1.0;
      // In portrait on smartphones, distance scales so Demon, Old Orc, and New Orc fit horizontally
      const allZ = isPortrait ? Math.max(6.0, 4.5 / Math.max(currentAspect, 0.45)) : 4.6;
      const allConfig = {
        target: new THREE.Vector3(0.2, 0.15, 0),
        camera: new THREE.Vector3(0.2, 0.35, Math.min(allZ, 8.2))
      };
      return {
        all: allConfig,
        both: allConfig,
        demon: {
          target: new THREE.Vector3(-1.75, 0.20, 0),
          camera: new THREE.Vector3(-1.75, 0.35, isPortrait ? 3.0 : 2.5)
        },
        orc: {
          target: new THREE.Vector3(0.25, 0.20, 0),
          camera: new THREE.Vector3(0.25, 0.35, isPortrait ? 3.0 : 2.5)
        },
        orc2: {
          target: new THREE.Vector3(2.15, 0.20, 0),
          camera: new THREE.Vector3(2.15, 0.35, isPortrait ? 3.0 : 2.5)
        }
      };
    };

    const initialConfig = getFocusConfig(width / height);
    const startTarget = initialConfig[stateRef.current.focusTarget] || initialConfig.all;
    camera.position.copy(startTarget.camera);

    let targetCamPos = new THREE.Vector3().copy(startTarget.camera);
    let targetLookAt = new THREE.Vector3().copy(startTarget.target);
    let isFocusAnimating = false;
    let prevFocusTarget = stateRef.current.focusTarget;

    if (onResetViewCallback) {
      onResetViewCallback(() => {
        const config = getFocusConfig(camera.aspect)[stateRef.current.focusTarget] || getFocusConfig(camera.aspect).all;
        targetCamPos.copy(config.camera);
        targetLookAt.copy(config.target);
        isFocusAnimating = true;
      });
    }

    // Lights (Reverted to exact baseline from commits >5 hours ago: d209d57)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    ambientLight.layers.set(0);
    scene.add(ambientLight);

    // Warm key light (right side, focusing on Old Orc & New Orc)
    const keyLight = new THREE.DirectionalLight(0xfff6ed, 2.4);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.layers.set(0);
    scene.add(keyLight);

    // Cool fill light (original cool tint & intensity from d209d57)
    const fillLight = new THREE.DirectionalLight(0x88a5cc, 1.3);
    fillLight.position.set(-4, 3, 3);
    fillLight.layers.set(0);
    scene.add(fillLight);

    // Rim light from behind (original from d209d57)
    const rimLight = new THREE.DirectionalLight(0xff9944, 1.8);
    rimLight.position.set(0, 4, -4);
    rimLight.layers.set(0);
    scene.add(rimLight);

    // Secondary cool rim light (original from d209d57)
    const coolRimLight = new THREE.DirectionalLight(0x44aaff, 1.2);
    coolRimLight.position.set(3, 3, -3);
    coolRimLight.layers.set(0);
    scene.add(coolRimLight);

    // Dedicated Demon Lights (Layer 1 only: perfectly illuminates Demon Head, ZERO spill onto Orcs)
    const demonKeyLight = new THREE.DirectionalLight(0xfff2e6, 2.2);
    demonKeyLight.position.set(-3.5, 4.0, 4.0);
    demonKeyLight.castShadow = true;
    demonKeyLight.shadow.mapSize.width = 1024;
    demonKeyLight.shadow.mapSize.height = 1024;
    demonKeyLight.shadow.bias = -0.0005;
    demonKeyLight.layers.set(1);
    scene.add(demonKeyLight);

    // Warm Demon Chin & Neck Bounce Light (Layer 1 only)
    const demonBounceLight = new THREE.DirectionalLight(0xff7744, 0.85);
    demonBounceLight.position.set(-1.75, -1.0, 2.5);
    demonBounceLight.layers.set(1);
    scene.add(demonBounceLight);

    // Demon Ambient Light lift (Layer 1 only: 0.65 + 0.20 = 0.85 total ambient for Demon Head)
    const demonAmbientLight = new THREE.AmbientLight(0xffffff, 0.20);
    demonAmbientLight.layers.set(1);
    scene.add(demonAmbientLight);

    // Ground Grid & Floor
    const gridHelper = new THREE.GridHelper(14, 35, 0x444455, 0x1f1f28);
    gridHelper.position.y = groundY;
    scene.add(gridHelper);

    // Soft shadow receiver plane
    const floorGeo = new THREE.PlaneGeometry(16, 12);
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
    const orc2Textures = {};

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
    let orcMesh = null;
    let orcMaterial = null;
    let orc2Mesh = null;
    let orc2Material = null;

    const updateCharProgress = (key, update) => {
      setCharacterProgress((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...update }
      }));
      if (onProgressUpdate) {
        onProgressUpdate((prev) => ({
          ...prev,
          [key]: { ...prev[key], ...update }
        }));
      }
    };

    const objLoader = new OBJLoader();
    const gltfLoader = new GLTFLoader();

    // 1. Load Demon Head (54MB GLB + textures)
    const loadDemon = async () => {
      try {
        updateCharProgress('demon', { stage: 'Fetching textures...', percent: 5 });
        let texLoaded = 0;
        const totalTex = 5;
        let meshRatio = 0;

        const reportProgress = (stage) => {
          const texRatio = texLoaded / totalTex;
          const p = Math.min(99, Math.round(texRatio * 35 + meshRatio * 65));
          updateCharProgress('demon', { percent: p, stage: stage || `Loading ${p}%` });
        };

        const onTex = (tex) => {
          texLoaded++;
          reportProgress(`Textures ${texLoaded}/${totalTex}`);
          return tex;
        };

        const texPromises = Promise.all([
          loadTex(assetPath('asset_demon_head/export/Demon_BaseColor.png'), true, false).then(onTex),
          loadTex(assetPath('asset_demon_head/export/Demon_Normal.png'), false, false).then(onTex),
          loadTex(assetPath('asset_demon_head/export/Demon_Roughness.png'), false, false).then(onTex),
          loadTex(assetPath('asset_demon_head/export/Demon_Emission.png'), true, false).then(onTex),
          loadTex(assetPath('asset_demon_head/export/Demon_Head_export_preview.png'), true, false).then(onTex)
        ]);

        const meshPromise = new Promise((resolve, reject) => {
          gltfLoader.load(
            assetPath('asset_demon_head/export/Demon_Head.glb'),
            (gltf) => {
              let mesh = null;
              gltf.scene.traverse((child) => {
                if (child.isMesh && !mesh) {
                  mesh = child;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              if (!mesh) {
                reject(new Error('Mesh not found in Demon_Head.glb'));
                return;
              }
              meshRatio = 1.0;
              reportProgress('Decoding mesh...');
              resolve(mesh);
            },
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / xhr.total);
              } else if (xhr.loaded > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / 56000000);
              }
              reportProgress(`Mesh ${Math.round(meshRatio * 100)}%`);
            },
            (err) => reject(err)
          );
        });

        const [textures, mesh] = await Promise.all([texPromises, meshPromise]);
        const [dDiffuse, dNormal, dRoughness, dEmission, dShaded] = textures;

        demonTextures.diffuse = dDiffuse;
        demonTextures.normal = dNormal;
        demonTextures.roughness = dRoughness;
        demonTextures.emissive = dEmission;
        demonTextures.metallic = null;
        demonTextures.pbr = null;
        demonTextures.shaded = dShaded;

        if (mesh.geometry) {
          if (!mesh.geometry.attributes.uv2 && mesh.geometry.attributes.uv) {
            mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
          }
          if (!mesh.geometry.attributes.tangent) {
            try {
              mesh.geometry.computeTangents();
            } catch (e) {
              console.warn('Demon tangent computation skipped:', e);
            }
          }
        }

        demonMaterial = new THREE.MeshStandardMaterial({
          map: demonTextures.diffuse || null,
          normalMap: demonTextures.normal || null,
          normalScale: new THREE.Vector2(1.0, 1.0),
          roughnessMap: demonTextures.roughness || null,
          roughness: 0.72,
          metalness: 0.0,
          emissiveMap: demonTextures.emissive || null,
          emissive: new THREE.Color(0xff4411),
          emissiveIntensity: 5.0,
          color: new THREE.Color(1.22, 1.18, 1.18)
        });
        mesh.material = demonMaterial;
        mesh.scale.set(demonBaseScale, demonBaseScale, demonBaseScale);
        mesh.position.set(-1.75, demonBaseY, 0);
        mesh.rotation.y = 0.16;
        mesh.layers.enable(1);

        demonMesh = mesh;
        modelsGroup.add(demonMesh);

        updateCharProgress('demon', { percent: 100, stage: 'Ready', loaded: true });
      } catch (err) {
        console.error('Demon load error:', err);
        updateCharProgress('demon', { percent: 0, stage: 'Error', loaded: false, error: err.message });
      }
    };

    // 2. Load Old Orc (7.4MB OBJ + 48MB textures)
    const loadOrc = async () => {
      try {
        updateCharProgress('orc', { stage: 'Fetching textures...', percent: 5 });
        let texLoaded = 0;
        const totalTex = 6;
        let meshRatio = 0;

        const reportProgress = (stage) => {
          const texRatio = texLoaded / totalTex;
          const p = Math.min(99, Math.round(texRatio * 55 + meshRatio * 45));
          updateCharProgress('orc', { percent: p, stage: stage || `Loading ${p}%` });
        };

        const onTex = (tex) => {
          texLoaded++;
          reportProgress(`Textures ${texLoaded}/${totalTex}`);
          return tex;
        };

        const texPromises = Promise.all([
          loadTex(assetPath('asset_orc/texture_diffuse.png'), true, true).then(onTex),
          loadTex(assetPath('asset_orc/texture_normal.png'), false, true).then(onTex),
          loadTex(assetPath('asset_orc/texture_roughness.png'), false, true).then(onTex),
          loadTex(assetPath('asset_orc/texture_metallic.png'), false, true).then(onTex),
          loadTex(assetPath('asset_orc/texture_pbr.png'), false, true).then(onTex),
          loadTex(assetPath('asset_orc/shaded.png'), true, true).then(onTex)
        ]);

        const meshPromise = new Promise((resolve, reject) => {
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
              meshRatio = 1.0;
              reportProgress('Optimizing OBJ geometry...');
              resolve(rawGeometry);
            },
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / xhr.total);
              } else if (xhr.loaded > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / 7800000);
              }
              reportProgress(`Mesh ${Math.round(meshRatio * 100)}%`);
            },
            (err) => reject(err)
          );
        });

        const [textures, rawGeometry] = await Promise.all([texPromises, meshPromise]);
        const [oDiffuse, oNormal, oRoughness, oMetallic, oPbr, oShaded] = textures;

        orcTextures.diffuse = oDiffuse;
        orcTextures.normal = oNormal;
        orcTextures.roughness = oRoughness;
        orcTextures.metallic = oMetallic;
        orcTextures.pbr = oPbr;
        orcTextures.shaded = oShaded;

        const indexedGeometry = mergeVertices(rawGeometry);
        indexedGeometry.setAttribute('uv2', indexedGeometry.attributes.uv);
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
        orcMesh.scale.set(0.95, 0.95, 0.95);
        orcMesh.position.set(0.25, groundY, 0);
        orcMesh.rotation.y = -0.06;
        orcMesh.layers.set(0);

        modelsGroup.add(orcMesh);

        updateCharProgress('orc', { percent: 100, stage: 'Ready', loaded: true });
      } catch (err) {
        console.error('Orc load error:', err);
        updateCharProgress('orc', { percent: 0, stage: 'Error', loaded: false, error: err.message });
      }
    };

    // 3. Load New Orc (90MB GLB + 40MB textures)
    const loadOrc2 = async () => {
      try {
        updateCharProgress('orc2', { stage: 'Fetching textures...', percent: 5 });
        let texLoaded = 0;
        const totalTex = 6;
        let meshRatio = 0;

        const reportProgress = (stage) => {
          const texRatio = texLoaded / totalTex;
          const p = Math.min(99, Math.round(texRatio * 35 + meshRatio * 65));
          updateCharProgress('orc2', { percent: p, stage: stage || `Loading ${p}%` });
        };

        const onTex = (tex) => {
          texLoaded++;
          reportProgress(`Textures ${texLoaded}/${totalTex}`);
          return tex;
        };

        const texPromises = Promise.all([
          loadTex(assetPath('asset_orc_2/texture_diffuse.png'), true, false).then(onTex),
          loadTex(assetPath('asset_orc_2/texture_normal.png'), false, false).then(onTex),
          loadTex(assetPath('asset_orc_2/texture_roughness.png'), false, false).then(onTex),
          loadTex(assetPath('asset_orc_2/texture_metallic.png'), false, false).then(onTex),
          loadTex(assetPath('asset_orc_2/texture_pbr.png'), false, false).then(onTex),
          loadTex(assetPath('asset_orc_2/shaded.png'), true, false).then(onTex)
        ]);

        const meshPromise = new Promise((resolve, reject) => {
          gltfLoader.load(
            assetPath('asset_orc_2/base_basic_pbr.glb'),
            (gltf) => {
              let mesh = null;
              gltf.scene.traverse((child) => {
                if (child.isMesh && !mesh) {
                  mesh = child;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              if (!mesh) {
                reject(new Error('Mesh not found in base_basic_pbr.glb'));
                return;
              }
              meshRatio = 1.0;
              reportProgress('Configuring 3D model...');
              resolve(mesh);
            },
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / xhr.total);
              } else if (xhr.loaded > 0) {
                meshRatio = Math.min(0.99, xhr.loaded / 94000000);
              }
              reportProgress(`Mesh ${Math.round(meshRatio * 100)}%`);
            },
            (err) => reject(err)
          );
        });

        const [textures, mesh] = await Promise.all([texPromises, meshPromise]);
        const [o2Diffuse, o2Normal, o2Roughness, o2Metallic, o2Pbr, o2Shaded] = textures;

        orc2Textures.diffuse = o2Diffuse;
        orc2Textures.normal = o2Normal;
        orc2Textures.roughness = o2Roughness;
        orc2Textures.metallic = o2Metallic;
        orc2Textures.pbr = o2Pbr;
        orc2Textures.shaded = o2Shaded;

        if (mesh.geometry) {
          if (!mesh.geometry.attributes.uv2 && mesh.geometry.attributes.uv) {
            mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
          }
          if (!mesh.geometry.attributes.tangent) {
            try {
              mesh.geometry.computeTangents();
            } catch (e) {
              console.warn('Orc2 tangent computation skipped:', e);
            }
          }
        }

        orc2Material = new THREE.MeshStandardMaterial({
          map: orc2Textures.diffuse || null,
          normalMap: orc2Textures.normal || null,
          normalScale: new THREE.Vector2(1.0, 1.0),
          roughnessMap: orc2Textures.pbr || orc2Textures.roughness || null,
          roughness: 1.0,
          metalnessMap: orc2Textures.pbr || orc2Textures.metallic || null,
          metalness: 1.0,
          aoMap: orc2Textures.pbr || null,
          aoMapIntensity: 1.0,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0.0
        });
        mesh.material = orc2Material;
        mesh.scale.set(0.95, 0.95, 0.95);
        mesh.position.set(2.15, groundY, 0);
        mesh.rotation.y = -0.20;
        mesh.layers.set(0);

        orc2Mesh = mesh;
        modelsGroup.add(orc2Mesh);

        updateCharProgress('orc2', { percent: 100, stage: 'Ready', loaded: true });
      } catch (err) {
        console.error('Orc2 load error:', err);
        updateCharProgress('orc2', { percent: 0, stage: 'Error', loaded: false, error: err.message });
      }
    };

    const loadAllAssets = async () => {
      try {
        await Promise.allSettled([loadDemon(), loadOrc(), loadOrc2()]);
      } catch (err) {
        console.error('Asset load error:', err);
        setErrorMsg(err.message);
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
          const config = getFocusConfig(camera.aspect)[prevFocusTarget] || getFocusConfig(camera.aspect).all;
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

        // Auto rotation of all models around center
        if (modelsGroup && stateRef.current.isAutoRotate) {
          modelsGroup.rotation.y += 0.006;
        }

        // Procedural Idle Animation (Breathing, Sway, Fire & Ember Physics)
        const isAnim = stateRef.current.isAnimating;
        const speed = stateRef.current.animSpeed;
        const t = ((now - startTime) * 0.001) * speed;

        if (isAnim) {
          // --- 1. Demon Head (asset_demon_head) Idle Animation ---
          if (demonMesh) {
            // Imposing breathing rhythm and subtle intimidation stance
            const dBreath = Math.sin(t * 1.5);
            const dBreathCos = Math.cos(t * 1.5);
            const dSway = Math.sin(t * 0.7 + 0.5);

            // Respiration chest & neck expansion anchored to floor level
            const dScaleXZ = demonBaseScale * (1 + 0.012 * dBreath);
            const dScaleY = demonBaseScale * (1 + 0.008 * dBreath);
            demonMesh.scale.set(dScaleXZ, dScaleY, dScaleXZ);

            // Bottom stays grounded at groundY during respiration
            demonMesh.position.y = (groundY - (-2.7502885 * dScaleY)) + 0.003 * (dBreath * 0.5 + 0.5);
            demonMesh.rotation.y = 0.16 + 0.015 * dSway;
            demonMesh.rotation.z = 0.008 * dSway;
            demonMesh.rotation.x = 0.006 * dBreathCos;

            // Magma pulse in sync with respiration (eyes glowing embers)
            if (demonMaterial && stateRef.current.renderMode === 'pbr') {
              const eBase = stateRef.current.emissiveIntensity;
              const pulse = 3.5 + 2.0 * (0.5 + 0.5 * Math.sin(t * 1.5));
              demonMaterial.emissiveIntensity = eBase * pulse;
            }
          }

          // --- 2. Old Orc Idle Animation ---
          if (orcMesh) {
            // Independent breathing cycle and warrior weight shifting
            const oBreath = Math.sin(t * 2.0 + 1.4);
            const oBreathCos = Math.cos(t * 2.0 + 1.4);
            const oSway = Math.sin(t * 1.0 + 0.7);

            // Deep chest expansion
            const oScaleXZ = 0.95 * (1 + 0.015 * oBreath);
            const oScaleY = 0.95 * (1 + 0.008 * oBreath);
            orcMesh.scale.set(oScaleXZ, oScaleY, oScaleXZ);

            // Grounded weight shift and battle posture
            orcMesh.position.y = groundY + 0.006 * (oBreath * 0.5 + 0.5);
            orcMesh.rotation.y = -0.06 + 0.02 * oSway;
            orcMesh.rotation.z = -0.014 * oSway;
            orcMesh.rotation.x = 0.01 * oBreathCos;
          }

          // --- 3. New Orc (asset_orc_2) Idle Animation ---
          if (orc2Mesh) {
            // Independent rhythm and shifted breathing phase
            const o2Breath = Math.sin(t * 1.8 + 2.8);
            const o2BreathCos = Math.cos(t * 1.8 + 2.8);
            const o2Sway = Math.sin(t * 0.9 + 1.8);

            // Deep chest expansion matching Old Orc
            const o2ScaleXZ = 0.95 * (1 + 0.015 * o2Breath);
            const o2ScaleY = 0.95 * (1 + 0.008 * o2Breath);
            orc2Mesh.scale.set(o2ScaleXZ, o2ScaleY, o2ScaleXZ);

            // Grounded weight shift and battle stance
            orc2Mesh.position.y = groundY + 0.006 * (o2Breath * 0.5 + 0.5);
            orc2Mesh.rotation.y = -0.20 + 0.018 * o2Sway;
            orc2Mesh.rotation.z = 0.012 * o2Sway;
            orc2Mesh.rotation.x = 0.011 * o2BreathCos;
          }

        } else {
          // Paused pose
          if (demonMesh) {
            demonMesh.scale.set(demonBaseScale, demonBaseScale, demonBaseScale);
            demonMesh.position.set(-1.75, demonBaseY, 0);
            demonMesh.rotation.set(0, 0.16, 0);
            if (demonMaterial && stateRef.current.renderMode === 'pbr') {
              demonMaterial.emissiveIntensity = stateRef.current.emissiveIntensity * 4.5;
            }
          }
          if (orcMesh) {
            orcMesh.scale.set(0.95, 0.95, 0.95);
            orcMesh.position.set(0.25, groundY, 0);
            orcMesh.rotation.set(0, -0.06, 0);
          }
          if (orc2Mesh) {
            orc2Mesh.scale.set(0.95, 0.95, 0.95);
            orc2Mesh.position.set(2.15, groundY, 0);
            orc2Mesh.rotation.set(0, -0.20, 0);
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

        demonKeyLight.intensity = 2.2 * lightMult * flicker;
        demonBounceLight.intensity = 0.85 * lightMult;
        demonAmbientLight.intensity = 0.20 * lightMult;

        // Handle flipY dynamically: Old Orc is OBJ (flipY=true by default), Demon Head & Orc 2 are GLTF (flipY=false by default)
        const isFlipped = stateRef.current.flipTextureY;
        const objTargetFlip = isFlipped ? false : true;
        const gltfTargetFlip = isFlipped ? true : false;

        Object.values(demonTextures).forEach((tex) => {
          if (tex && tex.flipY !== gltfTargetFlip) {
            tex.flipY = gltfTargetFlip;
            tex.needsUpdate = true;
          }
        });

        Object.values(orcTextures).forEach((tex) => {
          if (tex && tex.flipY !== objTargetFlip) {
            tex.flipY = objTargetFlip;
            tex.needsUpdate = true;
          }
        });

        Object.values(orc2Textures).forEach((tex) => {
          if (tex && tex.flipY !== gltfTargetFlip) {
            tex.flipY = gltfTargetFlip;
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
          if (orc2Material) orc2Material.needsUpdate = true;
        }

        const updateMaterial = (material, textures, isDemon) => {
          if (!material) return;
          material.wireframe = wire;

          if (mode === 'pbr') {
            material.map = textures.diffuse || null;
            material.normalMap = textures.normal || null;
            material.normalScale.set(1, 1);
            if (isDemon) {
              material.emissiveMap = textures.emissive || null;
              material.emissive.set(0xff4411);
              if (!isAnim) material.emissiveIntensity = eIntensity * 4.5;
              material.roughnessMap = textures.roughness || null;
              material.metalnessMap = null;
              material.metalness = 0.0;
              material.roughness = 0.72;
              material.aoMap = null;
              material.color.setRGB(1.22, 1.18, 1.18);
            } else {
              material.emissiveMap = null;
              material.emissive.set(0x000000);
              material.emissiveIntensity = 0.0;
              // For Orcs: use texture_pbr (packed AO, Roughness, Metalness)
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
              material.roughness = 1.0;
              material.metalness = 1.0;
              material.color.set(0xffffff);
            }
          } else if (mode === 'diffuse') {
            material.map = textures.diffuse || null;
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
            material.map = textures.shaded || textures.diffuse || null;
            material.normalMap = textures.normal || null;
            material.emissiveMap = isDemon ? (textures.emissive || null) : null;
            material.emissive.set(isDemon ? 0xff4411 : 0x000000);
            material.emissiveIntensity = isDemon ? 2.5 : 0.0;
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.roughness = 0.5;
            material.metalness = 0.1;
            material.color.set(0xffffff);
          } else if (mode === 'normal') {
            material.map = textures.normal || null;
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
            material.map = textures.roughness || null;
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.color.set(0xffffff);
          } else if (mode === 'metallic') {
            material.map = textures.metallic || null;
            material.normalMap = null;
            material.emissiveMap = null;
            material.emissive.set(0x000000);
            material.roughnessMap = null;
            material.metalnessMap = null;
            material.aoMap = null;
            material.color.set(textures.metallic ? 0xffffff : 0x111111);
          } else if (mode === 'clay') {
            material.map = null;
            material.normalMap = textures.normal || null;
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
        if (orc2Mesh && orc2Material) {
          updateMaterial(orc2Material, orc2Textures, false);
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

      {/* Real-time Per-Character Loading HUD */}
      <CharacterLoadingHUD characterProgress={characterProgress} />


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
