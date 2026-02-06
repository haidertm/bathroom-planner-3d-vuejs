/**
 * useMeasurements - Manages measurement system state and controls.
 *
 * Extracted from Planner.vue for better modularity.
 */

import { ref, watch, onMounted, onUnmounted, type Ref, type ShallowRef } from 'vue';
import type { SceneManager } from '../services/sceneManager';
import type { MeasurementData } from '../services/measurementSystem';

export interface UseMeasurementsOptions {
  sceneManagerRef: ShallowRef<SceneManager | null>;
}

// Re-export MeasurementData for convenience
export type { MeasurementData };

export interface UseMeasurementsReturn {
  // State
  measurementEnabled: Ref<boolean>;
  currentMeasurements: Ref<MeasurementData | null>;

  // Actions
  handleToggleMeasurements: () => void;
  setMeasurementEnabled: (enabled: boolean) => void;
  updateCurrentMeasurements: () => void;

  // Event handlers (for window events)
  handleMeasurementUpdate: () => void;
  handleMeasurementToggle: () => void;
}

export function useMeasurements(options: UseMeasurementsOptions): UseMeasurementsReturn {
  const { sceneManagerRef } = options;

  // ============================================================================
  // STATE
  // ============================================================================

  const measurementEnabled = ref(false);
  const currentMeasurements = ref<MeasurementData | null>(null);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Toggle measurement display on/off.
   */
  const handleToggleMeasurements = (): void => {
    measurementEnabled.value = !measurementEnabled.value;

    if (sceneManagerRef.value) {
      sceneManagerRef.value.enableMeasurements(measurementEnabled.value);
    }
  };

  /**
   * Set measurement enabled state directly.
   */
  const setMeasurementEnabled = (enabled: boolean): void => {
    measurementEnabled.value = enabled;

    if (sceneManagerRef.value) {
      sceneManagerRef.value.enableMeasurements(enabled);
      if (enabled) {
        updateCurrentMeasurements();
      }
    }
  };

  /**
   * Update current measurements from the scene manager.
   */
  const updateCurrentMeasurements = (): void => {
    if (sceneManagerRef.value && measurementEnabled.value) {
      currentMeasurements.value = sceneManagerRef.value.getCurrentMeasurements();
    } else {
      currentMeasurements.value = null;
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle measurement update event (from object selection/movement).
   */
  const handleMeasurementUpdate = (): void => {
    if (measurementEnabled.value) {
      updateCurrentMeasurements();
    }
  };

  /**
   * Handle measurement toggle event (from keyboard shortcut).
   */
  const handleMeasurementToggle = (): void => {
    handleToggleMeasurements();
  };

  // ============================================================================
  // WATCHERS
  // ============================================================================

  /**
   * Watch for measurement state changes.
   */
  watch(measurementEnabled, (enabled) => {
    if (sceneManagerRef.value) {
      sceneManagerRef.value.enableMeasurements(enabled);
    }
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  onMounted(() => {
    // Add window event listeners
    window.addEventListener('object-selected', handleMeasurementUpdate);
    window.addEventListener('object-moved', handleMeasurementUpdate);
    window.addEventListener('toggle-measurements', handleMeasurementToggle);
  });

  onUnmounted(() => {
    // Remove window event listeners
    window.removeEventListener('object-selected', handleMeasurementUpdate);
    window.removeEventListener('object-moved', handleMeasurementUpdate);
    window.removeEventListener('toggle-measurements', handleMeasurementToggle);
  });

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    measurementEnabled,
    currentMeasurements,

    // Actions
    handleToggleMeasurements,
    setMeasurementEnabled,
    updateCurrentMeasurements,

    // Event handlers
    handleMeasurementUpdate,
    handleMeasurementToggle,
  };
}
