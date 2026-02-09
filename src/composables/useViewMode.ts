/**
 * useViewMode - Manages 2D/3D view mode switching.
 *
 * Extracted from Planner.vue for better modularity.
 */

import { ref, type Ref, type ShallowRef } from 'vue';
import type { ViewMode } from '../constants/camera';
import type { SceneManager } from '../services/sceneManager';
import { useGtm } from '@gtm-support/vue-gtm';

export interface UseViewModeOptions {
  sceneManagerRef: ShallowRef<SceneManager | null>;
}

export interface UseViewModeReturn {
  // State
  viewMode: Ref<ViewMode>;

  // Actions
  handleViewModeChange: (mode: ViewMode) => Promise<void>;
  is2DMode: () => boolean;
  is3DMode: () => boolean;
}

export function useViewMode(options: UseViewModeOptions): UseViewModeReturn {
  const { sceneManagerRef } = options;

  // GTM for analytics tracking
  const gtm = useGtm();

  // ============================================================================
  // STATE
  // ============================================================================

  const viewMode = ref<ViewMode>('3d');

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Handle view mode change (2D/3D toggle).
   * Uses SceneManager as the single source of truth.
   */
  const handleViewModeChange = async (mode: ViewMode): Promise<void> => {
    if (!sceneManagerRef.value) {
      console.warn('SceneManager not initialized yet');
      return;
    }

    try {
      // Use SceneManager as single source of truth for view mode
      // SceneManager.setViewMode internally updates EventHandlers
      // Await the scene change BEFORE updating UI state to keep them consistent
      await sceneManagerRef.value.setViewMode(mode);

      // Only update UI state after scene manager succeeds
      viewMode.value = mode;

      // Track view mode change in GTM
      if (gtm?.enabled()) {
        gtm.trackEvent({
          event: 'view_mode_change',
          category: 'Bathroom Planner',
          action: 'Switch View Mode',
          label: mode === '2d' ? '2D Blueprint' : '3D Perspective',
          viewMode: mode
        });
      }
    } catch (error) {
      // Don't change viewMode on error - keep UI consistent with actual scene state
      console.error('Failed to change view mode:', error);
    }
  };

  /**
   * Check if currently in 2D mode.
   */
  const is2DMode = (): boolean => {
    return viewMode.value === '2d';
  };

  /**
   * Check if currently in 3D mode.
   */
  const is3DMode = (): boolean => {
    return viewMode.value === '3d';
  };

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    viewMode,

    // Actions
    handleViewModeChange,
    is2DMode,
    is3DMode,
  };
}
