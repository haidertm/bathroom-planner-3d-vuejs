<template>
  <div :style="{ width: '98vw', height: '100vh', position: 'relative' }">
    <Toolbar @add="addItem" />
    <button @click="debugRadiatorIssue"
            style="position: fixed; top: 100px; right: 100px; z-index: 9999; background: red; color: white; padding: 10px;">
      Debug Radiator Issue
    </button>
    <button
        @click="diagnoseRadiatorModel"
        style="position: fixed; top: 220px; right: 100px; z-index: 9999; background: purple; color: white; padding: 10px; font-size: 12px;"
    >
      Diagnose Radiator
    </button>
    <TexturePanel
        v-if="showTexturePanel"
        @floor-change="handleFloorChange"
        @wall-change="handleWallChange"
        :current-floor="currentFloorTexture"
        :current-wall="currentWallTexture"
        @close="handleTextureClose"
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
import { ref, reactive, onMounted, onUnmounted, watch, computed, nextTick, markRaw, shallowRef } from 'vue'
import { preloadModels, getModelCacheStatus } from './models/bathroomFixtures'
import { constrainToRoom } from './utils/constraints'
import * as THREE from 'three';

// Components
import Toolbar from './components/ui/Toolbar.vue'
import TexturePanel from './components/ui/TexturePanel.vue'
import RoomSizePanel from './components/ui/RoomSizePanel.vue'
import UndoRedoPanel from './components/ui/UndoRedoPanel.vue'

// Constants
import { CONSTRAINTS, ROOM_DEFAULTS, MODEL_DIMENSIONS } from './constants/dimensions.js'
import { FLOOR_TEXTURES, WALL_TEXTURES, DEFAULT_FLOOR_TEXTURE, DEFAULT_WALL_TEXTURE } from './constants/textures.js'
import { COMPONENT_DEFAULTS } from './constants/components.js'

// Services
import { SceneManager } from './services/sceneManager.ts'
import { EventHandlers } from './services/eventHandlers.ts'

// Models
import { createModel } from './models/bathroomFixtures'

// Utils
import { constrainAllObjectsToRoom } from './utils/constraints.js'
import { isMobile } from './utils/helpers.ts'

// Composables
import { useUndoRedo } from './composables/useUndoRedo'

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

// Default objects to load on page start
const getDefaultItems = () => {
  return [
    {
      id: 1001,
      type: 'Shower',
      position: [-1.2, 0, -2.2], // Corner position
      rotation: 0,
      scale: 1.0
    },
    {
      id: 1003,
      type: 'Sink',
      position: [0, 0, -2.65], // Center against back wall
      rotation: 0,
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

const addItem = (type) => {
  const defaults = COMPONENT_DEFAULTS[type] || { height: 0, scale: 1.0 }

  // Generate initial random position
  const randomX = Math.random() * 2 - 1;
  const randomZ = Math.random() * 2 - 1;

  // FORCE constrain to room bounds
  const constrainedPosition = constrainToRoom(
      { x: randomX, y: defaults.height, z: randomZ },
      roomWidth.value,
      roomHeight.value,
      type,
      defaults.scale
  );

  const newItem = {
    id: generateUniqueId(),
    type,
    position: [constrainedPosition.x, constrainedPosition.y, constrainedPosition.z],
    rotation: 0,
    scale: defaults.scale
  }

  console.log('🔍 Adding item:', type, 'at CONSTRAINED position:', newItem.position, 'room size:', roomWidth.value, 'x', roomHeight.value)

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

const debugRadiatorIssue = () => {
  console.log('🔍 RADIATOR POSITIONING ANALYSIS');

  // Check current room size
  console.log('Current room size:', { width: roomWidth.value, height: roomHeight.value });

  // Check radiator model dimensions
  const radiatorDims = MODEL_DIMENSIONS.Radiator;
  console.log('Radiator model dimensions:', radiatorDims);

  // Check constraint bounds for radiator
  const radiatorBuffer = Math.max(radiatorDims.width, radiatorDims.depth) / 2;
  const constraintBounds = {
    minX: -((roomWidth.value / 2) - radiatorBuffer),
    maxX: (roomWidth.value / 2) - radiatorBuffer,
    minZ: -((roomHeight.value / 2) - radiatorBuffer),
    maxZ: (roomHeight.value / 2) - radiatorBuffer
  };

  // Check constraint bounds

  console.log('Constraint bounds:', constraintBounds);

  // Find radiator in items array
  const radiatorItem = items.value.find(item => item.type === 'Radiator');
  if (radiatorItem) {
    console.log('Radiator item data:', radiatorItem);

    // Check if position should be valid
    const shouldBeValid = {
      x: radiatorItem.position[0] >= constraintBounds.minX && radiatorItem.position[0] <= constraintBounds.maxX,
      z: radiatorItem.position[2] >= constraintBounds.minZ && radiatorItem.position[2] <= constraintBounds.maxZ
    };
    console.log('Should radiator be within bounds?', shouldBeValid);

    // Check actual Three.js scene object
    if (sceneManagerRef.value) {
      const bathroomGroup = sceneManagerRef.value.getBathroomItemsGroup();
      console.log('Bathroom group children:', bathroomGroup.children.map(c => ({
        type: c.userData.type,
        position: c.position
      })));

      const radiatorObject = bathroomGroup.children.find(child => child.userData.type === 'Radiator');
      if (radiatorObject) {
        console.log('Radiator Three.js object:');
        console.log('- Local position:', radiatorObject.position);
        console.log('- World position:', radiatorObject.getWorldPosition(new THREE.Vector3()));
        console.log('- Parent position:', radiatorObject.parent ? radiatorObject.parent.position : 'no parent');
        console.log('- Scale:', radiatorObject.scale);
        console.log('- Rotation:', radiatorObject.rotation);

        // Check bounding box
        const box = new THREE.Box3().setFromObject(radiatorObject);
        console.log('- Bounding box:', {
          min: box.min,
          max: box.max,
          center: box.getCenter(new THREE.Vector3()),
          size: box.getSize(new THREE.Vector3())
        });

        // Check if model has internal children with offsets
        console.log('- Children:', radiatorObject.children.map(child => ({
          type: child.type,
          position: child.position,
          name: child.name
        })));
      }
    }
  }
};

const diagnoseRadiatorModel = () => {
  console.log('🔍 RADIATOR MODEL DIAGNOSTIC');

  // Get the radiator from scene
  const bathroomGroup = sceneManagerRef.value.getBathroomItemsGroup();
  const radiatorObject = bathroomGroup.children.find(child => child.userData.type === 'Radiator');

  if (!radiatorObject) {
    console.log('❌ No radiator found in scene');
    return;
  }

  // Get the actual bounding box of the GLB model
  const box = new THREE.Box3().setFromObject(radiatorObject);
  const size = box.getSize(new THREE.Vector3());

  console.log('📏 ACTUAL GLB MODEL DIMENSIONS:');
  console.log(`Width: ${ size.x.toFixed(3) } units`);
  console.log(`Depth: ${ size.z.toFixed(3) } units`);
  console.log(`Height: ${ size.y.toFixed(3) } units`);

  // Compare with current MODEL_DIMENSIONS
  const currentDims = MODEL_DIMENSIONS.Radiator;
  console.log('📋 CURRENT MODEL_DIMENSIONS.Radiator:');
  console.log(`Width: ${ currentDims.width }, Depth: ${ currentDims.depth }`);

  // Calculate corrected dimensions
  const correctedDims = {
    width: Math.ceil(size.x * 10) / 10,
    depth: Math.ceil(size.z * 10) / 10,
    height: Math.ceil(size.y * 10) / 10
  };

  console.log('🔧 CORRECTED DIMENSIONS TO USE:');
  console.log(`Radiator: { width: ${ correctedDims.width }, depth: ${ correctedDims.depth }, height: ${ correctedDims.height } }`);

  return correctedDims;
};

</script>

<style scoped>
/* Add any component-specific styles here */
</style>
