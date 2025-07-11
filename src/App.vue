<template>
  <div :style="{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }">
    <Header
        logo="/src/assets/logo.svg"
        backgroundColor="#fff"
        logoHeight="45px"
    />
    <sidebar
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
        :can-undo="canUndo"
        :can-redo="canRedo"
    />

    <!-- Canvas container positioned on the right side -->
    <div
        ref="mountRef"
        :style="canvasContainerStyle"
    />

    <div :style="helpTextStyle">
      <div v-if="isMobileDevice">
        <div>Touch + drag: Move objects along walls</div>
        <div>Two finger pinch: Zoom</div>
        <div>Double tap: Delete selected object</div>
        <div>Objects spawn on any wall with collision detection</div>
      </div>
      <div v-else>
        <div>Left click + drag: Move along walls | Right click + drag: Rotate | Ctrl + drag: Height | Alt + drag: Scale</div>
        <div>Left click empty space: Rotate camera | Wheel: Zoom | DELETE key: Delete selected object</div>
        <div>Objects spawn randomly on any wall and automatically avoid collisions</div>
        <div :style="{ fontSize: '10px', marginTop: '2px', opacity: '0.8' }">
          Smart wall hiding enabled • Walls auto-hide for clear view • Toggle in room settings
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
      id: 1001,
      type: 'Shower',
      position: [-2.5, 0, -2.5], // Northwest corner
      rotation: 0, // Facing south (into room)
      scale: 1.0
    },
    {
      id: 1003,
      type: 'Sink',
      position: [1.5, 0, 2.5], // South wall
      rotation: Math.PI, // Facing north (into room)
      scale: 1.0
    }
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
  bottom: '10px',
  right: '10px', // Changed from left to right
  color: 'white',
  background: 'rgba(0,0,0,0.5)',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: isMobileDevice.value ? '10px' : '12px',
  maxWidth: isMobileDevice.value ? '280px' : '320px',
  lineHeight: '1.2'
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

</script>

<style scoped>
/* Add any component-specific styles here */
</style>