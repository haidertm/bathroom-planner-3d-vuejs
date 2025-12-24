<template>
  <div class="view-mode-toggle-container">
    <button
        class="view-mode-button"
        :style="buttonStyle"
        @click="toggleViewMode"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
    >
      <div class="toggle-content" :style="toggleContentStyle">
        <span
          class="mode-label"
          :class="{ active: modelValue === '2d' }"
          :style="labelStyle('2d')"
        >
          2D
        </span>
        <span
          class="mode-label"
          :class="{ active: modelValue === '3d' }"
          :style="labelStyle('3d')"
        >
          3D
        </span>
        <div
          class="slider"
          :style="sliderStyle"
        />
      </div>
      <div v-if="showTooltip" class="tooltip" :style="tooltipStyle">
        {{ modelValue === '2d' ? 'Switch to 3D view' : 'Switch to 2D Blueprint view' }}
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isMobile } from '../../utils/helpers'
import type { ViewMode } from '../../constants/camera'

// Define props
const props = defineProps<{
  modelValue: ViewMode
  disabled?: boolean
}>()

// Define emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: ViewMode): void
  (e: 'mode-change', value: ViewMode): void
}>()

// Local state
const showTooltip = ref(false)

// Computed
const isMobileDevice = computed(() => isMobile())

const buttonStyle = computed(() => ({
  width: isMobileDevice.value ? '40px' : '50px',
  height: isMobileDevice.value ? '70px' : '90px',
  borderRadius: '25px',
  backgroundColor: '#f0f0f0',
  border: '1px solid #d0d0d0',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  padding: '3px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  position: 'relative' as const,
  outline: 'none',
  opacity: props.disabled ? 0.5 : 1
}))

const toggleContentStyle = computed(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative' as const,
  borderRadius: '22px',
  overflow: 'hidden'
}))

const labelStyle = (mode: ViewMode) => computed(() => ({
  flex: '1',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: isMobileDevice.value ? '11px' : '13px',
  fontWeight: '600',
  color: props.modelValue === mode ? '#fff' : '#666',
  zIndex: 2,
  transition: 'color 0.2s ease',
  userSelect: 'none' as const
})).value

const sliderStyle = computed(() => ({
  position: 'absolute' as const,
  left: '0',
  top: props.modelValue === '2d' ? '0' : '50%',
  width: '100%',
  height: '50%',
  backgroundColor: '#29275B',
  borderRadius: '17px',
  transition: 'top 0.25s ease',
  zIndex: 1
}))

const tooltipStyle = computed(() => ({
  position: 'absolute' as const,
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'nowrap' as const,
  pointerEvents: 'none' as const,
  marginBottom: '8px',
  zIndex: 1000,
  animation: 'tooltipFadeIn 0.2s ease-out'
}))

// Methods
const toggleViewMode = () => {
  if (props.disabled) return

  const newMode: ViewMode = props.modelValue === '2d' ? '3d' : '2d'
  emit('update:modelValue', newMode)
  emit('mode-change', newMode)

  // Hide tooltip on mobile after toggle
  if (isMobileDevice.value) {
    showTooltip.value = false
  }
}

const handleMouseEnter = () => {
  if (!props.disabled && !isMobileDevice.value) {
    showTooltip.value = true
  }
}

const handleMouseLeave = () => {
  if (!isMobileDevice.value) {
    showTooltip.value = false
  }
}
</script>

<style scoped>
.view-mode-toggle-container {
  position: relative;
  display: inline-block;
}

.view-mode-button {
  -webkit-tap-highlight-color: transparent;
}

.view-mode-button:hover:not(:disabled) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
  border-color: #c0c0c0 !important;
}

.view-mode-button:active:not(:disabled) {
  transform: scale(0.98) !important;
}

.mode-label {
  cursor: pointer;
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

/* Focus styles for accessibility */
.view-mode-button:focus-visible {
  outline: 2px solid #29275B;
  outline-offset: 2px;
}
</style>
