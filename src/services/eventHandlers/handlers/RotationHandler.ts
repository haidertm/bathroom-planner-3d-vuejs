/**
 * RotationHandler - Handles object rotation and rotation arrow interactions.
 * Extracted from EventHandlers.ts for better modularity.
 */

import * as THREE from 'three';
import type { SharedState } from '../SharedState';
import type { BathroomItem } from '../../../utils/constraints';
import { canRotateFreely, getMovementConfig } from '../../../utils/models';
import { snapRotationTo90Degrees } from '../../../utils/groupConstraints';

export class RotationHandler {
  private state: SharedState;

  constructor(state: SharedState) {
    this.state = state;
  }

  // ============================================================================
  // OBJECT ROTATION (Right-click drag)
  // ============================================================================

  /**
   * Start object rotation operation.
   */
  public startObjectRotation(event: MouseEvent): boolean {
    if (!this.state.selectedObject) return false;

    const itemId = this.state.selectedObject.userData.itemId;
    const currentItem = this.getCurrentItemData(itemId);
    const movementConfig = getMovementConfig(this.state.selectedObject.userData.type, currentItem);

    // Only allow rotation for items with free rotation enabled
    if (!movementConfig?.allowFreeRotation) {
      return false;
    }

    this.state.isObjectRotating = true;
    this.state.objectStartRotation = this.state.selectedObject.rotation.y;

    // Calculate rotation start angle from mouse position
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    this.state.rotationStartAngle = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX
    );

    // Store original rotations for multi-select
    if (this.state.selectedObjects.size > 1) {
      this.state.selectedObjects.forEach((obj, id) => {
        this.state.multiSelectStartRotations.set(id, obj.rotation.y);
      });
    }

    return true;
  }

  /**
   * Handle object rotation during mouse move.
   */
  public handleObjectRotation(event: MouseEvent): void {
    if (!this.state.isObjectRotating || !this.state.selectedObject) return;

    // Calculate current angle from mouse position
    const rect = this.state.renderer.domElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX
    );

    // Calculate rotation delta
    const rotationDelta = currentAngle - this.state.rotationStartAngle;

    // Apply rotation to primary object
    this.state.selectedObject.rotation.y = this.state.objectStartRotation + rotationDelta;

    // Apply rotation to all selected objects in multi-select
    if (this.state.selectedObjects.size > 1) {
      this.state.selectedObjects.forEach((obj, id) => {
        if (id !== this.state.selectedObject!.userData.itemId) {
          const startRotation = this.state.multiSelectStartRotations.get(id) || 0;
          obj.rotation.y = startRotation + rotationDelta;
        }
      });
    }

    // Update schematic overlays in 2D mode
    this.state.selectedObjects.forEach((_, id) => {
      this.emitSchematicUpdateEvent(id);
    });
  }

  /**
   * End object rotation operation.
   */
  public endObjectRotation(): void {
    if (!this.state.isObjectRotating) return;

    this.state.isObjectRotating = false;

    // Queue updates for all rotated objects
    if (this.state.selectedObjects.size > 0) {
      this.state.selectedObjects.forEach((obj, id) => {
        this.state.pendingUpdates.set(id, {
          rotation: obj.rotation.y
        });
      });
    } else if (this.state.selectedObject) {
      const itemId = this.state.selectedObject.userData.itemId;
      this.state.pendingUpdates.set(itemId, {
        rotation: this.state.selectedObject.rotation.y
      });
    }
  }

  // ============================================================================
  // ROTATION ARROWS
  // ============================================================================

  /**
   * Set whether rotation arrows are enabled.
   */
  public setRotationArrowsEnabled(enabled: boolean): void {
    if (this.state.rotationArrows) {
      this.state.rotationArrows.setEnabled(enabled);
    }
  }

  /**
   * Check if rotation arrows are enabled.
   */
  public areRotationArrowsEnabled(): boolean {
    return this.state.rotationArrows?.isEnabled() ?? false;
  }

  /**
   * Handle rotation change from rotation arrows.
   * This is called by the rotation arrows callback.
   */
  public handleRotationArrowChange(rotation: number): void {
    if (!this.state.selectedObject) return;

    const itemId = this.state.selectedObject.userData.itemId as number;

    // Update the object's rotation
    this.state.selectedObject.rotation.y = rotation;

    // Queue update
    this.state.pendingUpdates.set(itemId, {
      rotation: rotation
    });

    // Update schematic overlay in 2D mode
    this.emitSchematicUpdateEvent(itemId);
  }

  /**
   * Snap rotation to nearest 90 degrees.
   */
  public snapToNearestRotation(object: THREE.Object3D): number {
    return snapRotationTo90Degrees(object.rotation.y);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Check if rotation is allowed for the selected object.
   */
  public canRotate(): boolean {
    if (!this.state.selectedObject) return false;

    const itemId = this.state.selectedObject.userData.itemId;
    const currentItem = this.getCurrentItemData(itemId);

    return canRotateFreely(this.state.selectedObject.userData.type, currentItem);
  }

  /**
   * Get the current item data for an item ID.
   */
  private getCurrentItemData(itemId: number): BathroomItem | undefined {
    const items = this.state.getCurrentItems();
    return items.find(item => item.id === itemId);
  }

  /**
   * Check if currently rotating an object.
   */
  public isRotatingObject(): boolean {
    return this.state.isObjectRotating;
  }

  /**
   * Emit schematic update event for 2D mode.
   */
  private emitSchematicUpdateEvent(itemId: number): void {
    if (this.state.eventBus) {
      this.state.eventBus.emit('schematic:update', { itemId });
    }
  }
}
