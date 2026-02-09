// modelLoader.ts - Shared Model Loading Utilities

import { ref, type Ref } from 'vue'
import type { Group, Object3D } from 'three'
import { ModelManager } from '../models/bathroomFixtures'
import { ProgressiveModelLoader, type PlaceholderConfig } from '../services/progressiveModelLoader'
import type { ObjectModel } from './constraints'
import type { MovementConfig, OrientationConfig } from '../constants/models'

// Re-export PlaceholderConfig for convenience
export type { PlaceholderConfig }

// Type definitions
export interface VariantDimensions {
  width: number
  height: number
  depth?: number
}

export interface Variant {
  id?: string | number
  sku?: string
  name?: string
  path?: string
  scale?: number
  dimensions?: VariantDimensions
  movement?: MovementConfig
  orientation?: OrientationConfig
}

export interface Product {
  id: string | number
  name?: string
  variants?: Variant[]
}

export interface PreloadInfo {
  variantKey: string
  model?: Group
}

export interface ProgressiveLoadingState {
  isLoading: boolean
  placeholder: Group | null
}

export interface ProgressiveCallbacks {
  onPlaceholderReady?: (placeholder: Group) => void
  onFullModelReady?: (model: Group) => void
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
}

export interface LoadingModalState {
  showLoadingModal: Ref<boolean>
  modalProgress: Ref<number>
  loadingCancelCallback: Ref<(() => void) | null>
  showModal: () => void
  hideModal: () => void
  cancelLoading: () => void
  updateProgress: (progress: number) => void
  setCancelCallback: (callback: () => void) => void
}

// Shared loading states
export const variantLoadingStates: Ref<Map<string, boolean>> = ref(new Map())
export const variantProgress: Ref<Map<string, number>> = ref(new Map())

// Track progressive loading states
export const progressiveLoadingStates: Ref<Map<string, ProgressiveLoadingState>> = ref(new Map())

/**
 * Get variant key from variant object
 */
const getVariantKey = (variant: Variant): string => {
  return String(variant.id || variant.sku || variant.name || '')
}

/**
 * Check if a variant model is already loaded
 */
export const isVariantModelLoaded = (variant: Variant): boolean => {
  const variantKey = getVariantKey(variant)

  try {
    const modelManager = ModelManager.getInstance()
    return modelManager.isModelLoaded(variantKey)
  } catch (error) {
    console.warn('Error checking if variant model is loaded:', error)
    return false
  }
}

/**
 * Check if a variant is currently loading
 */
export const isVariantLoadingState = (variant: Variant): boolean => {
  const variantKey = getVariantKey(variant)
  return variantLoadingStates.value.get(variantKey) || false
}

/**
 * Get the loading progress for a variant
 */
export const getVariantProgress = (variant: Variant): number => {
  const variantKey = getVariantKey(variant)
  return variantProgress.value.get(variantKey) || 0
}

/**
 * Load a variant model with progress tracking
 */
export const loadVariantModel = async (
  variant: Variant,
  progressCallback: ((progress: number) => void) | null = null
): Promise<Group | null> => {
  const variantKey = getVariantKey(variant)

  // CRITICAL: Set loading state IMMEDIATELY
  variantLoadingStates.value.set(variantKey, true)
  variantProgress.value.set(variantKey, 0)

  // Progress simulation interval
  const progressInterval = setInterval(() => {
    const currentProgress = variantProgress.value.get(variantKey) || 0
    if (currentProgress < 90) {
      const increment = Math.random() * 15 + 5
      const newProgress = Math.min(90, currentProgress + increment)
      variantProgress.value.set(variantKey, newProgress)

      if (progressCallback) {
        progressCallback(newProgress)
      }
    }
  }, 200)

  let succeeded = false
  try {
    const modelManager = ModelManager.getInstance()
    const modelConfig: Partial<ObjectModel> & { name: string; path: string } = {
      name: variant.sku || variant.name || '',
      path: variant.path || '',
      scale: variant.scale ?? 1.0,
      movement: variant.movement,
      orientation: variant.orientation
    }

    // Only add dimensions if they exist
    if (variant.dimensions) {
      modelConfig.dimensions = variant.dimensions
    }

    const loadedModel = await modelManager.loadModel(variantKey, modelConfig as ObjectModel)

    if (loadedModel) {
      variantProgress.value.set(variantKey, 100)

      if (progressCallback) {
        progressCallback(100)
      }

      succeeded = true
      return loadedModel as Group
    } else {
      console.warn('⚠️ Model loading returned null for:', variantKey)
      return null
    }

  } catch (error) {
    console.error('❌ Failed to load variant model:', error)
    throw error
  } finally {
    // Clean up progress interval
    clearInterval(progressInterval)

    if (succeeded) {
      // Allow UI to briefly show 100%, then clear
      setTimeout(() => {
        variantLoadingStates.value?.set?.(variantKey, false)
        variantProgress.value?.delete?.(variantKey)
      }, 300)
    } else {
      // Error path: stop loading without faking 100%
      variantLoadingStates.value?.set?.(variantKey, false)
      variantProgress.value?.delete?.(variantKey)
    }
  }
}

/**
 * Check if variant model is loaded with preload cache support
 */
export const isVariantModelLoadedWithCache = (
  variant: Variant,
  product: Product | null = null,
  firstVariantPreloaded: Map<string | number, PreloadInfo> | null = null
): boolean => {
  const baseSku = getVariantKey(variant)

  try {
    // First check if this is a preloaded first variant
    if (product && firstVariantPreloaded && firstVariantPreloaded.has(product.id)) {
      const preloadInfo = firstVariantPreloaded.get(product.id)
      if (preloadInfo) {
        // Check both key formats - the preloadInfo.variantKey might be full (type-sku) or simple (sku)
        const preloadedKey = preloadInfo.variantKey
        if (preloadedKey === baseSku || preloadedKey.endsWith(`-${baseSku}`)) {
          return true
        }
      }
    }

    // Fall back to regular check
    return isVariantModelLoaded(variant)
  } catch (error) {
    console.warn('Error checking if variant model is loaded with cache:', error)
    return false
  }
}

/**
 * Clear loading state for a specific variant
 */
export const clearVariantLoadingState = (
  _productId: string | number,
  variantId: string | number
): void => {
  const variantKey = String(variantId)

  if (variantLoadingStates.value.has(variantKey)) {
    variantLoadingStates.value.delete(variantKey)
  }

  if (variantProgress.value.has(variantKey)) {
    variantProgress.value.delete(variantKey)
  }
}

/**
 * Create a loading modal state manager
 */
export const useLoadingModal = (): LoadingModalState => {
  const showLoadingModal = ref(false)
  const modalProgress = ref(0)
  const loadingCancelCallback: Ref<(() => void) | null> = ref(null)

  const showModal = (): void => {
    showLoadingModal.value = true
    modalProgress.value = 0
  }

  const hideModal = (): void => {
    showLoadingModal.value = false
    modalProgress.value = 0
    loadingCancelCallback.value = null
  }

  const cancelLoading = (): void => {
    if (loadingCancelCallback.value) {
      loadingCancelCallback.value()
    }
    hideModal()
  }

  const updateProgress = (progress: number): void => {
    modalProgress.value = progress
  }

  const setCancelCallback = (callback: () => void): void => {
    loadingCancelCallback.value = callback
  }

  return {
    // State
    showLoadingModal,
    modalProgress,
    loadingCancelCallback,

    // Methods
    showModal,
    hideModal,
    cancelLoading,
    updateProgress,
    setCancelCallback
  }
}

/**
 * Clean up all loading states
 */
export const clearAllLoadingStates = (): void => {
  variantLoadingStates.value.clear()
  variantProgress.value.clear()
  progressiveLoadingStates.value.clear()
}

// ============================================================================
// PROGRESSIVE LOADING API
// ============================================================================

/**
 * Load a variant model progressively with instant placeholder feedback
 * Returns a placeholder immediately while the full model loads in background
 */
export const loadVariantModelProgressively = async (
  variant: Variant,
  callbacks: ProgressiveCallbacks = {},
  type: string | null = null
): Promise<Group> => {
  const baseSku = getVariantKey(variant)
  // Use full key format (type-sku) if type is provided, for consistency with actual loading
  const variantKey = type ? `${type}-${baseSku}` : baseSku

  // Set loading state
  variantLoadingStates.value.set(variantKey, true)
  variantProgress.value.set(variantKey, 0)
  progressiveLoadingStates.value.set(variantKey, { isLoading: true, placeholder: null })

  const progressiveLoader = ProgressiveModelLoader.getInstance()

  // Build model config - use the full key as the model name for cache consistency
  // IMPORTANT: Default scale is 100 to match Planner.vue's hardcoded scale
  // Dimensions are required by the progressive loader, provide defaults if not available
  const modelConfig: ObjectModel = {
    name: variantKey,
    path: variant.path || '',
    scale: variant.scale ?? 100,
    dimensions: variant.dimensions || { width: 50, height: 50, depth: 50 },
    movement: variant.movement,
    orientation: variant.orientation
  }

  try {
    const result = await progressiveLoader.loadProgressively(
      variantKey,
      modelConfig,
      {
        onPlaceholderReady: (placeholder: Group) => {
          progressiveLoadingStates.value.set(variantKey, {
            isLoading: true,
            placeholder
          })
          callbacks.onPlaceholderReady?.(placeholder)
        },
        onFullModelReady: (model: Group) => {
          variantProgress.value.set(variantKey, 100)

          // Small delay to show 100% before clearing
          setTimeout(() => {
            variantLoadingStates.value.set(variantKey, false)
            variantProgress.value.delete(variantKey)
            progressiveLoadingStates.value.set(variantKey, {
              isLoading: false,
              placeholder: null
            })
          }, 300)

          callbacks.onFullModelReady?.(model)
        },
        onProgress: (progress: number) => {
          variantProgress.value.set(variantKey, progress)
          callbacks.onProgress?.(progress)
        },
        onError: (error: Error) => {
          console.error('❌ Progressive loading error for:', variantKey, error)
          variantLoadingStates.value.set(variantKey, false)
          variantProgress.value.delete(variantKey)
          progressiveLoadingStates.value.delete(variantKey)
          callbacks.onError?.(error)
        }
      }
    )

    return result
  } catch (error) {
    console.error('❌ Progressive loading failed for:', variantKey, error)
    variantLoadingStates.value.set(variantKey, false)
    variantProgress.value.delete(variantKey)
    progressiveLoadingStates.value.delete(variantKey)
    throw error
  }
}

/**
 * Check if a variant is being loaded progressively
 */
export const isLoadingProgressively = (variant: Variant): boolean => {
  const variantKey = getVariantKey(variant)
  const state = progressiveLoadingStates.value.get(variantKey)
  return state?.isLoading || false
}

/**
 * Get the placeholder for a variant being loaded progressively
 */
export const getProgressivePlaceholder = (variant: Variant): Group | null => {
  const variantKey = getVariantKey(variant)
  const state = progressiveLoadingStates.value.get(variantKey)
  return state?.placeholder || null
}

/**
 * Abort progressive loading for a variant
 */
export const abortProgressiveLoading = (variant: Variant): void => {
  const variantKey = getVariantKey(variant)
  const progressiveLoader = ProgressiveModelLoader.getInstance()
  progressiveLoader.abortLoading(variantKey)

  variantLoadingStates.value.set(variantKey, false)
  variantProgress.value.delete(variantKey)
  progressiveLoadingStates.value.delete(variantKey)
}

/**
 * Swap a placeholder with the full model in the scene
 */
export const swapPlaceholderWithModel = (
  placeholder: Object3D,
  fullModel: Group,
  preserveTransform: boolean = true
): boolean => {
  const progressiveLoader = ProgressiveModelLoader.getInstance()
  return progressiveLoader.swapPlaceholderWithModel(placeholder, fullModel, preserveTransform)
}

/**
 * Create a placeholder for a variant (for manual use)
 */
export const createVariantPlaceholder = (
  variant: Variant,
  config: PlaceholderConfig = {}
): Group => {
  const progressiveLoader = ProgressiveModelLoader.getInstance()
  // Provide default dimensions if not available
  const dimensions = variant.dimensions || { width: 50, height: 50, depth: 50 }
  return progressiveLoader.createBoundingBoxPlaceholder(dimensions, config)
}

/**
 * Dispose of a placeholder properly
 */
export const disposePlaceholder = (placeholder: Object3D): void => {
  const progressiveLoader = ProgressiveModelLoader.getInstance()
  progressiveLoader.disposePlaceholder(placeholder)
}

/**
 * Check if model is cached (instant availability)
 */
export const isModelCached = (variant: Variant, type: string | null = null): boolean => {
  const baseSku = getVariantKey(variant)
  const modelManager = ModelManager.getInstance()

  // Check both key formats - simple sku and type-sku
  if (type) {
    const fullKey = `${type}-${baseSku}`
    if (modelManager.isModelCached(fullKey)) {
      return true
    }
  }

  // Also check the simple key format for backward compatibility
  return modelManager.isModelCached(baseSku)
}
