<!-- LoadingModal.vue - Reusable Loading Modal Component -->
<!-- Save this as: src/components/ui/LoadingModal.vue -->
<template>
  <!-- Loading Modal Overlay -->
  <div
      v-if="isVisible"
      :style="modalOverlayStyle"
      @click.stop
  >
    <!-- Loading Modal -->
    <div :style="loadingModalStyle">
      <div :style="modalContentStyle">
        <!-- Loading Spinner -->
        <div :style="modalSpinnerStyle"></div>

        <!-- Loading Text -->
        <h3 :style="modalTitleStyle">{{ title }}</h3>
        <p :style="modalMessageStyle">
          {{ message }}
        </p>

        <!-- Progress Bar -->
        <div :style="modalProgressContainerStyle">
          <div :style="modalProgressBarStyle"></div>
        </div>

        <!-- Progress Text -->
        <p :style="modalProgressTextStyle">
          {{ Math.round(progress) }}%
        </p>

        <!-- Cancel Button -->
        <button
            v-if="showCancel"
            @click="handleCancel"
            :style="modalCancelButtonStyle"
            class="modal-cancel-button"
        >
          {{ cancelText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  title: {
    type: String,
    default: 'Loading Model'
  },
  message: {
    type: String,
    default: 'Please wait while the 3D model loads...'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  cancelText: {
    type: String,
    default: 'Cancel'
  }
})

// Emits
const emit = defineEmits(['cancel'])

// Methods
const handleCancel = () => {
  emit('cancel')
}

// Styles (extracted from ProductDrawer)
const modalOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  zIndex: '10000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const loadingModalStyle = computed(() => ({
  position: 'relative',
  zIndex: '10001',
  pointerEvents: 'auto'
}))

const modalContentStyle = computed(() => ({
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  maxWidth: '400px',
  width: '90vw',
  fontFamily: 'Arial, sans-serif'
}))

const modalSpinnerStyle = computed(() => ({
  width: '48px',
  height: '48px',
  border: '4px solid #f0f0f0',
  borderTop: '4px solid #29275B',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 16px auto'
}))

const modalTitleStyle = computed(() => ({
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px 0',
  color: '#333'
}))

const modalMessageStyle = computed(() => ({
  fontSize: '14px',
  color: '#666',
  margin: '0 0 24px 0',
  lineHeight: '1.4'
}))

const modalProgressContainerStyle = computed(() => ({
  width: '100%',
  height: '8px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  overflow: 'hidden',
  margin: '0 0 16px 0'
}))

const modalProgressBarStyle = computed(() => ({
  height: '100%',
  background: 'linear-gradient(90deg, #29275B, #4a47a3)',
  borderRadius: '4px',
  width: `${props.progress}%`,
  transition: 'width 0.3s ease'
}))

const modalProgressTextStyle = computed(() => ({
  fontSize: '12px',
  color: '#888',
  margin: '0 0 24px 0'
}))

const modalCancelButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '2px solid #ddd',
  color: '#666',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))
</script>

<style scoped>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.modal-cancel-button:hover {
  background-color: #f5f5f5;
  border-color: #bbb;
}
</style>