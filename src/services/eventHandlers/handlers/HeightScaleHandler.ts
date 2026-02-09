/**
 * HeightScaleHandler - Handles height adjustment and scaling of objects.
 * Extracted from EventHandlers.ts for better modularity.
 */

import type { SharedState } from '../SharedState';
import type { BathroomItem } from '../../../utils/constraints';
import { SCALE_LIMITS } from '../../../constants/dimensions';
import { canMoveVertically, getMovementConfig } from '../../../utils/models';

export class HeightScaleHandler {
  private state: SharedState;

  constructor(state: SharedState) {
    this.state = state;
  }

  // ============================================================================
  // HEIGHT ADJUSTMENT
  // ============================================================================

  /**
   * Start height adjustment operation.
   */
  public startHeightAdjust(event: MouseEvent): boolean {
    if (!this.state.selectedObject) return false;

    const itemId = this.state.selectedObject.userData.itemId;
    const currentItem = this.getCurrentItemData(itemId);
    const movementConfig = getMovementConfig(this.state.selectedObject.userData.type, currentItem);

    // Only allow height adjustment for items with vertical movement enabled
    if (!movementConfig?.allowVerticalMovement) {
      return false;
    }

    this.state.isHeightAdjusting = true;
    this.state.heightStartY = this.state.selectedObject.position.y;
    this.state.mouseStartY = event.clientY;

    // Store original position for all selected objects in multi-select
    if (this.state.selectedObjects.size > 1) {
      this.state.selectedObjects.forEach((obj, id) => {
        this.state.multiSelectStartPositions.set(id, obj.position.clone());
      });
    }

    return true;
  }

  /**
   * Handle height adjustment during mouse move.
   */
  public handleHeightAdjust(event: MouseEvent): void {
    if (!this.state.isHeightAdjusting || !this.state.selectedObject) return;

    const deltaY = this.state.mouseStartY - event.clientY;
    const heightChange = deltaY * 0.5; // Scale factor for height adjustment

    const itemId = this.state.selectedObject.userData.itemId;
    const currentItem = this.getCurrentItemData(itemId);
    const movementConfig = getMovementConfig(this.state.selectedObject.userData.type, currentItem);

    if (!movementConfig) return;

    // Calculate new height with constraints
    const newHeight = Math.max(
      movementConfig.minHeight || 0,
      Math.min(
        movementConfig.maxHeight || 250,
        this.state.heightStartY + heightChange
      )
    );

    // Apply to primary selected object
    this.state.selectedObject.position.y = newHeight;

    // Apply to all selected objects in multi-select (maintain relative heights)
    if (this.state.selectedObjects.size > 1) {
      const primaryStartY = this.state.multiSelectStartPositions.get(itemId)?.y || this.state.heightStartY;
      const heightDelta = newHeight - primaryStartY;

      this.state.selectedObjects.forEach((obj, id) => {
        if (id !== itemId) {
          const startPos = this.state.multiSelectStartPositions.get(id);
          if (startPos) {
            const objItem = this.getCurrentItemData(id);
            const objConfig = getMovementConfig(obj.userData.type, objItem);

            if (objConfig?.allowVerticalMovement) {
              const objNewHeight = Math.max(
                objConfig.minHeight || 0,
                Math.min(objConfig.maxHeight || 250, startPos.y + heightDelta)
              );
              obj.position.y = objNewHeight;
            }
          }
        }
      });
    }
  }

  /**
   * End height adjustment operation.
   */
  public endHeightAdjust(): void {
    if (!this.state.isHeightAdjusting) return;

    this.state.isHeightAdjusting = false;

    // Queue updates for all adjusted objects
    if (this.state.selectedObjects.size > 0) {
      this.state.selectedObjects.forEach((obj, id) => {
        this.state.pendingUpdates.set(id, {
          position: [obj.position.x, obj.position.y, obj.position.z]
        });
      });
    } else if (this.state.selectedObject) {
      const itemId = this.state.selectedObject.userData.itemId;
      this.state.pendingUpdates.set(itemId, {
        position: [
          this.state.selectedObject.position.x,
          this.state.selectedObject.position.y,
          this.state.selectedObject.position.z
        ]
      });
    }
  }

  // ============================================================================
  // SCALING
  // ============================================================================

  /**
   * Start scaling operation.
   */
  public startScaling(event: MouseEvent): boolean {
    if (!this.state.selectedObject) return false;

    this.state.isScaling = true;
    this.state.scaleStart = this.state.selectedObject.scale.x;
    this.state.mouseStartY = event.clientY;

    return true;
  }

  /**
   * Handle scaling during mouse move.
   */
  public handleScaling(event: MouseEvent): void {
    if (!this.state.isScaling || !this.state.selectedObject) return;

    const deltaY = this.state.mouseStartY - event.clientY;
    const scaleFactor = 1 + (deltaY * 0.005); // Scale factor for scaling

    // Calculate new scale with constraints
    const newScale = Math.max(
      SCALE_LIMITS.MIN,
      Math.min(SCALE_LIMITS.MAX, this.state.scaleStart * scaleFactor)
    );

    // Apply uniform scaling
    this.state.selectedObject.scale.set(newScale, newScale, newScale);
  }

  /**
   * End scaling operation.
   */
  public endScaling(): void {
    if (!this.state.isScaling || !this.state.selectedObject) return;

    this.state.isScaling = false;

    // Queue update
    const itemId = this.state.selectedObject.userData.itemId;
    this.state.pendingUpdates.set(itemId, {
      scale: this.state.selectedObject.scale.x
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Check if height adjustment is allowed for the selected object.
   */
  public canAdjustHeight(): boolean {
    if (!this.state.selectedObject) return false;

    const itemId = this.state.selectedObject.userData.itemId;
    const currentItem = this.getCurrentItemData(itemId);

    return canMoveVertically(this.state.selectedObject.userData.type, currentItem);
  }

  /**
   * Get the current item data for an item ID.
   */
  private getCurrentItemData(itemId: number): BathroomItem | undefined {
    const items = this.state.getCurrentItems();
    return items.find(item => item.id === itemId);
  }

  /**
   * Check if currently adjusting height.
   */
  public isAdjustingHeight(): boolean {
    return this.state.isHeightAdjusting;
  }

  /**
   * Check if currently scaling.
   */
  public isScalingObject(): boolean {
    return this.state.isScaling;
  }
}
