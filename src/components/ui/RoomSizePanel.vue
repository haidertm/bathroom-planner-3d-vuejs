<template>
  <div :style="panelStyle">
    <!-- Room Settings Accordion -->
    <div :style="accordionSectionStyle">
      <div
          @click="toggleRoomSettingsSection"
          :style="accordionHeaderStyle"
      >
        <h4 :style="accordionTitleStyle">Show Room Size</h4>
        <span :style="getArrowStyle(isRoomSettingsExpanded)">▼</span>
      </div>
      <div
          :style="getAccordionContentStyle(isRoomSettingsExpanded)"
          ref="roomSettingsContent"
      >
        <!-- Room Settings Content -->
        <div :style="contentStyle">
          <div :style="controlGroupStyle">
            <label :style="labelStyle">
              Width: {{ roomWidth.toFixed(1) }}m
              <input
                  type="range"
                  :min="ROOM_DEFAULTS.MIN_SIZE"
                  :max="ROOM_DEFAULTS.MAX_SIZE"
                  :step="ROOM_DEFAULTS.STEP"
                  :value="roomWidth"
                  @input="updateWidth"
                  :style="sliderStyle"
              />
            </label>
          </div>

          <div :style="controlGroupStyle">
            <label :style="labelStyle">
              Height: {{ roomHeight.toFixed(1) }}m
              <input
                  type="range"
                  :min="ROOM_DEFAULTS.MIN_SIZE"
                  :max="ROOM_DEFAULTS.MAX_SIZE"
                  :step="ROOM_DEFAULTS.STEP"
                  :value="roomHeight"
                  @input="updateHeight"
                  :style="sliderStyle"
              />
            </label>
          </div>

          <div :style="controlGroupStyle">
            <label :style="checkboxLabelStyle">
              <input
                  type="checkbox"
                  :checked="showGrid"
                  @change="$emit('toggle-grid', $event.target.checked)"
                  :style="checkboxStyle"
              />
              Show Grid
            </label>
          </div>

          <div :style="controlGroupStyle">
            <label :style="checkboxLabelStyle">
              <input
                  type="checkbox"
                  :checked="wallCullingEnabled"
                  @change="$emit('toggle-wall-culling', $event.target.checked)"
                  :style="checkboxStyle"
              />
              Smart Wall Hiding
            </label>
          </div>

          <div :style="controlGroupStyle">
            <button
                @click="$emit('constrain-objects')"
                :style="buttonStyle"
            >
              Constrain Objects to Room
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ROOM_DEFAULTS } from '../../constants/dimensions.js'
import { isMobile } from '../../utils/helpers.js'

// Define props
const props = defineProps({
  roomWidth: {
    type: Number,
    required: true
  },
  roomHeight: {
    type: Number,
    required: true
  },
  showGrid: {
    type: Boolean,
    required: true
  },
  wallCullingEnabled: {
    type: Boolean,
    required: true
  }
})

// Define emits
const emit = defineEmits(['room-size-change', 'toggle-grid', 'constrain-objects', 'toggle-wall-culling'])

// Reactive state for accordion
const isRoomSettingsExpanded = ref(false) // Start collapsed

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  top: '10px',
  right: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  minWidth: isMobileDevice.value ? '260px' : '300px',
  zIndex: 1000,
  backdropFilter: 'blur(12px)',
  fontFamily: 'Arial, sans-serif',
  border: '1px solid rgba(16, 185, 129, 0.2)'
}))

const accordionSectionStyle = computed(() => ({
  border: '1px solid #d1fae5',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
  backgroundColor: '#ffffff'
}))

const accordionHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  transition: 'all 0.2s ease',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

const accordionTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

const contentStyle = computed(() => ({
  padding: '15px'
}))

const controlGroupStyle = computed(() => ({
  marginBottom: '15px'
}))

const labelStyle = computed(() => ({
  display: 'block',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#374151',
  marginBottom: '5px',
  fontFamily: 'Arial, sans-serif',
  fontWeight: '500'
}))

const checkboxLabelStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#374151',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif',
  fontWeight: '500'
}))

const sliderStyle = computed(() => ({
  width: '100%',
  marginTop: '5px',
  accentColor: '#10b981'
}))

const checkboxStyle = computed(() => ({
  accentColor: '#10b981'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  padding: '12px 18px',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  fontWeight: '600',
  transition: 'all 0.2s ease',
  fontFamily: 'Arial, sans-serif',
  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
}))

// Methods
const toggleRoomSettingsSection = () => {
  isRoomSettingsExpanded.value = !isRoomSettingsExpanded.value
}

const updateWidth = (event) => {
  const newWidth = parseFloat(event.target.value)
  emit('room-size-change', newWidth, props.roomHeight)
}

const updateHeight = (event) => {
  const newHeight = parseFloat(event.target.value)
  emit('room-size-change', props.roomWidth, newHeight)
}

const getArrowStyle = (isExpanded) => ({
  fontSize: '14px',
  color: '#ffffff',
  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.2s ease',
  display: 'inline-block',
  fontFamily: 'Arial, sans-serif'
})

const getAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? '500px' : '0px',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#f9fafb'
})
</script>

<style scoped>
/* Custom slider styles */
input[type="range"] {
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #d1fae5;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Add scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>