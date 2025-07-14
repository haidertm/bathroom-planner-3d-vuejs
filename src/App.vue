<template>
  <div :style="{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }">
    <Header
        logo="./assets/logo.svg"
        backgroundColor="#fff"
        logoHeight="45px"
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
        :wall-culling-enabled="wallCullingEnabled"
        @room-size-change="handleRoomSizeChange"
        @toggle-grid="setShowGrid"
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
        @undo="handleUndo"
        @redo="handleRedo"
        @clear="handleClearAll"
        :can-undo="canUndo"
        :can-redo="canRedo"
    />

    <!-- Canvas container positioned on the right side -->
    <div
        ref="mountRef"
        :style="canvasContainerStyle"
    />

    <div :style="helpTextStyle">
      <!-- Read Instructions Button -->
      <button
          @click="showInstructions = true"
          :style="readInstructionsButtonStyle"
      >
        <span>📖</span>
        <span>Read Instructions</span>
      </button>
    </div>

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
        <h2 :style="{ marginTop: '0', marginBottom: '20px', color: '#333', fontSize: '24px' }">
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
              <p><strong>Alt + drag:</strong> Scale objects</p>
              <p><strong>Left click empty space:</strong> Rotate camera view</p>
              <p><strong>Mouse wheel:</strong> Zoom in/out</p>
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
import { preloadModels, getModelCacheStatus } from './models/bathroomFixtures'
import * as THREE from "three";

// Components
import Toolbar from './components/ui/Toolbar.vue'
import TexturePanel from './components/ui/TexturePanel.vue'
import RoomSizePanel from './components/ui/RoomSizePanel.vue'
import UndoRedoPanel from './components/ui/UndoRedoPanel.vue'

// Constants
import { CONSTRAINTS, ROOM_DEFAULTS } from './constants/dimensions.js'
import { FLOOR_TEXTURES, WALL_TEXTURES, DEFAULT_FLOOR_TEXTURE, DEFAULT_WALL_TEXTURE } from './constants/textures.js'
import { COMPONENT_DEFAULTS } from './constants/components.js'

// Services
import { SceneManager } from './services/sceneManager.js'
import { EventHandlers } from './services/eventHandlers.js'

// Models
import { createModel } from './models/bathroomFixtures.ts'

// Utils - Updated imports to include collision detection
import { constrainAllObjectsToRoom, findFreeWallPosition, constrainToWalls } from './utils/constraints.js'
import { isMobile } from './utils/helpers.ts'

// Composables
import { useUndoRedo } from './composables/useUndoRedo.js'
import Sidebar from "./components/ui/sidebar.vue";
import Header from "./components/ui/Header.vue";

// Refs - Use shallowRef for Three.js objects to prevent reactivity issues
const mountRef = ref(null)
const sceneManagerRef = shallowRef(null)
const eventHandlersRef = shallowRef(null)
const roomWidthRef = ref(ROOM_DEFAULTS.WIDTH)
const roomHeightRef = ref(ROOM_DEFAULTS.HEIGHT)

// ID counter to ensure unique IDs
const nextIdRef = ref(2000)

// Generate unique ID function
const generateUniqueId = () => {
  return nextIdRef.value++
}

// Default objects to load on page start - Properly oriented to face INTO room
const getDefaultItems = () => {
  return [
    {
      id: 1003,
      type: 'Door',
      position: [0, 0, -2.95], // South wall
      rotation: - Math.PI / 2, // Facing north (into room)
      scale: 1.0
    },
    // {
    //   name: 'Door',
    //   path: '/models/door.glb',
    //   scale: 1.4,
    //   orientation: {
    //     type: 'flush_with_wall',
    //     wallBuffer: 0.045, // Flush with wall - no gap
    //     description: 'Door is part of wall opening'
    //   },
    //   fallbackColor: 0x8B4513,
    //   fallbackGeometry: 'box',
    //   fallbackSize: [0.1, 2.0, 0.8]
    // }
  ]
}

// Reactive state
const showTexturePanel = ref(true)
const items = ref(getDefaultItems())
const currentFloorTexture = ref(DEFAULT_FLOOR_TEXTURE)
const currentWallTexture = ref(DEFAULT_WALL_TEXTURE)
const roomWidth = ref(ROOM_DEFAULTS.WIDTH)
const roomHeight = ref(ROOM_DEFAULTS.HEIGHT)
const showGrid = ref(false)
const wallCullingEnabled = ref(true)
const showInstructions = ref(false)

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
    width: `calc(100vw - ${sidebarWidth})`,
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

// NEW: Canvas container style that positions it on the right side
const helpTextStyle = computed(() => ({
  position: 'absolute',
  bottom: '30px',
  right: '10px', // Changed from left to right
  color: 'white',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: isMobileDevice.value ? '16px' : '20px',
  maxWidth: isMobileDevice.value ? '280px' : '320px',
  lineHeight: '1.2'
}))

const readInstructionsButtonStyle = computed(() => ({
  marginTop: '10px',
  padding: '8px 16px',
  backgroundColor: 'rgba(59, 130, 246, 0.9)', // Blue background
  color: '#ffffff',
  border: '1px solid rgba(59, 130, 246, 0.8)',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: 'fit-content',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    backgroundColor: 'rgba(37, 99, 235, 0.95)',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
  }
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
  top: isMobileDevice.value ? '15px' : '0',
  right: isMobileDevice.value ? '15px' : '0',
  paddingRight: isMobileDevice.value ? '0' : '1px',
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
  marginBottom: '25px',
  paddingBottom: '15px',
  borderBottom: '1px solid #f0f0f0'
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

// Room size change handler
const handleRoomSizeChange = (newWidth, newHeight) => {
  roomWidth.value = newWidth
  roomHeight.value = newHeight

  const constrainedItems = constrainAllObjectsToRoom(items.value, newWidth, newHeight)
  items.value = constrainedItems
  lastUpdateSource.value = 'roomSize'

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

// Updated addItem function with collision-aware wall positioning and proper rotation
const addItem = (type) => {
  const defaults = COMPONENT_DEFAULTS[type] || { height: 0, scale: 1.0 }

  // Find a free position on any wall that doesn't collide with existing objects
  const { position: freePosition, rotation: wallRotation } = findFreeWallPosition(
      roomWidth.value,
      roomHeight.value,
      type,
      defaults.scale,
      items.value // Pass existing items for collision detection
  )

  const newItem = {
    id: generateUniqueId(),
    type,
    position: [freePosition.x, freePosition.y, freePosition.z],
    rotation: wallRotation, // Use the wall-appropriate rotation
    scale: defaults.scale
  }

  console.log('🏠 Adding item:', type, 'at WALL position:', {
    position: newItem.position,
    rotation: `${(wallRotation * 180 / Math.PI).toFixed(0)}°`,
    orientation: 'configured per object type',
    roomSize: `${roomWidth.value} x ${roomHeight.value}`
  })

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

// Initialize scene
onMounted(async () => {
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
      deleteItem
  ))

  // Set up initial scene
  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value)

  // Set initial wall culling state
  sceneManagerRef.value.setWallCullingEnabled(wallCullingEnabled.value)

  // Add canvas to DOM
  if (mountRef.value instanceof HTMLElement && renderer.domElement) {
    mountRef.value.appendChild(renderer.domElement)
  }

  // Add event listeners
  eventHandlersRef.value.addEventListeners()

  // Start animation loop
  sceneManagerRef.value.startAnimationLoop()

  // PRELOAD MODELS - This will load all models defined in constants
  console.log('Starting model preloading...')
  try {
    await preloadModels()
    console.log('Model preloading completed!')
    console.log('Cache status:', getModelCacheStatus())
  } catch (error) {
    console.error('Error during model preloading:', error)
  }

  // Load initial items - NOW ASYNC
  try {
    await sceneManagerRef.value.updateBathroomItems(items.value)
  } catch (error) {
    console.error('Error loading initial items:', error)
  }
})

// Watch for room geometry changes
watch([roomWidth, roomHeight, showGrid], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value)
})

// Watch for texture changes
watch([currentFloorTexture, currentWallTexture], () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
})

// MODIFIED: Only update scene for non-drag operations
watch([items, lastUpdateSource], ([newItems, updateSource]) => {
  if (!sceneManagerRef.value) return

  // Only update scene for specific operations, NOT for drag operations
  if (updateSource !== 'drag') {
    console.log(`Updating scene for ${ updateSource } operation:`, newItems.length, 'items')
    sceneManagerRef.value.updateBathroomItems(newItems, createModel)
  }
}, { deep: true })

// Cleanup
onUnmounted(() => {
  if (eventHandlersRef.value) {
    eventHandlersRef.value.removeEventListeners()
  }

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

const handleClearAll = () => {
  // Clear all items
  const clearedItems = []

  items.value = clearedItems
  lastUpdateSource.value = 'clear'

  // Save to history for undo capability
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
