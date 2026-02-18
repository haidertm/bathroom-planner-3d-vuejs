<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const props = defineProps<{
  isOpen: boolean;
  modelPath: string;
  modelName?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const loadError = ref<string | null>(null);

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let controls: OrbitControls | null = null;
let animationFrameId: number | null = null;
let currentModel: THREE.Group | null = null;
let initTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Request token to guard against out-of-order GLTF loads
let loadTokenCounter = 0;
let currentLoadToken: number | null = null;

/**
 * Dispose of a Three.js object and all its children to free GPU memory.
 * Traverses the object tree and disposes geometries, materials, and textures.
 */
const disposeObject = (object: THREE.Object3D) => {
  object.traverse((node) => {
    // Dispose geometry
    if ('geometry' in node && node.geometry) {
      (node.geometry as THREE.BufferGeometry).dispose();
    }

    // Dispose materials and their textures
    if ('material' in node && node.material) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];

      materials.forEach((material: THREE.Material) => {
        if (!material) return;

        // Dispose all texture properties commonly used in PBR materials
        const textureProps = [
          'map', 'normalMap', 'roughnessMap', 'metalnessMap',
          'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap',
          'displacementMap', 'envMap', 'lightMap', 'specularMap'
        ];

        textureProps.forEach((prop) => {
          if (prop in material) {
            const texture = (material as any)[prop] as THREE.Texture | null;
            if (texture) {
              texture.dispose();
            }
          }
        });

        material.dispose();
      });
    }
  });
};

const initScene = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  // Scene - use medium grey background for better contrast with white objects
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x808080);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(2, 2, 2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.7;
  containerRef.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;

  // Lighting - minimal for accurate color representation
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Hemisphere light for natural sky/ground lighting (helps PBR materials)
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.2);
  hemisphereLight.position.set(0, 20, 0);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Create environment map for PBR reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  // Create a simple neutral environment
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0xffffff);
  scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();

  // Ground plane (grid) - lighter grid for visibility on dark background
  const gridHelper = new THREE.GridHelper(4, 20, 0x999999, 0x666666);
  scene.add(gridHelper);

  // Animation loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);
    controls?.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  };
  animate();
};

const loadModel = async (path: string) => {
  if (!scene) return;

  // Generate a unique token for this load request
  const thisLoadToken = ++loadTokenCounter;
  currentLoadToken = thisLoadToken;

  isLoading.value = true;
  loadError.value = null;

  // Remove previous model and dispose GPU resources
  if (currentModel) {
    disposeObject(currentModel);
    scene.remove(currentModel);
    currentModel = null;
  }

  // Format path - ensure it starts with /
  let modelPath = path;
  if (!modelPath.startsWith('/') && !modelPath.startsWith('http')) {
    modelPath = '/' + modelPath;
  }

  console.log('[GlbPreviewModal] Loading model:', {
    originalPath: path,
    resolvedPath: modelPath,
    loadToken: thisLoadToken,
  });

  const loader = new GLTFLoader();

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(
        modelPath,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      );
    });

    // Check if this load is stale (a newer load was initiated)
    if (thisLoadToken !== currentLoadToken) {
      console.log('[GlbPreviewModal] Stale load detected, discarding result:', {
        thisLoadToken,
        currentLoadToken,
        modelPath,
      });
      // Dispose the loaded model since it's stale
      disposeObject(gltf.scene);
      return;
    }

    currentModel = gltf.scene;

    // Calculate bounding box to center and scale the model
    const box = new THREE.Box3().setFromObject(currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    currentModel.position.sub(center);
    currentModel.position.y += size.y / 2;

    // Scale model to fit view
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 2) {
      const scale = 2 / maxDim;
      currentModel.scale.setScalar(scale);
    }

    // Enable shadows and fix material/texture color spaces
    currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Fix material and texture color spaces for correct color rendering
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material) {
            // Fix texture color spaces
            if ('map' in material && material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
            }
            if ('emissiveMap' in material && material.emissiveMap) {
              material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
            }
            // Ensure material updates
            material.needsUpdate = true;
          }
        });
      }
    });

    scene.add(currentModel);

    // Adjust camera to fit model
    if (camera && controls) {
      const scaledSize = size.clone().multiplyScalar(currentModel.scale.x);
      const maxScaledDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
      const distance = maxScaledDim * 2;
      camera.position.set(distance, distance * 0.8, distance);
      controls.target.set(0, scaledSize.y / 2, 0);
      controls.update();
    }

    isLoading.value = false;
  } catch (error) {
    // Only update error state if this is still the active load
    if (thisLoadToken !== currentLoadToken) {
      console.log('[GlbPreviewModal] Stale load error, ignoring:', {
        thisLoadToken,
        currentLoadToken,
        modelPath,
      });
      return;
    }

    console.error('[GlbPreviewModal] Failed to load model:', {
      originalPath: path,
      resolvedPath: modelPath,
      loadToken: thisLoadToken,
      error,
    });
    loadError.value = `Failed to load model from path: ${modelPath}\n\nMake sure the file exists in the public folder.`;
    isLoading.value = false;
  }
};

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const cleanup = () => {
  // Invalidate any pending loads
  currentLoadToken = null;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (controls) {
    controls.dispose();
    controls = null;
  }

  // Dispose current model
  if (currentModel && scene) {
    disposeObject(currentModel);
    scene.remove(currentModel);
    currentModel = null;
  }

  // Dispose scene resources
  if (scene) {
    // Dispose environment texture
    if (scene.environment) {
      scene.environment.dispose();
      scene.environment = null;
    }

    // Dispose background if it's a texture
    if (scene.background && scene.background instanceof THREE.Texture) {
      scene.background.dispose();
    }
    scene.background = null;

    // Dispose all scene children (grid, lights, etc.)
    while (scene.children.length > 0) {
      const child = scene.children[0];
      disposeObject(child);
      scene.remove(child);
    }
  }

  if (renderer) {
    renderer.dispose();
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement);
    }
    renderer = null;
  }

  scene = null;
  camera = null;
};

const handleClose = () => {
  emit('close');
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose();
  }
};

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Wait for DOM to render
    initTimeoutId = setTimeout(() => {
      // Guard: check modal is still open before initializing
      // (user may have closed it before timeout fired)
      if (!props.isOpen) return;

      initScene();
      if (props.modelPath) {
        loadModel(props.modelPath);
      }
      window.addEventListener('resize', handleResize);
      window.addEventListener('keydown', handleKeydown);
    }, 50);
  } else {
    // Cancel pending initialization if modal closed quickly
    if (initTimeoutId) {
      clearTimeout(initTimeoutId);
      initTimeoutId = null;
    }
    cleanup();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeydown);
  }
});

watch(() => props.modelPath, (newPath) => {
  if (props.isOpen && newPath) {
    loadModel(newPath);
  }
});

onBeforeUnmount(() => {
  // Cancel pending initialization timeout
  if (initTimeoutId) {
    clearTimeout(initTimeoutId);
    initTimeoutId = null;
  }
  cleanup();
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleClose">
      <div class="modal-container">
        <div class="modal-header">
          <h3 class="modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            {{ modelName || '3D Model Preview' }}
          </h3>
          <button class="close-btn" @click="handleClose" title="Close (Esc)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <!-- Loading state -->
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading 3D model...</p>
          </div>

          <!-- Error state -->
          <div v-if="loadError" class="error-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>{{ loadError }}</p>
            <p class="error-hint">Check that the model path is correct</p>
          </div>

          <!-- 3D Viewer -->
          <div ref="containerRef" class="viewer-container"></div>
        </div>

        <div class="modal-footer">
          <div class="controls-hint">
            <span><strong>Rotate:</strong> Left click + drag</span>
            <span><strong>Pan:</strong> Right click + drag</span>
            <span><strong>Zoom:</strong> Scroll wheel</span>
          </div>
          <div class="model-path">
            <code>{{ modelPath }}</code>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-container {
  background-color: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
}

.close-btn {
  padding: 8px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #e2e8f0;
  color: #2d3748;
}

.modal-body {
  flex: 1;
  position: relative;
  min-height: 400px;
  max-height: 60vh;
  overflow: hidden;
}

.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.loading-state,
.error-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #29275B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p,
.error-state p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.error-state {
  color: #dc2626;
}

.error-state svg {
  color: #dc2626;
  margin-bottom: 12px;
}

.error-state p:first-of-type {
  color: #dc2626;
  font-weight: 500;
}

.error-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280 !important;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.controls-hint {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
}

.controls-hint span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.controls-hint strong {
  color: #2d3748;
}

.model-path {
  font-size: 11px;
}

.model-path code {
  padding: 4px 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  color: #6b7280;
  font-family: monospace;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-container {
    max-height: 95vh;
  }

  .modal-body {
    min-height: 300px;
  }

  .viewer-container {
    min-height: 300px;
  }

  .controls-hint {
    flex-direction: column;
    gap: 4px;
  }

  .modal-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
