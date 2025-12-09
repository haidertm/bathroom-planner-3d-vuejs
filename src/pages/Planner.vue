<template>
  <div :style="{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }">
    <MeasurementPanel
        :measurement-enabled="measurementEnabled"
        :current-measurements="currentMeasurements"
        @toggle-measurements="handleToggleMeasurements"
    />
    <Sidebar
        v-if="showTexturePanel"
        @floor-change="handleFloorChange"
        @wall-change="handleWallChange"
        :current-floor="currentFloorTexture"
        :current-wall="currentWallTexture"
        @add="addItem"
        @close="handleTextureClose"
        :room-width="roomWidth"
        :room-height="roomHeight"
        :notch-width="notchWidth"
        :notch-height="notchHeight"
        :show-grid="showGrid"
        :show-wall-grid="showWallGrid"
        :wall-culling-enabled="wallCullingEnabled"
        @room-size-change="handleRoomSizeChange"
        @notch-size-change="handleNotchSizeChange"
        @toggle-grid="setShowGrid"
        @toggle-wall-grid="setShowWallGrid"
        @constrain-objects="constrainObjects"
        @toggle-wall-culling="handleWallCullingToggle"
    />
    <ItemConfigurationOverlay
        :selected-item="selectedBathroomItem"
        :scene="sceneManagerRef?.scene || null"
        :camera="sceneManagerRef?.camera || null"
        :renderer="sceneManagerRef?.renderer || null"
        :rotation-enabled="rotationArrowsEnabled"
        :is-dragging="isDraggingObject"
        @configure-variants="handleConfigureVariants"
        @delete-item="deleteItem"
        @toggle-rotation="handleRotationToggleFromOverlay"
        :show-rotation-toggle="showRotationToggle"
    />

    <!-- Variant Configuration Drawer -->
    <VariantConfigurationDrawer
        :is-open="isVariantDrawerOpen"
        :product="variantConfigProduct"
        :current-variant="variantConfigCurrentVariant"
        :item-id="variantConfigItemId"
        @close="handleVariantDrawerClose"
        @swap-variant="handleVariantSwap"
    />
    <!-- Toggle button for texture panel -->
    <button
        v-if="!showTexturePanel"
        @click="handleShowTexturePanel"
        :style="toggleButtonStyle"
        title="Show Texture Panel"
        @mouseenter="e => e.target.style.backgroundColor = '#e0e0e0'"
        @mouseleave="e => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'"
    >
      🎨 Textures
    </button>
    <UndoRedoPanel
        :can-undo="canUndo"
        :can-redo="canRedo"
        :show-instructions="showInstructions"
        @undo="handleUndo"
        @redo="handleRedo"
        @clear="handleClearAll"
        @show-instructions="showInstructions = true"
        @close-instructions="showInstructions = false"
    />

    <!-- Canvas container positioned on the right side -->
    <div
        ref="mountRef"
        :style="canvasContainerStyle"
    />

    <!--    MeasurementToggle button-->
    <MeasurementToggle
        :style="toggleMeasurementStyle"
        v-model="measurementEnabled"
        @click="handleMeasurementUpdate"
        @update:modelValue="handleMeasurementToggle"
        @toggle-measurements="handleToggleMeasurements"
        size="large"
    />

    <!-- Instructions Popup -->
    <div v-if="showInstructions" :style="popupOverlayStyle" @click="closeInstructions">
      <div :style="popupContentStyle" @click.stop>
        <!-- Close Button -->
        <button
            @click="closeInstructions"
            :style="closeButtonStyle"
        >
          ✕
        </button>

        <!-- Instructions Content -->
        <h2 :style="{ marginTop: '0', color: '#333', fontSize: '24px' }">
          🏠 Bathroom Planner Instructions
        </h2>

        <div :style="instructionsContentStyle">
          <div :style="sectionStyle">
            <h3 :style="sectionHeaderStyle">🖱️ Controls</h3>
            <div v-if="isMobileDevice">
              <p><strong>Touch + drag:</strong> Move objects along walls</p>
              <p><strong>Two finger pinch:</strong> Zoom in/out</p>
              <p><strong>Double tap:</strong> Delete selected object</p>
              <p><strong>Single tap:</strong> Select object</p>
            </div>
            <div v-else>
              <p><strong>Left click + drag:</strong> Move objects along walls</p>
              <p><strong>Right click + drag:</strong> Rotate objects</p>
              <p><strong>Ctrl + drag:</strong> Adjust object height</p>
              <p><strong>Alt + drag:</strong> Scale/Resize objects</p>
              <p><strong>Left click empty space:</strong> Rotate camera view</p>
              <p><strong>Mouse wheel:</strong> Zoom In/Out</p>
              <p><strong>DELETE key:</strong> Delete selected object</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick, markRaw, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { loadRoomDimensionsFromStorage, saveRoomDimensionsToStorage } from '../constants/dimensions'
import { preloadModels, getModelCacheStatus } from '../models/bathroomFixtures'
import * as THREE from 'three';
import MeasurementPanel from '../components/ui/MeasurementPanel.vue'
import RotationArrowsToggle from '../components/ui/RotationArrowsToggle.vue'

// Components
import Toolbar from '../components/ui/Toolbar.vue'
import TexturePanel from '../components/ui/TexturePanel.vue'
import RoomSizePanel from '../components/ui/RoomSizePanel.vue'
import UndoRedoPanel from '../components/ui/UndoRedoPanel.vue'
import MeasurementToggle from '../components/ui/MeasurementToggle.vue';

// Constants
import { CONSTRAINTS, ROOM_DEFAULTS } from '../constants/dimensions.js'
import { FLOOR_TEXTURES, WALL_TEXTURES, DEFAULT_FLOOR_TEXTURE, DEFAULT_WALL_TEXTURE } from '../constants/textures'
import { CONFIG, DEFAULT_ORIENTATION } from '../constants/models'
import { getTemplateById } from '../constants/templates'

// Services
import { SceneManager } from '../services/sceneManager'
import { EventHandlers } from '../services/eventHandlers'

// Models
import { createModel } from '../models/bathroomFixtures.ts'

// Utils - Updated imports to include collision detection
import { constrainAllObjectsToRoom, findFreeWallPosition, constrainToWalls, wouldCollideWithExistingOrWalls, getInteriorBoundaries } from '../utils/constraints.js'
import {highlightObject, isMobile} from '../utils/helpers.ts'

// Composables
import { useUndoRedo } from '../composables/useUndoRedo.js'
import Sidebar from '../components/ui/sidebar.vue'
import ItemConfigurationOverlay from '../components/ui/ItemConfigurationOverlay.vue'
import VariantConfigurationDrawer from '../components/ui/VariantConfigurationDrawer.vue'
import { swapItemVariant, findProductByVariantSku } from '../utils/variantSwapUtils'
import Header from '../components/ui/Header.vue';
import { getScaleForUnits } from '../utils/units.js';
import {getMovementConfig} from "../utils/models.js";
import productData from '../mocks/productData'

// Router
const router = useRouter()

// Refs - Use shallowRef for Three.js objects to prevent reactivity issues
const mountRef = ref(null)
const sceneManagerRef = shallowRef(null)
const eventHandlersRef = shallowRef(null)
const roomWidthRef = ref(ROOM_DEFAULTS.WIDTH)
const roomHeightRef = ref(ROOM_DEFAULTS.HEIGHT)
const hasUnsavedChanges = ref(false)

// ADD THIS: Missing reactive reference for instructions popup
const showInstructions = ref(false)

const selectedObjectId = ref(null)

// ID counter to ensure unique IDs
const nextIdRef = ref(2000)
const rotationArrowsEnabled = ref(false) // Default: disabled
const selectedObjectCanRotate = ref(false)

const showRotationToggle = computed(() => {
  return selectedObjectCanRotate.value
})


const selectedItemId = ref(null)
const selectedBathroomItem = computed(() => {
  console.log('>>> who is here', selectedItemId.value)
  if (!selectedItemId.value) return null
  return items.value.find(item => item.id === selectedItemId.value)
})

// Track dragging state to hide overlay during drag
const isDraggingObject = ref(false)

// Handlers for drag state changes
const handleDragStart = () => {
  isDraggingObject.value = true
}

const handleDragEnd = () => {
  isDraggingObject.value = false
}

const handleRotationToggleFromOverlay = (enabled) => {
  console.log('Rotation toggle from overlay:', enabled);
  rotationArrowsEnabled.value = enabled;

  if (eventHandlersRef.value && eventHandlersRef.value.setRotationArrowsEnabled) {
    eventHandlersRef.value.setRotationArrowsEnabled(enabled);

    // If disabling and we have a selected object, make sure arrows are hidden
    if (!enabled && eventHandlersRef.value.selectedObject) {
      // Force hide arrows when toggle is turned off
      eventHandlersRef.value.rotationArrows?.setSelectedObject(null);
    }
    // If enabling and we have a selected object that can rotate, show arrows
    else if (enabled && eventHandlersRef.value.selectedObject && selectedObjectCanRotate.value) {
      eventHandlersRef.value.rotationArrows?.setSelectedObject(eventHandlersRef.value.selectedObject);
    }
  }
}


// Variant configuration state
const isVariantDrawerOpen = ref(false)
const variantConfigProduct = ref(null)
const variantConfigCurrentVariant = ref(null)
const variantConfigItemId = ref(null)

// 3. Add these event handlers to your existing methods
const handleItemSelection = (itemId) => {
  console.log('🎯 Item selected:', itemId)
  selectedItemId.value = Number(itemId)
}

const handleItemDeselection = () => {
  console.log('🎯 Item deselected')
  selectedItemId.value = null
}

const handleConfigureVariants = (config) => {
  console.log('⚙️ Configure variants:', config)

  // If called from overlay, find the product data
  if (!config.product && config.itemId) {
    const item = items.value.find(item => item.id === config.itemId)
    if (item && item.sku && item.type) {
      const result = findProductByVariantSku(item.sku, item.type, productData)
      if (result) {
        config.product = result.product
        config.currentVariant = result.variant
      }
    }
  }

  if (config.product && config.currentVariant) {
    variantConfigProduct.value = config.product
    variantConfigCurrentVariant.value = config.currentVariant
    variantConfigItemId.value = config.itemId
    isVariantDrawerOpen.value = true
  } else {
    console.warn('⚠️ Cannot configure variants: missing product or variant data')
  }
}

const handleVariantDrawerClose = () => {
  isVariantDrawerOpen.value = false
  variantConfigProduct.value = null
  variantConfigCurrentVariant.value = null
  variantConfigItemId.value = null
}

const handleVariantSwap = async (swapConfig) => {
  console.log('🔄 Starting variant swap:', swapConfig)

  try {
    const { itemId, newVariant, product, useProgressiveLoading = false } = swapConfig

    const currentItemIndex = items.value.findIndex(item => item.id === itemId)
    if (currentItemIndex === -1) {
      console.error('❌ Item not found for variant swap:', itemId)
      return
    }

    const currentItem = items.value[currentItemIndex]
    console.log('Current item found:', currentItem)

    // Create the swapped item
    const swappedItem = swapItemVariant(currentItem, newVariant)

    console.log('Swapped item created:', swappedItem)

    // Update items array
    const newItems = [...items.value]
    newItems[currentItemIndex] = swappedItem

    // Prevent watcher interference during swap
    lastUpdateSource.value = 'variantSwap-processing'
    items.value = newItems

    // Handle scene update directly - DON'T let the watcher do it
    if (sceneManagerRef.value) {
      console.log('🔄 Handling variant swap scene update directly')
      console.log('🔄 Progressive loading enabled:', useProgressiveLoading)

      try {
        if (useProgressiveLoading) {
          // Use PROGRESSIVE loading - shows placeholder immediately
          console.log('🔲 Using progressive variant swap with placeholder')

          await sceneManagerRef.value.swapItemVariantProgressively(
            itemId,
            newVariant,
            {
              onPlaceholderSwapped: (placeholder) => {
                console.log('🔲 Placeholder swapped into scene')
                // Update selection to placeholder for immediate visual feedback
                if (eventHandlersRef.value) {
                  eventHandlersRef.value.selectedObject = placeholder
                  highlightObject(placeholder, true)
                  selectedItemId.value = swappedItem.id
                  selectedObjectId.value = swappedItem.id
                }
              },
              onFullModelSwapped: (fullModel) => {
                console.log('✅ Full model swapped into scene')
                // Update selection to full model
                if (eventHandlersRef.value) {
                  eventHandlersRef.value.selectedObject = fullModel
                  highlightObject(fullModel, true)
                  selectedItemId.value = swappedItem.id
                  selectedObjectId.value = swappedItem.id

                  // Update measurements if enabled
                  if (eventHandlersRef.value.measurementSystem) {
                    eventHandlersRef.value.measurementSystem.setSelectedObject(fullModel)
                  }

                  // Update rotation arrows if enabled
                  if (eventHandlersRef.value.rotationArrows && rotationArrowsEnabled.value) {
                    eventHandlersRef.value.rotationArrows.setSelectedObject(fullModel)
                  }

                  handleObjectSelectionChange()
                }
                lastUpdateSource.value = 'variantSwap-complete'
              },
              onProgress: (progress) => {
                console.log(`📈 Progressive swap progress: ${progress}%`)
              }
            }
          )
          console.log('✅ Progressive variant swap initiated')
          return // Early return - callbacks handle the rest
        }

        // Standard loading path (model is already cached)
        // Remove old item first
        await sceneManagerRef.value.removeSingleItem(itemId)
        console.log('✅ Old item removed')

        // Add new variant
        await sceneManagerRef.value.addSingleItem(swappedItem)
        console.log('✅ New variant added')

        // IMPORTANT: Wait for the scene to update, then reselect the new object
        setTimeout(async () => {
          if (sceneManagerRef.value && sceneManagerRef.value.existingItems) {
            const addedModel = sceneManagerRef.value.existingItems.get(swappedItem.id)
            if (addedModel) {
              console.log('🔍 New model found in scene:', addedModel)
              console.log('🔍 Model userData:', addedModel.userData)

              // CRITICAL: Reselect the new object in the event handler
              if (eventHandlersRef.value) {
                console.log('🎯 Reselecting swapped object...')

                // Clear current selection first
                if (eventHandlersRef.value.selectedObject) {
                  eventHandlersRef.value.clearSelection()
                }

                // Set the new object as selected
                eventHandlersRef.value.selectedObject = addedModel

                // Highlight the new object
                highlightObject(addedModel, true)

                // Update selectedItemId to maintain UI state
                selectedItemId.value = swappedItem.id
                selectedObjectId.value = swappedItem.id

                // Update measurements if enabled
                if (eventHandlersRef.value.measurementSystem) {
                  eventHandlersRef.value.measurementSystem.setSelectedObject(addedModel)
                }

                // Update rotation arrows if enabled and object can rotate
                if (eventHandlersRef.value.rotationArrows) {
                  const canRotate = selectedObjectCanRotate.value
                  if (rotationArrowsEnabled.value && canRotate) {
                    eventHandlersRef.value.rotationArrows.setSelectedObject(addedModel)
                  } else {
                    eventHandlersRef.value.rotationArrows.setSelectedObject(null)
                  }
                }

                // Trigger selection change handler to update UI
                handleObjectSelectionChange()

                console.log('✅ Object reselected after variant swap')
              }
            } else {
              console.warn('⚠️ Could not find newly added model in scene')
            }
          }
          // Mark completion for watchers
          lastUpdateSource.value = 'variantSwap-complete'
        }, 100) // Small delay to ensure scene update is complete

      } catch (error) {
        console.error('❌ Error during scene update in variant swap:', error)
        // Fallback: let the watcher handle the update
        lastUpdateSource.value = 'variantSwap-fallback'
      }
    }

    // Mark as saved after successful swap
    hasUnsavedChanges.value = true

    // Save to history
    saveToHistory({
      items: newItems,
      roomWidth: roomWidth.value,
      roomHeight: roomHeight.value,
      currentFloorTexture: currentFloorTexture.value,
      currentWallTexture: currentWallTexture.value
    })

    console.log('✅ Variant swap completed successfully')

    // Close the variant drawer
    handleVariantDrawerClose()
  } catch (error) {
    console.error('❌ Variant swap failed:', error)
    alert('Failed to swap variant. Please try again.')
    handleVariantDrawerClose()
  }
}
// Listen for object selection changes
const handleObjectSelectionChange = () => {

  if (eventHandlersRef.value && eventHandlersRef.value.selectedObject) {
    const selectedObject = eventHandlersRef.value.selectedObject

    const objectType = selectedObject.userData.type
    const itemId = selectedObject.userData.itemId
    selectedItemId.value = itemId

    // Set the selected object ID for the remove button
    selectedObjectId.value = itemId

    // Get current items and find the selected one
    const currentItems = getItems()
    const currentItem = currentItems.find(item => item.id === itemId)

    // Check if this object allows free rotation
    const movementConfig = getMovementConfig(objectType, currentItem)
    const canRotate = movementConfig?.allowFreeRotation === true

    selectedObjectCanRotate.value = canRotate
  } else {
    // Clear selection
    selectedObjectId.value = null
    selectedObjectCanRotate.value = false
  }
}

// Add these reactive variables
const previousItems = ref([])
const isInitialLoad = ref(true)

// Generate unique ID function
const generateUniqueId = () => {
  return nextIdRef.value++
}

const showReloadDialog = () => {
  if (hasUnsavedChanges.value) {
    return window.confirm('Reload site?\n\nChanges you made may not be saved.')
  }
  return true // Allow reload if no unsaved changes
}

// Default objects to load on page start - Properly oriented to face INTO room
const getDefaultItems = () => {
  return [
    // {
    //   id: 1003,
    //   type: 'Door',
    //   position: [0, 0, -2.95], // South wall
    //   rotation: - Math.PI / 2, // Facing north (into room)
    //   scale: 1.0
    // },
    // {
    //   name: 'Door',
    //   path: '/models/door.glb',
    //   scale: 1.4,
    //   orientation: {
    //     type: 'flush_with_wall',
    //     wallBuffer: 0.045, // Flush with wall - no gap
    //     description: 'Door is part of wall opening'
    //   }
    // }
  ]
}

const measurementsEnabled = ref(false)

const handleMeasurementChange = (enabled) => {
  console.log('Measurements toggled:', enabled)
  // Add your measurement logic here
}

// Reactive state
const showTexturePanel = ref(true)
const items = ref(getDefaultItems())
const currentFloorTexture = ref(DEFAULT_FLOOR_TEXTURE)
const currentWallTexture = ref(DEFAULT_WALL_TEXTURE)
const roomWidth = ref(ROOM_DEFAULTS.WIDTH)
const roomHeight = ref(ROOM_DEFAULTS.HEIGHT)
const notchWidth = ref(0) // Default to square room (0 = no notch)
const notchHeight = ref(0) // Default to square room (0 = no notch)
const showGrid = ref(false)
const showWallGrid = ref(false)  // Wall grid checkbox
const wallCullingEnabled = ref(true)
const preventCollisionPlacement = ref(true)

//For Measurement
const measurementEnabled = ref(false)
const currentMeasurements = ref(null)
// Add method to handle measurement toggle
const handleToggleMeasurements = () => {
  measurementEnabled.value = !measurementEnabled.value

  if (sceneManagerRef.value) {
    sceneManagerRef.value.enableMeasurements(measurementEnabled.value)
  }
}

// Update your App.vue canvasContainerStyle computed property:
const canvasContainerStyle = computed(() => {
  // On mobile, always use full width since sidebar is overlay
  if (isMobileDevice.value) {
    return {
      position: 'absolute',
      top: '60px',
      left: '0',
      width: '100vw',
      height: 'calc(100vh - 60px)',
      cursor: 'grab',
      overflow: 'hidden'
    }
  }

  // On desktop, adjust for sidebar
  const sidebarWidth = showTexturePanel.value ? '320px' : '0px'
  return {
    position: 'absolute',
    top: '60px',
    left: sidebarWidth,
    width: `calc(100vw - ${ sidebarWidth })`,
    height: 'calc(100vh - 60px)',
    cursor: 'grab',
    overflow: 'hidden'
  }
})

// ADD: Track when items are updated programmatically vs drag operations
const lastUpdateSource = ref('initial')

// Composables
const { saveToHistory, undo, redo, canUndo, canRedo } = useUndoRedo()

// Computed
const isMobileDevice = computed(() => isMobile())

const toggleButtonStyle = computed(() => ({
  position: 'absolute',
  top: isMobileDevice.value ? '80px' : '70px',
  left: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '13px' : '14px',
  fontWeight: '500',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  backdropFilter: 'blur(10px)',
  zIndex: 1000,
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap'
}))

const toggleMeasurementStyle = computed(() => ({
  position: 'absolute',
  left: isMobileDevice.value ? '' : '28%', // Changed from left to right
  right: isMobileDevice.value ? '12%' : '',
  bottom: isMobileDevice.value ? '10%' : '30px',
  color: 'white',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: isMobileDevice.value ? '16px' : '20px',
  maxWidth: isMobileDevice.value ? '280px' : '320px',
  lineHeight: '1.2'
}))

const popupOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10000,
  backdropFilter: 'blur(3px)'
}))

const popupContentStyle = computed(() => ({
  backgroundColor: '#fff',
  padding: '30px',
  borderRadius: '12px',
  maxWidth: isMobileDevice.value ? '90vw' : '600px',
  maxHeight: isMobileDevice.value ? '85vh' : '80vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  border: '1px solid #e0e0e0'
}))

const closeButtonStyle = computed(() => ({
  position: 'absolute',
  top: isMobileDevice.value ? '15px' : '6px',
  right: isMobileDevice.value ? '15px' : '6px',
  paddingRight: isMobileDevice.value ? '0' : '1px',
  paddingTop: isMobileDevice.value ? '1px' : '0',
  width: '29px',
  height: '29px',
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
}))

const instructionsContentStyle = computed(() => ({
  lineHeight: '1.6',
  color: '#555',
  fontSize: '14px'
}))

const sectionStyle = computed(() => ({
  paddingBottom: '0'
}))

const sectionHeaderStyle = computed(() => ({
  color: '#2c3e50',
  fontSize: '18px',
  marginBottom: '12px',
  fontWeight: '600'
}))

// Watch for room size changes to update refs
watch([roomWidth, roomHeight], ([newWidth, newHeight]) => {
  roomWidthRef.value = newWidth
  roomHeightRef.value = newHeight
})

const handleSaveDesign = () => {
  try {
    // Generate a more user-friendly name with time
    const now = new Date()
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const dateString = now.toLocaleDateString()

    const designData = {
      id: Date.now(), // Simple timestamp-based ID
      name: `Bathroom Design - ${ dateString } ${ timeString }`,
      timestamp: Date.now(),
      items: JSON.parse(JSON.stringify(items.value)), // Deep clone to avoid reference issues
      roomWidth: roomWidth.value,
      roomHeight: roomHeight.value,
      currentFloorTexture: currentFloorTexture.value,
      currentWallTexture: currentWallTexture.value,
      preview: null // Could add canvas snapshot later
    }
    // Get existing designs from localStorage
    let existingDesigns = []
    try {
      const savedDesigns = localStorage.getItem('saved-designs')
      existingDesigns = JSON.parse(savedDesigns || '[]')
    } catch (parseError) {
      existingDesigns = []
    }

    // Add new design to the beginning of the array
    existingDesigns.unshift(designData)

    // Keep only last 20 designs to prevent storage bloat
    const trimmedDesigns = existingDesigns.slice(0, 20)

    // Save back to localStorage
    localStorage.setItem('saved-designs', JSON.stringify(trimmedDesigns))

    // Verify it was saved
    const verification = localStorage.getItem('saved-designs')
    // Show success feedback with better UX
    hasUnsavedChanges.value = false
    // Navigate directly to My Designs page after saving
    router.push('/my-designs')

  } catch (error) {
    console.error('❌ Failed to save design:', error)
    alert('Failed to save design. Please try again.')
  }
}

// Room size change handler
const handleRoomSizeChange = (newWidth, newHeight) => {
  const oldWidth = roomWidth.value
  const oldHeight = roomHeight.value

  roomWidth.value = newWidth
  roomHeight.value = newHeight

  // Update refs
  roomWidthRef.value = newWidth
  roomHeightRef.value = newHeight

  // Save the updated dimensions to localStorage using utility function
  saveRoomDimensionsToStorage(newWidth, newHeight)

  // Constrain objects and update scene
  // Pass old dimensions to ensure items stick to their walls
  const constrainedItems = constrainAllObjectsToRoom(
    items.value, 
    newWidth, 
    newHeight, 
    notchWidth.value, 
    notchHeight.value,
    oldWidth,
    oldHeight,
    notchWidth.value,
    notchHeight.value
  )
  items.value = constrainedItems
  lastUpdateSource.value = 'roomSize'

  // Save to history
  setTimeout(() => {
    saveToHistory({
      items: constrainedItems,
      roomWidth: newWidth,
      roomHeight: newHeight,
      currentFloorTexture: currentFloorTexture.value,
      currentWallTexture: currentWallTexture.value
    })
  }, 100)
}

// Notch size change handler (for L-shaped rooms)
const handleNotchSizeChange = (newNotchWidth, newNotchHeight) => {
  const oldNotchWidth = notchWidth.value
  const oldNotchHeight = notchHeight.value

  notchWidth.value = newNotchWidth
  notchHeight.value = newNotchHeight

  // Save the updated dimensions to localStorage (including notch dimensions)
  saveRoomDimensionsToStorage(roomWidth.value, roomHeight.value, newNotchWidth, newNotchHeight)

  // Constrain objects and update scene
  // Pass old dimensions to ensure items stick to their walls
  const constrainedItems = constrainAllObjectsToRoom(
    items.value, 
    roomWidth.value, 
    roomHeight.value, 
    newNotchWidth, 
    newNotchHeight,
    roomWidth.value,
    roomHeight.value,
    oldNotchWidth,
    oldNotchHeight
  )
  items.value = constrainedItems
  lastUpdateSource.value = 'notchSize'

  // Save to history
  setTimeout(() => {
    saveToHistory({
      items: constrainedItems,
      roomWidth: roomWidth.value,
      roomHeight: roomHeight.value,
      notchWidth: newNotchWidth,
      notchHeight: newNotchHeight,
      currentFloorTexture: currentFloorTexture.value,
      currentWallTexture: currentWallTexture.value
    })
  }, 100)
}

// ============================================================================
// MIRROR PLACEMENT HELPERS - Position mirrors above furniture units
// ============================================================================

/**
 * Find all furniture units in the scene
 * Returns array of all furniture items
 */
const findAllFurnitureUnits = () => {
  return items.value.filter(item => item.type === 'Furniture') || []
}

/**
 * Check if a furniture item already has a mirror above it
 * Returns true if there's already a mirror above this furniture
 */
const hasMirrorAbove = (furnitureItem) => {
  const furniturePos = furnitureItem.position
  const furnitureDimensions = furnitureItem.model?.dimensions || { width: 60, height: 55, depth: 35 }
  const furnitureWall = detectWallFromPosition(furniturePos, furnitureItem.rotation || 0)

  // Calculate furniture top Y for vertical overlap check
  // furniturePos[1] is the model's scene Y position (typically the center or pivot point)
  // floorOffset indicates how far above Y=0 the model's visual bottom sits
  const furnitureFloorOffset = furnitureItem.model?.floorOffset ?? 0
  const furnitureTopY = furniturePos[1] + furnitureFloorOffset + furnitureDimensions.height

  return items.value.some(item => {
    if (item.type !== 'Mirror') return false

    const mirrorPos = item.position
    const mirrorWall = detectWallFromPosition(mirrorPos, item.rotation || 0)

    // Must be on the same wall
    if (mirrorWall !== furnitureWall) return false

    // Check horizontal proximity based on wall orientation
    // This is the key check - if a mirror is horizontally aligned with the furniture on the same wall,
    // we consider it "above" since mirrors are always placed at a height above furniture
    const proximityThreshold = furnitureDimensions.width / 2 + 50 // Half width + 50cm margin

    if (furnitureWall === 'north' || furnitureWall === 'south') {
      // For north/south walls, check X proximity
      if (Math.abs(mirrorPos[0] - furniturePos[0]) > proximityThreshold) return false
    } else {
      // For east/west walls, check Z proximity
      if (Math.abs(mirrorPos[2] - furniturePos[2]) > proximityThreshold) return false
    }

    // Calculate mirror bottom Y to verify it's actually above the furniture
    // Coordinate convention: mirrorPos[1] is the scene Y position.
    // - If floorOffset is defined, it indicates the offset from position.y to the visual bottom
    // - If only dimensions.height is available, treat mirrorPos[1] as model center and compute bottom
    // - Otherwise, fall back to mirrorPos[1] itself (assumes bottom-aligned or 0 offset)
    const mirrorHeight = item.model?.dimensions?.height
    let mirrorBottomY

    if (item.model?.floorOffset !== undefined) {
      // floorOffset defined: bottom = position.y + floorOffset
      mirrorBottomY = mirrorPos[1] + item.model.floorOffset
    } else if (mirrorHeight !== undefined) {
      // No floorOffset but height is known: assume mirrorPos[1] is center, so bottom = center - height/2
      mirrorBottomY = mirrorPos[1] - mirrorHeight / 2
    } else {
      // Neither available: fall back to position.y as a sensible default (assumes bottom at position)
      mirrorBottomY = mirrorPos[1]
    }

    // Mirror must be positioned above the furniture's top (with small tolerance for touching)
    const verticalTolerance = 5 // 5cm tolerance
    if (mirrorBottomY < furnitureTopY - verticalTolerance) {
      // Mirror bottom is below furniture top - not considered "above"
      return false
    }

    return true
  })
}

/**
 * Find a furniture unit that doesn't have a mirror above it yet
 * Returns the first available furniture, or null if all have mirrors
 */
const findAvailableFurnitureForMirror = () => {
  const allFurniture = findAllFurnitureUnits()
  console.log('🔍 findAvailableFurnitureForMirror - Found furniture items:', allFurniture.length)

  // Check each furniture item
  allFurniture.forEach((item, index) => {
    const hasM = hasMirrorAbove(item)
    console.log(`  [${index}] ${item.sku || item.type}: hasMirrorAbove = ${hasM}`)
  })

  // Find any furniture without a mirror above it
  const availableFurniture = allFurniture.find(item => !hasMirrorAbove(item))

  if (availableFurniture) {
    console.log('🔍 Found available furniture:', availableFurniture.sku || availableFurniture.type)
    return availableFurniture
  }

  console.log('🔍 No furniture available without a mirror')
  return null
}

/**
 * Detect which wall an item is on based on its position
 * Returns 'north', 'south', 'east', or 'west'
 */
const detectWallFromPosition = (position, vanityRotation) => {
  // Use rotation to determine wall - more reliable than position
  // Rotation 0 = north wall (facing south)
  // Rotation Math.PI = south wall (facing north)
  // Rotation -Math.PI/2 = east wall (facing west)
  // Rotation Math.PI/2 = west wall (facing east)
  const normalizedRotation = ((vanityRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)

  if (Math.abs(normalizedRotation) < 0.1 || Math.abs(normalizedRotation - 2 * Math.PI) < 0.1) {
    return 'north'
  } else if (Math.abs(normalizedRotation - Math.PI) < 0.1) {
    return 'south'
  } else if (Math.abs(normalizedRotation - Math.PI / 2) < 0.1) {
    return 'west'
  } else if (Math.abs(normalizedRotation - 3 * Math.PI / 2) < 0.1 || Math.abs(normalizedRotation + Math.PI / 2) < 0.1) {
    return 'east'
  }

  // Fallback: use position to detect wall
  const { wallFaces } = getInteriorBoundaries(roomWidth.value, roomHeight.value, notchWidth.value, notchHeight.value)
  const tolerance = 50 // 50cm tolerance

  if (Math.abs(position[2] - wallFaces.north) < tolerance) return 'north'
  if (Math.abs(position[2] - wallFaces.south) < tolerance) return 'south'
  if (Math.abs(position[0] - wallFaces.east) < tolerance) return 'east'
  if (Math.abs(position[0] - wallFaces.west) < tolerance) return 'west'

  return 'north' // Default fallback
}


/**
 * Calculate position for a mirror above a furniture item
 * Places the mirror centered above the furniture unit
 *
 * Mirror Y is computed relative to furniture top:
 * - furnitureTopY = furniturePos[1] + floorOffset + height
 * - mirrorY = furnitureTopY + spawnHeightOffset (gap between furniture top and mirror bottom)
 */
const calculateMirrorPositionAboveFurniture = (furnitureItem, mirrorVariant) => {
  const furniturePos = furnitureItem.position
  const furnitureRotation = furnitureItem.rotation || 0

  // Determine furniture height from available sources (try multiple field paths)
  const furnitureHeight = furnitureItem.model?.dimensions?.height
    ?? furnitureItem.dimensions?.height
    ?? furnitureItem.size?.height
    ?? furnitureItem.height
    ?? null

  // Calculate furniture top Y position
  // floorOffset indicates how far above Y=0 the model's visual bottom sits
  const furnitureFloorOffset = furnitureItem.model?.floorOffset ?? 0
  let furnitureTopY

  if (furnitureHeight !== null) {
    // Furniture top = position Y + floorOffset + height
    furnitureTopY = furniturePos[1] + furnitureFloorOffset + furnitureHeight
  } else {
    // Fallback: use furniture position Y if height is unavailable
    // This assumes the furniture is floor-standing and we place mirror at a reasonable default
    furnitureTopY = furniturePos[1]
  }

  // spawnHeight is treated as an offset above the furniture top (gap between furniture and mirror)
  // If not specified, default to a small gap (e.g., 5cm) for visual separation
  const spawnHeightOffset = mirrorVariant?.spawnHeight ?? 5

  // Mirror Y = furniture top + offset gap
  const mirrorY = furnitureTopY + spawnHeightOffset

  // Mirror position: same X/Z as furniture (centered), Y computed relative to furniture top
  const position = {
    x: furniturePos[0],
    y: mirrorY,
    z: furniturePos[2]
  }

  console.log('🪞 Placing mirror centered above furniture', {
    furnitureTopY,
    spawnHeightOffset,
    mirrorY,
    furnitureHeight: furnitureHeight ?? 'unknown'
  })

  return {
    position,
    rotation: furnitureRotation // Mirror should have same rotation as furniture (same wall)
  }
}

/**
 * Find a wall position for a mirror that doesn't collide with existing mirrors
 * Tries each wall systematically with specific positions along the wall
 */
const findAlternativeWallPositionForMirror = (mirrorVariant) => {
  const { wallFaces, interior } = getInteriorBoundaries(roomWidth.value, roomHeight.value, notchWidth.value, notchHeight.value)
  const mirrorDimensions = mirrorVariant?.dimensions || { width: 60, height: 60, depth: 10 }
  const mirrorSpawnHeight = mirrorVariant?.spawnHeight || 120
  const halfWidth = mirrorDimensions.width / 2

  // Get existing mirrors to avoid collision
  const existingMirrors = items.value.filter(item => item.type === 'Mirror')
  console.log('🔍 Finding alternative position, existing mirrors:', existingMirrors.length)

  // Define wall configurations with rotation
  const walls = [
    { name: 'north', z: wallFaces.north, rotation: 0, getX: (t) => interior.minX + halfWidth + t * (interior.maxX - interior.minX - mirrorDimensions.width) },
    { name: 'south', z: wallFaces.south, rotation: Math.PI, getX: (t) => interior.minX + halfWidth + t * (interior.maxX - interior.minX - mirrorDimensions.width) },
    { name: 'east', x: wallFaces.east, rotation: -Math.PI / 2, getZ: (t) => interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - mirrorDimensions.width) },
    { name: 'west', x: wallFaces.west, rotation: Math.PI / 2, getZ: (t) => interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - mirrorDimensions.width) }
  ]

  // Try positions along each wall (0%, 25%, 50%, 75%, 100%)
  const positions = [0, 0.25, 0.5, 0.75, 1.0]

  for (const wall of walls) {
    for (const t of positions) {
      let testPosition
      if (wall.name === 'north' || wall.name === 'south') {
        testPosition = { x: wall.getX(t), y: mirrorSpawnHeight, z: wall.z }
      } else {
        testPosition = { x: wall.x, y: mirrorSpawnHeight, z: wall.getZ(t) }
      }

      // Check if this position collides with any existing mirror
      let hasCollision = false
      for (const existingMirror of existingMirrors) {
        const existingPos = existingMirror.position
        const existingDim = existingMirror.model?.dimensions || { width: 60, height: 60 }

        // Simple distance-based collision check
        const dx = Math.abs(testPosition.x - existingPos[0])
        const dz = Math.abs(testPosition.z - existingPos[2])
        const minDistX = (mirrorDimensions.width + existingDim.width) / 2 + 10 // 10cm buffer
        const minDistZ = (mirrorDimensions.depth + (existingDim.depth || 10)) / 2 + 10

        // For items on same wall (same axis), check the other axis distance
        if (wall.name === 'north' || wall.name === 'south') {
          // Same Z (same wall), check X distance
          if (Math.abs(testPosition.z - existingPos[2]) < 20 && dx < minDistX) {
            hasCollision = true
            break
          }
        } else {
          // Same X (same wall), check Z distance
          if (Math.abs(testPosition.x - existingPos[0]) < 20 && dz < minDistX) {
            hasCollision = true
            break
          }
        }
      }

      // Also check collision with furniture
      const furniture = items.value.filter(item => item.type === 'Furniture')
      for (const furn of furniture) {
        const furnPos = furn.position
        const furnDim = furn.model?.dimensions || { width: 60, height: 55, depth: 35 }

        const dx = Math.abs(testPosition.x - furnPos[0])
        const dz = Math.abs(testPosition.z - furnPos[2])

        // Only check X/Z collision, mirrors are above furniture in Y
        if (wall.name === 'north' || wall.name === 'south') {
          if (Math.abs(testPosition.z - furnPos[2]) < furnDim.depth && dx < (mirrorDimensions.width + furnDim.width) / 2) {
            hasCollision = true
            break
          }
        } else {
          if (Math.abs(testPosition.x - furnPos[0]) < furnDim.depth && dz < (mirrorDimensions.width + furnDim.width) / 2) {
            hasCollision = true
            break
          }
        }
      }

      if (!hasCollision) {
        console.log(`✅ Found alternative position on ${wall.name} wall at t=${t}:`, testPosition)
        return { position: testPosition, rotation: wall.rotation }
      }
    }
  }

  console.log('❌ No alternative wall position found for mirror')
  return null
}

// 6. Update your Home.vue addItem function to handle product data:
const addItem = async (type, productData = null) => {
  console.log('addItem called with type:', type)
  hasUnsavedChanges.value = true
  const defaults = {
    height: 0,
    scale: getScaleForUnits(1.0, 'centimeters'),
    orientation: DEFAULT_ORIENTATION
  }

  // FIXED: Safe access to productData and selectedVariant
  const selectedVariant = productData?.selectedVariant || null;
  const sku = selectedVariant?.sku || null;

  console.log('productData.selectedVariant?.orientation>>>:::', productData.selectedVariant?.orientation);

  // ✅ CRITICAL: Get the correct orientation from productData
  const productOrientation = selectedVariant?.orientation || DEFAULT_ORIENTATION;

  // ============================================================================
  // MIRROR ABOVE FURNITURE LOGIC
  // If adding a mirror and furniture exists without a mirror, position above it
  // Only ONE mirror per furniture item - subsequent mirrors go on other walls
  // ============================================================================
  let freePosition = null
  let wallRotation = 0

  if (type === 'Mirror') {
    // Find a furniture item that doesn't have a mirror above it yet
    const availableFurniture = findAvailableFurnitureForMirror()

    if (availableFurniture) {
      console.log('🪞 Found furniture without mirror, positioning mirror above it:', availableFurniture.sku || availableFurniture.type)

      // Calculate position for the new mirror (centered above the furniture)
      const mirrorPlacement = calculateMirrorPositionAboveFurniture(
        availableFurniture,
        selectedVariant
      )

      freePosition = mirrorPlacement.position
      wallRotation = mirrorPlacement.rotation

      console.log('🪞 Mirror position calculated:', {
        x: freePosition.x.toFixed(1),
        y: freePosition.y.toFixed(1),
        z: freePosition.z.toFixed(1),
        rotation: wallRotation,
        aboveFurniture: availableFurniture.sku || availableFurniture.type
      })
    } else {
      console.log('🪞 No furniture available without a mirror, finding alternative wall position')

      // Use our smart alternative positioning for mirrors
      const alternativePosition = findAlternativeWallPositionForMirror(selectedVariant)

      if (alternativePosition) {
        freePosition = alternativePosition.position
        wallRotation = alternativePosition.rotation
        console.log('🪞 Alternative mirror position found:', {
          x: freePosition.x.toFixed(1),
          y: freePosition.y.toFixed(1),
          z: freePosition.z.toFixed(1),
          rotation: wallRotation
        })
      } else {
        console.log('🪞 No alternative position found, will try default findFreeWallPosition')
      }
    }
  }

  // If no furniture-relative position was calculated, use default positioning
  if (!freePosition) {
    console.log('🔍 Using default findFreeWallPosition for', type)

    // Find a free position on any wall
    const positionResult = findFreeWallPosition(
        roomWidth.value,
        roomHeight.value,
        type,
        defaults.scale,
        items.value,
        undefined, // No specific wall direction
        productOrientation,
        selectedVariant?.movement,
        selectedVariant?.spawnHeight,
        selectedVariant?.floorOffset || 0,
        selectedVariant.sku,
        notchWidth.value,
        notchHeight.value
    )

    console.log('🔍 findFreeWallPosition result:', positionResult)

    // Check if no free position was found (all corners occupied for corner items)
    if (!positionResult) {
      console.error('❌ findFreeWallPosition returned null - no available position found')
      alert('Cannot add item - no available wall position found. Please remove an existing item or try a different wall.')
      return
    }

    freePosition = positionResult.position
    wallRotation = positionResult.rotation
  }

  const newItem = {
    id: generateUniqueId(),
    type,
    position: [freePosition.x, selectedVariant?.spawnHeight ?? freePosition.y, freePosition.z],
    rotation: wallRotation,
    scale: 1.0,
    // FIXED: Only add product data if both productData and selectedVariant exist
    ...(productData && selectedVariant && {
      sku,
      productName: selectedVariant.name,
      model: {
        name: `${ type }-${ selectedVariant.sku }`,
        path: selectedVariant.path,
        scale: 100,
        orientation: {
          type: productOrientation.type || 'face_into_room',
          wallBuffer: productOrientation.wallBuffer !== undefined ? productOrientation.wallBuffer : 0, // Flush with wall - no gap
          description: productOrientation.description || 'Item is part of wall opening',
          ...(productOrientation.rotationOffset && { rotationOffset: productOrientation.rotationOffset })
        },
        dimensions: selectedVariant.dimensions,
        ...(selectedVariant.movement && {
          movement: selectedVariant.movement
        }),
        floorOffset: selectedVariant.floorOffset || 0,
        spawnHeight: selectedVariant.spawnHeight || 0
      },
      price: selectedVariant.price,
      productId: productData.product?.id,
      selectedColor: productData.selectedColor
    })
  }

  // PERFORMANCE BOOST: Add directly to scene (including first item)
  if (sceneManagerRef.value) {
    try {
      // Use progressive loading if model isn't cached (shows placeholder first)
      const useProgressive = productData?.useProgressiveLoading === true

      console.log('🎯 Planner addItem - Progressive loading check:', {
        useProgressiveLoading: productData?.useProgressiveLoading,
        useProgressive,
        itemId: newItem.id,
        sku: newItem.sku,
        isFirstItem: isInitialLoad.value
      })

      if (useProgressive) {
        console.log('🔲 Using progressive loading with placeholder for new item:', newItem.id)
        await sceneManagerRef.value.addSingleItemProgressively(newItem, {
          onPlaceholderAdded: (placeholder) => {
            console.log('🔲 PLACEHOLDER ADDED to scene for item:', newItem.id)
          },
          onFullModelAdded: (model) => {
            console.log('✅ Full model REPLACED placeholder for item:', newItem.id)
          },
          onProgress: (progress) => {
            if (progress % 20 === 0) { // Log every 20%
              console.log(`📈 Loading progress: ${progress}%`)
            }
          }
        })
      } else {
        console.log('⚡ Using direct add (no placeholder) for item:', newItem.id)
        await sceneManagerRef.value.addSingleItem(newItem)
      }

      // Mark initial load as complete so watcher uses smart update instead of full update
      if (isInitialLoad.value) {
        isInitialLoad.value = false
        previousItems.value = [newItem]
      }

      console.log(`✅ Added item ${ newItem.id } to scene`)
    } catch (error) {
      console.error('❌ Failed to add item directly:', error)
      // Will fall back to full update via watcher
    }
  }

  const newItems = [...items.value, newItem]
  items.value = newItems
  lastUpdateSource.value = 'add'

  saveToHistory({
    items: newItems,
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })
}

// 4. Modify your existing deleteItem function to clear selection
const deleteItem = async (itemId) => {
  console.log('🗑️ Deleting item:', itemId)
  hasUnsavedChanges.value = true

  // CRITICAL: Remove from 3D scene first
  if (sceneManagerRef.value) {
    try {
      await sceneManagerRef.value.removeSingleItem(itemId)
      console.log('✅ Item removed from 3D scene')
    } catch (error) {
      console.error('❌ Failed to remove item from scene:', error)
    }
  }

  // Ensure 3D selection state is cleared
  if (eventHandlersRef.value) {
    eventHandlersRef.value.clearSelection()
  }

  const newItems = items.value.filter(item => item.id !== itemId)
  items.value = newItems
  lastUpdateSource.value = 'delete'

  // Clear selection if deleted item was selected
  if (selectedItemId.value === itemId) {
    selectedItemId.value = null
  }

  // Clear the selectedObjectId for the remove button
  if (selectedObjectId.value === itemId) {
    selectedObjectId.value = null
  }

  saveToHistory({
    items: newItems,
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })

  console.log('✅ Item deleted successfully')
}

const handleUndo = () => {
  const prevState = undo()
  if (prevState) {
    items.value = prevState.items
    roomWidth.value = prevState.roomWidth
    roomHeight.value = prevState.roomHeight
    currentFloorTexture.value = prevState.currentFloorTexture
    currentWallTexture.value = prevState.currentWallTexture
    lastUpdateSource.value = 'undo'
  }
}

const handleRedo = () => {
  const nextState = redo()
  if (nextState) {
    items.value = nextState.items
    roomWidth.value = nextState.roomWidth
    roomHeight.value = nextState.roomHeight
    currentFloorTexture.value = nextState.currentFloorTexture
    currentWallTexture.value = nextState.currentWallTexture
    lastUpdateSource.value = 'redo'
  }
}

const handleWallCullingToggle = (enabled) => {
  wallCullingEnabled.value = enabled
  if (sceneManagerRef.value) {
    sceneManagerRef.value.setWallCullingEnabled(enabled)
  }
}

const handleFloorChange = (texture) => {
  currentFloorTexture.value = FLOOR_TEXTURES.indexOf(texture)
}

const handleWallChange = (texture) => {
  currentWallTexture.value = WALL_TEXTURES.indexOf(texture)
}

const handleTextureClose = () => {
  console.log('Texture panel closing')
  showTexturePanel.value = false
}

const setShowGrid = (value) => {
  showGrid.value = value
}

const setShowWallGrid = (value) => {
  showWallGrid.value = value
}

const handleShowTexturePanel = () => {
  console.log('Show texture panel')
  showTexturePanel.value = true
}

const constrainObjects = () => {
  const constrainedItems = constrainAllObjectsToRoom(items.value, roomWidth.value, roomHeight.value, notchWidth.value, notchHeight.value)
  items.value = constrainedItems
  lastUpdateSource.value = 'constrain'
}

const closeInstructions = () => {
  showInstructions.value = false
}

// NEW: Custom setItems function that tracks update source
const setItems = (updaterOrArray) => {
  if (typeof updaterOrArray === 'function') {
    // Handle function-based updates (React style)
    items.value = updaterOrArray(items.value)
  } else {
    // Handle direct array assignment
    items.value = updaterOrArray
  }
  lastUpdateSource.value = 'drag'
}

// NEW: Custom getItems function for collision detection
const getItems = () => {
  return items.value
}

// Declare event handlers in component scope
const handleMeasurementUpdate = () => {
  if (measurementEnabled.value) {
    updateCurrentMeasurements()
  }
}

// Listen for measurement toggle from keyboard
const handleMeasurementToggle = () => {
  handleToggleMeasurements()
}
// Add this function to load saved room dimensions
const loadSavedRoomDimensions = () => {
  const dimensions = loadRoomDimensionsFromStorage()

  if (dimensions) {
    roomWidth.value = dimensions.width
    roomHeight.value = dimensions.height

    // Update the refs used by SceneManager
    roomWidthRef.value = dimensions.width
    roomHeightRef.value = dimensions.height

    // Load notch dimensions if they exist (for L-shaped rooms)
    if (dimensions.notchWidth !== undefined) {
      notchWidth.value = dimensions.notchWidth
    }
    if (dimensions.notchHeight !== undefined) {
      notchHeight.value = dimensions.notchHeight
    }

    console.log('Room dimensions loaded (CM):', {
      width: dimensions.width + 'cm',
      height: dimensions.height + 'cm',
      notchWidth: dimensions.notchWidth ? dimensions.notchWidth + 'cm' : 'N/A',
      notchHeight: dimensions.notchHeight ? dimensions.notchHeight + 'cm' : 'N/A'
    })

    return true
  }

  // Fallback to defaults if loading fails
  roomWidth.value = ROOM_DEFAULTS.WIDTH  // 300cm
  roomHeight.value = ROOM_DEFAULTS.HEIGHT // 250cm
  roomWidthRef.value = ROOM_DEFAULTS.WIDTH
  roomHeightRef.value = ROOM_DEFAULTS.HEIGHT

  return false
}


const checkForDesignToLoad = () => {
  try {
    const designToLoad = localStorage.getItem('design-to-load')
    if (designToLoad) {
      const design = JSON.parse(designToLoad)

      // Clear the flag so it doesn't load again
      localStorage.removeItem('design-to-load')

      // Load the design
      loadDesignData(design)

      console.log('✅ Design loaded from MyDesigns:', design.name)
      return true
    }
  } catch (error) {
    console.error('❌ Failed to check for design to load:', error)
  }
  return false
}

/**
 * Check if a template was selected and load it
 * Returns true if a template was loaded, false otherwise
 */
const checkForTemplateToLoad = () => {
  try {
    const templateId = localStorage.getItem('selected-template')
    if (templateId) {
      // Clear the flag so it doesn't load again
      localStorage.removeItem('selected-template')

      const template = getTemplateById(templateId)
      if (!template) {
        console.warn('⚠️ Template not found:', templateId)
        return false
      }

      // Load template data
      loadTemplateData(template)

      console.log('✅ Template loaded:', template.name)
      return true
    }
  } catch (error) {
    console.error('❌ Failed to check for template to load:', error)
  }
  return false
}

/**
 * Find a product variant by SKU across all categories
 */
const findVariantBySku = (sku) => {
  for (const [category, products] of Object.entries(productData)) {
    for (const product of products) {
      if (product.variants) {
        const variant = product.variants.find((v) => v.sku === sku || v.id === sku)
        if (variant) {
          return { product, variant, category }
        }
      }
    }
  }
  return null
}

/**
 * Calculate position for an item based on wall and wallPosition
 */
const calculateWallPosition = (
  wall,
  wallPosition,
  roomWidth,
  roomHeight,
  dimensions,
  spawnHeight = 0
) => {
  const WALL_THICKNESS = 5
  const halfRoomWidth = roomWidth / 2
  const halfRoomHeight = roomHeight / 2

  // Wall face positions (interior surface of walls)
  const wallFaces = {
    north: -halfRoomHeight + WALL_THICKNESS,
    south: halfRoomHeight - WALL_THICKNESS,
    east: halfRoomWidth - WALL_THICKNESS,
    west: -halfRoomWidth + WALL_THICKNESS
  }

  // Interior bounds for positioning along walls
  const interior = {
    minX: -halfRoomWidth + WALL_THICKNESS,
    maxX: halfRoomWidth - WALL_THICKNESS,
    minZ: -halfRoomHeight + WALL_THICKNESS,
    maxZ: halfRoomHeight - WALL_THICKNESS
  }

  const halfWidth = dimensions.width / 2
  const t = wallPosition || 0.5 // Default to center
  let position = { x: 0, y: spawnHeight, z: 0 }
  let rotation = 0

  switch (wall) {
    case 'north': // Back wall - item flush against wall
      position.x = interior.minX + halfWidth + t * (interior.maxX - interior.minX - dimensions.width)
      position.z = wallFaces.north // Flush against north wall
      rotation = 0 // Facing south
      break

    case 'south': // Front wall - item flush against wall
      position.x = interior.minX + halfWidth + t * (interior.maxX - interior.minX - dimensions.width)
      position.z = wallFaces.south // Flush against south wall
      rotation = Math.PI // Facing north
      break

    case 'east': // Right wall - item flush against wall
      position.x = wallFaces.east // Flush against east wall
      position.z = interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - dimensions.width)
      rotation = -Math.PI / 2 // Facing west
      break

    case 'west': // Left wall - item flush against wall
      position.x = wallFaces.west // Flush against west wall
      position.z = interior.minZ + halfWidth + t * (interior.maxZ - interior.minZ - dimensions.width)
      rotation = Math.PI / 2 // Facing east
      break

    case 'corner-nw': // Back-left corner - flush in corner
      position.x = wallFaces.west + halfWidth
      position.z = wallFaces.north // Flush against north wall
      rotation = 0
      break

    case 'corner-ne': // Back-right corner - flush in corner
      position.x = wallFaces.east - halfWidth
      position.z = wallFaces.north // Flush against north wall
      rotation = 0
      break

    case 'corner-sw': // Front-left corner - flush in corner
      position.x = wallFaces.west + halfWidth
      position.z = wallFaces.south // Flush against south wall
      rotation = Math.PI
      break

    case 'corner-se': // Front-right corner - flush in corner
      position.x = wallFaces.east - halfWidth
      position.z = wallFaces.south // Flush against south wall
      rotation = Math.PI
      break
  }

  return { position, rotation }
}

/**
 * Convert template items to the format expected by the planner
 * Places items at specific wall locations defined in the template
 * Uses progressive loading to show placeholders while models load
 */
const loadTemplateData = async (template) => {
  try {
    console.log('🔲 loadTemplateData started for:', template.name)

    // Clear existing items from scene first
    if (sceneManagerRef.value) {
      console.log('🧹 Clearing existing items before loading template...')
      sceneManagerRef.value.clearAllItems()
    }

    // Clear Vue state items
    items.value = []

    // Set room dimensions from template
    roomWidth.value = template.roomWidth
    roomHeight.value = template.roomHeight
    roomWidthRef.value = template.roomWidth
    roomHeightRef.value = template.roomHeight

    console.log('📐 Room dimensions set:', template.roomWidth, 'x', template.roomHeight)

    // Convert template items to planner items
    const plannerItems = template.items.map((templateItem, index) => {
      // Find the product data for this SKU
      const productInfo = findVariantBySku(templateItem.sku)

      if (!productInfo) {
        console.warn(`⚠️ Product not found for SKU: ${templateItem.sku}`)
        return null
      }

      const { product, variant, category } = productInfo

      // Get orientation config from variant
      const productOrientation = variant.orientation || {
        type: 'face_into_room',
        wallBuffer: 0,
        description: 'Standard orientation'
      }

      // Calculate position based on wall and wallPosition
      const { position, rotation } = calculateWallPosition(
        templateItem.wall,
        templateItem.wallPosition,
        template.roomWidth,
        template.roomHeight,
        variant.dimensions,
        variant.spawnHeight || 0
      )

      console.log(`📍 Template item ${templateItem.type} (${templateItem.sku}):`, {
        wall: templateItem.wall,
        wallPosition: templateItem.wallPosition,
        calculatedPosition: position,
        rotation: rotation,
        dimensions: variant.dimensions
      })

      // Create the item in the format expected by the planner
      return {
        id: generateUniqueId(),
        type: templateItem.type,
        position: [position.x, position.y, position.z],
        rotation: rotation,
        scale: 1.0,
        sku: templateItem.sku,
        productName: variant.name || variant.title,
        model: {
          name: `${templateItem.type}-${templateItem.sku}`,
          path: variant.path,
          scale: 100,
          orientation: productOrientation,
          dimensions: variant.dimensions,
          ...(variant.movement && { movement: variant.movement }),
          floorOffset: variant.floorOffset || 0,
          spawnHeight: variant.spawnHeight || 0
        },
        price: variant.price,
        productId: product.id
      }
    }).filter(Boolean) // Remove any null items

    // Set items in Vue state
    items.value = plannerItems

    // Reset textures to defaults for new template
    currentFloorTexture.value = DEFAULT_FLOOR_TEXTURE
    currentWallTexture.value = DEFAULT_WALL_TEXTURE

    // Use progressive loading for each item - shows placeholder while model loads
    if (sceneManagerRef.value && plannerItems.length > 0) {
      console.log('🔲 Loading template items with placeholders...', plannerItems.length, 'items')

      // Mark as not initial load to prevent watcher from double-loading
      isInitialLoad.value = false

      // Load ALL items in parallel so all placeholders show immediately
      const loadPromises = plannerItems.map((item) => {
        return sceneManagerRef.value.addSingleItemProgressively(item, {
          onPlaceholderAdded: (placeholder) => {
            console.log(`🔲 Placeholder shown for ${item.type} (${item.sku})`)
          },
          onFullModelAdded: (model) => {
            console.log(`✅ Full model loaded for ${item.type} (${item.sku})`)
          }
        }).catch(error => {
          console.error(`❌ Failed to load item ${item.sku}:`, error)
        })
      })

      // Wait for all to complete (placeholders show immediately, models load in background)
      await Promise.all(loadPromises)
    }

    // Save initial state to history
    setTimeout(() => {
      saveToHistory({
        items: items.value,
        roomWidth: roomWidth.value,
        roomHeight: roomHeight.value,
        currentFloorTexture: currentFloorTexture.value,
        currentWallTexture: currentWallTexture.value
      })
    }, 100)

    console.log('Template loaded successfully:', {
      templateName: template.name,
      itemCount: plannerItems.length,
      roomSize: `${template.roomWidth}x${template.roomHeight}cm`
    })

  } catch (error) {
    console.error('❌ Failed to load template data:', error)
    alert('Failed to load template. Using default settings instead.')

    // Reset to defaults
    items.value = []
    roomWidth.value = ROOM_DEFAULTS.WIDTH
    roomHeight.value = ROOM_DEFAULTS.HEIGHT
    roomWidthRef.value = ROOM_DEFAULTS.WIDTH
    roomHeightRef.value = ROOM_DEFAULTS.HEIGHT
    currentFloorTexture.value = DEFAULT_FLOOR_TEXTURE
    currentWallTexture.value = DEFAULT_WALL_TEXTURE
  }
}

const loadDesignData = (designData) => {
  try {
    // Validate design data
    if (!designData || typeof designData !== 'object') {
      throw new Error('Invalid design data')
    }

    // Load items (furniture, fixtures, etc.)
    items.value = designData.items || []

    // Load room dimensions
    roomWidth.value = designData.roomWidth || ROOM_DEFAULTS.WIDTH
    roomHeight.value = designData.roomHeight || ROOM_DEFAULTS.HEIGHT

    // Update refs for scene manager
    roomWidthRef.value = roomWidth.value
    roomHeightRef.value = roomHeight.value

    // Load textures
    currentFloorTexture.value = designData.currentFloorTexture || DEFAULT_FLOOR_TEXTURE
    currentWallTexture.value = designData.currentWallTexture || DEFAULT_WALL_TEXTURE

    // Save the loaded state to history
    setTimeout(() => {
      saveToHistory({
        items: items.value,
        roomWidth: roomWidth.value,
        roomHeight: roomHeight.value,
        currentFloorTexture: currentFloorTexture.value,
        currentWallTexture: currentWallTexture.value
      })
    }, 100)

    console.log('Design loaded successfully:', {
      itemCount: items.value.length,
      roomSize: `${ roomWidth.value }x${ roomHeight.value }cm`,
      floorTexture: currentFloorTexture.value,
      wallTexture: currentWallTexture.value
    })

  } catch (error) {
    console.error('❌ Failed to load design data:', error)

    // Show user-friendly error message
    alert('Failed to load design. Using default settings instead.')

    // Reset to defaults
    items.value = []
    roomWidth.value = ROOM_DEFAULTS.WIDTH
    roomHeight.value = ROOM_DEFAULTS.HEIGHT
    roomWidthRef.value = ROOM_DEFAULTS.WIDTH
    roomHeightRef.value = ROOM_DEFAULTS.HEIGHT
    currentFloorTexture.value = DEFAULT_FLOOR_TEXTURE
    currentWallTexture.value = DEFAULT_WALL_TEXTURE
  }
}

// Initialize scene
onMounted(async () => {
  window.addEventListener('object-selected', handleObjectSelectionChange)
  // Override F5 and Ctrl+R
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault()
      if (showReloadDialog()) {
        window.location.reload()
      }
    }
  })

// Override browser refresh button
  window.onbeforeunload = function (e) {
    if (hasUnsavedChanges.value) {
      e.preventDefault()
      return ''
    }
  }
  window.addEventListener('header-save-design', handleSaveDesign)

  // Check for template or design BEFORE scene init to get correct room dimensions
  const templateId = localStorage.getItem('selected-template')
  const hasDesignToLoad = localStorage.getItem('design-to-load')

  // Pre-set room dimensions from template if one is selected
  if (templateId) {
    const template = getTemplateById(templateId)
    if (template) {
      roomWidth.value = template.roomWidth
      roomHeight.value = template.roomHeight
      roomWidthRef.value = template.roomWidth
      roomHeightRef.value = template.roomHeight
      console.log('📐 Pre-setting template room dimensions:', template.roomWidth, 'x', template.roomHeight)
    }
  } else if (!hasDesignToLoad) {
    // No template or design, load saved room dimensions
    const dimensionsLoaded = loadSavedRoomDimensions()
    if (dimensionsLoaded) {
      console.log('Using saved room dimensions (CM):', {
        width: roomWidth.value + 'cm',
        height: roomHeight.value + 'cm'
      })
    } else {
      console.log('Using default room dimensions (CM):', {
        width: ROOM_DEFAULTS.WIDTH + 'cm',
        height: ROOM_DEFAULTS.HEIGHT + 'cm'
      })
    }
  }

  // Initialize scene manager
  const sceneManager = markRaw(new SceneManager())
  sceneManagerRef.value = sceneManager
  const { scene, camera, renderer } = sceneManager.initializeScene()

  // Initialize event handlers and mark as raw to prevent reactivity
  eventHandlersRef.value = markRaw(new EventHandlers(
      scene,
      camera,
      renderer,
      roomWidthRef,
      roomHeightRef,
      notchWidth,                  // For L-shaped rooms
      notchHeight,                 // For L-shaped rooms
      setItems, // Use our custom setItems function
      getItems, // Use our custom getItems function
      deleteItem,
      preventCollisionPlacement,
      saveToHistory,               // ADD THIS LINE
      currentFloorTexture,         // ADD THIS LINE
      currentWallTexture          // ADD THIS LINE
  ))

// ADD THESE LINES RIGHT AFTER THE ABOVE CODE:
  if (eventHandlersRef.value) {
    console.log('🔗 Connecting variant configuration to EventHandlers')
    eventHandlersRef.value.onItemSelected = handleItemSelection
    eventHandlersRef.value.onItemDeselected = handleItemDeselection
    // Connect drag state handlers
    eventHandlersRef.value.onDragStart = handleDragStart
    eventHandlersRef.value.onDragEnd = handleDragEnd
  }

  sceneManagerRef.value.setEventHandlers(eventHandlersRef.value);

  // Set up initial scene
  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value)
  eventHandlersRef.value.setWallCulling(sceneManager.wallCulling)

  if (sceneManagerRef.value.debugLabelsEnabled && sceneManagerRef.value.wallLabelsDebug) {
    sceneManagerRef.value.updateLabels(roomWidth.value, roomHeight.value)
  }

  // Set initial wall culling state
  sceneManagerRef.value.setWallCullingEnabled(wallCullingEnabled.value)

  // Add canvas to DOM
  if (mountRef.value instanceof HTMLElement && renderer.domElement) {
    mountRef.value.appendChild(renderer.domElement)
  }

  // Add event listeners
  eventHandlersRef.value.addEventListeners()

  // Add window resize handler for post-processing
  window.addEventListener('resize', () => {
    if (sceneManagerRef.value) {
      sceneManagerRef.value.updateComposerSize();
    }
  })

  // Start animation loop
  sceneManagerRef.value.startAnimationLoop()

  if (sceneManagerRef.value) {
    sceneManagerRef.value.setWallGridVisible(showWallGrid.value)
    console.log('🔄 Initial wall grid visibility synchronized:', showWallGrid.value)
  }

  // PRELOAD MODELS - This will load all models defined in constants
  console.log('Starting model preloading...', CONFIG)

  if (CONFIG && CONFIG.preloadModels) {
    try {
      await preloadModels()
      console.log('Model preloading completed!')
      console.log('Cache status:', getModelCacheStatus())
    } catch (error) {
      console.error('Error during model preloading:', error)
    }
  }

  // Load template, design, or initial items AFTER scene is ready
  const wasDesignLoaded = checkForDesignToLoad()

  if (!wasDesignLoaded && templateId) {
    // Template selected - load with progressive loading (shows placeholders)
    console.log('🔲 Loading template with placeholders...')
    localStorage.removeItem('selected-template') // Clear flag
    const template = getTemplateById(templateId)
    if (template) {
      try {
        await loadTemplateData(template)
        console.log('✅ Template loaded with placeholders:', template.name)
      } catch (error) {
        console.error('❌ Failed to load template:', error)
      }
    }
  } else if (!wasDesignLoaded) {
    // No template or design - load any existing items
    try {
      await sceneManagerRef.value.updateBathroomItems(items.value)
    } catch (error) {
      console.error('Error loading initial items:', error)
    }
  }

  // ADD THESE LINES to your existing onMounted:
  if (sceneManagerRef.value.measurementSystem && eventHandlersRef.value) {
    eventHandlersRef.value.setMeasurementSystem(sceneManagerRef.value.measurementSystem)
  }

  window.addEventListener('object-selected', handleMeasurementUpdate)
  window.addEventListener('object-moved', handleMeasurementUpdate)
  window.addEventListener('toggle-measurements', handleMeasurementToggle)

  saveToHistory({
    items: items.value, // This should be empty initially
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })

})

// Watch for room geometry changes
watch([roomWidth, roomHeight, showGrid, showWallGrid, notchWidth, notchHeight], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value)
})

// Watch for texture changes
watch([currentFloorTexture, currentWallTexture], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value], notchWidth.value, notchHeight.value)
})

// MODIFIED: Only update scene for non-drag operations
// REPLACE your existing items watcher with this smart version
watch([items, lastUpdateSource], ([newItems, updateSource]) => {
  if (!sceneManagerRef.value) return

  console.log(`🔍 Items changed: ${ updateSource }, ${ newItems.length } items`)

  // Skip scene updates during drag operations
  if (updateSource === 'drag') {
    console.log('⏭️ Skipping scene update during drag')
    return
  }

  // For initial load, use the full update method
  if (isInitialLoad.value) {
    console.log('🚀 Initial load - using full update')
    sceneManagerRef.value.updateBathroomItems(newItems)
    previousItems.value = [...newItems]
    isInitialLoad.value = false
    return
  }
  // Use smart updates for better performance
  handleSmartUpdate(newItems, updateSource)

}, { deep: true })

watch([showWallGrid], ([newShowWallGrid]) => {
  console.log('👀 Wall grid visibility changed:', newShowWallGrid);

  if (sceneManagerRef.value) {
    sceneManagerRef.value.setWallGridVisible(newShowWallGrid);
  }
}, { immediate: true });

// Watch for measurement changes
watch(measurementEnabled, (enabled) => {
  if (sceneManagerRef.value) {
    sceneManagerRef.value.enableMeasurements(enabled)
  }
});

// Cleanup
onUnmounted(() => {
  window.removeEventListener('header-save-design', handleSaveDesign)
  if (eventHandlersRef.value) {
    eventHandlersRef.value.removeEventListeners()
  }

  window.removeEventListener('toggle-measurements', handleMeasurementToggle)
  window.removeEventListener('object-selected', handleObjectSelectionChange)
  window.removeEventListener('object-selected', handleMeasurementUpdate)
  window.removeEventListener('object-moved', handleMeasurementUpdate)

  // Remove resize listener
  window.removeEventListener('resize', () => {
    if (sceneManagerRef.value) {
      sceneManagerRef.value.updateComposerSize();
    }
  })

  if (mountRef.value && sceneManagerRef.value) {
    const renderer = sceneManagerRef.value.renderer
    if (renderer && renderer.domElement) {
      mountRef.value.removeChild(renderer.domElement)
    }
  }

  if (sceneManagerRef.value) {
    sceneManagerRef.value.dispose()
  }
})

// NEW: Smart incremental update handler
const handleIncrementalUpdate = async (newItems, updateSource) => {
  if (!sceneManagerRef.value) return

  const prevItems = previousItems.value

  console.log('🔄 Performing incremental update:', {
    source: updateSource,
    prevCount: prevItems.length,
    newCount: newItems.length
  })

  try {
    switch (updateSource) {
      case 'add':
        // Scene update already handled in addItem method
        console.log('➕ Add operation - scene already updated directly')
        break

      case 'delete':
        // Scene update already handled in deleteItem method
        console.log('🗑️ Delete operation - scene already updated directly')
        break

      case 'clear':
        // Scene update already handled in handleClearAll method
        console.log('🧹 Clear operation - scene already updated directly')
        break

      case 'move':
      case 'rotate':
      case 'scale':
      case 'undo':
      case 'redo':
      case 'roomSize':
      case 'constrain':
        // Use the incremental update for these operations
        console.log(`🔄 Updating scene for ${ updateSource }`)
        await sceneManagerRef.value.updateBathroomItems(newItems)
        break

      default:
        // Fallback to incremental update
        console.log('🔄 Default incremental update')
        await sceneManagerRef.value.updateBathroomItems(newItems)
    }

    // Update the previous items reference
    previousItems.value = [...newItems]

  } catch (error) {
    console.error('❌ Error during incremental update:', error)
    // Fallback to full update on error
    await sceneManagerRef.value.updateBathroomItems(newItems)
  }
}

// Add method to update current measurements
const updateCurrentMeasurements = () => {
  if (sceneManagerRef.value && measurementEnabled.value) {
    currentMeasurements.value = sceneManagerRef.value.getCurrentMeasurements()
  } else {
    currentMeasurements.value = null
  }
}

const handleSmartUpdate = async (newItems, updateSource) => {
  if (!sceneManagerRef.value) return

  console.log('🔄 Handling smart update:', {
    source: updateSource,
    itemCount: newItems.length
  })

  try {
    switch (updateSource) {
      case 'add':
      case 'delete':
      case 'clear':
        // Scene already updated directly in the respective methods
        console.log(`✅ ${ updateSource } operation - scene already updated directly`)
        break

      case 'undo':
      case 'redo':
      case 'move':
      case 'rotate':
      case 'scale':
      case 'roomSize':
      case 'constrain':
        // Use incremental update for these operations
        console.log(`🔄 Updating scene for ${ updateSource }`)
        await sceneManagerRef.value.updateBathroomItems(newItems)
        break
      case 'variantSwap-processing':
        // Skip scene update while variant swap is processing
        console.log('⏭️ Skipping scene update during variant swap processing')
        break

      case 'variantSwap-complete':
        // Scene already updated directly
        console.log('✅ Variant swap scene already updated directly')
        break

      default:
        // Fallback to incremental update
        console.log('🔄 Default incremental update')
        await sceneManagerRef.value.updateBathroomItems(newItems)
    }

    // Update the previous items reference
    previousItems.value = [...newItems]

  } catch (error) {
    console.error('❌ Error during smart update:', error)
    // Fallback to full update on error
    try {
      await sceneManagerRef.value.updateBathroomItems(newItems)
    } catch (fallbackError) {
      console.error('❌ Fallback update also failed:', fallbackError)
    }
  }
}

const handleClearAll = () => {
  console.log('🧹 Starting clear all operation...')

  // CRITICAL: Clear items from Three.js scene FIRST
  if (sceneManagerRef.value) {
    try {
      sceneManagerRef.value.clearAllItems()
      console.log('✅ Items cleared from Three.js scene')
    } catch (error) {
      console.error('❌ Error clearing items from scene:', error)
    }
  }

  // Clear Vue reactive state
  const clearedItems = []
  items.value = clearedItems
  lastUpdateSource.value = 'clear'

  // Clear any active selections
  if (sceneManagerRef.value?.measurementSystem) {
    sceneManagerRef.value.measurementSystem.setSelectedObject(null)
  }

  if (eventHandlersRef.value) {
    eventHandlersRef.value.clearSelection()
  }

  // Save to history for undo
  saveToHistory({
    items: clearedItems,
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })

  console.log('🧹 All items cleared from bathroom planner')
}

</script>


<style scoped>
/* Add any component-specific styles here */
</style>
