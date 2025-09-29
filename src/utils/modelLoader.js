// modelLoader.js - Shared Model Loading Utilities
// Save this as: src/utils/modelLoader.js

import { ref } from 'vue'
import { ModelManager } from '../models/bathroomFixtures'

// Shared loading states
export const variantLoadingStates = ref(new Map())
export const variantProgress = ref(new Map())

/**
 * Check if a variant model is already loaded
 * @param {Object} variant - The variant object
 * @returns {boolean} - True if model is loaded
 */
export const isVariantModelLoaded = (variant) => {
    const variantKey = variant.id || variant.sku || variant.name

    try {
        const modelManager = ModelManager.getInstance()

        // Method 1: Check if ModelManager has isModelLoaded method
        if (typeof modelManager.isModelLoaded === 'function') {
            return modelManager.isModelLoaded(variantKey)
        }

        // Method 2: Check cache directly (if cache is accessible)
        if (modelManager.cache && modelManager.cache[variantKey]) {
            return true
        }

        // Method 3: Check loadedModels set (if available)
        if (modelManager.loadedModels && modelManager.loadedModels.has(variantKey)) {
            return true
        }

        return false
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

    console.log('✅ Loading states set:', {
        variantKey,
        isLoading: variantLoadingStates.value.get(variantKey),
        mapSize: variantLoadingStates.value.size
    })

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

    try {
        const modelManager = ModelManager.getInstance()
        const modelConfig = {
            name: variant.sku || variant.name,
            path: variant.path,
            scale: variant.scale || 1.0,
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

        // CRITICAL: Clean up states after a delay
        setTimeout(() => {
            variantProgress.value.set(variantKey, 100)
            setTimeout(() => {
                variantLoadingStates.value.set(variantKey, false) // Set to false first
                setTimeout(() => {
                    variantLoadingStates.value.delete(variantKey)   // Then delete
                    variantProgress.value.delete(variantKey)
                }, 300)
            }, 300)
        }, 100)
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
    const variantKey = variant.id || variant.sku || variant.name

    try {
        // First check if this is a preloaded first variant
        if (product && firstVariantPreloaded && firstVariantPreloaded.has(product.id)) {
            const preloadInfo = firstVariantPreloaded.get(product.id)
            if (preloadInfo && preloadInfo.variantKey === variantKey) {
                console.log('✅ Found preloaded first variant:', variantKey)
                return true
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
}