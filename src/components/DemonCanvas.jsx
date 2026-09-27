import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Volume2 } from 'lucide-react';

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
  onLoadComplete,
  onUserEnter
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
  const [readyToEnter, setReadyToEnter] = useState(false);

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

    const getFocusConfig = (currentAspect) => {
      const isPortrait = currentAspect < 1.0;
      // In portrait on smartphones, distance scales so Demon, Old Orc, and New Orc fit horizontally
      const allZ = isPortrait ? Math.max(6.0, 4.5 / Math.max(currentAspect, 0.45)) : 4.6;
      const allConfig = {
        target: new THREE.Vector3(0.2, 0.25, 0),
        camera: new THREE.Vector3(0.2, 0.5, Math.min(allZ, 8.2))
      };
      return {
        all: allConfig,
        both: allConfig,
        demon: {
          target: new THREE.Vector3(-1.75, 0.35, 0),
          camera: new THREE.Vector3(-1.75, 0.50, isPortrait ? 3.4 : 2.8)
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
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
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

    const loadAllAssets = async () => {
      try {
        setLoadStage('Loading textures (Demon, Old Orc & New Orc)...');
        setLoadProgress(15);

        // Load Demon textures (from asset_demon_only, OBJ convention: flipY = true)
        const demonTexPromise = Promise.all([
          loadTex(assetPath('asset_demon_only/texture_diffuse.png'), true, true),
          loadTex(assetPath('asset_demon_only/texture_normal.png'), false, true),
          loadTex(assetPath('asset_demon_only/texture_roughness.png'), false, true),
          loadTex(assetPath('asset_demon_only/texture_metallic.png'), false, true),
          loadTex(assetPath('asset_demon_only/texture_pbr.png'), false, true),
          loadTex(assetPath('asset_demon_only/shaded.png'), true, true)
        ]);

        // Load Old Orc textures (OBJ convention: flipY = true)
        const orcTexPromise = Promise.all([
          loadTex(assetPath('asset_orc/texture_diffuse.png'), true, true),
          loadTex(assetPath('asset_orc/texture_normal.png'), false, true),
          loadTex(assetPath('asset_orc/texture_roughness.png'), false, true),
          loadTex(assetPath('asset_orc/texture_metallic.png'), false, true),
          loadTex(assetPath('asset_orc/texture_pbr.png'), false, true),
          loadTex(assetPath('asset_orc/shaded.png'), true, true)
        ]);

        // Load New Orc (asset_orc_2) textures (GLTF convention: flipY = false)
        const orc2TexPromise = Promise.all([
          loadTex(assetPath('asset_orc_2/texture_diffuse.png'), true, false),
          loadTex(assetPath('asset_orc_2/texture_normal.png'), false, false),
          loadTex(assetPath('asset_orc_2/texture_roughness.png'), false, false),
          loadTex(assetPath('asset_orc_2/texture_metallic.png'), false, false),
          loadTex(assetPath('asset_orc_2/texture_pbr.png'), false, false),
          loadTex(assetPath('asset_orc_2/shaded.png'), true, false)
        ]);

        const [
          [dDiffuse, dNormal, dRoughness, dMetallic, dPbr, dShaded],
          [oDiffuse, oNormal, oRoughness, oMetallic, oPbr, oShaded],
          [o2Diffuse, o2Normal, o2Roughness, o2Metallic, o2Pbr, o2Shaded]
        ] = await Promise.all([demonTexPromise, orcTexPromise, orc2TexPromise]);

        demonTextures.diffuse = dDiffuse;
        demonTextures.normal = dNormal;
        demonTextures.roughness = dRoughness;
        demonTextures.metallic = dMetallic;
        demonTextures.pbr = dPbr;
        demonTextures.shaded = dShaded;

        orcTextures.diffuse = oDiffuse;
        orcTextures.normal = oNormal;
        orcTextures.roughness = oRoughness;
        orcTextures.metallic = oMetallic;
        orcTextures.pbr = oPbr;
        orcTextures.shaded = oShaded;

        orc2Textures.diffuse = o2Diffuse;
        orc2Textures.normal = o2Normal;
        orc2Textures.roughness = o2Roughness;
        orc2Textures.metallic = o2Metallic;
        orc2Textures.pbr = o2Pbr;
        orc2Textures.shaded = o2Shaded;

        setLoadStage('Decoding Demon 3D mesh (asset_demon_only)...');
        setLoadProgress(35);

        const objLoader = new OBJLoader();
        const gltfLoader = new GLTFLoader();

        const loadDemonModel = new Promise((resolve, reject) => {
          objLoader.load(
            assetPath('asset_demon_only/base.obj'),
            (obj) => {
              let rawGeometry = null;
              obj.traverse((child) => {
                if (child.isMesh && !rawGeometry) {
                  rawGeometry = child.geometry;
                }
              });

              if (!rawGeometry) {
                reject(new Error('Geometry not found in asset_demon_only base.obj'));
                return;
              }

              // Index vertices and preserve authentic Blender normals
              const indexedGeometry = mergeVertices(rawGeometry);
              // Setup uv2 for Ambient Occlusion
              indexedGeometry.setAttribute('uv2', indexedGeometry.attributes.uv);
              // Compute tangents for optimal normal map lighting
              indexedGeometry.computeTangents();

              demonMaterial = new THREE.MeshStandardMaterial({
                map: demonTextures.diffuse || null,
                normalMap: demonTextures.normal || null,
                normalScale: new THREE.Vector2(1.0, 1.0),
                roughnessMap: demonTextures.pbr || demonTextures.roughness || null,
                roughness: 1.0,
                metalnessMap: demonTextures.pbr || demonTextures.metallic || null,
                metalness: 1.0,
                aoMap: demonTextures.pbr || null,
                aoMapIntensity: 1.0,
                emissive: new THREE.Color(0x220500),
                emissiveIntensity: 0.8
              });

              demonMesh = new THREE.Mesh(indexedGeometry, demonMaterial);
              demonMesh.castShadow = true;
              demonMesh.receiveShadow = true;

              // Demon scaled by 2.25 (~2.48m height) for towering presence on the left
              demonMesh.scale.set(2.25, 2.25, 2.25);
              demonMesh.position.set(-1.75, groundY, 0);
              demonMesh.rotation.y = 0.16;

              modelsGroup.add(demonMesh);
              resolve();
            },
            undefined,
            (err) => reject(err)
          );
        });

        await loadDemonModel;

        setLoadStage('Decoding Old Orc 3D mesh (asset_orc)...');
        setLoadProgress(60);

        // Load Old Orc OBJ model
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

              // Old Orc scaled ~1.80m height (positioned in center-right)
              orcMesh.scale.set(0.95, 0.95, 0.95);
              orcMesh.position.set(0.25, groundY, 0);
              orcMesh.rotation.y = -0.06;

              modelsGroup.add(orcMesh);
              resolve();
            },
            undefined,
            (err) => reject(err)
          );
        });

        await loadOrcModel;

        setLoadStage('Loading New Orc 3D character (asset_orc_2)...');
        setLoadProgress(80);

        // Load New Orc (asset_orc_2) - GLB
        const loadOrc2Model = new Promise((resolve, reject) => {
          gltfLoader.load(
            assetPath('asset_orc_2/base_basic_pbr.glb'),
            (gltf) => {
              gltf.scene.traverse((child) => {
                if (child.isMesh && !orc2Mesh) {
                  orc2Mesh = child;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });

              if (!orc2Mesh) {
                reject(new Error('Mesh not found in asset_orc_2/base_basic_pbr.glb'));
                return;
              }

              if (orc2Mesh.geometry) {
                if (!orc2Mesh.geometry.attributes.uv2 && orc2Mesh.geometry.attributes.uv) {
                  orc2Mesh.geometry.setAttribute('uv2', orc2Mesh.geometry.attributes.uv);
                }
                if (!orc2Mesh.geometry.attributes.tangent) {
                  try {
                    orc2Mesh.geometry.computeTangents();
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
              orc2Mesh.material = orc2Material;

              // Place next to the old orc at x = 2.15 (~1.80m height, identical scale & ground level as Old Orc)
              orc2Mesh.scale.set(0.95, 0.95, 0.95);
              orc2Mesh.position.set(2.15, groundY, 0);
              orc2Mesh.rotation.y = -0.20;

              modelsGroup.add(orc2Mesh);
              resolve();
            },
            (xhr) => {
              if (xhr.lengthComputable) {
                const percent = Math.round((xhr.loaded / xhr.total) * 18);
                setLoadProgress(80 + percent);
              }
            },
            (err) => reject(err)
          );
        });

        await loadOrc2Model;

        setLoadProgress(100);
        setLoadStage('Ready!');

        if (onLoadComplete) {
          onLoadComplete(
            () => {
              // Autoplay succeeded or already active
              setLoading(false);
            },
            () => {
              // Autoplay blocked by browser policy without prior user gesture
              setReadyToEnter(true);
            }
          );
        } else {
          setLoading(false);
        }
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
          // --- 1. Demon (asset_demon_only) Idle Animation ---
          if (demonMesh) {
            // Imposing breathing rhythm and subtle intimidation stance
            const dBreath = Math.sin(t * 1.5);
            const dBreathCos = Math.cos(t * 1.5);
            const dSway = Math.sin(t * 0.7 + 0.5);

            // Respiration chest expansion
            const dScaleXZ = 2.25 * (1 + 0.012 * dBreath);
            const dScaleY = 2.25 * (1 + 0.007 * dBreath);
            demonMesh.scale.set(dScaleXZ, dScaleY, dScaleXZ);

            // Grounded weight shift and menacing posture
            demonMesh.position.y = groundY + 0.005 * (dBreath * 0.5 + 0.5);
            demonMesh.rotation.y = 0.16 + 0.015 * dSway;
            demonMesh.rotation.z = 0.01 * dSway;
            demonMesh.rotation.x = 0.008 * dBreathCos;

            // Magma pulse in sync with respiration
            if (demonMaterial && stateRef.current.renderMode === 'pbr') {
              const eBase = stateRef.current.emissiveIntensity;
              const pulse = 0.7 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.5));
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
            demonMesh.scale.set(2.25, 2.25, 2.25);
            demonMesh.position.set(-1.75, groundY, 0);
            demonMesh.rotation.set(0, 0.16, 0);
            if (demonMaterial && stateRef.current.renderMode === 'pbr') {
              demonMaterial.emissiveIntensity = stateRef.current.emissiveIntensity;
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

        // Handle flipY dynamically: Demon & Old Orc are OBJ (flipY=true by default), Orc 2 is GLTF (flipY=false by default)
        const isFlipped = stateRef.current.flipTextureY;
        const objTargetFlip = isFlipped ? false : true;
        const gltfTargetFlip = isFlipped ? true : false;

        Object.values(demonTextures).forEach((tex) => {
          if (tex && tex.flipY !== objTargetFlip) {
            tex.flipY = objTargetFlip;
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
              material.emissive.set(0x220500);
              if (!isAnim) material.emissiveIntensity = eIntensity;
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
            }
            material.roughness = 1.0;
            material.metalness = 1.0;
            material.color.set(0xffffff);
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
            material.emissiveMap = null;
            material.emissive.set(0x000000);
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
            material.color.set(0xffffff);
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

      {/* Loading Screen */}
      {loading && (
        <div
          onClick={() => {
            if (readyToEnter) {
              if (onUserEnter) onUserEnter();
              setLoading(false);
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at center, rgba(22, 16, 28, 0.97) 0%, rgba(8, 6, 8, 0.99) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 100,
            cursor: readyToEnter ? 'pointer' : 'default',
            transition: 'all 0.4s ease',
            userSelect: 'none'
          }}
        >
          {readyToEnter ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px'
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#ff8c42',
                  fontWeight: 600,
                  marginBottom: '10px'
                }}
              >
                Initial Load Complete
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.6rem, 3.8vw, 2.4rem)',
                  fontWeight: 700,
                  color: '#f5f3f4',
                  letterSpacing: '0.06em',
                  marginBottom: '26px',
                  textShadow: '0 0 28px rgba(255, 77, 38, 0.45)'
                }}
              >
                Demon & Orcs 3D Showcase
              </div>

              <button
                className="glass-btn active"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUserEnter) onUserEnter();
                  setLoading(false);
                }}
                style={{
                  padding: '14px clamp(20px, 6vw, 42px)',
                  maxWidth: 'min(360px, calc(100vw - 36px))',
                  boxSizing: 'border-box',
                  fontSize: 'clamp(0.9rem, 3.8vw, 1.05rem)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  borderRadius: '32px',
                  background: 'linear-gradient(135deg, rgba(255, 77, 38, 0.4), rgba(255, 140, 66, 0.3))',
                  border: '1px solid rgba(255, 140, 66, 0.8)',
                  boxShadow: '0 0 35px rgba(255, 77, 38, 0.55)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: '#fff',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 50px rgba(255, 77, 38, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 77, 38, 0.55)';
                }}
              >
                <Volume2 size={22} color="#ff8c42" />
                <span>ENTER 3D SHOWCASE</span>
              </button>

              <div
                style={{
                  marginTop: '20px',
                  fontSize: '0.82rem',
                  color: '#9a94a0',
                  letterSpacing: '0.04em'
                }}
              >
                Soundtrack will play on loop • Click anywhere to enter
              </div>
            </div>
          ) : (
            <>
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
                Loading Demon & Orcs 3D Models...
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
            </>
          )}
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
