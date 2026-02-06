/**
 * useRoomDimensions - Manages room dimensions and grid settings.
 *
 * Extracted from Planner.vue for better modularity.
 */

import { ref, watch, type Ref, type ShallowRef } from 'vue';
import { ROOM_DEFAULTS } from '../constants/dimensions';
import {
  loadRoomDimensionsFromStorage,
  saveRoomDimensionsToStorage
} from '../constants/dimensions';
import { constrainAllObjectsToRoom, type BathroomItem } from '../utils/constraints';
import type { SceneManager } from '../services/sceneManager';

export interface UseRoomDimensionsOptions {
  sceneManagerRef: ShallowRef<SceneManager | null>;
  itemsRef: Ref<BathroomItem[]>;
  onItemsConstrained?: (items: BathroomItem[], source: string) => void;
  saveToHistory?: (state: {
    items: BathroomItem[];
    roomWidth: number;
    roomHeight: number;
    notchWidth?: number;
    notchHeight?: number;
    currentFloorTexture?: number;
    currentWallTexture?: number;
  }) => void;
  getCurrentTextures?: () => { floor: number; wall: number };
}

export interface UseRoomDimensionsReturn {
  // State
  roomWidth: Ref<number>;
  roomHeight: Ref<number>;
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidth: Ref<number>;
  notchHeight: Ref<number>;
  showGrid: Ref<boolean>;
  showWallGrid: Ref<boolean>;
  wallCullingEnabled: Ref<boolean>;

  // Actions
  handleRoomSizeChange: (newWidth: number, newHeight: number) => void;
  handleNotchSizeChange: (newNotchWidth: number, newNotchHeight: number) => void;
  constrainObjects: () => void;
  setShowGrid: (value: boolean) => void;
  setShowWallGrid: (value: boolean) => void;
  handleWallCullingToggle: (enabled: boolean) => void;

  // Utilities
  loadDimensionsFromStorage: () => void;
  setDimensions: (width: number, height: number, notchW?: number, notchH?: number) => void;
  isLShapeRoom: () => boolean;
}

export function useRoomDimensions(options: UseRoomDimensionsOptions): UseRoomDimensionsReturn {
  const {
    sceneManagerRef,
    itemsRef,
    onItemsConstrained,
    saveToHistory,
    getCurrentTextures
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  // Primary room dimensions
  const roomWidth = ref(ROOM_DEFAULTS.WIDTH);
  const roomHeight = ref(ROOM_DEFAULTS.HEIGHT);

  // Ref copies for components that need them
  const roomWidthRef = ref(ROOM_DEFAULTS.WIDTH);
  const roomHeightRef = ref(ROOM_DEFAULTS.HEIGHT);

  // L-shape notch dimensions (0 = no notch = rectangular room)
  const notchWidth = ref(0);
  const notchHeight = ref(0);

  // Grid settings
  const showGrid = ref(false);
  const showWallGrid = ref(false);
  const wallCullingEnabled = ref(true);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Handle room size change from the room size panel.
   */
  const handleRoomSizeChange = (newWidth: number, newHeight: number): void => {
    const oldWidth = roomWidth.value;
    const oldHeight = roomHeight.value;

    roomWidth.value = newWidth;
    roomHeight.value = newHeight;

    // Update refs
    roomWidthRef.value = newWidth;
    roomHeightRef.value = newHeight;

    // Save to localStorage
    saveRoomDimensionsToStorage(newWidth, newHeight);

    // Constrain objects to new room size
    const constrainedItems = constrainAllObjectsToRoom(
      itemsRef.value,
      newWidth,
      newHeight,
      notchWidth.value,
      notchHeight.value,
      oldWidth,
      oldHeight,
      notchWidth.value,
      notchHeight.value
    );

    // Notify parent of constrained items
    if (onItemsConstrained) {
      onItemsConstrained(constrainedItems, 'roomSize');
    }

    // Save to history after a short delay
    if (saveToHistory) {
      const textures = getCurrentTextures?.() ?? { floor: 0, wall: 0 };
      setTimeout(() => {
        saveToHistory({
          items: constrainedItems,
          roomWidth: newWidth,
          roomHeight: newHeight,
          currentFloorTexture: textures.floor,
          currentWallTexture: textures.wall
        });
      }, 100);
    }
  };

  /**
   * Handle notch size change for L-shaped rooms.
   */
  const handleNotchSizeChange = (newNotchWidth: number, newNotchHeight: number): void => {
    const oldNotchWidth = notchWidth.value;
    const oldNotchHeight = notchHeight.value;

    notchWidth.value = newNotchWidth;
    notchHeight.value = newNotchHeight;

    // Save to localStorage with notch dimensions
    saveRoomDimensionsToStorage(
      roomWidth.value,
      roomHeight.value,
      newNotchWidth,
      newNotchHeight
    );

    // Constrain objects to new room shape
    const constrainedItems = constrainAllObjectsToRoom(
      itemsRef.value,
      roomWidth.value,
      roomHeight.value,
      newNotchWidth,
      newNotchHeight,
      roomWidth.value,
      roomHeight.value,
      oldNotchWidth,
      oldNotchHeight
    );

    // Notify parent of constrained items
    if (onItemsConstrained) {
      onItemsConstrained(constrainedItems, 'notchSize');
    }

    // Save to history after a short delay
    if (saveToHistory) {
      const textures = getCurrentTextures?.() ?? { floor: 0, wall: 0 };
      setTimeout(() => {
        saveToHistory({
          items: constrainedItems,
          roomWidth: roomWidth.value,
          roomHeight: roomHeight.value,
          notchWidth: newNotchWidth,
          notchHeight: newNotchHeight,
          currentFloorTexture: textures.floor,
          currentWallTexture: textures.wall
        });
      }, 100);
    }
  };

  /**
   * Constrain all objects to the current room boundaries.
   */
  const constrainObjects = (): void => {
    const constrainedItems = constrainAllObjectsToRoom(
      itemsRef.value,
      roomWidth.value,
      roomHeight.value,
      notchWidth.value,
      notchHeight.value
    );

    if (onItemsConstrained) {
      onItemsConstrained(constrainedItems, 'constrain');
    }
  };

  /**
   * Set floor grid visibility.
   */
  const setShowGrid = (value: boolean): void => {
    showGrid.value = value;
  };

  /**
   * Set wall grid visibility.
   */
  const setShowWallGrid = (value: boolean): void => {
    showWallGrid.value = value;
  };

  /**
   * Toggle wall culling.
   */
  const handleWallCullingToggle = (enabled: boolean): void => {
    wallCullingEnabled.value = enabled;
    if (sceneManagerRef.value) {
      sceneManagerRef.value.setWallCullingEnabled(enabled);
    }
  };

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Load dimensions from localStorage.
   */
  const loadDimensionsFromStorage = (): void => {
    const dimensions = loadRoomDimensionsFromStorage();
    if (dimensions) {
      roomWidth.value = dimensions.width;
      roomHeight.value = dimensions.height;
      roomWidthRef.value = dimensions.width;
      roomHeightRef.value = dimensions.height;

      if (dimensions.notchWidth !== undefined) {
        notchWidth.value = dimensions.notchWidth;
      }
      if (dimensions.notchHeight !== undefined) {
        notchHeight.value = dimensions.notchHeight;
      }
    }
  };

  /**
   * Set dimensions directly (for loading designs, templates, etc.).
   */
  const setDimensions = (
    width: number,
    height: number,
    notchW?: number,
    notchH?: number
  ): void => {
    roomWidth.value = width;
    roomHeight.value = height;
    roomWidthRef.value = width;
    roomHeightRef.value = height;

    if (notchW !== undefined) {
      notchWidth.value = notchW;
    }
    if (notchH !== undefined) {
      notchHeight.value = notchH;
    }
  };

  /**
   * Check if current room is L-shaped.
   */
  const isLShapeRoom = (): boolean => {
    return notchWidth.value > 0 && notchHeight.value > 0;
  };

  // ============================================================================
  // WATCHERS
  // ============================================================================

  /**
   * Keep roomWidthRef and roomHeightRef in sync with main refs.
   */
  watch([roomWidth, roomHeight], ([newWidth, newHeight]) => {
    roomWidthRef.value = newWidth;
    roomHeightRef.value = newHeight;
  });

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    roomWidth,
    roomHeight,
    roomWidthRef,
    roomHeightRef,
    notchWidth,
    notchHeight,
    showGrid,
    showWallGrid,
    wallCullingEnabled,

    // Actions
    handleRoomSizeChange,
    handleNotchSizeChange,
    constrainObjects,
    setShowGrid,
    setShowWallGrid,
    handleWallCullingToggle,

    // Utilities
    loadDimensionsFromStorage,
    setDimensions,
    isLShapeRoom,
  };
}
