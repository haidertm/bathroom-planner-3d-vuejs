/**
 * useItemInteraction - Manages item selection and interaction state.
 *
 * Extracted from Planner.vue for better modularity.
 */

import { ref, computed, type Ref, type ComputedRef, type ShallowRef } from 'vue';
import type { BathroomItem } from '../utils/constraints';
import type { EventHandlers } from '../services/eventHandlers';

export interface UseItemInteractionOptions {
  itemsRef: Ref<BathroomItem[]>;
  eventHandlersRef: ShallowRef<EventHandlers | null>;
}

export interface UseItemInteractionReturn {
  // State
  selectedItemId: Ref<number | null>;
  selectedObjectId: Ref<number | null>;
  isDraggingObject: Ref<boolean>;
  isMultiSelectMode: Ref<boolean>;
  selectedCount: Ref<number>;
  rotationArrowsEnabled: Ref<boolean>;
  selectedObjectCanRotate: Ref<boolean>;

  // Computed
  selectedBathroomItem: ComputedRef<BathroomItem | null>;
  showRotationToggle: ComputedRef<boolean>;

  // Actions
  toggleMultiSelect: () => void;
  setMultiSelectMode: (enabled: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setRotationArrowsEnabled: (enabled: boolean) => void;
  selectItem: (itemId: number | null) => void;
  clearSelection: () => void;
  updateSelectionFromEvent: (data: {
    itemId: number | null;
    canRotate: boolean;
    selectedIds?: number[];
  }) => void;
}

export function useItemInteraction(options: UseItemInteractionOptions): UseItemInteractionReturn {
  const { itemsRef, eventHandlersRef } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const selectedItemId = ref<number | null>(null);
  const selectedObjectId = ref<number | null>(null);
  const isDraggingObject = ref(false);
  const isMultiSelectMode = ref(false);
  const selectedCount = ref(1);
  const rotationArrowsEnabled = ref(false);
  const selectedObjectCanRotate = ref(false);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  /**
   * Get the currently selected bathroom item.
   */
  const selectedBathroomItem = computed<BathroomItem | null>(() => {
    if (!selectedItemId.value) return null;
    return itemsRef.value.find(item => item.id === selectedItemId.value) ?? null;
  });

  /**
   * Whether to show the rotation toggle UI.
   */
  const showRotationToggle = computed<boolean>(() => {
    return selectedObjectCanRotate.value;
  });

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Toggle multi-select mode.
   */
  const toggleMultiSelect = (): void => {
    isMultiSelectMode.value = !isMultiSelectMode.value;

    if (eventHandlersRef.value) {
      eventHandlersRef.value.setMultiSelectMode(isMultiSelectMode.value);

      // Clear selection when turning off multi-select
      if (!isMultiSelectMode.value) {
        eventHandlersRef.value.clearSelection();
        selectedItemId.value = null;
        selectedObjectId.value = null;
        selectedCount.value = 1;
      }
    }
  };

  /**
   * Set multi-select mode directly.
   */
  const setMultiSelectMode = (enabled: boolean): void => {
    isMultiSelectMode.value = enabled;

    if (eventHandlersRef.value) {
      eventHandlersRef.value.setMultiSelectMode(enabled);

      if (!enabled) {
        eventHandlersRef.value.clearSelection();
        selectedItemId.value = null;
        selectedObjectId.value = null;
        selectedCount.value = 1;
      }
    }
  };

  /**
   * Set dragging state.
   */
  const setDragging = (dragging: boolean): void => {
    isDraggingObject.value = dragging;
  };

  /**
   * Set rotation arrows enabled state.
   */
  const setRotationArrowsEnabled = (enabled: boolean): void => {
    rotationArrowsEnabled.value = enabled;
  };

  /**
   * Select an item by ID.
   */
  const selectItem = (itemId: number | null): void => {
    selectedItemId.value = itemId;
    selectedObjectId.value = itemId;

    if (itemId === null) {
      selectedObjectCanRotate.value = false;
    }
  };

  /**
   * Clear the current selection.
   */
  const clearSelection = (): void => {
    selectedItemId.value = null;
    selectedObjectId.value = null;
    selectedCount.value = 1;
    selectedObjectCanRotate.value = false;

    if (eventHandlersRef.value) {
      eventHandlersRef.value.clearSelection();
    }
  };

  /**
   * Update selection state from an event (typically from EventHandlers callback).
   */
  const updateSelectionFromEvent = (data: {
    itemId: number | null;
    canRotate: boolean;
    selectedIds?: number[];
  }): void => {
    const { itemId, canRotate, selectedIds } = data;

    if (itemId !== null) {
      selectedItemId.value = itemId;
      selectedObjectId.value = itemId;
      selectedCount.value = selectedIds?.length ?? 1;
      selectedObjectCanRotate.value = canRotate;
    } else {
      selectedObjectId.value = null;
      selectedObjectCanRotate.value = false;
    }
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    selectedItemId,
    selectedObjectId,
    isDraggingObject,
    isMultiSelectMode,
    selectedCount,
    rotationArrowsEnabled,
    selectedObjectCanRotate,

    // Computed
    selectedBathroomItem,
    showRotationToggle,

    // Actions
    toggleMultiSelect,
    setMultiSelectMode,
    setDragging,
    setRotationArrowsEnabled,
    selectItem,
    clearSelection,
    updateSelectionFromEvent,
  };
}
