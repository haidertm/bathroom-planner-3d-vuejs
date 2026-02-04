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
                @click.stop="input.onClick"
                @mousedown.stop
            >
              <input
                  v-if="input.editing"
                  :ref="el => setInputRef(el, input.id)"
                  v-model.number="input.tempValue"
                  type="number"
                  step="1"
                  class="dimension-field"
                  :class="{ 'has-changes': input.tempValue !== input.originalValue }"
                  @input="handleInputChange(input)"
                  @blur="finishEditing(input)"
                  @keyup.enter="finishEditing(input)"
                  @keyup.escape="cancelEditing(input)"
                  @keydown="preventDecimalInput"
                  :min="input.min"
                  :max="input.max"
              />
              <div v-else class="dimension-display"
                   :class="{ 'has-pending-changes': hasPendingChanges(input) }"
                   @click.stop="startEditing(input)">
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
const lShapeCorner = ref('nw') // Which corner the notch should appear in

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
  const corner = lShapeCorner.value

  // Calculate handle positions based on corner (which walls are shortened)
  let topHandleX, leftHandleY, rightHandleY, bottomHandleX

  if (isLShape.value) {
    switch (corner) {
      case 'nw': // Notch at top-left: top wall shortened on left, left wall shortened on top
        topHandleX = bounds.left + notchPixelWidth.value + (roomPixelWidth.value - notchPixelWidth.value) / 2
        leftHandleY = bounds.top + notchPixelHeight.value + (roomPixelHeight.value - notchPixelHeight.value) / 2
        rightHandleY = bounds.top + roomPixelHeight.value / 2
        bottomHandleX = bounds.left + roomPixelWidth.value / 2
        break
      case 'ne': // Notch at top-right: top wall shortened on right, right wall shortened on top
        topHandleX = bounds.left + (roomPixelWidth.value - notchPixelWidth.value) / 2
        leftHandleY = bounds.top + roomPixelHeight.value / 2
        rightHandleY = bounds.top + notchPixelHeight.value + (roomPixelHeight.value - notchPixelHeight.value) / 2
        bottomHandleX = bounds.left + roomPixelWidth.value / 2
        break
      case 'sw': // Notch at bottom-left: bottom wall shortened on left, left wall shortened on bottom
        topHandleX = bounds.left + roomPixelWidth.value / 2
        leftHandleY = bounds.top + (roomPixelHeight.value - notchPixelHeight.value) / 2
        rightHandleY = bounds.top + roomPixelHeight.value / 2
        bottomHandleX = bounds.left + notchPixelWidth.value + (roomPixelWidth.value - notchPixelWidth.value) / 2
        break
      case 'se': // Notch at bottom-right: bottom wall shortened on right, right wall shortened on bottom
        topHandleX = bounds.left + roomPixelWidth.value / 2
        leftHandleY = bounds.top + roomPixelHeight.value / 2
        rightHandleY = bounds.top + (roomPixelHeight.value - notchPixelHeight.value) / 2
        bottomHandleX = bounds.left + (roomPixelWidth.value - notchPixelWidth.value) / 2
        break
      default:
        topHandleX = bounds.left + roomPixelWidth.value / 2
        leftHandleY = bounds.top + roomPixelHeight.value / 2
        rightHandleY = bounds.top + roomPixelHeight.value / 2
        bottomHandleX = bounds.left + roomPixelWidth.value / 2
    }
  } else {
    topHandleX = bounds.left + roomPixelWidth.value / 2
    leftHandleY = bounds.top + roomPixelHeight.value / 2
    rightHandleY = bounds.top + roomPixelHeight.value / 2
    bottomHandleX = bounds.left + roomPixelWidth.value / 2
  }

  const baseHandles = [
    // Only edge handles (green resize icons)
    {id: 'top', x: topHandleX, y: bounds.top, type: 'edge', cursor: 'ns-resize'},
    {id: 'right', x: bounds.right, y: rightHandleY, type: 'edge', cursor: 'ew-resize'},
    {id: 'bottom', x: bottomHandleX, y: bounds.bottom, type: 'edge', cursor: 'ns-resize'},
    {id: 'left', x: bounds.left, y: leftHandleY, type: 'edge', cursor: 'ew-resize'}
  ]

  // Add notch handles for L-shape based on corner position
  if (isLShape.value) {
    const corner = lShapeCorner.value
    let notchHandles = []

    switch (corner) {
      case 'nw': // Notch at top-left
        notchHandles = [
          { id: 'notch-width', x: bounds.left + notchPixelWidth.value, y: bounds.top + notchPixelHeight.value / 2, type: 'notch', cursor: 'ew-resize' },
          { id: 'notch-height', x: bounds.left + notchPixelWidth.value / 2, y: bounds.top + notchPixelHeight.value, type: 'notch', cursor: 'ns-resize' }
        ]
        break
      case 'ne': // Notch at top-right
        notchHandles = [
          { id: 'notch-width', x: bounds.right - notchPixelWidth.value, y: bounds.top + notchPixelHeight.value / 2, type: 'notch', cursor: 'ew-resize' },
          { id: 'notch-height', x: bounds.right - notchPixelWidth.value / 2, y: bounds.top + notchPixelHeight.value, type: 'notch', cursor: 'ns-resize' }
        ]
        break
      case 'sw': // Notch at bottom-left
        notchHandles = [
          { id: 'notch-width', x: bounds.left + notchPixelWidth.value, y: bounds.bottom - notchPixelHeight.value / 2, type: 'notch', cursor: 'ew-resize' },
          { id: 'notch-height', x: bounds.left + notchPixelWidth.value / 2, y: bounds.bottom - notchPixelHeight.value, type: 'notch', cursor: 'ns-resize' }
        ]
        break
      case 'se': // Notch at bottom-right
        notchHandles = [
          { id: 'notch-width', x: bounds.right - notchPixelWidth.value, y: bounds.bottom - notchPixelHeight.value / 2, type: 'notch', cursor: 'ew-resize' },
          { id: 'notch-height', x: bounds.right - notchPixelWidth.value / 2, y: bounds.bottom - notchPixelHeight.value, type: 'notch', cursor: 'ns-resize' }
        ]
        break
    }
    handles.value = [...baseHandles, ...notchHandles]
  } else {
    handles.value = baseHandles
  }
}

const updateDimensionInputs = () => {
  const bounds = roomBounds.value
  const corner = lShapeCorner.value

  // Calculate label positions and wall dimensions based on corner
  let topLabelX, leftLabelY, rightLabelY, bottomLabelX
  let topWallWidth, bottomWallWidth, leftWallHeight, rightWallHeight

  if (isLShape.value) {
    switch (corner) {
      case 'nw': // Notch at top-left: top wall and left wall are reduced
        topLabelX = bounds.left + notchPixelWidth.value + (roomPixelWidth.value - notchPixelWidth.value) / 2 - 40
        leftLabelY = bounds.top + notchPixelHeight.value + (roomPixelHeight.value - notchPixelHeight.value) / 2 - 12.5
        rightLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        bottomLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        topWallWidth = roomDimensions.width - roomDimensions.notchWidth
        bottomWallWidth = roomDimensions.width
        leftWallHeight = roomDimensions.height - roomDimensions.notchHeight
        rightWallHeight = roomDimensions.height
        break
      case 'ne': // Notch at top-right: top wall and right wall are reduced
        topLabelX = bounds.left + (roomPixelWidth.value - notchPixelWidth.value) / 2 - 40
        leftLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        rightLabelY = bounds.top + notchPixelHeight.value + (roomPixelHeight.value - notchPixelHeight.value) / 2 - 12.5
        bottomLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        topWallWidth = roomDimensions.width - roomDimensions.notchWidth
        bottomWallWidth = roomDimensions.width
        leftWallHeight = roomDimensions.height
        rightWallHeight = roomDimensions.height - roomDimensions.notchHeight
        break
      case 'sw': // Notch at bottom-left: bottom wall and left wall are reduced
        topLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        leftLabelY = bounds.top + (roomPixelHeight.value - notchPixelHeight.value) / 2 - 12.5
        rightLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        bottomLabelX = bounds.left + notchPixelWidth.value + (roomPixelWidth.value - notchPixelWidth.value) / 2 - 40
        topWallWidth = roomDimensions.width
        bottomWallWidth = roomDimensions.width - roomDimensions.notchWidth
        leftWallHeight = roomDimensions.height - roomDimensions.notchHeight
        rightWallHeight = roomDimensions.height
        break
      case 'se': // Notch at bottom-right: bottom wall and right wall are reduced
        topLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        leftLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        rightLabelY = bounds.top + (roomPixelHeight.value - notchPixelHeight.value) / 2 - 12.5
        bottomLabelX = bounds.left + (roomPixelWidth.value - notchPixelWidth.value) / 2 - 40
        topWallWidth = roomDimensions.width
        bottomWallWidth = roomDimensions.width - roomDimensions.notchWidth
        leftWallHeight = roomDimensions.height
        rightWallHeight = roomDimensions.height - roomDimensions.notchHeight
        break
      default:
        topLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        leftLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        rightLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
        bottomLabelX = bounds.left + roomPixelWidth.value / 2 - 40
        topWallWidth = roomDimensions.width
        bottomWallWidth = roomDimensions.width
        leftWallHeight = roomDimensions.height
        rightWallHeight = roomDimensions.height
    }
  } else {
    topLabelX = bounds.left + roomPixelWidth.value / 2 - 40
    leftLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
    rightLabelY = bounds.top + roomPixelHeight.value / 2 - 12.5
    bottomLabelX = bounds.left + roomPixelWidth.value / 2 - 40
    topWallWidth = roomDimensions.width
    bottomWallWidth = roomDimensions.width
    leftWallHeight = roomDimensions.height
    rightWallHeight = roomDimensions.height
  }

  // Compute minimum room dimensions (must leave 50cm gap from notch to prevent walls touching)
  const minWidth = isLShape.value ? Math.max(ROOM_DEFAULTS.MIN_SIZE, roomDimensions.notchWidth + 50) : ROOM_DEFAULTS.MIN_SIZE
  const minHeight = isLShape.value ? Math.max(ROOM_DEFAULTS.MIN_SIZE, roomDimensions.notchHeight + 50) : ROOM_DEFAULTS.MIN_SIZE

  const baseInputs = [
    // Top (reduced width if L-shape)
    {
      id: 'width-top',
      value: topWallWidth,
      tempValue: pendingDimensions.width || topWallWidth,
      originalValue: topWallWidth,
      unit: 'cm',
      min: minWidth,
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

    // Bottom (may be reduced for SW/SE corners)
    {
      id: 'width-bottom',
      value: bottomWallWidth,
      tempValue: pendingDimensions.width || bottomWallWidth,
      originalValue: bottomWallWidth,
      unit: 'cm',
      min: minWidth,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: bottomLabelX + 'px',
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
      min: minHeight,
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

    // Right (may be reduced for NE/SE corners)
    {
      id: 'height-right',
      value: rightWallHeight,
      tempValue: pendingDimensions.height || rightWallHeight,
      originalValue: rightWallHeight,
      unit: 'cm',
      min: minHeight,
      max: ROOM_DEFAULTS.MAX_SIZE,
      editing: false,
      style: {
        position: 'absolute',
        left: (bounds.right + 10) + 'px',
        top: rightLabelY + 'px',
        width: '80px',
        height: '25px'
      },
      onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'height-right'))
    }
  ]

  // Add notch dimension inputs for L-shape based on corner position
  if (isLShape.value) {
    const corner = lShapeCorner.value
    let notchWidthStyle, notchHeightStyle

    switch (corner) {
      case 'nw': // Notch at top-left
        notchWidthStyle = {
          position: 'absolute',
          left: (bounds.left + notchPixelWidth.value / 2 - 40) + 'px',
          top: (bounds.top + notchPixelHeight.value + 10) + 'px',
          width: '80px', height: '25px'
        }
        notchHeightStyle = {
          position: 'absolute',
          left: (bounds.left + notchPixelWidth.value + 10) + 'px',
          top: (bounds.top + notchPixelHeight.value / 2 - 12.5) + 'px',
          width: '80px', height: '25px'
        }
        break
      case 'ne': // Notch at top-right
        notchWidthStyle = {
          position: 'absolute',
          left: (bounds.right - notchPixelWidth.value / 2 - 40) + 'px',
          top: (bounds.top + notchPixelHeight.value + 10) + 'px',
          width: '80px', height: '25px'
        }
        notchHeightStyle = {
          position: 'absolute',
          left: (bounds.right - notchPixelWidth.value - 90) + 'px',
          top: (bounds.top + notchPixelHeight.value / 2 - 12.5) + 'px',
          width: '80px', height: '25px'
        }
        break
      case 'sw': // Notch at bottom-left
        notchWidthStyle = {
          position: 'absolute',
          left: (bounds.left + notchPixelWidth.value / 2 - 40) + 'px',
          top: (bounds.bottom - notchPixelHeight.value - 35) + 'px',
          width: '80px', height: '25px'
        }
        notchHeightStyle = {
          position: 'absolute',
          left: (bounds.left + notchPixelWidth.value + 10) + 'px',
          top: (bounds.bottom - notchPixelHeight.value / 2 - 12.5) + 'px',
          width: '80px', height: '25px'
        }
        break
      case 'se': // Notch at bottom-right
        notchWidthStyle = {
          position: 'absolute',
          left: (bounds.right - notchPixelWidth.value / 2 - 40) + 'px',
          top: (bounds.bottom - notchPixelHeight.value - 35) + 'px',
          width: '80px', height: '25px'
        }
        notchHeightStyle = {
          position: 'absolute',
          left: (bounds.right - notchPixelWidth.value - 90) + 'px',
          top: (bounds.bottom - notchPixelHeight.value / 2 - 12.5) + 'px',
          width: '80px', height: '25px'
        }
        break
    }

    const notchInputs = [
      {
        id: 'notch-width',
        value: roomDimensions.notchWidth,
        tempValue: pendingDimensions.notchWidth || roomDimensions.notchWidth,
        originalValue: roomDimensions.notchWidth,
        unit: 'cm',
        min: 50,
        max: Math.min(ROOM_DEFAULTS.MAX_SIZE, roomDimensions.width - 50),
        editing: false,
        style: notchWidthStyle,
        onClick: () => startEditing(dimensionInputs.value.find(i => i.id === 'notch-width'))
      },
      {
        id: 'notch-height',
        value: roomDimensions.notchHeight,
        tempValue: pendingDimensions.notchHeight || roomDimensions.notchHeight,
        originalValue: roomDimensions.notchHeight,
        unit: 'cm',
        min: 50,
        max: Math.min(ROOM_DEFAULTS.MAX_SIZE, roomDimensions.height - 50),
        editing: false,
        style: notchHeightStyle,
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

// Prevent decimal point and scientific notation input
const preventDecimalInput = (e) => {
  // Block decimal point, comma (used as decimal in some locales),
  // and 'e'/'E' (scientific notation) to ensure only integers
  // keyCode 69 is 'e'/'E' for broader browser support
  if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === 'E' || e.keyCode === 69) {
    e.preventDefault()
  }
}

// Handle input changes to show pending changes and apply button
const handleInputChange = (input) => {
  // Set pending dimensions when user types to show the apply changes button
  // Round to integer - no decimals allowed
  const validatedValue = Math.round(Math.max(input.min, Math.min(input.max, input.tempValue)))

  if (input.id === 'notch-width') {
    pendingDimensions.notchWidth = validatedValue
  } else if (input.id === 'notch-height') {
    pendingDimensions.notchHeight = validatedValue
  } else if (input.id === 'width-top') {
    // For L-shape, convert to full width
    pendingDimensions.width = isLShape.value ? validatedValue + roomDimensions.notchWidth : validatedValue
  } else if (input.id === 'width-bottom') {
    pendingDimensions.width = validatedValue
  } else if (input.id === 'height-left') {
    // For L-shape, convert to full height
    pendingDimensions.height = isLShape.value ? validatedValue + roomDimensions.notchHeight : validatedValue
  } else if (input.id === 'height-right') {
    pendingDimensions.height = validatedValue
  }
}

const finishEditing = (input) => {

  // Validate and constrain the temp value - round to integer, no decimals allowed
  const validatedValue = Math.round(Math.max(input.min, Math.min(input.max, input.tempValue)))
  input.tempValue = validatedValue

  // Apply changes immediately when user clicks outside (blur event)
  if (input.id === 'notch-width') {
    roomDimensions.notchWidth = validatedValue
    pendingDimensions.notchWidth = null
  } else if (input.id === 'notch-height') {
    roomDimensions.notchHeight = validatedValue
    pendingDimensions.notchHeight = null
  } else if (input.id === 'width-top') {
    // For L-shape, width-top shows reduced width (width - notchWidth)
    // Convert back to full width
    if (isLShape.value) {
      roomDimensions.width = validatedValue + roomDimensions.notchWidth
    } else {
      roomDimensions.width = validatedValue
    }
    pendingDimensions.width = null
  } else if (input.id === 'width-bottom') {
    // width-bottom always shows full width
    roomDimensions.width = validatedValue
    pendingDimensions.width = null
  } else if (input.id === 'height-left') {
    // For L-shape, height-left shows reduced height (height - notchHeight)
    // Convert back to full height
    if (isLShape.value) {
      roomDimensions.height = validatedValue + roomDimensions.notchHeight
    } else {
      roomDimensions.height = validatedValue
    }
    pendingDimensions.height = null
  } else if (input.id === 'height-right') {
    // height-right always shows full height
    roomDimensions.height = validatedValue
    pendingDimensions.height = null
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

  const corner = lShapeCorner.value

  // Map of which handle affects which labels (corner-aware for notch handles)
  const affectedLabels = {
    // Dragging top/bottom changes height → show height labels
    'top': ['height-left', 'height-right'],
    'bottom': ['height-left', 'height-right'],
    // Dragging left/right changes width → show width labels
    'left': ['width-top', 'width-bottom'],
    'right': ['width-top', 'width-bottom'],
    // Notch-width affects different walls based on corner:
    // NW/NE: top wall is reduced, SW/SE: bottom wall is reduced
    'notch-width': corner === 'sw' || corner === 'se'
      ? ['notch-width', 'width-bottom']
      : ['notch-width', 'width-top'],
    // Notch-height affects different walls based on corner:
    // NW/SW: left wall is reduced, NE/SE: right wall is reduced
    'notch-height': corner === 'ne' || corner === 'se'
      ? ['notch-height', 'height-right']
      : ['notch-height', 'height-left']
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

  // Compute minimum dimensions to prevent notch walls from touching main walls (50cm gap required)
  const minWidth = isLShape.value ? Math.max(ROOM_DEFAULTS.MIN_SIZE, roomDimensions.notchWidth + 50) : ROOM_DEFAULTS.MIN_SIZE
  const minHeight = isLShape.value ? Math.max(ROOM_DEFAULTS.MIN_SIZE, roomDimensions.notchHeight + 50) : ROOM_DEFAULTS.MIN_SIZE

  switch (isDragging.value) {
    case 'right':
      // Keep left edge fixed, expand/contract to the right
      newWidth = Math.max(minWidth, Math.min(600, dragStartDimensions.width + scaledDeltaX))
      newCenterX = startBounds.left + (newWidth * effectiveScale.value) / 2
      break
    case 'bottom':
      // Keep top edge fixed, expand/contract downward
      newHeight = Math.max(minHeight, Math.min(600, dragStartDimensions.height + scaledDeltaY))
      newCenterY = startBounds.top + (newHeight * effectiveScale.value) / 2
      break
    case 'left':
      // Keep right edge fixed, expand/contract to the left
      newWidth = Math.max(minWidth, Math.min(600, dragStartDimensions.width - scaledDeltaX))
      newCenterX = startBounds.right - (newWidth * effectiveScale.value) / 2
      break
    case 'top':
      // Keep bottom edge fixed, expand/contract upward
      newHeight = Math.max(minHeight, Math.min(600, dragStartDimensions.height - scaledDeltaY))
      newCenterY = startBounds.bottom - (newHeight * effectiveScale.value) / 2
      break
    case 'notch-width':
      // Adjust notch width based on corner (must leave 50cm gap to prevent walls touching)
      // For NW and SW corners, dragging right increases width; for NE and SE, dragging left increases width
      if (lShapeCorner.value === 'nw' || lShapeCorner.value === 'sw') {
        roomDimensions.notchWidth = Math.round(Math.max(50, Math.min(roomDimensions.width - 50, dragStartDimensions.notchWidth + scaledDeltaX)))
      } else {
        roomDimensions.notchWidth = Math.round(Math.max(50, Math.min(roomDimensions.width - 50, dragStartDimensions.notchWidth - scaledDeltaX)))
      }
      break
    case 'notch-height':
      // Adjust notch height based on corner (must leave 50cm gap to prevent walls touching)
      // For NW and NE corners, dragging down increases height; for SW and SE, dragging up increases height
      if (lShapeCorner.value === 'nw' || lShapeCorner.value === 'ne') {
        roomDimensions.notchHeight = Math.round(Math.max(50, Math.min(roomDimensions.height - 50, dragStartDimensions.notchHeight + scaledDeltaY)))
      } else {
        roomDimensions.notchHeight = Math.round(Math.max(50, Math.min(roomDimensions.height - 50, dragStartDimensions.notchHeight - scaledDeltaY)))
      }
      break
  }

  // Apply changes for main dimensions
  if (isDragging.value !== 'notch-width' && isDragging.value !== 'notch-height') {
    roomDimensions.width = Math.round(newWidth)
    roomDimensions.height = Math.round(newHeight)
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

  const corner = lShapeCorner.value

  // Map handles to walls whose dimensions change (corner-aware for notch handles)
  const handleToAffectedWalls = {
    // Changing height affects left/right walls (they display the height)
    'top': ['left', 'right'],
    'bottom': ['left', 'right'],
    // Changing width affects top/bottom walls (they display the width)
    'left': ['top', 'bottom'],
    'right': ['top', 'bottom'],
    // Notch-width affects notch-south and the wall that gets shortened:
    // NW/NE: top wall is reduced, SW/SE: bottom wall is reduced
    'notch-width': corner === 'sw' || corner === 'se'
      ? ['notch-south', 'bottom']
      : ['notch-south', 'top'],
    // Notch-height affects notch-east and the wall that gets shortened:
    // NW/SW: left wall is reduced, NE/SE: right wall is reduced
    'notch-height': corner === 'ne' || corner === 'se'
      ? ['notch-east', 'right']
      : ['notch-east', 'left']
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
  // The notch position varies based on lShapeCorner

  const corner = lShapeCorner.value
  const nw = notchPixelWidth.value
  const nh = notchPixelHeight.value

  context.fillStyle = hoveredRoom.value && !isDragging.value ? '#f7fafc' : '#ffffff'

  // Draw different L-shape paths based on corner selection
  context.beginPath()
  switch (corner) {
    case 'nw': // Notch at top-left (default)
      context.moveTo(bounds.left, bounds.bottom)
      context.lineTo(bounds.left, bounds.top + nh)
      context.lineTo(bounds.left + nw, bounds.top + nh)
      context.lineTo(bounds.left + nw, bounds.top)
      context.lineTo(bounds.right, bounds.top)
      context.lineTo(bounds.right, bounds.bottom)
      break
    case 'ne': // Notch at top-right
      context.moveTo(bounds.left, bounds.top)
      context.lineTo(bounds.right - nw, bounds.top)
      context.lineTo(bounds.right - nw, bounds.top + nh)
      context.lineTo(bounds.right, bounds.top + nh)
      context.lineTo(bounds.right, bounds.bottom)
      context.lineTo(bounds.left, bounds.bottom)
      break
    case 'sw': // Notch at bottom-left
      context.moveTo(bounds.left + nw, bounds.bottom)
      context.lineTo(bounds.left + nw, bounds.bottom - nh)
      context.lineTo(bounds.left, bounds.bottom - nh)
      context.lineTo(bounds.left, bounds.top)
      context.lineTo(bounds.right, bounds.top)
      context.lineTo(bounds.right, bounds.bottom)
      break
    case 'se': // Notch at bottom-right
      context.moveTo(bounds.left, bounds.bottom)
      context.lineTo(bounds.left, bounds.top)
      context.lineTo(bounds.right, bounds.top)
      context.lineTo(bounds.right, bounds.bottom - nh)
      context.lineTo(bounds.right - nw, bounds.bottom - nh)
      context.lineTo(bounds.right - nw, bounds.bottom)
      break
  }
  context.closePath()
  context.fill()

  // Draw wall segments based on corner
  switch (corner) {
    case 'nw':
      drawWall(context, bounds.left, bounds.bottom, bounds.left, bounds.top + nh, getWallColor('left'))
      drawWall(context, bounds.left, bounds.top + nh, bounds.left + nw, bounds.top + nh, getWallColor('notch-south'))
      drawWall(context, bounds.left + nw, bounds.top + nh, bounds.left + nw, bounds.top, getWallColor('notch-east'))
      drawWall(context, bounds.left + nw, bounds.top, bounds.right, bounds.top, getWallColor('top'))
      drawWall(context, bounds.right, bounds.top, bounds.right, bounds.bottom, getWallColor('right'))
      drawWall(context, bounds.right, bounds.bottom, bounds.left, bounds.bottom, getWallColor('bottom'))
      break
    case 'ne':
      drawWall(context, bounds.left, bounds.top, bounds.right - nw, bounds.top, getWallColor('top'))
      drawWall(context, bounds.right - nw, bounds.top, bounds.right - nw, bounds.top + nh, getWallColor('notch-east'))
      drawWall(context, bounds.right - nw, bounds.top + nh, bounds.right, bounds.top + nh, getWallColor('notch-south'))
      drawWall(context, bounds.right, bounds.top + nh, bounds.right, bounds.bottom, getWallColor('right'))
      drawWall(context, bounds.right, bounds.bottom, bounds.left, bounds.bottom, getWallColor('bottom'))
      drawWall(context, bounds.left, bounds.bottom, bounds.left, bounds.top, getWallColor('left'))
      break
    case 'sw':
      drawWall(context, bounds.left + nw, bounds.bottom, bounds.left + nw, bounds.bottom - nh, getWallColor('notch-east'))
      drawWall(context, bounds.left + nw, bounds.bottom - nh, bounds.left, bounds.bottom - nh, getWallColor('notch-south'))
      drawWall(context, bounds.left, bounds.bottom - nh, bounds.left, bounds.top, getWallColor('left'))
      drawWall(context, bounds.left, bounds.top, bounds.right, bounds.top, getWallColor('top'))
      drawWall(context, bounds.right, bounds.top, bounds.right, bounds.bottom, getWallColor('right'))
      drawWall(context, bounds.right, bounds.bottom, bounds.left + nw, bounds.bottom, getWallColor('bottom'))
      break
    case 'se':
      drawWall(context, bounds.left, bounds.bottom, bounds.left, bounds.top, getWallColor('left'))
      drawWall(context, bounds.left, bounds.top, bounds.right, bounds.top, getWallColor('top'))
      drawWall(context, bounds.right, bounds.top, bounds.right, bounds.bottom - nh, getWallColor('right'))
      drawWall(context, bounds.right, bounds.bottom - nh, bounds.right - nw, bounds.bottom - nh, getWallColor('notch-south'))
      drawWall(context, bounds.right - nw, bounds.bottom - nh, bounds.right - nw, bounds.bottom, getWallColor('notch-east'))
      drawWall(context, bounds.right - nw, bounds.bottom, bounds.left, bounds.bottom, getWallColor('bottom'))
      break
  }
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

        // Read the selected corner for L-shape visualization
        const savedCorner = localStorage.getItem('l-shape-corner')
        if (savedCorner && ['nw', 'ne', 'sw', 'se'].includes(savedCorner)) {
          lShapeCorner.value = savedCorner
        }
      } else {
        // For square and rectangular, explicitly set notch to 0
        roomDimensions.notchWidth = 0
        roomDimensions.notchHeight = 0
      }

      try {
        localStorage.removeItem('selected-room-shape')
        // Note: l-shape-corner is preserved for Planner.vue to set camera angle
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
    } else {
      // Fall back to standard defaults
      roomDimensions.width = ROOM_DEFAULTS.WIDTH  // 300cm
      roomDimensions.height = ROOM_DEFAULTS.HEIGHT // 250cm
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