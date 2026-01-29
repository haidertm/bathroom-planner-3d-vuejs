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
        :existing-items="items"
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
        :camera="sceneManagerRef?.getActiveCamera() || null"
        :renderer="sceneManagerRef?.renderer || null"
        :rotation-enabled="rotationArrowsEnabled"
        :is-dragging="isDraggingObject"
        :is-multi-select-mode="isMultiSelectMode"
        :selected-count="selectedCount"
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
        :current-item="variantConfigCurrentItem"
        :existing-items="items"
        :room-width="roomWidth"
        :room-height="roomHeight"
        :notch-width="notchWidth"
        :notch-height="notchHeight"
        @close="handleVariantDrawerClose"
        @swap-variant="handleVariantSwap"
        @preview-collision="handlePreviewCollision"
        @clear-collision-preview="handleClearCollisionPreview"
        @deselect-item="handleDeselectItem"
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
    <!-- Canvas container positioned on the right side -->
    <div
        ref="mountRef"
        :style="canvasContainerStyle"
    />

    <!-- Unified Bottom Toolbar -->
    <UnifiedToolbar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :view-mode="viewMode"
        :measurement-enabled="measurementEnabled"
        :multi-select-enabled="isMultiSelectMode"
        :has-selected-item="!!selectedBathroomItem"
        :sidebar-width="showTexturePanel ? 480 : 0"
        @undo="handleUndo"
        @redo="handleRedo"
        @update:view-mode="handleViewModeChange"
        @update:measurement-enabled="handleUnifiedMeasurementToggle"
        @update:multi-select-enabled="handleUnifiedMultiSelectToggle"
        @delete="handleDeleteSelectedItem"
        @clear="handleClearAll"
        @show-instructions="showInstructions = true"
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

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toastMessage" class="toast-notification" :style="toastStyle">
        {{ toastMessage }}
      </div>
    </Transition>
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
import UnifiedToolbar from '../components/ui/UnifiedToolbar.vue'

// Constants
import { CONSTRAINTS, ROOM_DEFAULTS, WALL_SETTINGS } from '../constants/dimensions.js'
import { FLOOR_TEXTURES, WALL_TEXTURES, DEFAULT_FLOOR_TEXTURE, DEFAULT_WALL_TEXTURE } from '../constants/textures'
import { CONFIG, DEFAULT_ORIENTATION } from '../constants/models'
import { LOOK_AT } from '../constants/camera'
import { getTemplateById } from '../constants/templates'

// Services
import { SceneManager } from '../services/sceneManager'
import { EventHandlers } from '../services/eventHandlers'

// Analytics
import { useGtm } from '@gtm-support/vue-gtm'

// Models
import { createModel } from '../models/bathroomFixtures.ts'

// Utils - Updated imports to include collision detection and validation
import { constrainAllObjectsToRoom, findFreeWallPosition, constrainToWalls, constrainToRoom, wouldCollideWithExistingOrWalls, getInteriorBoundaries, validateObjectFitsInRoom, validateNoOverlap, checkWallCollision } from '../utils/constraints.js'
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
import { autoPositionItem } from '../utils/autoPositioning'

// Router
const router = useRouter()

// Analytics
const gtm = useGtm()

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
const isMultiSelectMode = ref(false)
const selectedCount = ref(1)

// Toast notification state
const toastMessage = ref('')
const toastTimeout = ref(null)

const showToast = (message, type = 'info') => {
  // Clear any existing timeout
  if (toastTimeout.value) {
    clearTimeout(toastTimeout.value)
  }

  toastMessage.value = message

  // Auto-hide after 3 seconds
  toastTimeout.value = setTimeout(() => {
    toastMessage.value = ''
    toastTimeout.value = null
  }, 3000)
}

const toggleMultiSelect = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value
  if (eventHandlersRef.value) {
    eventHandlersRef.value.setMultiSelectMode(isMultiSelectMode.value)
    // Clear selection when turning off multi-select to avoid showing delete button
    if (!isMultiSelectMode.value) {
      eventHandlersRef.value.clearSelection()
      selectedItemId.value = null
      selectedObjectId.value = null
      selectedCount.value = 1
    }
  }
}

// Handler for unified toolbar measurement toggle
const handleUnifiedMeasurementToggle = (enabled) => {
  measurementEnabled.value = enabled
  if (sceneManagerRef.value) {
    sceneManagerRef.value.enableMeasurements(enabled)
    if (enabled) {
      updateCurrentMeasurements()
    }
  }
}

// Handler for unified toolbar multi-select toggle
const handleUnifiedMultiSelectToggle = (enabled) => {
  isMultiSelectMode.value = enabled
  if (eventHandlersRef.value) {
    eventHandlersRef.value.setMultiSelectMode(enabled)
    if (!enabled) {
      eventHandlersRef.value.clearSelection()
      selectedItemId.value = null
      selectedObjectId.value = null
      selectedCount.value = 1
    }
  }
}

// Handler for deleting selected item from unified toolbar
const handleDeleteSelectedItem = () => {
  if (selectedItemId.value) {
    deleteItem(selectedItemId.value)
  }
}

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

// Computed property to get the current item for variant swapping
const variantConfigCurrentItem = computed(() => {
  if (!variantConfigItemId.value) return null
  return items.value.find(item => item.id === variantConfigItemId.value) || null
})

// 3. Add these event handlers to your existing methods
const handleItemSelection = (itemId) => {
  console.log('🎯 Item selected:', itemId)
  const numericId = Number(itemId)
  selectedItemId.value = numericId

  // Automatically open variant drawer when item is selected
  const item = items.value.find(i => i.id === numericId)
  if (item && item.sku && item.type) {
    const result = findProductByVariantSku(item.sku, item.type, productData)
    if (result) {
      variantConfigProduct.value = result.product
      variantConfigCurrentVariant.value = result.variant
      variantConfigItemId.value = numericId
      isVariantDrawerOpen.value = true
    }
  }
}

// Flag to prevent drawer close during variant swap
const isSwappingVariant = ref(false)

const handleItemDeselection = () => {
  console.log('🎯 Item deselected')
  selectedItemId.value = null

  // Don't close drawer if we're in the middle of a variant swap
  if (isSwappingVariant.value) {
    return
  }

  // Close variant drawer when item is deselected
  isVariantDrawerOpen.value = false
  variantConfigProduct.value = null
  variantConfigCurrentVariant.value = null
  variantConfigItemId.value = null
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
  // Clear any collision preview when drawer closes
  if (sceneManagerRef.value) {
    sceneManagerRef.value.clearCollisionPreview()
  }
}

const handleDeselectItem = () => {
  // Clear 3D selection/outline
  if (eventHandlersRef.value) {
    eventHandlersRef.value.clearSelection()
  }
  selectedItemId.value = null
}

// Handle collision preview - show red outline for "Too Large" variant
const handlePreviewCollision = (previewConfig) => {
  console.log('🔴 Showing collision preview:', previewConfig)
  const { itemId, variant, currentItem, fitInfo } = previewConfig

  if (!sceneManagerRef.value || !currentItem) {
    console.warn('Cannot show collision preview: missing scene manager or item')
    return
  }

  // Use sceneManager to show collision preview with red outline
  sceneManagerRef.value.showCollisionPreview({
    itemId,
    currentPosition: currentItem.position,
    currentRotation: currentItem.rotation,
    newDimensions: variant.dimensions,
    currentDimensions: currentItem.model?.dimensions,
    reason: fitInfo?.reason || 'collision',
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value
  })
}

// Handle clearing collision preview (e.g., when colliding item is removed)
const handleClearCollisionPreview = () => {
  console.log('🔄 Clearing collision preview (items changed)')
  if (sceneManagerRef.value) {
    sceneManagerRef.value.clearCollisionPreview()
  }
}

const handleVariantSwap = async (swapConfig) => {
  console.log('🔄 Starting variant swap:', swapConfig)

  // Clear any collision preview when starting a valid swap
  if (sceneManagerRef.value) {
    sceneManagerRef.value.clearCollisionPreview()
  }

  // Set flag to prevent drawer from closing during swap
  isSwappingVariant.value = true

  try {
    const { itemId, newVariant, product, useProgressiveLoading = false } = swapConfig

    const currentItemIndex = items.value.findIndex(item => item.id === itemId)
    if (currentItemIndex === -1) {
      console.error('❌ Item not found for variant swap:', itemId)
      isSwappingVariant.value = false
      return
    }

    const currentItem = items.value[currentItemIndex]
    console.log('Current item found:', currentItem)

    // ✅ VALIDATION: Check if the new variant fits in the room
    if (newVariant.dimensions) {
      const validation = validateObjectFitsInRoom(
        newVariant.dimensions,
        roomWidth.value,
        roomHeight.value,
        newVariant.name || currentItem.type
      )

      if (!validation.isValid) {
        alert(`Cannot swap to this variant: ${validation.errorMessage}`)
        isSwappingVariant.value = false
        return
      }

      // ✅ VALIDATION: Check if the new variant would fit at the current position
      // Skip wall collision check for freestanding items - they're not bound to walls
      const movementConfig = getMovementConfig(currentItem.type, currentItem)
      const isFreestanding = !movementConfig.snapToWall

      if (!isFreestanding) {
        // Create a temp position to check wall collision with new dimensions
        const currentPosition = {
          x: currentItem.position[0],
          y: currentItem.position[1],
          z: currentItem.position[2]
        }

        // Create a temporary item with new dimensions to check wall collision
      }
    }

    // Create the swapped item
    const swappedItem = swapItemVariant(currentItem, newVariant)

    // For mirrors: Recalculate Y position to maintain 20cm gap above vanity
    // When swapping variants with different floorOffsets, we need to adjust Y
    if (currentItem.type === 'Mirror') {
      const oldFloorOffset = currentItem.model?.floorOffset || 0
      const newFloorOffset = newVariant.floorOffset || 0

      // Find vanity below the mirror (same X/Z position, vanity type)
      const vanityBelow = items.value.find(item => {
        if (item.type !== 'Furniture') return false
        const dx = Math.abs(item.position[0] - currentItem.position[0])
        const dz = Math.abs(item.position[2] - currentItem.position[2])
        // Check if vanity is horizontally aligned (within 30cm tolerance)
        return dx < 30 && dz < 30
      })

      if (vanityBelow) {
        // Mirror is above vanity - recalculate Y to maintain 20cm gap
        const MIRROR_GAP_ABOVE_VANITY = 20
        const vanityDimensions = vanityBelow.model?.dimensions || { height: 55 }
        const vanityTopY = (vanityBelow.position[1] || 0) + vanityDimensions.height
        const desiredVisualBottom = vanityTopY + MIRROR_GAP_ABOVE_VANITY
        const newMirrorY = desiredVisualBottom - newFloorOffset

        swappedItem.position = [swappedItem.position[0], newMirrorY, swappedItem.position[2]]
        console.log('🪞 Mirror variant swap: Adjusted Y for vanity placement', {
          vanityTopY,
          oldFloorOffset,
          newFloorOffset,
          desiredVisualBottom,
          newMirrorY,
          actualVisualBottom: newMirrorY + newFloorOffset
        })
      } else {
        // No vanity - maintain the same visual bottom position
        // oldVisualBottom = oldY + oldFloorOffset
        // newVisualBottom = newY + newFloorOffset = oldVisualBottom
        // newY = oldVisualBottom - newFloorOffset = oldY + oldFloorOffset - newFloorOffset
        const oldY = currentItem.position[1]
        const newMirrorY = oldY + oldFloorOffset - newFloorOffset

        swappedItem.position = [swappedItem.position[0], newMirrorY, swappedItem.position[2]]
        console.log('🪞 Mirror variant swap: Adjusted Y to maintain visual position', {
          oldY,
          oldFloorOffset,
          newFloorOffset,
          newMirrorY,
          visualBottom: newMirrorY + newFloorOffset
        })
      }
    }

    console.log('Swapped item created:', swappedItem)

    // Calculate the correct Y position based on new variant's spawnHeight
    const oldSpawnHeight = currentItem.model?.spawnHeight || 0
    const newSpawnHeight = newVariant.spawnHeight || 0
    const wasAtDefaultHeight = Math.abs(currentItem.position[1] - oldSpawnHeight) < 1
    const shouldUseNewSpawnHeight = wasAtDefaultHeight && oldSpawnHeight !== newSpawnHeight

    // RE-CONSTRAIN: Ensure the new variant fits within walls/room
    const movementConfig = getMovementConfig(swappedItem.type, swappedItem)

    if (movementConfig.snapToWall) {
      const constraintResult = constrainToWalls(
          { x: swappedItem.position[0], y: swappedItem.position[1], z: swappedItem.position[2] },
          roomWidth.value,
          roomHeight.value,
          {
            type: swappedItem.type,
            scale: swappedItem.scale || 1.0,
            orientation: swappedItem.model?.orientation,
            item: swappedItem,
            notchWidth: notchWidth.value,
            notchHeight: notchHeight.value,
            strictFlushMountCheck: true
          }
      )

      const finalY = shouldUseNewSpawnHeight ? newSpawnHeight : constraintResult.position.y

      swappedItem.position = [
        constraintResult.position.x,
        finalY,
        constraintResult.position.z
      ]
      swappedItem.rotation = constraintResult.rotation
    } else {
      // For free-standing items, ensure they stay in room
      const constraintResult = constrainToRoom(
          { x: swappedItem.position[0], y: swappedItem.position[1], z: swappedItem.position[2] },
          roomWidth.value,
          roomHeight.value,
          {
            type: swappedItem.type,
            scale: swappedItem.scale || 1.0,
            orientation: swappedItem.model?.orientation,
            item: swappedItem,
            notchWidth: notchWidth.value,
            notchHeight: notchHeight.value
          }
      )

      const finalY = shouldUseNewSpawnHeight ? newSpawnHeight : constraintResult.position.y

      swappedItem.position = [
        constraintResult.position.x,
        finalY,
        constraintResult.position.z
      ]
    }

    // Update items array
    const newItems = [...items.value]
    newItems[currentItemIndex] = swappedItem

    // Prevent watcher interference during swap
    lastUpdateSource.value = 'variantSwap-processing'
    items.value = newItems

    // Track if we're using the standard loading path (which has async setTimeout)
    let usedStandardLoadingPath = false

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
            },
            { x: swappedItem.position[0], y: swappedItem.position[1], z: swappedItem.position[2] },
            swappedItem.rotation
          )
          console.log('✅ Progressive variant swap initiated')
        } else {
          // Standard loading path (model is already cached)
          usedStandardLoadingPath = true
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
          lastUpdateSource.value = 'variantSwap-complete'
          isSwappingVariant.value = false
        }, 100)
        }

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

    // Update the variant drawer with the new current variant
    variantConfigCurrentVariant.value = newVariant

    if (!usedStandardLoadingPath) {
      isSwappingVariant.value = false
    }
  } catch (error) {
    console.error('❌ Variant swap failed:', error)
    alert('Failed to swap variant. Please try again.')
    isSwappingVariant.value = false
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

    // Update selected count for multi-select
    const selectedIds = eventHandlersRef.value.getSelectedItemIds()
    selectedCount.value = selectedIds ? selectedIds.length : 1

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
    selectedCount.value = 1
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

// For 2D/3D View Mode Toggle
const viewMode = ref('3d') // '2d' or '3d'
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

const toastStyle = computed(() => ({
  position: 'fixed',
  bottom: '120px',
  left: '50%',
  backgroundColor: 'rgba(41, 39, 91, 0.95)',
  color: 'white',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: '500',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  zIndex: 10001,
  maxWidth: '90vw',
  textAlign: 'center',
  backdropFilter: 'blur(8px)'
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

// 6. Update your Home.vue addItem function to handle product data:
const addItem = async (type, productData = null) => {
  hasUnsavedChanges.value = true
  const defaults = {
    height: 0,
    scale: getScaleForUnits(1.0, 'centimeters'),
    orientation: DEFAULT_ORIENTATION
  }

  // FIXED: Safe access to productData and selectedVariant
  const selectedVariant = productData?.selectedVariant || null;
  const sku = selectedVariant?.sku || null;

  // ✅ CRITICAL: Get the correct orientation from productData
  const productOrientation = selectedVariant?.orientation || DEFAULT_ORIENTATION;

  // ============================================================================
  // PRE-FLIGHT VALIDATION: Check if object fits in room
  // ============================================================================
  if (selectedVariant?.dimensions) {
    const validation = validateObjectFitsInRoom(
      selectedVariant.dimensions,
      roomWidth.value,
      roomHeight.value,
      selectedVariant.name || type
    )

    if (!validation.isValid) {
      alert(validation.errorMessage)
      return
    }
  }

  // ============================================================================
  // SMART AUTO-POSITIONING SYSTEM
  // Uses intelligent placement logic based on item type and existing items:
  // - Mirror: Above vanity, or eye-level on wall facing camera
  // - Toilet: "Sidekick" to vanity (15cm to right/left)
  // - Bath: Best corner (prioritize back wall)
  // - Shower: Corner-bound, nearest to camera focus
  // - Vanity/Furniture: Wall facing camera, centered
  // - Towel Rail/Radiator: Near bath foot end or vanity side
  // ============================================================================
  let freePosition = null
  let wallRotation = 0

  // Build context for smart positioning
  const autoPositionContext = {
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    notchWidth: notchWidth.value,
    notchHeight: notchHeight.value,
    existingItems: items.value,
    cameraPosition: sceneManagerRef.value?.camera?.position
      ? { x: sceneManagerRef.value.camera.position.x, y: sceneManagerRef.value.camera.position.y, z: sceneManagerRef.value.camera.position.z }
      : undefined,
    cameraTarget: { x: LOOK_AT.x, y: LOOK_AT.y, z: LOOK_AT.z }, // Use actual camera look-at point
    selectedItemId: selectedItemId.value ? String(selectedItemId.value) : undefined // For prioritizing anchor placement
  }

  // Try smart auto-positioning first
  const autoResult = autoPositionItem(type, autoPositionContext, selectedVariant, defaults.scale)

  // Track if position was calculated relative to an anchor item (e.g., mirror above vanity)
  // In this case, we should use the calculated Y position, not the default spawnHeight
  let useAutoPositionedY = false

  if (autoResult.placementMethod !== 'none') {
    console.log(`✅ Smart auto-position for ${type}:`, autoResult.placementMethod, autoResult.anchorItem?.type || '')
    freePosition = autoResult.position
    wallRotation = autoResult.rotation
    // Use auto-positioned Y when placement is relative to an anchor item
    useAutoPositionedY = autoResult.placementMethod === 'anchor'
  } else {
    console.log(`⚠️ Auto-position returned no-op for ${type}:`, autoResult.reason)
  }

  // Final fallback: Generic wall position finding
  if (!freePosition) {
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
        selectedVariant?.sku,
        notchWidth.value,
        notchHeight.value
    )

    // Check if no free position was found (all corners occupied for corner items)
    if (!positionResult) {
      alert('Cannot add item - no available wall position found. Please remove an existing item or try a different wall.')
      return
    }

    freePosition = positionResult.position
    wallRotation = positionResult.rotation
  }

  // Determine Y position:
  // - If anchor-based auto-positioning (e.g., mirror above vanity), use calculated Y
  // - Otherwise, use variant's spawnHeight or fallback to freePosition.y
  const itemY = useAutoPositionedY ? freePosition.y : (selectedVariant?.spawnHeight ?? freePosition.y)

  const newItem = {
    id: generateUniqueId(),
    type,
    position: [freePosition.x, itemY, freePosition.z],
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
  // Check if in multi-select mode - delete all selected items
  if (isMultiSelectMode.value && eventHandlersRef.value) {
    const selectedIds = eventHandlersRef.value.getSelectedItemIds()
    if (selectedIds && selectedIds.length > 1) {
      console.log('🗑️ Deleting multiple items:', selectedIds)
      await deleteMultipleItems(selectedIds)
      return
    }
  }

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

// Delete multiple selected items
const deleteMultipleItems = async (itemIds) => {
  hasUnsavedChanges.value = true

  // Remove from 3D scene first
  if (sceneManagerRef.value) {
    for (const id of itemIds) {
      try {
        await sceneManagerRef.value.removeSingleItem(id)
      } catch (error) {
        console.error(`❌ Failed to remove item ${id} from scene:`, error)
      }
    }
  }

  // Clear selection
  if (eventHandlersRef.value) {
    eventHandlersRef.value.clearSelection()
  }

  // Remove from items array
  const newItems = items.value.filter(item => !itemIds.includes(item.id))
  items.value = newItems
  lastUpdateSource.value = 'delete'

  // Clear selection state
  selectedItemId.value = null
  selectedObjectId.value = null

  saveToHistory({
    items: newItems,
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })

  console.log(`✅ ${itemIds.length} items deleted successfully`)
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

// Handle 2D/3D View Mode Change
const handleViewModeChange = async (mode) => {
  console.log('🔄 View mode changing to:', mode)

  if (!sceneManagerRef.value) {
    console.warn('SceneManager not initialized yet')
    return
  }

  try {
    // Use SceneManager as single source of truth for view mode
    // SceneManager.setViewMode internally updates EventHandlers
    // Await the scene change BEFORE updating UI state to keep them consistent
    await sceneManagerRef.value.setViewMode(mode)

    // Only update UI state after scene manager succeeds
    viewMode.value = mode

    // Track view mode change in GTM
    if (gtm?.enabled()) {
      gtm.trackEvent({
        event: 'view_mode_change',
        category: 'Bathroom Planner',
        action: 'Switch View Mode',
        label: mode === '2d' ? '2D Blueprint' : '3D Perspective',
        viewMode: mode
      })
    }
  } catch (error) {
    // Don't change viewMode on error - keep UI consistent with actual scene state
    console.error('❌ Failed to change view mode:', error)
  }
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

    // ============================================================================
    // VALIDATION: Check if all template items fit in the room
    // ============================================================================
    const skippedItems = []
    const placedItems = [] // Track already placed items for overlap checking

    // Convert template items to planner items
    const plannerItems = template.items.map((templateItem, index) => {
      // Find the product data for this SKU
      const productInfo = findVariantBySku(templateItem.sku)

      if (!productInfo) {
        console.warn(`⚠️ Product not found for SKU: ${templateItem.sku}`)
        return null
      }

      const { product, variant, category } = productInfo

      // ✅ VALIDATION: Check if object fits in room dimensions
      if (variant.dimensions) {
        const dimensionValidation = validateObjectFitsInRoom(
          variant.dimensions,
          template.roomWidth,
          template.roomHeight,
          variant.name || templateItem.type
        )

        if (!dimensionValidation.isValid) {
          console.warn(`⚠️ Skipping ${templateItem.type} (${templateItem.sku}): ${dimensionValidation.errorMessage}`)
          skippedItems.push({
            type: templateItem.type,
            sku: templateItem.sku,
            reason: dimensionValidation.errorMessage
          })
          return null
        }
      }

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

      // ✅ VALIDATION: Check if this item fits within room boundaries
      // Pass isTemplateValidation=true to skip item-to-item collision but still check walls
      const templateModel = {
        dimensions: variant.dimensions,
        floorOffset: variant.floorOffset || 0,
        spawnHeight: variant.spawnHeight || 0
      }

      const overlapValidation = validateNoOverlap(
        position,
        templateItem.type,
        1.0, // scale
        placedItems,
        template.roomWidth,
        template.roomHeight,
        templateItem.sku,
        undefined, // notchWidth
        undefined, // notchHeight
        templateModel, // Pass model with dimensions for wall collision check
        true // isTemplateValidation - skip item-to-item collision but check walls
      )

      if (!overlapValidation.isValid) {
        const reason = overlapValidation.collidingItem
          ? `Overlaps with ${overlapValidation.collidingItem.productName || overlapValidation.collidingItem.type}`
          : 'Extends outside room boundaries'
        console.warn(`⚠️ Skipping ${templateItem.type} (${templateItem.sku}): ${reason}`)
        skippedItems.push({
          type: templateItem.type,
          sku: templateItem.sku,
          reason
        })
        return null
      }

      console.log(`📍 Template item ${templateItem.type} (${templateItem.sku}):`, {
        wall: templateItem.wall,
        wallPosition: templateItem.wallPosition,
        calculatedPosition: position,
        rotation: rotation,
        dimensions: variant.dimensions
      })

      // Create the item in the format expected by the planner
      const newItem = {
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
        productId: product.id,
        isTemplateItem: true
      }

      // Add to placed items for overlap checking of subsequent items
      placedItems.push(newItem)

      return newItem
    }).filter(Boolean) // Remove any null items

    // ✅ Notify user if any items were skipped
    if (skippedItems.length > 0) {
      const skippedMessage = skippedItems.map(item => `• ${item.type}: ${item.reason}`).join('\n')
      alert(`Some items could not be placed in this template:\n\n${skippedMessage}`)
    }

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

    // Note: Camera position is now applied earlier in onMounted (before animation starts)
    // to prevent visual jump from default position to template camera position

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

    // Clear stale L-shape corner (saved designs don't support L-shape yet)
    localStorage.removeItem('l-shape-corner-active')

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

  // Pre-set room dimensions and camera from template if one is selected
  let pendingCameraPosition = null
  let pendingCameraPreset = null

  if (templateId) {
    const template = getTemplateById(templateId)
    if (template) {
      roomWidth.value = template.roomWidth
      roomHeight.value = template.roomHeight
      roomWidthRef.value = template.roomWidth
      roomHeightRef.value = template.roomHeight
      console.log('📐 Pre-setting template room dimensions:', template.roomWidth, 'x', template.roomHeight)

      // Store camera settings to apply after scene init
      if (template.customCamera) {
        pendingCameraPosition = template.customCamera
        console.log('📷 Pre-setting template custom camera:', template.customCamera)
      } else if (template.cameraPreset) {
        pendingCameraPreset = template.cameraPreset
        console.log('📷 Pre-setting template camera preset:', template.cameraPreset)
      }

      // Clear stale L-shape corner when loading template (templates don't support L-shape yet)
      if (template.roomShape !== 'l-shape') {
        localStorage.removeItem('l-shape-corner-active')
      }
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

    // Check for L-shape corner selection and set camera angle
    // Detect L-shape by checking if notch dimensions are > 0 (since selected-room-shape was consumed by RoomDimensions)
    const lShapeCorner = localStorage.getItem('l-shape-corner')
    const isLShapeRoom = notchWidth.value > 0 && notchHeight.value > 0

    if (isLShapeRoom && lShapeCorner) {
      // Set camera position based on selected L-shape corner
      // The notch is always physically at NW, but we rotate camera to make it appear in different corners
      const cameraDistance = 800
      const cameraHeight = 150

      const cornerCameraPositions = {
        'nw': { x: 0, y: cameraHeight, z: cameraDistance },      // From south - notch at top-left
        'ne': { x: cameraDistance, y: cameraHeight, z: 0 },      // From east - notch at top-right
        'se': { x: 0, y: cameraHeight, z: -cameraDistance },     // From north - notch at bottom-right
        'sw': { x: -cameraDistance, y: cameraHeight, z: 0 }      // From west - notch at bottom-left
      }

      pendingCameraPosition = cornerCameraPositions[lShapeCorner] || cornerCameraPositions['nw']
      console.log('📷 L-shape corner camera position:', lShapeCorner, pendingCameraPosition)

      // Persist corner for 2D/3D view transitions (sceneManager needs this)
      localStorage.setItem('l-shape-corner-active', lShapeCorner)

      // Clean up the initial corner selection from localStorage after using it
      localStorage.removeItem('l-shape-corner')
    } else {
      // Clear stale L-shape corner from previous sessions when loading non-L-shaped room
      localStorage.removeItem('l-shape-corner-active')
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
    // Connect toast notification handler
    eventHandlersRef.value.onShowToast = showToast
  }

  sceneManagerRef.value.setEventHandlers(eventHandlersRef.value);

  // Apply pending camera position BEFORE rendering starts (to avoid visual jump)
  if (pendingCameraPosition) {
    console.log('📷 Applying custom camera position immediately:', pendingCameraPosition)
    sceneManagerRef.value.setCustomCameraPosition(pendingCameraPosition)
  } else if (pendingCameraPreset) {
    console.log('📷 Applying camera preset immediately:', pendingCameraPreset)
    sceneManagerRef.value.setCameraPreset(pendingCameraPreset)
  }

  // Set up initial scene
  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value], notchWidth.value, notchHeight.value)
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value, notchWidth.value, notchHeight.value)
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
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value, notchWidth.value, notchHeight.value)
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
      case 'notchSize':
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

      case 'initial':
        // Skip - initial load is handled separately
        console.log('⏭️ Skipping initial source - handled elsewhere')
        break

      case 'drag':
        // Skip - drag operations should not trigger scene updates
        console.log('⏭️ Skipping drag source in handleSmartUpdate')
        break

      default:
        // Log unexpected source but skip to avoid duplication
        console.warn(`⚠️ Unexpected update source: ${updateSource} - skipping scene update to prevent duplication`)
        break
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
/* Toast notification base styles */
.toast-notification {
  transform: translateX(-50%);
}

/* Toast transition styles */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
