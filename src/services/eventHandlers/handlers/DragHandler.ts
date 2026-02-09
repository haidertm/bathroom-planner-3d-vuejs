/**
 * DragHandler - Handles object dragging state and coordination.
 * Extracted from EventHandlers.ts for better modularity.
 *
 * Note: Complex constraint logic remains in the original EventHandlers.ts
 * This handler provides a cleaner interface for drag operations.
 */

import * as THREE from 'three';
import type { SharedState } from '../SharedState';
import type { BathroomItem } from '../../../utils/constraints';
import type { UpdateData } from '../types';

export class DragHandler {
  private state: SharedState;

  constructor(state: SharedState) {
    this.state = state;
  }

  // ============================================================================
  // DRAG STATE
  // ============================================================================

  /**
   * Check if currently dragging.
   */
  public isDragging(): boolean {
    return this.state.isDragging;
  }

  /**
   * Check if a drag operation is in progress.
   */
  public isDragOperationActive(): boolean {
    return this.state.isDragOperation;
  }

  /**
   * Get the original position before drag started.
   */
  public getOriginalPosition(): THREE.Vector3 {
    return this.state.originalDragPosition.clone();
  }

  /**
   * Get the original rotation before drag started.
   */
  public getOriginalRotation(): number {
    return this.state.originalDragRotation;
  }

  // ============================================================================
  // DRAG INITIALIZATION
  // ============================================================================

  /**
   * Initialize drag state for starting a drag operation.
   * The actual drag logic remains in EventHandlers.ts.
   */
  public initializeDragState(object: THREE.Object3D): void {
    this.state.isDragging = true;
    this.state.isDragOperation = true;

    // Store original position for collision snap-back
    this.state.originalDragPosition.copy(object.position);
    this.state.originalDragRotation = object.rotation.y;

    // Notify listeners
    if (this.state.onDragStart) {
      this.state.onDragStart();
    }
  }

  /**
   * Initialize multi-select drag state.
   */
  public initializeMultiSelectState(): void {
    if (!this.state.selectedObject) return;

    const primaryPos = this.state.selectedObject.position.clone();
    const primaryRot = this.state.selectedObject.rotation.y;

    this.state.selectedObjects.forEach((obj, id) => {
      this.state.multiSelectStartPositions.set(id, obj.position.clone());
      this.state.multiSelectStartRotations.set(id, obj.rotation.y);

      // Calculate local offset from primary object
      const localOffset = obj.position.clone().sub(primaryPos);
      this.state.multiSelectLocalOffsets.set(id, localOffset);

      // Calculate rotation offset from primary
      this.state.multiSelectLocalRotations.set(id, obj.rotation.y - primaryRot);
    });
  }

  // ============================================================================
  // DRAG PLANE
  // ============================================================================

  /**
   * Set up the drag plane at the object's Y position.
   */
  public setupDragPlane(objectY: number): void {
    this.state.dragPlane.set(new THREE.Vector3(0, 1, 0), -objectY);
  }

  /**
   * Calculate the drag offset from intersection point.
   */
  public calculateDragOffset(intersectionPoint: THREE.Vector3, objectPosition: THREE.Vector3): void {
    this.state.dragOffset.copy(intersectionPoint).sub(objectPosition);
    this.state.dragOffset.y = 0; // Keep offset horizontal
  }

  /**
   * Get the drag intersection point on the drag plane.
   */
  public getDragIntersection(mouse: THREE.Vector2): THREE.Vector3 | null {
    this.state.raycaster.setFromCamera(mouse, this.state.getActiveCamera());

    const intersection = new THREE.Vector3();
    if (this.state.raycaster.ray.intersectPlane(this.state.dragPlane, intersection)) {
      return intersection.sub(this.state.dragOffset);
    }

    return null;
  }

  // ============================================================================
  // DRAG END
  // ============================================================================

  /**
   * End the drag operation and update state.
   */
  public endDrag(): void {
    this.state.isDragging = false;
    this.state.isDragOperation = false;

    // Notify listeners
    if (this.state.onDragEnd) {
      this.state.onDragEnd();
    }
  }

  /**
   * Snap the selected object back to its original position.
   */
  public snapBackToOriginalPosition(): void {
    if (!this.state.selectedObject) return;

    // Snap back primary object
    this.state.selectedObject.position.copy(this.state.originalDragPosition);
    this.state.selectedObject.rotation.y = this.state.originalDragRotation;

    // Snap back other selected objects
    if (this.state.selectedObjects.size > 1) {
      this.state.selectedObjects.forEach((obj, id) => {
        const startPos = this.state.multiSelectStartPositions.get(id);
        const startRot = this.state.multiSelectStartRotations.get(id);

        if (startPos) {
          obj.position.copy(startPos);
        }
        if (startRot !== undefined) {
          obj.rotation.y = startRot;
        }

        // Update schematic overlay
        this.emitSchematicUpdateEvent(id);
      });
    }

    // Show toast notification
    if (this.state.onShowToast) {
      this.state.onShowToast('Cannot place here - collision detected', 'warning');
    }
  }

  // ============================================================================
  // PENDING UPDATES
  // ============================================================================

  /**
   * Queue an update for an item.
   */
  public queueUpdate(itemId: number, updateData: UpdateData): void {
    this.state.pendingUpdates.set(itemId, updateData);
  }

  /**
   * Queue updates for all selected objects.
   */
  public queueAllSelectedUpdates(): void {
    this.state.selectedObjects.forEach((obj, id) => {
      const updateData: UpdateData = {
        position: [obj.position.x, obj.position.y, obj.position.z],
        rotation: obj.rotation.y
      };
      this.state.pendingUpdates.set(id, updateData);
    });
  }

  /**
   * Get pending updates.
   */
  public getPendingUpdates(): Map<number, UpdateData> {
    return this.state.pendingUpdates;
  }

  /**
   * Clear pending updates.
   */
  public clearPendingUpdates(): void {
    this.state.pendingUpdates.clear();
  }

  // ============================================================================
  // MULTI-SELECT HELPERS
  // ============================================================================

  /**
   * Get the local offset for an object in multi-select.
   */
  public getMultiSelectOffset(itemId: number): THREE.Vector3 | undefined {
    return this.state.multiSelectLocalOffsets.get(itemId);
  }

  /**
   * Get the local rotation offset for an object in multi-select.
   */
  public getMultiSelectRotationOffset(itemId: number): number | undefined {
    return this.state.multiSelectLocalRotations.get(itemId);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Emit schematic update event for 2D mode.
   */
  private emitSchematicUpdateEvent(itemId: number): void {
    if (this.state.eventBus) {
      this.state.eventBus.emit('schematic:update', { itemId });
    }
  }

  /**
   * Get the current item data for an item ID.
   */
  public getCurrentItemData(itemId: number): BathroomItem | undefined {
    const items = this.state.getCurrentItems();
    return items.find(item => item.id === itemId);
  }
}
