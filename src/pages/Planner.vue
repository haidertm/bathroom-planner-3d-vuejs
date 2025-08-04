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
        :show-grid="showGrid"
        :show-wall-grid="showWallGrid"
        :wall-culling-enabled="wallCullingEnabled"
        @room-size-change="handleRoomSizeChange"
        @toggle-grid="setShowGrid"
        @toggle-wall-grid="setShowWallGrid"
        @constrain-objects="constrainObjects"
        @toggle-wall-culling="handleWallCullingToggle"
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

// Services
import { SceneManager } from '../services/sceneManager.js'
import { EventHandlers } from '../services/eventHandlers.js'

// Models
import { createModel } from '../models/bathroomFixtures.ts'

// Utils - Updated imports to include collision detection
import { constrainAllObjectsToRoom, findFreeWallPosition, constrainToWalls } from '../utils/constraints.js'
import { isMobile } from '../utils/helpers.ts'

// Composables
import { useUndoRedo } from '../composables/useUndoRedo.js'
import Sidebar from '../components/ui/sidebar.vue';
import Header from '../components/ui/Header.vue';
import { getScaleForUnits } from '../utils/units.js';

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

// ID counter to ensure unique IDs
const nextIdRef = ref(2000)

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
const showGrid = ref(true)
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
    if (window.confirm('Design saved successfully! Would you like to view your saved designs?')) {
      // Navigate to My Designs page
      router.push('/my-designs')
    }

  } catch (error) {
    console.error('❌ Failed to save design:', error)
    alert('Failed to save design. Please try again.')
  }
}

// Room size change handler
const handleRoomSizeChange = (newWidth, newHeight) => {
  roomWidth.value = newWidth
  roomHeight.value = newHeight

  // Update refs
  roomWidthRef.value = newWidth
  roomHeightRef.value = newHeight

  // Save the updated dimensions to localStorage using utility function
  saveRoomDimensionsToStorage(newWidth, newHeight)

  // Constrain objects and update scene
  const constrainedItems = constrainAllObjectsToRoom(items.value, newWidth, newHeight)
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

// 6. Update your Home.vue addItem function to handle product data:
const addItem = async (type, productData = null) => {
  console.log('addItem called with type:', type)
  hasUnsavedChanges.value = true
  const defaults = {
    height: 0,
    scale: getScaleForUnits(1.0, 'meters'),
    orientation: DEFAULT_ORIENTATION
  }

  // Extract SKU for real dimension lookup
  const sku = productData?.selectedVariant?.sku || null;

  console.log('productData.selectedVariant?.orientation>>>:::', productData.selectedVariant?.orientation);

  // ✅ CRITICAL: Get the correct orientation from productData
  const productOrientation = productData?.selectedVariant?.orientation || DEFAULT_ORIENTATION;

  // Find a free position on any wall
  const { position: freePosition, rotation: wallRotation } = findFreeWallPosition(
      roomWidth.value,
      roomHeight.value,
      type,
      defaults.scale,
      items.value,
      undefined, // No specific wall direction
      productOrientation,
      productData.selectedVariant?.movement
  )

  console.log('found free positioned on wall>>', freePosition, wallRotation);

  const newItem = {
    id: generateUniqueId(),
    type,
    position: [freePosition.x, freePosition.y, freePosition.z],
    rotation: wallRotation,
    scale: 1.0,
    // Add product data if available
    ...(productData && {
      sku,
      productName: productData.selectedVariant?.name,
      model: {
        name: `${ type }-${ productData.selectedVariant?.sku }`,
        path: productData.selectedVariant?.path,
        scale: 100,
        orientation: {
          type: productOrientation.type || 'face_into_room',
          wallBuffer: productOrientation.wallBuffer !== undefined ? productOrientation.wallBuffer : 0, // Flush with wall - no gap
          description: productOrientation.description || 'Item is part of wall opening',
          ...(productOrientation.rotationOffset && { rotationOffset: productOrientation.rotationOffset })
        },
        dimensions: productData.selectedVariant?.dimensions,
        ...(productData.selectedVariant?.movement && {
          movement: productData.selectedVariant?.movement
        }),
        floorOffset: productData.selectedVariant?.floorOffset || 0
      },
      price: productData.selectedVariant?.price,
      selectedColor: productData.selectedColor
    })
  }

  console.log('newItemToBeAdded>>>', newItem);

  // PERFORMANCE BOOST: Add directly to scene first (if not initial load)
  if (sceneManagerRef.value && !isInitialLoad.value) {
    try {
      await sceneManagerRef.value.addSingleItem(newItem)
      console.log(`✅ Added item ${ newItem.id } directly to scene`)
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

const deleteItem = (itemId) => {
  console.log('Deleting item with ID:', itemId)
  console.log('Current items:', items.value.map(item => ({ id: item.id, type: item.type })))

  // FOR IMMEDIATE PERFORMANCE BOOST: Remove single item from scene directly
  if (sceneManagerRef.value && !isInitialLoad.value) {
    try {
      sceneManagerRef.value.removeSingleItem(itemId)
      console.log(`✅ Removed item ${ itemId } directly from scene`)
    } catch (error) {
      console.error('❌ Failed to remove item directly, falling back to full update:', error)
    }
  }

  const newItems = items.value.filter(item => item.id !== itemId)

  console.log('Items after deletion:', newItems.map(item => ({ id: item.id, type: item.type })))

  items.value = newItems
  lastUpdateSource.value = 'delete'

  saveToHistory({
    items: newItems,
    roomWidth: roomWidth.value,
    roomHeight: roomHeight.value,
    currentFloorTexture: currentFloorTexture.value,
    currentWallTexture: currentWallTexture.value
  })
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
  const constrainedItems = constrainAllObjectsToRoom(items.value, roomWidth.value, roomHeight.value)
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

    console.log('Room dimensions loaded (CM):', {
      width: dimensions.width + 'cm',
      height: dimensions.height + 'cm'
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
  // Check if we need to load a specific design from MyDesigns page
  const wasDesignLoaded = checkForDesignToLoad()
  // If no design was loaded, load saved room dimensions as usual
  if (!wasDesignLoaded) {
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
      setItems, // Use our custom setItems function
      getItems, // Use our custom getItems function
      deleteItem,
      preventCollisionPlacement,
      saveToHistory,               // ADD THIS LINE
      currentFloorTexture,         // ADD THIS LINE
      currentWallTexture          // ADD THIS LINE
  ))

  // Set up initial scene
  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value)

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
  console.log('Starting model preloading...')

  if (CONFIG && CONFIG.preloadModels) {
    try {
      await preloadModels()
      console.log('Model preloading completed!')
      console.log('Cache status:', getModelCacheStatus())
    } catch (error) {
      console.error('Error during model preloading:', error)
    }
  }

  // Load initial items - NOW ASYNC
  try {
    await sceneManagerRef.value.updateBathroomItems(items.value)
  } catch (error) {
    console.error('Error loading initial items:', error)
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
watch([roomWidth, roomHeight, showGrid, showWallGrid], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value, showWallGrid.value)
})

// Watch for texture changes
watch([currentFloorTexture, currentWallTexture], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
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
