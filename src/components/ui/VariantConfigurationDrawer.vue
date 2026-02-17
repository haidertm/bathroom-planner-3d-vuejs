<!-- VariantConfigurationDrawer.vue - Product Drawer Style with Progressive Loading -->
<template>
  <!-- Drawer -->
  <div
      ref="drawerRef"
      :style="drawerStyle"
      @click.stop
      role="dialog"
      aria-modal="true"
      aria-labelledby="variant-drawer-title"
      :tabindex="isOpen ? 0 : -1"
      @keydown.esc.prevent="closeDrawer"
  >
    <!-- Header -->
    <div :style="headerStyle">
      <h1 id="variant-drawer-title" :style="headerTitleStyle" class="swap-button">Swap Variants</h1>
      <button
          @click="closeAndDeselect"
          :style="closeButtonStyle"
          class="close-button"
          aria-label="Close drawer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div :style="contentStyle">
      <!-- Product Info Section - NOW SHOWS SELECTED VARIANT DATA -->
      <div :style="productSectionStyle">
        <!-- Product Image - Shows selected variant image -->
        <div :style="productImageContainerStyle">
          <img
              v-if="selectedVariant?.image || product?.image"
              :src="selectedVariant?.image || product?.image"
              :alt="selectedVariant?.name || product?.name || 'Product image'"
              :style="productImageStyle"
              width="100"
              height="100"
              @error="handleImageError"
          />
          <div v-else :style="imagePlaceholderStyle">
            📦
          </div>
          <!-- NEW badge if available -->
          <div v-if="product?.isNew" :style="newBadgeStyle">NEW</div>
          <!-- Current variant indicator -->
          <div v-if="isCurrentVariant(selectedVariant)" :style="currentIndicatorStyle">Selected</div>
        </div>

        <!-- Product Details - Shows selected variant data -->
        <div :style="productDetailsStyle">
          <h2 :style="productTitleStyle">{{ selectedVariant?.title ?? product?.name }}</h2>
          <div :style="productSkuStyle">SKU: {{ selectedVariant?.sku ?? '—' }}</div>
          <div :style="productPriceStyle">£{{ selectedVariant?.price ?? product?.price }}</div>
          <a
              v-if="selectedVariant?.link || product?.link"
              :href="selectedVariant?.link || product?.link"
              target="_blank"
              rel="noopener noreferrer"
              :style="moreInfoButtonStyle"
              class="more-info-link"
          >
            More info ↗
          </a>
        </div>
      </div>

      <!-- Size Options Section -->
      <div :style="optionsSectionStyle">
        <h3 :style="optionsTitleStyle">Variant Options</h3>

        <div :style="optionsListStyle">
          <div
              v-for="variant in variants"
              :key="`${variant.sku}-${itemsVersion}`"
              :style="getOptionItemStyle(variant)"
              @click="selectVariant(variant)"
              class="size-option"
              :title="isVariantTooLarge(variant) ? getTooLargeTooltip(variant) : ''"
          >
            <span :style="optionTextStyle">
              {{ formatVariantSize(variant) }}
            </span>

            <!-- Show current badge on the variant list -->
            <span v-if="isCurrentVariant(variant)" :style="currentVariantBadgeStyle">
              ✓ Selected
            </span>

            <!-- Show collision/fit issue badge for variants that don't fit -->
            <span v-else-if="isVariantTooLarge(variant)" :style="tooLargeBadgeStyle">
              ⚠ {{ getCollisionBadgeText(variant) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Footer -->
    <div :style="footerStyle">
      <button
          class="swap-button"
          @click="confirmSwap"
          :style="isVariantTooLarge(selectedVariant) ? collisionPreviewButtonStyle : addToRoomButtonStyle"
          :disabled="!selectedVariant || isCurrentVariant(selectedVariant)"
      >
        {{ getButtonText() }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { isMobile } from "../../utils/helpers"
import {
  loadVariantModelProgressively,
  isVariantModelLoaded,
  isModelCached,
} from '../../utils/modelLoader'
import { validateObjectFitsInRoom, wouldCollideWithExisting } from '../../utils/constraints'

const isMobileDevice = computed(() => isMobile())

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  },
  currentVariant: {
    type: Object,
    default: null
  },
  itemId: {
    type: [String, Number],
    default: null
  },
  currentItem: {
    type: Object,
    default: null
  },
  existingItems: {
    type: Array,
    default: () => []
  },
  roomWidth: {
    type: Number,
    default: 300
  },
  roomHeight: {
    type: Number,
    default: 250
  },
  notchWidth: {
    type: Number,
    default: 0
  },
  notchHeight: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'swap-variant', 'deselect-item', 'preview-collision', 'clear-collision-preview'])

const drawerRef = ref(null)

// Reactive state
const selectedVariant = ref(null)

// Watch for prop changes
watch(() => props.currentVariant, (newCurrentVariant) => {
  if (newCurrentVariant) {
    selectedVariant.value = newCurrentVariant
  }
}, { immediate: true })

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    if (props.currentVariant) selectedVariant.value = props.currentVariant
    await nextTick()
    drawerRef.value?.focus()
  }
})

// Computed properties
const variants = computed(() => props.product?.variants || [])

const isCurrentVariant = (variant) => {
  return variant?.sku === props.currentVariant?.sku
}

// Reactive counter to force re-evaluation when items change
const itemsChangeCounter = ref(0)

// Watch for changes to existingItems and force re-render
watch(() => props.existingItems, (newItems, oldItems) => {
  console.log('🔄 existingItems changed:', {
    oldCount: oldItems?.length || 0,
    newCount: newItems?.length || 0,
    newIds: newItems?.map(i => i.id)
  })
  itemsChangeCounter.value++

  // Clear collision preview when items change (e.g., colliding item removed)
  // The collision check will be recalculated and if the variant now fits,
  // the preview should be cleared
  emit('clear-collision-preview')
}, { deep: true })

// Computed property to track existing items changes - forces re-evaluation of fit checks
const itemsVersion = computed(() => {
  // Create a version string based on item count, IDs, and change counter
  const itemIds = props.existingItems?.map(item => item.id).sort().join(',') || ''
  return `${props.existingItems?.length || 0}-${itemIds}-${itemsChangeCounter.value}`
})

// Check if variant model is cached (instant swap available)
const isVariantCached = (variant) => {
  return isModelCached(variant)
}

// Computed map of variant fit info - reactively updates when existingItems changes
const variantFitMap = computed(() => {
  // Access itemsVersion to ensure reactivity when items change
  const version = itemsVersion.value
  const fitMap = new Map()

  if (!props.currentItem || !variants.value) {
    return fitMap
  }

  console.log('🔄 Recalculating variant fit map, itemsVersion:', version, 'existingItems:', props.existingItems?.length)

  for (const variant of variants.value) {
    if (!variant?.dimensions) {
      fitMap.set(variant.sku, { fits: true, availableWidth: Infinity, requiredWidth: 0 })
      continue
    }

    // 1. Check: Does the variant fit in the room at all?
    // For freestanding items, check both width and depth against room dimensions
    const variantWidth = variant.dimensions.width
    const variantDepth = variant.dimensions.depth || variant.dimensions.width

    // Available space in room (accounting for wall thickness ~5cm each side)
    const availableRoomWidth = props.roomWidth - 10
    const availableRoomDepth = props.roomHeight - 10

    // Check if variant can fit in room in any orientation
    const fitsOrientation1 = variantWidth <= availableRoomWidth && variantDepth <= availableRoomDepth
    const fitsOrientation2 = variantWidth <= availableRoomDepth && variantDepth <= availableRoomWidth

    if (!fitsOrientation1 && !fitsOrientation2) {
      console.log('🔍 Variant', variant.sku, 'too large for room - dimensions:', variantWidth, 'x', variantDepth, 'room:', availableRoomWidth, 'x', availableRoomDepth)
      fitMap.set(variant.sku, {
        fits: false,
        availableWidth: Math.min(availableRoomWidth, availableRoomDepth),
        requiredWidth: Math.max(variantWidth, variantDepth),
        reason: 'room_size'
      })
      continue
    }

    // 2. Check: Would the variant collide with other items?
    const currentPosition = {
      x: props.currentItem.position[0],
      y: props.currentItem.position[1],
      z: props.currentItem.position[2]
    }

    const tempItem = {
      ...props.currentItem,
      sku: variant.sku,
      model: {
        ...props.currentItem.model,
        dimensions: variant.dimensions
      }
    }

    // Only check item-to-item collision (not wall collision - item can be repositioned)
    const itemCollision = wouldCollideWithExisting(
      currentPosition,
      props.currentItem.type,
      props.currentItem.scale || 1.0,
      props.currentItem.id,
      props.existingItems,
      tempItem,
      props.roomWidth,
      props.roomHeight,
      props.notchWidth,
      props.notchHeight
    )

    if (itemCollision) {
      console.log('🔍 Variant', variant.sku, 'would collide with other items')
      fitMap.set(variant.sku, {
        fits: false,
        availableWidth: 0,
        requiredWidth: variant.dimensions.width,
        reason: 'item_collision'
      })
      continue
    }

    console.log('🔍 Variant', variant.sku, 'fits')
    fitMap.set(variant.sku, { fits: true, availableWidth: Infinity, requiredWidth: 0 })
  }

  return fitMap
})

// Check if variant fits (uses reactive computed map)
const getVariantFitInfo = (variant) => {
  if (!props.currentItem || !variant?.dimensions) {
    return { fits: true, availableWidth: Infinity, requiredWidth: 0 }
  }

  return variantFitMap.value.get(variant.sku) || { fits: true, availableWidth: Infinity, requiredWidth: 0 }
}

// Check if a variant is too large to fit
const isVariantTooLarge = (variant) => {
  // Current variant always fits (it's already placed)
  if (isCurrentVariant(variant)) return false

  const fitInfo = getVariantFitInfo(variant)
  return !fitInfo.fits
}

// Get badge text for collision/fit issues - more specific than generic "Too Large"
const getCollisionBadgeText = (variant) => {
  const fitInfo = getVariantFitInfo(variant)
  if (fitInfo.fits) return ''

  switch (fitInfo.reason) {
    case 'wall_collision':
      return 'Exceeds Room'
    case 'item_collision':
      return 'Collision'
    case 'room_size':
      return 'Too Large'
    default:
      return 'Won\'t Fit'
  }
}

// Get tooltip message for collision/fit issues
const getTooLargeTooltip = (variant) => {
  const fitInfo = getVariantFitInfo(variant)
  if (fitInfo.fits) return ''

  if (fitInfo.reason === 'wall_collision') {
    return 'Larger size would extend outside the room boundaries. Try repositioning the item first.'
  }

  if (fitInfo.reason === 'item_collision') {
    return 'Item would collide with nearby items at current position. Remove the blocking item or reposition first.'
  }

  if (fitInfo.reason === 'room_size') {
    return 'Item dimensions exceed the available room space.'
  }

  // Default: width issue
  const requiredMm = Math.round(fitInfo.requiredWidth * 10)
  const availableMm = Math.round(fitInfo.availableWidth * 10)
  return `Item exceeds available space (Requires ${requiredMm}mm, Available ${availableMm}mm).`
}

// Methods
const selectVariant = async (variant) => {
  const variantKey = variant.id || variant.sku || variant.name
  console.log('🔄 Variant clicked:', variant.name || variant.sku)

  // Allow selection of "Too Large" variants for preview purposes
  if (isVariantTooLarge(variant)) {
    console.log('⚠️ Variant too large - showing collision preview')
    selectedVariant.value = variant
    // Emit preview event to show red collision outline in 3D view
    emit('preview-collision', {
      itemId: props.itemId,
      variant: variant,
      currentItem: props.currentItem,
      fitInfo: getVariantFitInfo(variant)
    })
    return
  }

  // Always select the variant first
  selectedVariant.value = variant

  // Check if model is already cached (instant availability)
  if (isModelCached(variant)) {
    console.log('✅ Model already cached, instant availability')
    return
  }

  // Check if model is already loaded
  if (isVariantModelLoaded(variant)) {
    console.log('✅ Model already loaded')
    return
  }

  // Start PROGRESSIVE loading in background - preload for faster swap
  // Note: The actual swap will use progressive loading with placeholder
  console.log('🔄 Pre-loading variant model in background')

  try {
    await loadVariantModelProgressively(variant, {
      onPlaceholderReady: () => {
        console.log('🔲 Placeholder ready for variant:', variantKey)
      },
      onFullModelReady: () => {
        console.log('✅ Full model ready for variant:', variantKey)
      },
      onProgress: () => {
        // Progress tracked internally
      },
      onError: (error) => {
        console.error('❌ Progressive loading error:', error)
      }
    })
    console.log('✅ Background loading completed')
  } catch (error) {
    console.error('❌ Failed to pre-load variant model:', error)
  }
}

const confirmSwap = async () => {
  if (!selectedVariant.value || isCurrentVariant(selectedVariant.value)) return

  // AC4: Hard stop - prevent swap if variant is too large
  if (isVariantTooLarge(selectedVariant.value)) {
    console.log('⚠️ Cannot swap - variant too large for available space')
    return
  }

  const variant = selectedVariant.value
  const variantKey = variant.id || variant.sku || variant.name

  // Check if the model is cached (instant availability)
  const isCached = isModelCached(variant)

  // If model is already cached, proceed directly - INSTANT swap
  if (isCached) {
    console.log('✅ Model cached, swapping immediately (instant)')
    emit('swap-variant', {
      itemId: props.itemId,
      newVariant: selectedVariant.value,
      product: props.product,
      useProgressiveLoading: false // Model is cached, no need for progressive
    })
    return
  }

  // Check if the model is loaded (but might not be cached yet)
  const isLoaded = isVariantModelLoaded(variant)

  // If model is already loaded, proceed directly
  if (isLoaded) {
    console.log('✅ Model already loaded, swapping immediately')
    emit('swap-variant', {
      itemId: props.itemId,
      newVariant: selectedVariant.value,
      product: props.product,
      useProgressiveLoading: false
    })
    return
  }

  // Model is NOT loaded - use PROGRESSIVE loading for better UX
  // This will show a placeholder immediately while the model loads
  console.log('🔄 Model not loaded, using progressive loading with placeholder')

  // Emit swap with progressive loading flag - scene will show placeholder first
  emit('swap-variant', {
    itemId: props.itemId,
    newVariant: selectedVariant.value,
    product: props.product,
    useProgressiveLoading: true // Signal to use progressive loading
  })

  // Note: The loading modal is no longer needed for progressive loading
  // because the placeholder provides immediate visual feedback in the scene
}

// Get button text based on selected variant state
const getButtonText = () => {
  if (!selectedVariant.value) return 'SELECT A VARIANT'
  if (isCurrentVariant(selectedVariant.value)) return 'CURRENT SELECTION'
  if (isVariantTooLarge(selectedVariant.value)) {
    const fitInfo = getVariantFitInfo(selectedVariant.value)
    if (fitInfo.reason === 'item_collision') {
      return '⚠️ COLLISION DETECTED'
    } else if (fitInfo.reason === 'wall_collision') {
      return '⚠️ EXCEEDS ROOM BOUNDS'
    }
    return '⚠️ WON\'T FIT'
  }
  return 'SWAP VARIANT'
}

const closeDrawer = () => {
  emit('close')
}

const closeAndDeselect = () => {
  emit('close')
  emit('deselect-item')
}

const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>';

const handleImageError = (event) => {
  const img = event?.target
  if (!img) return
  img.onerror = null
  img.src = FALLBACK_IMG
  console.warn('Failed to load variant image:', img.currentSrc || img.src)
}

const formatVariantSize = (variant) => {
  return variant.name
}

// Cleanup - nothing special needed since progressive loading handles its own cleanup

// Styles (keeping all your original styles)
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  zIndex: '9998'
}))

const drawerStyle = computed(() => ({
  position: 'fixed',
  top: isMobileDevice.value ? '70px' : '60px',
  left: '0',
  maxHeight: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 60px)',
  height: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 60px)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: '100vw',
  backgroundColor: '#f5f5f5',
  zIndex: '10000000',
  display: 'flex',
  flexDirection: 'column',
  transform: props.isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease-out',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
}))

const headerStyle = computed(() => ({
  backgroundColor: '#29275B',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}))

const headerTitleStyle = computed(() => ({
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
  textAlign: 'center',
  flex: '1',
  padding: '16px 16px',
  paddingRight: '0'
}))

const closeButtonStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '44px',
  height: '44px',
  marginRight: '8px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  color: 'white',
  transition: 'background-color 0.2s ease',
  flexShrink: '0'
}))

const contentStyle = computed(() => ({
  flex: '1',
  overflowY: 'auto',
  backgroundColor: '#f5f5f5'
}))

const productSectionStyle = computed(() => ({
  backgroundColor: 'white',
  margin: '16px',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  gap: '16px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
}))

const productImageContainerStyle = computed(() => ({
  position: 'relative',
  width: '100px',
  height: '100px',
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: '#f8f9fa',
  flexShrink: '0'
}))

const productImageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}))

const imagePlaceholderStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '32px',
  color: '#9ca3af'
}))

const newBadgeStyle = computed(() => ({
  position: 'absolute',
  top: '4px',
  right: '4px',
  backgroundColor: '#10b981',
  color: 'white',
  fontSize: '10px',
  fontWeight: '700',
  padding: '2px 6px',
  borderRadius: '4px',
  textTransform: 'uppercase'
}))

const currentIndicatorStyle = computed(() => ({
  position: 'absolute',
  bottom: '4px',
  left: '4px',
  backgroundColor: '#ef4444',
  color: 'white',
  fontSize: '10px',
  fontWeight: '700',
  padding: '2px 6px',
  borderRadius: '4px',
  textTransform: 'uppercase'
}))

const productDetailsStyle = computed(() => ({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}))

const productTitleStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0',
  lineHeight: '1.3'
}))

const productSkuStyle = computed(() => ({
  fontSize: '14px',
  color: '#6b7280',
  margin: '0'
}))

const productPriceStyle = computed(() => ({
  fontSize: '24px',
  fontWeight: '700',
  color: '#ef4444',
  margin: '0'
}))

const moreInfoButtonStyle = computed(() => ({
  color: '#3b82f6',
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  textAlign: 'left',
  padding: '0',
  textDecoration: 'underline',
  alignSelf: 'flex-start'
}))

const optionsSectionStyle = computed(() => ({
  margin: '0 16px 16px 16px'
}))

const optionsTitleStyle = computed(() => ({
  fontSize: '18px',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 16px 0'
}))

const optionsListStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}))

const getOptionItemStyle = (variant) => {
  const isSelected = selectedVariant.value?.sku === variant.sku
  const isCurrent = isCurrentVariant(variant)
  const isCached = isVariantCached(variant)
  const isTooLarge = isVariantTooLarge(variant)

  // Disabled style for variants that are too large
  if (isTooLarge) {
    return {
      backgroundColor: '#f3f4f6',
      color: '#9ca3af',
      padding: '16px',
      borderRadius: '8px',
      cursor: 'not-allowed',
      transition: 'all 0.2s ease',
      border: '1px solid #e5e7eb',
      boxShadow: 'none',
      fontWeight: '400',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      opacity: '0.7'
    }
  }

  return {
    backgroundColor: isCurrent ? '#29275B' : (isSelected ? '#e0e7ff' : 'white'),
    color: isCurrent ? 'white' : '#1f2937',
    padding: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: !isCurrent ? '1px solid grey' : 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontWeight: isCurrent ? '600' : '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  }
}

const optionTextStyle = computed(() => ({
  fontSize: '16px'
}))

const currentVariantBadgeStyle = computed(() => ({
  fontSize: '12px',
  fontWeight: '600',
  color: '#10b981'
}))

// Style for cached/ready variants (instant swap available)
const cachedVariantBadgeStyle = computed(() => ({
  fontSize: '11px',
  fontWeight: '500',
  color: '#6b7280',
  backgroundColor: '#f3f4f6',
  padding: '2px 8px',
  borderRadius: '4px'
}))

// Style for variants that are too large to fit
const tooLargeBadgeStyle = computed(() => ({
  fontSize: '11px',
  fontWeight: '600',
  color: '#dc2626',
  backgroundColor: '#fef2f2',
  padding: '2px 8px',
  borderRadius: '4px',
  border: '1px solid #fecaca'
}))

const footerStyle = computed(() => ({
  padding: '16px',
  backgroundColor: '#f5f5f5',
  borderTop: '1px solid #e5e7eb'
}))

const addToRoomButtonStyle = computed(() => {
  const isDisabled = !selectedVariant.value || isCurrentVariant(selectedVariant.value)
  return {
    width: '100%',
    backgroundColor: isDisabled ? '#9ca3af' : '#29275B',
    color: 'white',
    border: 'none',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '700',
    textTransform: 'uppercase',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease',
    letterSpacing: '0.5px'
  }
})

// Style for collision preview button (amber/orange warning color)
const collisionPreviewButtonStyle = computed(() => ({
  width: '100%',
  backgroundColor: '#dc2626',  // Red to indicate collision/error
  color: 'white',
  border: 'none',
  padding: '16px',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: '700',
  textTransform: 'uppercase',
  cursor: 'default',
  transition: 'background-color 0.2s ease',
  letterSpacing: '0.5px'
}))
</script>

<style scoped>
.size-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Prevent hover effects on disabled (too large) variants */
.size-option[style*="not-allowed"]:hover {
  transform: none;
  box-shadow: none !important;
}

button[style*="rgba(255, 255, 255, 0.2)"]:hover {
  background-color: rgba(255, 255, 255, 0.3) !important;
}

.more-info-link:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.swap-button:hover:not(:disabled) {
  background-color: #1f1e49 !important;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.15) !important;
}
</style>