<template>
  <div v-if="product.variants && product.variants.length > 0" :style="sectionStyle">
    <!-- Single filtered variant - show simplified view -->
    <template v-if="hasOnlyOneFilteredVariant">
      <h4 :style="sectionTitleStyle">Selected {{ product.variantType || 'Size' }}</h4>
      <div :style="singleVariantInfoStyle">
        <span :style="singleVariantNameStyle">{{ selectedVariant?.name }}</span>
        <span v-if="isVariantTooLarge(selectedVariant)" :style="tooLargeBadgeStyle">
          ⚠ Too Large
        </span>
      </div>
    </template>

    <!-- Multiple variants - show selection buttons -->
    <template v-else>
      <h4 :style="sectionTitleStyle">{{ product.variantType || 'Size' }}</h4>
      <div :style="variantOptionsStyle">
        <button
          v-for="(variant, index) in displayedVariants"
          :key="variant.id || variant.sku || variant.name || index"
          @click="handleVariantSelect(variant)"
          :style="getVariantButtonStyle(variant)"
          class="variant-button"
          :title="isVariantTooLarge(variant) ? getTooLargeTooltip(variant) : ''"
        >
          <span :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }">
            <span>{{ variant.name }}</span>
            <span v-if="isVariantTooLarge(variant)" :style="tooLargeBadgeStyle">
              ⚠ Too Large
            </span>
          </span>
        </button>
      </div>

      <!-- See More / See Less Button -->
      <div v-if="shouldShowSeeMoreButton" :style="seeMoreContainerStyle">
        <button
          @click="toggleShowAllVariants"
          :style="seeMoreButtonStyle"
          class="see-more-button"
        >
          {{ showAllVariants ? 'See Less' : `See More (${filteredVariants.length - 5} more)` }}
          <span :style="{ marginLeft: '8px' }">
            {{ showAllVariants ? '↑' : '↓' }}
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { filterProductVariants, hasActiveFilters } from '../../utils/filters'
import { isModelCached } from '../../utils/modelLoader'
import { findFreeWallPosition } from '../../utils/constraints'
import { getMovementConfig } from '../../utils/models'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  selectedVariant: {
    type: Object,
    default: null
  },
  selectedFilters: {
    type: Object,
    default: () => ({ length: [], type: [], finish: [] })
  },
  roomWidth: {
    type: Number,
    default: 300
  },
  roomHeight: {
    type: Number,
    default: 250
  },
  existingItems: {
    type: Array,
    default: () => []
  },
  notchWidth: {
    type: Number,
    default: 0
  },
  notchHeight: {
    type: Number,
    default: 0
  },
  selectedCategory: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select-variant'])

const showAllVariants = ref(false)

// Get filtered variants based on selected filters
const filteredVariants = computed(() => {
  if (!props.product?.variants) return []

  const allVariants = props.product.variants
  const hasActive = hasActiveFilters(props.selectedFilters)

  if (!hasActive) {
    return allVariants
  }

  return filterProductVariants(props.product, props.selectedFilters)
})

// Check if we have only one filtered variant
const hasOnlyOneFilteredVariant = computed(() => {
  return filteredVariants.value.length === 1 && hasActiveFilters(props.selectedFilters)
})

// Displayed variants with pagination
const displayedVariants = computed(() => {
  const variants = filteredVariants.value

  if (variants.length === 0) return []
  if (variants.length <= 5) return variants
  if (!showAllVariants.value) return variants.slice(0, 5)

  return variants
})

// Check if we should show the "See More" button
const shouldShowSeeMoreButton = computed(() => {
  return filteredVariants.value.length > 5
})

const toggleShowAllVariants = () => {
  showAllVariants.value = !showAllVariants.value
}

// Reset showAllVariants when product changes
watch(() => props.product, () => {
  showAllVariants.value = false
})

// Check if variant is too large
const isVariantTooLarge = (variant) => {
  if (!variant?.dimensions) return false

  const variantWidth = variant.dimensions.width || 0
  const variantDepth = variant.dimensions.depth || 0
  const maxVariantDim = Math.max(variantWidth, variantDepth)
  const maxWallLength = Math.max(props.roomWidth, props.roomHeight)

  if (maxVariantDim > maxWallLength) return true

  const category = props.product?.category ||
                   props.product?.searchContext?.category ||
                   props.selectedCategory

  const objectType = category && category !== 'search'
    ? (category.charAt(0) === category.charAt(0).toUpperCase()
        ? category
        : category.charAt(0).toUpperCase() + category.slice(1))
    : null

  const variantMovement = variant.movement || (objectType ? getMovementConfig(objectType) : null)
  const isWallMountedAtHeight = variantMovement?.allowVerticalMovement === true ||
                                 (variant.spawnHeight && variant.spawnHeight > 50)

  if (!isWallMountedAtHeight && props.existingItems && props.existingItems.length > 0) {
    const buffer = 20
    let usedFloorArea = 0

    for (const item of props.existingItems) {
      if (item.variant?.dimensions) {
        const itemMovement = item.variant?.movement || (item.type ? getMovementConfig(item.type) : null)
        const itemIsWallMountedAtHeight = itemMovement?.allowVerticalMovement === true ||
                                           (item.variant?.spawnHeight && item.variant.spawnHeight > 50)

        if (!itemIsWallMountedAtHeight) {
          const itemWidth = (item.variant.dimensions.width || 0) + buffer * 2
          const itemDepth = (item.variant.dimensions.depth || 0) + buffer * 2
          usedFloorArea += itemWidth * itemDepth
        }
      }
    }

    const totalFloorArea = props.roomWidth * props.roomHeight
    const variantArea = (variantWidth + buffer * 2) * (variantDepth + buffer * 2)
    const remainingArea = totalFloorArea - usedFloorArea

    if (variantArea > remainingArea) return true
  }

  if (!category || category === 'search' || !objectType) return false

  const freePosition = findFreeWallPosition(
    props.roomWidth,
    props.roomHeight,
    objectType,
    1.0,
    props.existingItems,
    50,
    variant.orientation,
    variant.movement,
    variant.spawnHeight,
    variant.floorOffset,
    variant.sku,
    props.notchWidth,
    props.notchHeight
  )

  return freePosition === null
}

const getTooLargeTooltip = (variant) => {
  if (!variant?.dimensions) return ''
  if (!isVariantTooLarge(variant)) return ''

  const maxVariantDim = Math.max(variant.dimensions.width || 0, variant.dimensions.depth || 0)
  const maxWallLength = Math.max(props.roomWidth, props.roomHeight)

  if (maxVariantDim > maxWallLength) {
    return `Item exceeds room size (Requires ${maxVariantDim * 10}mm, Available ${maxWallLength * 10}mm).`
  }

  return 'Not enough space - room is too crowded with existing items.'
}

const handleVariantSelect = (variant) => {
  if (isVariantTooLarge(variant)) {
    return
  }
  emit('select-variant', variant)
}

// Styles
const sectionStyle = { padding: '0' }

const sectionTitleStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 15px 0',
  fontFamily: 'Arial, sans-serif'
}

const variantOptionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}

const singleVariantInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  backgroundColor: '#f0f9f0',
  borderRadius: '8px',
  border: '2px solid #29275B'
}

const singleVariantNameStyle = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#29275B',
  fontFamily: 'Arial, sans-serif'
}

const tooLargeBadgeStyle = computed(() => ({
  fontSize: '11px',
  fontWeight: '600',
  color: '#dc2626',
  backgroundColor: '#fef2f2',
  padding: '2px 8px',
  borderRadius: '4px',
  border: '1px solid #fecaca'
}))

const seeMoreContainerStyle = {
  marginTop: '16px',
  display: 'flex',
  justifyContent: 'center',
  width: '100%'
}

const seeMoreButtonStyle = {
  padding: '12px 24px',
  backgroundColor: '#f5f5f5',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#333',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const getVariantButtonStyle = (variant) => {
  const isSelected = props.selectedVariant === variant
  const isCached = isModelCached(variant)
  const isTooLarge = isVariantTooLarge(variant)

  if (isTooLarge) {
    return {
      padding: '12px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      backgroundColor: '#f3f4f6',
      color: '#9ca3af',
      fontSize: '14px',
      fontWeight: '400',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '44px',
      minWidth: '60px',
      boxShadow: 'none',
      transform: 'none',
      cursor: 'not-allowed',
      opacity: '0.7'
    }
  }

  return {
    padding: '12px 16px',
    border: isSelected
      ? '2px solid #29275B'
      : (isCached ? '1px solid #10b981' : '2px solid #e0e0e0'),
    borderRadius: '6px',
    backgroundColor: isSelected ? '#29275B' : '#ffffff',
    color: isSelected ? '#ffffff' : '#333',
    fontSize: '14px',
    fontWeight: isSelected ? '600' : '500',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '44px',
    minWidth: '60px',
    boxShadow: isSelected ? '0 2px 8px rgba(41, 39, 91, 0.3)' : 'none',
    transform: isSelected ? 'translateY(-1px)' : 'translateY(0px)',
    cursor: 'pointer'
  }
}
</script>

<style scoped>
.variant-button:hover {
  border-color: #29275B !important;
  background-color: #29275B !important;
  color: #ffffff !important;
}

.variant-button[style*="not-allowed"]:hover {
  border-color: #e5e7eb !important;
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  transform: none !important;
  box-shadow: none !important;
}

.see-more-button:hover {
  background-color: #e5e5e5 !important;
}
</style>
