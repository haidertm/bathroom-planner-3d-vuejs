// src/components/ui/MeasurementPanel.vue - IMPROVED VERSION
<template>
  <div :style="panelStyle" v-if="measurementEnabled && currentMeasurements">
    <!-- Show measurements if available -->
    <div v-if="currentMeasurements" :style="measurementDataStyle">
      <div :style="dimensionsRowStyle">
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Width:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectWidth) }}cm</span>
        </div>
        <div :style="separatorStyle">|</div>
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Depth:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectDepth) }}cm</span>
        </div>
        <div :style="separatorStyle">|</div>
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Height:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectHeight) }}cm</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isMobile } from '../../utils/helpers'

// Define props
const props = defineProps({
  measurementEnabled: {
    type: Boolean,
    required: true
  },
  currentMeasurements: {
    type: Object,
    default: null
  }
})

// Define emits
const emit = defineEmits(['toggle-measurements'])

// Computed
const isMobileDevice = computed(() => isMobile())

// Styles
const panelStyle = computed(() => ({
  position: 'absolute',
  top: isMobileDevice.value ? '80px' : '70px',
  left: isMobileDevice.value ? '10px' : '500px', // Position next to sidebar
  backgroundColor: 'rgba(0, 0, 0, 0.85)', // More transparent
  padding: '12px 16px',
  borderRadius: '8px',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
  zIndex: 1000,
  backdropFilter: 'blur(10px)',
  border: '2px solid #ff6b35',
  fontFamily: 'Arial, sans-serif',
  transition: 'all 0.3s ease', // Smooth transitions
  minHeight: '45px',
  display: 'flex',
  alignItems: 'center'
}))

const measurementDataStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}))

const dimensionsRowStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: isMobileDevice.value ? 'wrap' : 'nowrap',
  flexDirection: isMobileDevice.value ? 'column' : 'row',
}))

const dimensionItemStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  minWidth: '60px'
}))

const separatorStyle = computed(() => ({
  color: '#e0e0e0',
  fontSize: '14px',
  fontWeight: 'bold',
  display: isMobileDevice.value ? 'none' : 'block' // Hide separators on mobile to save space
}))

const labelStyle = computed(() => ({
  fontSize: '13px',
  color: '#fff',
  fontWeight: '600',
  fontFamily: 'Arial, sans-serif',
  minWidth: '45px' // Increased for better alignment
}))

const valueStyle = computed(() => ({
  fontSize: '13px',
  color: '#ff6b35',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
}))

// New styles for instruction text
const instructionStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '20px'
}))

const instructionTextStyle = computed(() => ({
  fontSize: '12px',
  color: '#ccc',
  fontStyle: 'italic',
  fontFamily: 'Arial, sans-serif',
  textAlign: 'center'
}))
</script>

<style scoped>
/* Smooth transitions for all interactive elements */
* {
  transition: all 0.2s ease;
}

/* Panel hover effect */
div:hover {
  transform: translateY(-1px);
}

/* Custom scrollbar for mobile */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb {
  background: #ff6b35;
  border-radius: 2px;
}

::-webkit-scrollbar-thumb:hover {
  background: #e55a2e;
}
</style>