/**
 * useTextureSettings - Manages floor and wall texture settings.
 *
 * Extracted from Planner.vue for better modularity.
 */

import { ref, watch, type Ref, type ShallowRef } from 'vue';
import {
  FLOOR_TEXTURES,
  WALL_TEXTURES,
  DEFAULT_FLOOR_TEXTURE,
  DEFAULT_WALL_TEXTURE,
  type TextureConfig
} from '../constants/textures';
import type { SceneManager } from '../services/sceneManager';

export interface UseTextureSettingsOptions {
  sceneManagerRef: ShallowRef<SceneManager | null>;
  roomWidthRef: Ref<number>;
  roomHeightRef: Ref<number>;
  notchWidthRef: Ref<number>;
  notchHeightRef: Ref<number>;
}

export interface UseTextureSettingsReturn {
  // State
  currentFloorTexture: Ref<number>;
  currentWallTexture: Ref<number>;
  showTexturePanel: Ref<boolean>;

  // Actions
  handleFloorChange: (texture: TextureConfig) => void;
  handleWallChange: (texture: TextureConfig) => void;
  handleTextureClose: () => void;
  handleShowTexturePanel: () => void;

  // Getters
  getFloorTexture: () => TextureConfig;
  getWallTexture: () => TextureConfig;
}

export function useTextureSettings(options: UseTextureSettingsOptions): UseTextureSettingsReturn {
  const {
    sceneManagerRef,
    roomWidthRef,
    roomHeightRef,
    notchWidthRef,
    notchHeightRef
  } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const currentFloorTexture = ref(DEFAULT_FLOOR_TEXTURE);
  const currentWallTexture = ref(DEFAULT_WALL_TEXTURE);
  const showTexturePanel = ref(true);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Handle floor texture change from the texture panel.
   */
  const handleFloorChange = (texture: TextureConfig): void => {
    const index = FLOOR_TEXTURES.indexOf(texture);
    if (index !== -1) {
      currentFloorTexture.value = index;
    }
  };

  /**
   * Handle wall texture change from the texture panel.
   */
  const handleWallChange = (texture: TextureConfig): void => {
    const index = WALL_TEXTURES.indexOf(texture);
    if (index !== -1) {
      currentWallTexture.value = index;
    }
  };

  /**
   * Close the texture panel.
   */
  const handleTextureClose = (): void => {
    showTexturePanel.value = false;
  };

  /**
   * Show the texture panel.
   */
  const handleShowTexturePanel = (): void => {
    showTexturePanel.value = true;
  };

  // ============================================================================
  // GETTERS
  // ============================================================================

  /**
   * Get the current floor texture config.
   */
  const getFloorTexture = (): TextureConfig => {
    return FLOOR_TEXTURES[currentFloorTexture.value];
  };

  /**
   * Get the current wall texture config.
   */
  const getWallTexture = (): TextureConfig => {
    return WALL_TEXTURES[currentWallTexture.value];
  };

  // ============================================================================
  // WATCHERS
  // ============================================================================

  /**
   * Watch for texture changes and update the scene.
   */
  watch([currentFloorTexture, currentWallTexture], () => {
    if (!sceneManagerRef.value) return;

    sceneManagerRef.value.updateFloor(
      roomWidthRef.value,
      roomHeightRef.value,
      FLOOR_TEXTURES[currentFloorTexture.value],
      notchWidthRef.value,
      notchHeightRef.value
    );

    sceneManagerRef.value.updateWalls(
      roomWidthRef.value,
      roomHeightRef.value,
      WALL_TEXTURES[currentWallTexture.value],
      notchWidthRef.value,
      notchHeightRef.value
    );
  });

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    currentFloorTexture,
    currentWallTexture,
    showTexturePanel,

    // Actions
    handleFloorChange,
    handleWallChange,
    handleTextureClose,
    handleShowTexturePanel,

    // Getters
    getFloorTexture,
    getWallTexture,
  };
}
