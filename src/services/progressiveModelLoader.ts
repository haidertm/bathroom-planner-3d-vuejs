// src/services/progressiveModelLoader.ts
// Progressive Model Loading with Placeholder Support
// Provides instant visual feedback while loading large 3D models

import * as THREE from 'three';
import { ModelManager } from '../models/bathroomFixtures';
import type { ObjectModel } from '../utils/constraints';

export interface ProgressiveLoadCallbacks {
  onPlaceholderReady?: (placeholder: THREE.Group) => void;
  onFullModelReady?: (model: THREE.Group) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface PlaceholderConfig {
  wireframeColor?: number;
  fillColor?: number;
  fillOpacity?: number;
  wireframeOpacity?: number;
  showPulseAnimation?: boolean;
}

const DEFAULT_PLACEHOLDER_CONFIG: PlaceholderConfig = {
  wireframeColor: 0x6366f1, // Indigo color
  fillColor: 0xe0e7ff,      // Light indigo
  fillOpacity: 0.3,
  wireframeOpacity: 0.8,
  showPulseAnimation: true
};

/**
 * ProgressiveModelLoader - Handles progressive loading of 3D models
 *
 * Loading Strategy:
 * 1. Instantly show a bounding box placeholder based on model dimensions
 * 2. Load the full model in the background
 * 3. Swap placeholder with full model when ready
 *
 * This provides immediate visual feedback while the actual model loads.
 */
export class ProgressiveModelLoader {
  private static instance: ProgressiveModelLoader;
  private modelManager: ModelManager;
  private activePlaceholders: Map<string, THREE.Group> = new Map();
  private loadingAbortControllers: Map<string, AbortController> = new Map();

  private constructor() {
    this.modelManager = ModelManager.getInstance();
  }

  static getInstance(): ProgressiveModelLoader {
    if (!ProgressiveModelLoader.instance) {
      ProgressiveModelLoader.instance = new ProgressiveModelLoader();
    }
    return ProgressiveModelLoader.instance;
  }

  /**
   * Load a model progressively with placeholder support
   * Returns the placeholder immediately, then calls onFullModelReady when loaded
   */
  async loadProgressively(
    sku: string,
    modelConfig: ObjectModel,
    callbacks: ProgressiveLoadCallbacks = {},
    placeholderConfig: PlaceholderConfig = DEFAULT_PLACEHOLDER_CONFIG
  ): Promise<THREE.Group> {
    const { onPlaceholderReady, onFullModelReady, onProgress, onError } = callbacks;

    console.log('🔄 ProgressiveLoader.loadProgressively called:', {
      sku,
      dimensions: modelConfig.dimensions,
      path: modelConfig.path
    });

    // Check if model is already cached - return immediately
    const isLoaded = this.modelManager.isModelLoaded(sku);
    console.log('🔍 ProgressiveLoader - isModelLoaded check:', { sku, isLoaded });

    if (isLoaded) {
      console.log(`✅ Progressive: Model ${sku} already loaded, returning immediately (NO PLACEHOLDER)`);
      const cachedModel = await this.modelManager.loadModel(sku, modelConfig);
      onFullModelReady?.(cachedModel);
      onProgress?.(100);
      return cachedModel;
    }

    console.log(`🔲 ProgressiveLoader - Model ${sku} NOT loaded, CREATING PLACEHOLDER`);

    // Create abort controller for this load operation
    const abortController = new AbortController();
    this.loadingAbortControllers.set(sku, abortController);

    // Step 1: Create and return placeholder immediately
    const placeholder = this.createBoundingBoxPlaceholder(
      modelConfig.dimensions,
      placeholderConfig
    );
    placeholder.name = `placeholder_${sku}`;
    placeholder.userData.isPlaceholder = true;
    placeholder.userData.sku = sku;
    placeholder.userData.modelConfig = modelConfig;

    this.activePlaceholders.set(sku, placeholder);

    // Notify that placeholder is ready
    console.log(`🔲 Progressive: Calling onPlaceholderReady for ${sku}`);
    onPlaceholderReady?.(placeholder);
    onProgress?.(5);

    console.log(`🔲 Progressive: Placeholder CREATED and notified for ${sku}`);

    // Step 2: Load full model in background
    try {
      // Start loading with progress simulation (runs concurrently)
      this.simulateProgress(sku, onProgress, abortController.signal);

      // Actually load the model
      const fullModel = await this.modelManager.loadModel(sku, modelConfig);

      // Check if loading was aborted
      if (abortController.signal.aborted) {
        console.log(`⚠️ Progressive: Loading aborted for ${sku}`);
        return placeholder;
      }

      // Complete progress
      onProgress?.(100);

      // Clean up placeholder tracking
      this.activePlaceholders.delete(sku);
      this.loadingAbortControllers.delete(sku);

      console.log(`✅ Progressive: Full model loaded for ${sku}`);

      // Notify that full model is ready
      onFullModelReady?.(fullModel);

      return fullModel;

    } catch (error) {
      console.error(`❌ Progressive: Failed to load model ${sku}:`, error);
      this.activePlaceholders.delete(sku);
      this.loadingAbortControllers.delete(sku);
      onError?.(error as Error);

      // Return placeholder on error (better than nothing)
      return placeholder;
    }
  }

  /**
   * Create a bounding box placeholder based on model dimensions
   * The placeholder is aligned so that:
   * - Bottom face is at y=0 (floor level)
   * - Back face is at z=0 (wall position) - extends into room in +Z direction
   * - Centered on X axis
   * This matches how most wall-mounted models are positioned
   */
  createBoundingBoxPlaceholder(
    dimensions: { width: number; height: number; depth?: number },
    config: PlaceholderConfig = DEFAULT_PLACEHOLDER_CONFIG
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ModelPlaceholder';

    // Convert dimensions from cm to scene units (assuming 1 unit = 1 cm)
    const w = dimensions.width;
    const h = dimensions.height;
    const d = dimensions.depth || dimensions.width;

    // Create box geometry
    const geometry = new THREE.BoxGeometry(w, h, d);

    // Position the geometry so:
    // - Bottom is at y=0 (translate up by h/2)
    // - Back face is at z=0, extends into room (translate forward by d/2)
    // This matches how wall-mounted models are typically positioned
    geometry.translate(0, h / 2, d / 2);

    // Create wireframe (edges)
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: config.wireframeColor,
      transparent: true,
      opacity: config.wireframeOpacity,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
    wireframe.name = 'PlaceholderWireframe';

    // Create semi-transparent fill
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: config.fillColor,
      transparent: true,
      opacity: config.fillOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fill = new THREE.Mesh(geometry.clone(), fillMaterial);
    fill.name = 'PlaceholderFill';

    // Add loading indicator (spinning element at top)
    const loadingIndicator = this.createLoadingIndicator(w, h, d, config);
    loadingIndicator.name = 'PlaceholderLoadingIndicator';

    group.add(wireframe);
    group.add(fill);
    group.add(loadingIndicator);

    // Store materials for disposal
    group.userData.materials = [wireframeMaterial, fillMaterial];
    group.userData.geometries = [geometry, edgesGeometry];
    group.userData.isPlaceholder = true;
    group.userData.dimensions = dimensions;

    // Add pulse animation if enabled
    if (config.showPulseAnimation) {
      this.addPulseAnimation(group);
    }

    return group;
  }

  /**
   * Create a loading indicator (spinning ring) for the placeholder
   */
  private createLoadingIndicator(
    width: number,
    height: number,
    depth: number,
    config: PlaceholderConfig
  ): THREE.Group {
    const indicatorGroup = new THREE.Group();

    // Position at top center of placeholder (accounting for geometry offset)
    // The placeholder extends from z=0 to z=depth, so center is at z=depth/2
    indicatorGroup.position.set(0, height + 10, depth / 2);

    // Create a torus (ring) as loading spinner
    const radius = Math.min(width, depth) * 0.15;
    const tubeRadius = radius * 0.15;
    const torusGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, 24, Math.PI * 1.5);

    const torusMaterial = new THREE.MeshBasicMaterial({
      color: config.wireframeColor,
      transparent: true,
      opacity: 0.9
    });

    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.rotation.x = Math.PI / 2; // Lay flat

    indicatorGroup.add(torus);

    // Store for animation
    indicatorGroup.userData.spinner = torus;
    indicatorGroup.userData.materials = [torusMaterial];
    indicatorGroup.userData.geometries = [torusGeometry];

    return indicatorGroup;
  }

  /**
   * Add pulse animation to placeholder
   */
  private addPulseAnimation(group: THREE.Group): void {
    let animationId: number;
    const startTime = Date.now();

    const animate = () => {
      if (!group.parent) {
        // Group was removed from scene, stop animation
        cancelAnimationFrame(animationId);
        return;
      }

      const elapsed = Date.now() - startTime;

      // Apply subtle pulse to fill opacity
      const fillMesh = group.getObjectByName('PlaceholderFill') as THREE.Mesh;
      if (fillMesh && fillMesh.material instanceof THREE.MeshBasicMaterial) {
        fillMesh.material.opacity = 0.2 + Math.sin(elapsed * 0.004) * 0.1;
      }

      // Rotate the loading indicator
      const loadingIndicator = group.getObjectByName('PlaceholderLoadingIndicator');
      if (loadingIndicator && loadingIndicator.userData.spinner) {
        loadingIndicator.userData.spinner.rotation.z += 0.05;
      }

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animationId = requestAnimationFrame(animate);

    // Store animation ID for cleanup
    group.userData.animationId = animationId;
  }

  /**
   * Simulate loading progress while actual loading happens
   */
  private async simulateProgress(
    _sku: string, // SKU is for logging/debugging purposes
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<void> {
    let progress = 5;
    const maxProgress = 95; // Leave room for actual completion

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(interval);
          resolve();
          return;
        }

        // Exponential slowdown as we approach max
        const remaining = maxProgress - progress;
        const increment = Math.max(0.5, remaining * 0.1);
        progress = Math.min(maxProgress, progress + increment);

        onProgress?.(Math.round(progress));

        if (progress >= maxProgress - 0.5) {
          clearInterval(interval);
          resolve();
        }
      }, 150);
    });
  }

  /**
   * Swap a placeholder with the full model in the scene
   */
  swapPlaceholderWithModel(
    placeholder: THREE.Object3D,
    fullModel: THREE.Group,
    preserveTransform: boolean = true
  ): boolean {
    const parent = placeholder.parent;
    if (!parent) {
      console.warn('⚠️ Progressive: Placeholder has no parent, cannot swap');
      return false;
    }

    if (preserveTransform) {
      // Copy transform from placeholder to full model
      fullModel.position.copy(placeholder.position);
      fullModel.rotation.copy(placeholder.rotation);
      fullModel.scale.copy(placeholder.scale);

      // Copy userData (except placeholder-specific data)
      const { isPlaceholder, animationId, materials, geometries, ...restUserData } = placeholder.userData;
      fullModel.userData = { ...fullModel.userData, ...restUserData };
    }

    // Add full model to same parent
    parent.add(fullModel);

    // Remove and dispose placeholder
    parent.remove(placeholder);
    this.disposePlaceholder(placeholder);

    console.log(`🔄 Progressive: Swapped placeholder with full model`);
    return true;
  }

  /**
   * Properly dispose of a placeholder and its resources
   */
  disposePlaceholder(placeholder: THREE.Object3D): void {
    // Stop animation if running
    if (placeholder.userData.animationId) {
      cancelAnimationFrame(placeholder.userData.animationId);
    }

    // Dispose geometries
    if (placeholder.userData.geometries) {
      placeholder.userData.geometries.forEach((geo: THREE.BufferGeometry) => {
        geo.dispose();
      });
    }

    // Dispose materials
    if (placeholder.userData.materials) {
      placeholder.userData.materials.forEach((mat: THREE.Material) => {
        mat.dispose();
      });
    }

    // Recursively dispose children
    placeholder.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
      if (child instanceof THREE.LineSegments) {
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }

      // Handle loading indicator
      if (child.userData.geometries) {
        child.userData.geometries.forEach((geo: THREE.BufferGeometry) => geo.dispose());
      }
      if (child.userData.materials) {
        child.userData.materials.forEach((mat: THREE.Material) => mat.dispose());
      }
    });

    // Remove from parent if still attached
    if (placeholder.parent) {
      placeholder.parent.remove(placeholder);
    }
  }

  /**
   * Abort loading for a specific SKU
   */
  abortLoading(sku: string): void {
    const controller = this.loadingAbortControllers.get(sku);
    if (controller) {
      controller.abort();
      this.loadingAbortControllers.delete(sku);
    }

    // Clean up placeholder if exists
    const placeholder = this.activePlaceholders.get(sku);
    if (placeholder) {
      this.disposePlaceholder(placeholder);
      this.activePlaceholders.delete(sku);
    }
  }

  /**
   * Check if a model is currently loading progressively
   */
  isLoadingProgressively(sku: string): boolean {
    return this.activePlaceholders.has(sku);
  }

  /**
   * Get the placeholder for a given SKU if it exists
   */
  getPlaceholder(sku: string): THREE.Group | undefined {
    return this.activePlaceholders.get(sku);
  }

  /**
   * Clean up all active placeholders and abort all loading
   */
  cleanup(): void {
    // Abort all loading operations
    this.loadingAbortControllers.forEach((controller) => {
      controller.abort();
    });
    this.loadingAbortControllers.clear();

    // Dispose all placeholders
    this.activePlaceholders.forEach((placeholder) => {
      this.disposePlaceholder(placeholder);
    });
    this.activePlaceholders.clear();
  }
}

// Export singleton instance getter
export const getProgressiveModelLoader = (): ProgressiveModelLoader => {
  return ProgressiveModelLoader.getInstance();
};

// Export placeholder creation utility for external use
export const createModelPlaceholder = (
  dimensions: { width: number; height: number; depth?: number },
  config?: PlaceholderConfig
): THREE.Group => {
  return ProgressiveModelLoader.getInstance().createBoundingBoxPlaceholder(
    dimensions,
    config || DEFAULT_PLACEHOLDER_CONFIG
  );
};
