/**
 * SelectionHandler - Handles object selection, multi-select, and highlighting.
 * Extracted from EventHandlers.ts for better modularity.
 */

import * as THREE from 'three';
import type { SharedState } from '../SharedState';
import type { IntersectionResult } from '../types';
import type { BathroomItem } from '../../../utils/constraints';
import { getMovementConfig } from '../../../utils/models';

export class SelectionHandler {
  private state: SharedState;

  constructor(state: SharedState) {
    this.state = state;
  }

  // ============================================================================
  // RAYCASTING
  // ============================================================================

  /**
   * Get the object at the mouse position using raycasting.
   * Returns null if clicking on a wall or empty space.
   */
  public getIntersectedObject(mouse: THREE.Vector2): IntersectionResult | null {
    this.state.raycaster.setFromCamera(mouse, this.state.getActiveCamera());

    // Raycast against all objects, but filter results by visibility
    const intersects = this.state.raycaster.intersectObjects(this.state.scene.children, true);

    // Filter out invisible objects and sort by distance (closest first)
    const visibleIntersects = intersects
      .filter(intersect => intersect.object.visible)
      .sort((a, b) => a.distance - b.distance);

    // Process intersections in order of distance (closest first)
    for (const intersect of visibleIntersects) {
      const obj = intersect.object;

      // If it's a wall, block further object selection
      if (obj.userData.isWall) {
        return null; // Camera rotation
      }

      // Check if clicked on a 2D schematic overlay - return the linked bathroom object
      let schematicParent = obj;
      while (schematicParent.parent && !schematicParent.userData.isSchematic2D) {
        schematicParent = schematicParent.parent;
      }
      if (schematicParent.userData.isSchematic2D && schematicParent.userData.linkedModel) {
        return { object: schematicParent.userData.linkedModel, point: intersect.point };
      }

      // If it's a bathroom object, check if it's the parent or find the parent
      let bathroomObj = obj;
      while (bathroomObj.parent && !bathroomObj.userData.isBathroomItem) {
        bathroomObj = bathroomObj.parent;
      }

      if (bathroomObj.userData.isBathroomItem) {
        return { object: bathroomObj, point: intersect.point };
      }
    }

    return null;
  }

  // ============================================================================
  // SINGLE SELECTION
  // ============================================================================

  /**
   * Select a single object.
   */
  public selectObject(object: THREE.Object3D): void {
    this.state.selectedObject = object;

    // If not in multi-select mode, clear other selections
    if (!this.state.isMultiSelectMode) {
      this.state.selectedObjects.clear();
    }

    // Add to selected objects map
    const itemId = object.userData.itemId as number;
    this.state.selectedObjects.set(itemId, object);

    // Update highlighting
    this.updateHighlight(true);

    // Update rotation arrows
    this.updateRotationArrows();

    // Notify listeners
    if (this.state.onItemSelected) {
      this.state.onItemSelected(itemId);
    }
  }

  /**
   * Deselect the currently selected object.
   */
  public deselectObject(): void {
    if (this.state.selectedObject) {
      this.updateHighlight(false);
    }

    this.state.selectedObject = null;
    this.state.selectedObjects.clear();

    // Hide rotation arrows
    if (this.state.rotationArrows) {
      this.state.rotationArrows.setSelectedObject(null);
    }

    // Notify listeners
    if (this.state.onItemDeselected) {
      this.state.onItemDeselected();
    }
  }

  /**
   * Clear all selections.
   */
  public clearSelection(): void {
    this.updateHighlight(false);
    this.state.selectedObject = null;
    this.state.selectedObjects.clear();
    this.state.multiSelectStartPositions.clear();
    this.state.multiSelectStartRotations.clear();
    this.state.multiSelectLocalOffsets.clear();
    this.state.multiSelectLocalRotations.clear();
    this.state.groupConstraint = null;

    // Hide rotation arrows
    if (this.state.rotationArrows) {
      this.state.rotationArrows.setSelectedObject(null);
    }

    // Notify listeners
    if (this.state.onItemDeselected) {
      this.state.onItemDeselected();
    }
  }

  // ============================================================================
  // MULTI-SELECTION
  // ============================================================================

  /**
   * Toggle multi-selection mode.
   */
  public setMultiSelectMode(enabled: boolean): void {
    this.state.isMultiSelectMode = enabled;
  }

  /**
   * Check if multi-select mode is enabled.
   */
  public isMultiSelectMode(): boolean {
    return this.state.isMultiSelectMode;
  }

  /**
   * Get the number of selected objects.
   */
  public getSelectedCount(): number {
    return this.state.selectedObjects.size;
  }

  /**
   * Toggle selection of an object in multi-select mode.
   */
  public toggleObjectSelection(object: THREE.Object3D): void {
    const itemId = object.userData.itemId as number;

    if (this.state.selectedObjects.has(itemId)) {
      // Deselect if already selected
      this.state.selectedObjects.delete(itemId);

      // Update primary selected object
      if (this.state.selectedObject === object) {
        const remaining = Array.from(this.state.selectedObjects.values());
        this.state.selectedObject = remaining.length > 0 ? remaining[0] : null;
      }
    } else {
      // Add to selection
      this.state.selectedObjects.set(itemId, object);

      // Set as primary if no primary selected
      if (!this.state.selectedObject) {
        this.state.selectedObject = object;
      }
    }

    this.updateMultiSelectionHighlight();
  }

  /**
   * Select all items in the scene.
   */
  public selectAllItems(): void {
    const items = this.state.getCurrentItems();
    this.clearSelection();

    items.forEach(item => {
      const object = this.findObjectInScene(item.id);
      if (object) {
        this.state.selectedObjects.set(item.id, object);
      }
    });

    // Set the first object as primary
    const objects = Array.from(this.state.selectedObjects.values());
    if (objects.length > 0) {
      this.state.selectedObject = objects[0];
    }

    this.updateMultiSelectionHighlight();
  }

  // ============================================================================
  // HIGHLIGHTING
  // ============================================================================

  /**
   * Update highlighting for all selected objects.
   */
  private updateHighlight(highlight: boolean = true): void {
    if (this.state.isMultiSelectMode || this.state.selectedObjects.size > 0) {
      const objects = Array.from(this.state.selectedObjects.values());
      import('../../../utils/helpers').then(helpers => {
        helpers.highlightObjects(objects, highlight);
      });
    } else if (this.state.selectedObject) {
      import('../../../utils/helpers').then(helpers => {
        helpers.highlightObject(this.state.selectedObject, highlight);
      });
    } else {
      import('../../../utils/helpers').then(helpers => {
        helpers.highlightObjects([], false);
      });
    }
  }

  /**
   * Update highlighting for multi-selection.
   */
  private updateMultiSelectionHighlight(): void {
    const objects = Array.from(this.state.selectedObjects.values());
    import('../../../utils/helpers').then(helpers => {
      helpers.highlightObjects(objects, true);
    });

    this.updateRotationArrows();
  }

  // ============================================================================
  // ROTATION ARROWS
  // ============================================================================

  /**
   * Update rotation arrows based on current selection.
   */
  private updateRotationArrows(): void {
    if (!this.state.rotationArrows) return;

    // Update rotation arrows for the "primary" selected object
    if (this.state.selectedObjects.size === 1) {
      const objects = Array.from(this.state.selectedObjects.values());
      this.state.selectedObject = objects[0];

      const itemId = this.state.selectedObject.userData.itemId;
      const currentItem = this.getCurrentItemData(itemId);
      const movementConfig = getMovementConfig(this.state.selectedObject.userData.type, currentItem);

      if (movementConfig?.allowFreeRotation) {
        this.state.rotationArrows.setSelectedObject(this.state.selectedObject);
      } else {
        this.state.rotationArrows.setSelectedObject(null);
      }
    } else {
      // Hide rotation arrows if multiple objects are selected
      this.state.rotationArrows.setSelectedObject(null);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Find a Three.js object in the scene by its itemId.
   */
  public findObjectInScene(itemId: number): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;
    this.state.scene.traverse(obj => {
      if (obj.userData.isBathroomItem && obj.userData.itemId === itemId) {
        found = obj;
      }
    });
    return found;
  }

  /**
   * Get the current item data for an item ID.
   */
  private getCurrentItemData(itemId: number): BathroomItem | undefined {
    const items = this.state.getCurrentItems();
    return items.find(item => item.id === itemId);
  }

  /**
   * Check if an object is currently selected.
   */
  public isObjectSelected(object: THREE.Object3D): boolean {
    const itemId = object.userData.itemId as number;
    return this.state.selectedObjects.has(itemId);
  }

  /**
   * Get all selected object IDs.
   */
  public getSelectedIds(): number[] {
    return Array.from(this.state.selectedObjects.keys());
  }

  /**
   * Get all selected objects.
   */
  public getSelectedObjects(): THREE.Object3D[] {
    return Array.from(this.state.selectedObjects.values());
  }

  /**
   * Get the primary selected object.
   */
  public getPrimarySelectedObject(): THREE.Object3D | null {
    return this.state.selectedObject;
  }
}
