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

const initScene = () => {
  if (!containerRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(2, 2, 2);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  containerRef.value.appendChild(renderer.domElement);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  // Ground plane (grid)
  const gridHelper = new THREE.GridHelper(4, 20, 0xcccccc, 0xe0e0e0);
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

  isLoading.value = true;
  loadError.value = null;

  // Remove previous model
  if (currentModel) {
    scene.remove(currentModel);
    currentModel = null;
  }

  // Format path - ensure it starts with /
  let modelPath = path;
  if (!modelPath.startsWith('/') && !modelPath.startsWith('http')) {
    modelPath = '/' + modelPath;
  }

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

    // Enable shadows
    currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
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
    console.error('Failed to load model:', error);
    loadError.value = `Failed to load model: ${path}`;
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
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (controls) {
    controls.dispose();
    controls = null;
  }

  if (renderer) {
    renderer.dispose();
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement);
    }
    renderer = null;
  }

  if (currentModel && scene) {
    scene.remove(currentModel);
    currentModel = null;
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
    setTimeout(() => {
      initScene();
      if (props.modelPath) {
        loadModel(props.modelPath);
      }
      window.addEventListener('resize', handleResize);
      window.addEventListener('keydown', handleKeydown);
    }, 50);
  } else {
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
