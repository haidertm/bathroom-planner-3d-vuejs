// variantSwapUtils.ts - Utilities for swapping product variants in place
import { DEFAULT_ORIENTATION } from '../constants/models'
import type { BathroomItem } from './constraints'
import type { ComponentType } from '../constants/components'

/**
 * Creates a new item with the new variant while preserving position, rotation, and scale
 */
export const swapItemVariant = (
    currentItem: BathroomItem,
    newVariant: any,
): BathroomItem => {
    console.log('🔄 Swapping variant for item:', currentItem.id, 'to variant:', newVariant.sku)
    console.log('Current item structure:', currentItem)

    // Preserve current transform - KEEP ORIGINAL FORMATS
    const currentPosition: [number, number, number] = [...currentItem.position]
    const currentRotation = currentItem.rotation // Keep as-is (number)
    const currentScale = currentItem.scale || 1.0

    console.log('Preserved transforms:', {
        position: currentPosition,
        rotation: currentRotation,
        scale: currentScale
    })

    // Get the correct orientation from the new variant
    const productOrientation = newVariant?.orientation || DEFAULT_ORIENTATION

    // Create new item with new variant data
    const newItem: BathroomItem = {
        id: currentItem.id,
        type: currentItem.type,
        position: currentPosition, // This should preserve the exact position
        rotation: currentRotation, // This should preserve the exact rotation
        scale: currentScale,

        // Update with new variant data
        sku: newVariant.sku,
        productName: newVariant.name || newVariant.title,
        model: {
            name: `${currentItem.type}-${newVariant.sku}`,
            path: newVariant.path,
            scale: 100,
            orientation: {
                type: productOrientation.type || 'face_into_room',
                wallBuffer: productOrientation.wallBuffer !== undefined ? productOrientation.wallBuffer : 0,
                description: productOrientation.description || 'Item is part of wall opening',
                ...(productOrientation.rotationOffset && { rotationOffset: productOrientation.rotationOffset })
            },
            dimensions: newVariant.dimensions,
            ...(newVariant.movement && {
                movement: newVariant.movement
            }),
            floorOffset: newVariant.floorOffset || 0,
            spawnHeight: newVariant.spawnHeight || 0
        },
    }

    console.log('✅ Created swapped item:', newItem)
    return newItem
}

/**
 * Finds a product by its variant SKU
 */
export const findProductByVariantSku = (
    sku: string,
    category: ComponentType,
    productDataSource: any
): { product: any, variant: any } | null => {
    const categoryProducts = productDataSource[category]
    if (!categoryProducts) return null

    for (const product of categoryProducts) {
        if (product.variants) {
            const variant = product.variants.find((v: any) => v.sku === sku)
            if (variant) {
                return { product, variant }
            }
        }
    }

    return null
}

/**
 * Gets all available variants for a product containing a specific variant
 */
export const getAvailableVariants = (
    currentSku: string,
    category: ComponentType,
    productDataSource: any
): any[] => {
    const result = findProductByVariantSku(currentSku, category, productDataSource)
    if (!result) return []

    return result.product.variants || []
}

/**
 * Checks if an item has multiple variants available
 */
export const hasMultipleVariants = (
    item: BathroomItem,
    productDataSource: any
): boolean => {
    if (!item.sku || !item.type) return false

    const variants = getAvailableVariants(item.sku, item.type, productDataSource)
    return variants.length > 1
}

/**
 * Gets display information for a variant
 */
export const getVariantDisplayInfo = (variant: any) => {
    return {
        name: variant.title || variant.name || 'Unknown Variant',
        image: variant.image || '',
        sku: variant.sku || '',
        price: variant.price || '',
        isCurrentVariant: false // Will be set by the caller
    }
}

/**
 * Validates that a variant swap is possible
 */
export const canSwapVariant = (
    currentItem: BathroomItem,
    newVariant: any
): { canSwap: boolean, reason?: string } => {
    // Check if we have all required data
    if (!newVariant.sku) {
        return { canSwap: false, reason: 'New variant missing SKU' }
    }

    if (!newVariant.path) {
        return { canSwap: false, reason: 'New variant missing 3D model path' }
    }

    // Check if it's actually a different variant
    if (currentItem.sku === newVariant.sku) {
        return { canSwap: false, reason: 'Same variant already selected' }
    }

    return { canSwap: true }
}