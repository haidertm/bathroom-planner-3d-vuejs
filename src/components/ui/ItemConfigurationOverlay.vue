<template>
  <div v-if="selectedItem && screenPosition" :style="overlayStyle">
    <div :style="controlsContainerStyle">
      <div :style="buttonsContainerStyle">
        <button
            v-if="showRotationToggle"
            type="button"
            @click="toggleRotation"
            :style="rotationButtonStyle"
            :title="rotationLocal ? 'Disable rotation arrows' : 'Enable rotation arrows'"
        >
          🔄 {{ rotationLocal ? 'Rotation On' : 'Rotation Off' }}
        </button>

        <button
            type="button"
            v-if="hasMultipleVariants"
            @click="openVariantConfiguration"
            :style="configureButtonStyle"
        >
          ⚙️ Configure
        </button>

        <button
            type="button"
            @click="deleteItem"
            :style="deleteButtonStyle"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, ref, watch, onMounted, onBeforeUnmount} from 'vue'
import productData from '../../mocks/productData'
import * as THREE from 'three'

const props = defineProps({
  selectedItem: {
    type: Object,
    default: null
  },
  rotationEnabled: {
    type: Boolean,
    default: false
  },
  showRotationToggle: {
    type: Boolean,
    default: false
  },
  scene: {
    type: Object, // THREE.Scene
    default: null
  },
  camera: {
    type: Object, // THREE.Camera
    default: null
  },
  renderer: {
    type: Object, // THREE.WebGLRenderer
    default: null
  }
})

const emit = defineEmits(['configure-variants', 'delete-item', 'toggle-rotation'])

// Local state for rotation toggle
const rotationLocal = ref(props.rotationEnabled)
const screenPosition = ref(null)

// Keep local state in sync with parent prop
watch(() => props.rotationEnabled, (v) => {
  rotationLocal.value = v
})

// Calculate screen position of the selected 3D object
const calculateScreenPosition = () => {
  if (!props.selectedItem || !props.scene || !props.camera || !props.renderer) {
    screenPosition.value = null
    return
  }

  try {
    // Find the 3D object in the scene
    let selectedObject = null
    props.scene.traverse((child) => {
      if (child.userData && child.userData.itemId === props.selectedItem.id) {
        selectedObject = child
      }
    })

    if (!selectedObject) {
      screenPosition.value = null
      return
    }

    // Calculate the bounding box to get the visual center
    const boundingBox = new THREE.Box3().setFromObject(selectedObject)
    const center = new THREE.Vector3()
    boundingBox.getCenter(center)

    // Project center to screen coordinates
    const projected = center.clone().project(props.camera)

    // Convert from NDC (-1 to +1) to screen pixels
    const rect = props.renderer.domElement.getBoundingClientRect()
    const x = rect.left + ((projected.x + 1) / 2) * rect.width
    const y = rect.top + ((-projected.y + 1) / 2) * rect.height

    screenPosition.value = { x, y }
  } catch (error) {
    console.error('Error calculating screen position:', error)
    screenPosition.value = null
  }
}

// Update position whenever relevant props change
watch([
  () => props.selectedItem,
  () => props.scene,
  () => props.camera,
  () => props.renderer
], () => {
  calculateScreenPosition()
}, { immediate: true })

// Update position on animation frame for smooth tracking
let animationFrameId = null
const updateLoop = () => {
  calculateScreenPosition()
  animationFrameId = requestAnimationFrame(updateLoop)
}

onMounted(() => {
  updateLoop()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

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

const toggleRotation = () => {
  rotationLocal.value = !rotationLocal.value
  emit('toggle-rotation', rotationLocal.value)
}

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
    let currentVariant = currentProduct.variants?.find(variant => variant.sku === props.selectedItem.sku)
    if (!currentVariant) {
      currentVariant = currentProduct.variants?.[0]
    }

    emit('configure-variants', {
      product: currentProduct,
      currentVariant: currentVariant,
      category: props.selectedItem.type,
      itemId: props.selectedItem.id
    })
  }
}

const deleteItem = () => {
  const id = props.selectedItem?.id
  if (id != null) emit('delete-item', id)
  window.dispatchEvent(new CustomEvent('object-selected', { detail: { itemId: null } }))
}

// Styles - updated to use calculated screen position
const overlayStyle = computed(() => {
  if (!screenPosition.value) {
    return { display: 'none' }
  }

  return {
    position: 'fixed',
    left: `${screenPosition.value.x}px`, // Center horizontally on object
    top: `${screenPosition.value.y + 100}px`, // Position below object with more spacing
    zIndex: '1000',
    pointerEvents: 'all',
    transform: 'translateX(-50%)' // Center the buttons horizontally
  }
})

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

const rotationButtonStyle = computed(() => ({
  backgroundColor: rotationLocal.value ? '#218838' : '#5a6268',
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