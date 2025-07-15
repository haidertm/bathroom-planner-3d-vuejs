<template>
  <div :style="panelStyle">
    <!-- Undo Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="$emit('undo')"
          :disabled="!canUndo"
          :style="getIconButtonStyle(canUndo)"
          @mouseenter="e => handleMouseEnter(e, canUndo, 'undo')"
          @mouseleave="e => handleMouseLeave(e, canUndo, 'undo')"
          class="icon-button"
      >
        ↶
      </button>
      <div
          v-if="hoveredButton === 'undo' && canUndo"
          :style="tooltipStyle"
          class="tooltip"
      >
        Undo/Redo
      </div>
    </div>

    <!-- Redo Button -->
    <div :style="buttonWrapperStyle">
      <button
          @click="$emit('redo')"
          :disabled="!canRedo"
          :style="getIconButtonStyle(canRedo)"
          @mouseenter="e => handleMouseEnter(e, canRedo, 'redo')"
          @mouseleave="e => handleMouseLeave(e, canRedo, 'redo')"
          class="icon-button"
      >
        ↷
      </button>
      <div
          v-if="hoveredButton === 'redo' && canRedo"
          :style="tooltipStyle"
          class="tooltip"
      >
        Undo/Redo
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
        🧹
      </button>
      <div
          v-if="hoveredButton === 'clear'"
          :style="clearTooltipStyle"
          class="tooltip"
      >
        Clear All Objects
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
  }
})

// Define emits
const emit = defineEmits(['undo', 'redo', 'clear'])

// Reactive state for hover tracking
const hoveredButton = ref(null)

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  bottom: '130px',
  right: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '12px',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  gap: '10px',
  zIndex: 1000,
  backdropFilter: 'blur(15px)',
  flexWrap: isMobileDevice.value ? 'wrap' : 'nowrap',
  border: '1px solid rgba(255, 255, 255, 0.2)'
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
  fontFamily: 'Arial, sans-serif',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '4px solid transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.9)'
  }
}))

const clearTooltipStyle = computed(() => ({
  ...tooltipStyle.value,
  backgroundColor: 'rgba(231, 76, 60, 0.9)',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '4px solid transparent',
    borderTopColor: 'rgba(231, 76, 60, 0.9)'
  }
}))

// Methods
const getIconButtonStyle = (isEnabled) => ({
  width: isMobileDevice.value ? '44px' : '48px',
  height: isMobileDevice.value ? '44px' : '48px',
  border: isEnabled ? '2px solid #e5e7eb' : '2px solid #f3f4f6',
  borderRadius: '10px',
  backgroundColor: isEnabled ? '#ffffff' : '#f8f9fa',
  color: isEnabled ? '#374151' : '#9ca3af',
  cursor: isEnabled ? 'pointer' : 'not-allowed',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: isEnabled ? 1 : 0.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: isEnabled ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
  outline: 'none',
  position: 'relative',
  overflow: 'hidden'
})

const getClearIconButtonStyle = () => ({
  width: isMobileDevice.value ? '44px' : '48px',
  height: isMobileDevice.value ? '44px' : '48px',
  border: '2px solid #fecaca',
  borderRadius: '10px',
  backgroundColor: '#fef2f2',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
  outline: 'none',
  position: 'relative',
  overflow: 'hidden'
})

const handleMouseEnter = (event, isEnabled, buttonType) => {
  if (isEnabled) {
    hoveredButton.value = buttonType
    event.target.style.backgroundColor = '#f3f4f6'
    event.target.style.borderColor = '#29275B'
    event.target.style.color = '#29275B'
    event.target.style.transform = 'translateY(-2px)'
    event.target.style.boxShadow = '0 4px 12px rgba(41, 39, 91, 0.2)'
  }
}

const handleMouseLeave = (event, isEnabled, buttonType) => {
  hoveredButton.value = null
  if (isEnabled) {
    event.target.style.backgroundColor = '#ffffff'
    event.target.style.borderColor = '#e5e7eb'
    event.target.style.color = '#374151'
    event.target.style.transform = 'translateY(0)'
    event.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
  } else {
    event.target.style.backgroundColor = '#f8f9fa'
    event.target.style.borderColor = '#f3f4f6'
    event.target.style.color = '#9ca3af'
    event.target.style.transform = 'translateY(0)'
    event.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
  }
}

const handleClearMouseEnter = (event) => {
  hoveredButton.value = 'clear'
  event.target.style.backgroundColor = '#fee2e2'
  event.target.style.borderColor = '#dc2626'
  event.target.style.color = '#dc2626'
  event.target.style.transform = 'translateY(-2px)'
  event.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)'
}

const handleClearMouseLeave = (event) => {
  hoveredButton.value = null
  event.target.style.backgroundColor = '#fef2f2'
  event.target.style.borderColor = '#fecaca'
  event.target.style.color = '#ef4444'
  event.target.style.transform = 'translateY(0)'
  event.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)'
}

const handleClearClick = () => {
  if (confirm('Are you sure you want to clear all objects? This action can be undone.')) {
    emit('clear')
  }
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

/* Ripple effect for button press */
.icon-button:active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(41, 39, 91, 0.3);
  transform: translate(-50%, -50%);
  animation: ripple 0.6s ease-out;
}

.clear-button:active::after {
  background: rgba(220, 38, 38, 0.3);
}

@keyframes ripple {
  to {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
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
  pointer-events: none;
  cursor: not-allowed;
}
</style>