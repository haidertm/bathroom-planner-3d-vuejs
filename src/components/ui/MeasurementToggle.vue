<template>
  <div class="button-container">
    <button
        class="measurement-button"
        :class="{ active: measurementsEnabled }"
        :style="measurementButtonStyle"
        @click="toggleMeasurements"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
    >
      <svg
          class="ruler-icon"
          :style="rulerIconStyle"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
      >
        <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/>
        <path d="m14.5 12.5 2-2"/>
        <path d="m11.5 9.5 2-2"/>
        <path d="m8.5 6.5 2-2"/>
        <path d="m17.5 15.5 2-2"/>
      </svg>
      <div v-if="showTooltip" class="tooltip">
        {{ measurementsEnabled ? 'Toggle measurements off' : 'Toggle measurements on' }}
      </div>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {isMobile} from "../../utils/helpers.js";

// Define props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

// Define emits
const emit = defineEmits(['update:modelValue', 'change'])

// Local state
const measurementsEnabled = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const showTooltip = ref(false)

// Methods
const toggleMeasurements = () => {
  if (props.disabled) return

  const newValue = !measurementsEnabled.value
  measurementsEnabled.value = newValue

  // Hide tooltip on mobile after toggle
  if (isMobileDevice.value) {
    showTooltip.value = false
  }

  // Emit change event with the new value
  emit('change', newValue)
}

const handleMouseEnter = () => {
  if (!props.disabled) {
    showTooltip.value = true
  }
}

const handleMouseLeave = () => {
  showTooltip.value = false
}

const handleTouchStart = () => {
  if (!props.disabled && isMobileDevice.value) {
    showTooltip.value = true
  }
}

const handleTouchEnd = () => {
  if (isMobileDevice.value) {
    // Hide tooltip after a brief delay on mobile
    setTimeout(() => {
      showTooltip.value = false
    }, 300)
  }
}

const isMobileDevice = computed(() => isMobile())

const measurementButtonStyle = computed(() => ({
  width: isMobileDevice.value ? '36px' : '60px',
  height: isMobileDevice.value ? '36px' : '60px',
  borderRadius: '50%',
  backgroundColor: measurementsEnabled.value ? '#29275B' : '#f8f8f8',
  border: measurementsEnabled.value ? '1px solid #29275B' : '1px solid #e0e0e0',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  outline: 'none',
  opacity: props.disabled ? 0.5 : 1
}))

const rulerIconStyle = computed(() => ({
  width: isMobileDevice.value ? '16px' : '22px',
  height: isMobileDevice.value ? '16px' : '22px',
  color: measurementsEnabled.value ? 'white' : '#333',
  transition: 'color 0.2s ease',
  transform: 'rotate(45deg)'
}))

const iconSize = computed(() => {
  const sizes = {
    small: '16px',
    medium: '22px',
    large: '28px'
  }
  return sizes[props.size]
})
</script>

<style scoped>
.button-container {
  position: relative;
  display: inline-block;
}

.measurement-button:hover:not(:disabled):not(.active) {
  background-color: #f0f0f0 !important;
  border-color: #d0d0d0 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.measurement-button.active:hover:not(:disabled) {
  background-color: #1e1b47 !important;
  border-color: #1e1b47 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
}

.measurement-button:active:not(:disabled) {
  transform: scale(0.95) !important;
}

.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  margin-bottom: 8px;
  z-index: 1000;
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

.tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

/* Remove the old hover-based tooltip rule since we're using showTooltip state */

/* Focus styles for accessibility */
.measurement-button:focus-visible {
  outline: 2px solid #29275B;
  outline-offset: 2px;
}

/* Animation for state changes */
.measurement-button.active {
  animation: pulse 0.3s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>