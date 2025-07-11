<template>
    <div :style="panelStyle">
      <button
        @click="$emit('undo')"
        :disabled="!canUndo"
        :style="getButtonStyle(canUndo)"
        @mouseenter="e => handleMouseEnter(e, canUndo)"
        @mouseleave="e => handleMouseLeave(e, canUndo)"
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>

      <button
        @click="$emit('redo')"
        :disabled="!canRedo"
        :style="getButtonStyle(canRedo)"
        @mouseenter="e => handleMouseEnter(e, canRedo)"
        @mouseleave="e => handleMouseLeave(e, canRedo)"
        title="Redo (Ctrl+Y)"
      >
        ↷ Redo
      </button>

      <button
        @click="handleClearClick"
        :style="getClearButtonStyle()"
        @mouseenter="e => handleClearMouseEnter(e)"
        @mouseleave="e => handleClearMouseLeave(e)"
        title="Clear All Objects"
      >
        🧹 Clear
      </button>
    </div>
  </template>

  <script setup>
  import { computed } from 'vue'
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

  // Define emits - Added 'clear' to the existing emits
  const emit = defineEmits(['undo', 'redo', 'clear'])

  // Computed
  const isMobileDevice = computed(() => isMobile())

  const panelStyle = computed(() => ({
    position: 'absolute',
    bottom: '130px',
    right: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '10px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    gap: '8px',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    flexWrap: isMobileDevice.value ? 'wrap' : 'nowrap'
  }))

  // Methods
  const getButtonStyle = (isEnabled) => ({
    padding: isMobileDevice.value ? '6px 10px' : '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: isEnabled ? '#f0f0f0' : '#f8f8f8',
    color: isEnabled ? '#333' : '#999',
    cursor: isEnabled ? 'pointer' : 'not-allowed',
    fontSize: isMobileDevice.value ? '12px' : '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    opacity: isEnabled ? 1 : 0.6,
    whiteSpace: 'nowrap'
  })

  // New method for Clear button styling
  const getClearButtonStyle = () => ({
    padding: isMobileDevice.value ? '6px 10px' : '8px 12px',
    border: '1px solid #e74c3c',
    borderRadius: '4px',
    backgroundColor: '#fff5f5',
    color: '#e74c3c',
    cursor: 'pointer',
    fontSize: isMobileDevice.value ? '12px' : '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  })

  const handleMouseEnter = (event, isEnabled) => {
    if (isEnabled) {
      event.target.style.backgroundColor = '#e0e0e0'
    }
  }

  const handleMouseLeave = (event, isEnabled) => {
    if (isEnabled) {
      event.target.style.backgroundColor = '#f0f0f0'
    } else {
      event.target.style.backgroundColor = '#f8f8f8'
    }
  }

  // New methods for Clear button hover effects
  const handleClearMouseEnter = (event) => {
    event.target.style.backgroundColor = '#fee'
    event.target.style.color = '#c0392b'
  }

  const handleClearMouseLeave = (event) => {
    event.target.style.backgroundColor = '#fff5f5'
    event.target.style.color = '#e74c3c'
  }

  // New method for Clear button click with confirmation
  const handleClearClick = () => {
    // Add a confirmation dialog for safety
    if (confirm('Are you sure you want to clear all objects? This action can be undone.')) {
      emit('clear')
    }
  }
  </script>

  <style scoped>
  /* Any additional styles if needed */
  </style>
