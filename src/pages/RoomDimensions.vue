<template>
  <div class="room-customizer">
    <div class="container">
      <div class="content-wrapper">
        <div class="left-panel">
          <h1 class="title">Add your bathroom's dimensions.</h1>
          <p class="subtitle">
            Drag the room to move it around. Use the green icons on the room edges to resize, or click the dimension
            numbers to enter precise measurements.
          </p>
        </div>

        <div class="right-panel">
          <div class="canvas-container" ref="canvasContainer">
            <canvas
                ref="canvas"
                @mousedown="handleCanvasMouseDown"
                @mousemove="handleCanvasMouseMove"
                @mouseup="handleCanvasMouseUp"
                @mouseleave="handleCanvasMouseLeave"
                @mouseenter="handleCanvasMouseEnter"
                @wheel="handleCanvasWheel"
                @touchstart="handleCanvasTouchStart"
                @touchmove="handleCanvasTouchMove"
                @touchend="handleCanvasTouchEnd"
            ></canvas>

            <!-- Dimension Input Overlays -->
            <div
                v-for="input in dimensionInputs"
                :key="input.id"
                v-show="shouldShowLabel(input.id)"
                class="dimension-input-overlay"
                :style="input.style"
                @click="input.onClick"
            >
              <input
                  v-if="input.editing"
                  :ref="el => setInputRef(el, input.id)"
                  v-model.number="input.tempValue"
                  type="number"
                  class="dimension-field"
                  :class="{ 'has-changes': input.tempValue !== input.originalValue }"
                  @input="handleInputChange(input)"
                  @blur="finishEditing(input)"
                  @keyup.enter="finishEditing(input)"
                  @keyup.escape="cancelEditing(input)"
                  :min="input.min"
                  :max="input.max"
              />
              <div v-else class="dimension-display"
                   :class="{ 'has-pending-changes': hasPendingChanges(input) }"
                   @click="startEditing(input)">
                {{ input.value }}{{ input.unit }}
                <span v-if="hasPendingChanges(input)" class="pending-indicator">*</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <!-- Updated to use applyAndContinue method -->
        <button class="update-btn" @click="applyAndContinue">
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick} from 'vue'

// Import the utility functions
import { loadRoomDimensionsFromStorage, saveRoomDimensionsToStorage, getShapeDefaultDimensions } from '../constants/dimensions'
import {useRouter} from 'vue-router'
import {isMobile} from "../utils/helpers.js"
import {ROOM_DEFAULTS} from '../constants/dimensions.js';

// Router
const router = useRouter()

// Template refs
const canvas = ref(null)
const canvasContainer = ref(null)

// FIXED: Create a Map to store dynamic input refs
const inputRefs = new Map()

// FIXED: Function to set input refs dynamically
const setInputRef = (el, inputId) => {
  if (el) {
    inputRefs.set(inputId, el)
  } else {
    inputRefs.delete(inputId)
  }
}

// Reactive data
const roomDimensions = reactive({width: 300, height: 250, notchWidth: 0, notchHeight: 0})
const pendingDimensions = reactive({width: null, height: null, notchWidth: null, notchHeight: null})
const canvasWidth = ref(600)
const canvasHeight = ref(500)
const scale = ref(1)
const zoomLevel = ref(isMobile() ? 0.5 : 1)

// Canvas drawing
const ctx = ref(null)

// Interaction
const isDragging = ref(null)
const dragStartPos = reactive({x: 0, y: 0})
const dragStartDimensions = reactive({width: 0, height: 0, notchWidth: 0, notchHeight: 0})
const dragStartRoomCenter = reactive({x: 0, y: 0})
const hoveredHandle = ref(null)
const hoveredRoom = ref(false)

// Room positioning
const roomCenter = reactive({x: 400, y: 250})

// Handle definitions
const handles = ref([])

// Dimension inputs
const dimensionInputs = ref([])
const editingInput = ref(null)

// Animation
const animationId = ref(null)
const dragAnimationId = ref(null)
const lastDragTime = ref(0)
const dragThrottleMs = ref(16) // ~60fps

// Computed properties
const isLShape = computed(() => {
  return roomDimensions.notchWidth > 0 && roomDimensions.notchHeight > 0
})

const effectiveScale = computed(() => {
  return scale.value * zoomLevel.value
})

const roomPixelWidth = computed(() => {
  return roomDimensions.width * effectiveScale.value
})

const roomPixelHeight = computed(() => {
  return roomDimensions.height * effectiveScale.value
})

const notchPixelWidth = computed(() => {
  return roomDimensions.notchWidth * effectiveScale.value
})

const notchPixelHeight = computed(() => {
  return roomDimensions.notchHeight * effectiveScale.value
})

const roomBounds = computed(() => {
  return {
    left: roomCenter.x - roomPixelWidth.value / 2,
    top: roomCenter.y - roomPixelHeight.value / 2,
    right: roomCenter.x + roomPixelWidth.value / 2,
    bottom: roomCenter.y + roomPixelHeight.value / 2
  }
})

const hasAnyPendingChanges = computed(() => {
  return pendingDimensions.width !== null || pendingDimensions.height !== null
})

// Methods
const goToPlanner = () => {
  // Save room dimensions to localStorage using utility function
  // Include notch dimensions if they exist (for L-shaped rooms)
  saveRoomDimensionsToStorage(
    roomDimensions.width,
    roomDimensions.height,
    roomDimensions.notchWidth,
    roomDimensions.notchHeight
  )

  // Navigate to planner
  router.push('/planner')
}

const applyAndContinue = () => {
  // Then navigate with the final dimensions
  goToPlanner()
}

const initCanvas = () => {
  const canvasEl = canvas.value
  const container = canvasContainer.value

  // Set canvas size
  canvasWidth.value = container.offsetWidth
  canvasHeight.value = container.offsetHeight

  canvasEl.width = canvasWidth.value
  canvasEl.height = canvasHeight.value

  ctx.value = canvasEl.getContext('2d')
  ctx.value.imageSmoothingEnabled = true

  // Center the room initially
  roomCenter.x = canvasWidth.value / 2
  roomCenter.y = canvasHeight.value / 2
}

const handleResize = () => {
  initCanvas()
  updateHandles()
  updateDimensionInputs()
}

const updateHandles = () => {
  const bounds = roomBounds.value

  // For L-shape, position top and left handles differently
  const topHandleX = isLShape.value
    ? bounds.left + (notchPixelWidth.value + roomPixelWidth.value) / 2
    : bounds.left + roomPixelWidth.value / 2

  const leftHandleY = isLShape.value
    ? bounds.top + (notchPixelHeight.value + roomPixelHeight.value) / 2
    : bounds.top + roomPixelHeight.value / 2

  const baseHandles = [
    // Only edge handles (green resize icons)
    {id: 'top', x: topHandleX, y: bounds.top, type: 'edge', cursor: 'ns-resize'},
    {id: 'right', x: bounds.right, y: bounds.top + roomPixelHeight.value / 2, type: 'edge', cursor: 'ew-resize'},
    {id: 'bottom', x: bounds.left + roomPixelWidth.value / 2, y: bounds.bottom, type: 'edge', cursor: 'ns-resize'},
    {id: 'left', x: bounds.left, y: leftHandleY, type: 'edge', cursor: 'ew-resize'}
  ]

  // Add notch handles for L-shape
  if (isLShape.value) {
    const notchHandles = [
      // Handle for notch width (vertical edge of notch)
      {
        id: 'notch-width',
        x: bounds.left + notchPixelWidth.value,
        y: bounds.top + notchPixelHeight.value / 2,
        type: 'notch',
        cursor: 'ew-resize'
      },
      // Handle for notch height (horizontal edge of notch)
      {
        id: 'notch-height',
        x: bounds.left + notchPixelWidth.value / 2,
        y: bounds.top + notchPixelHeight.value,
        type: 'notch',
        cursor: 'ns-resize'
      }
    ]
    handles.value = [...baseHandles, ...notchHandles]
  } else {
    handles.value = baseHandles
  }
}

const updateDimensionInputs = () => {
  const bounds = roomBounds.value

  // For L-shape, position top and left labels differently
  const topLabelX = isLShape.value
    ? bounds.left + (notchPixelWidth.value + roomPixelWidth.value) / 2 - 40
    : bounds.left + roomPixelWidth.value / 2 - 40

  const leftLabelY = isLShape.value
    ? bounds.top + (notchPixelHeight.value + roomPixelHeight.value) / 2 - 12.5
    : bounds.top + roomPixelHeight.value / 2 - 12.5

  // Calculate actual wall dimensions for L-shape
  const topWallWidth = isLShape.value ? roomDimensions.width - roomDimensions.notchWidth : roomDimensions.width
  const bottomWallWidth = roomDimensions.width
  const leftWallHeight = isLShape.value ? roomDimensions.height - roomDimensions.notchHeight : roomDimensions.height
  const rightWallHeight = roomDimensions.height

  const baseInputs = [
    // Top (reduced width if L-shape)
    {
      id: 'width-top',
      value: topWallWidth,
      tempValue: pendingDimensions.width || topWallWidth,
      originalValue: topWallWidth,
      unit: 'cm',
      min: ROOM_DEFAULTS.MIN_SIZE,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: topLabelX + 'px',
        top: (bounds.top - 35) + 'px',
        width: '80px',
        height: '25px'
      },
      onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'width-top'))
    },

    // Bottom (full width)
    {
      id: 'width-bottom',
      value: bottomWallWidth,
      tempValue: pendingDimensions.width || bottomWallWidth,
      originalValue: bottomWallWidth,
      unit: 'cm',
      min: ROOM_DEFAULTS.MIN_SIZE,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: (bounds.left + roomPixelWidth.value / 2 - 40) + 'px',
        top: (bounds.bottom + 15) + 'px',
        width: '80px',
        height: '25px'
      },
      onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'width-bottom'))
    },

    // Left (reduced height if L-shape)
    {
      id: 'height-left',
      value: leftWallHeight,
      tempValue: pendingDimensions.height || leftWallHeight,
      originalValue: leftWallHeight,
      unit: 'cm',
      min: ROOM_DEFAULTS.MIN_SIZE,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: (bounds.left - 90) + 'px',
        top: leftLabelY + 'px',
        width: '80px',
        height: '25px'
      },
      onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'height-left'))
    },

    // Right (full height)
    {
      id: 'height-right',
      value: rightWallHeight,
      tempValue: pendingDimensions.height || rightWallHeight,
      originalValue: rightWallHeight,
      unit: 'cm',
      min: ROOM_DEFAULTS.MIN_SIZE,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: (bounds.right + 10) + 'px',
        top: (bounds.top + roomPixelHeight.value / 2 - 12.5) + 'px',
        width: '80px',
        height: '25px'
      },
      onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'height-right'))
    }
  ]

  // Add notch dimension inputs for L-shape
  if (isLShape.value) {
    const notchInputs = [
      // Notch width input - positioned near the horizontal notch-south wall
      // (near notch-height green dot, since that wall's length = notchWidth)
      {
        id: 'notch-width',
        value: roomDimensions.notchWidth,
        tempValue: pendingDimensions.notchWidth || roomDimensions.notchWidth,
        originalValue: roomDimensions.notchWidth,
        unit: 'cm',
        min: 50,
        max: Math.min(ROOM_DEFAULTS.MAX_SIZE, roomDimensions.width - 50),
        editing: false,
        style: {
          position: 'absolute',
          // Horizontally centered with the horizontal notch wall (notch-height handle position)
          left: (bounds.left + notchPixelWidth.value / 2 - 40) + 'px',
          // Position below the horizontal notch wall
          top: (bounds.top + notchPixelHeight.value + 10) + 'px',
          width: '80px',
          height: '25px'
        },
        onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'notch-width'))
      },

      // Notch height input - positioned near the vertical notch-east wall
      // (near notch-width green dot, since that wall's length = notchHeight)
      {
        id: 'notch-height',
        value: roomDimensions.notchHeight,
        tempValue: pendingDimensions.notchHeight || roomDimensions.notchHeight,
        originalValue: roomDimensions.notchHeight,
        unit: 'cm',
        min: 50,
        max: Math.min(ROOM_DEFAULTS.MAX_SIZE, roomDimensions.height - 50),
        editing: false,
        style: {
          position: 'absolute',
          // Position to the right of the vertical notch wall (notch-width handle position)
          left: (bounds.left + notchPixelWidth.value + 10) + 'px',
          // Vertically centered with the vertical notch wall
          top: (bounds.top + notchPixelHeight.value / 2 - 12.5) + 'px',
          width: '80px',
          height: '25px'
        },
        onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'notch-height'))
      }
    ]
    dimensionInputs.value = [...baseInputs, ...notchInputs]
  } else {
    dimensionInputs.value = baseInputs
  }
}

const startEditing = (input) => {
  if (editingInput.value) {
    finishEditing(editingInput.value)
  }

  input.editing = true
  input.tempValue = input.value // Reset temp value to current value
  editingInput.value = input

  // FIXED: Use nextTick with proper ref access
  nextTick(() => {
    const inputEl = inputRefs.get(input.id)

    if (inputEl) {
      try {
        inputEl.focus()
      } catch (error) {
        console.error('Error focusing input:', error)
      }
    } else {
      console.warn('Input element not found for ID:', input.id)
      // Fallback: try again after a short delay
      setTimeout(() => {
        const retryInputEl = inputRefs.get(input.id)
        if (retryInputEl) {
          retryInputEl.focus()
          retryInputEl.select()
        }
      }, 100)
    }
  })
}

// Handle input changes to show pending changes and apply button
const handleInputChange = (input) => {
  // Set pending dimensions when user types to show the apply changes button
  const validatedValue = Math.max(input.min, Math.min(input.max, input.tempValue))

  if (input.id === 'notch-width') {
    pendingDimensions.notchWidth = validatedValue
  } else if (input.id === 'notch-height') {
    pendingDimensions.notchHeight = validatedValue
  } else if (input.id.includes('width')) {
    pendingDimensions.width = validatedValue
  } else {
    pendingDimensions.height = validatedValue
  }
}

const finishEditing = (input) => {

  // Validate and constrain the temp value
  const validatedValue = Math.max(input.min, Math.min(input.max, input.tempValue))
  input.tempValue = validatedValue

  // Apply changes immediately when user clicks outside (blur event)
  if (input.id === 'notch-width') {
    roomDimensions.notchWidth = validatedValue
    pendingDimensions.notchWidth = null
  } else if (input.id === 'notch-height') {
    roomDimensions.notchHeight = validatedValue
    pendingDimensions.notchHeight = null
  } else if (input.id.includes('width')) {
    roomDimensions.width = validatedValue
    pendingDimensions.width = null // Clear pending changes to hide apply button
  } else {
    roomDimensions.height = validatedValue
    pendingDimensions.height = null // Clear pending changes to hide apply button
  }

  input.editing = false
  editingInput.value = null

  // Clean up the ref
  inputRefs.delete(input.id)
}

const cancelEditing = (input) => {
  input.editing = false
  editingInput.value = null
  // Reset temp value to current actual value
  input.tempValue = input.value

  // Clear pending changes to hide apply button when canceling
  if (input.id === 'notch-width') {
    pendingDimensions.notchWidth = null
  } else if (input.id === 'notch-height') {
    pendingDimensions.notchHeight = null
  } else if (input.id.includes('width')) {
    pendingDimensions.width = null
  } else {
    pendingDimensions.height = null
  }

  // Clean up the ref
  inputRefs.delete(input.id)
}

const hasPendingChanges = (input) => {
  if (input.id === 'notch-width') {
    return pendingDimensions.notchWidth !== null && pendingDimensions.notchWidth !== roomDimensions.notchWidth
  } else if (input.id === 'notch-height') {
    return pendingDimensions.notchHeight !== null && pendingDimensions.notchHeight !== roomDimensions.notchHeight
  } else if (input.id.includes('width')) {
    return pendingDimensions.width !== null && pendingDimensions.width !== roomDimensions.width
  } else {
    return pendingDimensions.height !== null && pendingDimensions.height !== roomDimensions.height
  }
}

// Determine which labels should be visible during dragging
const shouldShowLabel = (inputId) => {
  // If not dragging or moving room, show all labels
  if (!isDragging.value || isDragging.value === 'room-move') {
    return true
  }

  // Map of which handle affects which labels
  const affectedLabels = {
    // Dragging top/bottom changes height → show height labels
    'top': ['height-left', 'height-right'],
    'bottom': ['height-left', 'height-right'],
    // Dragging left/right changes width → show width labels
    'left': ['width-top', 'width-bottom'],
    'right': ['width-top', 'width-bottom'],
    // Dragging notch-width changes notchWidth → affects notch-width and width-top (topWallWidth = width - notchWidth)
    'notch-width': ['notch-width', 'width-top'],
    // Dragging notch-height changes notchHeight → affects notch-height and height-left (leftWallHeight = height - notchHeight)
    'notch-height': ['notch-height', 'height-left']
  }

  const labelsToShow = affectedLabels[isDragging.value]
  return labelsToShow ? labelsToShow.includes(inputId) : true
}

const cancelAllPendingChanges = () => {
  pendingDimensions.width = null
  pendingDimensions.height = null
  // Update temp values in inputs to reflect the cancellation
  updateDimensionInputs()
}

const getMousePos = (e) => {
  const canvasEl = canvas.value
  if (!canvasEl) return {x: 0, y: 0}

  const rect = canvasEl.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const getGlobalMousePos = (e) => {
  // This works even when mouse is outside canvas
  const canvasEl = canvas.value
  if (!canvasEl) return {x: 0, y: 0}

  const rect = canvasEl.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const getTouchPos = (e) => {
  const canvasEl = canvas.value
  if (!canvasEl) return {x: 0, y: 0}

  const rect = canvasEl.getBoundingClientRect()
  const touch = e.touches[0] || e.changedTouches[0]
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  }
}

const getGlobalTouchPos = (e) => {
  // This works even when touch is outside canvas
  const canvasEl = canvas.value
  if (!canvasEl) return {x: 0, y: 0}

  const rect = canvasEl.getBoundingClientRect()
  const touch = e.touches[0] || e.changedTouches[0]
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  }
}

const getHandleAt = (pos) => {
  const handleRadius = 8 // Increased to match the larger green handles
  return handles.value.find(handle => {
    const dx = pos.x - handle.x
    const dy = pos.y - handle.y
    return Math.sqrt(dx * dx + dy * dy) <= handleRadius
  })
}

const isInsideRoom = (pos) => {
  const bounds = roomBounds.value
  return pos.x >= bounds.left && pos.x <= bounds.right && pos.y >= bounds.top && pos.y <= bounds.bottom
}

const handleCanvasMouseDown = (e) => {
  // Only prevent default for canvas interactions, not all interactions
  const pos = getMousePos(e)

  // Priority 1: Check for green resize handles
  const handle = getHandleAt(pos)
  if (handle) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = handle.id
    dragStartPos.x = pos.x
    dragStartPos.y = pos.y
    dragStartDimensions.width = roomDimensions.width
    dragStartDimensions.height = roomDimensions.height
    dragStartDimensions.notchWidth = roomDimensions.notchWidth
    dragStartDimensions.notchHeight = roomDimensions.notchHeight
    dragStartRoomCenter.x = roomCenter.x
    dragStartRoomCenter.y = roomCenter.y
    lastDragTime.value = 0
    canvas.value.style.cursor = 'grabbing'
    addGlobalMouseListeners()
    preventSelection()
    return
  }

  // Priority 2: Check if inside room (for moving)
  if (isInsideRoom(pos)) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = 'room-move'
    dragStartPos.x = pos.x
    dragStartPos.y = pos.y
    dragStartRoomCenter.x = roomCenter.x
    dragStartRoomCenter.y = roomCenter.y
    lastDragTime.value = 0
    canvas.value.style.cursor = 'grabbing'
    addGlobalMouseListeners()
    preventSelection()
  }

  // If we're not interacting with the canvas elements, don't prevent the event
}

const addGlobalMouseListeners = () => {
  // Remove capture: true and be more selective about event handling
  document.addEventListener('mousemove', handleGlobalMouseMove, {passive: false})
  document.addEventListener('mouseup', handleGlobalMouseUp, {passive: false})
  window.addEventListener('mousemove', handleGlobalMouseMove, {passive: false})
  window.addEventListener('mouseup', handleGlobalMouseUp, {passive: false})
}

const preventSelection = () => {
  console.log('>>> inside the room', isInsideRoom(dragStartPos))
  document.body.style.userSelect = 'none'
  document.body.style.webkitUserSelect = 'none'
}

const handleCanvasMouseMove = (e) => {
  // Don't prevent default for hover events
  if (isDragging.value) {
    return
  }

  const pos = getMousePos(e)

  // Reset hover states
  hoveredHandle.value = null
  hoveredRoom.value = false

  // Check hover - priority order: handles, room interior
  const handle = getHandleAt(pos)
  if (handle) {
    hoveredHandle.value = handle.id
    const canvasEl = canvas.value
    if (canvasEl) {
      canvasEl.style.cursor = handle.cursor
    }
    return
  }

  if (isInsideRoom(pos)) {
    hoveredRoom.value = true
    const canvasEl = canvas.value
    if (canvasEl) {
      canvasEl.style.cursor = 'move'
    }
    return
  }

  // Default cursor for empty areas
  const canvasEl = canvas.value
  if (canvasEl) {
    canvasEl.style.cursor = 'default'
  }
}

const handleCanvasMouseUp = () => {
  if (isDragging.value) {
    return
  }
}

const handleCanvasMouseEnter = (e) => {
  // This ensures cursor is updated correctly when mouse re-enters canvas
  // Especially important after drag operations
  if (!isDragging.value) {
    // Force a cursor update by calling mouse move logic
    handleCanvasMouseMove(e)
  }
}

const handleCanvasMouseLeave = () => {
  if (!isDragging.value) {
    hoveredHandle.value = null
    hoveredRoom.value = false
    canvas.value.style.cursor = 'default'
  }
}

const handleGlobalMouseMove = (e) => {
  // Only prevent default and stop propagation if we're actually dragging
  if (!isDragging.value) return

  e.preventDefault()
  e.stopPropagation()

  const now = Date.now()
  if (now - lastDragTime.value >= dragThrottleMs.value) {
    const pos = getGlobalMousePos(e)
    handleDrag(pos)
    lastDragTime.value = now
  }
}

const handleGlobalMouseUp = (e) => {
  // Only prevent default and stop propagation if we were dragging
  if (isDragging.value) {
    e.preventDefault()
    e.stopPropagation()
    endDrag()
  }
}

const endDrag = () => {
  console.log('>>> end drag functions', isDragging.value)

  if (!isDragging.value) return

  isDragging.value = null

  // Remove global event listeners - make sure this always happens
  removeGlobalMouseListeners()

  // Restore text selection
  document.body.style.userSelect = ''
  document.body.style.webkitUserSelect = ''

  // Update cursor for current position
  updateCursorForCurrentPosition()
}

const removeGlobalMouseListeners = () => {
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  window.removeEventListener('mousemove', handleGlobalMouseMove)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
}

const updateCursorForCurrentPosition = () => {
  // Simply reset hover states and let the next mouse move event handle cursor updates
  nextTick(() => {
    hoveredHandle.value = null
    hoveredRoom.value = false
    // Don't force cursor to 'default' - let mouse move handle it
  })
}

const handleCanvasTouchStart = (e) => {
  const pos = getTouchPos(e)

  const handle = getHandleAt(pos)
  if (handle) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = handle.id
    dragStartPos.x = pos.x
    dragStartPos.y = pos.y
    dragStartDimensions.width = roomDimensions.width
    dragStartDimensions.height = roomDimensions.height
    dragStartDimensions.notchWidth = roomDimensions.notchWidth
    dragStartDimensions.notchHeight = roomDimensions.notchHeight
    dragStartRoomCenter.x = roomCenter.x
    dragStartRoomCenter.y = roomCenter.y
    lastDragTime.value = 0
    addGlobalTouchListeners()
    return
  }

  if (isInsideRoom(pos)) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = 'room-move'
    dragStartPos.x = pos.x
    dragStartPos.y = pos.y
    dragStartRoomCenter.x = roomCenter.x
    dragStartRoomCenter.y = roomCenter.y
    lastDragTime.value = 0
    addGlobalTouchListeners()
  }
}

const removeGlobalTouchListeners = () => {
  document.removeEventListener('touchmove', handleGlobalTouchMove)
  document.removeEventListener('touchend', handleGlobalTouchEnd)
}

const addGlobalTouchListeners = () => {
  document.addEventListener('touchmove', handleGlobalTouchMove, {passive: false})
  document.addEventListener('touchend', handleGlobalTouchEnd, {passive: false})
}

const handleCanvasTouchMove = (e) => {
  e.preventDefault()
  if (isDragging.value) {
    const pos = getTouchPos(e)
    handleDrag(pos)
  }
}

const handleCanvasTouchEnd = (e) => {
  e.preventDefault()
  isDragging.value = null
}

// Fix global touch handlers
const handleGlobalTouchMove = (e) => {
  if (!isDragging.value) return

  e.preventDefault()
  e.stopPropagation()
  const pos = getGlobalTouchPos(e)
  handleDrag(pos)
}

const handleGlobalTouchEnd = (e) => {
  if (isDragging.value) {
    e.preventDefault()
    e.stopPropagation()
    isDragging.value = null
    removeGlobalTouchListeners()

    // Restore document state
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
  }
}

const handleDrag = (currentPos) => {
  if (!isDragging.value) return

  const deltaX = currentPos.x - dragStartPos.x
  const deltaY = currentPos.y - dragStartPos.y

  // Handle room movement
  if (isDragging.value === 'room-move') {
    roomCenter.x = dragStartRoomCenter.x + deltaX
    roomCenter.y = dragStartRoomCenter.y + deltaY
    return
  }

  // Handle dimension changes (from green edge handles only)
  // Keep opposite edges fixed during resize
  const scaledDeltaX = deltaX / effectiveScale.value
  const scaledDeltaY = deltaY / effectiveScale.value

  let newWidth = dragStartDimensions.width
  let newHeight = dragStartDimensions.height
  let newCenterX = dragStartRoomCenter.x
  let newCenterY = dragStartRoomCenter.y

  // Calculate original bounds
  const startBounds = {
    left: dragStartRoomCenter.x - (dragStartDimensions.width * effectiveScale.value) / 2,
    top: dragStartRoomCenter.y - (dragStartDimensions.height * effectiveScale.value) / 2,
    right: dragStartRoomCenter.x + (dragStartDimensions.width * effectiveScale.value) / 2,
    bottom: dragStartRoomCenter.y + (dragStartDimensions.height * effectiveScale.value) / 2
  }

  switch (isDragging.value) {
    case 'right':
      // Keep left edge fixed, expand/contract to the right
      newWidth = Math.max(ROOM_DEFAULTS.MIN_SIZE, Math.min(600, dragStartDimensions.width + scaledDeltaX))
      newCenterX = startBounds.left + (newWidth * effectiveScale.value) / 2
      break
    case 'bottom':
      // Keep top edge fixed, expand/contract downward
      newHeight = Math.max(ROOM_DEFAULTS.MIN_SIZE, Math.min(600, dragStartDimensions.height + scaledDeltaY))
      newCenterY = startBounds.top + (newHeight * effectiveScale.value) / 2
      break
    case 'left':
      // Keep right edge fixed, expand/contract to the left
      newWidth = Math.max(ROOM_DEFAULTS.MIN_SIZE, Math.min(600, dragStartDimensions.width - scaledDeltaX))
      newCenterX = startBounds.right - (newWidth * effectiveScale.value) / 2
      break
    case 'top':
      // Keep bottom edge fixed, expand/contract upward
      newHeight = Math.max(ROOM_DEFAULTS.MIN_SIZE, Math.min(600, dragStartDimensions.height - scaledDeltaY))
      newCenterY = startBounds.bottom - (newHeight * effectiveScale.value) / 2
      break
    case 'notch-width':
      // Adjust notch width
      roomDimensions.notchWidth = Math.round(Math.max(50, Math.min(roomDimensions.width - 50, dragStartDimensions.notchWidth + scaledDeltaX)) * 100) / 100
      break
    case 'notch-height':
      // Adjust notch height
      roomDimensions.notchHeight = Math.round(Math.max(50, Math.min(roomDimensions.height - 50, dragStartDimensions.notchHeight + scaledDeltaY)) * 100) / 100
      break
  }

  // Apply changes for main dimensions
  if (isDragging.value !== 'notch-width' && isDragging.value !== 'notch-height') {
    roomDimensions.width = Math.round(newWidth * 100) / 100
    roomDimensions.height = Math.round(newHeight * 100) / 100
    roomCenter.x = newCenterX
    roomCenter.y = newCenterY
  }

  // Clear pending changes since dragging overrides them
  pendingDimensions.width = null
  pendingDimensions.height = null
  pendingDimensions.notchWidth = null
  pendingDimensions.notchHeight = null
}

const handleCanvasWheel = (e) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.05 : 0.05
  zoomLevel.value = Math.max(0.5, Math.min(2, zoomLevel.value + delta))
}

// Helper to get wall color based on dragging state
// Highlights walls whose dimensions are changing (not the grabbed wall)
const getWallColor = (wallId) => {
  if (!isDragging.value || isDragging.value === 'room-move') {
    return '#2d3748' // Default dark color
  }

  // Map handles to walls whose dimensions change
  const handleToAffectedWalls = {
    // Changing height affects left/right walls (they display the height)
    'top': ['left', 'right'],
    'bottom': ['left', 'right'],
    // Changing width affects top/bottom walls (they display the width)
    'left': ['top', 'bottom'],
    'right': ['top', 'bottom'],
    // Changing notch-width affects notch-south (its length = notchWidth) and top wall (topWallWidth = width - notchWidth)
    'notch-width': ['notch-south', 'top'],
    // Changing notch-height affects notch-east (its length = notchHeight) and left wall (leftWallHeight = height - notchHeight)
    'notch-height': ['notch-east', 'left']
  }

  const affectedWalls = handleToAffectedWalls[isDragging.value] || []
  return affectedWalls.includes(wallId) ? '#48bb78' : '#2d3748'
}

// Helper to draw a single wall segment
const drawWall = (context, x1, y1, x2, y2, color) => {
  context.beginPath()
  context.moveTo(x1, y1)
  context.lineTo(x2, y2)
  context.strokeStyle = color
  context.lineWidth = 8
  context.lineCap = 'round'
  context.stroke()
}

const draw = () => {
  const context = ctx.value

  // Clear canvas
  context.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  const bounds = roomBounds.value

  // Draw room based on shape
  if (isLShape.value) {
    drawLShape(context, bounds)
  } else {
    // Draw rectangular room - fill first
    context.fillStyle = hoveredRoom.value && !isDragging.value ? '#f7fafc' : '#ffffff'
    context.fillRect(bounds.left, bounds.top, roomPixelWidth.value, roomPixelHeight.value)

    // Draw each wall separately with appropriate color
    drawWall(context, bounds.left, bounds.top, bounds.right, bounds.top, getWallColor('top'))
    drawWall(context, bounds.right, bounds.top, bounds.right, bounds.bottom, getWallColor('right'))
    drawWall(context, bounds.right, bounds.bottom, bounds.left, bounds.bottom, getWallColor('bottom'))
    drawWall(context, bounds.left, bounds.bottom, bounds.left, bounds.top, getWallColor('left'))
  }

  // Draw green resize handles
  drawHandles(context)
}

const drawLShape = (context, bounds) => {
  // L-shape: draw fill first, then individual wall segments

  // Fill the L-shape
  context.beginPath()
  context.moveTo(bounds.left, bounds.bottom)
  context.lineTo(bounds.left, bounds.top + notchPixelHeight.value)
  context.lineTo(bounds.left + notchPixelWidth.value, bounds.top + notchPixelHeight.value)
  context.lineTo(bounds.left + notchPixelWidth.value, bounds.top)
  context.lineTo(bounds.right, bounds.top)
  context.lineTo(bounds.right, bounds.bottom)
  context.lineTo(bounds.left, bounds.bottom)
  context.closePath()
  context.fillStyle = hoveredRoom.value && !isDragging.value ? '#f7fafc' : '#ffffff'
  context.fill()

  // Draw each wall segment with appropriate color
  // Left wall (from bottom to notch)
  drawWall(context, bounds.left, bounds.bottom, bounds.left, bounds.top + notchPixelHeight.value, getWallColor('left'))

  // Notch-south wall (horizontal notch wall)
  drawWall(context, bounds.left, bounds.top + notchPixelHeight.value, bounds.left + notchPixelWidth.value, bounds.top + notchPixelHeight.value, getWallColor('notch-south'))

  // Notch-east wall (vertical notch wall)
  drawWall(context, bounds.left + notchPixelWidth.value, bounds.top + notchPixelHeight.value, bounds.left + notchPixelWidth.value, bounds.top, getWallColor('notch-east'))

  // Top wall (from notch to right)
  drawWall(context, bounds.left + notchPixelWidth.value, bounds.top, bounds.right, bounds.top, getWallColor('top'))

  // Right wall
  drawWall(context, bounds.right, bounds.top, bounds.right, bounds.bottom, getWallColor('right'))

  // Bottom wall
  drawWall(context, bounds.right, bounds.bottom, bounds.left, bounds.bottom, getWallColor('bottom'))
}

const drawHandles = (context) => {
  handles.value.forEach(handle => {
    const isHovered = hoveredHandle.value === handle.id
    const isDraggingHandle = isDragging.value === handle.id

    // Green color for handles
    context.fillStyle = isDraggingHandle ? '#38a169' : isHovered ? '#48bb78' : '#48bb78'

    context.beginPath()
    context.arc(handle.x, handle.y, isDraggingHandle ? 8 : isHovered ? 7 : 6, 0, 2 * Math.PI)
    context.fill()

    // Add white border for better visibility
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.stroke()
  })
}

const startRenderLoop = () => {
  const render = () => {
    draw()
    animationId.value = requestAnimationFrame(render)
  }
  render()
}

// Watchers
watch(roomDimensions, () => {
  updateHandles()
  updateDimensionInputs()
}, {deep: true})

watch(roomCenter, () => {
  updateHandles()
  updateDimensionInputs()
}, {deep: true})

watch(zoomLevel, () => {
  updateHandles()
  updateDimensionInputs()
})

const loadExistingDimensions = () => {
  const dimensions = loadRoomDimensionsFromStorage()

  if (dimensions) {
    roomDimensions.width = dimensions.width
    roomDimensions.height = dimensions.height

    console.log('Existing dimensions loaded:', {
      width: dimensions.width + 'cm',
      height: dimensions.height + 'cm'
    })

    return true
  }

  return false
}

const setShapeBasedDefaults = () => {
  try {
    const selectedShape = localStorage.getItem('selected-room-shape')

    if (selectedShape && (selectedShape === 'square' || selectedShape === 'rectangular' || selectedShape === 'l-shape')) {
      const shapeDefaults = getShapeDefaultDimensions(selectedShape)

      roomDimensions.width = shapeDefaults.width
      roomDimensions.height = shapeDefaults.height

      // Store notch dimensions for l-shape, or 0 for square/rectangular
      if (selectedShape === 'l-shape') {
        roomDimensions.notchWidth = shapeDefaults.notchWidth || 150
        roomDimensions.notchHeight = shapeDefaults.notchHeight || 150
      } else {
        // For square and rectangular, explicitly set notch to 0
        roomDimensions.notchWidth = 0
        roomDimensions.notchHeight = 0
      }

      try {
        localStorage.removeItem('selected-room-shape')
        console.log('✅ Shape selection consumed and removed from localStorage')
      } catch (storageError) {
        console.warn('Failed to remove selected-room-shape from localStorage:', storageError)
        // Continue execution even if cleanup fails
      }

      return true
    }
  } catch (error) {
    console.warn('Failed to load selected shape:', error)
  }

  return false
}

// Lifecycle hooks
onMounted(() => {

    const shapeDefaultsApplied = setShapeBasedDefaults()

    if (shapeDefaultsApplied) {
      console.log('Applied shape-specific default dimensions')
    } else {
      // Fall back to standard defaults
      roomDimensions.width = ROOM_DEFAULTS.WIDTH  // 300cm
      roomDimensions.height = ROOM_DEFAULTS.HEIGHT // 250cm
      console.log('Using standard default room dimensions:', {
        width: ROOM_DEFAULTS.WIDTH + 'cm',
        height: ROOM_DEFAULTS.HEIGHT + 'cm'
      })
    }

  initCanvas()
  updateHandles()
  updateDimensionInputs()
  startRenderLoop()

  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  if (dragAnimationId.value) {
    cancelAnimationFrame(dragAnimationId.value)
  }

  // Always clean up drag state and listeners
  isDragging.value = null
  removeGlobalMouseListeners()

  // Restore document state
  document.body.style.userSelect = ''
  document.body.style.webkitUserSelect = ''

  // FIXED: Clean up input refs
  inputRefs.clear()

  window.removeEventListener('resize', handleResize)
})
</script>
<style scoped>
/* Hide number input arrows */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>