<!-- File: src/components/ui/RotationArrowsToggle.vue -->

<template>
  <div :style="containerStyle">
    <button
        @click="toggleRotationArrows"
        :style="buttonStyle"
        :title="rotationArrowsEnabled ? 'Disable rotation arrows' : 'Enable rotation arrows'"
        role="switch"
        :aria-checked="String(rotationArrowsEnabled)"
        :aria-label="rotationArrowsEnabled ? 'Disable rotation arrows' : 'Enable rotation arrows'"
    >
      <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
      >
        <!-- Rotation arrows icon -->
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.39 0 4.68 0.94 6.36 2.64L16 9"/>
        <path d="M21 3v6h-6"/>
        <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9c0 2.39-0.94 4.68-2.64 6.36L15 16"/>
        <path d="M3 21v-6h6"/>
      </svg>
      <span :style="textStyle">
        {{ rotationArrowsEnabled ? 'Arrow Rotation ON' : 'Arrow Rotation OFF' }}
      </span>
    </button>

    <!-- Instructions tooltip -->
    <div v-if="showInstructions" :style="tooltipStyle" role="status" aria-live="polite">
      <div :style="tooltipContentStyle">
        <strong>Rotation Arrows:</strong><br/>
        • Select an object to see rotation arrows<br/>
        • Drag any arrow to rotate the object<br/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'medium', // 'small', 'medium', 'large'
    validator: (v) => ['small','medium','large'].includes(v)
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'toggle'])

// State
const rotationArrowsEnabled = ref(props.modelValue)
const showInstructions = ref(false)

// Methods
const toggleRotationArrows = () => {
  rotationArrowsEnabled.value = !rotationArrowsEnabled.value
  emit('update:modelValue', rotationArrowsEnabled.value)
  emit('toggle', rotationArrowsEnabled.value)

  // Show instructions briefly when enabling
  if (rotationArrowsEnabled.value) {
    showInstructions.value = true
    setTimeout(() => {
      showInstructions.value = false
    }, 3000)
  }
}

// Computed styles
const containerStyle = computed(() => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
}))

const buttonStyle = computed(() => {
  const sizes = {
    small: { padding: '6px 12px', fontSize: '12px', gap: '4px' },
    medium: { padding: '8px 16px', fontSize: '14px', gap: '6px' },
    large: { padding: '12px 20px', fontSize: '16px', gap: '8px' }
  }

  const currentSize = sizes[props.size] || sizes.medium

  return {
    display: 'flex',
    alignItems: 'center',
    gap: currentSize.gap,
    padding: currentSize.padding,
    backgroundColor: rotationArrowsEnabled.value ? '#00ffff' : '#f0f0f0',
    color: rotationArrowsEnabled.value ? '#000' : '#4d4d4d',
    border: rotationArrowsEnabled.value ? '2px solid #00aaaa' : '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: currentSize.fontSize,
    fontWeight: '500',
    transition: 'all 0.2s ease',
    fontFamily: 'Arial, sans-serif',
    boxShadow: rotationArrowsEnabled.value
        ? '0 2px 8px rgba(0, 255, 255, 0.3)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
    transform: rotationArrowsEnabled.value ? 'translateY(-1px)' : 'translateY(0)',
    minWidth: 'fit-content'
  }
})

const textStyle = computed(() => ({
  fontSize: 'inherit',
  fontWeight: 'inherit'
}))

const tooltipStyle = computed(() => ({
  position: 'absolute',
  top: '100%',
  left: '0',
  right: '10px',
  marginTop: '8px',
  zIndex: 1000,
  opacity: showInstructions.value ? '1' : '0',
  visibility: showInstructions.value ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease'
}))

const tooltipContentStyle = computed(() => ({
  backgroundColor: '#333',
  color: 'white',
  padding: '12px 16px',
  borderRadius: '6px',
  fontSize: '13px',
  lineHeight: '1.4',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  maxWidth: '300px',
  width: '100%',
  fontFamily: 'Arial, sans-serif'
}))

// Watch for prop changes
import { watch } from 'vue'
watch(() => props.modelValue, (newValue) => {
  rotationArrowsEnabled.value = newValue
})
</script>

<style scoped>
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

button:active {
  transform: translateY(0);
}

svg {
  flex-shrink: 0;
}
</style>