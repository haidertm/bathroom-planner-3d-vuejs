The multi-select feature in this application allows users to select and manipulate multiple bathroom items simultaneously. Here's a breakdown of its implementation across `src/pages/Planner.vue` and `src/services/eventHandlers.ts`:

**1. State Management and UI Integration (`src/pages/Planner.vue`):**
-   **`isMultiSelectMode` (ref):** A boolean reactive variable that controls whether multi-select mode is active.
-   **`selectedCount` (ref):** Tracks the number of items currently selected.
-   **`UnifiedToolbar.vue`:** Contains the UI toggle for activating/deactivating multi-select mode. When toggled, it dispatches an `@update:multi-select-enabled` event, which `Planner.vue` handles via `handleUnifiedMultiSelectToggle`.
-   **`ItemConfigurationOverlay.vue`:** Adjusts its display (e.g., showing "Delete All" instead of "Delete") based on `isMultiSelectMode` and `selectedCount`.
-   **`handleUnifiedMultiSelectToggle(enabled)`:**
    -   Updates `isMultiSelectMode`.
    -   Calls `eventHandlersRef.value.setMultiSelectMode(enabled)` to inform the core event handling service.
    -   If disabling multi-select, it calls `eventHandlersRef.value.clearSelection()` to deselect all items.
-   **`deleteItem(itemId)`:** If `isMultiSelectMode` is active and multiple items are selected, this function delegates to `deleteMultipleItems` to remove all selected items.

**2. Core Multi-selection Logic (`src/services/eventHandlers.ts`):**
-   **`selectedObjects` (Map<number, THREE.Object3D>):** The central data structure holding all currently selected Three.js objects, mapped by their unique `itemId`.
-   **`isMultiSelectMode` (private boolean):** Internally mirrors the Vue component's state to control multi-select behavior.
-   **`multiSelectStartPositions`, `multiSelectStartRotations`, `multiSelectLocalOffsets`, `multiSelectLocalRotations` (Maps):** These store the initial state of each selected object relative to a "primary" selected object when a multi-drag operation begins. This allows the group to move and rotate cohesively.
-   **`groupConstraint` (GroupConstraint | null):** Analyzes the movement constraints of all selected items and derives a combined constraint for the entire group (e.g., if any item is `CORNER_ONLY`, the whole group will adhere to corner constraints).
-   **`handleMouseDown(event)`:**
    -   When `isMultiSelectMode` is active, a click on an object toggles its selection state within `selectedObjects`. The clicked object becomes the "primary" `selectedObject` for the current drag.
    -   If a drag operation (move, height adjust, scale) starts with multiple objects selected, it populates the `multiSelectStart...` maps and calculates the `groupConstraint`.
-   **`handleMouseMove(event)`:**
    -   During a multi-drag (`isDragging` and `selectedObjects.size > 1`), it calls `applyBulkMove` to update the positions and rotations of all selected objects.
    -   Collision detection (`checkCollisionState`, `wouldCollideWithExistingOrWalls`) is performed, carefully excluding other selected objects from collision checks *during* the drag to prevent false positives (achieved via `getVirtualItemsExcludingSelected`).
-   **`handleMouseUp()`:**
    -   If `isMultiSelectMode` is active and a single click (no mouse movement) occurs on an already selected object, that object is deselected.
    -   **Collision Prevention/Snap-back:** If `preventCollisionPlacementRef` is true and *any* object in the multi-selection group is found to be colliding at the end of the drag, *all* selected objects are snapped back to their original `multiSelectStartPositions`.
    -   `snapWallStandingItemsOnDrop()`: Ensures wall-standing items in a multi-selection group re-snap to the nearest wall after being dropped, if their individual movement configuration requires it.
-   **`updateMultiSelectionHighlight()`:** Iterates through `selectedObjects` to apply visual highlighting. It also controls the visibility of rotation arrows, showing them only for a single selected object.
-   **`clearSelection()`:** Empties `selectedObjects` and related maps, clearing all selections and hiding UI elements like rotation arrows and measurements.
-   **`getSelectedItemIds()`:** Returns an array of the IDs of all currently selected items.
-   **`applyBulkMove(primaryObject, ...)`:** The core method responsible for moving/rotating the entire group. It applies transformations to each selected object based on the primary object's movement, their relative offsets, and the `groupConstraint`, ensuring the group acts as a cohesive unit.
-   **`getVirtualItemsExcludingSelected()`:** A critical helper function that returns a list of items for collision detection, but *excludes* items that are currently part of the active multi-selection. This prevents selected items from falsely colliding with each other during a drag operation.

In essence, `Planner.vue` manages the high-level state and UI interactions for multi-select, while `eventHandlers.ts` implements the detailed 3D scene interaction, object manipulation, collision detection, and group behavior logic.