import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ComponentType } from '../constants/components';
import productData from '../mocks/productData';

import {
  isModelBased
} from '../utils/models';
import { type ObjectModel, type ObjectModelWithCategory } from '../utils/constraints';

// Types
interface ModelCache {
  [key: string]: THREE.Group;
}

interface LoadingPromise {
  [key: string]: Promise<THREE.Group>;
}

export type Position = [number, number, number];
type ModelLoadedCallback = () => void;
type ModelProgressCallback = (progress: number) => void;

// Singleton model manager with dynamic loading
class ModelManager {
  private static instance: ModelManager;
  private loader: GLTFLoader;
  private cache: ModelCache = {};
  private loadingPromises: LoadingPromise = {};
  private preloadComplete = false;
  // NEW: Track which categories have been preloaded
  private preloadedCategories: Set<string> = new Set();
  private loadedModels: Set<string> = new Set(); // Track individual models
  private loadingCallbacks: Map<string, ModelLoadedCallback[]> = new Map(); // Callbacks for when models load

  private constructor () {
    this.loader = new GLTFLoader();
  }

  static getInstance (): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

    // NEW: Method to check if specific model is loaded
    isModelLoaded(modelName: string): boolean {
        return this.loadedModels.has(modelName);
    }

    // NEW: Check if model is in cache (for progressive loading)
    isModelCached(modelName: string): boolean {
        return modelName in this.cache;
    }

    // NEW: Check if model is currently loading
    isModelLoading(modelName: string): boolean {
        return modelName in this.loadingPromises;
    }

    // NEW: Register callback for when a specific model loads
    onModelLoaded(modelName: string, callback: ModelLoadedCallback): void {
        if (this.isModelLoaded(modelName)) {
            try {
                callback();
            } catch (error) {
                console.error(`Error in immediate model loaded callback for ${modelName}:`, error);
            }
            return;
        }

        if (!this.loadingCallbacks.has(modelName)) {
            this.loadingCallbacks.set(modelName, []);
        }
        this.loadingCallbacks.get(modelName)!.push(callback);
    }

  // NEW: Preload models for specific category only
    async preloadCategoryModels(category: ComponentType, onModelLoaded?: (modelName: string) => void): Promise<void> {
        if (this.preloadedCategories.has(category)) {
            return;
        }
        const categoryModels = getCategoryModelPaths(category);

        if (categoryModels.length === 0) {
            console.warn(`⚠️ No models found for ${category} category`);
            this.preloadedCategories.add(category);
            return;
        }

        // Load models individually, don't wait for all to complete
        const preloadPromises = categoryModels.map(async ({ name, path, scale }) => {
            try {
                const tempObjectModel: ObjectModel = { name, path, scale, dimensions: { width: 50, height: 50, depth: 50 } };

                await this.loadModel(name, tempObjectModel);

                // Notify parent component that this specific model is ready
                if (onModelLoaded) {
                    onModelLoaded(name);
                }

            } catch (error) {
                console.warn(`❌ Failed to load ${category} model: ${name}`, error);
            }
        });

        // Wait for all attempts to complete (both success and failure)
        await Promise.allSettled(preloadPromises);

        this.preloadedCategories.add(category);
    }

  // Existing preloadModels method (keep for backward compatibility)
  async preloadModels (): Promise<void> {
    if (this.preloadComplete) {
      return;
    }

    const allModelPaths = getAllModelPathsFromProductData();

    if (allModelPaths.length === 0) {
      console.warn('⚠️ No models found in productData to preload');
      this.preloadComplete = true;
      return;
    }

    // Track preloading progress
    let loadedCount = 0;
    let failedCount = 0;

    const preloadPromises = allModelPaths.map(async ({ name, path, scale }) => {
      try {
        const tempObjectModel: ObjectModel = {
          name,
          path,
          scale, // Default scale for preloading
          dimensions: {
            width: 50,
            height: 50,
            depth: 50
          }
        };

        await this.loadModel(name, tempObjectModel);
        loadedCount++;
      } catch (error) {
        failedCount++;
        console.warn(`Failed to preload: ${name}`, error);
      }
    });

    await Promise.all(preloadPromises);
    this.preloadComplete = true;
  }

  // NEW: Check if category is preloaded
  isCategoryPreloaded (category: ComponentType): boolean {
    return this.preloadedCategories.has(category);
  }

  // Existing loadModel method - now with optional progress callback
    async loadModel(name: string, model: ObjectModel, onProgress?: ModelProgressCallback): Promise<THREE.Group> {
        try {
            const result = await this.performModelLoad(name, model, onProgress);

            // Mark as loaded and trigger callbacks
            this.loadedModels.add(name);
            this.triggerModelLoadedCallbacks(name);

            return result;
        } catch (error) {
            console.error(`Failed to load model ${name}:`, error);
            throw error;
        }
    }

     private cloneModelWithMaterials(model: THREE.Group): THREE.Group {
      const cloned = model.clone(true);
      cloned.traverse(node => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh && mesh.material) {
              mesh.material = Array.isArray(mesh.material)
                  ? mesh.material.map(m => m.clone())
                  : mesh.material.clone();
          }
      });
      return cloned;
  }

    // NEW: The actual model loading implementation
    private async performModelLoad(modelName: string, modelConfig: ObjectModel, onProgress?: ModelProgressCallback): Promise<THREE.Group> {
        // Return cached model if available
        if (this.cache[modelName]) {
            onProgress?.(100); // Immediately report 100% for cached models
            return this.cloneModelWithMaterials(this.cache[modelName]);
        }

        // Return existing loading promise if already loading
        if (modelName in this.loadingPromises) {
            const loaded = await this.loadingPromises[modelName];
            const cloned = loaded.clone(true);
            cloned.traverse(n => { if ((n as any).isMesh && (n as any).material) (n as any).material = Array.isArray((n as any).material) ? (n as any).material.map((m:any)=>m.clone()) : (n as any).material.clone(); });
            return cloned;
        }

        // Create new loading promise
        this.loadingPromises[modelName] = new Promise((resolve, reject) => {

            this.loader.load(
                modelConfig.path,
                (gltf) => {

                    const model = gltf.scene;
                    model.name = modelName;

                    // Apply scale if provided
                    if (modelConfig.scale) {
                        model.scale.setScalar(modelConfig.scale);
                    }

                    // Optimize model for smooth rendering
                    this.optimizeModelForSmoothing(model);

                    // Cache the model
                    this.cache[modelName] = model;

                    // Clean up loading promise
                    delete this.loadingPromises[modelName];

                    // Report 100% complete
                    onProgress?.(100);
                    resolve(model);
                },
                (progress) => {
                    // Handle real loading progress
                    // Cap download progress at 90% - remaining 10% is for parsing/processing
                    // GLTFLoader reports download progress, but parsing large models takes time too
                    if (progress.lengthComputable) {
                        // Scale download progress to 0-90% range (leave 10% for parsing)
                        const downloadPercent = (progress.loaded / progress.total) * 90;
                        onProgress?.(downloadPercent);
                    } else {
                        // If length not computable, estimate based on loaded bytes
                        // Use logarithmic scale capped at 80% (save 20% for processing)
                        const estimatedProgress = Math.min(80, Math.log10(progress.loaded / 1000 + 1) * 30);
                        onProgress?.(estimatedProgress);
                    }
                },
                (error) => {
                    console.error(`❌ Error loading model ${modelName}:`, error);
                    delete this.loadingPromises[modelName];
                    // Prevent memory leaks from hanging callbacks on failure
                    this.loadingCallbacks.delete(modelName);
                    reject(new Error(`Failed to load model ${modelName}: ${error instanceof Error ? error.message : String(error)}`));
                }
            );
        });

        // Wait for loading to complete and return clone
        const loaded = await this.loadingPromises[modelName];
        const cloned = loaded.clone(true);
        cloned.traverse(n => { if ((n as any).isMesh && (n as any).material) (n as any).material = Array.isArray((n as any).material) ? (n as any).material.map((m:any)=>m.clone()) : (n as any).material.clone(); });
        return cloned;
    }

  // Optimize model for smooth rendering
  private optimizeModelForSmoothing (model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;

        // Optimize materials
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(child.material);
          }
        }

        // Fix texture filtering
        if (child.material && 'map' in child.material && child.material.map) {
          this.fixTextureFiltering(child.material.map);
        }
      }
    });
  }

    // Add this to ModelManager class after the loadModel method:
    private triggerModelLoadedCallbacks(modelName: string): void {
        const callbacks = this.loadingCallbacks.get(modelName) || [];
        callbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error(`Error in model loaded callback for ${modelName}:`, error);
            }
        });
        this.loadingCallbacks.delete(modelName);
    }

  // Optimize material properties
  private optimizeMaterial (material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial) {
      // Ensure proper material properties for realistic rendering
      material.roughness = material.roughness ?? 0.7;
      material.metalness = material.metalness ?? 0.1;
    }

    // Enable flat shading for better performance if needed
    // material.flatShading = true;

    material.needsUpdate = true;
  }

  // Fix texture filtering to prevent pixelation
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
    this.preloadedCategories.clear();
  }

  getCacheStatus () {
    return {
      cachedModels: Object.keys(this.cache).length,
      loadingModels: Object.keys(this.loadingPromises).length,
      preloadComplete: this.preloadComplete,
      preloadedCategories: Array.from(this.preloadedCategories)
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
    // group.position.set(this.position[0], this.position[1], this.position[2]);

    try {
      const model = await this.modelManager.loadModel(this.config.name, this.config);
      group.position.set(this.position[0], this.position[1], this.position[2]);
      group.add(model);
      return group;
    } catch (error) {
      console.error(`Failed to load ${this.config.name} model, using fallback`);
      return group;
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

    // Create model-based fixture
    const fixture = new ModelBasedFixture(position, productModel);
    const model = await fixture.create();


    // Calculate the model's bounding box to find its actual center
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    model.rotation.y = rotation;
    model.scale.set(scale, scale, scale);
    model.userData.type = type;
    return model;
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

// NEW: Export function for selective preloading
export const preloadCategoryModels = async (category: ComponentType): Promise<void> => {
  const modelManager = ModelManager.getInstance();
  return await modelManager.preloadCategoryModels(category);
};

// NEW: Check if category is preloaded
export const isCategoryPreloaded = (category: ComponentType): boolean => {
  const modelManager = ModelManager.getInstance();
  return modelManager.isCategoryPreloaded(category);
};

// Get model cache status
export const getModelCacheStatus = () => {
  return ModelManager.getInstance().getCacheStatus();
};

// NEW: Helper function to get model paths for specific category
const getCategoryModelPaths = (category: ComponentType): ObjectModelWithCategory[] => {
  const categoryModels: ObjectModelWithCategory[] = [];

  if (productData[category]) {
    productData[category].forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.path && variant.sku) {
            categoryModels.push({ ...variant, category });
          }
        });
      }
    });
  }
  return categoryModels;
};

// Function to extract all model paths from productData
const getAllModelPathsFromProductData = (): ObjectModelWithCategory[] => {
  const modelPaths: ObjectModelWithCategory[] = [];

  // Iterate through all categories in productData
  Object.entries(productData).forEach(([category, products]) => {
    products.forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.path && variant.sku) {
            modelPaths.push({ ...variant, category: category as ComponentType });
          }
        });
      }
    });
  });
  return modelPaths;
};

// Export configuration for external use
export { isModelBased };
export { ModelManager };
