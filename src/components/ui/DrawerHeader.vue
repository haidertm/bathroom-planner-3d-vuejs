<template>
  <div :style="headerStyle">
    <button
      v-if="currentView === 'variants'"
      @click="$emit('go-back')"
      :style="backButtonStyle"
      class="back-button"
    >
      ← Back to Products
    </button>
    <button
      v-else
      @click="$emit('close')"
      :style="backButtonStyle"
      class="back-button"
    >
      ← Go back
    </button>

    <h2 :style="titleStyle" v-html="title" />

    <button
      @click="$emit('close')"
      :style="closeButtonStyle"
      class="close-button"
    >
      ✕
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isMobile } from '../../utils/helpers.js'

const props = defineProps({
  currentView: {
    type: String,
    default: 'products' // 'products' or 'variants'
  },
  title: {
    type: String,
    default: 'Products'
  }
})

defineEmits(['go-back', 'close'])

const isMobileDevice = computed(() => isMobile())

const headerStyle = computed(() => ({
  backgroundColor: props.currentView === 'variants' ? '#29275B' : '#ffffff',
  color: props.currentView === 'variants' ? 'white' : '#333',
  padding: '20px',
  borderBottom: props.currentView === 'variants' ? 'none' : '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  zIndex: 10
}))

const backButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: props.currentView === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
  color: props.currentView === 'variants' ? 'white' : '#666',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'background-color 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: props.currentView === 'variants' ? 'white' : '#333',
  fontFamily: 'Arial, sans-serif'
}))

const closeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: props.currentView === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e0e0e0',
  color: props.currentView === 'variants' ? 'white' : '#666',
  fontSize: '18px',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Arial, sans-serif'
}))
</script>

<style scoped>
.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
