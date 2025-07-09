<template>
  <div :style="{ width: '98vw', height: '100vh', position: 'relative' }">

    <sidebar
        @add="addItem"
        @floor-change="handleFloorChange"
        @wall-change="handleWallChange"
        :currentFloor="currentFloorTexture"
        :currentWall="currentWallTexture"
    />
    <RoomSizePanel
        @room-size-change="handleRoomSizeChange"
        :room-width="roomWidth"
        :room-height="roomHeight"
        :show-grid="showGrid"
        @toggle-grid="setShowGrid"
        @constrain-objects="constrainObjects"
        :wall-culling-enabled="wallCullingEnabled"
        @toggle-wall-culling="handleWallCullingToggle"
    />
    <UndoRedoPanel
        @undo="handleUndo"
        @redo="handleRedo"
        :can-undo="canUndo"
        :can-redo="canRedo"
    />
    <div
        ref="mountRef"
        :style="{
        width: '100%',
        height: '100%',
        cursor: 'grab'
      }"
    />
    <div :style="helpTextStyle">
      <div v-if="isMobileDevice">
        <div>Touch + drag: Move objects</div>
        <div>Two finger pinch: Zoom</div>
        <div>Walls auto-hide for clear interior view</div>
      </div>
      <div v-else>
        <div>Left click + drag: Move | Right click + drag: Rotate | Ctrl + drag: Height | Alt + drag: Scale</div>
        <div>Left click empty space: Rotate camera | Wheel: Zoom | DELETE key: Delete selected object</div>
        <div>Undo/Redo: Top right buttons</div>
        <div :style="{ fontSize: '10px', marginTop: '2px', opacity: '0.8' }">
          Smart wall hiding enabled • Walls auto-hide for clear view • Toggle in room settings
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick, shallowRef } from 'vue'
import { markRaw } from 'vue'
// Components
import Toolbar from './components/ui/Toolbar.vue'
import TexturePanel from './components/ui/TexturePanel.vue'
import RoomSizePanel from './components/ui/RoomSizePanel.vue'
import UndoRedoPanel from './components/ui/UndoRedoPanel.vue'

// Constants
import { ROOM_DEFAULTS } from './constants/dimensions.js'
import { FLOOR_TEXTURES, WALL_TEXTURES, DEFAULT_FLOOR_TEXTURE, DEFAULT_WALL_TEXTURE } from './constants/textures.js'
import { COMPONENT_DEFAULTS } from './constants/components.js'

// Services
import { SceneManager } from './services/sceneManager.js'
import { EventHandlers } from './services/eventHandlers.js'

// Models
import { createModel } from './models/bathroomFixtures.js'

// Utils
import { constrainAllObjectsToRoom } from './utils/constraints.js'
import { isMobile } from './utils/helpers.js'

// Composables
import { useUndoRedo } from './composables/useUndoRedo.js'
import Sidebar from "./components/ui/sidebar.vue";

// Refs
const mountRef = ref(null)
const sceneManagerRef = shallowRef(null)
const sceneManager = markRaw(new SceneManager())
const eventHandlersRef = ref(null)
const roomWidthRef = ref(ROOM_DEFAULTS.WIDTH)
const roomHeightRef = ref(ROOM_DEFAULTS.HEIGHT)

// ID counter to ensure unique IDs
const nextIdRef = ref(2000)

// Generate unique ID function
const generateUniqueId = () => {
  return nextIdRef.value++
}

// Default objects to load on page start
const getDefaultItems = () => {
  return [
    {
      id: 1001,
      type: "Shower",
      position: [-1.2, 0, -2.2], // Corner position
      rotation: 0,
      scale: 1.0
    },
    {
      id: 1003,
      type: "Sink",
      position: [0, 0, -2.65], // Center against back wall
      rotation: 0,
      scale: 1.0
    }
  ]
}

// Reactive state
const items = ref(getDefaultItems())
const currentFloorTexture = ref(DEFAULT_FLOOR_TEXTURE)
const currentWallTexture = ref(DEFAULT_WALL_TEXTURE)
const roomWidth = ref(ROOM_DEFAULTS.WIDTH)
const roomHeight = ref(ROOM_DEFAULTS.HEIGHT)
const showGrid = ref(false)
const wallCullingEnabled = ref(true)

// Composables
const { saveToHistory, undo, redo, canUndo, canRedo } = useUndoRedo()

// Computed
const isMobileDevice = computed(() => isMobile())

const helpTextStyle = computed(() => ({
  position: 'absolute',
  bottom: '10px',
  left: '10px',
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

const addItem = (type) => {
  const defaults = COMPONENT_DEFAULTS[type] || { height: 0, scale: 1.0 }
  const newItem = {
    id: generateUniqueId(),
    type,
    position: [Math.random() * 4 - 2, defaults.height, Math.random() * 4 - 2],
    rotation: 0,
    scale: defaults.scale
  }

  console.log('newItem >>>', newItem)

  const newItems = [...items.value, newItem]
  items.value = newItems
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

const setShowGrid = (value) => {
  showGrid.value = value
}

const constrainObjects = () => {
  const constrainedItems = constrainAllObjectsToRoom(items.value, roomWidth.value, roomHeight.value)
  items.value = constrainedItems
}

// Initialize scene
onMounted(() => {
  // Initialize scene manager
  sceneManagerRef.value = sceneManager
  const { scene, camera, renderer } = sceneManagerRef.value.initializeScene()

  // Initialize event handlers
  eventHandlersRef.value = new EventHandlers(
      scene,
      camera,
      renderer,
      roomWidthRef,
      roomHeightRef,
      (newItems) => { items.value = newItems },
      deleteItem
  )

  // Set up initial scene
  sceneManagerRef.value.updateFloor(roomWidth.value, roomHeight.value, FLOOR_TEXTURES[currentFloorTexture.value])
  sceneManagerRef.value.updateWalls(roomWidth.value, roomHeight.value, WALL_TEXTURES[currentWallTexture.value])
  sceneManagerRef.value.updateGrid(roomWidth.value, roomHeight.value, showGrid.value)

  // Set initial wall culling state
  sceneManagerRef.value.setWallCullingEnabled(wallCullingEnabled.value)

  // Add canvas to DOM
  mountRef.value.appendChild(renderer.domElement)

  // Add event listeners
  eventHandlersRef.value.addEventListeners()

  // Start animation loop
  sceneManagerRef.value.startAnimationLoop()
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

// Watch for items changes
watch(items, () => {
  if (!sceneManagerRef.value) return

  sceneManagerRef.value.updateBathroomItems(items.value, createModel)
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
