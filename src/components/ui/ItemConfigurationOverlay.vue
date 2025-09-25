<template>
  <div v-if="selectedItem && hasMultipleVariants" :style="overlayStyle">
    <div :style="controlsContainerStyle">

      <div :style="buttonsContainerStyle">
        <button
            @click="openVariantConfiguration"
            :style="configureButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#0066cc'"
            @mouseleave="e => e.target.style.backgroundColor = '#0078d4'"
        >
          ⚙️ Configure
        </button>

        <button
            @click="deleteItem"
            :style="deleteButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#d13438'"
            @mouseleave="e => e.target.style.backgroundColor = '#dc3545'"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import productData from '../../mocks/productData'

const props = defineProps({
  selectedItem: {
    type: Object,
    default: null
  },
  roomWidth: {
    type: Number,
    required: true
  },
  roomHeight: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['configure-variants', 'delete-item'])
console.log('>>> props', props.selectedItem)

// Check if the selected item has multiple variants available
const hasMultipleVariants = computed(() => {
  if (!props.selectedItem?.type) return false

  const categoryProducts = productData[props.selectedItem.type]
  if (!categoryProducts) return false

  // Find the product by matching SKU or product name
  const currentProduct = categoryProducts.find(product => {
    if (props.selectedItem.sku) {
      // Match by SKU in variants
      return product.variants?.some(variant => variant.sku === props.selectedItem.sku)
    }
    return product.name === props.selectedItem.productName
  })

  return currentProduct?.variants?.length > 1
})

const openVariantConfiguration = () => {
  if (!props.selectedItem?.type) return

  const categoryProducts = productData[props.selectedItem.type]
  if (!categoryProducts) return

  // Find the product containing the current item's variant
  const currentProduct = categoryProducts.find(product => {
    if (props.selectedItem.sku) {
      return product.variants?.some(variant => variant.sku === props.selectedItem.sku)
    }
    return product.name === props.selectedItem.productName
  })

  if (currentProduct) {
    // Find the current variant
    const currentVariant = currentProduct.variants?.find(variant => variant.sku === props.selectedItem.sku)

    emit('configure-variants', {
      product: currentProduct,
      currentVariant: currentVariant,
      category: props.selectedItem.type,
      itemId: props.selectedItem.id
    })
  }
}

const deleteItem = () => {
  emit('delete-item', props.selectedItem.id)
}

// Styles
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '130px',
  right: '0px',
  transform: 'translateX(-50%)',
  zIndex: '1000',
  pointerEvents: 'all'
}))

const controlsContainerStyle = computed(() => ({
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '16px 20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  border: '1px solid #e1e5e9',
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
}))

const buttonsContainerStyle = computed(() => ({
  display: 'flex',
  gap: '8px',
  flexShrink: '0'
}))

const configureButtonStyle = computed(() => ({
  backgroundColor: '#0078d4',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  whiteSpace: 'nowrap'
}))

const deleteButtonStyle = computed(() => ({
  backgroundColor: '#dc3545',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '12px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  whiteSpace: 'nowrap'
}))
</script>