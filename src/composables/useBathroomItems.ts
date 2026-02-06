/**
 * useBathroomItems - Manages bathroom items state.
 *
 * Extracted from Planner.vue for better modularity.
 * This composable handles items state management with callbacks for scene operations.
 */

import { ref, type Ref } from 'vue';
import type { BathroomItem } from '../utils/constraints';

export type UpdateSource =
  | 'initial'
  | 'add'
  | 'delete'
  | 'drag'
  | 'roomSize'
  | 'notchSize'
  | 'constrain'
  | 'clear'
  | 'undo'
  | 'redo'
  | 'variantSwap-processing'
  | 'variantSwap-complete'
  | 'variantSwap-fallback';

export interface UseBathroomItemsOptions {
  initialItems?: BathroomItem[];
}

export interface UseBathroomItemsReturn {
  // State
  items: Ref<BathroomItem[]>;
  hasUnsavedChanges: Ref<boolean>;
  lastUpdateSource: Ref<UpdateSource>;
  nextIdRef: Ref<number>;

  // Actions
  addItem: (item: BathroomItem) => void;
  removeItem: (itemId: number) => void;
  removeItems: (itemIds: number[]) => void;
  updateItem: (itemId: number, updates: Partial<BathroomItem>) => void;
  setItems: (newItems: BathroomItem[] | ((prev: BathroomItem[]) => BathroomItem[])) => void;
  clearItems: () => void;

  // Utilities
  generateUniqueId: () => number;
  getItemById: (itemId: number) => BathroomItem | undefined;
  setUpdateSource: (source: UpdateSource) => void;
  markAsSaved: () => void;
  markAsUnsaved: () => void;
}

export function useBathroomItems(options: UseBathroomItemsOptions = {}): UseBathroomItemsReturn {
  const { initialItems = [] } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const items = ref<BathroomItem[]>(initialItems);
  const hasUnsavedChanges = ref(false);
  const lastUpdateSource = ref<UpdateSource>('initial');
  const nextIdRef = ref(2000);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate a unique ID for a new item.
   */
  const generateUniqueId = (): number => {
    const id = nextIdRef.value;
    nextIdRef.value += 1;
    return id;
  };

  /**
   * Get an item by its ID.
   */
  const getItemById = (itemId: number): BathroomItem | undefined => {
    return items.value.find(item => item.id === itemId);
  };

  /**
   * Set the update source (for tracking where changes came from).
   */
  const setUpdateSource = (source: UpdateSource): void => {
    lastUpdateSource.value = source;
  };

  /**
   * Mark the items as saved (no unsaved changes).
   */
  const markAsSaved = (): void => {
    hasUnsavedChanges.value = false;
  };

  /**
   * Mark the items as having unsaved changes.
   */
  const markAsUnsaved = (): void => {
    hasUnsavedChanges.value = true;
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Add a new item to the items array.
   * Note: Scene operations should be handled by the caller.
   */
  const addItem = (item: BathroomItem): void => {
    items.value = [...items.value, item];
    hasUnsavedChanges.value = true;
    lastUpdateSource.value = 'add';
  };

  /**
   * Remove an item by ID.
   * Note: Scene operations should be handled by the caller.
   */
  const removeItem = (itemId: number): void => {
    items.value = items.value.filter(item => item.id !== itemId);
    hasUnsavedChanges.value = true;
    lastUpdateSource.value = 'delete';
  };

  /**
   * Remove multiple items by IDs.
   * Note: Scene operations should be handled by the caller.
   */
  const removeItems = (itemIds: number[]): void => {
    items.value = items.value.filter(item => !itemIds.includes(item.id));
    hasUnsavedChanges.value = true;
    lastUpdateSource.value = 'delete';
  };

  /**
   * Update an existing item.
   */
  const updateItem = (itemId: number, updates: Partial<BathroomItem>): void => {
    items.value = items.value.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    hasUnsavedChanges.value = true;
  };

  /**
   * Set items directly (for undo/redo, loading designs, etc.).
   */
  const setItems = (newItems: BathroomItem[] | ((prev: BathroomItem[]) => BathroomItem[])): void => {
    if (typeof newItems === 'function') {
      items.value = newItems(items.value);
    } else {
      items.value = newItems;
    }
  };

  /**
   * Clear all items.
   * Note: Scene operations should be handled by the caller.
   */
  const clearItems = (): void => {
    items.value = [];
    hasUnsavedChanges.value = true;
    lastUpdateSource.value = 'clear';
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    items,
    hasUnsavedChanges,
    lastUpdateSource,
    nextIdRef,

    // Actions
    addItem,
    removeItem,
    removeItems,
    updateItem,
    setItems,
    clearItems,

    // Utilities
    generateUniqueId,
    getItemById,
    setUpdateSource,
    markAsSaved,
    markAsUnsaved,
  };
}
