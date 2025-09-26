<!-- VariantConfigurationDrawer.vue - Product Drawer Style with Live Preview -->
<template>
  <!-- Overlay -->
  <div v-if="isOpen" :style="overlayStyle" @click="closeDrawer"></div>

  <!-- Drawer -->
  <div v-if="isOpen" :style="drawerStyle" @click.stop>
    <!-- Header -->
    <div :style="headerStyle">
      <h1 :style="headerTitleStyle">Swap Variants</h1>
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
              :alt="product?.name"
              :style="productImageStyle"
              @error="handleImageError"
          />
          <div v-else :style="imagePlaceholderStyle">
            📦
          </div>
          <!-- NEW badge if available -->
          <div v-if="product?.isNew" :style="newBadgeStyle">NEW</div>
          <!-- Current variant indicator -->
          <div v-if="isCurrentVariant(selectedVariant)" :style="currentIndicatorStyle">CURRENT</div>
        </div>

        <!-- Product Details - Shows selected variant data -->
        <div :style="productDetailsStyle">
          <h2 :style="productTitleStyle">{{ product?.name }}</h2>
          <div :style="productSkuStyle">SKU: {{ selectedVariant?.sku }}</div>
          <div :style="productPriceStyle">£{{ selectedVariant?.price ?? product?.price }}</div>
          <a
              v-if="selectedVariant?.link || product?.link"
              :href="selectedVariant?.link || product?.link"
              target="_blank"
              rel="noopener noreferrer"
              :style="moreInfoButtonStyle"
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
              :key="variant.sku"
              :style="getOptionItemStyle(variant)"
              @click="selectVariant(variant)"
              class="size-option"
          >
            <span :style="optionTextStyle">
              {{ formatVariantSize(variant) }}
            </span>
            <!-- Show current badge on the variant list -->
            <span v-if="isCurrentVariant(variant)" :style="currentVariantBadgeStyle">
              ✓ Current
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Footer -->
    <div :style="footerStyle">
      <button
          @click="confirmSwap"
          :style="getAddToRoomButtonStyle()"
          :disabled="!selectedVariant || isCurrentVariant(selectedVariant)"
      >
        {{ isCurrentVariant(selectedVariant) ? 'CURRENT SELECTION' : 'SWAP VARIANT' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { isMobile } from "../../utils/helpers";
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
  }
})

const emit = defineEmits(['close', 'swap-variant'])

// Reactive state
const selectedVariant = ref(null)

// Watch for prop changes
watch(() => props.currentVariant, (newCurrentVariant) => {
  if (newCurrentVariant) {
    selectedVariant.value = newCurrentVariant
  }
}, { immediate: true })

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.currentVariant) {
    selectedVariant.value = props.currentVariant
  }
})

// Computed properties
const variants = computed(() => props.product?.variants || [])

const isCurrentVariant = (variant) => {
  return variant?.sku === props.currentVariant?.sku
}

// Methods
const selectVariant = (variant) => {
  selectedVariant.value = variant
}

const confirmSwap = () => {
  if (selectedVariant.value && !isCurrentVariant(selectedVariant.value)) {
    emit('swap-variant', {
      itemId: props.itemId,
      newVariant: selectedVariant.value,
      product: props.product
    })
  }
}

const closeDrawer = () => {
  emit('close')
}

const handleImageError = (event) => {
  console.warn('Failed to load variant image:', event.target.src)
}

const formatVariantSize = (variant) => {

  return variant.name
}

// Styles
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
  top: isMobileDevice.value ? '70px' : '130px',
  left: '0',
  maxHeight: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 130px)',
  height: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 130px)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: '100vw',
  backgroundColor: '#f5f5f5',
  zIndex: '9999',
  display: 'flex',
  flexDirection: 'column',
  transform: props.isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease-out',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif'
}))

const headerStyle = computed(() => ({
  backgroundColor: '#4A4A6B',
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
  padding: '16px 16px'
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

  return {
    backgroundColor: isCurrent ? '#4A4A6B' : (isSelected ? '#e0e7ff' : 'white'),
    color: isCurrent ? 'white' : '#1f2937',
    padding: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: isSelected && !isCurrent ? '2px solid #3b82f6' : 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    fontWeight: isCurrent ? '600' : '500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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

const footerStyle = computed(() => ({
  padding: '16px',
  backgroundColor: '#f5f5f5',
  borderTop: '1px solid #e5e7eb'
}))

const getAddToRoomButtonStyle = () => {
  const isDisabled = !selectedVariant.value || isCurrentVariant(selectedVariant.value)

  return {
    width: '100%',
    backgroundColor: isDisabled ? '#9ca3af' : '#4A4A6B',
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
}
</script>

<style scoped>
.size-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

button[style*="rgba(255, 255, 255, 0.2)"]:hover {
  background-color: rgba(255, 255, 255, 0.3) !important;
}

button[style*="background-color: transparent"]:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

button[style*="background-color: #4A4A6B"]:hover:not(:disabled) {
  background-color: #3d3d5c !important;
}
</style>