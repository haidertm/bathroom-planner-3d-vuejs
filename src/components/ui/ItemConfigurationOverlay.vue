<template>
  <div v-if="selectedItem && screenPosition" ref="overlayRef" :style="overlayStyle">
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

// Reusable objects to avoid allocations every frame
const boundingBox = new THREE.Box3()
const corners = Array.from({ length: 8 }, () => new THREE.Vector3())
const center = new THREE.Vector3()
const projectedCenter = new THREE.Vector3()

// Local state for rotation toggle
const rotationLocal = ref(props.rotationEnabled)
const screenPosition = ref(null)
const cachedSelectedObject = ref(null)
const overlayRef = ref(null)

// Keep local state in sync with parent prop
watch(() => props.rotationEnabled, (v) => {
  rotationLocal.value = v
})

// Cache the selected object when selection changes or scene becomes available
watch([() => props.selectedItem?.id, () => props.scene], ([newId, scene]) => {
  cachedSelectedObject.value = null

  if (!newId || !scene) {
    return
  }

  // Traverse visible objects and stop once target is found
  scene.traverseVisible((child) => {
    if (cachedSelectedObject.value) return // Early exit once found
    if (child.userData?.itemId === newId) {
      cachedSelectedObject.value = child
    }
  })
}, { immediate: true })

// Calculate screen position of the selected 3D object
const calculateScreenPosition = () => {
  if (!props.camera || !props.renderer) {
    screenPosition.value = null
    return
  }

  // Fallback: if object not cached yet, attempt one-time resolve
  if (!cachedSelectedObject.value && props.selectedItem?.id && props.scene) {
    props.scene.traverseVisible((child) => {
      if (cachedSelectedObject.value) return // Early exit once found
      if (child.userData?.itemId === props.selectedItem.id) {
        cachedSelectedObject.value = child
      }
    })
  }

  // Bail out if still no cached object after resolve attempt
  if (!cachedSelectedObject.value) {
    screenPosition.value = null
    return
  }

  try {
    const selectedObject = cachedSelectedObject.value

    // Reuse the bounding box and update it with the selected object
    boundingBox.setFromObject(selectedObject)

    // Update the reusable corner vectors with bounding box coordinates
    corners[0].set(boundingBox.min.x, boundingBox.min.y, boundingBox.min.z)
    corners[1].set(boundingBox.max.x, boundingBox.min.y, boundingBox.min.z)
    corners[2].set(boundingBox.min.x, boundingBox.max.y, boundingBox.min.z)
    corners[3].set(boundingBox.max.x, boundingBox.max.y, boundingBox.min.z)
    corners[4].set(boundingBox.min.x, boundingBox.min.y, boundingBox.max.z)
    corners[5].set(boundingBox.max.x, boundingBox.min.y, boundingBox.max.z)
    corners[6].set(boundingBox.min.x, boundingBox.max.y, boundingBox.max.z)
    corners[7].set(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z)

    // Get the center for visibility check (reuse module-level Vector3s)
    boundingBox.getCenter(center)
    projectedCenter.copy(center).project(props.camera)

    // Check if object is behind camera or off-screen
    // z < -1 means behind camera, z > 1 means beyond far plane
    // x/y outside [-1, 1] means off-screen
    if (projectedCenter.z < -1 || projectedCenter.z > 1 ||
        projectedCenter.x < -1 || projectedCenter.x > 1 ||
        projectedCenter.y < -1 || projectedCenter.y > 1) {
      screenPosition.value = null
      return
    }

    // Project all corners to screen space
    const rect = props.renderer.domElement.getBoundingClientRect()
    let minScreenX = Infinity
    let maxScreenX = -Infinity
    let minScreenY = Infinity
    let maxScreenY = -Infinity

    corners.forEach(corner => {
      // Project corner in place (safe because corners are reset each frame)
      corner.project(props.camera)
      const screenX = rect.left + ((corner.x + 1) / 2) * rect.width
      const screenY = rect.top + ((-corner.y + 1) / 2) * rect.height

      minScreenX = Math.min(minScreenX, screenX)
      maxScreenX = Math.max(maxScreenX, screenX)
      minScreenY = Math.min(minScreenY, screenY)
      maxScreenY = Math.max(maxScreenY, screenY)
    })

    // Position at the right edge of the screen-space bounding box, vertically centered
    let x = maxScreenX
    let y = (minScreenY + maxScreenY) / 2

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Estimate or get actual overlay dimensions
    const overlayWidth = overlayRef.value?.offsetWidth || 250 // Fallback to estimated width
    const overlayHeight = overlayRef.value?.offsetHeight || 60 // Fallback to estimated height
    const xOffset = 20 // The offset we add in overlayStyle
    const padding = 10 // Additional padding from viewport edge

    // Clamp x to keep overlay within viewport (accounting for offset and width)
    const minX = padding
    const maxX = viewportWidth - overlayWidth - xOffset - padding
    x = Math.max(minX, Math.min(x, maxX))

    // Clamp y to keep overlay within viewport (accounting for height and vertical centering)
    const minY = overlayHeight / 2 + padding
    const maxY = viewportHeight - overlayHeight / 2 - padding
    y = Math.max(minY, Math.min(y, maxY))

    screenPosition.value = { x, y }
  } catch (error) {
    console.error('Error calculating screen position:', error)
    screenPosition.value = null
  }
}

// Update position whenever relevant props change
watch([
  () => cachedSelectedObject.value,
  () => props.camera,
  () => props.renderer
], () => {
  calculateScreenPosition()
}, { immediate: true })

// Computed to determine if animation loop should run
const shouldRunAnimationLoop = computed(() => {
  // Run loop when there's a selection and 3D context is ready
  // (even if cachedSelectedObject isn't resolved yet)
  return !!(
      props.selectedItem?.id &&
      props.scene &&
      props.camera &&
      props.renderer
  )
})

// Update position on animation frame for smooth tracking
let animationFrameId = null

const updateLoop = () => {
  calculateScreenPosition()

  // Only schedule next frame if conditions are still met
  if (shouldRunAnimationLoop.value) {
    animationFrameId = requestAnimationFrame(updateLoop)
  } else {
    animationFrameId = null
  }
}

const startAnimationLoop = () => {
  if (!animationFrameId && shouldRunAnimationLoop.value) {
    animationFrameId = requestAnimationFrame(updateLoop)
  }
}

const stopAnimationLoop = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// Watch for condition changes to start/stop loop
watch(shouldRunAnimationLoop, (shouldRun) => {
  if (shouldRun) {
    startAnimationLoop()
  } else {
    stopAnimationLoop()
  }
}, { immediate: true })

// Recalculate position when overlay ref becomes available (to use actual dimensions)
watch(overlayRef, (newRef) => {
  if (newRef) {
    calculateScreenPosition()
  }
})

onBeforeUnmount(() => {
  stopAnimationLoop()
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
    left: `${screenPosition.value.x + 20}px`, // Position to the right with 20px gap
    top: `${screenPosition.value.y}px`, // Vertically centered with object
    zIndex: '1100',
    pointerEvents: 'all',
    transform: 'translateY(-50%)' // Center vertically
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