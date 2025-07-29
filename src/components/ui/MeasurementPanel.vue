// src/components/ui/MeasurementPanel.vue
<template>
  <div :style="panelStyle">
    <div :style="headerStyle">
      <h4 :style="titleStyle">📏 Measurements</h4>
      <button
          @click="toggleMeasurements"
          :style="getToggleButtonStyle(measurementEnabled)"
          @mouseenter="e => handleButtonHover(e, true)"
          @mouseleave="e => handleButtonHover(e, false)"
      >
        {{ measurementEnabled ? 'Hide' : 'Show' }}
      </button>
    </div>

    <div v-if="measurementEnabled" :style="instructionsStyle">
      <p :style="instructionTextStyle">
        Select an object to see its dimensions and available space
      </p>
    </div>

    <div v-if="measurementEnabled && currentMeasurements" :style="measurementDataStyle">
      <div :style="sectionStyle">
        <h5 :style="sectionTitleStyle">Object Dimensions</h5>
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Width:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectWidth) }} cm</span>
        </div>
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Depth:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectDepth) }} cm</span>
        </div>
        <div :style="dimensionItemStyle">
          <span :style="labelStyle">Height:</span>
          <span :style="valueStyle">{{ Math.round(currentMeasurements.objectHeight) }} cm</span>
        </div>
      </div>

      <div :style="sectionStyle">
        <h5 :style="sectionTitleStyle">Available Space</h5>
        <div v-if="currentMeasurements.isWallBound" :style="wallBoundInfoStyle">
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Left:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceLeft)">
              {{ Math.round(currentMeasurements.spaceLeft) }} cm
            </span>
          </div>
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Right:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceRight)">
              {{ Math.round(currentMeasurements.spaceRight) }} cm
            </span>
          </div>
        </div>
        <div v-else :style="freeStandingInfoStyle">
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Left:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceLeft)">
              {{ Math.round(currentMeasurements.spaceLeft) }} cm
            </span>
          </div>
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Right:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceRight)">
              {{ Math.round(currentMeasurements.spaceRight) }} cm
            </span>
          </div>
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Front:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceFront)">
              {{ Math.round(currentMeasurements.spaceFront) }} cm
            </span>
          </div>
          <div :style="dimensionItemStyle">
            <span :style="labelStyle">Back:</span>
            <span :style="getSpaceValueStyle(currentMeasurements.spaceBack)">
              {{ Math.round(currentMeasurements.spaceBack) }} cm
            </span>
          </div>
        </div>
      </div>

      <div :style="sectionStyle">
        <div :style="statusStyle">
          <span :style="statusLabelStyle">Status:</span>
          <span :style="getStatusValueStyle(currentMeasurements.isWallBound)">
            {{ currentMeasurements.isWallBound ? 'Wall-bound' : 'Free-standing' }}
          </span>
          <span v-if="currentMeasurements.wallDirection" :style="wallDirectionStyle">
            ({{ currentMeasurements.wallDirection }} wall)
          </span>
        </div>
      </div>
    </div>

    <div v-if="measurementEnabled && !currentMeasurements" :style="noSelectionStyle">
      <p :style="noSelectionTextStyle">
        No object selected
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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

// Reactive state
const isHovered = ref(false)

// Computed
const isMobileDevice = computed(() => isMobile())

// Styles
const panelStyle = computed(() => ({
  position: 'absolute',
  bottom: '10px',
  left: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '15px',
  borderRadius: '8px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  minWidth: isMobileDevice.value ? '280px' : '320px',
  maxWidth: isMobileDevice.value ? '90vw' : '400px',
  zIndex: 1000,
  backdropFilter: 'blur(10px)',
  border: '2px solid #ff6b35',
  fontFamily: 'Arial, sans-serif'
}))

const headerStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '15px',
  paddingBottom: '10px',
  borderBottom: '1px solid #e0e0e0'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#333',
  fontFamily: 'Arial, sans-serif'
}))

const getToggleButtonStyle = (enabled) => ({
  padding: '8px 16px',
  border: `2px solid ${enabled ? '#ff6b35' : '#4CAF50'}`,
  borderRadius: '6px',
  backgroundColor: enabled ? '#ff6b35' : '#4CAF50',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  fontFamily: 'Arial, sans-serif',
  minWidth: '70px',
  textAlign: 'center'
})

const instructionsStyle = computed(() => ({
  backgroundColor: '#f8f9fa',
  padding: '12px',
  borderRadius: '6px',
  marginBottom: '15px',
  border: '1px solid #e9ecef'
}))

const instructionTextStyle = computed(() => ({
  margin: '0',
  fontSize: '13px',
  color: '#6c757d',
  fontStyle: 'italic',
  fontFamily: 'Arial, sans-serif'
}))

const measurementDataStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '15px'
}))

const sectionStyle = computed(() => ({
  backgroundColor: '#f8f9fa',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #e9ecef'
}))

const sectionTitleStyle = computed(() => ({
  margin: '0 0 10px 0',
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#495057',
  fontFamily: 'Arial, sans-serif'
}))

const dimensionItemStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
  padding: '4px 0'
}))

const labelStyle = computed(() => ({
  fontSize: '13px',
  color: '#6c757d',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const valueStyle = computed(() => ({
  fontSize: '13px',
  color: '#ff6b35',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
}))

const wallBoundInfoStyle = computed(() => ({
  backgroundColor: '#fff3cd',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #ffeaa7'
}))

const freeStandingInfoStyle = computed(() => ({
  backgroundColor: '#d4edda',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid #c3e6cb'
}))

const statusStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap'
}))

const statusLabelStyle = computed(() => ({
  fontSize: '13px',
  color: '#6c757d',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const getStatusValueStyle = (isWallBound) => ({
  fontSize: '13px',
  color: isWallBound ? '#856404' : '#155724',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
})

const wallDirectionStyle = computed(() => ({
  fontSize: '12px',
  color: '#6c757d',
  fontStyle: 'italic',
  fontFamily: 'Arial, sans-serif'
}))

const noSelectionStyle = computed(() => ({
  backgroundColor: '#f8f9fa',
  padding: '20px',
  borderRadius: '6px',
  border: '1px solid #e9ecef',
  textAlign: 'center'
}))

const noSelectionTextStyle = computed(() => ({
  margin: '0',
  fontSize: '14px',
  color: '#6c757d',
  fontStyle: 'italic',
  fontFamily: 'Arial, sans-serif'
}))

// Methods
const toggleMeasurements = () => {
  emit('toggle-measurements')
}

const handleButtonHover = (event, isHovering) => {
  isHovered.value = isHovering
  if (isHovering) {
    event.target.style.transform = 'scale(1.05)'
    event.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
  } else {
    event.target.style.transform = 'scale(1)'
    event.target.style.boxShadow = 'none'
  }
}

const getSpaceValueStyle = (spaceValue) => ({
  fontSize: '13px',
  color: spaceValue > 50 ? '#28a745' : spaceValue > 20 ? '#ffc107' : '#dc3545',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
})
</script>

<style scoped>
/* Additional hover and animation styles */
.measurement-panel {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.measurement-panel:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* Smooth transitions for all interactive elements */
* {
  transition: all 0.2s ease;
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
