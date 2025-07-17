<template>
  <div :style="panelStyle">
    <!-- Undo Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="canUndo ? $emit('undo') : null"
          :disabled="!canUndo"
          :style="getIconButtonStyle(canUndo)"
          @mouseenter="e => handleMouseEnter(e, canUndo, 'undo')"
          @mouseleave="e => handleMouseLeave(e, canUndo, 'undo')"
          class="icon-button"
      >
        ↶
      </button>
      <div
          v-if="hoveredButton === 'undo'"
          :style="tooltipStyle"
          class="tooltip"
      >
        Undo
      </div>
    </div>

    <!-- Redo Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="canRedo ? $emit('redo') : null"
          :disabled="!canRedo"
          :style="getIconButtonStyle(canRedo)"
          @mouseenter="e => handleMouseEnter(e, canRedo, 'redo')"
          @mouseleave="e => handleMouseLeave(e, canRedo, 'redo')"
          class="icon-button"
      >
        ↷
      </button>
      <div
          v-if="hoveredButton === 'redo'"
          :style="tooltipStyle"
          class="tooltip"
      >
        Redo
      </div>
    </div>

    <!-- Clear Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="handleClearClick"
          :style="getClearIconButtonStyle()"
          @mouseenter="e => handleClearMouseEnter(e)"
          @mouseleave="e => handleClearMouseLeave(e)"
          class="icon-button clear-button"
      >
        🗑️
      </button>
      <div
          v-if="hoveredButton === 'clear'"
          :style="clearTooltipStyle"
          class="tooltip"
      >
        Clear All Objects
      </div>
    </div>

    <!-- Read Instructions Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="handleInstructionsClick"
          :style="getInstructionsButtonStyle()"
          @mouseenter="e => handleInstructionsMouseEnter(e)"
          @mouseleave="e => handleInstructionsMouseLeave(e)"
          class="icon-button instructions-button"
      >
        📖
      </button>
      <div
          v-if="hoveredButton === 'instructions'"
          :style="tooltipStyle"
          class="tooltip"
      >
        Read Instructions
      </div>
    </div>
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
            <p><strong>Alt + drag:</strong> Scale/Resize objects</p>
            <p><strong>Left click empty space:</strong> Rotate camera view</p>
            <p><strong>Mouse wheel:</strong> Zoom In/Out</p>
            <p><strong>DELETE key:</strong> Delete selected object</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { isMobile } from '../../utils/helpers.ts'

// Define props
const props = defineProps({
  canUndo: {
    type: Boolean,
    required: true
  },
  canRedo: {
    type: Boolean,
    required: true
  },
  showInstructions: {
    type: Boolean,
    default: false
  }
})

// Define emits
const emit = defineEmits(['undo', 'redo', 'clear', 'show-instructions', 'close-instructions'])

// Reactive state for hover tracking
const hoveredButton = ref(null)

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  bottom: '20px',
  right:  isMobileDevice.value ? '10px' : '50px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '8px',
  borderRadius: '20px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  display: 'flex',
  gap: '4px',
  zIndex: 1000,
  backdropFilter: 'blur(10px)',
  flexWrap: isMobileDevice.value ? 'wrap' : 'nowrap',
  border: '1px solid rgba(0, 0, 0, 0.05)'
}))

const buttonWrapperStyle = computed(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const tooltipStyle = computed(() => ({
  position: 'absolute',
  bottom: '110%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '500',
  whiteSpace: 'nowrap',
  zIndex: 1001,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  fontFamily: 'Arial, sans-serif'
}))

const clearTooltipStyle = computed(() => ({
  ...tooltipStyle.value,
  backgroundColor: 'rgba(231, 76, 60, 0.9)'
}))

// Methods
const getIconButtonStyle = (isEnabled) => ({
  width: isMobileDevice.value ? '36px' : '40px',
  height: isMobileDevice.value ? '36px' : '40px',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  color: isEnabled ? '#333' : '#ccc',
  cursor: isEnabled ? 'pointer' : 'not-allowed',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'normal',
  transition: 'all 0.2s ease',
  opacity: isEnabled ? 1 : 0.6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  position: 'relative',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  pointerEvents: 'auto'
})

const getInstructionsButtonStyle = () => ({
  width: isMobileDevice.value ? '36px' : '40px',
  height: isMobileDevice.value ? '36px' : '40px',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  color: '#333',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: 'normal',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  position: 'relative',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  pointerEvents: 'auto'
})

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
  paddingBottom: '0',
}))

const sectionHeaderStyle = computed(() => ({
  color: '#2c3e50',
  fontSize: '18px',
  marginBottom: '12px',
  fontWeight: '600'
}))

const handleMouseEnter = (event, isEnabled, buttonType) => {
  hoveredButton.value = buttonType
  if (isEnabled) {
    event.target.style.backgroundColor = '#f8f9fa'
    event.target.style.borderColor = 'rgba(0, 0, 0, 0.12)'
    event.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
  }
}

const handleMouseLeave = (event, isEnabled, buttonType) => {
  hoveredButton.value = null
  event.target.style.backgroundColor = '#ffffff'
  event.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'
  event.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)'
}

const handleClearMouseEnter = (event) => {
  hoveredButton.value = 'clear'
  event.target.style.backgroundColor = '#f8f9fa'
  event.target.style.borderColor = 'rgba(0, 0, 0, 0.12)'
  event.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
}

const handleClearClick = () => {
  if (confirm('Are you sure you want to clear all objects? This action can be undone.')) {
    emit('clear')
  }
}

const getClearIconButtonStyle = () => ({
  width: isMobileDevice.value ? '36px' : '40px',
  height: isMobileDevice.value ? '36px' : '40px',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  backgroundColor: '#ffffff',
  color: '#333',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: 'normal',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  position: 'relative',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  pointerEvents: 'auto'
})

const handleInstructionsClick = () => {
  emit('show-instructions')
}

const closeInstructions = () => {
  emit('close-instructions')
}

const handleInstructionsMouseEnter = (event) => {
  hoveredButton.value = 'instructions'
  event.target.style.backgroundColor = '#f8f9fa'
  event.target.style.borderColor = 'rgba(0, 0, 0, 0.12)'
  event.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
}

const handleInstructionsMouseLeave = (event) => {
  hoveredButton.value = null
  event.target.style.backgroundColor = '#ffffff'
  event.target.style.borderColor = 'rgba(0, 0, 0, 0.08)'
  event.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.02)'
}
</script>

<style scoped>
/* Icon button base styles */
.icon-button {
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Hover effect for buttons */
.icon-button:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.clear-button:hover {
  background-color: #f8f9fa;
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Tooltip arrow */
.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid rgba(0, 0, 0, 0.9);
}

/* Tooltip animation */
.tooltip {
  animation: tooltipFadeIn 0.2s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Mobile touch improvements */
@media (max-width: 768px) {
  .icon-button {
    touch-action: manipulation;
  }

  .tooltip {
    font-size: 11px;
    padding: 4px 8px;
  }
}

/* Focus styles for accessibility */
.icon-button:focus {
  outline: 2px solid #29275B;
  outline-offset: 2px;
}

.clear-button:focus {
  outline: 2px solid #dc2626;
  outline-offset: 2px;
}

/* Disabled state improvements */
.icon-button:disabled {
  cursor: not-allowed;
  /* Removed pointer-events: none to allow hover events */
}
</style>