import { ref, computed, type Ref, type ComputedRef } from 'vue'

// Generic type for state - can be customized for specific use cases
export interface UndoRedoState {
  [key: string]: any;
}

// Interface for the return type of the composable
export interface UndoRedoComposable<T extends UndoRedoState> {
  saveToHistory: (state: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  clearHistory: () => void;
  getHistorySize: () => number;
  getCurrentIndex: () => number;
  getHistoryLength: () => number;
}

// Configuration interface for the composable
export interface UndoRedoConfig {
  maxHistorySize?: number;
}

export function useUndoRedo<T extends UndoRedoState = UndoRedoState>(
  config: UndoRedoConfig = {}
): UndoRedoComposable<T> {
  // Configuration with defaults
  const maxHistorySize: number = config.maxHistorySize || 50;

  // Reactive state
  const history: Ref<T[]> = ref<T[]>([]);
  const currentIndex: Ref<number> = ref<number>(-1);

  // Computed properties
  const canUndo: ComputedRef<boolean> = computed(() => currentIndex.value > 0);
  const canRedo: ComputedRef<boolean> = computed(() => currentIndex.value < history.value.length - 1);

  // Deep clone utility function for better type safety
  const deepClone = (obj: T): T => {
    try {
      return JSON.parse(JSON.stringify(obj)) as T;
    } catch (error) {
      console.error('Failed to deep clone state:', error);
      return obj; // Fallback to original object if cloning fails
    }
  };

  const saveToHistory = (state: T): void => {
    // Validate state
    if (!state || typeof state !== 'object') {
      console.warn('Invalid state provided to saveToHistory');
      return;
    }

    // Remove any future history if we're not at the end
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1);
    }

    // Add new state with deep clone
    history.value.push(deepClone(state));
    currentIndex.value = history.value.length - 1;

    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value = history.value.slice(1);
      currentIndex.value = history.value.length - 1;
    }
  };

  const undo = (): T | null => {
    if (canUndo.value) {
      currentIndex.value--;
      const state = history.value[currentIndex.value];
      return state ? deepClone(state) : null;
    }
    return null;
  };

  const redo = (): T | null => {
    if (canRedo.value) {
      currentIndex.value++;
      const state = history.value[currentIndex.value];
      return state ? deepClone(state) : null;
    }
    return null;
  };

  const clearHistory = (): void => {
    history.value = [];
    currentIndex.value = -1;
  };

  // Additional utility methods
  const getHistorySize = (): number => {
    return history.value.length;
  };

  const getCurrentIndex = (): number => {
    return currentIndex.value;
  };

  const getHistoryLength = (): number => {
    return history.value.length;
  };

  // Return the composable interface
  return {
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistorySize,
    getCurrentIndex,
    getHistoryLength
  };
}

// Specific type definitions for your bathroom planner app
export interface BathroomPlannerState extends UndoRedoState {
  items: Array<{
    id: number;
    type: string;
    position: [number, number, number];
    rotation?: number;
    scale?: number;
  }>;
  roomWidth: number;
  roomHeight: number;
  currentFloorTexture: number;
  currentWallTexture: number;
}

// Convenience function with pre-configured types for your app
export function useBathroomPlannerUndoRedo(
  config: UndoRedoConfig = {}
): UndoRedoComposable<BathroomPlannerState> {
  return useUndoRedo<BathroomPlannerState>(config);
}
