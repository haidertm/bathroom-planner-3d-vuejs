import * as THREE from 'three'

export class ModelCache {
  private static cache = new Map<string, THREE.Object3D>();
  private static loadingPromises = new Map<string, Promise<THREE.Object3D>>();

  static async getModel(modelPath: string): Promise<THREE.Object3D> {
    // Return cached model if available
    if (this.cache.has(modelPath)) {
      console.log(`🎯 Using cached model: ${modelPath}`);
      return this.cache.get(modelPath)!.clone();
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(modelPath)) {
      console.log(`⏳ Waiting for existing load: ${modelPath}`);
      const loadedModel = await this.loadingPromises.get(modelPath)!;
      return loadedModel.clone();
    }

    // Start new loading process
    console.log(`📦 Loading new model: ${modelPath}`);
    const loadingPromise = this.loadModelFromFile(modelPath);
    this.loadingPromises.set(modelPath, loadingPromise);

    try {
      const model = await loadingPromise;
      this.cache.set(modelPath, model);
      this.loadingPromises.delete(modelPath);
      return model.clone();
    } catch (error) {
      this.loadingPromises.delete(modelPath);
      throw error;
    }
  }

  private static async loadModelFromFile(modelPath: string): Promise<THREE.Object3D> {
    // Use your existing model loading logic here
    // This should be moved from your current createBathroomItemModel method
    throw new Error('Implement your existing model loading logic here');
  }

  static clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}
