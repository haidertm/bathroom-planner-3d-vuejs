// src/services/progressiveModelLoader.ts
// Progressive Model Loading with Placeholder Support
// Shows actual model shape with ghost/wireframe material while loading

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
  wireframeColor: 0x6366f1, // Indigo color for wireframe
  fillColor: 0xe0e7ff,      // Light indigo
  fillOpacity: 0.4,
  wireframeOpacity: 0.9,
  showPulseAnimation: true
};

// Green color for progress bar
const PROGRESS_BAR_COLOR = 0x22c55e; // Tailwind green-500
const PROGRESS_BAR_BG_COLOR = 0x16a34a; // Tailwind green-600 (darker for background)

/**
 * ProgressiveModelLoader - Handles progressive loading of 3D models
 *
 * Loading Strategy:
 * 1. Load the actual model
 * 2. Apply ghost/placeholder materials to show the real shape
 * 3. Display progress bar on the model
 * 4. Restore original materials when fully loaded
 *
 * This shows the actual model silhouette while loading.
 */
export class ProgressiveModelLoader {
  private static instance: ProgressiveModelLoader;
  private modelManager: ModelManager;
  private activePlaceholders: Map<string, THREE.Group> = new Map();
  private loadingAbortControllers: Map<string, AbortController> = new Map();
  private originalMaterialsMap: Map<string, Map<THREE.Mesh, THREE.Material | THREE.Material[]>> = new Map();

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
   * Load a model progressively with instant placeholder feedback
   *
   * Flow:
   * 1. Show box placeholder immediately (instant feedback)
   * 2. Load the actual model in background
   * 3. When loaded, apply ghost materials and swap with box
   * 4. Restore real materials and notify full model ready
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

    console.log(`🔲 ProgressiveLoader - Model ${sku} NOT loaded, showing box placeholder first`);

    // Create abort controller for this load operation
    const abortController = new AbortController();
    this.loadingAbortControllers.set(sku, abortController);

    // Step 1: Create and show box placeholder IMMEDIATELY for instant feedback
    const boxPlaceholder = this.createBoundingBoxPlaceholder(
      modelConfig.dimensions,
      placeholderConfig
    );
    boxPlaceholder.name = `placeholder_${sku}`;
    boxPlaceholder.userData.isPlaceholder = true;
    boxPlaceholder.userData.isBoxPlaceholder = true;
    boxPlaceholder.userData.sku = sku;
    boxPlaceholder.userData.modelConfig = modelConfig;

    this.activePlaceholders.set(sku, boxPlaceholder);

    // Notify that box placeholder is ready (instant feedback)
    console.log(`🔲 Progressive: Box placeholder ready for ${sku}`);
    onPlaceholderReady?.(boxPlaceholder);
    onProgress?.(5);

    try {
      // Step 2: Load the actual model in background with progress tracking
      const handleProgress = (progress: number) => {
        if (abortController.signal.aborted) return;
        // Update progress bar on box placeholder
        this.updatePlaceholderProgress(boxPlaceholder, progress);
        onProgress?.(progress);
      };

      const model = await this.modelManager.loadModel(sku, modelConfig, handleProgress);

      // Check if loading was aborted
      if (abortController.signal.aborted) {
        console.log(`⚠️ Progressive: Loading aborted for ${sku}`);
        return boxPlaceholder;
      }

      // Step 3: Model loaded - apply ghost materials for shape preview
      const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
      this.applyGhostMaterials(model, originalMaterials, placeholderConfig);
      this.originalMaterialsMap.set(sku, originalMaterials);

      // Mark model as ghost placeholder
      model.name = `ghost_${sku}`;
      model.userData.isPlaceholder = true;
      model.userData.isGhostModel = true;
      model.userData.sku = sku;
      model.userData.modelConfig = modelConfig;

      // Add pulse animation to ghost model
      if (placeholderConfig.showPulseAnimation) {
        this.addPulseAnimation(model);
      }

      console.log(`🔲 Progressive: Ghost model ready, will restore materials for ${sku}`);

      // Update progress to 100%
      this.updatePlaceholderProgress(boxPlaceholder, 100);
      onProgress?.(100);

      // Step 4: Restore original materials (transition from ghost to real)
      // Small delay to show ghost effect briefly (optional - can be removed)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Restore original materials
      this.restoreOriginalMaterials(model, sku);

      // Stop animation
      if (model.userData.animationId) {
        cancelAnimationFrame(model.userData.animationId);
        delete model.userData.animationId;
      }

      // Update userData
      model.userData.isPlaceholder = false;
      model.userData.isGhostModel = false;
      model.name = `model_${sku}`;

      // Clean up
      this.activePlaceholders.delete(sku);
      this.loadingAbortControllers.delete(sku);

      console.log(`✅ Progressive: Full model ready for ${sku}`);

      // Notify that full model is ready (this will trigger the swap in sceneManager)
      onFullModelReady?.(model);

      return model;

    } catch (error) {
      console.error(`❌ Progressive: Failed to load model ${sku}:`, error);
      this.activePlaceholders.delete(sku);
      this.loadingAbortControllers.delete(sku);
      this.originalMaterialsMap.delete(sku);
      onError?.(error as Error);

      // Keep the box placeholder on error
      return boxPlaceholder;
    }
  }

  /**
   * Create a bounding box placeholder for instant feedback
   */
  createBoundingBoxPlaceholder(
    dimensions: { width: number; height: number; depth?: number },
    config: PlaceholderConfig = DEFAULT_PLACEHOLDER_CONFIG
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BoxPlaceholder';

    const w = dimensions.width;
    const h = dimensions.height;
    const d = dimensions.depth || dimensions.width;

    // Create box geometry - positioned so bottom is at y=0
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(0, h / 2, d / 2);

    // Create wireframe
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: config.wireframeColor,
      transparent: true,
      opacity: config.wireframeOpacity
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);

    // Create translucent fill
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: config.fillColor,
      transparent: true,
      opacity: config.fillOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fill = new THREE.Mesh(geometry.clone(), fillMaterial);

    group.add(wireframe);
    group.add(fill);

    // Add progress indicator
    const progressIndicator = this.createProgressIndicatorForBox(w, h, d);
    group.add(progressIndicator);

    // Store references for cleanup and progress updates
    group.userData.materials = [wireframeMaterial, fillMaterial];
    group.userData.geometries = [geometry, edgesGeometry];
    group.userData.progressIndicator = progressIndicator;
    group.userData.dimensions = { width: w, height: h, depth: d };

    // Add pulse animation
    if (config.showPulseAnimation) {
      this.addBoxPulseAnimation(group, fillMaterial);
    }

    return group;
  }

  /**
   * Create progress indicator for box placeholder
   */
  private createProgressIndicatorForBox(width: number, height: number, depth: number): THREE.Group {
    const indicatorGroup = new THREE.Group();
    indicatorGroup.name = 'ProgressIndicator';

    // Position at front center of the box
    indicatorGroup.position.set(0, height / 2, depth + 2);

    // Calculate radius based on box size
    const radius = Math.min(width, height) * 0.2;
    const tubeRadius = radius * 0.15;

    // Create background ring (full circle, darker green)
    const bgGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, 48, Math.PI * 2);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: PROGRESS_BAR_BG_COLOR,
      transparent: true,
      opacity: 0.3
    });
    const bgRing = new THREE.Mesh(bgGeometry, bgMaterial);
    bgRing.name = 'ProgressBackground';

    // Create progress arc
    const initialArc = Math.PI * 2 * 0.05;
    const progressGeometry = new THREE.TorusGeometry(radius, tubeRadius * 1.2, 8, 48, initialArc);
    const progressMaterial = new THREE.MeshBasicMaterial({
      color: PROGRESS_BAR_COLOR,
      transparent: true,
      opacity: 1.0
    });
    const progressRing = new THREE.Mesh(progressGeometry, progressMaterial);
    progressRing.rotation.z = Math.PI / 2; // Start from top
    progressRing.name = 'ProgressArc';

    indicatorGroup.add(bgRing);
    indicatorGroup.add(progressRing);

    // Store references for progress updates
    indicatorGroup.userData.progressRing = progressRing;
    indicatorGroup.userData.radius = radius;
    indicatorGroup.userData.tubeRadius = tubeRadius * 1.2;
    indicatorGroup.userData.currentProgress = 5;
    indicatorGroup.userData.materials = [bgMaterial, progressMaterial];
    indicatorGroup.userData.geometries = [bgGeometry, progressGeometry];

    return indicatorGroup;
  }

  /**
   * Add pulse animation to box placeholder
   */
  private addBoxPulseAnimation(group: THREE.Group, fillMaterial: THREE.MeshBasicMaterial): void {
    let animationId: number;
    const startTime = Date.now();
    const baseOpacity = fillMaterial.opacity;

    const animate = () => {
      if (!group.parent) {
        cancelAnimationFrame(animationId);
        return;
      }

      const elapsed = Date.now() - startTime;
      fillMaterial.opacity = baseOpacity + Math.sin(elapsed * 0.004) * 0.15;

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    group.userData.animationId = animationId;
  }

  /**
   * Apply ghost/placeholder materials to the model
   */
  private applyGhostMaterials(
    model: THREE.Group,
    originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>,
    config: PlaceholderConfig
  ): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material
        originalMaterials.set(child, child.material);

        // Create ghost material
        const ghostMaterial = new THREE.MeshBasicMaterial({
          color: config.fillColor,
          transparent: true,
          opacity: config.fillOpacity,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        // Create wireframe material
        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: config.wireframeColor,
          transparent: true,
          opacity: config.wireframeOpacity,
          wireframe: true
        });

        // Use an array of materials - ghost fill + wireframe overlay
        child.material = [ghostMaterial, wireframeMaterial];
      }
    });
  }

  /**
   * Restore original materials to the model
   */
  private restoreOriginalMaterials(model: THREE.Group, sku: string): void {
    const originalMaterials = this.originalMaterialsMap.get(sku);
    if (!originalMaterials) return;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh && originalMaterials.has(child)) {
        // Dispose ghost materials
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else if (child.material) {
          child.material.dispose();
        }

        // Restore original material
        child.material = originalMaterials.get(child)!;
      }
    });

    this.originalMaterialsMap.delete(sku);
  }

  /**
   * Update the progress on a placeholder's progress indicator
   */
  updatePlaceholderProgress(model: THREE.Group, progress: number): void {
    const progressIndicator = model.userData.progressIndicator || model.getObjectByName('ProgressIndicator');
    if (!progressIndicator) return;

    const progressRing = progressIndicator.userData.progressRing as THREE.Mesh;
    if (!progressRing) return;

    const radius = progressIndicator.userData.radius;
    const tubeRadius = progressIndicator.userData.tubeRadius;
    const currentProgress = progressIndicator.userData.currentProgress || 0;

    // Only update if progress changed significantly
    if (Math.abs(progress - currentProgress) < 1) return;

    // Calculate arc length based on progress
    const arcLength = Math.PI * 2 * (progress / 100);

    // Dispose old geometry
    progressRing.geometry.dispose();

    // Create new geometry with updated arc
    const newGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, 48, arcLength);
    progressRing.geometry = newGeometry;

    // Update stored progress
    progressIndicator.userData.currentProgress = progress;

    // Update geometries array for disposal
    const geometries = progressIndicator.userData.geometries as THREE.BufferGeometry[];
    if (geometries && geometries.length > 1) {
      geometries[1] = newGeometry;
    }
  }

  /**
   * Dispose progress indicator resources
   */
  private disposeProgressIndicator(indicator: THREE.Group): void {
    if (indicator.userData.geometries) {
      indicator.userData.geometries.forEach((geo: THREE.BufferGeometry) => geo.dispose());
    }
    if (indicator.userData.materials) {
      indicator.userData.materials.forEach((mat: THREE.Material) => mat.dispose());
    }
  }

  /**
   * Add pulse animation to the ghost model
   */
  private addPulseAnimation(model: THREE.Group): void {
    let animationId: number;
    const startTime = Date.now();
    const meshesWithGhostMaterial: THREE.Mesh[] = [];

    // Collect all meshes with ghost materials
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && Array.isArray(child.material)) {
        meshesWithGhostMaterial.push(child);
      }
    });

    const animate = () => {
      if (!model.parent) {
        cancelAnimationFrame(animationId);
        return;
      }

      const elapsed = Date.now() - startTime;

      // Pulse the ghost material opacity
      meshesWithGhostMaterial.forEach((mesh) => {
        if (Array.isArray(mesh.material)) {
          const ghostMat = mesh.material[0] as THREE.MeshBasicMaterial;
          if (ghostMat) {
            ghostMat.opacity = 0.3 + Math.sin(elapsed * 0.004) * 0.15;
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    model.userData.animationId = animationId;
  }

  /**
   * Create a fallback box placeholder (used when model loading fails)
   */
  private createFallbackBoxPlaceholder(
    dimensions: { width: number; height: number; depth?: number },
    config: PlaceholderConfig
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FallbackPlaceholder';

    const w = dimensions.width;
    const h = dimensions.height;
    const d = dimensions.depth || dimensions.width;

    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(0, h / 2, d / 2);

    // Create wireframe
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: config.wireframeColor,
      transparent: true,
      opacity: config.wireframeOpacity
    });
    const wireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);

    // Create fill
    const fillMaterial = new THREE.MeshBasicMaterial({
      color: config.fillColor,
      transparent: true,
      opacity: config.fillOpacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fill = new THREE.Mesh(geometry.clone(), fillMaterial);

    group.add(wireframe);
    group.add(fill);

    group.userData.materials = [wireframeMaterial, fillMaterial];
    group.userData.geometries = [geometry, edgesGeometry];

    return group;
  }

  /**
   * Properly dispose of a placeholder and its resources
   */
  disposePlaceholder(placeholder: THREE.Object3D): void {
    // Stop animation if running
    if (placeholder.userData.animationId) {
      cancelAnimationFrame(placeholder.userData.animationId);
    }

    // Dispose progress indicator
    const progressIndicator = placeholder.userData.progressIndicator;
    if (progressIndicator) {
      this.disposeProgressIndicator(progressIndicator);
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

      if (child.userData.geometries) {
        child.userData.geometries.forEach((geo: THREE.BufferGeometry) => geo.dispose());
      }
      if (child.userData.materials) {
        child.userData.materials.forEach((mat: THREE.Material) => mat.dispose());
      }
    });

    // Remove from parent
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

    const placeholder = this.activePlaceholders.get(sku);
    if (placeholder) {
      this.disposePlaceholder(placeholder);
      this.activePlaceholders.delete(sku);
    }

    this.originalMaterialsMap.delete(sku);
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
    this.loadingAbortControllers.forEach((controller) => {
      controller.abort();
    });
    this.loadingAbortControllers.clear();

    this.activePlaceholders.forEach((placeholder) => {
      this.disposePlaceholder(placeholder);
    });
    this.activePlaceholders.clear();

    this.originalMaterialsMap.clear();
  }
}

// Export singleton instance getter
export const getProgressiveModelLoader = (): ProgressiveModelLoader => {
  return ProgressiveModelLoader.getInstance();
};

// Export placeholder creation utility for external use (fallback box)
export const createModelPlaceholder = (
  dimensions: { width: number; height: number; depth?: number },
  config?: PlaceholderConfig
): THREE.Group => {
  return ProgressiveModelLoader.getInstance()['createFallbackBoxPlaceholder'](
    dimensions,
    config || DEFAULT_PLACEHOLDER_CONFIG
  );
};
