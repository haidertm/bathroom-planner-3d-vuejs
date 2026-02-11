<template>
  <div class="variant-selector">
    <h4 class="variant-selector__title">{{ title }}</h4>

    <!-- Single filtered variant - simplified view -->
    <template v-if="hasOnlyOneVariant">
      <div class="variant-selector__single">
        <span class="variant-selector__single-name">{{ selectedVariant?.name }}</span>
        <span v-if="isTooLarge(selectedVariant)" class="variant-selector__too-large-badge">
          Too Large
        </span>
      </div>
    </template>

    <!-- Multiple variants - selection buttons -->
    <template v-else>
      <div class="variant-selector__options">
        <button
          v-for="(variant, index) in displayedVariants"
          :key="variant.id || variant.sku || variant.name || index"
          @click="handleVariantSelect(variant)"
          class="variant-selector__button"
          :class="{
            'variant-selector__button--selected': isSelected(variant),
            'variant-selector__button--cached': isCached(variant) && !isSelected(variant),
            'variant-selector__button--disabled': isTooLarge(variant)
          }"
          :title="isTooLarge(variant) ? getTooLargeTooltip(variant) : ''"
        >
          <span class="variant-selector__button-content">
            <span>{{ variant.name }}</span>
            <span v-if="isTooLarge(variant)" class="variant-selector__too-large-badge">
              Too Large
            </span>
          </span>
        </button>
      </div>

      <!-- See More / See Less Button -->
      <div v-if="shouldShowSeeMore" class="variant-selector__see-more">
        <button @click="toggleShowAll" class="variant-selector__see-more-button">
          {{ showAll ? 'See Less' : `See More (${remainingCount} more)` }}
          <span class="variant-selector__arrow">{{ showAll ? '\u2191' : '\u2193' }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { isModelCached } from '../../utils/modelLoader'
import { useGtm } from '@gtm-support/vue-gtm'

const props = defineProps({
  variants: {
    type: Array,
    required: true
  },
  selectedVariant: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: 'Size'
  },
  roomWidth: {
    type: Number,
    default: 300
  },
  roomHeight: {
    type: Number,
    default: 250
  },
  hasOnlyOneVariant: {
    type: Boolean,
    default: false
  },
  productId: {
    type: String,
    default: ''
  },
  productName: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: ''
  },
  checkTooLarge: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['select'])

// Initialize GTM
const gtm = useGtm()

// Handle variant selection with GTM tracking
const handleVariantSelect = (variant) => {
  if (isTooLarge(variant)) return

  // Track variant selection in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'variant_selected',
      category: 'Product Configuration',
      action: 'Variant Selected',
      variantId: variant.id || variant.sku || '',
      variantName: variant.name || '',
      variantSku: variant.sku || '',
      variantPrice: variant.price || '',
      selectorTitle: props.title,
      productId: props.productId,
      productName: props.productName,
      roomDimensions: {
        width: props.roomWidth,
        height: props.roomHeight
      }
    })
  }

  // Emit select event for parent component handling
  emit('select', variant)
}

const showAll = ref(false)
const MAX_VISIBLE = 5

const displayedVariants = computed(() => {
  if (props.variants.length <= MAX_VISIBLE) {
    return props.variants
  }
  return showAll.value ? props.variants : props.variants.slice(0, MAX_VISIBLE)
})

const shouldShowSeeMore = computed(() => props.variants.length > MAX_VISIBLE)

const remainingCount = computed(() => props.variants.length - MAX_VISIBLE)

const isSelected = (variant) => {
  return props.selectedVariant === variant ||
    props.selectedVariant?.sku === variant.sku ||
    props.selectedVariant?.id === variant.id
}

const isCached = (variant) => isModelCached(variant, props.category)

const isTooLarge = (variant) => {
  // Use the comprehensive check from parent if provided
  if (props.checkTooLarge) {
    return props.checkTooLarge(variant)
  }
  // Fallback to simple dimension check
  if (!variant?.dimensions) return false
  const { width, depth } = variant.dimensions
  const buffer = 10
  return width > (props.roomWidth - buffer) || depth > (props.roomHeight - buffer)
}

const getTooLargeTooltip = (variant) => {
  if (!variant?.dimensions) return ''
  const { width, depth } = variant.dimensions
  return `This variant (${width}x${depth}cm) is too large for your room (${props.roomWidth}x${props.roomHeight}cm)`
}

const toggleShowAll = () => {
  showAll.value = !showAll.value
}
</script>

<style scoped>
.variant-selector {
  margin-bottom: 16px;
}

.variant-selector__title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 15px 0;
  font-family: Arial, sans-serif;
}

.variant-selector__single {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background-color: #f0f9f0;
  border-radius: 8px;
  border: 2px solid #29275B;
}

.variant-selector__single-name {
  font-size: 15px;
  font-weight: 600;
  color: #29275B;
  font-family: Arial, sans-serif;
}

.variant-selector__options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variant-selector__button {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: Arial, sans-serif;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.variant-selector__button:hover:not(.variant-selector__button--disabled) {
  border-color: #29275B;
}

.variant-selector__button--selected {
  border-color: #29275B;
  background-color: #29275B;
  color: #ffffff;
  font-weight: 500;
}

.variant-selector__button--cached:not(.variant-selector__button--selected) {
  border-color: #10b981;
}

.variant-selector__button--disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.7;
  border-color: #e5e7eb;
}

.variant-selector__button-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.variant-selector__too-large-badge {
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
  background-color: #fef2f2;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.variant-selector__see-more {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.variant-selector__see-more-button {
  padding: 12px 24px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.variant-selector__see-more-button:hover {
  background-color: #e8e8e8;
}

.variant-selector__arrow {
  font-size: 12px;
}
</style>
