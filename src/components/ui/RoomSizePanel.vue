<template>
  <div :style="panelStyle">
    <h4 :style="titleStyle">Room Settings</h4>

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
          @mouseenter="e => e.target.style.backgroundColor = '#45a049'"
          @mouseleave="e => e.target.style.backgroundColor = '#4CAF50'"
      >
        Snap Objects to Walls
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ROOM_DEFAULTS } from '../../constants/dimensions'
import { isMobile } from '../../utils/helpers'

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

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  bottom: '10px',
  right: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '15px',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  minWidth: isMobileDevice.value ? '260px' : '300px',
  zIndex: 1000,
  backdropFilter: 'blur(10px)'
}))

const titleStyle = computed(() => ({
  margin: '0 0 15px 0',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: 'bold',
  color: '#333'
}))

const controlGroupStyle = computed(() => ({
  marginBottom: '15px'
}))

const labelStyle = computed(() => ({
  display: 'block',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#666',
  marginBottom: '5px'
}))

const checkboxLabelStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#666',
  cursor: 'pointer'
}))

const sliderStyle = computed(() => ({
  width: '100%',
  marginTop: '5px',
  accentColor: '#4CAF50'
}))

const checkboxStyle = computed(() => ({
  accentColor: '#4CAF50'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  padding: '10px',
  backgroundColor: '#4CAF50',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s ease'
}))

// Methods
const updateWidth = (event) => {
  const newWidth = parseFloat(event.target.value)
  emit('room-size-change', newWidth, props.roomHeight)
}

const updateHeight = (event) => {
  const newHeight = parseFloat(event.target.value)
  emit('room-size-change', props.roomWidth, newHeight)
}
</script>

<style scoped>
/* Custom slider styles */
input[type="range"] {
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #4CAF50;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
