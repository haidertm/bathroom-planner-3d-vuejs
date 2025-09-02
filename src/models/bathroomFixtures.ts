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
  private loadingCallbacks: Map<string, Function[]> = new Map(); // Callbacks for when models load

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

    // NEW: Register callback for when a specific model loads
    onModelLoaded(modelName: string, callback: Function): void {
        if (this.isModelLoaded(modelName)) {
            callback();
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
            console.log(`✅ ${category} models already preloaded, skipping...`);
            return;
        }

        console.log(`🚀 Starting selective preload for ${category} models...`);
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
                console.log(`✅ Individual model loaded: ${name}`);

                // Notify parent component that this specific model is ready
                if (onModelLoaded) {
                    onModelLoaded(name);
                }

            } catch (error) {
                console.warn(`❌ Failed to load ${category} model: ${name}`, error);
            }
        });

        // Don't wait for all - let them load individually
        Promise.all(preloadPromises).then(() => {
            this.preloadedCategories.add(category);
            console.log(`🎉 ${category} preloading complete!`);
        });
    }

  // Existing preloadModels method (keep for backward compatibility)
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
        console.log(`Preloaded: ${name}`);
      } catch (error) {
        failedCount++;
        console.warn(`Failed to preload: ${name}`, error);
      }
    });

    await Promise.all(preloadPromises);
    this.preloadComplete = true;
    console.log(`🎉 Global preloading complete! Loaded: ${loadedCount}, Failed: ${failedCount}`);
  }

  // NEW: Check if category is preloaded
  isCategoryPreloaded (category: ComponentType): boolean {
    return this.preloadedCategories.has(category);
  }

  // Existing loadModel method
    async loadModel(name: string, model: ObjectModel): Promise<THREE.Group> {
        try {
            const result = await this.performModelLoad(name, model);

            // Mark as loaded and trigger callbacks
            this.loadedModels.add(name);
            this.triggerModelLoadedCallbacks(name);

            // Trigger any waiting callbacks
            const callbacks = this.loadingCallbacks.get(name) || [];
            callbacks.forEach(callback => callback());
            this.loadingCallbacks.delete(name);

            return result;
        } catch (error) {
            console.error(`Failed to load model ${name}:`, error);
            throw error;
        }
    }

    // NEW: The actual model loading implementation
    private async performModelLoad(modelName: string, modelConfig: ObjectModel): Promise<THREE.Group> {
        // Return cached model if available
        if (this.cache[modelName]) {
            console.log(`🎯 Using cached model: ${modelName}`);
            return this.cache[modelName].clone();
        }

        // Return existing loading promise if already loading
        if (modelName in this.loadingPromises) {
            console.log(`⏳ Waiting for existing load: ${modelName}`);
            const loaded = await this.loadingPromises[modelName];
            return loaded.clone();
        }

        // Create new loading promise
        this.loadingPromises[modelName] = new Promise((resolve, reject) => {
            console.log(`📦 Starting to load model: ${modelName} from ${modelConfig.path}`);

            this.loader.load(
                modelConfig.path,
                (gltf) => {
                    console.log(`✅ GLTF loaded successfully: ${modelName}`);

                    const model = gltf.scene;
                    model.name = modelName;

                    // Apply scale if provided
                    if (modelConfig.scale) {
                        model.scale.setScalar(modelConfig.scale);
                        console.log(`🔧 Applied scale ${modelConfig.scale} to ${modelName}`);
                    }

                    // Optimize model for smooth rendering
                    this.optimizeModelForSmoothing(model);

                    // Cache the model
                    this.cache[modelName] = model;

                    // Clean up loading promise
                    delete this.loadingPromises[modelName];

                    console.log(`🎉 Model ${modelName} loaded and cached successfully`);
                    resolve(model);
                },
                (progress) => {
                    // Optional: Handle loading progress
                    if (progress.lengthComputable) {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        console.log(`📈 Loading ${modelName}: ${percentComplete.toFixed(1)}%`);
                    }
                },
                (error) => {
                    console.error(`❌ Error loading model ${modelName}:`, error);
                    delete this.loadingPromises[modelName];
                   reject(new Error(`Failed to load model ${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`));
                }
            );
        });

        // Wait for loading to complete and return clone
        const loaded = await this.loadingPromises[modelName];
        return loaded.clone();
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

    console.log(`✅ Model processed for smooth rendering: ${model.name || 'unnamed'}`);
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

    console.log('📦 Model geometry analysis:', {
      type,
      boundingBoxCenter: center,
      boundingBoxSize: size,
      expectedDimensions: productModel.dimensions,
      pivotOffset: {
        x: center.x - model.position.x,
        y: center.y - model.position.y,
        z: center.z - model.position.z
      }
    });

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

  console.log(`📦 Found ${categoryModels.length} models for ${category} category`);
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

  console.log(`📦 Found ${modelPaths.length} models across ${Object.keys(productData).length} categories`);
  return modelPaths;
};

// Export configuration for external use
export { isModelBased };
export { ModelManager };
