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
  wireframeColor: 0x6366f1, // Indigo color for wireframe
  fillColor: 0xe0e7ff,      // Light indigo
  fillOpacity: 0.3,
  wireframeOpacity: 0.8,
  showPulseAnimation: true
};

// Green color for progress bar
const PROGRESS_BAR_COLOR = 0x22c55e; // Tailwind green-500
const PROGRESS_BAR_BG_COLOR = 0x16a34a; // Tailwind green-600 (darker for background)

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

    // Step 2: Load full model in background with REAL progress tracking
    try {
      // Create progress handler that updates both visual and callback
      const handleProgress = (progress: number) => {
        if (abortController.signal.aborted) return;

        // Update visual progress bar on placeholder
        this.updatePlaceholderProgress(placeholder, progress);

        // Notify external callback
        onProgress?.(progress);
      };

      // Actually load the model with real progress callback
      const fullModel = await this.modelManager.loadModel(sku, modelConfig, handleProgress);

      // Check if loading was aborted
      if (abortController.signal.aborted) {
        console.log(`⚠️ Progressive: Loading aborted for ${sku}`);
        return placeholder;
      }

      // Ensure progress shows 100% complete
      this.updatePlaceholderProgress(placeholder, 100);
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
   * Create a circular progress indicator for the placeholder
   */
  private createLoadingIndicator(
    width: number,
    height: number,
    depth: number,
    _config: PlaceholderConfig // Unused - using hardcoded green colors
  ): THREE.Group {
    const indicatorGroup = new THREE.Group();

    // Position at FRONT CENTER of placeholder (facing the user)
    // The placeholder: back at z=0 (wall), front at z=depth, bottom at y=0, top at y=height
    // Place progress bar at center of front face, slightly in front
    indicatorGroup.position.set(0, height / 2, depth + 2);

    // Calculate radius based on placeholder size - make it more visible
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
    // No rotation - ring faces forward (toward user) by default
    bgRing.name = 'ProgressBackground';

    // Create progress arc (starts at 0, grows to full circle)
    // Start with a tiny arc (5% = ~18 degrees)
    const initialArc = Math.PI * 2 * 0.05;
    const progressGeometry = new THREE.TorusGeometry(radius, tubeRadius * 1.2, 8, 48, initialArc);
    const progressMaterial = new THREE.MeshBasicMaterial({
      color: PROGRESS_BAR_COLOR, // Bright green
      transparent: true,
      opacity: 1.0
    });
    const progressRing = new THREE.Mesh(progressGeometry, progressMaterial);
    // No rotation.x - ring faces forward
    progressRing.rotation.z = Math.PI / 2; // Start from top (12 o'clock)
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
   * Update the progress on a placeholder's circular progress bar
   */
  updatePlaceholderProgress(placeholder: THREE.Group, progress: number): void {
    const loadingIndicator = placeholder.getObjectByName('PlaceholderLoadingIndicator');
    if (!loadingIndicator) return;

    const progressRing = loadingIndicator.userData.progressRing as THREE.Mesh;
    if (!progressRing) return;

    const radius = loadingIndicator.userData.radius;
    const tubeRadius = loadingIndicator.userData.tubeRadius;
    const currentProgress = loadingIndicator.userData.currentProgress || 0;

    // Only update if progress changed significantly (avoid too many geometry updates)
    if (Math.abs(progress - currentProgress) < 1) return;

    // Calculate arc length based on progress (0-100 -> 0 to 2*PI)
    const arcLength = Math.PI * 2 * (progress / 100);

    // Dispose old geometry
    progressRing.geometry.dispose();

    // Create new geometry with updated arc
    const newGeometry = new THREE.TorusGeometry(radius, tubeRadius, 8, 48, arcLength);
    progressRing.geometry = newGeometry;

    // Update stored progress
    loadingIndicator.userData.currentProgress = progress;

    // Update geometries array for disposal
    const geometries = loadingIndicator.userData.geometries as THREE.BufferGeometry[];
    if (geometries && geometries.length > 1) {
      geometries[1] = newGeometry;
    }
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

      // Add subtle glow pulse to progress bar
      const loadingIndicator = group.getObjectByName('PlaceholderLoadingIndicator');
      if (loadingIndicator) {
        const progressRing = loadingIndicator.userData.progressRing as THREE.Mesh;
        if (progressRing && progressRing.material instanceof THREE.MeshBasicMaterial) {
          // Subtle pulse on the progress ring opacity
          progressRing.material.opacity = 0.85 + Math.sin(elapsed * 0.006) * 0.15;
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Start animation
    animationId = requestAnimationFrame(animate);

    // Store animation ID for cleanup
    group.userData.animationId = animationId;
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
