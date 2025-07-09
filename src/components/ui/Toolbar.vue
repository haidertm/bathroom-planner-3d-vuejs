<template>
    <div :style="toolbarStyle">
      <h3 :style="titleStyle">Bathroom Planner 3D</h3>
      <div :style="buttonGroupStyle">
        <button
          v-for="component in COMPONENTS"
          :key="component"
          @click="$emit('add', component)"
          :style="buttonStyle"
          @mouseenter="e => e.target.style.backgroundColor = '#e0e0e0'"
          @mouseleave="e => e.target.style.backgroundColor = '#f0f0f0'"
        >
          {{ component }}
        </button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { COMPONENTS } from '../../constants/components.js'
  import { isMobile } from '../../utils/helpers.js'
  
  // Define emits
  const emit = defineEmits(['add'])
  
  // Computed styles
  const isMobileDevice = computed(() => isMobile())
  
  const toolbarStyle = computed(() => ({
    position: 'absolute',
    top: '10px',
    left: '10px',
    right: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '10px 15px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    flexWrap: isMobileDevice.value ? 'wrap' : 'nowrap'
  }))
  
  const titleStyle = computed(() => ({
    margin: '0',
    fontSize: isMobileDevice.value ? '16px' : '18px',
    fontWeight: 'bold',
    color: '#333',
    whiteSpace: 'nowrap',
    minWidth: isMobileDevice.value ? '100%' : 'auto',
    textAlign: isMobileDevice.value ? 'center' : 'left'
  }))
  
  const buttonGroupStyle = computed(() => ({
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: isMobileDevice.value ? 'center' : 'flex-start'
  }))
  
  const buttonStyle = computed(() => ({
    padding: isMobileDevice.value ? '8px 12px' : '8px 16px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#f0f0f0',
    cursor: 'pointer',
    fontSize: isMobileDevice.value ? '12px' : '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  }))
  </script>
  
  <style scoped>
  /* Any additional styles if needed */
  </style>