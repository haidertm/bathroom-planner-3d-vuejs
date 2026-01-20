// src/services/groupGhostManager.ts
// Manages red ghost visualization for invalid movement positions

import * as THREE from 'three';
import type { GroupTransform } from '../types/groupConstraints';
import { DEFAULT_GHOST_CONFIG, GhostConfig } from '../types/groupConstraints';

/**
 * GroupGhostManager - Manages red ghost visualization for invalid movement
 *
 * When movement would cause a constraint violation, the actual objects stay
 * at their last valid position while red transparent ghosts follow the cursor
 * to show where the user is trying to move.
 */
export class GroupGhostManager {
  private scene: THREE.Scene;
  private ghosts: Map<number, THREE.Object3D> = new Map();
  private ghostMaterial: THREE.MeshBasicMaterial;
  private config: GhostConfig;
  private isVisible: boolean = false;

  constructor(scene: THREE.Scene, config: GhostConfig = DEFAULT_GHOST_CONFIG) {
    this.scene = scene;
    this.config = config;

    // Create shared ghost material
    this.ghostMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: config.opacity,
      wireframe: config.wireframe,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  /**
   * Create ghost objects for all selected objects
   */
  public createGhosts(selectedObjects: Map<number, THREE.Object3D>): void {
    this.clearGhosts();

    selectedObjects.forEach((object, id) => {
      const ghost = this.cloneAsGhost(object);
      if (ghost) {
        ghost.userData.isGhost = true;
        ghost.userData.sourceId = id;
        ghost.visible = false; // Start hidden
        this.scene.add(ghost);
        this.ghosts.set(id, ghost);
      }
    });

    console.log(`👻 Created ${this.ghosts.size} ghost objects`);
  }

  /**
   * Clone an object as a ghost (red transparent version)
   */
  private cloneAsGhost(object: THREE.Object3D): THREE.Object3D | null {
    try {
      // Clone the object
      const ghost = object.clone(true);

      // Apply ghost material to all meshes
      ghost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Store original material for reference
          const originalMaterial = child.material;

          // Create a new ghost material instance for this mesh
          const ghostMat = this.ghostMaterial.clone();

          // If original material has a color, tint the ghost with it
          if (originalMaterial instanceof THREE.MeshStandardMaterial ||
              originalMaterial instanceof THREE.MeshBasicMaterial ||
              originalMaterial instanceof THREE.MeshPhongMaterial) {
            // Keep some hint of original color blended with red
            const originalColor = originalMaterial.color;
            const blendedColor = new THREE.Color(this.config.color);
            blendedColor.lerp(originalColor, 0.2);
            ghostMat.color.copy(blendedColor);
          }

          child.material = ghostMat;

          // Disable shadows for ghost
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });

      // Set render order to ensure ghosts render on top
      ghost.renderOrder = 999;

      return ghost;
    } catch (error) {
      console.warn('Failed to create ghost for object:', error);
      return null;
    }
  }

  /**
   * Update ghost positions based on invalid transform
   */
  public updateGhosts(
    invalidTransform: GroupTransform,
    localOffsets: Map<number, THREE.Vector3>,
    localRotations: Map<number, number>
  ): void {
    if (this.ghosts.size === 0) return;

    const primaryPos = new THREE.Vector3(
      invalidTransform.primaryPosition.x,
      invalidTransform.primaryPosition.y,
      invalidTransform.primaryPosition.z
    );

    this.ghosts.forEach((ghost, id) => {
      // Get the transform for this specific item if available
      const itemTransform = invalidTransform.itemTransforms.get(id);

      if (itemTransform) {
        // Use the calculated transform
        ghost.position.copy(itemTransform.position);
        ghost.rotation.y = itemTransform.rotation;
      } else {
        // Calculate from local offsets
        const localOffset = localOffsets.get(id);
        const localRot = localRotations.get(id);

        if (localOffset !== undefined && localRot !== undefined) {
          const worldOffset = localOffset.clone().applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            invalidTransform.primaryRotation
          );
          ghost.position.copy(primaryPos).add(worldOffset);
          ghost.rotation.y = invalidTransform.primaryRotation + localRot;
        } else {
          // Fallback to primary position
          ghost.position.copy(primaryPos);
          ghost.rotation.y = invalidTransform.primaryRotation;
        }
      }

      ghost.visible = true;
    });

    this.isVisible = true;
    console.log('👻 Ghosts updated to invalid position');
  }

  /**
   * Hide all ghosts (when movement becomes valid)
   */
  public hideGhosts(): void {
    if (!this.isVisible) return;

    this.ghosts.forEach((ghost) => {
      ghost.visible = false;
    });

    this.isVisible = false;
    console.log('👻 Ghosts hidden');
  }

  /**
   * Show all ghosts
   */
  public showGhosts(): void {
    this.ghosts.forEach((ghost) => {
      ghost.visible = true;
    });
    this.isVisible = true;
  }

  /**
   * Clear all ghost objects from scene
   */
  public clearGhosts(): void {
    this.ghosts.forEach((ghost) => {
      // Dispose of materials
      ghost.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
          if (child.geometry) {
            child.geometry.dispose();
          }
        }
      });

      this.scene.remove(ghost);
    });

    this.ghosts.clear();
    this.isVisible = false;
    console.log('👻 Ghosts cleared');
  }

  /**
   * Check if ghosts are currently visible
   */
  public isGhostsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Update ghost configuration
   */
  public updateConfig(config: Partial<GhostConfig>): void {
    this.config = { ...this.config, ...config };

    // Update material
    this.ghostMaterial.color.set(this.config.color);
    this.ghostMaterial.opacity = this.config.opacity;
    this.ghostMaterial.wireframe = this.config.wireframe;

    // Update existing ghosts
    this.ghosts.forEach((ghost) => {
      ghost.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.set(this.config.color);
          child.material.opacity = this.config.opacity;
          child.material.wireframe = this.config.wireframe;
        }
      });
    });
  }

  /**
   * Set ghost color for collision state
   */
  public setCollisionState(isColliding: boolean): void {
    const color = isColliding ? 0xff0000 : 0xffff00; // Red for collision, yellow for warning
    this.updateConfig({ color });
  }

  /**
   * Get all ghost objects
   */
  public getGhosts(): Map<number, THREE.Object3D> {
    return this.ghosts;
  }

  /**
   * Check if a specific object has a ghost
   */
  public hasGhost(id: number): boolean {
    return this.ghosts.has(id);
  }

  /**
   * Get ghost for a specific object ID
   */
  public getGhost(id: number): THREE.Object3D | undefined {
    return this.ghosts.get(id);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clearGhosts();
    this.ghostMaterial.dispose();
  }
}

/**
 * Singleton instance getter
 */
let ghostManagerInstance: GroupGhostManager | null = null;

export const getGroupGhostManager = (scene: THREE.Scene): GroupGhostManager => {
  if (!ghostManagerInstance) {
    ghostManagerInstance = new GroupGhostManager(scene);
  }
  return ghostManagerInstance;
};

export const clearGroupGhostManager = (): void => {
  if (ghostManagerInstance) {
    ghostManagerInstance.dispose();
    ghostManagerInstance = null;
  }
};
