import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ComponentType } from '../constants/components';
import productData from '../mocks/productData';

import {
  isModelBased
} from '../utils/models';
import { type ObjectModel } from '../utils/constraints.ts';

// Types
interface ModelCache {
  [key: string]: THREE.Group;
}

interface LoadingPromise {
  [key: string]: Promise<THREE.Group>;
}

type Position = [number, number, number];

// Singleton model manager with dynamic loading
class ModelManager {
  private static instance: ModelManager;
  private loader: GLTFLoader;
  private cache: ModelCache = {};
  private loadingPromises: LoadingPromise = {};
  private preloadComplete = false;

  private constructor () {
    this.loader = new GLTFLoader();
  }

  static getInstance (): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  // Preload commonly used models
  async preloadModels (): Promise<void> {
    if (this.preloadComplete) {
      console.log('✅ Models already preloaded, skipping...');
      return;
    }

    console.log('🚀 Starting model preloading from productData...');

    const allModelPaths = getAllModelPathsFromProductData();

    if (allModelPaths.length === 0) {
      console.warn('⚠️ No models found in productData to preload');
      this.preloadComplete = true;
      return;
    }

    console.log(`📦 Preloading ${allModelPaths.length} models...`);

    // Track preloading progress
    let loadedCount = 0;
    let failedCount = 0;

    // const modelsToPreload = getPreloadModels();
    // console.log('Preloading models:', modelsToPreload.map(m => m.name));

    const preloadPromises = allModelPaths.map(async ({ name, path, scale }) => {
      try {
        const tempObjectModel: ObjectModel = {
          name,
          path,
          scale: 100, // Default scale for preloading
          dimensions: {
            width: 50,
            height: 50,
            depth: 50
          }
        };

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

  async loadModel (modelName: string, productModel: ObjectModel): Promise<THREE.Group> {
    // Return cached model if available
    if (this.cache[modelName]) {
      return this.cache[modelName].clone();
    }

    console.log('loadModel|modelConfig>>>', productModel);

    // Return existing loading promise if already loading
    if (modelName in this.loadingPromises) {
      const loadedModel = await this.loadingPromises[modelName];
      return loadedModel.clone();
    }

    // Start loading
    this.loadingPromises[modelName] = new Promise((resolve, reject) => {
      this.loader.load(
        productModel.path,
        (gltf) => {
          const model = gltf.scene;

          console.log('loaderLoad>>>>', productModel.scale);
          // Apply model configuration
          if (productModel.scale) {
            model.scale.setScalar(productModel.scale);
          }

          console.log('modelConfig.rotation>>>>', productModel.rotation);

          if (productModel.rotation) {
            console.log('modelConfig.rotation>>>', productModel.rotation);
            model.rotation.set(...productModel.rotation);
          }

          if (productModel.position) {
            model.position.set(...productModel.position);
          }

          // Configure model for shadows
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // ✅ CRITICAL: Fix pixelated models with proper material processing
          this.processModelForSmoothRendering(model);

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

  // ✅ NEW: Advanced geometry smoothing for low-poly models
  private processModelForSmoothRendering (model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // ✅ 1. Advanced geometry processing
        if (child.geometry) {
          // Compute smooth vertex normals
          child.geometry.computeVertexNormals();

          // ✅ ADVANCED: If model is very low-poly, try subdivision (optional)
          // Uncomment if you want to smooth very blocky models
          // if (this.isLowPolyGeometry(child.geometry)) {
          //   child.geometry = this.subdivideGeometry(child.geometry);
          // }

          // Ensure geometry has proper attributes
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }

          // ✅ CRITICAL: Merge vertices and recompute normals for smoothness
          child.geometry = child.geometry.toNonIndexed(); // Convert to non-indexed
          child.geometry.computeVertexNormals(); // Recompute normals
        }

        // ✅ 2. Fix material properties for smooth rendering
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach(material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              // CRITICAL: Disable flat shading
              material.flatShading = false;
              material.needsUpdate = true;

              // Fix texture filtering if textures exist
              if (material.map) {
                this.fixTextureFiltering(material.map);
              }
              if (material.normalMap) {
                this.fixTextureFiltering(material.normalMap);
              }
              if (material.roughnessMap) {
                this.fixTextureFiltering(material.roughnessMap);
              }
              if (material.metalnessMap) {
                this.fixTextureFiltering(material.metalnessMap);
              }

              // ✅ ADDED: Better material properties for smooth appearance
              material.roughness = Math.max(0.1, material.roughness || 0.5);
              material.metalness = material.metalness || 0.0;
            }
          });
        }

        // Configure for shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    console.log(`✅ Model processed for smooth rendering: ${model.name || 'unnamed'}`);
  }

  // ✅ NEW: Fix texture filtering to prevent pixelation
  private fixTextureFiltering (texture: THREE.Texture): void {
    // Use linear filtering for smooth textures
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Enable anisotropic filtering for better quality at angles
    texture.anisotropy = Math.min(16, this.getMaxAnisotropy());

    // Generate mipmaps for smooth scaling
    texture.generateMipmaps = true;

    // Update the texture
    texture.needsUpdate = true;
  }

  // ✅ NEW: Get maximum anisotropic filtering supported
  private getMaxAnisotropy (): number {
    // This should be called with a renderer context, but we'll use a reasonable default
    return 16; // Most modern GPUs support 16x anisotropic filtering
  }

  clearCache (): void {
    this.cache = {};
    this.loadingPromises = {};
    this.preloadComplete = false;
  }

  getCacheStatus (): { cached: string[], loading: string[] } {
    return {
      cached: Object.keys(this.cache),
      loading: Object.keys(this.loadingPromises)
    };
  }
}

// Model-based fixture handler
class ModelBasedFixture {
  private modelManager: ModelManager;
  private position: Position;
  private config: ObjectModel;

  constructor (position: Position, productModel: ObjectModel) {
    this.modelManager = ModelManager.getInstance();
    this.position = position;
    this.config = productModel;
  }

  async create (): Promise<THREE.Group> {
    const group = new THREE.Group();
    group.position.set(this.position[0], this.position[1], this.position[2]);

    try {
      const model = await this.modelManager.loadModel(this.config.name, this.config);
      group.add(model);
      return group;
    } catch (error) {
      console.error(`Failed to load ${this.config.name} model, using fallback`);
      return null;
    }
  }
}

// Main export function with dynamic configuration
export const createModel = async (
  type: ComponentType,
  position: Position,
  rotation: number = 0,
  scale: number = 1.0,
  productModel?: ObjectModel,
  productSKU?: string
): Promise<THREE.Group | null> => {
  try {

    if (!productModel || !productModel.path) {
      console.error(`No Model found for product: ${productSKU}`);
      return null;
    }

    let group: THREE.Group;

    // Create model-based fixture
    const fixture = new ModelBasedFixture(position, productModel);
    group = await fixture.create();

    if (group) {
      group.rotation.y = rotation;
      group.scale.set(scale, scale, scale);
      group.userData.type = type;
      return group;
    }

    return null;
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

// NEW: Function to extract all model paths from productData
const getAllModelPathsFromProductData = (): Array<{ path: string; name: string; sku: string; category: string }> => {
  const modelPaths: Array<{ path: string; name: string; sku: string; category: string }> = [];

  // Iterate through all categories in productData
  Object.entries(productData).forEach(([category, products]) => {
    products.forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.path && variant.sku) {
            modelPaths.push({
              path: variant.path,
              name: variant.name || variant.sku,
              sku: variant.sku,
              category: category,
              scale: variant.scale
            });
          }
        });
      }
    });
  });

  console.log(`📦 Found ${modelPaths.length} models across ${Object.keys(productData).length} categories`);
  return modelPaths;
};

// Export configuration for external use
export { isModelBased };
