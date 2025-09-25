<!-- VariantConfigurationDrawer.vue - Special mode of ProductDrawer for variant configuration -->
<template>
  <div v-if="isOpen" :style="drawerOverlayStyle" @click="handleOverlayClick">
    <div :style="drawerStyle" @click.stop>
      <!-- Header -->
      <div :style="headerStyle">
        <div :style="headerContentStyle">
          <h3 :style="titleStyle">Configure Variants</h3>
          <div :style="subtitleStyle">{{ product?.name }}</div>
        </div>
        <button @click="closeDrawer" :style="closeButtonStyle">✕</button>
      </div>

      <!-- Current Selection Info -->
      <div v-if="currentVariant" :style="currentSelectionStyle">
        <div :style="currentLabelStyle">Current:</div>
        <div :style="currentInfoStyle">
          <div :style="currentNameStyle">{{ currentVariant.title || currentVariant.name }}</div>
          <div :style="currentSkuStyle">{{ currentVariant.sku }}</div>
        </div>
      </div>

      <!-- Variant Grid -->
      <div :style="variantsContainerStyle">
        <div :style="variantsGridStyle">
          <div
              v-for="variant in variants"
              :key="variant.sku"
              :style="getVariantCardStyle(variant)"
              @click="selectVariant(variant)"
              class="variant-card"
          >
            <!-- Current Badge -->
            <div v-if="isCurrentVariant(variant)" :style="currentBadgeStyle">
              Current
            </div>

            <!-- Variant Image -->
            <div :style="variantImageContainerStyle">
              <img
                  v-if="variant.image"
                  :src="variant.image"
                  :alt="variant.name"
                  :style="variantImageStyle"
                  @error="handleImageError"
              />
              <div v-else :style="variantPlaceholderStyle">
                📦
              </div>
            </div>

            <!-- Variant Info -->
            <div :style="variantInfoStyle">
              <div :style="variantNameStyle">{{ variant.title || variant.name }}</div>
              <div :style="variantSkuStyle">{{ variant.sku }}</div>
              <div v-if="variant.price" :style="variantPriceStyle">£{{ variant.price }}</div>
            </div>

            <!-- Dimensions (if available) -->
            <div v-if="variant.dimensions" :style="variantDimensionsStyle">
              {{ variant.dimensions.width }}×{{ variant.dimensions.depth }}×{{ variant.dimensions.height }}cm
            </div>

            <!-- Selection Indicator -->
            <div v-if="selectedVariant?.sku === variant.sku" :style="selectionIndicatorStyle">
              ✓
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div :style="actionsStyle">
        <button
            @click="closeDrawer"
            :style="cancelButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f8f9fa'"
            @mouseleave="e => e.target.style.backgroundColor = 'white'"
        >
          Cancel
        </button>

        <button
            @click="confirmSwap"
            :style="getConfirmButtonStyle()"
            :disabled="!selectedVariant || isCurrentVariant(selectedVariant)"
            @mouseenter="e => !e.target.disabled && (e.target.style.backgroundColor = '#0066cc')"
            @mouseleave="e => !e.target.disabled && (e.target.style.backgroundColor = '#0078d4')"
        >
          {{ isCurrentVariant(selectedVariant) ? 'Current Variant' : 'Swap Variant' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

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
    type: [String, Number], // Allow both String and Number, handle null gracefully
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

const getVariantCardStyle = (variant) => {
  const isSelected = selectedVariant.value?.sku === variant.sku
  const isCurrent = isCurrentVariant(variant)

  return {
    position: 'relative',
    backgroundColor: isCurrent ? '#f0f8ff' : (isSelected ? '#e3f2fd' : 'white'),
    border: isCurrent ? '2px solid #4caf50' : (isSelected ? '2px solid #2196f3' : '1px solid #e1e5e9'),
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: isSelected ? '0 4px 12px rgba(33,150,243,0.2)' : '0 2px 8px rgba(0,0,0,0.1)'
  }
}

const getConfirmButtonStyle = () => {
  const isDisabled = !selectedVariant.value || isCurrentVariant(selectedVariant.value)

  return {
    backgroundColor: isDisabled ? '#e9ecef' : '#0078d4',
    color: isDisabled ? '#6c757d' : 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s ease',
    opacity: isDisabled ? '0.6' : '1'
  }
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

const handleOverlayClick = () => {
  closeDrawer()
}

const handleImageError = (event) => {
  console.warn('Failed to load variant image:', event.target.src)
}

// Styles
const drawerOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: '10000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
}))

const drawerStyle = computed(() => ({
  backgroundColor: 'white',
  borderRadius: '16px',
  width: '90vw',
  maxWidth: '800px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  overflow: 'hidden'
}))

const headerStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #e1e5e9',
  backgroundColor: '#f8f9fa'
}))

const headerContentStyle = computed(() => ({
  flex: '1'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: '20px',
  fontWeight: '600',
  color: '#2c3e50',
  marginBottom: '4px'
}))

const subtitleStyle = computed(() => ({
  fontSize: '14px',
  color: '#6c757d',
  margin: '0'
}))

const closeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '50%',
  color: '#6c757d',
  transition: 'background-color 0.2s ease'
}))

const currentSelectionStyle = computed(() => ({
  padding: '16px 24px',
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #e1e5e9',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
}))

const currentLabelStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '600',
  color: '#495057',
  minWidth: '60px'
}))

const currentInfoStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px'
}))

const currentNameStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '500',
  color: '#2c3e50'
}))

const currentSkuStyle = computed(() => ({
  fontSize: '12px',
  color: '#6c757d'
}))

const variantsContainerStyle = computed(() => ({
  flex: '1',
  overflow: 'auto',
  padding: '24px'
}))

const variantsGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '16px'
}))

const currentBadgeStyle = computed(() => ({
  position: 'absolute',
  top: '8px',
  right: '8px',
  backgroundColor: '#4caf50',
  color: 'white',
  fontSize: '10px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}))

const variantImageContainerStyle = computed(() => ({
  width: '100%',
  height: '120px',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  overflow: 'hidden'
}))

const variantImageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}))

const variantPlaceholderStyle = computed(() => ({
  fontSize: '48px',
  color: '#dee2e6'
}))

const variantInfoStyle = computed(() => ({
  flex: '1',
  marginBottom: '8px'
}))

const variantNameStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '600',
  color: '#2c3e50',
  marginBottom: '4px',
  lineHeight: '1.4'
}))

const variantSkuStyle = computed(() => ({
  fontSize: '12px',
  color: '#6c757d',
  marginBottom: '4px'
}))

const variantPriceStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '600',
  color: '#28a745'
}))

const variantDimensionsStyle = computed(() => ({
  fontSize: '11px',
  color: '#6c757d',
  backgroundColor: '#f8f9fa',
  padding: '4px 8px',
  borderRadius: '4px',
  marginBottom: '8px',
  textAlign: 'center'
}))

const selectionIndicatorStyle = computed(() => ({
  position: 'absolute',
  top: '8px',
  left: '8px',
  backgroundColor: '#2196f3',
  color: 'white',
  fontSize: '14px',
  fontWeight: '600',
  padding: '4px 8px',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const actionsStyle = computed(() => ({
  padding: '20px 24px',
  borderTop: '1px solid #e1e5e9',
  display: 'flex',
  gap: '12px',
  justifyContent: 'flex-end',
  backgroundColor: '#f8f9fa'
}))

const cancelButtonStyle = computed(() => ({
  backgroundColor: 'white',
  color: '#6c757d',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease'
}))
</script>

<style scoped>
.variant-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
}
</style>