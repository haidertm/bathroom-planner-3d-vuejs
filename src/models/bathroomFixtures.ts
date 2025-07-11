import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { ComponentType } from '../constants/components';
import {
  FIXTURE_CONFIG,
  getModelConfig,
  isModelBased,
  isProceduralBased,
  getPreloadModels,
  type ModelConfig,
  type ProceduralConfig,
} from '../constants/models';

// Types
interface ModelCache {
  [key: string]: THREE.Group;
}

interface LoadingPromise {
  [key: string]: Promise<THREE.Group>;
}

interface GeometryConfig {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: [number, number, number];
}

type Position = [number, number, number];

// Singleton model manager with dynamic loading
class ModelManager {
  private static instance: ModelManager;
  private loader: GLTFLoader;
  private cache: ModelCache = {};
  private loadingPromises: LoadingPromise = {};
  private preloadComplete = false;

  private constructor() {
    this.loader = new GLTFLoader();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  // Preload commonly used models
  async preloadModels(): Promise<void> {
    if (this.preloadComplete) return;

    const modelsToPreload = getPreloadModels();
    console.log('Preloading models:', modelsToPreload.map(m => m.name));

    const preloadPromises = modelsToPreload.map(async (modelConfig) => {
      try {
        await this.loadModel(modelConfig.name, modelConfig);
        console.log(`Preloaded: ${modelConfig.name}`);
      } catch (error) {
        console.warn(`Failed to preload: ${modelConfig.name}`, error);
      }
    });

    await Promise.all(preloadPromises);
    this.preloadComplete = true;
    console.log('Model preloading complete');
  }

  async loadModel(modelName: string, modelConfig: ModelConfig): Promise<THREE.Group> {
    // Return cached model if available
    if (this.cache[modelName]) {
      return this.cache[modelName].clone();
    }

    // Return existing loading promise if already loading
    if (modelName in this.loadingPromises) {
      const loadedModel = await this.loadingPromises[modelName];
      return loadedModel.clone();
    }

    // Start loading
    this.loadingPromises[modelName] = new Promise((resolve, reject) => {
      this.loader.load(
        modelConfig.path,
        (gltf) => {
          const model = gltf.scene;

          // Apply model configuration
          if (modelConfig.scale) {
            model.scale.setScalar(modelConfig.scale);
          }

          if (modelConfig.rotation) {
            model.rotation.set(...modelConfig.rotation);
          }

          if (modelConfig.position) {
            model.position.set(...modelConfig.position);
          }

          // Configure model for shadows
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Cache the model
          this.cache[modelName] = model;

          // Clean up loading promise
          delete this.loadingPromises[modelName];

          console.log(`${modelName} model loaded successfully`);
          resolve(model);
        },
        (progress) => {
          console.log(`${modelName} loading progress: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          console.error(`Error loading ${modelName} model:`, error);
          delete this.loadingPromises[modelName];
          reject(error);
        }
      );
    });

    const loadedModel = await this.loadingPromises[modelName];
    return loadedModel.clone();
  }

  clearCache(): void {
    this.cache = {};
    this.loadingPromises = {};
    this.preloadComplete = false;
  }

  getCacheStatus(): { cached: string[], loading: string[] } {
    return {
      cached: Object.keys(this.cache),
      loading: Object.keys(this.loadingPromises)
    };
  }
}

// Helper functions for creating materials
const createStandardMaterial = (color: number, roughness = 0.8, metalness = 0.0): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness
  });
};

const createTransparentMaterial = (color: number, opacity: number): THREE.MeshStandardMaterial => {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity
  });
};

// Helper to create geometry from config
const createGeometryFromConfig = (
  geometryType: string,
  size: readonly [number, number, number]
): THREE.BufferGeometry => {
  const [width, height, depth] = size;

  switch (geometryType) {
    case 'box':
      return new THREE.BoxGeometry(width, height, depth);
    case 'cylinder':
      return new THREE.CylinderGeometry(width / 2, width / 2, height);
    case 'sphere':
      return new THREE.SphereGeometry(width / 2);
    case 'cone':
      return new THREE.ConeGeometry(width / 2, height);
    default:
      return new THREE.BoxGeometry(width, height, depth);
  }
};

// Base class for procedural fixtures
abstract class ProceduralFixture {
  protected group: THREE.Group;
  protected position: Position;
  protected config: ProceduralConfig;

  constructor(position: Position, config: ProceduralConfig) {
    this.group = new THREE.Group();
    this.position = position;
    this.config = config;
    this.group.position.set(position[0], position[1], position[2]);
  }

  abstract create(): THREE.Group;

  protected addGeometry(config: GeometryConfig): void {
    const mesh = new THREE.Mesh(config.geometry, config.material);
    mesh.position.set(config.position[0], config.position[1], config.position[2]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  protected createFallback(): THREE.Group {
    const fallbackMaterial = createStandardMaterial(
      this.config.fallbackColor || 0x8B4513
    );

    const fallbackGeometry = createGeometryFromConfig(
      this.config.fallbackGeometry || 'box',
      this.config.fallbackSize || [0.5, 0.5, 0.5]
    );

    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    fallbackMesh.position.set(0, 1, 0);
    fallbackMesh.castShadow = true;
    fallbackMesh.receiveShadow = true;

    this.group.add(fallbackMesh);
    return this.group;
  }
}

// Specific fixture implementations
class ToiletFixture extends ProceduralFixture {
  create(): THREE.Group {
    const whiteMaterial = createStandardMaterial(0xffffff);
    const seatMaterial = createStandardMaterial(0xf0f0f0);

    // Base
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.6, 0.4, 0.8),
      material: whiteMaterial,
      position: [0, 0.2, 0]
    });

    // Tank
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.5, 0.6, 0.2),
      material: whiteMaterial,
      position: [0, 0.5, -0.3]
    });

    // Seat
    this.addGeometry({
      geometry: new THREE.CylinderGeometry(0.25, 0.25, 0.05),
      material: seatMaterial,
      position: [0, 0.42, 0.1]
    });

    return this.group;
  }
}

class BathFixture extends ProceduralFixture {
  create(): THREE.Group {
    const tubMaterial = createStandardMaterial(0xffffff);
    const innerMaterial = createStandardMaterial(0xf8f8f8);

    // Tub
    this.addGeometry({
      geometry: new THREE.BoxGeometry(1.7, 0.6, 0.8),
      material: tubMaterial,
      position: [0, 0.3, 0]
    });

    // Inner cavity
    this.addGeometry({
      geometry: new THREE.BoxGeometry(1.5, 0.4, 0.6),
      material: innerMaterial,
      position: [0, 0.4, 0]
    });

    return this.group;
  }
}

class ShowerFixture extends ProceduralFixture {
  create(): THREE.Group {
    const baseMaterial = createStandardMaterial(0xffffff);
    const wallMaterial = createTransparentMaterial(0xadd8e6, 0.3);
    const headMaterial = createStandardMaterial(0xc0c0c0);

    // Base
    this.addGeometry({
      geometry: new THREE.CylinderGeometry(0.4, 0.4, 0.1),
      material: baseMaterial,
      position: [0, 0.05, 0]
    });

    // Walls
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.8, 2, 0.05),
      material: wallMaterial,
      position: [-0.4, 1, 0]
    });

    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.05, 2, 0.8),
      material: wallMaterial,
      position: [0, 1, -0.4]
    });

    // Shower head
    this.addGeometry({
      geometry: new THREE.CylinderGeometry(0.08, 0.08, 0.05),
      material: headMaterial,
      position: [0, 1.8, 0]
    });

    return this.group;
  }
}

class RadiatorFixture extends ProceduralFixture {
  create(): THREE.Group {
    const mainMaterial = createStandardMaterial(0xffffff);
    const finMaterial = createStandardMaterial(0xe0e0e0);

    // Main body
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.8, 0.6, 0.1),
      material: mainMaterial,
      position: [0, 0.5, 0]
    });

    // Radiator fins
    for (let i = 0; i < 8; i++) {
      this.addGeometry({
        geometry: new THREE.BoxGeometry(0.08, 0.5, 0.08),
        material: finMaterial,
        position: [-0.3 + i * 0.08, 0.5, 0]
      });
    }

    return this.group;
  }
}

class MirrorFixture extends ProceduralFixture {
  create(): THREE.Group {
    const frameMaterial = createStandardMaterial(0x8B4513);
    const mirrorMaterial = createStandardMaterial(0x87CEEB, 0.1, 1);

    // Frame
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.8, 1.0, 0.05),
      material: frameMaterial,
      position: [0, 0, 0]
    });

    // Mirror surface
    this.addGeometry({
      geometry: new THREE.BoxGeometry(0.7, 0.9, 0.01),
      material: mirrorMaterial,
      position: [0, 0, 0.025]
    });

    return this.group;
  }
}

// Procedural fixture factory
const createProceduralFixture = (
  componentType: ComponentType,
  position: Position,
  config: ProceduralConfig
): THREE.Group => {
  switch (componentType) {
    case 'Toilet':
      return new ToiletFixture(position, config).create();
    case 'Bath':
      return new BathFixture(position, config).create();
    case 'Shower':
      return new ShowerFixture(position, config).create();
    case 'Radiator':
      return new RadiatorFixture(position, config).create();
    case 'Mirror':
      return new MirrorFixture(position, config).create();
    default:
      // Create a simple fallback directly without calling protected method
      const group = new THREE.Group();
      group.position.set(position[0], position[1], position[2]);

      const fallbackMaterial = createStandardMaterial(
        config.fallbackColor || 0x8B4513
      );

      const fallbackGeometry = createGeometryFromConfig(
        config.fallbackGeometry || 'box',
        config.fallbackSize || [0.5, 0.5, 0.5]
      );

      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
      fallbackMesh.position.set(0, 1, 0);
      fallbackMesh.castShadow = true;
      fallbackMesh.receiveShadow = true;

      group.add(fallbackMesh);
      return group;
  }
};

// Model-based fixture handler
class ModelBasedFixture {
  private modelManager: ModelManager;
  private position: Position;
  private config: ModelConfig;

  constructor(position: Position, config: ModelConfig) {
    this.modelManager = ModelManager.getInstance();
    this.position = position;
    this.config = config;
  }

  async create(): Promise<THREE.Group> {
    const group = new THREE.Group();
    group.position.set(this.position[0], this.position[1], this.position[2]);

    try {
      const model = await this.modelManager.loadModel(this.config.name, this.config);

      // Quick fix for black mirror
      if (this.config.name === 'Mirror') {
        this.fixMirrorMaterial(model);
      }

      group.add(model);
      return group;
    } catch (error) {
      console.error(`Failed to load ${this.config.name} model, using fallback`);
      return this.createFallback();
    }
  }

  // Add this method to the ModelBasedFixture class:
  private fixMirrorMaterial(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Create a shiny, reflective material
        const mirrorMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,      // White
          metalness: 0.9,       // Very metallic
          roughness: 0.1,       // Very smooth
          transparent: false,
          opacity: 1.0,
          emissive: 0x111111,   // Slight glow to make it visible
          emissiveIntensity: 0.1
        });

        child.material = mirrorMaterial;
        child.material.needsUpdate = true;
      }
    });
  }

  private createFallback(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(this.position[0], this.position[1], this.position[2]);

    const fallbackMaterial = createStandardMaterial(
      this.config.fallbackColor || 0x8B4513
    );

    const fallbackGeometry = createGeometryFromConfig(
      this.config.fallbackGeometry || 'box',
      this.config.fallbackSize || [0.5, 0.5, 0.5]
    );

    const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
    fallbackMesh.position.set(0, 1, 0);
    fallbackMesh.castShadow = true;
    fallbackMesh.receiveShadow = true;

    group.add(fallbackMesh);
    return group;
  }
}

// Main export function with dynamic configuration
export const createModel = async (
  type: ComponentType,
  position: Position,
  rotation: number = 0,
  scale: number = 1.0
): Promise<THREE.Group | null> => {
  try {
    const config = getModelConfig(type);

    if (!config) {
      console.error(`No configuration found for component type: ${type}`);
      return null;
    }

    let group: THREE.Group;

    if (isModelBased(config)) {
      console.log('configIs>>>', config);
      // Create model-based fixture
      const fixture = new ModelBasedFixture(position, config);
      group = await fixture.create();
    } else if (isProceduralBased(config)) {
      // Create procedural fixture
      group = createProceduralFixture(type, position, config);
    } else {
      console.error(`Unknown configuration type for: ${type}`);
      return null;
    }

    if (group) {
      group.rotation.y = rotation;
      group.scale.set(scale, scale, scale);
      group.userData.type = type;
    }

    return group;
  } catch (error) {
    console.error(`Error creating ${type} model:`, error);
    return null;
  }
};

// Preload models function
export const preloadModels = async (): Promise<void> => {
  const modelManager = ModelManager.getInstance();
  await modelManager.preloadModels();
};

// Utility function to clear model cache
export const clearModelCache = (): void => {
  ModelManager.getInstance().clearCache();
};

// Get model cache status
export const getModelCacheStatus = () => {
  return ModelManager.getInstance().getCacheStatus();
};

// Export configuration for external use
export { FIXTURE_CONFIG, getModelConfig, isModelBased, isProceduralBased };
