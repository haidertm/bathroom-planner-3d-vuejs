// modelLoader.js - Shared Model Loading Utilities
// Save this as: src/utils/modelLoader.js

import { ref } from 'vue'
import { ModelManager } from '../models/bathroomFixtures'
import { ProgressiveModelLoader } from '../services/progressiveModelLoader'

// Shared loading states
export const variantLoadingStates = ref(new Map())
export const variantProgress = ref(new Map())

// Track progressive loading states
export const progressiveLoadingStates = ref(new Map()) // sku -> { placeholder, isLoading }

/**
 * Check if a variant model is already loaded
 * @param {Object} variant - The variant object
 * @returns {boolean} - True if model is loaded
 */
export const isVariantModelLoaded = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name

    try {
        const modelManager = ModelManager.getInstance()

        // Use only the public isModelLoaded method
        return modelManager.isModelLoaded(variantKey)
    } catch (error) {
        console.warn('Error checking if variant model is loaded:', error)
        return false
    }
}

/**
 * Check if a variant is currently loading
 * @param {Object} variant - The variant object
 * @returns {boolean} - True if variant is loading
 */
export const isVariantLoadingState = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name
    return variantLoadingStates.value.get(variantKey) || false
}

/**
 * Get the loading progress for a variant
 * @param {Object} variant - The variant object
 * @returns {number} - Progress percentage (0-100)
 */
export const getVariantProgress = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name
    return variantProgress.value.get(variantKey) || 0
}

/**
 * Load a variant model with progress tracking
 * @param {Object} variant - The variant object to load
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise} - Promise that resolves when model is loaded
 */
export const loadVariantModel = async (variant, progressCallback = null) => {
    const variantKey = variant.id || variant.sku || variant.name

    console.log('🔄 loadVariantModel called:', variantKey)

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
        const modelConfig = {
            name: variant.sku || variant.name,
            path: variant.path,
            scale: variant.scale ?? 1.0,
            dimensions: variant.dimensions,
            movement: variant.movement,
            orientation: variant.orientation
        }

        const loadedModel = await modelManager.loadModel(variantKey, modelConfig)

        if (loadedModel) {
            console.log('✅ Model loaded successfully:', variantKey)
            variantProgress.value.set(variantKey, 100)

            if (progressCallback) {
                progressCallback(100)
            }

            succeeded = true
            return loadedModel
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
 * @param {Object} variant - The variant object
 * @param {Object} product - The product object
 * @param {Map} firstVariantPreloaded - Preload cache (if available)
 * @returns {boolean} - True if model is loaded
 */
export const isVariantModelLoadedWithCache = (variant, product = null, firstVariantPreloaded = null) => {
    const baseSku = variant.id || variant.sku || variant.name

    try {
        // First check if this is a preloaded first variant
        if (product && firstVariantPreloaded && firstVariantPreloaded.has(product.id)) {
            const preloadInfo = firstVariantPreloaded.get(product.id)
            if (preloadInfo) {
                // Check both key formats - the preloadInfo.variantKey might be full (type-sku) or simple (sku)
                const preloadedKey = preloadInfo.variantKey
                if (preloadedKey === baseSku || preloadedKey.endsWith(`-${baseSku}`)) {
                    console.log('✅ Found preloaded first variant:', preloadedKey)
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
 * @param {string|number} productId - The product ID
 * @param {string|number} variantId - The variant ID or SKU
 */
export const clearVariantLoadingState = (productId, variantId) => {
    const variantKey = variantId // variantId is already the sku/id/name
    console.log('🧹 Clearing loading state for variant:', variantKey)

    if (variantLoadingStates.value.has(variantKey)) {
        variantLoadingStates.value.delete(variantKey)
    }

    if (variantProgress.value.has(variantKey)) {
        variantProgress.value.delete(variantKey)
    }
}

/**
 * Create a loading modal state manager
 * @returns {Object} - Modal state and control functions
 */
export const useLoadingModal = () => {
    const showLoadingModal = ref(false)
    const modalProgress = ref(0)
    const loadingCancelCallback = ref(null)

    const showModal = () => {
        showLoadingModal.value = true
        modalProgress.value = 0
    }

    const hideModal = () => {
        showLoadingModal.value = false
        modalProgress.value = 0
        loadingCancelCallback.value = null
    }

    const cancelLoading = () => {
        if (loadingCancelCallback.value) {
            loadingCancelCallback.value()
        }
        hideModal()
    }

    const updateProgress = (progress) => {
        modalProgress.value = progress
    }

    const setCancelCallback = (callback) => {
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
export const clearAllLoadingStates = () => {
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
 *
 * @param {Object} variant - The variant object to load
 * @param {Object} callbacks - Callbacks for loading stages
 * @param {Function} callbacks.onPlaceholderReady - Called when placeholder is ready
 * @param {Function} callbacks.onFullModelReady - Called when full model is loaded
 * @param {Function} callbacks.onProgress - Called with progress updates (0-100)
 * @param {Function} callbacks.onError - Called on error
 * @param {string} [type] - Optional component type (e.g., 'Radiator') for consistent cache keys
 * @returns {Promise<THREE.Group>} - The loaded model (or placeholder on error)
 */
export const loadVariantModelProgressively = async (variant, callbacks = {}, type = null) => {
    const baseSku = variant.id || variant.sku || variant.name
    // Use full key format (type-sku) if type is provided, for consistency with actual loading
    const variantKey = type ? `${type}-${baseSku}` : baseSku

    console.log('🔄 Progressive loading started for:', variantKey, type ? `(with type: ${type})` : '(no type)')

    // Set loading state
    variantLoadingStates.value.set(variantKey, true)
    variantProgress.value.set(variantKey, 0)
    progressiveLoadingStates.value.set(variantKey, { isLoading: true, placeholder: null })

    const progressiveLoader = ProgressiveModelLoader.getInstance()

    // Build model config - use the full key as the model name for cache consistency
    // IMPORTANT: Default scale is 100 to match Planner.vue's hardcoded scale
    const modelConfig = {
        name: variantKey,
        path: variant.path,
        scale: variant.scale ?? 100,
        dimensions: variant.dimensions,
        movement: variant.movement,
        orientation: variant.orientation
    }

    try {
        const result = await progressiveLoader.loadProgressively(
            variantKey,
            modelConfig,
            {
                onPlaceholderReady: (placeholder) => {
                    console.log('🔲 Placeholder ready for:', variantKey)
                    progressiveLoadingStates.value.set(variantKey, {
                        isLoading: true,
                        placeholder
                    })
                    callbacks.onPlaceholderReady?.(placeholder)
                },
                onFullModelReady: (model) => {
                    console.log('✅ Full model ready for:', variantKey)
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
                onProgress: (progress) => {
                    variantProgress.value.set(variantKey, progress)
                    callbacks.onProgress?.(progress)
                },
                onError: (error) => {
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
 * @param {Object} variant - The variant object
 * @returns {boolean}
 */
export const isLoadingProgressively = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name
    const state = progressiveLoadingStates.value.get(variantKey)
    return state?.isLoading || false
}

/**
 * Get the placeholder for a variant being loaded progressively
 * @param {Object} variant - The variant object
 * @returns {THREE.Group|null}
 */
export const getProgressivePlaceholder = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name
    const state = progressiveLoadingStates.value.get(variantKey)
    return state?.placeholder || null
}

/**
 * Abort progressive loading for a variant
 * @param {Object} variant - The variant object
 */
export const abortProgressiveLoading = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name
    const progressiveLoader = ProgressiveModelLoader.getInstance()
    progressiveLoader.abortLoading(variantKey)

    variantLoadingStates.value.set(variantKey, false)
    variantProgress.value.delete(variantKey)
    progressiveLoadingStates.value.delete(variantKey)
}

/**
 * Swap a placeholder with the full model in the scene
 * @param {THREE.Object3D} placeholder - The placeholder to replace
 * @param {THREE.Group} fullModel - The full model to swap in
 * @param {boolean} preserveTransform - Whether to preserve position/rotation/scale
 * @returns {boolean} - Success status
 */
export const swapPlaceholderWithModel = (placeholder, fullModel, preserveTransform = true) => {
    const progressiveLoader = ProgressiveModelLoader.getInstance()
    return progressiveLoader.swapPlaceholderWithModel(placeholder, fullModel, preserveTransform)
}

/**
 * Create a placeholder for a variant (for manual use)
 * @param {Object} variant - The variant object with dimensions
 * @param {Object} config - Optional placeholder configuration
 * @returns {THREE.Group}
 */
export const createVariantPlaceholder = (variant, config = {}) => {
    const progressiveLoader = ProgressiveModelLoader.getInstance()
    return progressiveLoader.createBoundingBoxPlaceholder(variant.dimensions, config)
}

/**
 * Dispose of a placeholder properly
 * @param {THREE.Object3D} placeholder - The placeholder to dispose
 */
export const disposePlaceholder = (placeholder) => {
    const progressiveLoader = ProgressiveModelLoader.getInstance()
    progressiveLoader.disposePlaceholder(placeholder)
}

/**
 * Check if model is cached (instant availability)
 * @param {Object} variant - The variant object
 * @param {string} [type] - Optional component type for full cache key check
 * @returns {boolean}
 */
export const isModelCached = (variant, type = null) => {
    const baseSku = variant.id || variant.sku || variant.name
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