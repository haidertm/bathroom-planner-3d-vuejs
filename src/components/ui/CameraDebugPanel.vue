// src/components/ui/CameraDebugPanel.vue - OPTIONAL: For debugging camera behavior
<template>
  <div v-if="showDebug" :style="debugPanelStyle">
    <h4 :style="titleStyle">📷 Camera Debug</h4>
    <div v-if="cameraInfo" :style="infoStyle">
      <div><strong>Position:</strong> ({{ cameraInfo.position.x }}, {{ cameraInfo.position.y }}, {{ cameraInfo.position.z }})</div>
      <div><strong>Look At:</strong> ({{ cameraInfo.lookAt.x }}, {{ cameraInfo.lookAt.y }}, {{ cameraInfo.lookAt.z }})</div>
      <div><strong>Distance:</strong> {{ cameraInfo.distance }}cm</div>
      <div><strong>Min Distance:</strong> {{ cameraInfo.constraints.minDistance }}cm</div>
      <div><strong>Max Distance:</strong> {{ cameraInfo.constraints.maxDistance }}cm</div>
      <div><strong>Min Height:</strong> {{ cameraInfo.constraints.minHeight }}cm</div>
    </div>

    <div :style="buttonGroupStyle">
      <button @click="resetCamera" :style="buttonStyle">Reset Camera</button>
      <button @click="toggleDebug" :style="buttonStyle">Hide Debug</button>
    </div>
  </div>

  <!-- Toggle button when debug is hidden -->
  <button v-else @click="toggleDebug" :style="toggleButtonStyle">
    📷 Debug
  </button>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

// Props
const props = defineProps({
  eventHandlers: {
    type: Object,
    required: true
  }
})

// Reactive state
const showDebug = ref(false)
const cameraInfo = ref(null)

// Update camera info
const updateCameraInfo = () => {
  if (props.eventHandlers && props.eventHandlers.getCameraInfo) {
    cameraInfo.value = props.eventHandlers.getCameraInfo()
  }
}

// Methods
const resetCamera = () => {
  if (props.eventHandlers && props.eventHandlers.resetCamera) {
    props.eventHandlers.resetCamera()
    updateCameraInfo()
  }
}

const toggleDebug = () => {
  showDebug.value = !showDebug.value
  if (showDebug.value) {
    updateCameraInfo()
  }
}

// Auto-update camera info when debug is visible
let updateInterval = null

onMounted(() => {
  updateInterval = setInterval(() => {
    if (showDebug.value) {
      updateCameraInfo()
    }
  }, 100) // Update every 100ms
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

// Styles
const debugPanelStyle = computed(() => ({
  position: 'fixed',
  top: '10px',
  right: '10px',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  padding: '15px',
  borderRadius: '8px',
  zIndex: 2000,
  fontSize: '12px',
  fontFamily: 'monospace',
  minWidth: '250px'
}))

const titleStyle = computed(() => ({
  margin: '0 0 10px 0',
  fontSize: '14px',
  fontWeight: 'bold'
}))

const infoStyle = computed(() => ({
  marginBottom: '10px',
  lineHeight: '1.4'
}))

const buttonGroupStyle = computed(() => ({
  display: 'flex',
  gap: '8px'
}))

const buttonStyle = computed(() => ({
  padding: '4px 8px',
  backgroundColor: '#444',
  color: 'white',
  border: '1px solid #666',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px'
}))

const toggleButtonStyle = computed(() => ({
  position: 'fixed',
  top: '10px',
  right: '10px',
  padding: '8px 12px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
  zIndex: 2000
}))
</script>

<style scoped>
button:hover {
  opacity: 0.8;
}
</style>
